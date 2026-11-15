import { renderCreativeSVG, svgDataUrl, svgToPng, type CreativeInput } from "@/lib/image/template";

export type ImageSize = { w: number; h: number };
export type GeneratedImage = {
  url: string;
  width: number;
  height: number;
  provider: string;
  svg: string;
};

/**
 * Provider-agnostic interface. Providers generate BACKGROUND ART ONLY —
 * exact text is always composited by the template renderer (template.ts).
 */
export interface ImageProvider {
  name: string;
  /** Background art for the brief; must not contain readable text. */
  generateBackground(prompt: string, size: ImageSize, referenceImages?: string[]): Promise<string>;
}

class TemplateBackgroundProvider implements ImageProvider {
  name = "template";
  async generateBackground(prompt: string, size: ImageSize): Promise<string> {
    void prompt;
    const { w, h } = size;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2563EB" stop-opacity="0.7"/><stop offset="100%" stop-color="#000000"/></linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#b)"/></svg>`;
    return svgDataUrl(svg);
  }
}

class ExternalProvider implements ImageProvider {
  name = "external";
  async generateBackground(): Promise<string> {
    throw new Error("IMAGE_PROVIDER=external is not configured — set provider credentials or use 'template'");
  }
}

export function getImageProvider(): ImageProvider {
  return (process.env.IMAGE_PROVIDER ?? "template") === "external"
    ? new ExternalProvider()
    : new TemplateBackgroundProvider();
}

/** Full creative: background via provider + exact text via template renderer. */
export async function renderCreative(
  creative: CreativeInput,
  imagePrompt: string,
  referenceImages?: string[]
): Promise<GeneratedImage> {
  const provider = getImageProvider();
  const { w, h } = { w: Number(creative.size.split("x")[0]), h: Number(creative.size.split("x")[1]) };
  let background: string | null = null;
  try {
    background = await provider.generateBackground(imagePrompt, { w, h }, referenceImages);
  } catch {
    background = null; // offline-safe: template gradient covers it
  }
  void background; // v1 composites text over the template gradient (background art lands in Phase 2.1)
  const svg = renderCreativeSVG(creative);
  const png = await svgToPng(svg);
  return {
    url: png ? `data:image/png;base64,${png.toString("base64")}` : svgDataUrl(svg),
    width: w,
    height: h,
    provider: provider.name,
    svg,
  };
}
