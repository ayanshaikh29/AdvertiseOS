"use client";

import { useCallback, useEffect, useState } from "react";
import { Plug, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/badge";
import { FadeIn } from "@/components/ui/motion";

type Account = {
  provider: string;
  label: string;
  capabilities: Record<string, boolean>;
  status: string;
  isSample: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastTestMessage: string | null;
  lastSyncAt: string | null;
};

type HealthPayload = {
  accounts: Account[];
  completeness: { score: number; missing: Array<{ provider: string; unlocks: string }> };
  fakeConnectorsEnabled: boolean;
  note: string;
};

const STATUS_STYLE: Record<string, string> = {
  connected: "bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]",
  sample: "bg-brand-soft text-[#1D4ED8] border-[#bfdbfe]",
  needs_attention: "bg-[#fffbeb] text-[#B45309] border-[#fde68a]",
  unconfigured: "bg-surface-2 text-muted",
  disconnected: "bg-surface-2 text-muted",
};

function freshness(lastSyncAt: string | null): string {
  if (!lastSyncAt) return "Never synced";
  const mins = Math.round((Date.now() - new Date(lastSyncAt).getTime()) / 60000);
  if (mins < 60) return `Synced ${mins}m ago`;
  if (mins < 60 * 24) return `Synced ${Math.round(mins / 60)}h ago`;
  return `Synced ${Math.round(mins / (60 * 24))}d ago`;
}

export default function IntegrationsPage() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as HealthPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function test(provider: string) {
    setBusy(provider);
    setNote("");
    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(typeof out.error === "string" ? out.error : "Test failed");
      setNote(`${provider}: ${out.ok ? "OK" : "FAILED"} — ${out.message}${out.sample ? " (Sample data)" : ""}`);
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(null);
    }
  }

  const score = data?.completeness.score ?? 0;

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-44" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-[#B91C1C]">Couldn’t load integrations: {error}</p>
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
            title="Integrations & data health"
            description={`${data?.note ?? ""} Real metrics only — every number shows when it was last synced.`}
          />
          {note ? <p className="mt-2 text-sm text-[#1D4ED8]">{note}</p> : null}
          <div className="mt-5 flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef0f4" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${score} ${100 - score}`}
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-sm font-bold text-ink">{score}%</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Business Brain completeness</p>
              {data?.completeness.missing.length ? (
                <p className="mt-1 text-xs text-muted">
                  Connect {data.completeness.missing[0]?.provider} to unlock {data.completeness.missing[0]?.unlocks}.
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#047857]">All sources connected.</p>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-3">
        {(data?.accounts ?? []).map((a, idx) => (
          <FadeIn key={a.provider} delay={0.03 * idx}>
            <div className="card flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display font-semibold text-ink">{a.label}</p>
                  <span className={`chip ${STATUS_STYLE[a.status] ?? STATUS_STYLE.unconfigured}`}>
                    {a.status.replace("_", " ")}
                  </span>
                  {a.isSample ? <span className="chip">Sample data</span> : null}
                </div>
                <p className="mt-1 text-xs text-muted">{a.lastTestMessage ?? "Not tested yet."}</p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#94A3B8]">
                  <span>{freshness(a.lastSyncAt)}</span>
                  {a.lastTestAt ? <span>Last test {new Date(a.lastTestAt).toLocaleString()}</span> : null}
                  <span className="flex flex-wrap gap-1.5">
                    {Object.entries(a.capabilities)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <span key={k} className="rounded-md bg-[#f3f4f6] px-1.5 py-0.5 text-[#475569]">
                          {k.replace("pull", "").replace(/^./, (c) => c.toLowerCase())}
                        </span>
                      ))}
                  </span>
                </p>
              </div>
              <button
                onClick={() => test(a.provider)}
                disabled={busy === a.provider}
                className="btn-secondary inline-flex min-h-[44px] items-center gap-2 disabled:opacity-60"
              >
                {busy === a.provider ? (
                  <RefreshCw size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Plug size={16} aria-hidden />
                )}
                Test connection
              </button>
            </div>
          </FadeIn>
        ))}
        {!data?.accounts?.length ? <p className="card p-5 text-sm text-muted">No connectors configured.</p> : null}
      </div>

      <FadeIn delay={0.1}>
        <div className="card flex flex-wrap items-start gap-3 p-5 text-xs text-muted">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#059669]" aria-hidden />
          <p>
            Tokens are stored encrypted (AES-256-GCM) and never appear in client code, logs, or git. Sample connectors are
            clearly labeled and never mixed with real data.
          </p>
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[#F59E0B]" aria-hidden />
          <p>
            WhatsApp Cloud API covers the <strong className="text-ink">business number</strong> only — not personal chats.
            Meta and Google connectors go live behind feature flags after real credentials are added (see
            docs/INTEGRATIONS.md).
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
