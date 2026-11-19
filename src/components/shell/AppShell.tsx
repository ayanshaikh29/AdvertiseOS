"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isPublicPage = !pathname || pathname === "/" || pathname === "/login";
  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("advos-rail") === "1");

    const handleToggle = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      if (typeof detail?.collapsed === "boolean") {
        setSidebarCollapsed(detail.collapsed);
      } else {
        setSidebarCollapsed(localStorage.getItem("advos-rail") === "1");
      }
    };

    window.addEventListener("advos-sidebar-toggle", handleToggle);
    return () => window.removeEventListener("advos-sidebar-toggle", handleToggle);
  }, []);

  // Public Landing Page and Login Page: Standalone full-width layout without app sidebar or shell clutter
  if (isPublicPage) {
    return (
      <QueryProvider>
        <div className="min-h-screen bg-bg text-ink antialiased">
          {children}
          <Toaster />
        </div>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <div
        className={cn(
          "flex bg-bg text-ink antialiased",
          isDashboard ? "h-screen h-[100dvh] max-h-screen overflow-hidden" : "min-h-screen"
        )}
      >
        <Sidebar />

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-all duration-300",
            sidebarCollapsed ? "md:pl-[76px]" : "md:pl-[240px]",
            isDashboard && "h-screen h-[100dvh] max-h-screen overflow-hidden"
          )}
        >
          <Topbar onPalette={() => setPalette(true)} />

          <main
            id="main"
            className={cn(
              "w-full flex-1 min-h-0",
              isDashboard
                ? "h-full max-h-full p-2 sm:p-3 md:p-4 overflow-hidden"
                : "mx-auto max-w-7xl px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 md:pb-6"
            )}
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
