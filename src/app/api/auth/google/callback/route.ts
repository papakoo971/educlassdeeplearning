import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, signSession } from "@/lib/auth-session";
import { upsertUser } from "@/lib/local-db";

type GoogleToken = {
  access_token: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState =
    req.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("oauth_state="))
      ?.split("=")[1] ?? "";

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/login?error=invalid_oauth_state", url.origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${url.origin}/api/auth/google/callback`;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=missing_google_credentials", url.origin));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=token_exchange_failed", url.origin));
  }

  const tokenData = (await tokenRes.json()) as GoogleToken;
  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/login?error=userinfo_failed", url.origin));
  }

  const user = (await userRes.json()) as GoogleUserInfo;
  const sessionUser = {
    userId: `google:${user.sub}`,
    email: user.email,
    name: user.name,
    picture: user.picture
  };

  await upsertUser(sessionUser);

  const res = NextResponse.redirect(new URL("/dashboard", url.origin));
  res.cookies.set(SESSION_COOKIE_NAME, signSession(sessionUser), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
  res.cookies.set("oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return res;
}
