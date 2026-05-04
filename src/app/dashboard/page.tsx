import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromServer } from "@/lib/auth-session";
import { DashboardProjects } from "@/components/DashboardProjects";
import { LogoutButton } from "@/components/LogoutButton";
import { SettingsDropdown } from "@/components/SettingsDropdown";

const ADMIN_EMAIL = "papakoo971@gmail.com";

export default function DashboardPage() {
  const session = getSessionFromServer();
  if (!session) redirect("/login");

  const isAdmin = session.email === ADMIN_EMAIL;

  return (
    <main className="px-5 py-5 w-[60%] mx-auto">
      <section className="bg-panel border border-line rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold mb-1">깊이 있는 수업 설계 대시보드</h1>
            <p className="text-muted text-sm">
              {session.name} 선생님, 환영합니다.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <LogoutButton />
            <SettingsDropdown isAdmin={isAdmin} />
          </div>
        </div>
        <div className="mt-3">
          <Link href="/planner">
            <button
              type="button"
              className="bg-mint text-white border border-mint-dark rounded-lg px-3 py-2 cursor-pointer"
            >
              단원 설계 시작
            </button>
          </Link>
        </div>
      </section>
      <DashboardProjects />
    </main>
  );
}
