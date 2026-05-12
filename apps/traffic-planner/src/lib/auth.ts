import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "./db";
import { users } from "./schema";

declare module "next-auth" {
  interface User {
    role: "admin" | "supervisor";
    departmentId: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "admin" | "supervisor";
      departmentId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "admin" | "supervisor";
    departmentId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Supervisor login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, creds.email.toLowerCase()))
          .limit(1);
        if (!user) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        if ("role" in user) token.role = user.role;
        if ("departmentId" in user) token.departmentId = user.departmentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid;
        if (token.role) session.user.role = token.role;
        if (token.departmentId) session.user.departmentId = token.departmentId;
      }
      return session;
    },
  },
};
