"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Megaphone, ArrowRight, Sparkles, Calendar, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

interface CampaignSummary {
  id: string;
  brandId: string;
  costUsd: number;
  createdAt: string;
  itemCount: number;
  brief: {
    goal?: string;
    month?: string;
  };
}

export default function CampaignsPage() {
  const [camps, setCamps] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCamps(data.campaigns ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalItems = camps.reduce((sum, c) => sum + (c.itemCount || 0), 0);
  const totalCost = camps.reduce((sum, c) => sum + (c.costUsd || 0), 0);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="card p-6 sm:p-8">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <Megaphone size={22} className="text-[#2563EB]" /> Campaigns
              </span>
            }
            description="Every campaign the AI team has produced — open one to review, edit, and approve."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/briefs" className="btn-secondary text-xs">
                  <Plus size={14} /> Content Studio
                </Link>
                <Link href="/calendar" className="btn-secondary text-xs">
                  <Calendar size={14} /> Calendar
                </Link>
                <Link href="/dashboard" className="btn-primary text-xs">
                  <Sparkles size={15} /> Instruct AI team
                </Link>
              </div>
            }
          />
        </div>
      </FadeIn>

      {!loading && !error && (
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Campaigns</span>
              <p className="mt-1 text-2xl font-bold text-ink">{camps.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Deliverables</span>
              <p className="mt-1 text-2xl font-bold text-ink">{totalItems}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">AI cost</span>
              <p className="mt-1 text-2xl font-bold text-[#047857]">${totalCost.toFixed(4)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Approval gate</span>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-[#047857]">
                <ShieldCheck size={15} /> Enforced server-side
              </p>
            </div>
          </div>
        </FadeIn>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display text-base font-bold text-ink">Campaign history</h3>
          {!loading && !error && <span className="text-xs text-muted">{camps.length} campaigns</span>}
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="skeleton h-24 bg-[#eef0f4]" />
            ))}
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <p className="font-medium text-[#B91C1C]">Couldn’t load campaigns: {error}</p>
            <button className="btn-primary mt-4" onClick={load}>
              <RefreshCw size={15} /> Retry
            </button>
          </div>
        ) : camps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d4d9e2] bg-surface p-12 text-center">
            <Megaphone size={32} className="mx-auto text-[#94A3B8]" />
            <h4 className="mt-3 font-display text-base font-bold text-ink">No campaigns yet</h4>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              Submit a brief and the AI team will produce your first campaign of posts, creatives, and a calendar.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/briefs/new" className="btn-primary inline-flex">
                New brief <ArrowRight size={14} />
              </Link>
              <Link href="/dashboard" className="btn-secondary inline-flex">
                <Sparkles size={14} /> Start in AI chat
              </Link>
            </div>
          </div>
        ) : (
        <>
          <Stagger className="space-y-3">
            {camps.slice(0, shownCount).map((c) => (
              <StaggerItem key={c.id}>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="group block rounded-2xl border border-border bg-surface p-5 transition hover:border-[#bfdbfe] hover:shadow-[0_8px_24px_-16px_rgba(37,99,235,0.35)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#2563EB]">{c.id}</span>
                        {c.brief?.month && (
                          <span className="rounded border border-border bg-[#fafbfc] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                            {c.brief.month}
                          </span>
                        )}
                      </div>
                      <h4 className="truncate text-sm font-bold text-ink">{c.brief?.goal || "Strategic multi-channel marketing campaign"}</h4>
                      <div className="flex flex-wrap gap-3 text-xs text-muted">
                        <span>{c.itemCount} posts & creatives</span>
                        <span>·</span>
                        <span>AI cost: ${Number(c.costUsd).toFixed(4)}</span>
                        <span>·</span>
                        <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tint-info rounded-xl px-3 py-1.5 text-xs font-semibold transition group-hover:bg-[#dbeafe]">
                        Review & approve
                      </span>
                      <ArrowRight size={18} className="text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#2563EB]" />
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
          {camps.length > shownCount && (
            <div className="mt-4 flex justify-center">
              <button className="btn-secondary" onClick={() => setShownCount((c) => c + 20)}>
                Load more ({camps.length - shownCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
