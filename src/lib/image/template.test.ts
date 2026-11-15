import { describe, expect, it } from "vitest";
import { escXml, parseSize, renderCreativeSVG, wrapLines } from "@/lib/image/template";

const base = {
  headline: "Diwali Offer: 20% Off Web Design",
  subtext: "From Digital Advertise",
  cta: "DM us today",
  brandName: "Digital Advertise",
  primary: "#2563EB",
  template_id: "bold-center" as const,
  size: "1080x1080",
};

describe("template renderer", () => {
  it("embeds the exact headline, subtext, CTA and brand color", () => {
    const svg = renderCreativeSVG(base);
    expect(svg).toContain("Diwali Offer: 20% Off Web Design");
    expect(svg).toContain("DM us today");
    expect(svg).toContain("#2563EB");
    expect(svg).toContain('width="1080"');
  });

  it("escapes XML so text cannot break the image", () => {
    const svg = renderCreativeSVG({ ...base, headline: "Grow <fast> & win" });
    expect(svg).toContain("Grow &lt;fast&gt; &amp; win");
    expect(svg).not.toContain("Grow <fast>");
  });

  it("supports all templates and story size", () => {
    for (const t of ["bold-center", "split", "minimal", "festival"] as const) {
      const svg = renderCreativeSVG({ ...base, template_id: t, size: "1080x1920" });
      expect(svg).toContain('height="1920"');
    }
  });

  it("shrinks the headline font so a long line fits inside the canvas (clipping regression)", () => {
    const headline =
      "Education: 50 qualified leads for web developing. Real catalog items yo (day 1)";
    const svg = renderCreativeSVG({ ...base, headline });
    const sizeMatch = svg.match(/font-weight="800" font-size="(\d+)"/);
    expect(sizeMatch).toBeTruthy();
    const headSize = Number(sizeMatch![1]);
    const lines = [...svg.matchAll(/<tspan[^>]*>(.*?)<\/tspan>/g)].map((m) => m[1]);
    expect(lines.length).toBeGreaterThan(1);
    const longest = Math.max(...lines.map((l) => (l ?? "").length));
    // avg glyph width ≈ 0.58em — the longest line must stay within the 1080px canvas
    expect(longest * 0.58 * headSize).toBeLessThanOrEqual(1080);
    expect(headSize).toBeGreaterThanOrEqual(36);
  });
});

describe("helpers", () => {
  it("parses WxH and wraps lines", () => {
    expect(parseSize("1080x1920")).toEqual({ w: 1080, h: 1920 });
    expect(wrapLines("one two three four five", 9).length).toBeGreaterThan(1);
    expect(escXml('"a"')).toBe("&quot;a&quot;");
  });
});
