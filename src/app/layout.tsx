import "@/app/globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "EduPlan AI",
  description: "Curriculum designer for elementary teachers"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
