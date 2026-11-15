"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const LINKS = [
  { label: "AI Workspace", href: "/dashboard", group: "Workspace" },
  { label: "New content brief", href: "/briefs/new", group: "Workspace" },
  { label: "Content Studio", href: "/briefs", group: "Workspace" },
  { label: "Projects", href: "/campaigns", group: "Workspace" },
  { label: "Clients", href: "/clients", group: "Workspace" },
  { label: "Approval inbox", href: "/approvals", group: "Marketing" },
  { label: "Content Calendar", href: "/calendar", group: "Marketing" },
  { label: "CRM & Leads", href: "/crm", group: "Customer" },
  { label: "Trend Radar / Autopilot", href: "/autopilot", group: "Customer" },
  { label: "Analytics", href: "/analytics", group: "Insights" },
  { label: "Integrations", href: "/integrations", group: "Settings" },
  { label: "Settings & Audit", href: "/settings", group: "Settings" },
  { label: "Brand setup", href: "/brand", group: "Setup" },
  { label: "Media Assets", href: "/assets", group: "Setup" },
  { label: "AI Team roster", href: "/team", group: "Setup" },
  { label: "Product Catalog", href: "/catalog", group: "Setup" },
  { label: "Voice assistant", href: "/voice", group: "Setup" },
  { label: "Autopilot", href: "/autopilot", group: "Setup" },
];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [camps, setCamps] = useState<Array<{ id: string; name?: string }>>([]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCamps((d.campaigns ?? []).slice(-5)))
      .catch(() => {});
  }, [open]);

  const results = useMemo(() => {
    const needle = q.toLowerCase();
    const pages = LINKS.filter((l) => l.label.toLowerCase().includes(needle) || l.group.toLowerCase().includes(needle));
    const cc = camps
      .filter((c) => c.id.toLowerCase().includes(needle) || (c.name ?? "").toLowerCase().includes(needle))
      .map((c) => ({ label: c.name ? `${c.name} — ${c.id}` : `Campaign ${c.id}`, href: `/campaigns/${c.id}`, group: "Projects" }));
    return [...pages, ...cc].slice(0, 12);
  }, [q, camps]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Jump to…</DialogTitle>
        <Input
          autoFocus
          aria-label="Search pages and campaigns"
          placeholder="Type a page, action or campaign…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0].href);
          }}
        />
        <ul className="mt-3 grid max-h-[40vh] gap-1 overflow-auto">
          {results.map((r) => (
            <li key={r.href + r.label}>
              <button onClick={() => go(r.href)} className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm text-[#334155] transition hover:bg-surface-hover">
                <span>{r.label}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{r.group}</span>
              </button>
            </li>
          ))}
          {results.length === 0 ? <li className="px-4 py-3 text-sm text-muted">No matches. Try “approvals”, “crm” or “brief”.</li> : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
