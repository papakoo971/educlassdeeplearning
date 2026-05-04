import { NextResponse } from "next/server";
import { decryptApiKey } from "@/lib/crypto";
import { generateStubResponse } from "@/lib/ai-stub";
import { OutcomeCard, StepKey, StepState } from "@/lib/domain";
import { buildLockedContext } from "@/lib/lock-load";
import { buildPrompt, generateWithProvider, ProviderName } from "@/lib/llm-provider";
import { getAiSetting } from "@/lib/local-db";
import { getSessionFromRequest } from "@/lib/auth-session";

type Body = {
  step: StepKey;
  standardsText: string;
  steps: StepState;
  cards: OutcomeCard[];
};

function currentInputText(step: StepKey, steps: StepState): string {
  if (step === "step1") return `프로젝트명: ${steps.step1.projectTitle}\n대상 학년: ${steps.step1.targetGrade}\n대상 과목: ${steps.step1.targetSubject}\n학생 수행활동: ${steps.step1.studentActivity}`;
  if (step === "step2") return `프로젝트명: ${steps.step1.projectTitle}\n핵심 아이디어: ${steps.step2.coreIdea}`;
  if (step === "step3") return `핵심어: ${steps.step3.keyWords}\n핵심문장: ${steps.step3.keySentence}`;
  if (step === "step4") return steps.step4.activities.map((a) => `${a.name}: ${a.content}`).join("\n");
  if (step === "step5") return `무엇: ${steps.step5.evaluationWhat}\n왜: ${steps.step5.evaluationWhy}\n과제명: ${steps.step5.taskName}\nGoal: ${steps.step5.graspsGoal}`;
  return (steps.step6.lessons ?? []).map((l) => `${l.period}차시: ${l.content}`).join("\n");
}

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

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  const lockedContext = buildLockedContext(body.cards ?? []);

  let provider: ProviderName = "stub";
  let apiKey = "";
  let model = "";

  const setting = await getAiSetting(session.userId);
  if (setting) {
    provider = setting.provider as ProviderName;
    model = setting.model ?? "";
    apiKey = setting.encryptedKey ? decryptApiKey(setting.encryptedKey) : "";
  }

  const fallbackText = generateStubResponse({
    step: body.step,
    context: lockedContext,
    standardsText: body.standardsText ?? "",
    steps: body.steps
  });

  try {
    let finalText = fallbackText;
    if (provider !== "stub") {
      const prompt = buildPrompt({
        step: body.step,
        standardsText: body.standardsText ?? "",
        lockedContext,
        inputText: currentInputText(body.step, body.steps)
      });
      finalText = await generateWithProvider({ provider, apiKey, model, prompt });
    }

    return new NextResponse(streamText(finalText), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  } catch {
    return new NextResponse(streamText(fallbackText), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  }
}
