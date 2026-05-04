"use client";

import { useEffect, useState } from "react";

type Provider = "stub" | "openai" | "anthropic" | "gemini";

export function ProviderSettingsCard() {
  const [provider, setProvider] = useState<Provider>("stub");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("불러오는 중...");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [keyPreview, setKeyPreview] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings/ai");
      if (!res.ok) {
        setStatus("설정 불러오기 실패");
        return;
      }
      const data = (await res.json()) as {
        provider: Provider;
        keyConfigured: boolean;
        keyPreview: string;
      };
      setProvider(data.provider);
      setKeyConfigured(data.keyConfigured);
      setKeyPreview(data.keyPreview);
      setStatus("준비");
    })();
  }, []);

  const save = () => {
    void (async () => {
      setStatus("저장 중...");
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey })
      });
      if (!res.ok) {
        setStatus("저장 실패");
        return;
      }
      setApiKey("");
      setKeyConfigured(provider !== "stub");
      setKeyPreview(apiKey ? `${apiKey.slice(0, 6)}...` : keyPreview);
      setStatus("저장됨");
    })();
  };

  return (
    <div>
      <h3 className="text-base font-semibold mb-1">AI 제공자 설정</h3>
      <p className="text-muted text-sm mb-2">
        AI 보조에 사용할 제공자를 설정하세요. <code>stub</code>은 내장 테스트 응답을 사용합니다.
      </p>
      <div className="flex gap-2 mt-3 flex-wrap">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          className="flex-1 min-w-[100px]"
        >
          <option value="stub">Stub (테스트)</option>
          <option value="gemini">Google Gemini</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <input
          type="password"
          placeholder="API 키"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={provider === "stub"}
          className="flex-1 min-w-[160px]"
        />
        <button
          type="button"
          className="bg-mint text-white border border-mint-dark rounded-lg px-3 py-2 cursor-pointer"
          onClick={save}
        >
          저장
        </button>
      </div>
      <small className="text-muted text-xs">
        {status} | 키 설정: {keyConfigured ? "완료" : "미설정"} {keyPreview ? `(${keyPreview})` : ""}
      </small>
    </div>
  );
}
