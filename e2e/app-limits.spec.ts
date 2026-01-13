import { test, expect } from "@playwright/test";

test.describe("App Limits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /limits/i }).click();
    await expect(page.getByRole("heading", { name: "App Limits" })).toBeVisible();
  });

  test("should display add limit button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /add new limit/i })
    ).toBeVisible();
  });

  test("should open add limit dialog", async ({ page }) => {
    await page.getByRole("button", { name: /add new limit/i }).click();
    await expect(
      page.getByRole("heading", { name: /add usage limit/i })
    ).toBeVisible();
    await expect(page.getByPlaceholder(/search apps/i)).toBeVisible();
  });

  test("should close add limit dialog on cancel", async ({ page }) => {
    await page.getByRole("button", { name: /add new limit/i }).click();
    await expect(
      page.getByRole("heading", { name: /add usage limit/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /add usage limit/i })
    ).not.toBeVisible();
  });

  test("should have time limit slider", async ({ page }) => {
    await page.getByRole("button", { name: /add new limit/i }).click();
    
    // Check for quick time options
    await expect(page.getByRole("button", { name: "15m" })).toBeVisible();
    await expect(page.getByRole("button", { name: "30m" })).toBeVisible();
    await expect(page.getByRole("button", { name: "1h" })).toBeVisible();
    await expect(page.getByRole("button", { name: "2h" })).toBeVisible();
  });

  test("should have hard block checkbox", async ({ page }) => {
    await page.getByRole("button", { name: /add new limit/i }).click();
    
    await expect(page.getByLabel(/hard block/i)).toBeVisible();
  });
});
