import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display Dashboard by default", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Overview of your digital activity")).toBeVisible();
  });

  test("should navigate to History via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /history/i }).click();
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  });

  test("should navigate to Goals via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /goals/i }).click();
    await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  });

  test("should navigate to App Limits via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /limits/i }).click();
    await expect(page.getByRole("heading", { name: "App Limits" })).toBeVisible();
  });

  test("should navigate to Settings via sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /settings/i }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("should navigate using keyboard shortcuts", async ({ page }) => {
    // Navigate to History (Ctrl+2)
    await page.keyboard.press("Control+2");
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

    // Navigate to Goals (Ctrl+3)
    await page.keyboard.press("Control+3");
    await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();

    // Navigate to Limits (Ctrl+4)
    await page.keyboard.press("Control+4");
    await expect(page.getByRole("heading", { name: "App Limits" })).toBeVisible();

    // Navigate to Settings (Ctrl+5)
    await page.keyboard.press("Control+5");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Back to Dashboard (Ctrl+1)
    await page.keyboard.press("Control+1");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
