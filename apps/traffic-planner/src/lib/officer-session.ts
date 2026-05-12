import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "tp_officer_session";
const TTL_SECONDS = 60 * 60 * 24 * 14;

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export type OfficerSession = {
  officerId: string;
  planId: string;
  issuedAt: number;
};

export async function setOfficerSession(session: OfficerSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = sign(payload);
  const value = `${payload}.${sig}`;
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function getOfficerSession(): Promise<OfficerSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed?.officerId !== "string" || typeof parsed?.planId !== "string") {
      return null;
    }
    return parsed as OfficerSession;
  } catch {
    return null;
  }
}

export async function clearOfficerSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
