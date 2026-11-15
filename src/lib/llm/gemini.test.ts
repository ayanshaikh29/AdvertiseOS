import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { GenerateContentResponse } from "@google/genai";
import { classifyGeminiError, extractSources } from "@/lib/llm/gemini";
import { mapSizeToAspectRatio, toGeminiJsonSchema } from "@/lib/llm/jsonSchema";

describe("zod -> Gemini JSON schema", () => {
  it("produces a Gemini-supported object schema without $schema", () => {
    const schema = z.object({
      score: z.number().min(0).max(100),
      passed: z.boolean(),
      issues: z.array(z.object({ severity: z.enum(["low", "high"]), text: z.string() })),
    });
    const out = toGeminiJsonSchema(schema) as Record<string, unknown>;
    expect(out.$schema).toBeUndefined();
    expect(out.type).toBe("object");
    const props = out.properties as Record<string, { type?: string }>;
    expect(props.score?.type).toBe("number");
    expect(props.passed?.type).toBe("boolean");
    expect(props.issues?.type).toBe("array");
    expect(out.required).toEqual(expect.arrayContaining(["score", "passed", "issues"]));
  });

  it("inlines refs (no $ref strategy)", () => {
    const inner = z.object({ a: z.string() });
    const outer = z.object({ inner });
    const out = toGeminiJsonSchema(outer) as { properties: Record<string, { type?: string; properties?: unknown }> };
    expect(out.properties.inner?.type).toBe("object");
    expect(out.properties.inner?.properties).toBeTruthy();
  });
});

describe("image size -> aspect ratio", () => {
  it("maps the four creative placements", () => {
    expect(mapSizeToAspectRatio("1080x1080")).toBe("1:1");
    expect(mapSizeToAspectRatio("1080x1350")).toBe("3:4");
    expect(mapSizeToAspectRatio("1080x1920")).toBe("9:16");
    expect(mapSizeToAspectRatio("1200x628")).toBe("16:9");
  });

  it("falls back to 1:1 on garbage", () => {
    expect(mapSizeToAspectRatio("bogus")).toBe("1:1");
  });
});

describe("Gemini error classification", () => {
  it("classifies quota, auth, retry, fatal", () => {
    expect(classifyGeminiError(new Error("429 RESOURCE_EXHAUSTED: Quota exceeded"))).toBe("quota");
    expect(classifyGeminiError(new Error("401 API_KEY_INVALID: API key not valid"))).toBe("auth");
    expect(classifyGeminiError(new Error("503 UNAVAILABLE: The model is overloaded"))).toBe("retry");
    expect(classifyGeminiError(new Error("400 BAD_REQUEST: unsupported field"))).toBe("fatal");
    expect(classifyGeminiError({ status: 502, message: "bad gateway" })).toBe("retry");
  });
});

describe("grounding source extraction", () => {
  it("keeps web source URLs and dedupes", () => {
    const res = {
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: "https://example.com/a", title: "A" } },
              { web: { uri: "https://example.com/a", title: "A dup" } },
              { web: { uri: "https://example.com/b", title: "B" } },
              {},
            ],
          },
        },
      ],
    } as unknown as GenerateContentResponse;
    const sources = extractSources(res);
    expect(sources).toEqual([
      { uri: "https://example.com/a", title: "A" },
      { uri: "https://example.com/b", title: "B" },
    ]);
  });

  it("returns empty for no grounding", () => {
    expect(extractSources({ candidates: [{ content: {} }] } as unknown as GenerateContentResponse)).toEqual([]);
  });
});
