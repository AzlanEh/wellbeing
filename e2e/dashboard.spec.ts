import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display stats cards", async ({ page }) => {
    // Check for stat cards presence
    await expect(page.getByText(/Today's Usage/i).first()).toBeVisible();
    await expect(page.getByText(/Active Apps/i).first()).toBeVisible();
    await expect(page.getByText(/Weekly Total/i).first()).toBeVisible();
  });

  test("should display usage charts", async ({ page }) => {
    // Check for chart tabs
    await expect(page.getByRole("tab", { name: /weekly/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /timeline/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /category/i })).toBeVisible();
  });

  test("should switch between chart tabs", async ({ page }) => {
    // Click Timeline tab
    await page.getByRole("tab", { name: /timeline/i }).click();
    // Check tab is selected
    await expect(page.getByRole("tab", { name: /timeline/i })).toHaveAttribute(
      "data-state",
      "active"
    );

    // Click Category tab
    await page.getByRole("tab", { name: /category/i }).click();
    await expect(page.getByRole("tab", { name: /category/i })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  test("should display app usage list section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /App Usage Today/i })
    ).toBeVisible();
  });

  test("should display app breakdown pie chart", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /App Breakdown/i })
    ).toBeVisible();
  });
});
