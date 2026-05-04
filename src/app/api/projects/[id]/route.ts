import { NextResponse } from "next/server";
import { getProjectById } from "@/lib/local-db";
import { getSessionFromRequest } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await getProjectById(session.userId, params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", params.id)
    .eq("user_id", session.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
