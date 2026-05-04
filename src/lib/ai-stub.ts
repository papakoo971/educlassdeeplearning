import { StepKey, StepState } from "@/lib/domain";

type StubInput = {
  step: StepKey;
  context: string;
  standardsText: string;
  steps: StepState;
};

export function generateStubResponse(input: StubInput): string {
  if (input.step === "step1") {
    return [
      "프로젝트 아이디어 탐색 단계입니다.",
      `기준: ${input.standardsText || "선택된 성취기준 없음"}`,
      "추천: 학생 삶과 연결된 실천적 프로젝트 주제를 탐색해보세요.",
      "예시) 프로젝트명: '우리 지역 환경을 지켜라', 대상: 5학년, 과목: 과학+사회 융합",
      "학생 수행활동: 지역 환경 문제 조사 → 원인 분석 → 실천 방안 포스터 제작",
      "활용 교구: 태블릿 PC, 현장 조사지, 발표 자료 제작 도구"
    ].join("\n");
  }
  if (input.step === "step2") {
    return [
      "성취기준에서 내용 요소(명사)와 수행 요소(동사)를 추출했습니다.",
      `기준: ${input.standardsText || "선택된 성취기준 없음"}`,
      "추천: 지역 문제 탐구형 단원명과 관찰-설명-실천 목표를 포함하세요."
    ].join("\n");
  }
  if (input.step === "step3") {
    return [
      "전이 가능한 핵심 개념을 우선 제안합니다.",
      `고정 맥락:\n${input.context}`,
      "추천 개념: 시스템, 상호작용, 책임"
    ].join("\n");
  }
  if (input.step === "step4") {
    return [
      "핵심질문은 정답형이 아닌 관점 충돌형으로 설계합니다.",
      `고정 맥락:\n${input.context}`,
      "추천 핵심질문: 우리는 왜 같은 데이터를 다르게 해석할까?"
    ].join("\n");
  }
  if (input.step === "step5") {
    return [
      "GRASPS 형식으로 평가 과제를 구성합니다.",
      `고정 맥락:\n${input.context}`,
      "추천 루브릭 축: 개념 이해, 근거 제시, 실천 가능성"
    ].join("\n");
  }
  return [
    "WHERETO 전략을 기준으로 차시 흐름을 구성합니다.",
    `고정 맥락:\n${input.context}`,
    "추천: 도입(문제 제기) - 탐구(자료 분석) - 적용(지역 실천안) - 성찰"
  ].join("\n");
}
