export type ProviderName = "stub" | "openai" | "anthropic" | "gemini";

const SYSTEM_PROMPT =
  "당신은 초등 교사의 수업 설계를 돕는 개념기반 탐구학습 수업 설계 전문가 입니다. " +
  "교사가 선택한 성취기준을 바탕으로 실용적이고 구체적인 조언을 한국어로 제공하세요. " 
  "응답 시 마크다운 기호(**, *, #, ##, ###, ---, ___ 등)를 절대 사용하지 마세요. 강조나 제목 구분이 필요하면 일반 텍스트와 줄바꿈만 사용하세요.";

type GenerateInput = {
  provider: ProviderName;
  apiKey: string;
  model: string;
  prompt: string;
};

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || (process.env.OPENAI_MODEL ?? "o3-mini"),
      input: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_output_tokens: 16384
    })
  });

  if (!res.ok) throw new Error(`OpenAI failed: ${res.status}`);
  const data = (await res.json()) as { output_text?: string };
  return data.output_text ?? "";
}

async function callAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: model || (process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001"),

      max_tokens: 16384,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) throw new Error(`Anthropic failed: ${res.status}`);
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.map((c) => c.text ?? "").join("\n") ?? "";
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const resolvedModel = model || (process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 16384 }
    })
  });

  if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

export async function generateWithProvider(input: GenerateInput): Promise<string> {
  if (input.provider === "stub") {
    return input.prompt;
  }
  if (!input.apiKey) {
    throw new Error("API key is missing");
  }
  if (input.provider === "openai") return callOpenAI(input.apiKey, input.model, input.prompt);
  if (input.provider === "gemini") return callGemini(input.apiKey, input.model, input.prompt);
  return callAnthropic(input.apiKey, input.model, input.prompt);
}

export function buildPrompt(args: {
  step: string;
  standardsText: string;
  lockedContext: string;
  inputText: string;
}) {
  return [
    `Step: ${args.step}`,
    "",
    "Locked context from previous confirmed steps:",
    args.lockedContext || "No locked context",
    "",
    "Selected standards:",
    args.standardsText || "None",
    "",
    "Current input draft:",
    args.inputText,
    "",
    "Return concise guidance in Korean. Keep it practical and classroom-ready."
  ].join("\n");
}
