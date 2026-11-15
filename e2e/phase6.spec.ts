import { test, expect } from "@playwright/test";

// Warm Next dev-server routes (API + page compiles): a cold first-hit compile
// can exceed the expect() timeouts below and fail the run spuriously.
test.beforeAll(async ({ request }) => {
  for (const path of [
    "/api/status",
    "/api/integrations",
    "/api/team/scores",
    "/api/audit",
    "/settings",
    "/voice",
    "/integrations",
    "/catalog",
    "/autopilot",
  ]) {
    await request.get(path).catch(() => {});
  }
});

test("Integrations Data Health shows completeness and sample connectors", async ({ page }) => {
  await page.goto("/integrations");
  await expect(page.getByText("Business Brain completeness")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Sample data", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Test connection").first()).toBeVisible({ timeout: 60_000 });
});

test("sample connector test returns a labeled result", async ({ page }) => {
  await page.goto("/integrations");
  const firstTest = page.getByRole("button", { name: "Test connection" }).first();
  await firstTest.click();
  await expect(page.getByText(/OK|FAILED/).first()).toBeVisible({ timeout: 60_000 });
});

test("settings reports the LLM mode honestly", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText(/LLM: (Gemini|Sample data)/)).toBeVisible({ timeout: 60_000 });
});

test("catalog page renders with add + sync actions", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByText("What you", { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Add item" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync from website" })).toBeVisible();
});

test("autopilot page exposes trends, run week and publish tick", async ({ page }) => {
  await page.goto("/autopilot");
  await expect(page.getByText("Plan from", { exact: false })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Refresh trends" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run autopilot week" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run publish tick" })).toBeVisible();
});

test("voice assistant answers a read-only command", async ({ page }) => {
  await page.goto("/voice");
  await expect(page.getByText("Ask your", { exact: false })).toBeVisible();
  const input = page.getByPlaceholder("How are my approvals?");
  await input.waitFor({ timeout: 60_000 });
  await input.fill("how are my approvals");
  await page.getByRole("button", { name: "Ask" }).click();
  // Eyebrow is CSS-uppercased (text-transform) — match case-insensitively.
  await expect(page.getByText(/waiting for your approval|inbox is empty/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/answer .*approvals/i)).toBeVisible({ timeout: 30_000 });
});
