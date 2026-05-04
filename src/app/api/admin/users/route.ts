import { NextResponse } from "next/server";
import { getSessionFromServer } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "papakoo971@gmail.com";

export async function GET() {
  const session = getSessionFromServer();
  if (!session || session.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("user_id, email, name, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: counts } = await supabase
    .from("projects")
    .select("user_id");

  const projectCountMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    projectCountMap[row.user_id] = (projectCountMap[row.user_id] ?? 0) + 1;
  }

  const result = (users ?? []).map((u) => ({
    userId: u.user_id,
    email: u.email,
    name: u.name,
    updatedAt: u.updated_at,
    projectCount: projectCountMap[u.user_id] ?? 0,
  }));

  return NextResponse.json({ users: result });
}
