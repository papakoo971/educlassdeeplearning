import { NextResponse } from "next/server";
import { generateStubResponse } from "@/lib/ai-stub";
import { OutcomeCard, StepKey, StepState } from "@/lib/domain";
import { buildLockedContext } from "@/lib/lock-load";
import { getSessionFromRequest } from "@/lib/auth-session";

type RequestBody = {
  step: StepKey;
  standardsText: string;
  steps: StepState;
  cards: OutcomeCard[];
};

export async function POST(req: Request) {
  const session = getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as RequestBody;
  if (!body.step || !body.steps || !body.cards) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const context = buildLockedContext(body.cards);
  const response = generateStubResponse({
    step: body.step,
    context,
    standardsText: body.standardsText,
    steps: body.steps
  });

  return NextResponse.json({ response });
}
