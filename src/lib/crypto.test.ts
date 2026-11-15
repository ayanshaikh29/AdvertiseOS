import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, secretsConfigured } from "@/lib/crypto";

const KEY = "a".repeat(64);

describe("connector token encryption", () => {
  afterEach(() => {
    delete process.env.CONNECTOR_TOKEN_KEY;
  });

  it("round-trips with a valid key", () => {
    process.env.CONNECTOR_TOKEN_KEY = KEY;
    const blob = encryptSecret("EAAG...meta-token");
    expect(blob.startsWith("v1:")).toBe(true);
    expect(blob).not.toContain("EAAG");
    expect(decryptSecret(blob)).toBe("EAAG...meta-token");
  });

  it("fails clearly without a key", () => {
    expect(secretsConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(/CONNECTOR_TOKEN_KEY/);
  });

  it("rejects tampered ciphertext", () => {
    process.env.CONNECTOR_TOKEN_KEY = KEY;
    const blob = encryptSecret("secret");
    const parts = blob.split(":");
    const tampered = [parts[0], parts[1], parts[2], Buffer.from("evil").toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
