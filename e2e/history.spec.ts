import { test, expect } from "@playwright/test";

test.describe("History", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /history/i }).click();
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  });

  test("should display date range presets", async ({ page }) => {
    await expect(page.getByRole("button", { name: /7 days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /14 days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /30 days/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /90 days/i })).toBeVisible();
  });

  test("should display stats cards", async ({ page }) => {
    await expect(page.getByText(/total time/i)).toBeVisible();
    await expect(page.getByText(/daily average/i)).toBeVisible();
  });

  test("should switch date range presets", async ({ page }) => {
    // Click 14 days
    await page.getByRole("button", { name: /14 days/i }).click();
    // Should show data for 14 days (button should be active)
    await expect(
      page.getByRole("button", { name: /14 days/i })
    ).toHaveAttribute("data-state", "on");
  });

  test("should display usage trend chart", async ({ page }) => {
    await expect(page.getByText(/daily usage trend/i)).toBeVisible();
  });

  test("should display top apps section", async ({ page }) => {
    await expect(page.getByText(/top apps/i)).toBeVisible();
  });

  test("should display category breakdown", async ({ page }) => {
    await expect(page.getByText(/category breakdown/i)).toBeVisible();
  });
});
