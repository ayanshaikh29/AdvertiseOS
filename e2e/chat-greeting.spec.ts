import { test, expect } from "@playwright/test";

test("Chat: greeting 'hi' returns a useful response", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByText("AdvertiseOS AI Workspace").waitFor({ state: "visible" });
  await page.getByRole("textbox", { name: /message the AI team/i }).fill("hi");
  const sendBtn = page.locator("button[aria-label='Send message']");
  await sendBtn.click();
  // Wait for a reasonable response time — SSE streaming completes eventually.
  await page.getByText(/marketing|copywriter|strategist|AI marketing manager/i).first().waitFor({ state: "visible" });
  // The assistant must not show an error state.
  const errorStates = await page.evaluate(() => document.querySelectorAll(".error").length);
  expect(errorStates).toBe(0);
});

test("Chat: 'hello' greeting returns a useful response", async ({ page }) => {
  await page.goto("/");
  await page.getByText("AdvertiseOS AI Workspace").waitFor({ state: "visible" });
  await page.getByRole("textbox", { name: /message the AI team/i }).fill("hello");
  const sendBtn = page.locator("button[aria-label='Send message']");
  await sendBtn.click();
  await page.getByText(/marketing|copywriter|strategist|AI marketing manager/i).first().waitFor({ state: "visible" });
  const errorStates = await page.evaluate(() => document.querySelectorAll(".error").length);
  expect(errorStates).toBe(0);
});

test("Chat: empty input is blocked by UI", async ({ page }) => {
  await page.goto("/");
  await page.getByText("AdvertiseOS AI Workspace").waitFor({ state: "visible" });
  // Type something first, then clear the field so the send button is disabled per the composer logic.
  await page.getByRole("textbox", { name: /message the AI team/i }).fill("x");
  await page.getByRole("textbox", { name: /message the AI team/i }).fill("");
  const sendDisabled = await page.isEnabled("button[aria-label='Send message']");
  expect(sendDisabled).toBe(false);
});
