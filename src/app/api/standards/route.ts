import { NextResponse } from "next/server";
import { loadBuiltinStandards } from "@/lib/standards-csv";
import { listCustomStandards } from "@/lib/local-db";
import { getSessionFromRequest } from "@/lib/auth-session";

export async function GET(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const subjectFilter = (searchParams.get("subject") ?? "").trim();
  const gradeFilter = (searchParams.get("gradeCluster") ?? "").trim();

  const custom = await listCustomStandards(session.userId);
  const merged = [...loadBuiltinStandards(), ...custom];

  let standards = merged;

  if (subjectFilter) {
    standards = standards.filter((s) => s.subject === subjectFilter);
  }

  if (gradeFilter) {
    standards = standards.filter((s) => s.gradeCluster === gradeFilter);
  }

  if (q) {
    standards = standards.filter((s) => {
      return (
        s.achievementCode.toLowerCase().includes(q) ||
        s.achievementText.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q)
      );
    });
  }

  return NextResponse.json({ standards });
}
