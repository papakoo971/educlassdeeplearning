import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/crypto";
import { getAiSetting } from "@/lib/local-db";
import { generateWithProvider, ProviderName } from "@/lib/llm-provider";
import { getSessionFromRequest } from "@/lib/auth-session";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Body = {
  standardsText: string;
  messages: ChatMessage[];
  systemPrompt?: string;
};

function streamText(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      try {
        const chunkSize = 32;
        for (let i = 0; i < text.length; i += chunkSize) {
          controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
        }
      } finally {
        controller.close();
      }
    }
  });
}

const MARKDOWN_RULE =
  " 응답 시 마크다운 기호(**, *, #, ##, ###, ---, ___ 등)를 절대 사용하지 마세요. 강조나 제목 구분이 필요하면 일반 텍스트와 줄바꿈만 사용하세요.";

const DEFAULT_SYSTEM =
  "당신은 초등 교사의 수업 설계를 돕는 개념기반 탐구학습 수업 설계 전문가 입니다. " +
  "교사가 선택한 성취기준을 바탕으로 실용적이고 구체적인 조언을 한국어로 제공하세요." +
  MARKDOWN_RULE;

function buildChatPrompt(standardsText: string, messages: ChatMessage[], systemPrompt?: string): string {
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "교사" : "AI"}: ${m.content}`)
    .join("\n\n");

  const lastMessage = messages.at(-1)?.content ?? "";

  return [
    (systemPrompt ? systemPrompt + MARKDOWN_RULE : DEFAULT_SYSTEM),
    "",
    "## 선택된 성취기준",
    standardsText || "없음",
    "",
    history ? `## 이전 대화\n${history}\n` : "",
    "## 교사의 질문",
    lastMessage
  ].filter(Boolean).join("\n");
}

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;

  let provider: ProviderName = "stub";
  let apiKey = "";
  let model = "";

  const setting = await getAiSetting(session.userId);
  if (setting) {
    provider = setting.provider as ProviderName;
    model = setting.model ?? "";
    apiKey = setting.encryptedKey ? decryptApiKey(setting.encryptedKey) : "";
  }

  const fallback =
    "AI 설정이 stub 모드입니다. 플래너 상단의 'AI 설정' 버튼에서 API 키를 설정하면 실제 AI와 대화할 수 있습니다.";

  if (provider === "stub") {
    return new NextResponse(streamText(fallback), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" }
    });
  }

  try {
    const prompt = buildChatPrompt(body.standardsText, body.messages, body.systemPrompt);
    const text = await generateWithProvider({ provider, apiKey, model, prompt });
    return new NextResponse(streamText(text), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" }
    });
  } catch {
    return new NextResponse(streamText(fallback), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" }
    });
  }
}
