import Credentials from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import type { NextAuthOptions, Session } from "next-auth";
import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, sessions, users } from "@/lib/db";

const adapter: Adapter = {
  async getUser(id: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) });
    return user as unknown as AdapterUser | null;
  },
  async getUserByEmail(email: string) {
    const user = await db.query.users.findFirst({ where: eq(users.email, email) });
    return user as unknown as AdapterUser | null;
  },
  async createUser(user: AdapterUser) {
    const [created] = await db
      .insert(users)
      .values({ email: user.email, passwordHash: "" })
      .returning();
    return { ...user, id: created.id } as AdapterUser;
  },
	  async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
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
  async getSessionAndUser(sessionToken: string) {
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
  async createSession(session: AdapterSession) {
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
  async updateSession(partial: Partial<AdapterSession> & { sessionToken: string }) {
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
  async deleteSession(sessionToken: string) {
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

type ExtendedJWT = JWT & { id?: string | null };

// Check if we're in production (HTTPS) or development (HTTP)
const useSecureCookies = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
	adapter,
	session: {
		// Credentials provider requires JWT strategy in this next-auth version
		strategy: "jwt",
	},
	cookies: {
		sessionToken: {
			name: useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
			options: {
				httpOnly: true,
				sameSite: "lax",
				path: "/",
				secure: useSecureCookies,
			},
		},
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
		async jwt({ token, user }) {
				// Persist user id/email in the token on initial sign-in
				const extendedToken = token as ExtendedJWT;
				const adapterUser = user as AdapterUser | undefined;
				if (adapterUser) {
					extendedToken.id = (adapterUser.id as string | null | undefined) ?? null;
					extendedToken.email = adapterUser.email ?? extendedToken.email;
				}
				return extendedToken;
		},
		async session({ session, token }) {
				// Expose id/email on session.user for server/client use
				const extendedToken = token as ExtendedJWT;
				const mutableSession = session as Session;
				if (mutableSession.user) {
					(mutableSession.user as { id?: string | null }).id = extendedToken.id ?? null;
					mutableSession.user.email = extendedToken.email ?? mutableSession.user.email;
				}
				return mutableSession;
		},
		},
		secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

export function auth() {
	return getServerSession(authOptions);
}

