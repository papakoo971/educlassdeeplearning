import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-session";

export async function GET(req: Request) {
  const session = getSessionFromRequest(req);
  return NextResponse.json({ session });
}
