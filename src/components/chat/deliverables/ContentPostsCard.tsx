import React, { useState } from "react";
import type { DeliverableContentPosts } from "@/types/chat";
import type { Item } from "@/lib/db/repo";
import { FileText, Copy, Check, Send, RotateCcw, Edit3, X, ChevronDown, ChevronRight, Loader2, AlertTriangle, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui/badge";

type Busy = "approve" | "reject" | "regen" | "save" | "optimize" | null;

export function ContentPostsCard({ data, campaignId }: { data: DeliverableContentPosts; campaignId?: string }) {
  const [items, setItems] = useState<Item[]>(data.items);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [variantMap, setVariantMap] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState<Record<string, Busy>>({});

  const copyCaption = (caption: string, id: string) => {
    navigator.clipboard.writeText(caption);
    setCopiedId(id);
    toast("Caption copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const setItem = (id: string, next: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...next } : i)));

  const run = async (id: string, kind: Exclude<Busy, null>, fn: () => Promise<void>) => {
    setBusy((b) => ({ ...b, [id]: kind }));
    try {
      await fn();
    } catch {
      toast("Action failed — check your connection");
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const handleApprove = (id: string) =>
    run(id, "approve", async () => {
      const r = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, action: "approve" }),
      });
      if (!r.ok) throw new Error();
      setItem(id, { status: "approved" });
      toast("Approved — moved to schedule queue");
    });

  const handleReject = (id: string) =>
    run(id, "reject", async () => {
      const r = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, action: "reject", reason: rejectReason }),
      });
      if (!r.ok) throw new Error();
      setItem(id, { status: "rejected" });
      setRejectingId(null);
      setRejectReason("");
      toast("Rejected — reason saved to brand memory");
    });

  const startEdit = (item: Item, vIndex: number) => {
    setEditingId(item.id);
    setEditText(item.captions[vIndex] ?? "");
  };

  const saveEdit = (item: Item, vIndex: number) =>
    run(item.id, "save", async () => {
      const endpoint = campaignId || "adhoc";
      const captions = [...item.captions];
      captions[vIndex] = editText;
      const r = await fetch(`/api/campaigns/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, captions }),
      });
      if (!r.ok) throw new Error();
      setItem(item.id, { captions });
      setEditingId(null);
      toast("Caption updated");
    });

  const handleRegenerate = (id: string) =>
    run(id, "regen", async () => {
      const r = await fetch("/api/content/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error();
      setItem(id, d.item);
      setVariantMap((m) => ({ ...m, [id]: 0 }));
      toast(`Regenerated — quality ${d.item?.ceo_score}/100${d.note ? ` · ${d.note}` : ""}`);
    });

  const handleOptimizeWithHermes = (id: string) =>
    run(id, "optimize", async () => {
      const r = await fetch("/api/campaigns/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Optimization failed");
      setItem(id, d.item);
      setVariantMap((m) => ({ ...m, [id]: 0 }));
      toast(`⚡ Hermes Optimized — Quality ${d.item?.ceo_score}/100: ${d.summary || "Hooks & CTAs polished"}`);
    });

  const [batchOptimizing, setBatchOptimizing] = useState(false);
  const handleOptimizeAllWithHermes = async () => {
    if (batchOptimizing || items.length === 0) return;
    setBatchOptimizing(true);
    try {
      if (campaignId) {
        const r = await fetch("/api/campaigns/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Batch optimization failed");
        if (d.items) setItems(d.items);
        toast(`⚡ Hermes Optimized all ${d.count} posts for maximum conversion!`);
      } else {
        // Optimize first 3 in parallel
        const toOpt = items.slice(0, 4);
        for (const item of toOpt) {
          await handleOptimizeWithHermes(item.id);
        }
      }
    } catch {
      toast("Optimization failed — check connection");
    } finally {
      setBatchOptimizing(false);
    }
  };

  const platforms = ["all", ...new Set(items.map((p) => p.platform.toLowerCase()))];
  const filtered = items.filter((p) => platformFilter === "all" || p.platform.toLowerCase() === platformFilter);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-[#2563EB]">
            <FileText size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display truncate text-sm font-bold text-ink">Post copy & multi-variant captions</h3>
              <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-[#1D4ED8]">
                {items.length} posts
              </span>
            </div>
            <p className="text-xs text-muted">3 caption variants each · approval required before publishing</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 text-xs">
            {platforms.map((plat) => (
              <button
                key={plat}
                onClick={() => setPlatformFilter(plat)}
                className={`rounded-lg px-2.5 py-1 capitalize transition ${platformFilter === plat ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {plat}
              </button>
            ))}
          </div>
          <button
            onClick={handleOptimizeAllWithHermes}
            disabled={batchOptimizing}
            className="flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
            title="Polish entire campaign copy with Hermes Direct-Response Engine"
          >
            {batchOptimizing ? <Loader2 size={13} className="animate-spin text-purple-600" /> : <Sparkles size={13} className="text-purple-600" />}
            {batchOptimizing ? "Optimizing…" : "⚡ Hermes Polish All"}
          </button>
          <Link href="/approvals" className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:bg-surface-hover">
            <Send size={13} />
            Approvals
          </Link>
        </div>
      </div>

      {/* Posts */}
      <div className="max-h-[34rem] space-y-3 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No posts for this filter.</p>
        ) : (
          filtered.map((post) => {
            const vIndex = variantMap[post.id] ?? 0;
            const currentCaption = post.captions[vIndex] || post.captions[0] || "";
            const isBusy = !!busy[post.id];
            const isEditing = editingId === post.id;
            const isRejecting = rejectingId === post.id;
            const isExpanded = !!expanded[post.id];

            return (
              <div key={post.id} className={`rounded-2xl border p-4 transition ${post.status === "approved" ? "border-[#a7f3d0] bg-[#f0fdf4]" : post.status === "rejected" ? "border-[#fecaca] bg-[#fffafa]" : "border-border bg-surface hover:border-[#d4d9e2]"}`}>
                {/* Meta bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-surface-2 px-2 py-1 font-mono text-[11px] font-semibold text-[#475569]">{post.scheduled_for}</span>
                    <span className="rounded-md border border-border bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      {post.platform} · {post.format}
                    </span>
                    <span className="truncate text-xs font-bold text-ink">{post.topic}</span>
                    <StatusBadge status={post.status} />
                    {post.provenance === "template" || post.fallback ? (
                      <span className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                        Template sample
                      </span>
                    ) : post.model ? (
                      <span className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#475569]">
                        {post.provider || "Gemini"} {post.model} · {((post.latencyMs || 0) / 1000).toFixed(1)}s · ${((post.costUsd || 0)).toFixed(4)}
                      </span>
                    ) : null}
                    {post.reviewedBy && (
                      <span className="rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                        Reviewed by {post.reviewedBy}{post.manager_score ? ` (${post.manager_score}/100)` : ""} → Signed off by CEO
                      </span>
                    )}
                    {post.why_now && (
                      <span className="rounded-md border border-[#c4b5fd] bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-medium text-[#6d28d9]">
                        Why now: {post.why_now}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {post.rewrite_reason?.includes("Hermes") && (
                      <span className="flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800" title={post.rewrite_reason}>
                        <Zap size={10} /> Hermes Polished
                      </span>
                    )}
                    <span className="rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                      Quality {post.ceo_score}/100
                    </span>

                    <button onClick={() => copyCaption(currentCaption, post.id)} className="flex min-h-[34px] sm:min-h-[30px] items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-[#475569] transition hover:bg-surface-hover active:scale-95" title="Copy active caption">
                      {copiedId === post.id ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                      {copiedId === post.id ? "Copied" : "Copy"}
                    </button>

                    <button
                      onClick={() => (isEditing ? setEditingId(null) : startEdit(post, vIndex))}
                      disabled={isBusy}
                      className="flex min-h-[34px] sm:min-h-[30px] items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-[#475569] transition hover:bg-surface-hover disabled:opacity-50 active:scale-95"
                      title="Edit caption inline"
                    >
                      <Edit3 size={12} /> Edit
                    </button>

                    <button
                      onClick={() => handleRegenerate(post.id)}
                      disabled={isBusy}
                      className="flex min-h-[34px] sm:min-h-[30px] items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-[#475569] transition hover:bg-surface-hover disabled:opacity-50 active:scale-95"
                      title="Regenerate this post's copy"
                    >
                      {busy[post.id] === "regen" ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Regenerate
                    </button>

                    <button
                      onClick={() => handleOptimizeWithHermes(post.id)}
                      disabled={isBusy}
                      className="flex min-h-[34px] sm:min-h-[30px] items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 active:scale-95"
                      title="Hermes Autonomous Polish: Direct-Response Hooks & High-CTR Copy"
                    >
                      {busy[post.id] === "optimize" ? <Loader2 size={12} className="animate-spin text-purple-600" /> : <Sparkles size={12} className="text-purple-600" />} ⚡ Hermes Polish
                    </button>

                    {post.status === "approved" || post.status === "rejected" ? (
                      <span className="flex min-h-[34px] sm:min-h-[30px] items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold text-muted">Reviewed</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(post.id)}
                          disabled={isBusy}
                          className="flex min-h-[34px] sm:min-h-[30px] items-center gap-1 rounded-lg bg-[#059669] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#047857] disabled:opacity-50 active:scale-95"
                        >
                          {busy[post.id] === "approve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(isRejecting ? null : post.id);
                            setRejectReason("");
                          }}
                          disabled={isBusy}
                          className="flex min-h-[34px] sm:min-h-[30px] items-center gap-1 rounded-lg border border-[#fecaca] px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C] transition hover:bg-[#fef2f2] disabled:opacity-50 active:scale-95"
                        >
                          <X size={12} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reject reason */}
                {isRejecting && (
                  <div className="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3">
                    <label className="text-[11px] font-semibold text-[#B91C1C]">Reason (saved to brand memory)</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                      className="mt-1.5 w-full rounded-lg border border-[#fecaca] bg-white px-3 py-2 text-sm text-ink focus:border-[#EF4444] focus:outline-none"
                      placeholder="e.g. CTA is generic — use our booking link instead"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleReject(post.id)}
                        disabled={!rejectReason.trim() || isBusy}
                        className="rounded-lg bg-[#EF4444] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#DC2626] disabled:opacity-40"
                      >
                        {busy[post.id] === "reject" ? "Rejecting…" : "Confirm reject"}
                      </button>
                      <button onClick={() => setRejectingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Hook / objective / audience */}
                {(post.hook || post.objective || post.audience) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {post.hook && (
                      <div className="rounded-lg bg-brand-soft px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#1D4ED8]">Hook</p>
                        <p className="text-xs font-semibold text-[#1e3a8a]">{post.hook}</p>
                      </div>
                    )}
                    {post.objective && (
                      <div className="rounded-lg bg-surface-2 px-3 py-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Objective</p>
                        <p className="text-xs text-[#475569]">{post.objective}</p>
                      </div>
                    )}
                    {post.audience && (
                      <div className="rounded-lg bg-surface-2 px-3 py-2 sm:col-span-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Audience</p>
                        <p className="text-xs text-[#475569]">{post.audience}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Variant switcher */}
                {post.captions.length > 1 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Variants:</span>
                    {post.captions.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setVariantMap((m) => ({ ...m, [post.id]: i }))}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${vIndex === i ? "bg-[#2563EB] font-bold text-white" : "bg-surface-2 text-muted hover:text-ink"}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}

                {/* Caption body / editor */}
                <div className="mt-3 rounded-xl border border-border-subtle bg-[#fafbfc] p-3.5">
                  {isEditing ? (
                    <>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm leading-relaxed text-ink focus:border-[#2563EB] focus:outline-none"
                        aria-label="Edit caption"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => saveEdit(post, vIndex)}
                          disabled={isBusy}
                          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
                        >
                          {busy[post.id] === "save" ? "Saving…" : "Save changes"}
                        </button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted">
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={`whitespace-pre-wrap text-xs leading-relaxed text-[#334155] ${!isExpanded && currentCaption.length > 320 ? "line-clamp-5" : ""}`}>{currentCaption}</p>
                      {currentCaption.length > 320 && (
                        <button onClick={() => setExpanded((m) => ({ ...m, [post.id]: !isExpanded }))} className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[#2563EB]">
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {isExpanded ? "Show less" : "Show full caption"}
                        </button>
                      )}
                      {post.hashtags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-subtle pt-2">
                          {post.hashtags.map((h, i) => (
                            <span key={i} className="text-[11px] font-medium text-[#2563EB]">{h}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Format-specific structures */}
                {post.format === "carousel" && post.carousel_slides && post.carousel_slides.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Carousel slides</p>
                    <ol className="mt-1.5 space-y-1.5">
                      {post.carousel_slides.map((s, i) => (
                        <li key={i} className="rounded-lg border border-border-subtle bg-white px-3 py-2">
                          <span className="mr-2 text-[10px] font-bold text-[#2563EB]">{i + 1}</span>
                          <span className="text-xs font-semibold text-ink">{s.heading}</span>
                          <p className="mt-0.5 pl-6 text-[11px] leading-relaxed text-[#475569]">{s.body}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {post.format === "reel" && post.reel_script && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Reel script</p>
                    <pre className="mt-1.5 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg border border-border-subtle bg-white p-3 text-[11px] leading-relaxed text-[#334155]">{post.reel_script}</pre>
                  </div>
                )}

                {post.format === "ad" && post.ad_copy && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border-subtle bg-white p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Primary text</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#334155]">{post.ad_copy.primary_text}</p>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-white p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">Headline</p>
                      <p className="mt-0.5 text-xs font-semibold text-ink">{post.ad_copy.headline}</p>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-white p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]">CTA</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#2563EB]">{post.ad_copy.cta}</p>
                    </div>
                  </div>
                )}

                {/* CTA + design brief line */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface-2 px-3.5 py-2 text-xs">
                  <div className="min-w-0">
                    <span className="mr-1.5 font-semibold text-[#2563EB]">CTA:</span>
                    <span className="text-[#334155]">{post.cta}</span>
                  </div>
                  {post.design && (
                    <span className="flex items-center gap-1.5 truncate text-[11px] text-muted">
                      <AlertTriangle size={11} className="shrink-0 text-[#F59E0B]" />
                      {post.design.template_id} · {post.design.size} · {post.design.headline.slice(0, 40)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
