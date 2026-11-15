"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  Video,
  X,
  RefreshCw,
} from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FadeIn } from "@/components/ui/motion";
import { toast } from "@/components/ui/toast";
import type { Campaign, Item } from "@/lib/db/repo";

function ValidationBadge({ issues }: { issues?: Array<{ severity: string; message: string }> }) {
  if (!issues?.length)
    return (
      <span className="tint-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
        <CheckCircle2 size={12} /> Validated
      </span>
    );
  const high = issues.filter((i) => i.severity === "high" || i.severity === "critical").length;
  return (
    <span className="tint-danger inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
      <AlertCircle size={12} /> {high} issue{high !== 1 ? "s" : ""}
    </span>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCampaign(data.campaign ?? null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Patch item copy fields on the campaign PATCH route (was wrongly sent to /api/approvals → 405). */
  const updateItem = async (itemId: string, patch: Partial<Item>) => {
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, ...patch }),
    });
    if (!res.ok) throw new Error("Update failed");
    return res.json();
  };

  const reviewItem = async (itemId: string, action: "approve" | "reject", reason?: string) => {
    setBusyId(itemId);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action, ...(reason ? { reason } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.reason ?? data.error ?? "Action failed");
      toast(action === "approve" ? "Approved — saved as an approved example" : `Rejected — AI learned: ${reason}`);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
      setRejectingId(null);
      setRejectReason("");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="card p-6">
          <p className="eyebrow">Campaign</p>
          <div className="skeleton mt-3 h-8 w-2/3 bg-[#eef0f4]" />
        </div>
        <div className="grid gap-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="skeleton h-32 bg-[#eef0f4]" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !campaign) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-[#B91C1C]">{loadError ?? "Campaign not found"}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button className="btn-secondary" onClick={load}>
            <RefreshCw size={15} /> Retry
          </button>
          <Link href="/campaigns" className="btn-primary">
            Back to campaigns
          </Link>
        </div>
      </div>
    );
  }

  const pending = campaign.items.filter((i) => i.status === "pending_human").length;
  const approved = campaign.items.filter((i) => ["approved", "scheduled", "published"].includes(i.status)).length;
  const rejected = campaign.items.filter((i) => i.status === "rejected").length;
  const rollup: string =
    pending > 0 ? "pending_human" : rejected === campaign.items.length && rejected > 0 ? "rejected" : "approved";

  return (
    <div className="grid gap-4">
      <FadeIn>
        <div className="card p-6">
          <PageHeader
            title={
              <span className="line-clamp-2">{campaign.brief?.goal?.slice(0, 120) || `Campaign ${campaign.id}`}</span>
            }
            description={`Campaign ${campaign.id} · ${campaign.items.length} items`}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={rollup} className="text-xs" />
                <Badge className="tint-info">AI cost: ${campaign.costUsd.toFixed(4)}</Badge>
                <Link href="/approvals" className="btn-primary">
                  Open approvals <ArrowLeft size={15} className="-rotate-90" />
                </Link>
              </div>
            }
          />
          <Link href="/campaigns" className="btn-secondary mt-4 inline-flex items-center gap-2 text-xs">
            <ArrowLeft size={14} /> All campaigns
          </Link>
        </div>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-4">
        <FadeIn delay={0.05} className="lg:col-span-2">
          <div className="card h-full p-5">
            <p className="eyebrow">CEO strategy plan</p>
            {campaign.plan ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Objectives</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#334155]">
                    {campaign.plan.objectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">KPIs</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#334155]">
                    {campaign.plan.kpis.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Tasks</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#334155]">
                    {campaign.plan.tasks.map((t, i) => (
                      <li key={i}>
                        <strong>{t.agent}:</strong> {t.description} (by day {t.deadline_day})
                      </li>
                    ))}
                  </ul>
                </div>
                {campaign.plan.risks.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#B91C1C]">Risks</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#B91C1C]">
                      {campaign.plan.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No strategy plan stored for this campaign.</p>
            )}
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="lg:col-span-2">
          <div className="card h-full p-5">
            <p className="eyebrow">Content calendar ({campaign.calendar.length} items)</p>
            <div className="mt-3 grid max-h-96 gap-2 overflow-auto">
              {campaign.calendar.length === 0 && <p className="py-4 text-sm text-muted">No calendar entries.</p>}
              {campaign.calendar.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[#fafbfc] px-4 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center font-mono text-xs text-muted">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{c.topic}</p>
                      <p className="text-xs text-muted">
                        {c.date} · {c.platform} · {c.format} · {c.pillar}
                      </p>
                    </div>
                  </div>
                  <Badge className="shrink-0">{c.goal}</Badge>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.12}>
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Generated items ({campaign.items.length})</p>
            <div className="flex flex-wrap gap-2">
              <span className="tint-warning rounded-full px-2.5 py-0.5 text-[11px] font-semibold">{pending} pending</span>
              <span className="tint-success rounded-full px-2.5 py-0.5 text-[11px] font-semibold">{approved} approved</span>
              <span className="tint-danger rounded-full px-2.5 py-0.5 text-[11px] font-semibold">{rejected} rejected</span>
            </div>
          </div>

          {campaign.items.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-[#d4d9e2] bg-[#fafbfc] p-6 text-center text-sm text-muted">
              No generated items yet — run a brief from Content Studio.
            </p>
          )}

          <div className="mt-4 grid gap-4">
            {campaign.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <ValidationBadge issues={item.validation_issues} />
                      <Badge className="tint-info">CEO {item.ceo_score}</Badge>
                      {item.provenance === "template" || item.fallback ? (
                        <span className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                          Template sample
                        </span>
                      ) : item.model ? (
                        <span className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#475569]">
                          {item.provider || "Gemini"} {item.model} · {((item.latencyMs || 0) / 1000).toFixed(1)}s · ${((item.costUsd || 0)).toFixed(4)}
                        </span>
                      ) : null}
                      {item.reviewedBy && (
                        <span className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                          Reviewed by {item.reviewedBy} (Score: {item.manager_score ?? item.ceo_score}/100) → Signed off by CEO
                        </span>
                      )}
                      <span className="text-xs text-muted">
                        {item.scheduled_for} · {item.platform} · {item.format}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-ink">{item.topic}</p>
                  </div>

                  {!["approved", "published", "scheduled"].includes(item.status) && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() => reviewItem(item.id, "approve")}
                      >
                        <CheckCircle2 size={14} /> Approve
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setRejectingId(rejectingId === item.id ? null : item.id);
                          setRejectReason("");
                        }}
                      >
                        <X size={14} /> Reject
                      </Button>
                      {editingId !== item.id && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditCaption(item.captions[0] ?? "");
                          }}
                        >
                          Edit caption
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {rejectingId === item.id && (
                  <div className="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3">
                    <label className="text-xs font-semibold text-[#B91C1C]">
                      Rejection reason (required — feeds brand memory)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      className="mt-1.5 w-full rounded-lg border border-[#fecaca] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#EF4444]"
                      placeholder="e.g. Too promotional for our calm brand voice"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        className="btn-primary text-xs"
                        disabled={!rejectReason.trim() || busyId === item.id}
                        onClick={() => reviewItem(item.id, "reject", rejectReason.trim())}
                      >
                        Confirm rejection
                      </button>
                      <button className="btn-secondary text-xs" onClick={() => setRejectingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {editingId === item.id ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <Input
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full"
                      aria-label="Edit primary caption"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            await updateItem(item.id, { captions: [editCaption, ...item.captions.slice(1)] });
                            toast("Caption saved");
                            setEditingId(null);
                            setEditCaption("");
                            await load();
                          } catch {
                            toast("Save failed");
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditCaption("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted">Primary caption</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-[#334155]">{item.captions[0]}</p>
                      {item.captions.length > 1 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted">Show all {item.captions.length} variants</summary>
                          <div className="mt-2 space-y-1 text-xs text-muted">
                            {item.captions.map((c, idx) => (
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
                      <p className="mt-1 text-sm font-medium text-[#047857]">{item.cta || "—"}</p>
                      <p className="mt-2 text-xs text-muted">Hashtags</p>
                      <p className="mt-1 text-sm text-[#1D4ED8]">{item.hashtags.join(" ") || "—"}</p>
                    </div>
                  </div>
                )}

                {item.image_url && (
                  <div className="mt-3">
                    <p className="text-xs text-muted">Creative preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.design?.headline ?? item.topic}
                      className="mt-1 w-full max-w-md rounded-2xl border border-border"
                      loading="lazy"
                    />
                  </div>
                )}

                {item.design && (
                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                      <ImageIcon size={14} /> Design brief
                    </summary>
                    <div className="mt-2 space-y-1 text-sm text-[#334155]">
                      <p>
                        <strong>Headline:</strong> {item.design.headline}
                      </p>
                      <p>
                        <strong>Subtext:</strong> {item.design.subtext || "—"}
                      </p>
                      <p>
                        <strong>Template:</strong> {item.design.template_id} ({item.design.size})
                      </p>
                      <p>
                        <strong>Image prompt:</strong> {item.design.image_prompt}
                      </p>
                      {item.design.text_overlays?.length ? (
                        <p>
                          <strong>Overlays:</strong> {item.design.text_overlays.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </details>
                )}

                {item.video_plan && (
                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                      <Video size={14} /> Reel script ({item.video_plan.duration_s}s, {item.video_plan.aspect})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {item.video_plan.scenes.map((s) => (
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
                      <p className="text-xs text-muted">Music: {item.video_plan.music_mood}</p>
                    </div>
                  </details>
                )}

                {item.validation_issues && item.validation_issues.length > 0 && (
                  <details className="mt-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm text-[#B91C1C]">
                      <AlertCircle size={14} /> Validation issues ({item.validation_issues.length})
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#B91C1C]">
                      {item.validation_issues.map((issue, idx) => (
                        <li key={idx}>
                          <strong>{issue.severity.toUpperCase()}:</strong> {issue.message}{" "}
                          {issue.suggestion && <span className="text-muted">→ {issue.suggestion}</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            ))}
          </div>
        </div>
      </FadeIn>

      {campaign.assets.length > 0 && (
        <FadeIn delay={0.14}>
          <div className="card p-6">
            <p className="eyebrow">Assets ({campaign.assets.length})</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaign.assets.map((asset) => (
                <div key={asset.id} className="rounded-xl border border-border bg-surface p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.headline} className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
                  <p className="mt-2 text-sm font-medium text-ink">{asset.headline}</p>
                  <p className="text-xs text-muted">
                    {asset.topic} · {asset.template_id} · {asset.width}x{asset.height}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {campaign.videoPlans.length > 0 && (
        <FadeIn delay={0.16}>
          <div className="card p-6">
            <p className="eyebrow">Video plans ({campaign.videoPlans.length})</p>
            <div className="mt-4 grid gap-3">
              {campaign.videoPlans.map((vp) => (
                <details key={vp.itemId} className="rounded-xl border border-border bg-surface p-4">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                    <Video size={14} /> {vp.topic} ({vp.plan.duration_s}s)
                  </summary>
                  <div className="mt-3 space-y-2">
                    {vp.plan.scenes.map((s) => (
                      <div key={s.n} className="rounded-lg border border-border bg-[#fafbfc] p-3 text-sm">
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
                  </div>
                </details>
              ))}
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
