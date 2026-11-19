import { describe, it, expect } from "vitest";
import {
  findAdminUser,
  verifyPassword,
  hashPassword,
  createSessionToken,
  verifySessionToken,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  updateAdminPassword,
} from "./adminAuth";

describe("AdvertiseOS Admin Authentication Suite", () => {
  it("initializes with default seeded admin account (admin / admin)", async () => {
    const admin = await findAdminUser("admin");
    expect(admin).not.toBeNull();
    expect(admin?.username).toBe("admin");
    expect(admin?.role).toBe("owner");

    // Must verify default password 'admin'
    const isCorrect = verifyPassword("admin", admin!.passwordHash, admin!.salt);
    expect(isCorrect).toBe(true);

    const isWrong = verifyPassword("wrongpassword", admin!.passwordHash, admin!.salt);
    expect(isWrong).toBe(false);
  });

  it("creates and verifies signed session token", async () => {
    const admin = await findAdminUser("admin");
    expect(admin).not.toBeNull();

    const token = createSessionToken(admin!, false);
    expect(token).toContain(".");

    const session = verifySessionToken(token);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(admin?.id);
    expect(session?.username).toBe("admin");
    expect(session?.role).toBe("owner");

    // Tampered token must fail
    const tampered = token.slice(0, -4) + "abcd";
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("enforces sliding-window rate limiting on repeated failed attempts", () => {
    const testIp = "192.168.1.99";
    resetRateLimit(testIp);

    // Initial check
    let rl = checkRateLimit(testIp);
    expect(rl.allowed).toBe(true);

    // Record 5 failed attempts
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(testIp);
    }

    // 6th attempt must be rejected
    rl = checkRateLimit(testIp);
    expect(rl.allowed).toBe(false);
    expect(rl.remainingAttempts).toBe(0);
    expect(rl.retryAfterSec).toBeGreaterThan(0);

    // Reset works
    resetRateLimit(testIp);
    rl = checkRateLimit(testIp);
    expect(rl.allowed).toBe(true);
  });

  it("updates admin password and clears mustChangePassword flag", async () => {
    const admin = await findAdminUser("admin");
    expect(admin).not.toBeNull();

    const newPass = "StrongAdminPass#2026";
    await updateAdminPassword(admin!.id, newPass);

    const updated = await findAdminUser("admin");
    expect(updated?.mustChangePassword).toBe(false);
    expect(verifyPassword(newPass, updated!.passwordHash, updated!.salt)).toBe(true);

    // Restore to default admin for developer predictability
    await updateAdminPassword(admin!.id, "admin");
    const restored = await findAdminUser("admin");
    expect(verifyPassword("admin", restored!.passwordHash, restored!.salt)).toBe(true);
  });
});
