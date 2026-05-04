"use client";

import { OutcomeCard, StepKey, STEP_LABELS, STEP_ORDER } from "@/lib/domain";

type Props = {
  currentStep: StepKey;
  cards: OutcomeCard[];
  onSelectStep: (step: StepKey) => void;
};

function getStatus(step: StepKey, currentStep: StepKey, cards: OutcomeCard[]) {
  const card = cards.find((c) => c.step === step);
  if (card?.locked) return "완료(잠금)";
  if (step === currentStep) return "진행 중";
  return "미진행";
}

export function StepNavigation({ currentStep, cards, onSelectStep }: Props) {
  const completeCount = cards.filter((c) => c.locked && c.step !== "step7").length;
  const progress = Math.min(100, Math.round((completeCount / 6) * 100));

  return (
    <aside className="bg-panel border border-line rounded-2xl p-3.5 min-h-[640px]">
      <h2 className="text-lg font-semibold mb-1">단계 내비게이션</h2>
      <p className="text-muted text-sm">완성도 {progress}%</p>
      <div className="w-full h-2 bg-[#dceceb] rounded-full my-2.5 mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#58bea8] to-[#3ea58f]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid gap-2">
        {STEP_ORDER.map((step) => {
          const status = getStatus(step, currentStep, cards);
          const isActive = currentStep === step;
          return (
            <button
              key={step}
              type="button"
              className={`border rounded-xl bg-[#f9fcfc] p-2.5 text-left grid gap-0.5 cursor-pointer w-full ${
                isActive
                  ? "border-mint shadow-[inset_0_0_0_1px_#36a58b]"
                  : "border-line"
              }`}
              onClick={() => onSelectStep(step)}
            >
              <span className="text-sm font-medium">{STEP_LABELS[step]}</span>
              {step !== "step7" && <small className="text-muted text-xs">{status}</small>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
