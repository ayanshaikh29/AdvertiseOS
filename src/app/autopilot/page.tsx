"use client";

import { useCallback, useEffect, useState } from "react";
import { Radar, RefreshCw, Rocket, Send, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Trend = { id: string; title: string; url: string; source: string; publishedAt: string; fetchedAt: string };

export default function AutopilotPage() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [trendNote, setTrendNote] = useState("");
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [brandId, setBrandId] = useState("");
  const [busy, setBusy] = useState<"trends" | "run" | "tick" | null>(null);
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null);
  const [tickResult, setTickResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((d) => {
      const list = d.brands ?? [];
      setBrands(list);
      const saved = localStorage.getItem("advos-brand");
      setBrandId(saved || list[0]?.id || "");
    }).catch(() => {});
    fetch("/api/trends").then((r) => r.json()).then((d) => setTrends(d.trends ?? [])).catch(() => {});
  }, []);

  const refreshTrends = useCallback(async () => {
    setBusy("trends");
    setError("");
    try {
      const res = await fetch("/api/trends/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(typeof out.error === "string" ? out.error : "Refresh failed");
      setTrends(out.trends ?? []);
      setTrendNote(out.note ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(null);
    }
  }, [brandId]);

  async function runAutopilot() {
    setBusy("run");
    setError("");
    setRunResult(null);
    try {
      const res = await fetch("/api/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, days: 7 }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(typeof out.error === "string" ? out.error : "Run failed");
      setRunResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function tick() {
    setBusy("tick");
    setError("");
    setTickResult(null);
    try {
      const res = await fetch("/api/autopilot/tick", { method: "POST" });
      const out = await res.json();
      if (!res.ok) throw new Error(typeof out.error === "string" ? out.error : "Tick failed");
      setTickResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tick failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Autopilot Â· Trend Radar</p>
        <h1 className="font-display mt-2 text-3xl font-bold">
          Plan from <em className="text-[#2563EB]">real signals</em>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Trend Radar pulls real headlines (Google News RSS, source-linked). Autopilot drafts a week of content from your catalog + trends â€” every item lands in Approvals. Nothing publishes without a human.
        </p>
        {error ? <p className="mt-2 flex items-center gap-2 text-sm text-[#EF4444]"><TriangleAlert size={14} /> {error}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select aria-label="Brand" value={brandId} onChange={(e) => setBrandId(e.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-sm">
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            {brands.length === 0 ? <option value="">No brand yet</option> : null}
          </select>
          <button onClick={refreshTrends} disabled={!brandId || busy !== null} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw size={16} className={busy === "trends" ? "animate-spin" : ""} /> Refresh trends
          </button>
          <button onClick={runAutopilot} disabled={!brandId || busy !== null} className="btn-primary inline-flex items-center gap-2">
            <Rocket size={16} /> Run autopilot week
          </button>
          <button onClick={tick} disabled={busy !== null} className="btn-secondary inline-flex items-center gap-2">
            <Send size={16} /> Run publish tick
          </button>
        </div>
        {trendNote ? <p className="mt-2 text-xs text-[#6B7280]">{trendNote}</p> : null}
        {runResult ? (
          <div className="mt-4 rounded-2xl border border-border bg-white p-4 text-sm">
            <p className="font-medium">Campaign <code className="text-[#2563EB]">{String(runResult.campaignId)}</code> â€” {String(runResult.items)} items, ${Number(runResult.costUsd ?? 0).toFixed(3)} cost</p>
            <p className="mt-1 text-muted">{String(runResult.note ?? "")}</p>
            <a href="/approvals" className="mt-2 inline-block text-xs text-[#2563EB] hover:underline">Open approval inbox â†’</a>
          </div>
        ) : null}
        {tickResult ? (
          <div className="mt-4 rounded-2xl border border-border bg-white p-4 text-sm">
            <p>Tick: {String(tickResult.due)} due, {String(tickResult.published)} published.</p>
            <p className="mt-1 text-muted">{String(tickResult.note ?? "")}</p>
          </div>
        ) : null}
      </div>

      <div className="card p-6">
        <p className="eyebrow flex items-center gap-2"><Radar size={14} /> Trend Radar Â· latest headlines</p>
        {trends.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No trends stored yet â€” hit â€œRefresh trendsâ€ (needs network; real headlines, source-linked).</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {trends.slice(0, 12).map((t) => (
              <li key={`${t.id}-${t.url}`} className="flex items-start gap-3">
                <a href={t.url} target="_blank" rel="noreferrer" className={cn("min-w-0 flex-1 text-sm hover:text-[#2563EB]")}>{t.title}</a>
                <span className="shrink-0 text-xs text-[#6B7280]">{t.source}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
