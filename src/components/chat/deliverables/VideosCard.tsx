import React, { useState } from "react";
import type { DeliverableVideos } from "@/types/chat";
import { Clapperboard, Download, Clock, Smartphone, Music, ListChecks } from "lucide-react";

export function VideosCard({ data, campaignId }: { data: DeliverableVideos; campaignId?: string }) {
  const [activePlan, setActivePlan] = useState(0);
  if (!data.plans || data.plans.length === 0) return null;
  const plan = data.plans[Math.min(activePlan, data.plans.length - 1)] ?? data.plans[0];
  if (!plan) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecfeff] text-[#0891B2]">
            <Clapperboard size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display truncate text-sm font-bold text-ink">Reel scripts & storyboards</h3>
              <span className="tint-warning rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                Script / storyboard — not a rendered video
              </span>
            </div>
            <p className="text-xs text-muted">{data.plans.length} plan(s) · scene-by-scene, shootable</p>
          </div>
        </div>
        {campaignId && (
          <a
            href={`/api/video/export?campaignId=${campaignId}`}
            download
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-surface-hover"
          >
            <Download size={13} /> Download .md
          </a>
        )}
      </div>

      {/* Plan switcher */}
      {data.plans.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border-subtle px-4 py-2">
          {data.plans.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePlan(i)}
              className={`max-w-[220px] truncate rounded-lg px-3 py-1.5 text-xs font-semibold transition ${i === activePlan ? "bg-brand-soft text-[#1D4ED8]" : "text-muted hover:text-ink"}`}
            >
              {p.topic}
            </button>
          ))}
        </div>
      )}

      <div className="p-5">
        {/* Meta strip */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-border-subtle bg-[#fafbfc] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
              <Clock size={10} /> Duration
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{plan.duration}s</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-[#fafbfc] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
              <Smartphone size={10} /> Aspect
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{plan.aspect}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-[#fafbfc] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
              <Music size={10} /> Music mood
            </p>
            <p className="mt-1 truncate text-sm font-bold text-ink">{plan.musicMood}</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-[#fafbfc] p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">
              <ListChecks size={10} /> Scenes
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{plan.scenes.length}</p>
          </div>
        </div>

        {/* Scene timeline */}
        <ol className="mt-4 space-y-2.5">
          {plan.scenes.map((s) => (
            <li key={s.n} className="relative flex gap-3 rounded-xl border border-border bg-[#fafbfc] p-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-white">{s.n}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{s.shotType}</span>
                  <span className="font-mono text-[10px] text-muted">{s.duration_s}s</span>
                  {s.onScreenText && <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">“{s.onScreenText}”</span>}
                </div>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-ink">{s.visual}</p>
                <p className="mt-1 text-[11px] italic leading-relaxed text-[#475569]">VO: {s.voiceover}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
