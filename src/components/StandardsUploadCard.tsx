"use client";

import { useState } from "react";

type Props = {
  onUploaded: () => void;
};

export function StandardsUploadCard({ onUploaded }: Props) {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [payload, setPayload] = useState("");
  const [status, setStatus] = useState("준비");

  const upload = () => {
    void (async () => {
      setStatus("업로드 중...");
      const res = await fetch("/api/standards/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, payload })
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus(`업로드 실패${data.error ? `: ${data.error}` : ""}`);
        return;
      }

      const data = (await res.json()) as { inserted: number };
      setStatus(`${data.inserted}개 성취기준 업로드됨`);
      setPayload("");
      onUploaded();
    })();
  };

  return (
    <div>
      <h3 className="text-base font-semibold mb-1">커스텀 성취기준 업로드</h3>
      <p className="text-muted text-sm mb-2">
        JSON 배열 또는 CSV 행을 입력하세요. 필수 컬럼: <code>achievementCode, achievementText, subject, domain, gradeCluster</code>
      </p>
      <div className="flex gap-2 mt-3 flex-wrap">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as "json" | "csv")}
          className="flex-1 min-w-[80px]"
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
        <button
          type="button"
          className="bg-mint text-white border border-mint-dark rounded-lg px-3 py-2 cursor-pointer"
          onClick={upload}
        >
          업로드
        </button>
        <small className="text-muted text-xs self-center">{status}</small>
      </div>
      <textarea
        rows={8}
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        placeholder={
          format === "json"
            ? '[{"achievementCode":"[6과12-09]","achievementText":"...","subject":"과학","domain":"생명","gradeCluster":"5~6학년군"}]'
            : "achievementCode,achievementText,subject,domain,gradeCluster"
        }
        className="mt-2"
      />
    </div>
  );
}
