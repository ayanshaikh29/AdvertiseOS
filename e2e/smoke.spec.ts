import { test, expect } from "@playwright/test";

test("home opens the dashboard command center", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("AdvertiseOS AI Workspace")).toBeVisible();
});

test("new brief form validates", async ({ page }) => {
  await page.goto("/briefs/new");
  await expect(page.getByText("Tell the AI team")).toBeVisible();
});
