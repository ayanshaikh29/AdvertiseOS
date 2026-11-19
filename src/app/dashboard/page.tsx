"use client";

import { AgencyChatWorkspace } from "@/components/chat/AgencyChatWorkspace";

export default function DashboardPage() {
  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      <AgencyChatWorkspace />
    </div>
  );
}
