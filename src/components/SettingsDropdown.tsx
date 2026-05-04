"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  isAdmin: boolean;
};

export function SettingsDropdown({ isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleWithdraw = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await fetch("/api/auth/withdraw", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 cursor-pointer flex items-center gap-1"
        onClick={() => { setOpen((v) => !v); setConfirming(false); }}
      >
        <span>⚙</span>
        <span>설정</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-line rounded-xl shadow-lg z-50 overflow-hidden">
          {isAdmin && (
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#f0fafa] border-b border-line"
              onClick={() => { setOpen(false); router.push("/admin"); }}
            >
              관리자 페이지
            </button>
          )}
          <button
            type="button"
            className={`w-full text-left px-4 py-2.5 text-sm ${confirming ? "bg-red-50 text-red-600 font-semibold" : "hover:bg-red-50 text-red-500"}`}
            onClick={handleWithdraw}
          >
            {confirming ? "정말 탈퇴하시겠습니까? 한 번 더 클릭" : "회원 탈퇴"}
          </button>
        </div>
      )}
    </div>
  );
}
