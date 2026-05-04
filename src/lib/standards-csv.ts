import fs from "fs";
import path from "path";
import { AchievementStandard } from "@/lib/domain";

let cached: AchievementStandard[] | null = null;

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function loadBuiltinStandards(): AchievementStandard[] {
  if (cached) return cached;

  const csvPath = path.join(process.cwd(), "data", "2022_curri_elementray.csv");
  let raw = fs.readFileSync(csvPath, "utf-8");

  // Strip BOM if present
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

  const lines = raw.split(/\r?\n/).filter(Boolean);
  // Skip header row
  const dataLines = lines.slice(1);

  const standards: AchievementStandard[] = [];
  for (const line of dataLines) {
    const cols = parseCSVLine(line);
    if (cols.length < 6) continue;

    const [, gradeCluster, subject, domain, achievementCode, achievementText] = cols;
    if (!achievementCode || !achievementText) continue;

    standards.push({
      id: achievementCode.trim(),
      schoolLevel: "elementary",
      gradeCluster: gradeCluster.trim(),
      subject: subject.trim(),
      domain: domain.trim(),
      achievementCode: achievementCode.trim(),
      achievementText: achievementText.trim(),
    });
  }

  cached = standards;
  return standards;
}
