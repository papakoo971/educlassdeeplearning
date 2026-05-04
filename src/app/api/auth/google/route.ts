import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?error=missing_google_client_id", origin));
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return res;
}
