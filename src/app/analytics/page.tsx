"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Upload, FileDown, MessageSquare, RefreshCw, Download, FileJson, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/badge";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { toast } from "@/components/ui/toast";

type Totals = {
  rows: number;
  byPlatform: Record<string, { impressions: number; reach: number; clicks: number; leads: number; spend: number; revenue: number }>;
};
type Report = {
  summary: string;
  what_worked: string[];
  what_didnt: string[];
  budget_reallocation: string[];
  ab_test_ideas: string[];
  next_actions: string[];
};

const REPORT_SECTIONS: Array<[string, keyof Report]> = [
  ["What worked", "what_worked"],
  ["What didn’t", "what_didnt"],
  ["Budget reallocation (recommend only)", "budget_reallocation"],
  ["A/B test ideas", "ab_test_ideas"],
  ["Next actions", "next_actions"],
];

const AXIS = { stroke: "#94A3B8", fontSize: 12 };
const GRID = { stroke: "#eef0f4", strokeDasharray: "3 3" };
const TOOLTIP = { background: "#ffffff", border: "1px solid #e2e6ed", borderRadius: 12, fontSize: 12, color: "#101828" };

export default function AnalyticsPage() {
  const [totals, setTotals] = useState<Totals>({ rows: 0, byPlatform: {} });
  const [report, setReport] = useState<Report | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [drafts, setDrafts] = useState<Array<{ comment_id: string; reply: string; needs_human: boolean; escalation_reason?: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [m, rep] = await Promise.all([
        fetch("/api/metrics").then((r) => r.json()),
        fetch("/api/reports/weekly").then((r) => r.json()),
      ]);
      setTotals(m.totals ?? { rows: 0, byPlatform: {} });
      if (rep.report) setReport(rep.report);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadCsv(file: File) {
    setBusy(true);
    setNote("");
    try {
      const text = await file.text();
      const res = await fetch("/api/metrics/import", { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Import failed");
      setNote(`Imported ${data.added} rows${data.skipped ? `, skipped ${data.skipped}` : ""}. Sample data only until you upload real exports.`);
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function genReport() {
    setBusy(true);
    try {
      const res = await fetch("/api/reports/weekly", { method: "POST" });
      const data = await res.json();
      if (data.report) setReport(data.report);
      setNote("Weekly report generated from uploaded numbers only.");
    } catch {
      toast("Report generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function draftReplies() {
    const list = comments
      .split("\n")
      .map((t, i) => ({ id: `c-${i + 1}`, text: t.trim(), author: "follower" }))
      .filter((c) => c.text);
    if (!list.length) return;
    try {
      const res = await fetch("/api/social/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments: list }),
      });
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } catch {
      toast("Drafting replies failed");
    }
  }

  /** Genuine client-side export of the real persisted report object only. */
  const downloadReport = (format: "json" | "csv") => {
    if (!report) return;
    let blob: Blob;
    if (format === "json") {
      blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    } else {
      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const rows = [
        ["section", "line"],
        ["summary", escape(report.summary)],
        ...REPORT_SECTIONS.flatMap(([label, key]) => (report[key] as string[]).map((line) => [escape(label), escape(line)])),
      ];
      blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-report.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bars = Object.entries(totals.byPlatform).map(([platform, v]) => ({ platform, leads: v.leads, spend: v.spend }));

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-44" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-[#B91C1C]">Couldn’t load analytics: {loadError}</p>
        <button className="btn-primary mt-4" onClick={load}>
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <FadeIn>
        <div className="card p-6 sm:p-8">
          <PageHeader
            title="Analytics — real numbers only"
            description={`${totals.rows} metric rows. Upload a Meta/Google Ads CSV export — the Performance agent cites only these numbers, never estimates.`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-secondary cursor-pointer text-xs">
                  <Upload size={14} aria-hidden /> Upload CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCsv(f);
                    }}
                  />
                </label>
                <Button size="sm" onClick={genReport} disabled={busy}>
                  <FileDown size={14} aria-hidden /> Generate weekly report
                </Button>
              </div>
            }
          />
          {note ? <p className="mt-2 text-sm text-[#047857]">{note}</p> : null}
          <p className="mt-3 text-xs text-muted">
            Columns: platform,date,impressions,reach,clicks,leads,spend,revenue
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        {bars.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-6">
              <p className="eyebrow">Leads by channel</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} role="img" aria-label={`Bar chart of leads by channel: ${bars.map((b) => `${b.platform} ${b.leads}`).join(", ")}`}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="platform" {...AXIS} />
                    <YAxis {...AXIS} />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Bar dataKey="leads" fill="#2563EB" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-6">
              <p className="eyebrow">Spend by channel</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bars} role="img" aria-label={`Area chart of spend by channel: ${bars.map((b) => `${b.platform} $${b.spend}`).join(", ")}`}>
                    <CartesianGrid {...GRID} />
                    <XAxis dataKey="platform" {...AXIS} />
                    <YAxis {...AXIS} />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Area type="monotone" dataKey="spend" stroke="#3B82F6" fill="#2563EB" fillOpacity={0.35} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <BarChart3 className="mx-auto text-[#94A3B8]" size={28} />
            <p className="mt-3 text-sm font-semibold text-ink">No metrics yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted">
              Upload a CSV to see charts. Nothing here is estimated or invented.
            </p>
          </div>
        )}
      </FadeIn>

      {report ? (
        <FadeIn delay={0.08}>
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
              <div>
                <p className="eyebrow">Performance agent · Weekly report</p>
                <p className="mt-1 text-xs text-muted">Generated from your uploaded numbers only</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => downloadReport("json")}>
                  <FileJson size={14} /> .json
                </Button>
                <Button variant="secondary" size="sm" onClick={() => downloadReport("csv")}>
                  <Download size={14} /> .csv
                </Button>
              </div>
            </div>

            <p className="mt-4 font-display text-base font-semibold leading-relaxed text-ink">{report.summary}</p>

            <Stagger className="mt-5 grid gap-4 sm:grid-cols-2" stagger={0.04}>
              {REPORT_SECTIONS.map(([label, key]) => {
                const lines = report[key] as string[];
                if (!lines?.length) return null;
                return (
                  <StaggerItem key={label as string}>
                    <div className="rounded-xl border border-border bg-[#fafbfc] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-[#334155]">
                        {lines.map((x, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-bold text-[#2563EB]">·</span>
                            <span>{x}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.1}>
        <div className="card p-6 sm:p-8">
          <p className="eyebrow">Social manager · Draft replies</p>
          <p className="mt-2 text-sm text-muted">
            Complaints, legal and pricing comments are flagged for a human — never auto-sent.
          </p>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            aria-label="Comments, one per line"
            placeholder={"One comment per line, e.g.\nWhat are your prices?\nYou scammed me, refund now!"}
            className="mt-3 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-[#94A3B8] focus:border-[#93C5FD]"
          />
          <button onClick={draftReplies} className="btn-secondary mt-3" disabled={!comments.trim()}>
            <MessageSquare size={16} aria-hidden /> Draft replies
          </button>
          <div className="mt-3 grid gap-2">
            {drafts.map((d) => (
              <div key={d.comment_id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
                <p className="text-[#334155]">{d.reply}</p>
                {d.needs_human ? (
                  <p className="tint-warning mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    Needs human: {d.escalation_reason}
                  </p>
                ) : (
                  <p className="tint-success mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    Safe to send after your review
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
