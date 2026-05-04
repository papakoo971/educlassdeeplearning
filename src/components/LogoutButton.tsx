"use client";

export function LogoutButton() {
  const logout = () => {
    void (async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    })();
  };

  return (
    <button
      type="button"
      className="border border-line bg-[#f7fbfb] rounded-lg px-3 py-2 cursor-pointer"
      onClick={logout}
    >
      로그아웃
    </button>
  );
}
