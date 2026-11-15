"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Search,
  Clock,
  CalendarDays,
  Send,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn } from "@/components/ui/motion";
import { toast } from "@/components/ui/toast";
import { useBrands } from "@/components/shell/hooks";
import { fetchAllContentItems, type FlatContentItem } from "@/lib/contentItems";

type ViewMode = "month" | "week" | "list";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PLATFORMS = ["all", "instagram", "facebook", "linkedin", "twitter", "tiktok", "blog", "email"];
const STATUSES = ["all", "pending_human", "approved", "rejected", "scheduled", "published"];

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - dow);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

export default function CalendarPage() {
  const { data: brands = [] } = useBrands();
  const [items, setItems] = useState<FlatContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [brand, setBrand] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FlatContentItem | null>(null);
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: flat } = await fetchAllContentItems(12);
      setItems(flat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        (brand === "all" || it.brandId === brand) &&
        (platform === "all" || it.platform.toLowerCase() === platform) &&
        (status === "all" || it.status === status) &&
        (!q || it.topic.toLowerCase().includes(q) || (it.captions ?? []).join(" ").toLowerCase().includes(q))
    );
  }, [items, brand, platform, status, query]);

  const byDay = useMemo(() => {
    const map = new Map<string, FlatContentItem[]>();
    for (const it of filtered) {
      const key = it.scheduled_for.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return map;
  }, [filtered]);

  const gridDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const moveCursor = (dir: -1 | 1) => {
    setCursor((c) => {
      if (view === "week") return addDays(c, dir * 7);
      return new Date(c.getFullYear(), c.getMonth() + dir, 1);
    });
  };

  const openItem = (it: FlatContentItem) => {
    setSelected(it);
    setNewDate(it.scheduled_for.slice(0, 10));
  };

  const approve = async (it: FlatContentItem) => {
    setBusy(true);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: it.id, action: "approve" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      toast("Approved — ready to schedule");
      setSelected(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async (it: FlatContentItem) => {
    if (!newDate) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${it.campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: it.id, scheduled_for: newDate }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast(`Rescheduled to ${newDate}`);
      setSelected(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Reschedule failed");
    } finally {
      setBusy(false);
    }
  };

  const publishAction = async (it: FlatContentItem, action: "schedule" | "mark-posted") => {
    setBusy(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: it.id, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof d.error === "string" ? d.error : d.error?.error ?? `HTTP ${res.status}`);
      toast(action === "schedule" ? "Scheduled for publishing" : "Marked as published");
      setSelected(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Publish action failed");
    } finally {
      setBusy(false);
    }
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Date", "Platform", "Format", "Status", "Topic", "CTA", "Campaign"];
    const rows = filtered.map((i) =>
      [
        i.scheduled_for,
        i.platform,
        i.format,
        i.status,
        (i.topic || "").replace(/"/g, '""'),
        (i.cta || "").replace(/"/g, '""'),
        i.campaignId,
      ]
        .map((v) => `"${v}"`)
        .join(",")
    );
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `content-calendar-${dayKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const weekStart = weekDays[0];
  const weekEnd = weekDays[weekDays.length - 1];
  const cursorLabel =
    view === "week" && weekStart && weekEnd
      ? `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const renderChip = (it: FlatContentItem, compact = false) => (
    <button
      key={it.id}
      onClick={() => openItem(it)}
      title={`${it.topic} · ${it.platform} · ${it.status}`}
      className={`mt-1 block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] font-medium transition ${
        it.status === "approved" || it.status === "published"
          ? "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]"
          : it.status === "rejected"
            ? "border-[#fecaca] bg-[#fef2f2] text-[#B91C1C]"
            : "border-[#fde68a] bg-[#fffbeb] text-[#92400E]"
      } hover:border-[#93C5FD]`}
    >
      {compact && <span className="mr-1 font-semibold">{it.scheduled_for.slice(8, 10)}</span>}
      {it.topic}
    </button>
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="card p-6">
          <PageHeader
            title="Content calendar"
            description="Approved and pending deliverables across clients — open any item to review, approve, or reschedule."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-border bg-surface-2 p-1 text-xs">
                  {(["month", "week", "list"] as ViewMode[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      aria-pressed={view === v}
                      className={`rounded-lg px-3 py-1.5 capitalize transition ${view === v ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Button variant="secondary" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
                  <Download size={14} /> Export CSV
                </Button>
              </div>
            }
          />
        </div>
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.05}>
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topic or caption…"
              aria-label="Search calendar"
              className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-[#94A3B8] focus:border-[#93C5FD]"
            />
          </div>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Filter by client"
            className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-[#334155] outline-none focus:border-[#93C5FD]"
          >
            <option value="all">All clients</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            aria-label="Filter by platform"
            className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-[#334155] outline-none focus:border-[#93C5FD]"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === "all" ? "All platforms" : p}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-[#334155] outline-none focus:border-[#93C5FD]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>
      </FadeIn>

      {loading ? (
        <div className="grid gap-3">
          <div className="skeleton h-12 bg-[#eef0f4]" />
          <div className="skeleton h-96 bg-[#eef0f4]" />
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="font-medium text-[#B91C1C]">Couldn’t load the calendar: {error}</p>
          <button className="btn-primary mt-4" onClick={load}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarIcon size={36} className="mx-auto text-[#94A3B8]" />
          <h3 className="mt-3 font-display text-base font-bold text-ink">No content scheduled</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            {items.length === 0
              ? "Run a brief in the AI Workspace to generate a multi-platform content calendar."
              : "No items match the active filters."}
          </p>
        </div>
      ) : (
        <FadeIn delay={0.08}>
          <div className="card overflow-hidden">
            {/* View navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <button className="btn-secondary !p-2" onClick={() => moveCursor(-1)} aria-label="Previous">
                  <ChevronLeft size={15} />
                </button>
                <span className="min-w-[180px] text-center text-sm font-bold text-ink">{cursorLabel}</span>
                <button className="btn-secondary !p-2" onClick={() => moveCursor(1)} aria-label="Next">
                  <ChevronRight size={15} />
                </button>
                <button className="btn-secondary ml-1 text-xs" onClick={() => setCursor(new Date())}>
                  Today
                </button>
              </div>
              <span className="text-xs text-muted">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""} shown
              </span>
            </div>

            {view === "month" ? (
              <div className="p-3">
                <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {gridDays.map((d) => {
                    const key = dayKey(d);
                    const dayItems = byDay.get(key) ?? [];
                    const inMonth = d.getMonth() === cursor.getMonth();
                    const isToday = key === dayKey(new Date());
                    return (
                      <div
                        key={key}
                        className={`min-h-[92px] rounded-xl border p-1.5 ${
                          !inMonth
                            ? "border-transparent bg-[#fafbfc] opacity-55"
                            : isToday
                              ? "border-[#93C5FD] bg-brand-soft"
                              : "border-border bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between px-0.5">
                          <span
                            className={`font-mono text-[11px] font-bold ${isToday ? "text-[#1D4ED8]" : inMonth ? "text-[#475569]" : "text-[#CBD5E1]"}`}
                          >
                            {d.getDate()}
                          </span>
                          {dayItems.length > 0 && (
                            <span className="rounded-full bg-white px-1.5 text-[9px] font-bold text-[#2563EB]">
                              {dayItems.length}
                            </span>
                          )}
                        </div>
                        <div className="max-h-[64px] overflow-y-auto">{dayItems.map((it) => renderChip(it))}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : view === "week" ? (
              <div className="grid gap-1.5 p-3 md:grid-cols-7">
                {weekDays.map((d) => {
                  const key = dayKey(d);
                  const dayItems = byDay.get(key) ?? [];
                  const isToday = key === dayKey(new Date());
                  return (
                    <div
                      key={key}
                      className={`min-h-[150px] rounded-xl border p-2 ${isToday ? "border-[#93C5FD] bg-brand-soft" : "border-border bg-white"}`}
                    >
                      <div className="flex items-baseline justify-between border-b border-border-subtle pb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                          {d.toLocaleDateString(undefined, { weekday: "short" })}
                        </span>
                        <span className={`font-mono text-xs font-bold ${isToday ? "text-[#1D4ED8]" : "text-ink"}`}>
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="mt-1.5">{dayItems.length ? dayItems.map((it) => renderChip(it)) : <p className="mt-3 text-center text-[10px] text-[#CBD5E1]">—</p>}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle bg-[#fafbfc] text-[11px] uppercase tracking-wider text-muted">
                      <th className="p-3 font-semibold">Date</th>
                      <th className="p-3 font-semibold">Platform</th>
                      <th className="p-3 font-semibold">Topic & caption</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Campaign</th>
                      <th className="p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filtered.map((it) => (
                      <tr key={it.id} className="transition hover:bg-[#fafbfc]">
                        <td className="whitespace-nowrap p-3 font-mono text-[#334155]">{it.scheduled_for}</td>
                        <td className="whitespace-nowrap p-3 capitalize text-[#334155]">{it.platform}</td>
                        <td className="max-w-md p-3">
                          <p className="font-medium text-ink">{it.topic}</p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">{it.captions?.[0]}</p>
                        </td>
                        <td className="whitespace-nowrap p-3">
                          <StatusBadge status={it.status} />
                        </td>
                        <td className="max-w-[160px] truncate p-3 text-muted">{it.campaignGoal}</td>
                        <td className="whitespace-nowrap p-3">
                          <button className="mr-2 font-semibold text-[#2563EB] hover:underline" onClick={() => openItem(it)}>
                            Open
                          </button>
                          {it.status === "pending_human" && (
                            <button
                              className="font-semibold text-[#047857] hover:underline"
                              disabled={busy}
                              onClick={() => approve(it)}
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* Item dialog: open / approve / reschedule */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent>
          {selected && (
            <div className="grid gap-4">
              <div className="pr-8">
                <DialogTitle>{selected.topic}</DialogTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="rounded-md border border-border bg-[#fafbfc] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#64748B]">
                    {selected.platform} · {selected.format}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
                    <Clock size={11} /> {selected.scheduled_for}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-[#fafbfc] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Caption</p>
                <p className="mt-1 max-h-40 overflow-auto whitespace-pre-line text-sm text-[#334155]">
                  {selected.captions?.[0] || "—"}
                </p>
              </div>

              <div className="grid gap-3">
                <label className="text-xs font-semibold text-ink">
                  Scheduled date
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#93C5FD]"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-t border-border-subtle pt-4">
                <Link
                  href={`/campaigns/${selected.campaignId}`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  Open campaign <CalendarDays size={13} />
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" disabled={busy || !newDate} onClick={() => reschedule(selected)}>
                    Reschedule
                  </Button>
                  {selected.status === "pending_human" && (
                    <Button size="sm" disabled={busy} onClick={() => approve(selected)}>
                      <CheckCircle2 size={14} /> Approve
                    </Button>
                  )}
                  {selected.status === "approved" && (
                    <Button size="sm" disabled={busy} onClick={() => publishAction(selected, "schedule")}>
                      <Send size={14} /> Schedule
                    </Button>
                  )}
                  {selected.status === "scheduled" && (
                    <Button size="sm" disabled={busy} onClick={() => publishAction(selected, "mark-posted")}>
                      <Send size={14} /> Mark published
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
