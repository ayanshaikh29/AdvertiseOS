import { afterEach, describe, expect, it, vi } from "vitest";
import { computeCompleteness, fakeConnectorsEnabled, getConnector, realConnectorEnabled } from "@/lib/connectors/registry";
import { CONNECTOR_PROVIDERS } from "@/lib/connectors/types";

describe("connector registry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns labeled sample connectors by default", () => {
    vi.stubEnv("FEATURE_FAKE_CONNECTORS", "true");
    for (const p of CONNECTOR_PROVIDERS) {
      const c = getConnector(p);
      expect(c.sample).toBe(true);
      expect(c.label).toBeTruthy();
    }
  });

  it("returns unconfigured stubs when fake connectors are off and no creds", () => {
    vi.stubEnv("FEATURE_FAKE_CONNECTORS", "false");
    vi.stubEnv("FEATURE_META_CONNECTOR", "");
    const c = getConnector("meta");
    expect(c.sample).toBe(false);
  });

  it("fake connectors report ok sample test results", async () => {
    vi.stubEnv("FEATURE_FAKE_CONNECTORS", "true");
    const c = getConnector("ga4");
    const res = await c.testConnection({ account: { id: "a", label: c.label, scopes: [] } });
    expect(res.ok).toBe(true);
    expect(res.sample).toBe(true);
    expect(res.message).toMatch(/sample/i);
  });

  it("sample pulls are clearly sample data", async () => {
    vi.stubEnv("FEATURE_FAKE_CONNECTORS", "true");
    const c = getConnector("meta");
    const posts = await c.pullPosts!({ account: { id: "a", label: "x", scopes: [] } }, new Date());
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0]?.caption).toMatch(/sample/i);
  });

  it("real connector flags stay off without credentials", () => {
    vi.stubEnv("FEATURE_META_CONNECTOR", "true");
    vi.stubEnv("META_APP_SECRET", "");
    expect(realConnectorEnabled("meta")).toBe(false);
    vi.stubEnv("FEATURE_META_CONNECTOR", "");
    expect(fakeConnectorsEnabled()).toBe(true);
  });
});

describe("data completeness score", () => {
  it("scores 0 with nothing connected and 100 with everything", () => {
    expect(computeCompleteness(new Set()).score).toBe(0);
    expect(computeCompleteness(new Set(CONNECTOR_PROVIDERS)).score).toBe(100);
  });

  it("names the next unlock when something is missing", () => {
    const { score, missing } = computeCompleteness(new Set(["meta" as const]));
    expect(score).toBe(25);
    expect(missing.some((m) => m.provider === "ga4" && /traffic/.test(m.unlocks))).toBe(true);
  });
});
