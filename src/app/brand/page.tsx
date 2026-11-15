"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  tone: string;
  languages: string[];
  audience: string;
  products: string;
  usp: string;
  sample: boolean;
};

export default function BrandPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [note, setNote] = useState("");
  const { register, handleSubmit, reset } = useForm<{ name: string; tone: string; audience: string; products: string; usp: string }>({
    defaultValues: { name: "", tone: "confident, helpful, premium", audience: "", products: "", usp: "" },
  });

  async function load() {
    const d = await fetch("/api/brands").then((r) => r.json());
    setBrands(d.brands ?? []);
  }
  useEffect(() => {
    load().catch(() => {});
  }, []);

  async function create(v: { name: string; tone: string; audience: string; products: string; usp: string }) {
    const res = await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    if (res.ok) {
      setNote("Brand saved â€” the AI team now uses it for every brief.");
      reset();
      await load();
    }
  }

  async function loadSample() {
    const res = await fetch("/api/brands", { method: "PUT" });
    const d = await res.json();
    setNote(d.note ?? "Sample brand loaded.");
    await load();
  }

  return (
    <div className="grid gap-4">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Brand setup</p>
        <h1 className="font-display mt-2 text-3xl font-bold">Your <em className="text-[#2563EB]">brand</em></h1>
        <p className="mt-2 text-sm text-muted">Every agent reads this before writing a word. No invented facts, ever.</p>
        {note ? <p className="mt-2 text-sm text-emerald-600">{note}</p> : null}
        <div className="mt-4 grid gap-2">
          {brands.map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-white p-4">
              <p className="font-semibold">{b.name} {b.sample ? <span className="text-xs text-[#F59E0B]">(Sample data)</span> : null}</p>
              <p className="mt-1 text-sm text-muted">Tone: {b.tone} Â· {b.languages.join(", ")}</p>
            </div>
          ))}
          {brands.length === 0 ? <p className="text-sm text-muted">No brand yet â€” add yours below, or load the labeled sample.</p> : null}
        </div>
        <button onClick={loadSample} className="btn-secondary mt-3">Load sample brand (labeled)</button>
      </div>

      <form onSubmit={handleSubmit(create)} className="card grid gap-3 p-6 sm:p-8">
        <p className="eyebrow">New brand Â· autosaved on submit</p>
        <label className="grid gap-1 text-sm">Name
          <input {...register("name", { required: true })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="Digital Advertise" />
        </label>
        <label className="grid gap-1 text-sm">Tone
          <input {...register("tone")} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" />
        </label>
        <label className="grid gap-1 text-sm">Audience
          <input {...register("audience")} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="Small business owners in Indiaâ€¦" />
        </label>
        <label className="grid gap-1 text-sm">Products / services
          <input {...register("products")} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="SEO, social media, adsâ€¦" />
        </label>
        <label className="grid gap-1 text-sm">USP (only real, verifiable claims)
          <input {...register("usp")} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" />
        </label>
        <button type="submit" className="btn-primary justify-center"><Plus size={18} aria-hidden /> Save brand</button>
      </form>
    </div>
  );
}
