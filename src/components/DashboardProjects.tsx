"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProjectRow = {
  id: string;
  title: string;
  updatedAt: string;
  currentStep: string;
  cards: Array<{ locked: boolean }>;
};

export function DashboardProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [status, setStatus] = useState("불러오는 중...");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
    if (projects.length === 1) setStatus("저장된 프로젝트가 없습니다.");
  };

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        setStatus("프로젝트를 불러오지 못했습니다.");

        return;
      }
      const data = (await res.json()) as { projects: ProjectRow[] };
      setProjects(data.projects);
      setStatus(data.projects.length ? "" : "저장된 프로젝트가 없습니다.");
    })();
  }, []);

  return (
    <section className="bg-panel border border-line rounded-2xl p-4 mb-4">
      <h2 className="text-lg font-semibold mb-1">저장된 단원 설계</h2>
      <p className="text-muted text-sm mb-3">{status}</p>
      <div className="grid gap-2.5">
        {projects.map((p) => {
          const lockedCount = p.cards.filter((c) => c.locked).length;
          const progress = Math.min(100, Math.round((lockedCount / 6) * 100));
          return (
            <article key={p.id} className="border border-line rounded-xl p-2.5 grid gap-2 bg-[#fafeff]">
              <strong className="text-sm">{p.title}</strong>
              <small className="text-muted text-xs">
                최근 수정: {new Date(p.updatedAt).toLocaleString()} | 현재 단계: {p.currentStep}
              </small>
              <small className="text-muted text-xs">완성도: {progress}%</small>
              <div className="flex gap-2 justify-between">
                <Link href={`/planner?projectId=${p.id}`}>
                  <button type="button" className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 text-sm cursor-pointer">
                    이어서 작업
                  </button>
                </Link>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm cursor-pointer border ${deletingId === p.id ? "bg-red-50 border-red-300 text-red-600 font-semibold" : "border-line bg-[#f7fbfb] text-red-400"}`}
                  onClick={() => handleDelete(p.id)}
                >
                  {deletingId === p.id ? "정말 삭제?" : "삭제"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
