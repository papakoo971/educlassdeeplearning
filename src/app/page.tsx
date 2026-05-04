import { redirect } from "next/navigation";
import { getSessionFromServer } from "@/lib/auth-session";

export default function RootPage() {
  const session = getSessionFromServer();
  redirect(session ? "/dashboard" : "/login");
}
