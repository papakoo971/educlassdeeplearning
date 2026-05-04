import { NextResponse } from "next/server";
import { decryptApiKey, encryptApiKey } from "@/lib/crypto";
import { getAiSetting, upsertAiSetting } from "@/lib/local-db";
import { ProviderName } from "@/lib/llm-provider";
import { getSessionFromRequest } from "@/lib/auth-session";

const VALID_PROVIDERS: ProviderName[] = ["stub", "openai", "anthropic", "gemini"];

export async function GET(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await getAiSetting(session.userId);
  let keyPreview = "";
  if (setting?.encryptedKey) {
    try {
      keyPreview = `${decryptApiKey(setting.encryptedKey).slice(0, 6)}...`;
    } catch {
      keyPreview = "";
    }
  }
  return NextResponse.json({
    provider: (setting?.provider ?? "stub") as ProviderName,
    model: setting?.model ?? "",
    keyConfigured: Boolean(setting?.encryptedKey),
    keyPreview,
    isFirstSetup: setting === null
  });
}

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    provider?: ProviderName;
    model?: string;
    apiKey?: string;
  };

  const provider = body.provider ?? "stub";
  const model = body.model ?? "";
  const apiKey = body.apiKey ?? "";

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const existing = await getAiSetting(session.userId);
  const encryptedKey = apiKey
    ? encryptApiKey(apiKey)
    : (existing?.encryptedKey ?? "");

  await upsertAiSetting({ userId: session.userId, provider, model, encryptedKey });

  return NextResponse.json({ ok: true });
}
