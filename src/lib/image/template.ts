/** Template renderer: ALL text inside creatives is rendered here (never by the image model). */

export const TEMPLATE_IDS = ["bold-center", "split", "minimal", "festival"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type CreativeInput = {
  headline: string;
  subtext?: string;
  cta?: string;
  brandName: string;
  primary?: string;
  template_id: TemplateId;
  size: string; // "1080x1080"
};

export function parseSize(size: string): { w: number; h: number } {
  const m = size.match(/^(\d+)x(\d+)$/);
  const w = Math.min(Number(m?.[1] ?? 1080), 2048);
  const h = Math.min(Number(m?.[2] ?? 1080), 2048);
  return { w: w || 1080, h: h || 1080 };
}

export function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Greedy word-wrap for SVG <tspan> lines. */
export function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 5);
}

export function renderCreativeSVG(input: CreativeInput): string {
  const { w, h } = parseSize(input.size);
  const primary = input.primary ?? "#2563EB";
  const headline = input.headline.slice(0, 80);
  const subtext = (input.subtext ?? "").slice(0, 200);
  const cta = (input.cta ?? "").slice(0, 60);
  const brand = input.brandName.slice(0, 40);
  const scale = w / 1080;
  const maxChars = w >= h ? 30 : 20;
  const lines = wrapLines(headline, maxChars);
  // Shrink the headline font so the LONGEST wrapped line always fits the canvas
  // (30 chars @ 84px overflowed 1080px squares — text was clipped at both edges).
  const baseSize = input.template_id === "minimal" ? 64 : 84;
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fitSize = Math.floor((w * 0.9) / (longest * 0.58));
  const headSize = Math.max(36, Math.round(Math.min(baseSize, fitSize) * scale));
  const lineHeight = Math.round(headSize * 1.12);
  const startY = Math.round(h * (input.template_id === "split" ? 0.34 : 0.42) - ((lines.length - 1) * lineHeight) / 2);

  const tspans = lines
    .map((l, i) => `<tspan x="50%" dy="${i === 0 ? 0 : lineHeight}">${escXml(l)}</tspan>`)
    .join("");

  const bg =
    input.template_id === "split"
      ? `<rect width="100%" height="42%" fill="${primary}"/><rect y="42%" width="100%" height="58%" fill="#000000"/>`
      : input.template_id === "festival"
        ? `<defs><radialGradient id="g" cx="50%" cy="30%" r="90%"><stop offset="0%" stop-color="#F59E0B" stop-opacity="0.55"/><stop offset="55%" stop-color="${primary}" stop-opacity="0.35"/><stop offset="100%" stop-color="#000000"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>`
        : `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${primary}" stop-opacity="0.8"/><stop offset="60%" stop-color="#111111"/><stop offset="100%" stop-color="#000000"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="88%" cy="12%" r="22%" fill="${primary}" opacity="0.25"/><circle cx="8%" cy="90%" r="16%" fill="#6366F1" opacity="0.25"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escXml(headline)}">
${bg}
<text x="6%" y="8%" font-family="Inter,sans-serif" font-size="${Math.round(28 * scale)}" letter-spacing="4" fill="#9CA3AF">${escXml(brand.toUpperCase())}</text>
<text x="50%" y="${startY}" text-anchor="middle" font-family="Outfit,Inter,sans-serif" font-weight="800" font-size="${headSize}" fill="#FFFFFF">${tspans}</text>
${subtext ? `<text x="50%" y="${startY + lines.length * lineHeight + Math.round(20 * scale)}" text-anchor="middle" font-family="Inter,sans-serif" font-size="${Math.round(30 * scale)}" fill="#D1D5DB">${escXml(subtext)}</text>` : ""}
${cta ? `<g><rect x="50%" y="${h - Math.round(150 * scale)}" width="${Math.round(420 * scale)}" height="${Math.round(84 * scale)}" rx="${Math.round(42 * scale)}" transform="translate(${-210 * scale},0)" fill="#FFFFFF"/><text x="50%" y="${h - Math.round(150 * scale) + Math.round(55 * scale)}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="${Math.round(32 * scale)}" fill="#000000">${escXml(cta)}</text></g>` : ""}
</svg>`;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Best-effort SVG -> PNG. Returns null when sharp is unavailable (caller keeps SVG). */
export async function svgToPng(svg: string): Promise<Buffer | null> {
  try {
    const { default: sharp } = await import("sharp");
    return await sharp(Buffer.from(svg)).png().toBuffer();
  } catch {
    return null;
  }
}
