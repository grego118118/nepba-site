import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "./auth";

export async function requireSupervisor() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function getSupervisor() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}
