export type StepKey = "step1" | "step2" | "step3" | "step4" | "step5" | "step6" | "step7";

export type AchievementStandard = {
  id: string;
  schoolLevel: "elementary";
  gradeCluster: string;
  subject: string;
  domain: string;
  achievementCode: string;
  achievementText: string;
};

export type StepState = {
  step1: {
    projectTitle: string;
    targetGrade: string;
    targetSubject: string;
    studentActivity: string;
    materials: string;
    note: string;
  };
  step2: {
    coreIdea: string;
    operatingPeriod: string;
    contentElements: Record<string, { knowledge: string; process: string; value: string }>;
  };
  step3: {
    essentialQuestion: string;
    inquiryQuestions: string;
    keyWords: string;
    keySentence: string;
  };
  step4: {
    activities: Array<{ name: string; content: string; output: string }>;
  };
  step5: {
    evaluationWhat: string;
    evaluationWhy: string;
    taskName: string;
    graspsGoal: string;
    graspsRole: string;
    graspsAudience: string;
    graspsSituation: string;
    graspsProduct: string;
    graspsStandard: string;
    rubric: Array<{ element: string; high: string; mid: string; low: string }>;
  };
  step6: {
    lessons: Array<{ period: string; stage: string; content: string; output: string; relatedSubject: string }>;
  };
  step7: {
    note: string;
  };
};

export type OutcomeCard = {
  step: StepKey;
  title: string;
  summary: string;
  locked: boolean;
};

export type LessonProject = {
  id: string;
  userId: string;
  title: string;
  selectedStandardIds: string[];
  steps: StepState;
  cards: OutcomeCard[];
  currentStep: StepKey;
  createdAt: string;
  updatedAt: string;
};

export const STEP_ORDER: StepKey[] = ["step1", "step2", "step3", "step4", "step5", "step6", "step7"];

export const STEP_LABELS: Record<StepKey, string> = {
  step1: "1. 아이디어 탐색",
  step2: "2. 단원 설정",
  step3: "3. 개념 추출 및 탐구질문 작성",
  step4: "4. 주요활동 유목화",
  step5: "5. 평가 설계",
  step6: "6. 차시 설계",
  step7: "자료 다운로드 (DOCX, PDF)"
};

export const INITIAL_STEPS: StepState = {
  step1: { projectTitle: "", targetGrade: "", targetSubject: "", studentActivity: "", materials: "", note: "" },
  step2: { coreIdea: "", operatingPeriod: "", contentElements: {} },
  step3: { essentialQuestion: "", inquiryQuestions: "", keyWords: "", keySentence: "" },
  step4: { activities: [{ name: "", content: "", output: "" }] },
  step5: { evaluationWhat: "", evaluationWhy: "", taskName: "", graspsGoal: "", graspsRole: "", graspsAudience: "", graspsSituation: "", graspsProduct: "", graspsStandard: "", rubric: [{ element: "", high: "", mid: "", low: "" }] },
  step6: { lessons: [{ period: "1", stage: "", content: "", output: "", relatedSubject: "" }] },
  step7: { note: "" }
};

export const MOCK_STANDARDS: AchievementStandard[] = [
  {
    id: "el-sc-5-1",
    schoolLevel: "elementary",
    gradeCluster: "5~6학년군",
    subject: "과학",
    domain: "생명",
    achievementCode: "[6과12-01]",
    achievementText: "생물과 환경의 관계를 조사하고 생태계 보전 방안을 제안한다."
  },
  {
    id: "el-so-5-2",
    schoolLevel: "elementary",
    gradeCluster: "5~6학년군",
    subject: "사회",
    domain: "지속가능한 환경",
    achievementCode: "[6사08-03]",
    achievementText: "지역 환경 문제를 탐구하고 공동체 실천 방안을 설명한다."
  },
  {
    id: "el-ko-3-1",
    schoolLevel: "elementary",
    gradeCluster: "3~4학년군",
    subject: "국어",
    domain: "읽기",
    achievementCode: "[4국02-02]",
    achievementText: "글의 핵심 내용을 파악하여 자신의 생각을 말한다."
  }
];
