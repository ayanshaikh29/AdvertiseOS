"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Megaphone, CalendarDays, Inbox, BarChart3, Cog, ChevronLeft, ChevronRight, LogOut, Plug,
  Building2, Users2, FolderKanban, Sparkles, ShieldCheck, FileText, type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useAiCost, usePendingApprovals } from "@/components/shell/hooks";

type NavItem = { href: string; label: string; hint: string; icon: LucideIcon };

const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "WORKSPACE",
    items: [
      { href: "/dashboard", label: "AI Workspace", hint: "Talk to your AI marketing manager", icon: Sparkles },
      { href: "/clients", label: "Clients", hint: "Client workspaces & knowledge context", icon: Building2 },
      { href: "/campaigns", label: "Projects", hint: "Campaigns, content & deliverables", icon: FolderKanban },
    ],
  },
  {
    label: "MARKETING",
    items: [
      { href: "/briefs", label: "Content Studio", hint: "Create posts, reels & ad copy", icon: Megaphone },
      { href: "/calendar", label: "Calendar", hint: "Scheduled content, month & week", icon: CalendarDays },
      { href: "/approvals", label: "Approvals", hint: "Review queue — nothing publishes without you", icon: ShieldCheck },
    ],
  },
  {
    label: "CUSTOMER MANAGEMENT",
    items: [
      { href: "/crm", label: "CRM & Leads", hint: "Lead pipeline & follow-ups", icon: Users2 },
      { href: "/autopilot", label: "Trend Radar", hint: "Live market trends & autopilot", icon: Inbox },
    ],
  },
  {
    label: "INSIGHTS",
    items: [{ href: "/analytics", label: "Analytics", hint: "Performance, spend & reports", icon: BarChart3 }],
  },
  {
    label: "SETTINGS",
    items: [
      { href: "/integrations", label: "Integrations", hint: "Connected channels & ad platforms", icon: Plug },
      { href: "/settings", label: "Settings", hint: "Governance, audit log & status", icon: Cog },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const pending = usePendingApprovals();
  const { cost, limit, pct } = useAiCost();

  useEffect(() => {
    setCollapsed(localStorage.getItem("advos-rail") === "1");
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem("advos-rail", c ? "0" : "1");
      return !c;
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-all duration-300 md:flex",
        collapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" title="AdvertiseOS">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] font-display text-base font-bold text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.6)]">
            A
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="font-display text-sm font-bold tracking-tight text-ink">AdvertiseOS</span>
                <span className="rounded-full bg-brand-soft px-1.5 py-px text-[9px] font-bold text-[#1D4ED8]">AI</span>
              </span>
              <span className="block truncate text-[10px] text-muted">Marketing Agency OS</span>
            </span>
          )}
        </Link>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition hover:bg-surface-2 hover:text-ink"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Workspace navigation" className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
        {GROUPS.map((g) => (
          <div key={g.label}>
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{g.label}</p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                const Icon = item.icon;
                const badge = item.href === "/approvals" ? (pending.data ?? 0) : undefined;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? `${item.label} — ${item.hint}` : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-brand-soft font-semibold text-[#1D4ED8]"
                          : "text-[#64748B] hover:bg-surface-2 hover:text-ink",
                        collapsed && "justify-center px-0 py-2.5"
                      )}
                    >
                      {isActive && <span className="absolute -left-2.5 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#2563EB]" />}
                      <Icon size={17} className={cn("shrink-0", isActive ? "text-[#2563EB]" : "text-[#94A3B8] group-hover:text-ink transition-colors")} />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {!collapsed && badge !== undefined && badge > 0 && (
                        <span className="rounded-full bg-[#2563EB] px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
                      )}
                      {collapsed && badge !== undefined && badge > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#2563EB]" aria-hidden />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: real cost guardrail + sign out */}
      <div className="space-y-2 border-t border-border-subtle p-3">
        {!collapsed && (
          <div className="rounded-xl border border-border bg-surface-2 p-2.5">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                <span>AI spend</span>
              </span>
              <span className="font-mono font-semibold text-ink">${cost.toFixed(2)} / ${limit}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e7e9ee]">
              <div className="h-full rounded-full bg-[#2563EB] transition-all duration-500" style={{ width: `${Math.round(pct * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] text-[#94A3B8]">From persisted agent run costs</p>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <Link
            href="/login"
            title="Sign out"
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#64748B] transition hover:bg-surface-2 hover:text-ink",
              collapsed && "w-full justify-center px-0"
            )}
          >
            <LogOut size={15} />
            {!collapsed && <span>Sign out</span>}
          </Link>
          {!collapsed && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#047857]">
              <FileText size={12} /> Approval-gated
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
