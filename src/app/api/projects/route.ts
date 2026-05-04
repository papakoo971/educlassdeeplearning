import { NextResponse } from "next/server";
import { LessonProject } from "@/lib/domain";
import { listProjects, upsertProject } from "@/lib/local-db";
import { getSessionFromRequest } from "@/lib/auth-session";

export async function GET(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await listProjects(session.userId);
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Partial<LessonProject>;
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const project: LessonProject = {
    id: body.id,
    userId: session.userId,
    title: body.title ?? "새 수업 설계",
    selectedStandardIds: body.selectedStandardIds ?? [],
    steps: body.steps as LessonProject["steps"],
    cards: body.cards ?? [],
    currentStep: body.currentStep ?? "step1",
    createdAt: body.createdAt ?? now,
    updatedAt: now
  };

  const saved = await upsertProject(project);
  return NextResponse.json({ project: saved });
}
