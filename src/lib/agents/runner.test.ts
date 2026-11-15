import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runAgent } from "@/lib/agents/runner";
import { SAMPLE_BRAND } from "@/lib/brand";

describe("agent runner", () => {
  it("falls back offline and still validates", async () => {
    const { data, run } = await runAgent({
      agent: "ceo",
      brand: SAMPLE_BRAND,
      task: "plan",
      schema: z.object({ ok: z.boolean() }),
      system: "test",
      fallback: () => ({ ok: true }),
    });
    expect(data.ok).toBe(true);
    expect(run.status).toBe("fallback");
  });
});
