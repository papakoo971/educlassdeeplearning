import { redirect } from "next/navigation";
import { getSessionFromServer } from "@/lib/auth-session";
import { AdminUserTable } from "@/components/AdminUserTable";

const ADMIN_EMAIL = "papakoo971@gmail.com";

export default function AdminPage() {
  const session = getSessionFromServer();
  if (!session || session.email !== ADMIN_EMAIL) redirect("/dashboard");

  return (
    <main className="px-5 py-5 max-w-[1400px] mx-auto">
      <section className="bg-panel border border-line rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">관리자 페이지</h1>
            <p className="text-muted text-sm">가입 사용자 및 프로젝트 현황</p>
          </div>
          <a href="/dashboard">
            <button type="button" className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 text-sm cursor-pointer">
              대시보드로
            </button>
          </a>
        </div>
      </section>
      <AdminUserTable />
    </main>
  );
}
