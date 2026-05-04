import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "eduplan_session";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  picture?: string;
};

function b64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function unb64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSecret() {
  return process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
}

export function signSession(user: SessionUser): string {
  const payload = b64url(JSON.stringify(user));
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  if (expected !== signature) return null;
  try {
    return JSON.parse(unb64url(payload)) as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: Request): SessionUser | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1];
  return verifySession(token);
}

export function getSessionFromServer(): SessionUser | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySession(token);
}
