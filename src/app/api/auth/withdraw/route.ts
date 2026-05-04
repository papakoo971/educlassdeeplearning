import { NextResponse } from "next/server";
import { getSessionFromServer } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST() {
  const session = getSessionFromServer();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("users")
    .delete()
    .eq("user_id", session.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  cookies().delete("eduplan_session");
  return NextResponse.json({ ok: true });
}
