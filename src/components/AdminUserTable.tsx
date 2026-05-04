"use client";

import { useEffect, useState } from "react";

type UserRow = {
  userId: string;
  email: string;
  name: string;
  updatedAt: string;
  projectCount: number;
};

export function AdminUserTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [status, setStatus] = useState("불러오는 중...");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) { setStatus("데이터를 불러오지 못했습니다."); return; }
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
      setStatus("");
    })();
  }, []);

  const totalProjects = users.reduce((s, u) => s + u.projectCount, 0);

  return (
    <section className="bg-panel border border-line rounded-2xl p-4">
      {status && <p className="text-muted text-sm">{status}</p>}
      {!status && (
        <>
          <div className="flex gap-4 mb-4">
            <div className="bg-[#f0fafa] border border-line rounded-xl px-4 py-3">
              <p className="text-xs text-muted">총 사용자</p>
              <p className="text-2xl font-bold">{users.length}명</p>
            </div>
            <div className="bg-[#f0fafa] border border-line rounded-xl px-4 py-3">
              <p className="text-xs text-muted">총 프로젝트</p>
              <p className="text-2xl font-bold">{totalProjects}개</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#f0fafa] text-left">
                  <th className="px-3 py-2 border border-line rounded-tl-lg">이름</th>
                  <th className="px-3 py-2 border border-line">이메일</th>
                  <th className="px-3 py-2 border border-line">프로젝트</th>
                  <th className="px-3 py-2 border border-line rounded-tr-lg">최근 접속</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-[#fafeff]">
                    <td className="px-3 py-2 border border-line">{u.name}</td>
                    <td className="px-3 py-2 border border-line">{u.email}</td>
                    <td className="px-3 py-2 border border-line text-center">{u.projectCount}개</td>
                    <td className="px-3 py-2 border border-line text-muted">
                      {new Date(u.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
