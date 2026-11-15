"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { briefSchema, type BriefInput } from "@/lib/schemas";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  { key: "ceo", label: "CEO â€” reviewing brief & making the plan" },
  { key: "strategist", label: "Strategist â€” building the 30-day calendar" },
  { key: "content", label: "Content Creator â€” writing captions & CTAs" },
  { key: "score", label: "Reviewer â€” scoring every draft" },
  { key: "designer", label: "Designer â€” creating visuals" },
  { key: "video", label: "Video Team â€” planning reels" },
  { key: "save", label: "Saving campaign for your approval" },
] as const;

export default function NewBriefPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [liveLabels, setLiveLabels] = useState<Record<string, string>>({});
  const [elapsed, setElapsed] = useState(0);
  const [brands, setBrands] = useState<Array<{ id: string; name: string; sample: boolean }>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { register, handleSubmit, formState, setValue } = useForm<BriefInput>({
    resolver: zodResolver(briefSchema),
    defaultValues: { brandId: "", month: "2026-11", goal: "", budget: 50000, offers: "", festivals: "", notes: "" },
  });

  useEffect(() => {
    fetch("/api/brands").then((r) => r.json()).then((d) => {
      setBrands(d.brands ?? []);
      if (d.brands?.[0]) setValue("brandId", d.brands[0].id);
    }).catch(() => {});
  }, [setValue]);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  function resetRun() {
    setActiveIdx(-1);
    setLiveLabels({});
  }

  async function onSubmit(values: BriefInput) {
    setLoading(true);
    setError("");
    resetRun();
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ? JSON.stringify(data.error) : "Brief failed");
      }
      const reader = res.body?.getReader();
      if (!reader) {
        const data = await res.json();
        router.push(`/campaigns/${data.campaignId}`);
        return;
      }
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          const ev = JSON.parse(line.slice(6)) as {
            step: string;
            label?: string;
            error?: string;
            result?: { campaignId: string };
          };
          if (ev.step === "done" && ev.result?.campaignId) {
            router.push(`/campaigns/${ev.result.campaignId}`);
            return;
          }
          if (ev.step === "error") throw new Error(ev.error ?? "Pipeline failed");
          const idx = STEPS.findIndex((s) => s.key === ev.step);
          if (idx >= 0) {
            setActiveIdx(idx);
            if (ev.label) setLiveLabels((m) => ({ ...m, [ev.step]: ev.label! }));
          }
        }
      }
      throw new Error("Connection closed before the run finished â€” check Campaigns, then retry.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
      resetRun();
    }
  }

  return (
    <div className="card mx-auto max-w-2xl p-6 sm:p-8">
      <p className="eyebrow">New brief</p>
      <h1 className="font-display mt-2 text-3xl font-bold">
        Tell the AI team <em className="text-[#3B82F6]">what to do</em>
      </h1>

      {loading ? (
        <div className="mt-6 grid gap-4">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#3B82F6]" aria-hidden />
            <p className="font-semibold text-ink">AI team is runningâ€¦</p>
            <span className="ml-auto text-xs tabular-nums text-muted">{elapsed}s</span>
          </div>
          <p className="text-sm text-muted">
            Live, agent by agent â€” do not close this page. Usually 1â€“3 minutes.
          </p>
          <ol className="grid gap-2" aria-label="AI team progress">
            {STEPS.map((s, i) => {
              const done = activeIdx > i;
              const active = activeIdx === i;
              return (
                <li
                  key={s.key}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                    active
                      ? "border-[#93C5FD] bg-brand-soft"
                      : done
                        ? "border-[#a7f3d0] bg-[#ecfdf5]"
                        : "border-border bg-[#fafbfc] opacity-60"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {done ? (
                      <CheckCircle2 size={17} className="text-[#059669]" aria-label="Done" />
                    ) : active ? (
                      <Loader2 size={17} className="animate-spin text-[#2563EB]" aria-label="Working" />
                    ) : (
                      <span className="block h-[17px] w-[17px] rounded-full border border-[#d4d9e2]" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${active ? "text-ink" : done ? "text-[#334155]" : "text-muted"}`}>
                      {active && liveLabels[s.key] ? liveLabels[s.key] : s.label}
                    </span>
                    {active && liveLabels[s.key] ? (
                      <span className="block text-xs text-muted">{s.label.split(" â€” ")[0]} is working</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm">
            Brand
            <select {...register("brandId")} className="min-h-[44px] rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]">
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.sample ? " (Sample data)" : ""}</option>
              ))}
              {brands.length === 0 ? <option value="">No brand yet</option> : null}
            </select>
            {brands.length === 0 ? <span className="text-[#F59E0B]">No brand yet â€” add one in Brand settings first.</span> : null}
            {formState.errors.brandId ? <span className="text-[#EF4444]">{formState.errors.brandId.message}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            Month (YYYY-MM)
            <input {...register("month")} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" />
            {formState.errors.month ? <span className="text-[#EF4444]">{formState.errors.month.message}</span> : null}
          </label>
          <label className="grid gap-1 text-sm">
            Goal
            <textarea {...register("goal")} rows={3} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="e.g. 50 qualified leads for web design in November" />
            {formState.errors.goal ? <span className="text-[#EF4444]">{formState.errors.goal.message}</span> : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Budget (â‚¹)
              <input type="number" {...register("budget", { valueAsNumber: true })} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" />
            </label>
            <label className="grid gap-1 text-sm">
              Festivals
              <input {...register("festivals")} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" placeholder="Diwali, ..." />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            Offers
            <input {...register("offers")} className="rounded-xl border border-border bg-white px-4 py-3 text-ink outline-none focus:border-[#93C5FD]" />
          </label>
          {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
          <button type="submit" className="btn-primary justify-center">
            Run AI team <ArrowRight size={18} aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
