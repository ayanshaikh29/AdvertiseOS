"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Search, Command, ShieldCheck, ChevronDown, Check } from "lucide-react";
import { useBrands, usePendingApprovals, getActiveBrandId, setActiveBrandId, type BrandOption } from "@/components/shell/hooks";

const TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "AI Workspace", sub: "Your AI marketing manager" },
  briefs: { title: "Content Studio", sub: "Posts, reels & ad copy" },
  "briefs/new": { title: "Content Studio", sub: "New content brief" },
  campaigns: { title: "Projects", sub: "Campaigns & deliverables" },
  calendar: { title: "Calendar", sub: "Scheduled content" },
  approvals: { title: "Approvals", sub: "Human review queue" },
  brand: { title: "Brand Voice", sub: "Guidelines & tone" },
  assets: { title: "Assets", sub: "Media library" },
  analytics: { title: "Analytics", sub: "Performance & reports" },
  integrations: { title: "Integrations", sub: "Connected channels" },
  team: { title: "AI Team", sub: "Agent roster & costs" },
  crm: { title: "CRM & Leads", sub: "Pipeline & follow-ups" },
  autopilot: { title: "Trend Radar", sub: "Live market signals" },
  clients: { title: "Clients", sub: "Client workspaces" },
  settings: { title: "Settings", sub: "Governance & audit" },
  catalog: { title: "Catalog", sub: "Products & services" },
  voice: { title: "Voice", sub: "Voice assistant" },
  login: { title: "Sign in", sub: "" },
};

function BrandSelector() {
  const { data = [], isLoading } = useBrands();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveId(getActiveBrandId(data));
  }, [data]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (isLoading || data.length === 0) return null;
  const active = data.find((b) => b.id === activeId) ?? data[0];

  const choose = (b: BrandOption) => {
    setActiveBrandId(b.id);
    setActiveId(b.id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-[36px] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-[#d4d9e2] hover:bg-surface-hover"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-soft text-[10px] font-bold text-[#1D4ED8]">
          {(active?.name || "B").slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[140px] truncate sm:block">{active?.name}</span>
        <ChevronDown size={13} className="text-[#94A3B8]" />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[0_16px_40px_-20px_rgba(16,24,40,0.4)]">
          <li className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Active client</li>
          {data.map((b) => (
            <li key={b.id}>
              <button
                role="option"
                aria-selected={b.id === active?.id}
                onClick={() => choose(b)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#334155] transition hover:bg-surface-hover"
              >
                <span className="truncate">{b.name}</span>
                {b.id === active?.id && <Check size={13} className="shrink-0 text-[#2563EB]" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Topbar({ onPalette }: { onPalette: () => void }) {
  const pathname = usePathname();
  const seg = (pathname.split("/")[1] || "dashboard") as keyof typeof TITLES;
  const title = TITLES[seg]?.title ?? seg;
  const sub = TITLES[seg]?.sub ?? "";
  const pending = usePendingApprovals();
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => setEmail(d.session?.email || "ayan@digitaladvertise.in"))
      .catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPalette]);

  const count = pending.data ?? 0;

  return (
    <header className="sticky top-0 z-30 flex min-h-14 w-full items-center justify-between gap-2.5 border-b border-border bg-[rgba(255,255,255,0.92)] px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl sm:gap-3 sm:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
          <span>AdvertiseOS</span>
          <span aria-hidden>/</span>
          <span className="truncate text-[#64748B]">{title}</span>
        </div>
        <h1 className="font-display truncate text-base font-bold leading-tight tracking-tight text-ink">
          {title}
          {sub ? <span className="ml-2 text-xs font-medium text-muted">{sub}</span> : null}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <BrandSelector />

        <button
          onClick={onPalette}
          className="hidden min-h-[36px] items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-[#d4d9e2] hover:bg-surface-hover sm:flex"
        >
          <Search size={14} />
          <span>Search & actions…</span>
          <span className="flex items-center gap-0.5 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
            <Command size={9} /> K
          </span>
        </button>

        <div className="hidden items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-semibold text-[#047857] lg:flex">
          <ShieldCheck size={13} />
          <span>Approval Protected</span>
        </div>

        <Link
          href="/approvals"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-[#64748B] transition hover:bg-surface-hover hover:text-ink"
          title={`${count} deliverables pending approval`}
          aria-label={`${count} deliverables pending approval`}
        >
          <Bell size={16} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2563EB] px-1 text-[9px] font-bold text-white">
              {count}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-xs font-bold text-white">
            {(email || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden text-left md:block">
            <p className="max-w-[120px] truncate text-xs font-semibold leading-tight text-ink">{email.split("@")[0] || "Agency Owner"}</p>
            <p className="text-[10px] leading-tight text-muted">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
