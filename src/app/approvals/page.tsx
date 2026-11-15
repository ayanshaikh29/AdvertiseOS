"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, AlertCircle, ImageIcon, Video, Inbox, Sparkles } from "lucide-react";
import { Badge, StatusBadge, Skeleton } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { toast } from "@/components/ui/toast";
import type { Item } from "@/lib/db/repo";

async function fetchItems(): Promise<Item[]> {
  const res = await fetch("/api/approvals").then((r) => r.json());
  return res.items ?? [];
}

function ValidationIssues({ issues }: { issues?: Array<{ severity: string; message: string }> }) {
  if (!issues?.length)
    return (
      <span className="tint-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
        <CheckCircle2 size={12} /> Clean
      </span>
    );
  const high = issues.filter((i) => i.severity === "high" || i.severity === "critical").length;
  return (
    <span className="tint-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
      <AlertCircle size={12} /> {high} issue{high !== 1 ? "s" : ""}
    </span>
  );
}

const FILTERS = ["pending_human", "approved", "rejected", "needs_rewrite", "all"] as const;

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending_human");
  const { data: items = [], isLoading, isError, refetch } = useQuery({ queryKey: ["inbox"], queryFn: fetchItems });

  const mut = useMutation({
    mutationFn: async ({ itemId, action, reason }: { itemId: string; action: "approve" | "reject"; reason: string }) => {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Action failed");
      return data as { learned?: string };
    },
    onMutate: async ({ itemId, action }) => {
      await qc.cancelQueries({ queryKey: ["inbox"] });
      const prev = qc.getQueryData<Item[]>(["inbox"]);
      qc.setQueryData<Item[]>(["inbox"], (old) =>
        (old ?? []).map((i) => (i.id === itemId ? { ...i, status: action === "approve" ? "approved" : "rejected" } : i))
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(["inbox"], ctx?.prev);
      toast(e instanceof Error ? e.message : "Action failed — rejection needs a reason.");
    },
    onSuccess: (data) => toast(data.learned ?? "Done"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  const visible = useMemo(
    () => {
      if (filter === "all") {
        return items.filter((i) => i.status !== "needs_rewrite");
      }
      return items.filter((i) => i.status === filter);
    },
    [items, filter]
  );

  const pendingCount = items.filter((i) => i.status === "pending_human").length;
  const rewriteCount = items.filter((i) => i.status === "needs_rewrite").length;

  const PAGE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => setVisibleCount(PAGE), [filter]);
  const shown = visible.slice(0, visibleCount);

  return (
    <div className="grid gap-4">
      <FadeIn>
        <div className="card p-6">
          <PageHeader
            title="Approval inbox"
            description="Approve, edit, or reject with a reason — rejections train brand memory. Nothing publishes without you."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={pendingCount ? "tint-warning" : "tint-success"}>
                  {pendingCount} awaiting review
                </Badge>
                <Link href="/calendar" className="btn-secondary text-xs">
                  Open calendar
                </Link>
              </div>
            }
          />

          <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-lg px-3 py-1.5 capitalize transition ${filter === f ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {f === "all"
                  ? "All"
                  : f === "needs_rewrite"
                    ? `Needs Rewrite (${rewriteCount})`
                    : f === "pending_human"
                      ? `Pending Review (${pendingCount})`
                      : f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-48" />
          ))}
        </div>
      ) : isError ? (
        <div className="card p-6 text-sm">
          <p className="font-medium text-[#B91C1C]">Couldn’t load the inbox.</p>
          <Button variant="secondary" onClick={() => refetch()} className="mt-3">
            Retry
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center">
          <Inbox className="mx-auto text-[#94A3B8]" size={30} />
          <p className="mt-3 font-display text-base font-bold text-ink">
            {items.length === 0 ? "Inbox empty" : "Nothing in this filter"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            {items.length === 0
              ? "Run a brief in the AI Workspace — drafts land here for your review."
              : "Switch filters to see other items."}
          </p>
          {items.length === 0 && (
            <Link href="/briefs/new" className="btn-primary mt-4 inline-flex">
              <Sparkles size={14} /> Start a brief
            </Link>
          )}
        </div>
      ) : (
        <>
        <Stagger className="grid gap-4">
          {shown.map((i) => (
            <StaggerItem key={i.id}>
              <article className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">
                      {i.scheduled_for} · {i.platform} · {i.format}
                    </p>
                    <p className="mt-2 font-semibold text-ink">{i.topic}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {i.provenance === "template" || i.fallback ? (
                      <span className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                        Template sample
                      </span>
                    ) : i.model ? (
                      <span className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#475569]">
                        {i.provider || "Gemini"} {i.model} · {((i.latencyMs || 0) / 1000).toFixed(1)}s · ${((i.costUsd || 0)).toFixed(4)}
                      </span>
                    ) : null}
                    {i.reviewedBy && (
                      <span className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                        Reviewed by {i.reviewedBy} (Score: {i.manager_score ?? i.ceo_score}/100)
                      </span>
                    )}
                    <StatusBadge status={i.status} />
                    <ValidationIssues issues={i.validation_issues} />
                  </div>
                </div>

                {i.status === "needs_rewrite" && (
                  <div className="mt-3 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-xs text-[#c2410c]">
                    <strong>Needs Rewrite:</strong> {i.rewrite_reason || "Score fell below threshold after revision cycles. Regenerate copy or edit before approval."}
                  </div>
                )}

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted">Primary caption</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-[#334155]">{i.captions[0]}</p>
                    {i.captions.length > 1 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted">
                          Show all {i.captions.length} variants
                        </summary>
                        <div className="mt-2 space-y-1 text-xs text-muted">
                          {i.captions.map((c, idx) => (
                            <div key={idx}>
                              Var {idx + 1}: {c}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted">CTA</p>
                    <p className="mt-1 text-sm font-medium text-[#047857]">{i.cta || "—"}</p>
                    <p className="mt-2 text-xs text-muted">Hashtags</p>
                    <p className="mt-1 text-sm text-[#1D4ED8]">{i.hashtags.join(" ") || "—"}</p>
                  </div>
                </div>

                {i.image_url && (
                  <div className="mt-3">
                    <p className="text-xs text-muted">Creative preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={i.image_url}
                      alt={i.design?.headline ?? i.topic}
                      className="mt-1 w-full max-w-sm rounded-2xl border border-border"
                      loading="lazy"
                    />
                  </div>
                )}

                {i.design && (
                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                      <ImageIcon size={14} /> Design brief
                    </summary>
                    <div className="mt-2 space-y-1 text-sm text-[#334155]">
                      <p>
                        <strong>Headline:</strong> {i.design.headline}
                      </p>
                      <p>
                        <strong>Subtext:</strong> {i.design.subtext || "—"}
                      </p>
                      <p>
                        <strong>Template:</strong> {i.design.template_id} ({i.design.size})
                      </p>
                      <p>
                        <strong>Image prompt:</strong> {i.design.image_prompt}
                      </p>
                    </div>
                  </details>
                )}

                {i.video_plan && (
                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                      <Video size={14} /> Reel script ({i.video_plan.duration_s}s, {i.video_plan.aspect})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {i.video_plan.scenes.map((s) => (
                        <div key={s.n} className="rounded-xl border border-border bg-[#fafbfc] p-3 text-sm">
                          <p className="flex items-center gap-2">
                            <strong>Scene {s.n}</strong>{" "}
                            <span className="text-xs text-muted">
                              {s.shot_type} · {s.duration_s}s
                            </span>
                          </p>
                          <p className="mt-1">
                            <strong>Visual:</strong> {s.visual}
                          </p>
                          <p>
                            <strong>On-screen:</strong> {s.on_screen_text}
                          </p>
                          <p>
                            <strong>Voiceover:</strong> {s.voiceover}
                          </p>
                        </div>
                      ))}
                      <p className="text-xs text-muted">Music: {i.video_plan.music_mood}</p>
                    </div>
                  </details>
                )}

                {i.status === "pending_human" && (
                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <Input
                      aria-label={`Rejection reason for ${i.id}`}
                      placeholder="Rejection reason (required to reject — trains brand memory)"
                      value={reason[i.id] ?? ""}
                      onChange={(e) => setReason((r) => ({ ...r, [i.id]: e.target.value }))}
                    />
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => mut.mutate({ itemId: i.id, action: "approve", reason: reason[i.id] ?? "" })}>
                        <CheckCircle2 size={15} /> Approve
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!(reason[i.id] ?? "").trim()}
                        onClick={() => mut.mutate({ itemId: i.id, action: "reject", reason: reason[i.id] ?? "" })}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            </StaggerItem>
          ))}
        </Stagger>
        {visible.length > shown.length && (
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => setVisibleCount((c) => c + PAGE)}>
              Load more ({visible.length - shown.length} remaining)
            </Button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
