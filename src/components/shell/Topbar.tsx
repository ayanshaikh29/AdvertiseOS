"use client";

import { usePathname } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";
import { usePendingApprovals } from "@/components/shell/hooks";

const TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "AI Workspace", sub: "Autonomous Marketing Agency OS" },
  campaigns: { title: "Campaign Projects", sub: "Deliverables & Active Runs" },
  brand: { title: "Brand Voice", sub: "Guidelines & Tone" },
  login: { title: "Sign in", sub: "" },
};

export function Topbar({ onPalette }: { onPalette: () => void }) {
  const pathname = usePathname();
  const seg = (pathname.split("/")[1] || "dashboard") as keyof typeof TITLES;
  const isDashboard = pathname === "/dashboard" || pathname === "/";

  // On the dashboard, Image 1 has a pure, unencumbered canvas without corporate toolbars
  if (isDashboard) {
    return null;
  }

  const title = TITLES[seg]?.title ?? seg;
  const sub = TITLES[seg]?.sub ?? "";

  return (
    <header className="sticky top-0 z-30 flex min-h-14 w-full items-center justify-between gap-2.5 border-b border-black/[0.05] bg-white/70 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl sm:px-6">
      <div className="min-w-0">
        <h1 className="font-display truncate text-sm font-bold tracking-tight text-[#18181B]">
          {title}
          {sub ? <span className="ml-2 text-xs font-normal text-[#71717A]">{sub}</span> : null}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          <ShieldCheck size={13} />
          <span>Approval Protected</span>
        </div>
      </div>
    </header>
  );
}
