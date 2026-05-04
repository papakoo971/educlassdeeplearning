"use client";

import { useEffect, useState } from "react";

type Provider = "stub" | "openai" | "anthropic" | "gemini";

type ModelOption = { value: string; label: string };

const MODEL_OPTIONS: Record<Exclude<Provider, "stub">, ModelOption[]> = {
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (권장)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" }
  ],
  openai: [
    { value: "o3-mini", label: "o3 Mini (권장)" },
    { value: "o3", label: "o3" },
    { value: "o3-pro", label: "o3 Pro" },
    { value: "gpt-4o", label: "GPT-4o" }
  ],
  anthropic: [
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (권장)" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" }
  ]
};

type Props = {
  isFirstSetup: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function AISettingsModal({ isFirstSetup, onClose, onSaved }: Props) {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [apiKey, setApiKey] = useState("");
  const [keyPreview, setKeyPreview] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings/ai");
      if (!res.ok) return;
      const data = (await res.json()) as {
        provider: Provider;
        model: string;
        keyPreview: string;
      };
      if (data.provider !== "stub") {
        setProvider(data.provider);
        setModel(data.model || defaultModel(data.provider));
      }
      setKeyPreview(data.keyPreview);
    })();
  }, []);

  function defaultModel(p: Provider): string {
    if (p === "stub") return "";
    return MODEL_OPTIONS[p][0].value;
  }

  function handleProviderChange(p: Provider) {
    setProvider(p);
    setModel(defaultModel(p));
  }

  const save = async () => {
    if (provider !== "stub" && !apiKey && !keyPreview) {
      setErrorMsg("API 키를 입력하세요.");
      return;
    }
    setStatus("saving");
    setErrorMsg("");
    const res = await fetch("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, apiKey })
    });
    if (!res.ok) {
      setStatus("error");
      setErrorMsg("저장에 실패했습니다.");
      return;
    }
    setStatus("idle");
    onSaved();
    onClose();
  };

  const models = provider !== "stub" ? MODEL_OPTIONS[provider] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl border border-line shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold mb-1">
          {isFirstSetup ? "AI 모델 설정" : "AI 설정 변경"}
        </h2>
        <p className="text-muted text-sm mb-5">
          {isFirstSetup
            ? "수업 설계 AI 보조에 사용할 제공자와 모델을 선택하세요."
            : "현재 사용 중인 AI 제공자와 모델을 변경할 수 있습니다."}
        </p>

        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            AI 제공자
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="stub">Stub (테스트용)</option>
            </select>
          </label>

          {provider !== "stub" && (
            <label className="grid gap-1.5 text-sm font-medium">
              모델
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {provider !== "stub" && (
            <label className="grid gap-1.5 text-sm font-medium">
              API 키
              {keyPreview && (
                <span className="text-xs text-muted font-normal">
                  현재 설정된 키: {keyPreview} (변경하려면 새 키 입력)
                </span>
              )}
              <input
                type="password"
                placeholder={keyPreview ? "새 API 키 (변경 시에만 입력)" : "API 키를 입력하세요"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </label>
          )}

          {provider === "gemini" && (
            <p className="text-xs text-muted bg-[#f0faf6] border border-[#c5e8dd] rounded-lg p-2.5">
              API 키 발급:{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mint underline"
              >
                aistudio.google.com/apikey
              </a>
            </p>
          )}

          {errorMsg && <p className="text-warn text-sm">{errorMsg}</p>}
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          {!isFirstSetup && (
            <button
              type="button"
              className="border border-line bg-[#f7fbfb] rounded-lg px-4 py-2 cursor-pointer"
              onClick={onClose}
            >
              취소
            </button>
          )}
          <button
            type="button"
            className="bg-mint text-white border border-mint-dark rounded-lg px-4 py-2 cursor-pointer disabled:opacity-50"
            onClick={save}
            disabled={status === "saving"}
          >
            {status === "saving" ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
