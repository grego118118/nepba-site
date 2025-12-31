import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, sessions, users } from "@/lib/db";

const adapter: Adapter = {
  async getUser(id) {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    return user as unknown as AdapterUser | null;
  },
  async getUserByEmail(email) {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    return user as unknown as AdapterUser | null;
  },
  async createUser(user) {
    const [created] = await db
      .insert(users)
      .values({ email: user.email, passwordHash: "" })
      .returning();
    return { ...user, id: created.id } as AdapterUser;
  },
  async updateUser(user) {
    const [updated] = await db
      .update(users)
      .set({ email: user.email ?? undefined })
      .where(eq(users.id, user.id as string))
      .returning();
    return updated as unknown as AdapterUser;
  },
  async deleteUser() {
    return null;
  },
  async getSessionAndUser(sessionToken) {
    const sessionRow = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionToken),
      with: { user: true },
    });
    if (!sessionRow) return null;
    const adapterSession: AdapterSession = {
      sessionToken,
      userId: sessionRow.userId,
      expires: sessionRow.expiresAt,
    };
    return { session: adapterSession, user: sessionRow.user as unknown as AdapterUser };
  },
  async createSession(session) {
    const [created] = await db
      .insert(sessions)
      .values({
        id: session.sessionToken,
        userId: session.userId,
        expiresAt: session.expires,
      })
      .returning();
    return {
      sessionToken: created.id,
      userId: created.userId,
      expires: created.expiresAt,
    } satisfies AdapterSession;
  },
  async updateSession(partial) {
    const [updated] = await db
      .update(sessions)
      .set({
        expiresAt: partial.expires ?? undefined,
      })
      .where(eq(sessions.id, partial.sessionToken))
      .returning();
    if (!updated) return null;
    return {
      sessionToken: updated.id,
      userId: updated.userId,
      expires: updated.expiresAt,
    } satisfies AdapterSession;
  },
  async deleteSession(sessionToken) {
    await db.delete(sessions).where(eq(sessions.id, sessionToken));
  },
  // Unused in this project (no OAuth / email magic links)
  async createVerificationToken() {
    return null;
  },
  async useVerificationToken() {
    return null;
  },
  async linkAccount() {
    return undefined;
  },
  async getUserByAccount() {
    return null;
  },
  async unlinkAccount() {
    return undefined;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
          async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });
        if (!user || !user.passwordHash) return null;
        const valid = bcrypt.compareSync(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email } as AdapterUser;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        (session.user as any).id = (user as any).id;
        session.user.email = (user as any).email;
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});

