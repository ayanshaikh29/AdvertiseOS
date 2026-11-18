"use client";

import { AgencyChatWorkspace } from "@/components/chat/AgencyChatWorkspace";

export default function DashboardPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <AgencyChatWorkspace />
    </div>
  );
}
