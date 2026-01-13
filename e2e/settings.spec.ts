import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /settings/i }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("should display theme settings", async ({ page }) => {
    await expect(page.getByText(/appearance/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /light/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /dark/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /system/i })).toBeVisible();
  });

  test("should switch themes", async ({ page }) => {
    // Click dark mode
    await page.getByRole("button", { name: /dark/i }).click();
    // Check if dark class is applied to html
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Click light mode
    await page.getByRole("button", { name: /light/i }).click();
    // Check if dark class is removed
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("should display notification settings", async ({ page }) => {
    await expect(page.getByText(/notifications/i).first()).toBeVisible();
  });

  test("should display break reminders settings", async ({ page }) => {
    await expect(page.getByText(/break reminders/i)).toBeVisible();
  });

  test("should display data export section", async ({ page }) => {
    await expect(page.getByText(/export data/i)).toBeVisible();
  });

  test("should display data management section", async ({ page }) => {
    await expect(page.getByText(/data management/i)).toBeVisible();
  });
});
