import React, { useMemo, useState } from "react";
import type { DeliverableCalendar } from "@/types/chat";
import { Calendar as CalendarIcon, Download, Check, Copy, LayoutGrid, List, ExternalLink } from "lucide-react";
import Link from "next/link";

export function CalendarCard({ data }: { data: DeliverableCalendar }) {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () => data.items.filter((item) => platformFilter === "all" || item.platform.toLowerCase() === platformFilter),
    [data.items, platformFilter]
  );

  /** Group filtered items by day-of-month for the mini grid. */
  const byDay = useMemo(() => {
    const map = new Map<number, typeof filtered>();
    for (const it of filtered) {
      const day = Number(it.date.slice(8, 10));
      if (!day) continue;
      map.set(day, [...(map.get(day) ?? []), it]);
    }
    return map;
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Date", "Platform", "Format", "Topic", "Goal", "Hook", "Pillar"];
    const rows = data.items.map((it) =>
      [it.date, it.platform, it.format, it.topic, it.goal, it.hook, it.pillar]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `content_calendar_${data.month.toLowerCase().replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyHook = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const platforms = ["all", "instagram", "facebook", "linkedin", "blog", "email"].filter(
    (p) => p === "all" || data.items.some((i) => i.platform.toLowerCase() === p)
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669]">
            <CalendarIcon size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display truncate text-sm font-bold text-ink">30-day content calendar</h3>
              <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-semibold text-[#047857]">{data.items.length} slots</span>
            </div>
            <p className="text-xs text-muted">{data.month}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
            <button
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className={`rounded-lg p-1.5 transition ${view === "grid" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              title="Month grid"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`rounded-lg p-1.5 transition ${view === "list" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              title="List"
            >
              <List size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
            {platforms.map((plat) => (
              <button
                key={plat}
                onClick={() => setPlatformFilter(plat)}
                className={`rounded-lg px-2 py-1 capitalize transition ${platformFilter === plat ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {plat}
              </button>
            ))}
          </div>

          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-surface-hover">
            <Download size={13} /> CSV
          </button>
          <Link href="/calendar" className="flex items-center gap-1.5 rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#27272A]">
            Open calendar <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      <div className="max-h-[28rem] overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No items for this filter.</p>
        ) : view === "grid" ? (
          <>
            {/* Month mini grid (fills by day-of-month) */}
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[500px] sm:min-w-0 grid-cols-7 gap-1.5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                  const items = byDay.get(day) ?? [];
                  return (
                    <div
                      key={day}
                      className={`min-h-[64px] rounded-lg border p-1.5 text-[10px] ${items.length ? "border-black/[0.08] bg-[#F5F2EF]" : "border-border-subtle bg-[#fafbfc]"}`}
                      title={items.map((i) => i.topic).join("\n") || undefined}
                    >
                      <span className={`font-mono font-bold ${items.length ? "text-[#18181B]" : "text-[#CBD5E1]"}`}>{day}</span>
                      {items.slice(0, 2).map((it, idx) => (
                        <p key={idx} className="mt-0.5 truncate rounded bg-white px-1 font-medium text-[#475569] border border-black/[0.04]">
                          {it.topic}
                        </p>
                      ))}
                      {items.length > 2 && <p className="mt-0.5 px-1 font-bold text-[#8B5CF6]">+{items.length - 2}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted">Switch to list view for hooks & copy actions.</p>
          </>
        ) : (
          <ol className="space-y-2.5">
            {filtered.map((item, idx) => (
              <li key={idx} className="flex flex-col gap-3 rounded-xl border border-border bg-[#fafbfc] p-3.5 transition hover:border-[#d4d9e2] md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-ink px-2 py-1 font-mono text-[11px] font-bold text-white">{item.date}</span>
                  <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#64748B]">
                    {item.platform} · {item.format}
                  </span>
                  <span className="rounded-md bg-[#eef2ff] px-2 py-0.5 text-[10px] font-medium text-[#4F46E5]">{item.pillar}</span>
                </div>
                <div className="min-w-0 flex-1 md:px-3">
                  <p className="text-sm font-medium text-ink">{item.topic}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    <strong className="font-semibold text-[#334155]">Hook:</strong> “{item.hook}”
                  </p>
                </div>
                <button
                  onClick={() => copyHook(item.hook, idx)}
                  className="flex items-center gap-1 self-start rounded-lg border border-border bg-white px-2.5 py-1 text-xs text-[#475569] transition hover:bg-surface-hover md:self-auto"
                >
                  {copiedIndex === idx ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                  {copiedIndex === idx ? "Copied" : "Copy hook"}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
