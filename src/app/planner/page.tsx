"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AISettingsModal } from "@/components/AISettingsModal";
import { DesignLab } from "@/components/DesignLab";
import { OutcomeArchive } from "@/components/OutcomeArchive";
import { StepNavigation } from "@/components/StepNavigation";
import {
  AchievementStandard,
  INITIAL_STEPS,
  OutcomeCard,
  StepKey,
  STEP_LABELS,
  STEP_ORDER,
  StepState
} from "@/lib/domain";

function normalizeSteps(raw: StepState): StepState {
  return {
    step1: { ...INITIAL_STEPS.step1, ...(raw.step1 ?? {}) },
    step2: { ...INITIAL_STEPS.step2, ...(raw.step2 ?? {}) },
    step3: { ...INITIAL_STEPS.step3, ...(raw.step3 ?? {}) },
    step4: { activities: (raw.step4 as { activities?: { name: string; content: string; output: string }[] }).activities ?? INITIAL_STEPS.step4.activities },
    step5: {
      evaluationWhat: (raw.step5 as { evaluationWhat?: string }).evaluationWhat ?? "",
      evaluationWhy: (raw.step5 as { evaluationWhy?: string }).evaluationWhy ?? "",
      taskName: (raw.step5 as { taskName?: string }).taskName ?? "",
      graspsGoal: (raw.step5 as { graspsGoal?: string; graspsTask?: string }).graspsGoal ?? (raw.step5 as { graspsTask?: string }).graspsTask ?? "",
      graspsRole: (raw.step5 as { graspsRole?: string }).graspsRole ?? "",
      graspsAudience: (raw.step5 as { graspsAudience?: string }).graspsAudience ?? "",
      graspsSituation: (raw.step5 as { graspsSituation?: string }).graspsSituation ?? "",
      graspsProduct: (raw.step5 as { graspsProduct?: string }).graspsProduct ?? "",
      graspsStandard: (raw.step5 as { graspsStandard?: string }).graspsStandard ?? "",
      rubric: (raw.step5 as { rubric?: { element: string; high: string; mid: string; low: string }[] }).rubric ?? INITIAL_STEPS.step5.rubric,
    },
    step6: {
      lessons: ((raw.step6 as unknown as { lessons?: { period: string; stage?: string; content: string; output: string; relatedSubject?: string }[] }).lessons
        ?.map((l) => ({ period: l.period ?? "", stage: l.stage ?? "", content: l.content ?? "", output: l.output ?? "", relatedSubject: l.relatedSubject ?? "" }))
      ) ??
        ((raw.step6 as unknown as { lessonFlow?: string }).lessonFlow
          ? [{ period: "1", stage: "", content: (raw.step6 as unknown as { lessonFlow: string }).lessonFlow, output: "", relatedSubject: "" }]
          : INITIAL_STEPS.step6.lessons),
    },
    step7: { ...INITIAL_STEPS.step7, ...(raw.step7 ?? {}) },
  };
}
import { summarizeStep, validateStep } from "@/lib/lock-load";

type ProjectListResponse = {
  projects: Array<{
    id: string;
    title: string;
    selectedStandardIds: string[];
    steps: StepState;
    cards: OutcomeCard[];
    currentStep: StepKey;
  }>;
};

