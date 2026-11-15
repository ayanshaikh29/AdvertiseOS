"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, Users2, CalendarClock, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/badge";
import { FadeIn } from "@/components/ui/motion";
import { toast } from "@/components/ui/toast";
import { useBrands } from "@/components/shell/hooks";
import type { Lead, LeadStatus } from "@/lib/db/repo";

const COLUMNS: Array<{ key: LeadStatus; label: string; tint: string }> = [
  { key: "new", label: "New", tint: "border-[#bfdbfe] bg-brand-soft" },
  { key: "contacted", label: "Contacted", tint: "border-[#fde68a] bg-[#fffbeb]" },
  { key: "qualified", label: "Qualified", tint: "border-[#c7d2fe] bg-[#eef2ff]" },
  { key: "won", label: "Won", tint: "border-[#a7f3d0] bg-[#ecfdf5]" },
  { key: "lost", label: "Lost", tint: "border-[#fecaca] bg-[#fef2f2]" },
];

const CHANNELS = ["whatsapp", "instagram_dm", "call", "email", "other"] as const;

type Draft = {
  id?: string;
  brandId: string;
  name: string;
  company: string;
  channel: string;
  status: LeadStatus;
  value: string;
  notes: string;
  followUpAt: string;
};

const emptyDraft = (brandId: string): Draft => ({
  brandId,
  name: "",
  company: "",
  channel: "whatsapp",
  status: "new",
  value: "",
  notes: "",
  followUpAt: "",
});

