import React from "react";
import type { DeliverableSummary } from "@/types/chat";
import { CheckCircle2, ArrowRight, Award, CalendarDays, ShieldCheck, Megaphone, PartyPopper } from "lucide-react";
import Link from "next/link";

export function SummaryCard({ data, campaignId }: { data: DeliverableSummary; campaignId?: string }) {
  const passed = data.verificationBadge === "AI Verified";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_3px_rgba(16,24,40,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-gradient-to-r from-emerald-50/70 via-white to-white px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"
            }`}
          >
            {passed ? <PartyPopper size={22} /> : <Award size={22} />}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold tracking-tight text-ink">{data.headline}</h3>
            <p className="text-xs text-muted">
              {passed
                ? "Your campaign package is ready — review and approve when you're happy."
                : "A few quality checks failed — we'll fix only what's broken."}
            </p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
            passed
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <Award size={14} /> Quality {data.qualityScore}/100
        </span>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-[#fafbfc] p-4 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">{data.totalPosts}</p>
            <p className="mt-0.5 text-xs font-medium text-muted">Posts ready</p>
          </div>
          <div className="rounded-xl border border-border bg-[#fafbfc] p-4 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">{data.totalCreatives}</p>
            <p className="mt-0.5 text-xs font-medium text-muted">Design briefs</p>
          </div>
          <div className="rounded-xl border border-border bg-[#fafbfc] p-4 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">{data.totalReels}</p>
            <p className="mt-0.5 text-xs font-medium text-muted">Reel scripts</p>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted">What you got</h4>
          <ul className="mt-2 space-y-2 text-sm text-[#334155]">
            {data.bulletPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted">What to do next</h4>
          <ol className="mt-2 space-y-2 text-sm text-[#334155]">
            {data.recommendedNextSteps.map((pt, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span>{pt}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-[#fafbfc] px-5 py-4">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} className="text-emerald-600" />
          Nothing goes live until you approve it.
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-semibold text-[#334155] transition hover:bg-surface-hover"
          >
            <CalendarDays size={15} /> Calendar
          </Link>
          {campaignId && (
            <Link
              href={`/campaigns/${campaignId}`}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-sm font-semibold text-[#334155] transition hover:bg-surface-hover"
            >
              <Megaphone size={15} /> Open campaign
            </Link>
          )}
          <Link
            href="/approvals"
            className="flex items-center gap-1.5 rounded-xl bg-[#18181B] px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-[#27272A]"
          >
            Review & approve <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
