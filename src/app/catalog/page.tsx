"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type CatalogItem = {
  id: string;
  brandId: string;
  kind: "product" | "service";
  name: string;
  description: string;
  price: number | null;
  currency: string;
  tags: string[];
  features: string[];
  status: "active" | "draft" | "archived";
  source: "manual" | "connector";
  provider: string | null;
  sample: boolean;
};

type Health = { score: number; itemCount: number; activeCount: number; gaps: string[] };
type ItemHealth = { score: number; gaps: Array<{ field: string; hint: string }> };

type FormState = { kind: "product" | "service"; name: string; description: string; price: string; tags: string; features: string };

const EMPTY_FORM: FormState = { kind: "product", name: "", description: "", price: "", tags: "", features: "" };

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [itemHealth, setItemHealth] = useState<Record<string, ItemHealth>>({});
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [brandId, setBrandId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async (bid: string) => {
    const qs = bid ? `?brandId=${encodeURIComponent(bid)}` : "";
    const res = await fetch(`/api/catalog${qs}`);
    if (res.ok) {
      const d = await res.json();
      setItems(d.items ?? []);
      setHealth(d.health ?? null);
      setItemHealth(d.itemHealth ?? {});
    }
  }, []);

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((d) => {
      const list = d.brands ?? [];
      setBrands(list);
      const saved = localStorage.getItem("advos-brand");
      setBrandId(saved || list[0]?.id || "");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (brandId) load(brandId).catch(() => {});
  }, [brandId, load]);

  async function save() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId,
          kind: form.kind,
          name: form.name,
          description: form.description,
          price: form.price === "" ? null : Number(form.price),
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          features: form.features.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(typeof out.error === "string" ? out.error : "Could not save item");
      setForm(EMPTY_FORM);
      setOpen(false);
      await load(brandId);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not save item");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/catalog/${id}`, { method: "DELETE" });
      await load(brandId);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/catalog/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "website", brandId }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(typeof out.error === "string" ? out.error : "Sync failed");
      setNote(out.note ?? `Synced ${out.synced} items.`);
      await load(brandId);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  const score = health?.score ?? 0;

  return (
    <div className="grid gap-4">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Catalog Â· Connected business data</p>
        <h1 className="font-display mt-2 text-3xl font-bold">
          What you <em className="text-[#2563EB]">sell</em>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Structured products &amp; services every agent reads before writing copy or building offers. Real data only â€” synced rows keep their source label.
        </p>
        {note ? <p className="mt-2 text-sm text-[#2563EB]">{note}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            aria-label="Brand"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink"
          >
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            {brands.length === 0 ? <option value="">No brand yet â€” set one up first</option> : null}
          </select>
          <button onClick={() => setOpen((o) => !o)} className="btn-primary inline-flex items-center gap-2" disabled={!brandId || busy}>
            <Plus size={16} /> Add item
          </button>
          <button onClick={sync} className="btn-secondary inline-flex items-center gap-2" disabled={!brandId || busy}>
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} /> Sync from website
          </button>
          {health ? (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted">Catalog health</span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-[#1F1F1F]">
                <div
                  className={cn("h-full rounded-full", score >= 70 ? "bg-[#22C55E]" : score >= 40 ? "bg-[#F59E0B]" : "bg-[#EF4444]")}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-bold">{score}%</span>
            </div>
          ) : null}
        </div>
        {health?.gaps.length ? (
          <ul className="mt-3 grid gap-1">
            {health.gaps.map((g) => (
              <li key={g} className="flex items-start gap-2 text-xs text-[#F59E0B]">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {g}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {open ? (
        <div className="card p-6">
          <p className="eyebrow">New item</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="Brand Identity Design" />
            </label>
            <label className="grid gap-1 text-sm">
              Kind
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "product" | "service" })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]">
                <option value="product">Product</option>
                <option value="service">Service</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Description
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD] min-h-[80px]" placeholder="One line agents can quote in copy" />
            </label>
            <label className="grid gap-1 text-sm">
              Price (â‚¹, blank = contact us)
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" inputMode="numeric" placeholder="25000" />
            </label>
            <label className="grid gap-1 text-sm">
              Tags (comma-separated)
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="branding, small business" />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Features (comma-separated)
              <input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="Logo suite, Color system, Brand guide" />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="btn-primary" disabled={busy || form.name.trim().length < 2}>Save item</button>
            <button onClick={() => { setOpen(false); setForm(EMPTY_FORM); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : null}

      <div className="card divide-y divide-[#1F1F1F]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted">
            <Package size={28} />
            <p>No items for this brand yet. Add your real products/services, or sync from the website connector (sample until real crawl lands).</p>
          </div>
        ) : (
          items.map((i) => {
            const h = itemHealth[i.id];
            return (
              <div key={i.id} className="flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{i.name}</span>
                    <span className="rounded-full border border-border bg-[#f3f4f6] px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">{i.kind}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px]", i.status === "active" ? "bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]" : "bg-[#f3f4f6] text-muted")}>{i.status}</span>
                    {i.sample ? <span className="rounded-full bg-[rgba(37,99,235,.15)] px-2 py-0.5 text-[11px] text-[#2563EB]">Sample data</span> : null}
                    {i.source === "connector" ? <span className="text-[11px] text-[#6B7280]">via {i.provider}</span> : null}
                  </div>
                  {i.description ? <p className="mt-1 text-sm text-muted">{i.description}</p> : null}
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {i.price === null ? "Contact for pricing" : `${i.currency} ${i.price.toLocaleString("en-IN")}`}
                    {i.tags.length ? ` Â· ${i.tags.join(", ")}` : ""}
                  </p>
                  {h && h.gaps.length ? (
                    <p className="mt-1 text-xs text-[#F59E0B]">Health {h.score}% â€” add {h.gaps.map((g) => g.field).join(", ")}</p>
                  ) : null}
                </div>
                <button onClick={() => remove(i.id)} aria-label={`Delete ${i.name}`} className="rounded-xl p-2 text-[#6B7280] hover:bg-[#fef2f2] hover:text-[#B91C1C]" disabled={busy}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

