import { NextResponse } from "next/server";
import { addCustomStandards } from "@/lib/local-db";
import { AchievementStandard } from "@/lib/domain";
import { getSessionFromRequest } from "@/lib/auth-session";

type UploadBody = {
  userId?: string;
  format?: "json" | "csv";
  payload?: string;
};

function normalize(row: Partial<AchievementStandard>, index: number): AchievementStandard | null {
  const achievementCode = (row.achievementCode ?? "").trim();
  const achievementText = (row.achievementText ?? "").trim();
  const subject = (row.subject ?? "").trim();
  const domain = (row.domain ?? "").trim();
  const gradeCluster = (row.gradeCluster ?? "").trim();

  if (!achievementCode || !achievementText || !subject || !domain || !gradeCluster) {
    return null;
  }

  return {
    id: row.id?.trim() || `custom-${achievementCode}-${index}`,
    schoolLevel: "elementary",
    achievementCode,
    achievementText,
    subject,
    domain,
    gradeCluster
  };
}

function parseCsv(text: string): Partial<AchievementStandard>[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Partial<AchievementStandard>[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push({
      id: row.id,
      achievementCode: row.achievementCode,
      achievementText: row.achievementText,
      subject: row.subject,
      domain: row.domain,
      gradeCluster: row.gradeCluster,
      schoolLevel: "elementary"
    });
  }

  return rows;
}

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as UploadBody;
  const format = body.format ?? "json";
  const payload = body.payload ?? "";

  if (!payload.trim()) {
    return NextResponse.json({ error: "payload is required" }, { status: 400 });
  }

  let parsedRows: Partial<AchievementStandard>[] = [];
  if (format === "json") {
    try {
      const arr = JSON.parse(payload) as Partial<AchievementStandard>[];
      parsedRows = Array.isArray(arr) ? arr : [];
    } catch {
      return NextResponse.json({ error: "invalid json payload" }, { status: 400 });
    }
  } else {
    parsedRows = parseCsv(payload);
  }

  const normalized = parsedRows
    .map((row, idx) => normalize(row, idx))
    .filter((row): row is AchievementStandard => Boolean(row));

  if (!normalized.length) {
    return NextResponse.json({ error: "no valid standards found" }, { status: 400 });
  }

  await addCustomStandards(session.userId, normalized);
  return NextResponse.json({ ok: true, inserted: normalized.length });
}
