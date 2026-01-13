import { test, expect } from "@playwright/test";

test.describe("Goals", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /goals/i }).click();
    await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  });

  test("should display goals overview stats", async ({ page }) => {
    // Check for stats cards
    await expect(page.getByText(/current streak/i)).toBeVisible();
    await expect(page.getByText(/best streak/i)).toBeVisible();
  });

  test("should display add goal button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /add goal/i })
    ).toBeVisible();
  });

  test("should open add goal dialog", async ({ page }) => {
    await page.getByRole("button", { name: /add goal/i }).click();
    await expect(
      page.getByRole("heading", { name: /add new goal/i })
    ).toBeVisible();
  });

  test("should display goal types in dialog", async ({ page }) => {
    await page.getByRole("button", { name: /add goal/i }).click();
    
    // Check for goal type options
    await expect(page.getByText(/daily limit/i)).toBeVisible();
    await expect(page.getByText(/app limit/i)).toBeVisible();
  });

  test("should close add goal dialog on cancel", async ({ page }) => {
    await page.getByRole("button", { name: /add goal/i }).click();
    await expect(
      page.getByRole("heading", { name: /add new goal/i })
    ).toBeVisible();

    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /add new goal/i })
    ).not.toBeVisible();
  });

  test("should display achievements section", async ({ page }) => {
    await expect(page.getByText(/achievements/i)).toBeVisible();
  });
});
