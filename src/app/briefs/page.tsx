"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, CalendarDays, Image as ImageIcon, RefreshCw, SearchX, Megaphone, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { fetchAllContentItems, type FlatContentItem } from "@/lib/contentItems";

const PLATFORMS = ["all", "instagram", "facebook", "linkedin", "twitter", "tiktok", "blog", "email"];
const STATUSES = ["all", "pending_human", "approved", "rejected", "scheduled", "published"];

export default function ContentStudio() {
  const [items, setItems] = useState<FlatContentItem[]>([]);
  const [campaignCount, setCampaignCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { campaigns, items: flat } = await fetchAllContentItems(8);
      setCampaignCount(campaigns.length);
      setItems(flat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
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
        (platform === "all" || it.platform.toLowerCase() === platform) &&
        (status === "all" || it.status === status) &&
        (!q || it.topic.toLowerCase().includes(q) || it.captions.join(" ").toLowerCase().includes(q))
    );
  }, [items, platform, status, query]);

  return (
    <div className="grid gap-4">
      <FadeIn>
        <div className="card p-6">
          <PageHeader
            title="Content Studio"
            description="Everything the AI team has drafted across your campaigns — review, filter, and push to approvals."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/calendar" className="btn-secondary text-xs">
                  <CalendarDays size={14} /> Calendar
                </Link>
                <Link href="/assets" className="btn-secondary text-xs">
                  <ImageIcon size={14} /> Assets
                </Link>
                <Link href="/briefs/new" className="btn-primary text-xs">
                  <Plus size={15} /> New brief
                </Link>
              </div>
            }
          />

          {!loading && !error && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
                <p className="text-xl font-bold text-ink">{items.length}</p>
                <p className="text-[11px] text-muted">Draft items</p>
              </div>
              <div className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
                <p className="text-xl font-bold text-ink">
                  {items.filter((i) => i.status === "pending_human").length}
                </p>
                <p className="text-[11px] text-muted">Awaiting review</p>
              </div>
              <div className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
                <p className="text-xl font-bold text-ink">{campaignCount}</p>
                <p className="text-[11px] text-muted">Campaigns</p>
              </div>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.05}>
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics & captions…"
            className="min-w-[200px] flex-1 rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-ink outline-none placeholder:text-[#94A3B8] focus:border-[#93C5FD]"
            aria-label="Search content"
          />
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-lg px-2 py-1 capitalize transition ${platform === p ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-lg px-2 py-1 capitalize transition ${status === s ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <button className="btn-secondary text-xs" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </FadeIn>

      {/* Results */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="skeleton h-24 bg-[#eef0f4]" />
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="font-medium text-[#B91C1C]">Couldn’t load content: {error}</p>
          <button className="btn-primary mt-4" onClick={load}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <Sparkles className="mx-auto text-[#94A3B8]" size={28} />
          <p className="mt-3 font-display text-lg font-bold text-ink">No content yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Give the AI team a brief and it will draft posts, creatives, and a calendar you can approve.
          </p>
          <Link href="/briefs/new" className="btn-primary mt-5 inline-flex">
            <Plus size={15} /> Start your first brief
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <SearchX className="mx-auto text-[#94A3B8]" size={26} />
          <p className="mt-3 text-sm font-medium text-ink">No items match these filters</p>
          <button
            className="btn-secondary mt-3 text-xs"
            onClick={() => {
              setPlatform("all");
              setStatus("all");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <Stagger className="grid gap-3">
          {filtered.map((it) => (
            <StaggerItem key={it.id}>
              <Link href={`/campaigns/${it.campaignId}`} className="card block p-4 transition hover:border-[#d4d9e2]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={it.status} />
                      <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#64748B]">
                        {it.platform} · {it.format}
                      </span>
                      <span className="font-mono text-[11px] text-muted">{it.scheduled_for}</span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-semibold text-ink">{it.topic}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{it.captions[0]}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#475569]">
                    <Megaphone size={12} /> Campaign
                  </span>
                </div>
                <p className="mt-2 truncate border-t border-border-subtle pt-2 text-[11px] text-muted">
                  {it.campaignGoal}
                </p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
