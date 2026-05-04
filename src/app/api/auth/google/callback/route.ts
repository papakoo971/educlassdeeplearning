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

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = (
    process.env.GOOGLE_REDIRECT_URI ?? `${url.origin}/api/auth/google/callback`
  ).trim();
  if (!clientId || !clientSecret) {
    console.error("[oauth] missing google credentials", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    return NextResponse.redirect(new URL("/login?error=missing_google_credentials", url.origin));
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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
  } catch (err) {
    console.error("[oauth] token fetch threw", {
      message: (err as Error).message,
      cause: (err as { cause?: unknown }).cause,
      redirectUri,
    });
    return NextResponse.redirect(new URL("/login?error=token_fetch_threw", url.origin));
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "<no body>");
    console.error("[oauth] token exchange not ok", { status: tokenRes.status, body, redirectUri });
    return NextResponse.redirect(new URL("/login?error=token_exchange_failed", url.origin));
  }

  const tokenData = (await tokenRes.json()) as GoogleToken;

  let userRes: Response;
  try {
    userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
  } catch (err) {
    console.error("[oauth] userinfo fetch threw", {
      message: (err as Error).message,
      cause: (err as { cause?: unknown }).cause,
    });
    return NextResponse.redirect(new URL("/login?error=userinfo_fetch_threw", url.origin));
  }

  if (!userRes.ok) {
    const body = await userRes.text().catch(() => "<no body>");
    console.error("[oauth] userinfo not ok", { status: userRes.status, body });
    return NextResponse.redirect(new URL("/login?error=userinfo_failed", url.origin));
  }

  const user = (await userRes.json()) as GoogleUserInfo;
  const sessionUser = {
    userId: `google:${user.sub}`,
    email: user.email,
    name: user.name,
    picture: user.picture
  };

  try {
    await upsertUser(sessionUser);
  } catch (err) {
    console.error("[oauth] upsertUser threw", {
      message: (err as Error).message,
      cause: (err as { cause?: unknown }).cause,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
    return NextResponse.redirect(new URL("/login?error=upsert_user_failed", url.origin));
  }

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
