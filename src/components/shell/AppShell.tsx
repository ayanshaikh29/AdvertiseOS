"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { PillNav } from "@/components/PillNav";
import { QueryProvider } from "@/components/QueryProvider";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { Toaster } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [palette, setPalette] = useState(false);
  const isLoginPage = pathname === "/login";
  const isDashboard = pathname === "/dashboard" || pathname === "/";

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-bg text-ink antialiased">
        <PillNav />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-24 sm:px-6">{children}</main>
      </div>
    );
  }

  return (
    <QueryProvider>
      <div className="flex min-h-screen bg-bg text-ink antialiased">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col transition-all duration-300 md:pl-[240px]">
          <Topbar onPalette={() => setPalette(true)} />

          <main
            id="main"
            className={`w-full flex-1 ${isDashboard ? "h-[100dvh] p-2 sm:p-3 md:p-4 overflow-hidden" : "mx-auto max-w-7xl px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 md:pb-6"}`}
          >
            {children}
          </main>
        </div>

        <MobileTabs />
        <CommandPalette open={palette} onOpenChange={setPalette} />
        <Toaster />
      </div>
    </QueryProvider>
  );
}

export { PageHeader } from "@/components/ui/page-header";
