import React from "react";
import Image from "next/image";
import type { DeliverableOverview } from "@/types/chat";
import { MapPin, DollarSign, Calendar, Film, Image as ImageIcon, CheckCircle, Sparkles, AlertCircle, Users, Target } from "lucide-react";

export function OverviewCard({ data }: { data: DeliverableOverview }) {
  const d = data.deliverablesSummary;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      <div className="border-b border-border-subtle bg-gradient-to-r from-[#FFF7ED]/70 via-[#FDF2F8]/40 to-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-gradient-to-tr from-[#FFF7ED] via-[#FDF2F8] to-[#F5F3FF] p-1 shadow-2xs">
              <Image
                src="/logo-emblem-transparent.png"
                alt="Emblem"
                width={22}
                height={22}
                className="object-contain"
              />
            </span>
            <div>
              <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">
                {data.projectName}
              </h3>
              <p className="mt-0.5 text-sm text-muted">Your campaign plan is being built</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#475569]">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 border border-border">
                  <MapPin size={12} className="text-[#F97316]" /> {data.location}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 border border-border">
                  <Target size={12} className="text-[#7C3AED]" /> {data.priceRange}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 border border-border">
                  <DollarSign size={12} className="text-emerald-600" /> {data.budget}
                </span>
              </div>
            </div>
          </div>

          {data.isDemoMode ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              <AlertCircle size={13} />
              Demo data — verify before spend
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle size={13} />
              Verified inputs
            </span>
          )}
        </div>

        {data.isDemoMode && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            <strong>Demo mode:</strong> Using fictional sample facts. Confirm real prices and claims before running ads.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-y border-b border-border-subtle bg-[#fafbfc] sm:grid-cols-4 sm:divide-y-0">
        <div className="p-4 text-center">
          <ImageIcon size={18} className="mx-auto text-[#8B5CF6]" />
          <div className="mt-1.5 font-display text-3xl font-black text-ink">{d.postsCount}</div>
          <div className="text-xs font-semibold text-muted">Posts</div>
        </div>
        <div className="p-4 text-center">
          <Film size={18} className="mx-auto text-[#7C3AED]" />
          <div className="mt-1.5 font-display text-3xl font-black text-ink">{d.reelsCount}</div>
          <div className="text-xs font-semibold text-muted">Reel scripts</div>
        </div>
        <div className="p-4 text-center">
          <Calendar size={18} className="mx-auto text-emerald-600" />
          <div className="mt-1.5 font-display text-3xl font-black text-ink">{d.calendarDays}</div>
          <div className="text-xs font-semibold text-muted">Day calendar</div>
        </div>
        <div className="p-4 text-center">
          <Users size={18} className="mx-auto text-amber-600" />
          <div className="mt-1.5 font-display text-xl font-black text-ink truncate">{d.adBudget}</div>
          <div className="text-xs font-semibold text-muted">Ad budget</div>
        </div>
      </div>

      <div className="p-5">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          <Sparkles size={13} className="text-[#8B5CF6]" />
          Everything included in this package
        </h4>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.additionalDeliverables.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5 rounded-xl border border-border bg-[#fafbfc] px-3.5 py-2.5 text-sm text-[#1e293b]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5F2EF] text-[11px] font-bold text-[#18181B]">
                ✓
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {data.objectives.length > 0 && (
          <div className="mt-4 rounded-xl border border-border bg-[#F5F2EF] p-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#18181B]">Campaign goals</p>
            <ul className="mt-1.5 space-y-1 text-sm text-[#1e293b]">
              {data.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#18181B]" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
