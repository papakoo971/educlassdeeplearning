"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <section className="bg-panel border border-line rounded-2xl p-4 mb-4">
      <h1 className="text-2xl font-bold mb-2">깊이 있는 수업 설계(단원 설계, 프로젝트 수업 설계)</h1>
      <p className="text-muted text-sm mb-3">
        AI를 활용하여 깊이 있는 프로젝트 수업을 쉽게 설계할 수 있도록 도와줍니다.
      </p>
      {error && <p className="text-warn my-2.5">로그인 오류: {error}</p>}
      <a href="/api/auth/google">
        <button
          type="button"
          className="bg-mint text-white border border-mint-dark rounded-lg px-3 py-2 cursor-pointer"
        >
          Google로 로그인
        </button>
      </a>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="max-w-[760px] mx-auto mt-10 px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