function PlannerInner() {
  const searchParams = useSearchParams();
  const targetProjectId = searchParams.get("projectId");

  const [projectId, setProjectId] = useState(() => crypto.randomUUID());
  const [projectTitle, setProjectTitle] = useState("새 수업 설계");
  const [currentStep, setCurrentStep] = useState<StepKey>("step1");
  const [steps, setSteps] = useState<StepState>(INITIAL_STEPS);
  const [cards, setCards] = useState<OutcomeCard[]>([]);
  const [selectedStandardIds, setSelectedStandardIds] = useState<string[]>([]);
  const [aiResponse, setAiResponse] = useState("");
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("불러오는 중...");
  const [loaded, setLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [standardsPool, setStandardsPool] = useState<AchievementStandard[]>([]);
  const [showAISettings, setShowAISettings] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [aiLabel, setAiLabel] = useState("");
  const [userName, setUserName] = useState("");

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamController = useRef<AbortController | null>(null);

  const selectedStandards = useMemo(
    () => standardsPool.filter((s) => selectedStandardIds.includes(s.id)),
    [selectedStandardIds, standardsPool]
  );

  const standardsText = selectedStandards
    .map((s) => `${s.achievementCode} ${s.achievementText}`)
    .join("\n");

  const fetchStandards = async () => {
    const res = await fetch("/api/standards");
    if (!res.ok) return;
    const data = (await res.json()) as { standards: AchievementStandard[] };
    setStandardsPool(data.standards);
  };

  const fetchAISettings = async (autoOpen = false) => {
    const res = await fetch("/api/settings/ai");
    if (!res.ok) return;
    const data = (await res.json()) as {
      provider: string;
      model: string;
      isFirstSetup: boolean;
    };
    const label =
      data.provider === "stub"
        ? "Stub"
        : `${data.provider === "gemini" ? "Gemini" : data.provider === "openai" ? "OpenAI" : "Anthropic"} · ${data.model}`;
    setAiLabel(label);
    if (autoOpen && data.isFirstSetup) {
      setIsFirstSetup(true);
      setShowAISettings(true);
    }
  };

  const loadProjectById = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) return false;
    const data = (await res.json()) as {
      project: {
        id: string;
        title: string;
        selectedStandardIds: string[];
        steps: StepState;
        cards: OutcomeCard[];
        currentStep: StepKey;
      };
    };
    setProjectId(data.project.id);
    setProjectTitle(data.project.title);
    setSelectedStandardIds(data.project.selectedStandardIds);
    setSteps(normalizeSteps(data.project.steps));
    setCards(data.project.cards);
    setCurrentStep(data.project.currentStep);
    return true;
  };

  useEffect(() => {
    void (async () => {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = (await sessionRes.json()) as { session: { userId: string; name: string } | null };
      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }
      setUserName(sessionData.session.name);

      let loadedFromTarget = false;
      if (targetProjectId) {
        loadedFromTarget = await loadProjectById(targetProjectId);
      }

      if (!loadedFromTarget) {
        const res = await fetch("/api/projects");
        if (!res.ok) {
          setSaveStatus("저장소 사용 불가");
          setLoaded(true);
          await fetchStandards();
          return;
        }

        const data = (await res.json()) as ProjectListResponse;
        const latest = data.projects[0];
        if (latest) {
          setProjectId(latest.id);
          setProjectTitle(latest.title);
          setSelectedStandardIds(latest.selectedStandardIds);
          setSteps(normalizeSteps(latest.steps));
          setCards(latest.cards);
          setCurrentStep(latest.currentStep);
          setSaveStatus("최근 프로젝트 로드됨");
        } else {
          setSaveStatus("새 프로젝트");
        }
      } else {
        setSaveStatus("선택한 프로젝트 로드됨");
      }

      setLoaded(true);
      await fetchStandards();
      await fetchAISettings(true);
    })();
  }, [targetProjectId]);

  useEffect(() => {
    if (!loaded) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void (async () => {
        setSaveStatus("자동 저장 중...");
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: projectId,
            title: projectTitle,
            selectedStandardIds,
            steps,
            cards,
            currentStep
          })
        });
        setSaveStatus(res.ok ? "자동 저장됨" : "자동 저장 실패");
      })();
    }, 800);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [loaded, projectId, projectTitle, selectedStandardIds, steps, cards, currentStep]);

  const runAssist = () => {
    if (streamController.current) streamController.current.abort();
    const controller = new AbortController();
    streamController.current = controller;

    void (async () => {
      setIsStreaming(true);
      setAiResponse("");

      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: currentStep,
          standardsText,
          steps,
          cards
        }),
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        setAiResponse("AI 보조 실패.");
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setAiResponse((prev) => prev + chunk);
      }
      setIsStreaming(false);
    })().catch(() => {
      setAiResponse("AI 보조 실패.");
      setIsStreaming(false);
    });
  };

  const confirmStep = () => {
    const invalid = validateStep(currentStep, steps);
    if (currentStep === "step2" && selectedStandardIds.length === 0) {
      setError("성취기준을 하나 이상 선택하세요.");
      return;
    }
    if (invalid) {
      setError(invalid);
      return;
    }

    setError("");
    const nextSummary = summarizeStep(currentStep, steps);
    setCards((prev) => {
      const exists = prev.find((c) => c.step === currentStep);
      if (exists) {
        return prev.map((c) =>
          c.step === currentStep ? { ...c, summary: nextSummary, locked: true } : c
        );
      }
      return [
        ...prev,
        {
          step: currentStep,
          title: STEP_LABELS[currentStep],
          summary: nextSummary,
          locked: true
        }
      ];
    });

    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) setCurrentStep(STEP_ORDER[idx + 1]);
  };

  const toggleStandard = (id: string) => {
    setSelectedStandardIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const editCard = (step: StepKey, summary: string) => {
    setCards((prev) => prev.map((c) => (c.step === step ? { ...c, summary } : c)));
  };

  const createNewProject = () => {
    if (streamController.current) streamController.current.abort();
    setProjectId(crypto.randomUUID());
    setProjectTitle("새 수업 설계");
    setCurrentStep("step1");
    setSteps(INITIAL_STEPS);
    setCards([]);
    setSelectedStandardIds([]);
    setAiResponse("");
    setError("");
    setSaveStatus("새 프로젝트 생성됨");
  };

  return (
    <main className="px-5 py-5 max-w-[1400px] mx-auto">
      {showAISettings && (
        <AISettingsModal
          isFirstSetup={isFirstSetup}
          onClose={() => setShowAISettings(false)}
          onSaved={() => { void fetchAISettings(); }}
        />
      )}
      <section className="bg-panel border border-line rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">단원 설계</h1>
          {userName && (
            <span className="text-sm text-muted">
              <span className="font-medium text-ink">{userName}</span> 선생님, 환영합니다.
            </span>
          )}
        </div>
        <p className="text-muted text-sm mb-2">
          성취기준을 바탕으로 6단계를 거쳐 연결된 단원 설계를 완성하세요.
        </p>
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} className="flex-1 min-w-[160px]" />
          <button
            type="button"
            className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 cursor-pointer"
            onClick={createNewProject}
          >
            새 프로젝트
          </button>
          <a href="/dashboard">
            <button type="button" className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 cursor-pointer">
              대시보드
            </button>
          </a>
          <small className="text-muted text-xs">{saveStatus}</small>
          <button
            type="button"
            className="border border-mint text-mint rounded-lg px-3 py-2 cursor-pointer text-sm ml-auto"
            onClick={() => { setIsFirstSetup(false); setShowAISettings(true); }}
          >
            AI 설정 {aiLabel && <span className="text-xs opacity-70">({aiLabel})</span>}
          </button>
        </div>
      </section>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-[280px_1fr]">
        <StepNavigation currentStep={currentStep} cards={cards} onSelectStep={setCurrentStep} />
        <DesignLab
          step={currentStep}
          steps={steps}
          standards={standardsPool}
          selectedStandardIds={selectedStandardIds}
          cards={cards}
          aiResponse={aiResponse}
          error={error}
          onChangeSteps={setSteps}
          onToggleStandard={toggleStandard}
          onRunAssist={runAssist}
          onConfirm={confirmStep}
        />
      </div>

      {currentStep !== "step7" && (
        <div className="mt-3">
          <OutcomeArchive cards={cards} onEditCard={editCard} onJump={setCurrentStep} />
        </div>
      )}
    </main>
  );
}

export default function PlannerPage() {
  return (
    <Suspense>
      <PlannerInner />
    </Suspense>
  );
}
