"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

const TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "AI Workspace", sub: "Marketing Command Center" },
  campaigns: { title: "Studio & Campaigns", sub: "Deliverables & Active Runs" },
  brand: { title: "Brand Voice", sub: "Guidelines, Lexicon & Tone Rules" },
  calendar: { title: "Content Calendar", sub: "30-Day Scheduled Omnichannel Flight Plan" },
  approvals: { title: "Approvals Inbox", sub: "Strict Human Sign-off Gate" },
  crm: { title: "CRM & Leads", sub: "Lead Inquiries & Conversion Pipeline" },
  analytics: { title: "Performance Analytics", sub: "ROAS Signals & Attribution" },
  catalog: { title: "Products & Services", sub: "Verified Catalog Offerings" },
  settings: { title: "Settings", sub: "Account & System Configuration" },
  team: { title: "Specialist Roster", sub: "7 Autonomous Agents" },
  briefs: { title: "Campaign Briefs", sub: "Intake & Objectives" },
};

export function Topbar({ onPalette }: { onPalette: () => void }) {
  const pathname = usePathname();
  const seg = (pathname.split("/")[1] || "dashboard") as keyof typeof TITLES;
  const isDashboard = pathname === "/dashboard";

  // On the dashboard, the inner workspace canvas already renders its own header
  if (isDashboard) {
    return null;
  }

  const title = TITLES[seg]?.title ?? (seg.charAt(0).toUpperCase() + seg.slice(1));
  const sub = TITLES[seg]?.sub ?? "";

  return (
    <header className="sticky top-0 z-30 flex min-h-14 w-full items-center justify-between gap-2.5 border-b border-black/[0.05] bg-white/70 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-gradient-to-tr from-[#FFF7ED] via-[#FDF2F8] to-[#F5F3FF] p-1 shadow-2xs">
          <Image src="/logo-emblem-transparent.png" alt="Emblem" width={18} height={18} className="object-contain" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display truncate text-xs sm:text-sm font-bold tracking-tight text-[#18181B]">
            {title}
            {sub ? <span className="hidden sm:inline ml-2 text-xs font-normal text-[#71717A]">{sub}</span> : null}
          </h1>
        </div>
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
