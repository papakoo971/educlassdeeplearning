import { AchievementStandard, LessonProject } from "@/lib/domain";
import { supabase } from "@/lib/supabase";

// ── 행 → LessonProject 변환 ───────────────────────────────
function rowToProject(row: Record<string, unknown>): LessonProject {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: (row.title as string) ?? "",
    currentStep: (row.current_step as LessonProject["currentStep"]) ?? "step1",
    steps: (row.steps as LessonProject["steps"]) ?? {},
    cards: (row.cards as LessonProject["cards"]) ?? [],
    selectedStandardIds: (row.selected_standard_ids as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Projects ─────────────────────────────────────────────

export async function listProjects(userId: string): Promise<LessonProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToProject);
}

export async function getProjectById(userId: string, id: string): Promise<LessonProject | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single();

  if (error) return null;
  return rowToProject(data);
}

export async function upsertProject(project: LessonProject): Promise<LessonProject> {
  // users 행이 없으면 프로젝트 upsert 시 FK 오류 → upsert user 먼저
  await supabase
    .from("users")
    .upsert({ user_id: project.userId, email: "", name: "" }, { onConflict: "user_id", ignoreDuplicates: true });

  const row = {
    id: project.id,
    user_id: project.userId,
    title: project.title,
    current_step: project.currentStep,
    steps: project.steps,
    cards: project.cards,
    selected_standard_ids: project.selectedStandardIds,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };

  const { data, error } = await supabase
    .from("projects")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    if (error.message.includes("project_limit_exceeded")) {
      throw new Error("프로젝트는 최대 100개까지 저장할 수 있습니다.");
    }
    throw new Error(error.message);
  }

  return rowToProject(data);
}

// ── AI Settings ──────────────────────────────────────────

export async function getAiSetting(userId: string) {
  const { data, error } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return {
    userId: data.user_id as string,
    provider: data.provider as "stub" | "openai" | "anthropic" | "gemini",
    model: data.model as string,
    encryptedKey: data.encrypted_key as string,
    updatedAt: data.updated_at as string,
  };
}

export async function upsertAiSetting(input: {
  userId: string;
  provider: "stub" | "openai" | "anthropic" | "gemini";
  model: string;
  encryptedKey: string;
}) {
  const row = {
    user_id: input.userId,
    provider: input.provider,
    model: input.model,
    encrypted_key: input.encryptedKey,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ai_settings")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    userId: data.user_id as string,
    provider: data.provider as "stub" | "openai" | "anthropic" | "gemini",
    model: data.model as string,
    encryptedKey: data.encrypted_key as string,
    updatedAt: data.updated_at as string,
  };
}

// ── Custom Standards ─────────────────────────────────────

export async function listCustomStandards(userId: string): Promise<AchievementStandard[]> {
  const { data, error } = await supabase
    .from("custom_standards")
    .select("standard")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.standard as AchievementStandard);
}

export async function addCustomStandards(userId: string, standards: AchievementStandard[]) {
  const now = new Date().toISOString();
  const rows = standards.map((standard) => ({
    user_id: userId,
    standard,
    created_at: now,
  }));

  const { error } = await supabase
    .from("custom_standards")
    .upsert(rows, { onConflict: "user_id, (standard->>'achievementCode')", ignoreDuplicates: false });

  if (error) throw new Error(error.message);
  return standards.length;
}

// ── Users ────────────────────────────────────────────────

export async function upsertUser(input: {
  userId: string;
  email: string;
  name: string;
  picture?: string;
}) {
  const row = {
    user_id: input.userId,
    email: input.email,
    name: input.name,
    picture: input.picture ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return {
    userId: data.user_id as string,
    email: data.email as string,
    name: data.name as string,
    picture: data.picture as string | undefined,
    updatedAt: data.updated_at as string,
  };
}
