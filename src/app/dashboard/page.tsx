"use client";

import { AgencyChatWorkspace } from "@/components/chat/AgencyChatWorkspace";

export default function DashboardPage() {
  return (
    <div className="flex h-[calc(100dvh-7.75rem)] w-full flex-col sm:h-[calc(100dvh-6rem)]">
      <AgencyChatWorkspace />
    </div>
  );
}