export default function CrmPage() {
  const { data: brands = [] } = useBrands();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads(data.leads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => (brand === "all" ? leads : leads.filter((l) => l.brandId === brand)), [leads, brand]);
  const today = new Date().toISOString().slice(0, 10);
  const followUps = useMemo(
    () => visible.filter((l) => l.followUpAt && l.followUpAt <= today && !["won", "lost"].includes(l.status)),
    [visible, today]
  );
  const pipelineValue = visible.filter((l) => !["lost"].includes(l.status)).reduce((s, l) => s + (l.value ?? 0), 0);

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setBusy(true);
    try {
      const body = {
        brandId: draft.brandId,
        name: draft.name.trim(),
        company: draft.company.trim() || undefined,
        channel: draft.channel,
        status: draft.status,
        value: draft.value ? Number(draft.value) : undefined,
        notes: draft.notes,
        followUpAt: draft.followUpAt || undefined,
        source: "manual",
      };
      const res = draft.id
        ? await fetch(`/api/leads/${draft.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Save failed");
      toast(draft.id ? "Lead updated" : "Lead added");
      setDraft(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const move = async (lead: Lead, status: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Move failed");
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Move failed");
    }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast("Lead deleted");
      setLeads((ls) => ls.filter((l) => l.id !== id));
      setDraft(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (l: Lead) =>
    setDraft({
      id: l.id,
      brandId: l.brandId,
      name: l.name,
      company: l.company ?? "",
      channel: l.channel,
      status: l.status,
      value: l.value != null ? String(l.value) : "",
      notes: l.notes,
      followUpAt: l.followUpAt ?? "",
    });

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="card p-6">
          <PageHeader
            title="CRM & leads"
            description="A real, persisted pipeline — every lead is stored, nothing is fabricated."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  aria-label="Filter by client"
                  className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-[#334155] outline-none focus:border-[#93C5FD]"
                >
                  <option value="all">All clients</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={load}>
                  <RefreshCw size={13} /> Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDraft(emptyDraft(brand !== "all" ? brand : brands[0]?.id ?? "sample-brand"))}
                >
                  <Plus size={14} /> Add lead
                </Button>
              </div>
            }
          />

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
              <p className="text-xl font-bold text-ink">{visible.length}</p>
              <p className="text-[11px] text-muted">Leads</p>
            </div>
            <div className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
              <p className="text-xl font-bold text-ink">{visible.filter((l) => ["qualified", "won"].includes(l.status)).length}</p>
              <p className="text-[11px] text-muted">Qualified + won</p>
            </div>
            <div className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
              <p className="text-xl font-bold text-[#047857]">${pipelineValue.toLocaleString()}</p>
              <p className="text-[11px] text-muted">Open pipeline value</p>
            </div>
            <div className="rounded-xl border border-border bg-[#fafbfc] p-3 text-center">
              <p className={`text-xl font-bold ${followUps.length ? "text-[#B45309]" : "text-ink"}`}>{followUps.length}</p>
              <p className="text-[11px] text-muted">Follow-ups due</p>
            </div>
          </div>
        </div>
      </FadeIn>

      {followUps.length > 0 && (
        <FadeIn delay={0.04}>
          <div className="card border-[#fde68a] bg-[#fffbeb] p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
              <CalendarClock size={12} /> Follow-ups due
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {followUps.map((l) => (
                <button
                  key={l.id}
                  onClick={() => openEdit(l)}
                  className="rounded-lg border border-[#fde68a] bg-white px-3 py-1.5 text-xs font-medium text-[#92400E] transition hover:bg-[#fffbeb]"
                >
                  {l.name} · due {l.followUpAt}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((k) => (
            <Skeleton key={k} className="h-56" />
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="font-medium text-[#B91C1C]">Couldn’t load leads: {error}</p>
          <button className="btn-primary mt-4" onClick={load}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center">
          <Users2 className="mx-auto text-[#94A3B8]" size={30} />
          <p className="mt-3 font-display text-base font-bold text-ink">No leads yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            Add one manually or connect a lead source — pipeline counts stay hidden until real leads exist.
          </p>
          <button
            className="btn-primary mt-4 inline-flex"
            onClick={() => setDraft(emptyDraft(brand !== "all" ? brand : brands[0]?.id ?? "sample-brand"))}
          >
            <Plus size={15} /> Add your first lead
          </button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = visible.filter((l) => l.status === col.key);
            const shownItems = items.slice(0, 20);
            return (
              <FadeIn key={col.key} delay={0.03}>
                <div className={`rounded-2xl border p-3 ${col.tint}`}>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">{col.label}</span>
                    <span className="rounded-full bg-white px-2 text-[10px] font-bold text-[#475569]">{items.length}</span>
                  </div>
                  <div className="mt-2.5 grid gap-2">
                    {items.length === 0 && <p className="py-4 text-center text-[10px] text-[#94A3B8]">—</p>}
                    {shownItems.map((l) => (
                      <div key={l.id} className="rounded-xl border border-border bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                            {l.company && <p className="truncate text-[11px] text-muted">{l.company}</p>}
                          </div>
                          <span className="chip shrink-0">{l.source}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                          <span className="rounded bg-[#f3f4f6] px-1.5 py-0.5">{l.channel.replace("_", " ")}</span>
                          {l.value != null && <span className="font-semibold text-[#047857]">${l.value.toLocaleString()}</span>}
                          {l.followUpAt && <span className="text-[#B45309]">follow-up {l.followUpAt}</span>}
                        </div>
                        {l.notes && <p className="mt-1.5 line-clamp-2 text-[11px] italic text-[#475569]">{l.notes}</p>}
                        <div className="mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2">
                          <select
                            value={l.status}
                            onChange={(e) => move(l, e.target.value as LeadStatus)}
                            aria-label={`Status for ${l.name}`}
                            className="rounded-lg border border-border bg-white px-1.5 py-1 text-[10px] text-[#334155] outline-none"
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEdit(l)}
                              aria-label={`Edit ${l.name}`}
                              className="rounded p-1 text-muted transition hover:bg-surface-hover hover:text-ink"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => remove(l.id)}
                              disabled={deletingId === l.id}
                              aria-label={`Delete ${l.name}`}
                              className="rounded p-1 text-muted transition hover:bg-[#fef2f2] hover:text-[#B91C1C]"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {items.length > shownItems.length && (
                      <p className="text-center text-[10px] text-[#94A3B8]">+{items.length - shownItems.length} more</p>
                    )}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      )}

      {/* Add / edit lead dialog */}
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent>
          {draft && (
            <div className="grid gap-3">
              <DialogTitle>{draft.id ? "Edit lead" : "Add lead"}</DialogTitle>

              <label className="grid gap-1 text-xs font-semibold text-ink">
                Name *
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#93C5FD]"
                  placeholder="Rohan Deshmukh"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-semibold text-ink">
                  Company
                  <input
                    value={draft.company}
                    onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#93C5FD]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-ink">
                  Channel
                  <select
                    value={draft.channel}
                    onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs font-semibold text-ink">
                  Status
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as LeadStatus })}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold text-ink">
                  Value (USD)
                  <input
                    type="number"
                    value={draft.value}
                    onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-ink">
                  Follow-up
                  <input
                    type="date"
                    value={draft.followUpAt}
                    onChange={(e) => setDraft({ ...draft, followUpAt: e.target.value })}
                    className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-1 text-xs font-semibold text-ink">
                Client
                <select
                  value={draft.brandId}
                  onChange={(e) => setDraft({ ...draft, brandId: e.target.value })}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  {!brands.length && <option value="sample-brand">Default</option>}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-semibold text-ink">
                Notes
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  rows={3}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#93C5FD]"
                  placeholder="Saw Instagram ad, asked for pricing…"
                />
              </label>

              <div className="flex justify-between gap-2 border-t border-border-subtle pt-4">
                {draft.id ? (
                  <button
                    className="btn-secondary !text-[#B91C1C] text-xs"
                    disabled={deletingId === draft.id}
                    onClick={() => draft.id && remove(draft.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs" onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                  <button className="btn-primary text-xs" disabled={!draft.name.trim() || busy} onClick={save}>
                    {draft.id ? "Save changes" : "Add lead"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
