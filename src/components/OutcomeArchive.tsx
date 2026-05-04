"use client";

import { OutcomeCard, STEP_LABELS, StepKey } from "@/lib/domain";

type Props = {
  cards: OutcomeCard[];
  onEditCard: (step: StepKey, summary: string) => void;
  onJump: (step: StepKey) => void;
};

export function OutcomeArchive({ cards, onEditCard, onJump }: Props) {
  return (
    <aside className="bg-panel border border-line rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold">확정 결과 보관함</h2>
        <p className="text-muted text-xs">확정된 내용은 다음 단계 프롬프트에 자동 주입됩니다.</p>
      </div>
      {cards.length === 0 ? (
        <p className="text-muted text-sm mt-2">아직 확정된 카드가 없습니다.</p>
      ) : (
        <div className="grid gap-2.5 mt-2 grid-cols-1">
          {cards.map((card) => (
            <article key={card.step} className="border border-line rounded-xl p-2.5 grid gap-2 bg-[#fafeff]">
              <div className="flex justify-between items-center">
                <strong className="text-sm">{STEP_LABELS[card.step]}</strong>
                <button
                  type="button"
                  className="border border-line bg-[#f7fbfb] rounded-lg px-2 py-1 text-xs cursor-pointer"
                  onClick={() => onJump(card.step)}
                >
                  이동
                </button>
              </div>
              <textarea
                rows={card.step === "step5" || card.step === "step6" ? 20 : 10}
                value={card.summary}
                onChange={(e) => onEditCard(card.step, e.target.value)}
              />
              <small className="text-muted text-xs">{card.locked ? "상태: 잠금" : "상태: 임시"}</small>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
