"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AchievementStandard, OutcomeCard, StepKey, StepState } from "@/lib/domain";
import { generateDocx } from "@/lib/export-docx";

type ChatMessage = { role: "user" | "assistant"; content: string };

const DEFAULT_SYSTEM_PROMPT =
  `당신은 초등 교사의 수업 설계를 돕는 개념기반 탐구학습 수업 설계 전문가 입니다. 교사가 선택한 성취기준을 바탕으로 실용적이고 구체적인 조언을 한국어로 제공하세요.`;
const DEFAULT_STEP3_AUTO = "위 내용을 바탕으로 프로젝트의 핵심 질문 2가지와 탐구질문 10가지, 핵심어, 핵심 문장을 추출해줘.";
const DEFAULT_STEP4_AUTO = "위 내용을 기반으로 프로젝트 운영에 필요한 주요 활동을 유목화해주세요. 활동명, 활동 내용, 관련 탐구질문, 활동 산출물을 알려주세요.";
const DEFAULT_STEP5_AUTO = `위 프로젝트 내용을 기반으로 학습한 내용의 전이가 일어나는 평가를 추천해주세요.
1. 무엇을 평가하는가?, 2. 왜 평가하는가? 에 해당하는 내용을 추천해주고, GRASPS 과제로 적절한 과제를 추천해주세요. 추천한 과제의 평가 루브릭으로 평가요소별 상중하 평가기준도 추천해주세요.`;
const DEFAULT_STEP6_AUTO = "위 내용을 바탕으로 사용자가 입력한 차시만큼 수업 계획을 작성해주세요. 수업 단계, 수업내용, 산출물, 관련교과 등을 차시별로 추천해주세요.";

type Props = {
  step: StepKey;
  steps: StepState;
  standards: AchievementStandard[];
  selectedStandardIds: string[];
  cards: OutcomeCard[];
  aiResponse: string;
  error: string;
  onChangeSteps: (next: StepState) => void;
  onToggleStandard: (id: string) => void;
  onRunAssist: () => void;
  onConfirm: () => void;
};

