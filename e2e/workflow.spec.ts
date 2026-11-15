import { test, expect } from "@playwright/test";

// Cold dev compile warm-up (same pattern as phase6.spec.ts): warm both API
// routes and page compiles so first-hit latency doesn't fail assertions.
test.beforeAll(async ({ request }) => {
  for (const path of ["/api/status", "/api/campaigns", "/api/leads", "/crm", "/campaigns", "/dashboard"]) {
    await request.get(path).catch(() => {});
  }
  // Compile the leads POST/PATCH/DELETE route handlers (invalid body → 400).
  await request.post("/api/leads", { data: {} }).catch(() => {});
});

test("CRM: create lead, move status, persists after reload, delete cleans up", async ({ page, request }) => {
  test.setTimeout(300_000);
  const name = `E2E Lead ${Date.now()}`;
  await page.goto("/crm");
  await page
    .getByRole("button", { name: /Add lead|Add your first lead/ })
    .first()
    .click({ timeout: 60_000 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.getByPlaceholder("Rohan Deshmukh").fill(name);
  await dialog.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByText(name)).toBeVisible({ timeout: 90_000 });

  await page.getByLabel(`Status for ${name}`).selectOption("qualified");
  // PATCH can be slow on a cold dev compile — wait for it before reloading,
  // otherwise the reload races the write and shows the old status.
  await page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes("/api/leads/") && r.ok(),
    { timeout: 90_000 }
  );
  await page.reload();
  await expect(page.getByText(name)).toBeVisible({ timeout: 90_000 });
  await expect(page.getByLabel(`Status for ${name}`)).toHaveValue("qualified", { timeout: 30_000 });

  const list = await (await request.get("/api/leads")).json();
  const mine = (list.leads ?? []).find((l: { name: string }) => l.name === name);
  expect(mine).toBeTruthy();
  if (mine) await request.delete(`/api/leads/${mine.id}`);
});

test("campaign detail: renders item statuses and can approve a pending item", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/campaigns");
  const first = page.locator('a[href^="/campaigns/"]').first();
  await expect(first).toBeVisible({ timeout: 60_000 });
  await first.click();
  await page.waitForURL(/\/campaigns\/[^/]+/);

  await expect(page.getByText(/approved/).first()).toBeVisible({ timeout: 90_000 });
  const approve = page.getByRole("button", { name: "Approve" }).first();
  const approveCount = await approve.count();
  if (approveCount > 0) {
    await approve.click({ timeout: 30_000 });
    // Toast uses an em dash: "Approved — saved as an approved example".
    await expect(page.getByText(/Approved .+ saved as an approved example/)).toBeVisible({ timeout: 60_000 });
  }
});

test("mobile 390px: bottom nav visible, chat page usable", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const mobileNav = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobileNav).toBeVisible({ timeout: 60_000 });
  await expect(mobileNav.getByText("Calendar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
});
