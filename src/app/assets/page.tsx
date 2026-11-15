"use client";

import { useEffect, useState } from "react";
import { Download, ImageIcon } from "lucide-react";
import type { DemoAsset } from "@/lib/db/repo";

export default function AssetsPage() {
  const [assets, setAssets] = useState<DemoAsset[]>([]);
  const [q, setQ] = useState("");
  const [shownCount, setShownCount] = useState(20);

  useEffect(() => {
    fetch(`/api/assets?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setAssets(d.assets ?? []))
      .catch(() => {});
  }, [q]);

  function download(a: DemoAsset) {
    const el = document.createElement("a");
    el.href = a.url;
    el.download = `${a.id}.${a.url.startsWith("data:image/png") ? "png" : "svg"}`;
    el.click();
  }

  return (
    <div className="grid gap-4">
      <div className="card p-6 sm:p-8">
        <p className="eyebrow">Asset library Â· Sample data</p>
        <h1 className="font-display mt-2 text-3xl font-bold">
          Brand-consistent <em className="text-[#2563EB]">creatives</em>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Every visual is rendered by the template engine â€” exact headline, subtext and CTA in brand
          colors. Text is never generated inside AI imagery.
        </p>
        <input
          aria-label="Search assets"
          placeholder="Search by headline or topicâ€¦"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="mt-4 w-full max-w-md rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none focus:border-[#93C5FD]"
        />
      </div>
      {assets.length === 0 ? (
        <div className="card flex items-center gap-3 p-6 text-muted">
          <ImageIcon aria-hidden /> No creatives yet â€” run a brief first.
        </div>
      ) : (
        <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {assets.slice(0, shownCount).map((a) => (
            <figure key={a.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.headline} className="aspect-square w-full object-cover" loading="lazy" />
              <figcaption className="p-4">
                <p className="truncate text-sm font-semibold">{a.headline}</p>
                <p className="mt-1 text-xs text-muted">
                  {a.width}Ã—{a.height} Â· {a.template_id}
                </p>
                <button onClick={() => download(a)} className="btn-secondary mt-3 min-h-[44px] w-full justify-center text-sm">
                  <Download size={16} aria-hidden /> Download
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
        {assets.length > shownCount && (
          <div className="flex justify-center">
            <button className="btn-secondary" onClick={() => setShownCount((c) => c + 20)}>
              Load more ({assets.length - shownCount} remaining)
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
