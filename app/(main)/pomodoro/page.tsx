import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";

import { PomodoroTimer } from "./_components/pomodoro-timer";

export const metadata: Metadata = { title: "Pomodoro" };

export default function PomodoroPage() {
  return (
    <PageContainer className="items-center justify-center">
      <PomodoroTimer />
    </PageContainer>
  );
}