function ChatBubble({ m }: { m: ChatMessage }) {
  return (
    <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
        m.role === "user"
          ? "bg-mint text-white rounded-br-sm"
          : "bg-[#f0f4f4] text-ink rounded-bl-sm border border-line"
      }`}>
        {m.content || (
          <span className="inline-flex gap-1 items-center text-muted">
            <span className="animate-bounce">·</span>
            <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>·</span>
            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>·</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ChatWindow({
  title,
  messages,
  chatting,
  input,
  setInput,
  onSend,
  onClear,
  placeholder,
  emptyHint,
  endRef,
  chatAreaClass
}: {
  title: string;
  messages: ChatMessage[];
  chatting: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: (msg: string) => void;
  onClear: () => void;
  placeholder: string;
  emptyHint: string;
  endRef: React.RefObject<HTMLDivElement>;
  chatAreaClass?: string;
}) {
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="bg-[#f4faf8] border-b border-line px-3 py-2 flex items-center justify-between">
        <span className="text-sm font-medium text-mint">{title}</span>
        {messages.length > 0 && (
          <button type="button" className="text-xs text-muted cursor-pointer" onClick={onClear}>
            대화 초기화
          </button>
        )}
      </div>
      <div className={`${chatAreaClass ?? "min-h-[80vh] max-h-[80vh]"} overflow-y-auto p-3 flex flex-col gap-2 bg-white`}>
        {messages.length === 0 && (
          <p className="text-muted text-sm text-center mt-6">{emptyHint}</p>
        )}
        {messages.map((m, i) => <ChatBubble key={i} m={m} />)}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line flex gap-2 p-2 bg-[#fafefe] sticky bottom-0 z-10">
        <textarea
          rows={2}
          className="flex-1 resize-none border border-line rounded-lg px-2 py-1.5 text-sm"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim()) { onSend(input.trim()); setInput(""); }
            }
          }}
        />
        <button
          type="button"
          className="bg-mint text-white border border-mint-dark rounded-lg px-3 py-1.5 text-sm cursor-pointer disabled:opacity-40 self-end"
          onClick={() => { if (input.trim()) { onSend(input.trim()); setInput(""); } }}
          disabled={chatting || !input.trim()}
        >
          전송
        </button>
      </div>
    </div>
  );
}

export function DesignLab(props: Props) {
  const {
    step,
    steps,
    standards,
    selectedStandardIds,
    cards,
    aiResponse,
    error,
    onChangeSteps,
    onToggleStandard,
    onRunAssist,
    onConfirm
  } = props;

  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptTab, setPromptTab] = useState<"common" | "step">("common");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [step3AutoPrompt, setStep3AutoPrompt] = useState(DEFAULT_STEP3_AUTO);
  const [step4AutoPrompt, setStep4AutoPrompt] = useState(DEFAULT_STEP4_AUTO);
  const [step5AutoPrompt, setStep5AutoPrompt] = useState(DEFAULT_STEP5_AUTO);
  const [step6AutoPrompt, setStep6AutoPrompt] = useState(DEFAULT_STEP6_AUTO);
  const [draftSys, setDraftSys] = useState("");
  const [draftP3, setDraftP3] = useState("");
  const [draftP4, setDraftP4] = useState("");
  const [draftP5, setDraftP5] = useState("");
  const [draftP6, setDraftP6] = useState("");

  type StepSystems = Record<"step1"|"step2"|"step3"|"step4"|"step5"|"step6", string>;
  const EMPTY_STEP_SYSTEMS: StepSystems = { step1: "", step2: "", step3: "", step4: "", step5: "", step6: "" };
  const [stepSystemPrompts, setStepSystemPrompts] = useState<StepSystems>(EMPTY_STEP_SYSTEMS);
  const [draftStepSystems, setDraftStepSystems] = useState<StepSystems>(EMPTY_STEP_SYSTEMS);

  useEffect(() => {
    setSystemPrompt(localStorage.getItem("dl_system_prompt") ?? DEFAULT_SYSTEM_PROMPT);
    setStep3AutoPrompt(localStorage.getItem("dl_step3_auto") ?? DEFAULT_STEP3_AUTO);
    setStep4AutoPrompt(localStorage.getItem("dl_step4_auto") ?? DEFAULT_STEP4_AUTO);
    setStep5AutoPrompt(localStorage.getItem("dl_step5_auto") ?? DEFAULT_STEP5_AUTO);
    setStep6AutoPrompt(localStorage.getItem("dl_step6_auto") ?? DEFAULT_STEP6_AUTO);
    setStepSystemPrompts({
      step1: localStorage.getItem("dl_step1_system") ?? "",
      step2: localStorage.getItem("dl_step2_system") ?? "",
      step3: localStorage.getItem("dl_step3_system") ?? "",
      step4: localStorage.getItem("dl_step4_system") ?? "",
      step5: localStorage.getItem("dl_step5_system") ?? "",
      step6: localStorage.getItem("dl_step6_system") ?? "",
    });
  }, []);

  const openPromptEditor = () => {
    setDraftSys(systemPrompt);
    setDraftP3(step3AutoPrompt);
    setDraftP4(step4AutoPrompt);
    setDraftP5(step5AutoPrompt);
    setDraftP6(step6AutoPrompt);
    setDraftStepSystems({ ...stepSystemPrompts });
    setPromptTab("common");
    setShowPromptEditor(true);
  };

  const savePrompts = () => {
    localStorage.setItem("dl_system_prompt", draftSys);
    localStorage.setItem("dl_step3_auto", draftP3);
    localStorage.setItem("dl_step4_auto", draftP4);
    localStorage.setItem("dl_step5_auto", draftP5);
    localStorage.setItem("dl_step6_auto", draftP6);
    (Object.keys(draftStepSystems) as (keyof StepSystems)[]).forEach((k) => {
      localStorage.setItem(`dl_${k}_system`, draftStepSystems[k]);
    });
    setSystemPrompt(draftSys);
    setStep3AutoPrompt(draftP3);
    setStep4AutoPrompt(draftP4);
    setStep5AutoPrompt(draftP5);
    setStep6AutoPrompt(draftP6);
    setStepSystemPrompts({ ...draftStepSystems });
    setShowPromptEditor(false);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const [s1Messages, setS1Messages] = useState<ChatMessage[]>([]);
  const [s1Input, setS1Input] = useState("");
  const [s1Chatting, setS1Chatting] = useState(false);
  const s1EndRef = useRef<HTMLDivElement>(null);
  const s1AbortRef = useRef<AbortController | null>(null);

  const [s2Messages, setS2Messages] = useState<ChatMessage[]>([]);
  const [s2Input, setS2Input] = useState("");
  const [s2Chatting, setS2Chatting] = useState(false);
  const s2EndRef = useRef<HTMLDivElement>(null);
  const s2AbortRef = useRef<AbortController | null>(null);

  const [s3Messages, setS3Messages] = useState<ChatMessage[]>([]);
  const [s3Input, setS3Input] = useState("");
  const [s3Chatting, setS3Chatting] = useState(false);
  const s3EndRef = useRef<HTMLDivElement>(null);
  const s3AbortRef = useRef<AbortController | null>(null);
  const s3Triggered = useRef(false);

  const [s4Messages, setS4Messages] = useState<ChatMessage[]>([]);
  const [s4Input, setS4Input] = useState("");
  const [s4Chatting, setS4Chatting] = useState(false);
  const s4EndRef = useRef<HTMLDivElement>(null);
  const s4AbortRef = useRef<AbortController | null>(null);
  const s4Triggered = useRef(false);

  const [s5Messages, setS5Messages] = useState<ChatMessage[]>([]);
  const [s5Input, setS5Input] = useState("");
  const [s5Chatting, setS5Chatting] = useState(false);
  const s5EndRef = useRef<HTMLDivElement>(null);
  const s5AbortRef = useRef<AbortController | null>(null);
  const s5Triggered = useRef(false);

  const [s6Messages, setS6Messages] = useState<ChatMessage[]>([]);
  const [s6Input, setS6Input] = useState("");
  const [s6Chatting, setS6Chatting] = useState(false);
  const s6EndRef = useRef<HTMLDivElement>(null);
  const s6AbortRef = useRef<AbortController | null>(null);
  const s6Triggered = useRef(false);

  useEffect(() => { s1EndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [s1Messages]);
  useEffect(() => { s2EndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [s2Messages]);
  useEffect(() => { s3EndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [s3Messages]);
  useEffect(() => { s4EndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [s4Messages]);
  useEffect(() => { s5EndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [s5Messages]);
  useEffect(() => { s6EndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [s6Messages]);

  const uniqueSubjects = useMemo(
    () => [...new Set(standards.map((s) => s.subject))].sort(),
    [standards]
  );
  const uniqueGrades = useMemo(
    () => [...new Set(standards.map((s) => s.gradeCluster))].sort(),
    [standards]
  );
  const selectedStandards = useMemo(
    () => standards.filter((s) => selectedStandardIds.includes(s.id)),
    [standards, selectedStandardIds]
  );
  const filteredStandards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return standards.filter((s) => {
      if (subjectFilter && s.subject !== subjectFilter) return false;
      if (gradeFilter && s.gradeCluster !== gradeFilter) return false;
      if (q) {
        return (
          s.achievementCode.toLowerCase().includes(q) ||
          s.achievementText.toLowerCase().includes(q) ||
          s.domain.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [standards, searchQuery, subjectFilter, gradeFilter]);

  const standardsText = selectedStandards
    .map((s) => `${s.achievementCode} ${s.achievementText}`)
    .join("\n");

  function makeChat(
    messages: ChatMessage[],
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setChatting: (v: boolean) => void,
    abortRef: React.MutableRefObject<AbortController | null>,
    activeSystemPrompt?: string
  ) {
    return (msg: string) => {
      if (!msg || false) return;
      const userMessage: ChatMessage = { role: "user", content: msg };
      const nextMessages = [...messages, userMessage];
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        setChatting(true);
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ standardsText, messages: nextMessages, systemPrompt: activeSystemPrompt || systemPrompt }),
          signal: controller.signal
        }).catch(() => null);

        if (!res?.ok || !res.body) {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: "응답을 받지 못했습니다." };
            return copy;
          });
          setChatting(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: copy[copy.length - 1].content + chunk
            };
            return copy;
          });
        }
        setChatting(false);
      })().catch(() => setChatting(false));
    };
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendS1 = (msg: string) => makeChat(s1Messages, setS1Messages, setS1Chatting, s1AbortRef, stepSystemPrompts.step1 || systemPrompt)(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendS2 = (msg: string) => makeChat(s2Messages, setS2Messages, setS2Chatting, s2AbortRef, stepSystemPrompts.step2 || systemPrompt)(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendS3 = (msg: string) => makeChat(s3Messages, setS3Messages, setS3Chatting, s3AbortRef, stepSystemPrompts.step3 || systemPrompt)(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendS4 = (msg: string) => makeChat(s4Messages, setS4Messages, setS4Chatting, s4AbortRef, stepSystemPrompts.step4 || systemPrompt)(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendS5 = (msg: string) => makeChat(s5Messages, setS5Messages, setS5Chatting, s5AbortRef, stepSystemPrompts.step5 || systemPrompt)(msg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendS6 = (msg: string) => makeChat(s6Messages, setS6Messages, setS6Chatting, s6AbortRef, stepSystemPrompts.step6 || systemPrompt)(msg);


  useEffect(() => {
    if (step !== "step3") return;
    if (s3Triggered.current) return;
    const confirmedCards = cards.filter(
      (c) => (c.step === "step1" || c.step === "step2") && c.locked && c.summary?.trim()
    );
    if (confirmedCards.length === 0) return;
    s3Triggered.current = true;
    const parts = confirmedCards.map((c) => `[${c.title}]\n${c.summary}`);
    sendS3(parts.join("\n\n") + "\n\n" + step3AutoPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== "step4") return;
    if (s4Triggered.current) return;
    const confirmedCards = cards.filter(
      (c) => (c.step === "step1" || c.step === "step2" || c.step === "step3") && c.locked && c.summary?.trim()
    );
    if (confirmedCards.length === 0) return;
    s4Triggered.current = true;
    const parts = confirmedCards.map((c) => `[${c.title}]\n${c.summary}`);
    sendS4(parts.join("\n\n") + "\n\n" + step4AutoPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);


  // step5 자동 트리거 (단원명 + 핵심아이디어 + 핵심질문 → 평가 설계)
  useEffect(() => {
    if (step !== "step5") return;
    if (s5Triggered.current) return;
    const title = steps.step1.projectTitle?.trim() ?? "";
    const idea = steps.step2.coreIdea?.trim() ?? "";
    const activities = steps.step4.activities?.filter((a) => a.name?.trim()) ?? [];
    if (!title && !idea && !activities.length) return;
    s5Triggered.current = true;
    const parts: string[] = [];
    if (title) parts.push(`단원명: ${title}`);
    if (idea) parts.push(`핵심 아이디어:\n${idea}`);
    if (activities.length) parts.push(`주요활동:\n${activities.map((a) => `- ${a.name}: ${a.content}`).join("\n")}`);
    sendS5(parts.join("\n") + "\n\n" + step5AutoPrompt);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const [s6LessonCount, setS6LessonCount] = useState(() => {
    const match = steps.step2.operatingPeriod?.match(/\d+/);
    return match ? match[0] : "8";
  });

  useEffect(() => {
    const match = steps.step2.operatingPeriod?.match(/\d+/);
    if (match) setS6LessonCount(match[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.step2.operatingPeriod]);
  const [s6Started, setS6Started] = useState(false);

  const handleS6Start = () => {
    const count = s6LessonCount.trim() || "8";
    const confirmedCards = cards.filter(
      (c) => (c.step === "step2" || c.step === "step3" || c.step === "step4" || c.step === "step5") && c.locked && c.summary?.trim()
    );
    const parts: string[] = [];
    if (confirmedCards.length > 0) {
      parts.push(...confirmedCards.map((c) => `[${c.title}]\n${c.summary}`));
    }
    parts.push(`총 차시 수: ${count}차시`);
    parts.push(step6AutoPrompt.replace("8차시", `${count}차시`));
    setS6Started(true);
    sendS6(parts.join("\n\n"));
  };

  return (
    <section className="bg-panel border border-line rounded-2xl p-3.5 min-h-[640px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">AI 설계 실험실</h2>
        {true && (
          <button
            type="button"
            className="text-xs border border-line rounded-lg px-2.5 py-1 cursor-pointer text-muted hover:bg-[#f0faf6] hover:border-mint hover:text-mint transition-colors"
            onClick={openPromptEditor}
          >
            기본 프롬프트 설정
          </button>
        )}
      </div>

      {showPromptEditor && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
          onClick={() => setShowPromptEditor(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-xl flex flex-col gap-4 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">프롬프트 설정</h3>
              <button type="button" className="text-muted text-sm cursor-pointer" onClick={() => setShowPromptEditor(false)}>닫기</button>
            </div>
            {/* 탭 */}
            <div className="flex gap-1 border-b border-line">
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px cursor-pointer ${promptTab === "common" ? "border-mint text-mint" : "border-transparent text-muted"}`}
                onClick={() => setPromptTab("common")}
              >
                공통 설정
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px cursor-pointer ${promptTab === "step" ? "border-mint text-mint" : "border-transparent text-muted"}`}
                onClick={() => setPromptTab("step")}
              >
                단계별 시스템 프롬프트
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-4 flex-1">
              {promptTab === "common" && (
                <>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">공통 시스템 프롬프트 <span className="text-xs text-muted font-normal">(전 단계 기본 AI 역할·지침)</span></span>
                    <textarea rows={5} className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none" value={draftSys} onChange={(e) => setDraftSys(e.target.value)} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">3단계 자동 질문 <span className="text-xs text-muted font-normal">(핵심 개념 추출 지시문)</span></span>
                    <textarea rows={2} className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none" value={draftP3} onChange={(e) => setDraftP3(e.target.value)} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">4단계 자동 질문 <span className="text-xs text-muted font-normal">(주요활동 유목화 지시문)</span></span>
                    <textarea rows={2} className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none" value={draftP4} onChange={(e) => setDraftP4(e.target.value)} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">5단계 자동 질문 <span className="text-xs text-muted font-normal">(평가 설계 지시문)</span></span>
                    <textarea rows={2} className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none" value={draftP5} onChange={(e) => setDraftP5(e.target.value)} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">6단계 자동 질문 <span className="text-xs text-muted font-normal">(차시 설계 지시문)</span></span>
                    <textarea rows={2} className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none" value={draftP6} onChange={(e) => setDraftP6(e.target.value)} />
                  </label>
                </>
              )}
              {promptTab === "step" && (
                <>
                  <p className="text-xs text-muted">비워두면 공통 시스템 프롬프트가 사용됩니다. 단계에 특화된 AI 역할·지침을 입력하세요.</p>
                  {(["step1","step2","step3","step4","step5","step6"] as const).map((k, i) => (
                    <label key={k} className="grid gap-1.5 text-sm">
                      <span className="font-medium">{i+1}단계 시스템 프롬프트</span>
                      <textarea
                        rows={3}
                        className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                        placeholder="비워두면 공통 프롬프트 사용"
                        value={draftStepSystems[k]}
                        onChange={(e) => setDraftStepSystems((prev) => ({ ...prev, [k]: e.target.value }))}
                      />
                    </label>
                  ))}
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-line">
              <button
                type="button"
                className="text-xs border border-line rounded-lg px-3 py-1.5 cursor-pointer text-muted"
                onClick={() => {
                  setDraftSys(DEFAULT_SYSTEM_PROMPT);
                  setDraftP3(DEFAULT_STEP3_AUTO);
                  setDraftP4(DEFAULT_STEP4_AUTO);
                  setDraftP5(DEFAULT_STEP5_AUTO);
                  setDraftP6(DEFAULT_STEP6_AUTO);
                  setDraftStepSystems({ step1:"", step2:"", step3:"", step4:"", step5:"", step6:"" });
                }}
              >
                초기화
              </button>
              <button type="button" className="bg-mint text-white rounded-lg px-3 py-1.5 text-xs cursor-pointer" onClick={savePrompts}>저장</button>
            </div>
          </div>
        </div>
      )}


      {/* Step 1: 아이디어 탐색 */}
      {step === "step1" && (
        <div className="grid gap-3">
          <ChatWindow
            title="AI와 대화 (프로젝트 아이디어 탐색)"
            messages={s1Messages}
            chatting={s1Chatting}
            input={s1Input}
            setInput={setS1Input}
            onSend={sendS1}
            onClear={() => setS1Messages([])}
            placeholder="어떤 프로젝트 수업을 하고 싶은지 자유롭게 이야기해보세요..."
            emptyHint='AI에게 프로젝트 아이디어를 물어보세요. 예: "5학년 환경 주제로 프로젝트 수업 아이디어를 추천해줘"'
            endRef={s1EndRef}
            chatAreaClass="min-h-[80vh] max-h-[80vh]"
          />
          <div className="border border-line rounded-xl p-3.5 grid gap-2.5 bg-[#fafeff]">
            <span className="text-sm font-semibold text-ink">반영 내용</span>
            <label className="grid gap-1.5 text-sm">
              <span>프로젝트명(단원명)</span>
              <input
                placeholder="예: 우리 지역 환경을 지켜라!"
                value={steps.step1.projectTitle}
                onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, projectTitle: e.target.value } })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="grid gap-1.5 text-sm">
                <span>대상 학년 <span className="text-warn text-xs">*필수</span></span>
                <input
                  placeholder="예: 5학년"
                  value={steps.step1.targetGrade}
                  onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, targetGrade: e.target.value } })}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>대상 과목 <span className="text-warn text-xs">*필수</span></span>
                <input
                  placeholder="예: 과학, 사회 (융합)"
                  value={steps.step1.targetSubject}
                  onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, targetSubject: e.target.value } })}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              학생 수행활동
              <textarea
                rows={3}
                placeholder="예: 지역 환경 문제를 조사하고 해결 방안을 담은 포스터 제작"
                value={steps.step1.studentActivity}
                onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, studentActivity: e.target.value } })}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              활용할 교구
              <textarea
                rows={2}
                placeholder="예: 태블릿 PC, 현장 조사 체크리스트, 발표 자료 제작 도구"
                value={steps.step1.materials}
                onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, materials: e.target.value } })}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              비고
              <textarea
                rows={2}
                placeholder="기타 참고사항..."
                value={steps.step1.note}
                onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, note: e.target.value } })}
              />
            </label>
          </div>
        </div>
      )}


      {/* Step 2: 단원 설정 */}
      {step === "step2" && (
        <div className="grid gap-3">
          <div className="border border-line rounded-xl p-3.5 grid gap-2.5 bg-[#fafeff]">
            <span className="text-sm font-semibold text-ink">성취기준 선택</span>
            <div className="flex gap-2 flex-wrap">
              <input
                type="search"
                placeholder="성취기준 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[160px]"
              />
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="flex-1 min-w-[120px]">
                <option value="">전체 교과</option>
                {uniqueSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="flex-1 min-w-[120px]">
                <option value="">전체 학년군</option>
                {uniqueGrades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <small className="text-muted">{filteredStandards.length}개 표시됨</small>
            <div className="grid gap-1.5 max-h-56 overflow-y-auto pr-0.5">
              {filteredStandards.map((s) => {
                const active = selectedStandardIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`text-left flex items-center gap-2 border rounded-lg px-2 py-1.5 cursor-pointer w-full ${active ? "border-mint bg-[#effaf7]" : "border-line bg-[#f9fcfc]"}`}
                    onClick={() => onToggleStandard(s.id)}
                  >
                    <strong className="text-xs text-muted shrink-0">{s.achievementCode}</strong>
                    <span className="text-sm line-clamp-2">{s.achievementText}</span>
                  </button>
                );
              })}
            </div>
            {selectedStandards.length > 0 && (
              <div className="border border-mint rounded-xl bg-[#f0faf6] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-mint">선택된 성취기준 ({selectedStandards.length}개)</span>
                  <button type="button" className="text-xs text-muted border border-line bg-white rounded-lg px-2 py-1 cursor-pointer" onClick={() => selectedStandards.forEach((s) => onToggleStandard(s.id))}>전체 해제</button>
                </div>
                <div className="grid gap-1.5">
                  {selectedStandards.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 bg-white border border-[#c5e8dd] rounded-lg px-2 py-1.5">
                      <strong className="text-xs text-muted shrink-0">{s.achievementCode}</strong>
                      <span className="text-sm text-ink flex-1 line-clamp-2">{s.achievementText}</span>
                      <button type="button" className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#e0f5ef] text-muted cursor-pointer text-xs font-bold" onClick={() => onToggleStandard(s.id)} title="선택 해제">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ChatWindow
            title="AI와 대화 (단원 설정)"
            messages={s2Messages}
            chatting={s2Chatting}
            input={s2Input}
            setInput={setS2Input}
            onSend={sendS2}
            onClear={() => setS2Messages([])}
            placeholder="성취기준에 대해 질문하세요..."
            emptyHint='성취기준을 선택하고 AI에게 질문해보세요. 예: "성취기준과 관련된 프로젝트 수업 주제를 추천해줘."'
            endRef={s2EndRef}
          />

          <div className="border border-line rounded-xl p-3.5 grid gap-2.5 bg-[#fafeff]">
            <span className="text-sm font-semibold text-ink">반영 내용</span>
            <div className="grid grid-cols-[1fr_auto] gap-2.5 items-end">
              <label className="grid gap-1.5 text-sm">
                <span>프로젝트명(단원명) <span className="text-warn text-xs">*필수</span></span>
                <input
                  placeholder="예: 우리 지역 환경을 지켜라!"
                  value={steps.step1.projectTitle}
                  onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, projectTitle: e.target.value } })}
                />
              </label>
              <label className="grid gap-1.5 text-sm w-28">
                운영 차시
                <input
                  placeholder="예: 8차시"
                  value={steps.step2.operatingPeriod}
                  onChange={(e) => onChangeSteps({ ...steps, step2: { ...steps.step2, operatingPeriod: e.target.value } })}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="grid gap-1.5 text-sm">
                <span>대상 학년 <span className="text-warn text-xs">*필수</span></span>
                <input
                  placeholder="예: 5학년"
                  value={steps.step1.targetGrade}
                  onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, targetGrade: e.target.value } })}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>대상 과목 <span className="text-warn text-xs">*필수</span></span>
                <input
                  placeholder="예: 과학, 사회 (융합)"
                  value={steps.step1.targetSubject}
                  onChange={(e) => onChangeSteps({ ...steps, step1: { ...steps.step1, targetSubject: e.target.value } })}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              <span>핵심 아이디어 <span className="text-warn text-xs">*필수</span></span>
              <textarea
                rows={3}
                placeholder="이 단원에서 학생들이 이해해야 할 핵심 아이디어를 입력하세요..."
                value={steps.step2.coreIdea}
                onChange={(e) => onChangeSteps({ ...steps, step2: { ...steps.step2, coreIdea: e.target.value } })}
              />
            </label>
            {selectedStandards.length > 0 && (
              <div className="grid gap-1">
                <span className="text-sm">성취기준 <span className="text-warn text-xs">*필수</span></span>
                <div className="grid gap-1">
                  {selectedStandards.map((s) => (
                    <div key={s.id} className="flex items-start gap-2 bg-white border border-[#c5e8dd] rounded-lg px-2 py-1.5">
                      <strong className="text-xs text-muted shrink-0 mt-0.5">{s.achievementCode}</strong>
                      <span className="text-sm text-ink">{s.achievementText}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedStandards.length === 0 && (
              <p className="text-sm text-warn">위 목록에서 성취기준을 하나 이상 선택하세요. <span className="text-xs">*필수</span></p>
            )}
            <div className="grid gap-2">
              <span className="text-sm font-medium text-ink">내용 요소 (과목별)</span>
              {selectedStandards.length === 0 ? (
                <p className="text-sm text-muted">위 성취기준을 선택하면 과목별 내용 요소를 입력할 수 있습니다.</p>
              ) : (
                <div className="grid gap-3">
                  {[...new Set(selectedStandards.map((s) => s.subject))].map((subject) => {
                    const el = (steps.step2.contentElements ?? {})[subject] ?? { knowledge: "", process: "", value: "" };
                    const update = (patch: Partial<typeof el>) =>
                      onChangeSteps({
                        ...steps,
                        step2: {
                          ...steps.step2,
                          contentElements: {
                            ...(steps.step2.contentElements ?? {}),
                            [subject]: { ...el, ...patch }
                          }
                        }
                      });
                    return (
                      <div key={subject} className="grid gap-1.5 border border-line rounded-lg p-2.5 bg-white">
                        <span className="text-xs font-semibold text-mint">{subject}</span>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="grid gap-1 text-sm">
                            지식·이해
                            <textarea rows={3} placeholder="지식과 이해 요소..." value={el.knowledge}
                              onChange={(e) => update({ knowledge: e.target.value })} />
                          </label>
                          <label className="grid gap-1 text-sm">
                            과정·기능
                            <textarea rows={3} placeholder="과정과 기능 요소..." value={el.process}
                              onChange={(e) => update({ process: e.target.value })} />
                          </label>
                          <label className="grid gap-1 text-sm">
                            가치·태도
                            <textarea rows={3} placeholder="가치와 태도 요소..." value={el.value}
                              onChange={(e) => update({ value: e.target.value })} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Step 3: 개념 추출 */}
      {step === "step3" && (
        <div className="grid gap-3">
          <ChatWindow
            title="AI와 대화 (핵심 개념 추출)"
            messages={s3Messages}
            chatting={s3Chatting}
            input={s3Input}
            setInput={setS3Input}
            onSend={sendS3}
            onClear={() => { setS3Messages([]); s3Triggered.current = false; }}
            placeholder="핵심 개념에 대해 추가 질문하세요..."
            emptyHint="단계 진입 시 자동으로 핵심 개념이 추출됩니다."
            endRef={s3EndRef}
          />
          <div className="border border-line rounded-xl p-3.5 grid gap-2.5 bg-[#fafeff]">
            <span className="text-sm font-semibold text-ink">반영 내용</span>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="grid gap-1.5 text-sm">
                핵심어
                <textarea
                  rows={3}
                  placeholder="핵심어를 입력하세요..."
                  value={steps.step3.keyWords}
                  onChange={(e) => onChangeSteps({ ...steps, step3: { ...steps.step3, keyWords: e.target.value } })}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                핵심문장
                <textarea
                  rows={3}
                  placeholder="핵심문장을 입력하세요..."
                  value={steps.step3.keySentence}
                  onChange={(e) => onChangeSteps({ ...steps, step3: { ...steps.step3, keySentence: e.target.value } })}
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">
              핵심 질문
              <textarea
                rows={3}
                placeholder="핵심 질문을 입력하세요..."
                value={steps.step3.essentialQuestion}
                onChange={(e) => onChangeSteps({ ...steps, step3: { ...steps.step3, essentialQuestion: e.target.value } })}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              탐구질문
              <textarea
                rows={3}
                placeholder="탐구질문을 입력하세요..."
                value={steps.step3.inquiryQuestions}
                onChange={(e) => onChangeSteps({ ...steps, step3: { ...steps.step3, inquiryQuestions: e.target.value } })}
              />
            </label>
          </div>
        </div>
      )}

      {/* Step 4: 주요활동 유목화 */}
      {step === "step4" && (
        <div className="grid gap-3">
          <ChatWindow
            title="AI와 대화 (주요활동 유목화)"
            messages={s4Messages}
            chatting={s4Chatting}
            input={s4Input}
            setInput={setS4Input}
            onSend={sendS4}
            onClear={() => { setS4Messages([]); s4Triggered.current = false; }}
            placeholder="주요활동에 대해 추가 질문하세요..."
            emptyHint="단계 진입 시 자동으로 주요활동을 제안합니다."
            endRef={s4EndRef}
          />
          <div className="border border-line rounded-xl p-3.5 grid gap-2.5 bg-[#fafeff]">
            <span className="text-sm font-semibold text-ink">반영 내용</span>
            <div className="grid gap-1.5">
              <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 text-xs font-medium text-muted px-1">
                <span>활동명</span>
                <span>활동 내용</span>
                <span>활동 산출물</span>
                <span />
              </div>
              {steps.step4.activities.map((act, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-start">
                  <textarea
                    rows={2}
                    className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                    placeholder="활동명"
                    value={act.name}
                    onChange={(e) => {
                      const next = steps.step4.activities.map((a, i) => i === idx ? { ...a, name: e.target.value } : a);
                      onChangeSteps({ ...steps, step4: { activities: next } });
                    }}
                  />
                  <textarea
                    rows={2}
                    className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                    placeholder="활동 내용"
                    value={act.content}
                    onChange={(e) => {
                      const next = steps.step4.activities.map((a, i) => i === idx ? { ...a, content: e.target.value } : a);
                      onChangeSteps({ ...steps, step4: { activities: next } });
                    }}
                  />
                  <textarea
                    rows={2}
                    className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                    placeholder="활동 산출물"
                    value={act.output}
                    onChange={(e) => {
                      const next = steps.step4.activities.map((a, i) => i === idx ? { ...a, output: e.target.value } : a);
                      onChangeSteps({ ...steps, step4: { activities: next } });
                    }}
                  />
                  <button
                    type="button"
                    className="text-muted hover:text-red-400 text-lg leading-none mt-1.5 cursor-pointer"
                    onClick={() => {
                      const next = steps.step4.activities.filter((_, i) => i !== idx);
                      onChangeSteps({ ...steps, step4: { activities: next.length ? next : [{ name: "", content: "", output: "" }] } });
                    }}
                  >×</button>
                </div>
              ))}
              <button
                type="button"
                className="self-start mt-1 border border-dashed border-mint text-mint text-sm rounded-lg px-3 py-1.5 cursor-pointer hover:bg-mint/5"
                onClick={() => onChangeSteps({ ...steps, step4: { activities: [...steps.step4.activities, { name: "", content: "", output: "" }] } })}
              >+ 활동 추가</button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: 평가 설계 */}
      {step === "step5" && (
        <div className="grid gap-3">
          <ChatWindow
            title="AI와 대화 (평가 설계)"
            messages={s5Messages}
            chatting={s5Chatting}
            input={s5Input}
            setInput={setS5Input}
            onSend={sendS5}
            onClear={() => { setS5Messages([]); s5Triggered.current = false; }}
            placeholder="평가 설계에 대해 추가 질문하세요..."
            emptyHint="단계 진입 시 자동으로 수행 과제와 루브릭 기준을 제안합니다."
            endRef={s5EndRef}
          />
          <div className="border border-line rounded-xl p-3.5 grid gap-4 bg-[#fafeff]">
            <span className="text-sm font-semibold text-ink">반영 내용</span>

            {/* 평가 요소 */}
            <div className="grid gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">평가 요소</span>
              <label className="grid gap-1.5 text-sm">
                무엇을 평가하는가?
                <textarea
                  rows={2}
                  className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                  placeholder="평가 대상 및 내용"
                  value={steps.step5.evaluationWhat}
                  onChange={(e) => onChangeSteps({ ...steps, step5: { ...steps.step5, evaluationWhat: e.target.value } })}
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                왜 평가하는가?
                <textarea
                  rows={2}
                  className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                  placeholder="평가 목적 및 이유"
                  value={steps.step5.evaluationWhy}
                  onChange={(e) => onChangeSteps({ ...steps, step5: { ...steps.step5, evaluationWhy: e.target.value } })}
                />
              </label>
            </div>

            {/* 평가 과제 */}
            <div className="grid gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">평가 과제</span>
              <label className="grid gap-1.5 text-sm">
                과제명
                <input
                  type="text"
                  className="border border-line rounded-lg px-2.5 py-1.5 text-sm"
                  placeholder="수행 과제명을 입력하세요"
                  value={steps.step5.taskName}
                  onChange={(e) => onChangeSteps({ ...steps, step5: { ...steps.step5, taskName: e.target.value } })}
                />
              </label>
              {([
                { key: "graspsGoal",      label: "Goal (목표)" },
                { key: "graspsRole",      label: "Role (역할)" },
                { key: "graspsAudience",  label: "Audience (청중)" },
                { key: "graspsSituation", label: "Situation (상황)" },
                { key: "graspsProduct",   label: "Product (결과물)" },
                { key: "graspsStandard",  label: "Standard (준거)" },
              ] as const).map(({ key, label }) => (
                <label key={key} className="grid gap-1.5 text-sm">
                  {label}
                  <textarea
                    rows={2}
                    className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                    value={steps.step5[key]}
                    onChange={(e) => onChangeSteps({ ...steps, step5: { ...steps.step5, [key]: e.target.value } })}
                  />
                </label>
              ))}
            </div>

            {/* 평가 기준 (루브릭) */}
            <div className="grid gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">평가 기준</span>
              <div className="grid gap-1.5">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted px-1">
                  <span>평가 요소</span>
                  <span>상</span>
                  <span>중</span>
                  <span>하</span>
                  <span />
                </div>
                {steps.step5.rubric.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-2 items-start">
                    <textarea
                      rows={2}
                      className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                      placeholder="평가 요소명"
                      value={r.element}
                      onChange={(e) => {
                        const next = steps.step5.rubric.map((v, i) => i === idx ? { ...v, element: e.target.value } : v);
                        onChangeSteps({ ...steps, step5: { ...steps.step5, rubric: next } });
                      }}
                    />
                    <textarea
                      rows={2}
                      className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                      placeholder="상 기준"
                      value={r.high}
                      onChange={(e) => {
                        const next = steps.step5.rubric.map((v, i) => i === idx ? { ...v, high: e.target.value } : v);
                        onChangeSteps({ ...steps, step5: { ...steps.step5, rubric: next } });
                      }}
                    />
                    <textarea
                      rows={2}
                      className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                      placeholder="중 기준"
                      value={r.mid}
                      onChange={(e) => {
                        const next = steps.step5.rubric.map((v, i) => i === idx ? { ...v, mid: e.target.value } : v);
                        onChangeSteps({ ...steps, step5: { ...steps.step5, rubric: next } });
                      }}
                    />
                    <textarea
                      rows={2}
                      className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                      placeholder="하 기준"
                      value={r.low}
                      onChange={(e) => {
                        const next = steps.step5.rubric.map((v, i) => i === idx ? { ...v, low: e.target.value } : v);
                        onChangeSteps({ ...steps, step5: { ...steps.step5, rubric: next } });
                      }}
                    />
                    <button
                      type="button"
                      className="text-muted hover:text-red-400 text-lg leading-none mt-1.5 cursor-pointer"
                      onClick={() => {
                        const next = steps.step5.rubric.filter((_, i) => i !== idx);
                        onChangeSteps({ ...steps, step5: { ...steps.step5, rubric: next.length ? next : [{ element: "", high: "", mid: "", low: "" }] } });
                      }}
                    >×</button>
                  </div>
                ))}
                <button
                  type="button"
                  className="self-start border border-dashed border-mint text-mint text-sm rounded-lg px-3 py-1.5 cursor-pointer hover:bg-mint/5"
                  onClick={() => onChangeSteps({ ...steps, step5: { ...steps.step5, rubric: [...steps.step5.rubric, { element: "", high: "", mid: "", low: "" }] } })}
                >+ 루브릭 행 추가</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: 차시 설계 */}
      {step === "step6" && (
        <div className="grid gap-3">
          {/* 차시 수 입력 블록 */}
          <div className="border border-line rounded-xl p-4 bg-[#f4faf8] grid gap-3">
            <span className="text-sm font-semibold text-ink">차시 설계 시작</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink whitespace-nowrap">몇 차시로 진행하기를 원하시나요?</span>
              <input
                type="number"
                min={1}
                max={32}
                className="w-20 border border-line rounded-lg px-2.5 py-1.5 text-sm text-center"
                value={s6LessonCount}
                onChange={(e) => {
                  const val = e.target.value;
                  setS6LessonCount(val);
                  if (val) {
                    onChangeSteps({ ...steps, step2: { ...steps.step2, operatingPeriod: `${val}차시` } });
                    const count = parseInt(val, 10);
                    if (!isNaN(count) && count > 0) {
                      const cur = steps.step6.lessons ?? [];
                      const next = Array.from({ length: count }, (_, i) =>
                        cur[i] ?? { period: String(i + 1), content: "", output: "" }
                      );
                      onChangeSteps({ ...steps, step2: { ...steps.step2, operatingPeriod: `${val}차시` }, step6: { lessons: next } });
                    }
                  }
                }}
                disabled={s6Started && s6Messages.length > 0}
              />
              <span className="text-sm text-muted">차시</span>
              <button
                type="button"
                className="ml-auto bg-mint text-white rounded-lg px-4 py-1.5 text-sm cursor-pointer disabled:opacity-40"
                onClick={() => { setS6Started(false); setS6Messages([]); handleS6Start(); }}
                disabled={s6Chatting}
              >
                {s6Messages.length > 0 ? "재시작" : "AI 설계 시작"}
              </button>
            </div>
            {s6Messages.length > 0 && (
              <p className="text-xs text-muted">2·3·4·5단계 확정 내용과 {s6LessonCount}차시 기준으로 설계 중입니다. 아래 채팅창에서 추가 요청하세요.</p>
            )}
          </div>
          <ChatWindow
            title="AI와 대화 (차시 설계)"
            messages={s6Messages}
            chatting={s6Chatting}
            input={s6Input}
            setInput={setS6Input}
            onSend={sendS6}
            onClear={() => { setS6Messages([]); setS6Started(false); }}
            placeholder="차시 설계에 대해 추가 질문하세요..."
            emptyHint="위에서 차시 수를 입력하고 'AI 설계 시작' 버튼을 눌러주세요."
            endRef={s6EndRef}
          />
          <div className="border border-line rounded-xl p-3.5 grid gap-3 bg-[#fafeff]">
            <span className="text-sm font-semibold text-ink">반영 내용 — 차시별 수업 계획</span>
            <div className="grid grid-cols-[2.5rem_6rem_1fr_9rem_7rem_auto] gap-x-2 text-xs font-medium text-muted px-1">
              <span>차시</span>
              <span>단계</span>
              <span>수업 내용 (사고 및 탐구)</span>
              <span>산출물</span>
              <span>관련교과</span>
              <span />
            </div>
            {(steps.step6.lessons ?? []).map((lesson, idx) => (
              <div key={idx} className="grid grid-cols-[2.5rem_6rem_1fr_9rem_7rem_auto] gap-2 items-start">
                <input
                  type="text"
                  className="border border-line rounded-lg px-2 py-1.5 text-sm text-center"
                  placeholder={`예: ${idx + 1} 또는 ${idx + 1}-${idx + 2}`}
                  value={lesson.period}
                  onChange={(e) => {
                    const next = steps.step6.lessons.map((l, i) => i === idx ? { ...l, period: e.target.value } : l);
                    onChangeSteps({ ...steps, step6: { lessons: next } });
                  }}
                />
                <input
                  type="text"
                  className="border border-line rounded-lg px-2 py-1.5 text-sm"
                  placeholder="도입/탐구/일반화/전이/정리"
                  value={lesson.stage}
                  onChange={(e) => {
                    const next = steps.step6.lessons.map((l, i) => i === idx ? { ...l, stage: e.target.value } : l);
                    onChangeSteps({ ...steps, step6: { lessons: next } });
                  }}
                />
                <textarea
                  rows={3}
                  className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                  placeholder="수업 활동 내용을 입력하세요"
                  value={lesson.content}
                  onChange={(e) => {
                    const next = steps.step6.lessons.map((l, i) => i === idx ? { ...l, content: e.target.value } : l);
                    onChangeSteps({ ...steps, step6: { lessons: next } });
                  }}
                />
                <textarea
                  rows={3}
                  className="border border-line rounded-lg px-2.5 py-1.5 text-sm resize-none"
                  placeholder="산출물"
                  value={lesson.output}
                  onChange={(e) => {
                    const next = steps.step6.lessons.map((l, i) => i === idx ? { ...l, output: e.target.value } : l);
                    onChangeSteps({ ...steps, step6: { lessons: next } });
                  }}
                />
                <input
                  type="text"
                  className="border border-line rounded-lg px-2 py-1.5 text-sm"
                  placeholder="과학, 사회"
                  value={lesson.relatedSubject}
                  onChange={(e) => {
                    const next = steps.step6.lessons.map((l, i) => i === idx ? { ...l, relatedSubject: e.target.value } : l);
                    onChangeSteps({ ...steps, step6: { lessons: next } });
                  }}
                />
                <button
                  type="button"
                  className="text-muted hover:text-red-400 text-lg leading-none cursor-pointer pt-2"
                  onClick={() => {
                    const next = steps.step6.lessons.filter((_, i) => i !== idx);
                    onChangeSteps({ ...steps, step6: { lessons: next.length ? next : [{ period: "1", stage: "", content: "", output: "", relatedSubject: "" }] } });
                  }}
                >×</button>
              </div>
            ))}
            <button
              type="button"
              className="self-start mt-1 border border-dashed border-mint text-mint text-sm rounded-lg px-3 py-1.5 cursor-pointer hover:bg-mint/5"
              onClick={() => {
                const cur = steps.step6.lessons ?? [];
                const nextPeriod = String(cur.length + 1);
                onChangeSteps({ ...steps, step6: { lessons: [...cur, { period: nextPeriod, stage: "", content: "", output: "", relatedSubject: "" }] } });
              }}
            >+ 차시 추가</button>
          </div>
        </div>
      )}

      {/* Step 7: 자료 다운로드 */}
      {step === "step7" && (
        <div className="grid gap-4" id="design-print-area">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-ink">단원 설계 최종 정리</h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 text-sm cursor-pointer"
                onClick={() => {
                  const lines: string[] = ["■ 단원 설계 최종 정리\n"];
                  const sections = [
                    { label: "1. 아이디어 탐색", content: `프로젝트명: ${steps.step1.projectTitle}\n대상 학년: ${steps.step1.targetGrade} / 대상 과목: ${steps.step1.targetSubject}\n학생 수행활동: ${steps.step1.studentActivity}\n활용할 교구: ${steps.step1.materials}${steps.step1.note ? "\n비고: " + steps.step1.note : ""}` },
                    { label: "2. 단원 설정", content: [
                      `프로젝트명: ${steps.step1.projectTitle}${steps.step2.operatingPeriod ? " (" + steps.step2.operatingPeriod + ")" : ""}`,
                      `대상: ${steps.step1.targetGrade} / ${steps.step1.targetSubject}`,
                      `핵심 아이디어: ${steps.step2.coreIdea}`,
                      ...Object.entries(steps.step2.contentElements ?? {}).map(
                        ([subj, el]) => `[${subj}] 지식·이해: ${el.knowledge} / 과정·기능: ${el.process} / 가치·태도: ${el.value}`
                      )
                    ].join("\n") },
                    { label: "3. 개념 추출", content: `핵심어: ${steps.step3.keyWords}\n핵심문장: ${steps.step3.keySentence}\n핵심 질문: ${steps.step3.essentialQuestion}\n탐구질문:\n${steps.step3.inquiryQuestions}` },
                    { label: "4. 주요활동 유목화", content: steps.step4.activities?.map((a, i) => `활동${i + 1}. ${a.name}\n내용: ${a.content}\n산출물: ${a.output}`).join("\n\n") || "" },
                    { label: "5. 평가 설계", content: [
                      steps.step5.evaluationWhat ? `무엇을 평가하는가: ${steps.step5.evaluationWhat}` : "",
                      steps.step5.evaluationWhy ? `왜 평가하는가: ${steps.step5.evaluationWhy}` : "",
                      steps.step5.taskName ? `과제명: ${steps.step5.taskName}` : "",
                      [
                        steps.step5.graspsGoal ? `Goal(목표): ${steps.step5.graspsGoal}` : "",
                        steps.step5.graspsRole ? `Role(역할): ${steps.step5.graspsRole}` : "",
                        steps.step5.graspsAudience ? `Audience(청중): ${steps.step5.graspsAudience}` : "",
                        steps.step5.graspsSituation ? `Situation(상황): ${steps.step5.graspsSituation}` : "",
                        steps.step5.graspsProduct ? `Product(결과물): ${steps.step5.graspsProduct}` : "",
                        steps.step5.graspsStandard ? `Standard(준거): ${steps.step5.graspsStandard}` : "",
                      ].filter(Boolean).join("\n") || "",
                      (steps.step5.rubric ?? []).map((r) => `[${r.element}] 상: ${r.high} / 중: ${r.mid} / 하: ${r.low}`).join("\n"),
                    ].filter(Boolean).join("\n\n") },
                    { label: "6. 차시 설계", content: (steps.step6.lessons ?? []).map((l) => `${l.period}차시: ${l.content}${l.output ? ` / 산출물: ${l.output}` : ""}`).join("\n") },
                  ];
                  sections.forEach(({ label, content }) => {
                    lines.push(`【${label}】`);
                    lines.push(content || "(미입력)");
                    lines.push("");
                  });
                  void navigator.clipboard.writeText(lines.join("\n"));
                  alert("클립보드에 복사되었습니다.");
                }}
              >
                전체 복사
              </button>
              <button
                type="button"
                className="bg-mint text-white border border-mint-dark rounded-lg px-3 py-2 text-sm cursor-pointer"
                onClick={async () => {
                  try {
                    const blob = await generateDocx(steps, selectedStandards);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${steps.step1.projectTitle || "단원설계"}.docx`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (e) {
                    alert("DOCX 생성 중 오류가 발생했습니다.");
                    console.error(e);
                  }
                }}
              >
                DOCX 다운로드
              </button>
              <button
                type="button"
                className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 text-sm cursor-pointer"
                onClick={() => window.print()}
              >
                인쇄 / PDF 저장
              </button>
            </div>
          </div>

          {[
            {
              stepKey: "step1" as const,
              label: "1. 아이디어 탐색",
              rows: [
                { title: "프로젝트명(단원명)", value: steps.step1.projectTitle },
                { title: "대상 학년 / 대상 과목", value: `${steps.step1.targetGrade}${steps.step1.targetSubject ? " / " + steps.step1.targetSubject : ""}` },
                { title: "학생 수행활동", value: steps.step1.studentActivity },
                { title: "활용할 교구", value: steps.step1.materials },
                { title: "비고", value: steps.step1.note },
              ],
            },
            {
              stepKey: "step2" as const,
              label: "2. 단원 설정",
              rows: [
                { title: "프로젝트명(단원명)", value: steps.step1.projectTitle },
                { title: "대상 학년 / 대상 과목", value: `${steps.step1.targetGrade}${steps.step1.targetSubject ? " / " + steps.step1.targetSubject : ""}` },
                { title: "핵심 아이디어", value: steps.step2.coreIdea },
                { title: "운영 차시", value: steps.step2.operatingPeriod },
                ...Object.entries(steps.step2.contentElements ?? {}).map(([subj, el]) => ({
                  title: `내용요소 (${subj})`,
                  value: `지식·이해: ${el.knowledge}\n과정·기능: ${el.process}\n가치·태도: ${el.value}`
                })),
              ],
            },
            {
              stepKey: "step3" as const,
              label: "3. 개념 추출",
              rows: [
                { title: "핵심어", value: steps.step3.keyWords },
                { title: "핵심문장", value: steps.step3.keySentence },
                { title: "핵심 질문", value: steps.step3.essentialQuestion },
                { title: "탐구질문", value: steps.step3.inquiryQuestions },
              ],
            },
            {
              stepKey: "step4" as const,
              label: "4. 주요활동 유목화",
              rows: (steps.step4.activities ?? []).map((a, i) => ({
                title: `활동${i + 1}. ${a.name}`,
                value: `내용: ${a.content}\n산출물: ${a.output}`,
              })),
            },
            {
              stepKey: "step5" as const,
              label: "5. 평가 설계",
              rows: [
                { title: "무엇을 평가하는가", value: steps.step5.evaluationWhat },
                { title: "왜 평가하는가", value: steps.step5.evaluationWhy },
                { title: "과제명", value: steps.step5.taskName },
                { title: "Goal (목표)", value: steps.step5.graspsGoal },
                { title: "Role (역할)", value: steps.step5.graspsRole },
                { title: "Audience (청중)", value: steps.step5.graspsAudience },
                { title: "Situation (상황)", value: steps.step5.graspsSituation },
                { title: "Product (결과물)", value: steps.step5.graspsProduct },
                { title: "Standard (준거)", value: steps.step5.graspsStandard },
                ...(steps.step5.rubric ?? []).map((r) => ({ title: `루브릭 - ${r.element}`, value: `상: ${r.high}\n중: ${r.mid}\n하: ${r.low}` })),
              ],
            },
            {
              stepKey: "step6" as const,
              label: "6. 차시 설계",
              rows: (steps.step6.lessons ?? []).map((l) => ({
                title: `${l.period}차시`,
                value: `${l.content}${l.output ? `\n산출물: ${l.output}` : ""}`,
              })),
            },
          ].map(({ stepKey, label, rows }) => {
            const card = cards.find((c) => c.step === stepKey);
            const isLocked = card?.locked ?? false;
            return (
              <div
                key={stepKey}
                className={`border rounded-xl p-3.5 grid gap-2 ${isLocked ? "border-mint bg-[#f0faf6]" : "border-line bg-[#fafeff]"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-ink">{label}</span>
                  {isLocked && (
                    <span className="text-[11px] bg-mint text-white rounded-full px-2 py-0.5">확정</span>
                  )}
                </div>
                {rows.map(({ title, value }) => (
                  <div key={title} className="grid gap-1">
                    <span className="text-xs text-muted font-medium">{title}</span>
                    <p className="text-sm text-ink whitespace-pre-wrap bg-white border border-line rounded-lg px-2.5 py-2 min-h-[40px]">
                      {value.trim() || <span className="text-muted italic">미입력</span>}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {step !== "step7" && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            type="button"
            className="bg-mint text-white border border-mint-dark rounded-lg px-3 py-2 cursor-pointer"
            onClick={onConfirm}
          >
            이 단계 확정
          </button>
        </div>
      )}
      {error && <p className="text-warn my-2.5">{error}</p>}
    </section>
  );
}
