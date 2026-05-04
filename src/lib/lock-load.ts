import { OutcomeCard, StepKey, StepState } from "@/lib/domain";

export function buildLockedContext(cards: OutcomeCard[]): string {
  const locked = cards.filter((c) => c.locked);
  if (!locked.length) {
    return "확정된 이전 단계가 없습니다.";
  }
  return locked.map((c) => `[${c.title}] ${c.summary}`).join("\n");
}

export function summarizeStep(step: StepKey, steps: StepState): string {
  if (step === "step1") {
    const parts = [`프로젝트명: ${steps.step1.projectTitle}`];
    if (steps.step1.targetGrade) parts.push(`대상 학년: ${steps.step1.targetGrade}`);
    if (steps.step1.targetSubject) parts.push(`대상 과목: ${steps.step1.targetSubject}`);
    if (steps.step1.studentActivity) parts.push(`학생 수행활동: ${steps.step1.studentActivity}`);
    if (steps.step1.materials) parts.push(`활용할 교구: ${steps.step1.materials}`);
    if (steps.step1.note) parts.push(`비고: ${steps.step1.note}`);
    return parts.join("\n");
  }
  if (step === "step2") {
    const parts = [
      `프로젝트명: ${steps.step1.projectTitle || "(미입력)"}`,
      `대상 학년: ${steps.step1.targetGrade} / 대상 과목: ${steps.step1.targetSubject}`,
      `핵심 아이디어: ${steps.step2.coreIdea}`,
    ];
    if (steps.step2.operatingPeriod) parts.push(`운영 차시: ${steps.step2.operatingPeriod}`);
    const elements = Object.entries(steps.step2.contentElements ?? {});
    if (elements.length > 0) {
      parts.push("내용 요소:");
      elements.forEach(([subj, el]) => {
        parts.push(`  [${subj}] 지식·이해: ${el.knowledge} / 과정·기능: ${el.process} / 가치·태도: ${el.value}`);
      });
    }
    return parts.join("\n");
  }
  if (step === "step3") {
    const parts: string[] = [];
    if (steps.step3.keyWords) parts.push(`핵심어: ${steps.step3.keyWords}`);
    if (steps.step3.keySentence) parts.push(`핵심문장: ${steps.step3.keySentence}`);
    if (steps.step3.essentialQuestion) parts.push(`핵심 질문: ${steps.step3.essentialQuestion}`);
    if (steps.step3.inquiryQuestions) parts.push(`탐구질문: ${steps.step3.inquiryQuestions}`);
    return parts.join("\n") || "(미입력)";
  }
  if (step === "step4") {
    const acts = steps.step4.activities ?? [];
    if (!acts.length) return "(미입력)";
    return acts.map((a, i) => `활동${i + 1}. ${a.name}\n  내용: ${a.content}\n  산출물: ${a.output}`).join("\n");
  }
  if (step === "step5") {
    const parts: string[] = [];
    if (steps.step5.evaluationWhat) parts.push(`무엇을 평가하는가: ${steps.step5.evaluationWhat}`);
    if (steps.step5.evaluationWhy) parts.push(`왜 평가하는가: ${steps.step5.evaluationWhy}`);
    if (steps.step5.taskName) parts.push(`과제명: ${steps.step5.taskName}`);
    if (steps.step5.graspsGoal) parts.push(`Goal(목표): ${steps.step5.graspsGoal}`);
    if (steps.step5.graspsRole) parts.push(`Role(역할): ${steps.step5.graspsRole}`);
    if (steps.step5.graspsAudience) parts.push(`Audience(청중): ${steps.step5.graspsAudience}`);
    if (steps.step5.graspsSituation) parts.push(`Situation(상황): ${steps.step5.graspsSituation}`);
    if (steps.step5.graspsProduct) parts.push(`Product(결과물): ${steps.step5.graspsProduct}`);
    if (steps.step5.graspsStandard) parts.push(`Standard(준거): ${steps.step5.graspsStandard}`);
    const rubric = steps.step5.rubric ?? [];
    rubric.forEach((r) => {
      if (r.element) parts.push(`[${r.element}] 상: ${r.high} / 중: ${r.mid} / 하: ${r.low}`);
    });
    return parts.join("\n") || "(미입력)";
  }
  if (step === "step6") {
    const lessons = steps.step6.lessons ?? [];
    if (!lessons.length) return "(미입력)";
    return lessons.map((l) => [
      `${l.period}차시`,
      l.stage ? `[${l.stage}]` : "",
      l.content,
      l.output ? `산출물: ${l.output}` : "",
      l.relatedSubject ? `관련교과: ${l.relatedSubject}` : "",
    ].filter(Boolean).join(" ")).join("\n");
  }
  return "자료 다운로드";
}

export function validateStep(step: StepKey, steps: StepState): string | null {
  if (step === "step1") {
    if (!steps.step1.targetGrade.trim()) return "대상 학년을 입력하세요.";
    if (!steps.step1.targetSubject.trim()) return "대상 과목을 입력하세요.";
    return null;
  }
  if (step === "step2") {
    if (!steps.step1.projectTitle.trim()) return "프로젝트명(단원명)을 입력하세요.";
    if (!steps.step2.coreIdea.trim()) return "핵심 아이디어를 입력하세요.";
    return null;
  }
  if (step === "step3") {
    return null;
  }
  if (step === "step4") {
    const acts = steps.step4.activities ?? [];
    if (!acts.some((a) => a.name.trim())) return "활동명을 하나 이상 입력하세요.";
    return null;
  }
  if (step === "step5") {
    if (!steps.step5.evaluationWhat.trim()) return "무엇을 평가하는가를 입력하세요.";
    return null;
  }
  if (step === "step6") {
    const lessons = steps.step6.lessons ?? [];
    if (!lessons.some((l) => l.content.trim())) return "차시별 활동 내용을 입력하세요.";
    return null;
  }
  return null;
}
