import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FakeLLMProvider } from "@/lib/llm/fake";
import { getLLM, llmMode, OfflineLLMError } from "@/lib/llm";

describe("FakeLLMProvider (sample data)", () => {
  const p = new FakeLLMProvider();

  it("is labeled sample", () => {
    expect(p.sample).toBe(true);
    expect(p.name).toBe("fake");
  });

  it("throws OfflineLLMError on json/text so runners use their fallback", async () => {
    await expect(p.json({ system: "s", user: "u", schema: z.object({ ok: z.boolean() }) })).rejects.toBeInstanceOf(OfflineLLMError);
    await expect(p.text({ system: "s", user: "u" })).rejects.toBeInstanceOf(OfflineLLMError);
  });

  it("returns deterministic normalized embeddings of the requested dims", async () => {
    const [a] = await p.embed(["hello"]);
    const [b] = await p.embed(["hello"]);
    const [c] = await p.embed(["different"]);
    expect(a).toHaveLength(768);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    const norm = Math.sqrt((a ?? []).reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 3);
  });

  it("returns labeled sample image art", async () => {
    const img = await p.image({ prompt: "diya glow", size: "1080x1080" });
    expect(img.sample).toBe(true);
    expect(img.mimeType).toBe("image/svg+xml");
    expect(Buffer.from(img.base64, "base64").toString("utf8")).toContain("Sample data");
  });

  it("reports TTS unsupported", async () => {
    const tts = await p.tts!({ text: "namaste" });
    expect(tts.unsupported).toBe(true);
  });
});

describe("provider factory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("LLM_PROVIDER=fake returns the sample provider", async () => {
    vi.stubEnv("LLM_PROVIDER", "fake");
    vi.resetModules();
    const mod = await import("@/lib/llm");
    expect(mod.getLLM().name).toBe("fake");
    expect(mod.llmMode()).toBe("sample");
  });

  it("no key and no provider -> sample mode", async () => {
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.resetModules();
    const mod = await import("@/lib/llm");
    expect(mod.getLLM().sample).toBe(true);
    expect(mod.llmMode()).toBe("sample");
  });

  it("LLM_PROVIDER=gemini with key -> gemini provider", async () => {
    vi.stubEnv("LLM_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.resetModules();
    const mod = await import("@/lib/llm");
    const llm = mod.getLLM();
    expect(llm.name).toBe("gemini");
    expect(llm.sample).toBe(false);
    expect(mod.llmMode()).toBe("gemini");
  });
});
