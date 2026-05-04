/**
 * data/projects.json → Supabase 마이그레이션 스크립트
 * 실행: node scripts/migrate-to-supabase.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// .env.local 수동 파싱
const envPath = join(ROOT, ".env.local");
const envRaw = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envRaw
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .filter(([k, v]) => k && v)
    .map(([k, ...rest]) => [k, rest.join("=")])
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SUPABASE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ .env.local에 Supabase 환경변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const DB_FILE = join(ROOT, "data", "projects.json");
const raw = JSON.parse(readFileSync(DB_FILE, "utf8"));

const projects = raw.projects ?? [];
const users = raw.users ?? [];
const aiSettings = raw.aiSettings ?? [];
const customStandards = raw.customStandards ?? [];

let ok = 0, fail = 0;

// ── 1. 사용자 ────────────────────────────────────────────
console.log(`\n👤 사용자 마이그레이션 (${users.length}명)`);
for (const u of users) {
  const { error } = await supabase.from("users").upsert(
    {
      user_id: u.userId,
      email: u.email,
      name: u.name,
      picture: u.picture ?? null,
      updated_at: u.updatedAt,
    },
    { onConflict: "user_id" }
  );
  if (error) { console.error(`  ✗ ${u.userId}:`, error.message); fail++; }
  else { console.log(`  ✓ ${u.email}`); ok++; }
}

// projects에 있는 userId 중 users 테이블에 없는 경우 자동 생성
const knownUserIds = new Set(users.map((u) => u.userId));
const projectUserIds = [...new Set(projects.map((p) => p.userId))];
for (const uid of projectUserIds) {
  if (knownUserIds.has(uid)) continue;
  const { error } = await supabase.from("users").upsert(
    { user_id: uid, email: uid, name: uid },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (!error) console.log(`  ✓ (자동생성) ${uid}`);
}

// ── 2. 프로젝트 ──────────────────────────────────────────
console.log(`\n📁 프로젝트 마이그레이션 (${projects.length}개)`);
ok = 0; fail = 0;
for (const p of projects) {
  const { error } = await supabase.from("projects").upsert(
    {
      id: p.id,
      user_id: p.userId,
      title: p.title ?? "",
      current_step: p.currentStep ?? "step1",
      steps: p.steps ?? {},
      cards: p.cards ?? [],
      selected_standard_ids: p.selectedStandardIds ?? [],
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    },
    { onConflict: "id" }
  );
  if (error) { console.error(`  ✗ [${p.title}]:`, error.message); fail++; }
  else { console.log(`  ✓ ${p.title || p.id}`); ok++; }
}
console.log(`  → 성공 ${ok}개 / 실패 ${fail}개`);

// ── 3. AI 설정 ───────────────────────────────────────────
console.log(`\n⚙️  AI 설정 마이그레이션 (${aiSettings.length}개)`);
ok = 0; fail = 0;
for (const s of aiSettings) {
  const { error } = await supabase.from("ai_settings").upsert(
    {
      user_id: s.userId,
      provider: s.provider,
      model: s.model,
      encrypted_key: s.encryptedKey,
      updated_at: s.updatedAt,
    },
    { onConflict: "user_id" }
  );
  if (error) { console.error(`  ✗ ${s.userId}:`, error.message); fail++; }
  else { console.log(`  ✓ ${s.userId} (${s.provider})`); ok++; }
}
console.log(`  → 성공 ${ok}개 / 실패 ${fail}개`);

// ── 4. 커스텀 성취기준 ───────────────────────────────────
console.log(`\n📋 커스텀 성취기준 마이그레이션 (${customStandards.length}개)`);
ok = 0; fail = 0;
for (const row of customStandards) {
  const { error } = await supabase.from("custom_standards").upsert(
    {
      user_id: row.userId,
      standard: row.standard,
      created_at: row.createdAt,
    },
    { onConflict: "user_id, (standard->>'achievementCode')", ignoreDuplicates: true }
  );
  if (error) { console.error(`  ✗:`, error.message); fail++; }
  else { ok++; }
}
console.log(`  → 성공 ${ok}개 / 실패 ${fail}개`);

console.log("\n✅ 마이그레이션 완료");
