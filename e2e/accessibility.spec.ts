import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have skip navigation link", async ({ page }) => {
    // Skip link should be visible on tab
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Skip to main content");
    await expect(skipLink).toBeFocused();
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    // Dashboard should have h2
    const mainHeading = page.getByRole("heading", { level: 2, name: "Dashboard" });
    await expect(mainHeading).toBeVisible();
  });

  test("should have accessible sidebar navigation", async ({ page }) => {
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();
  });

  test("should have accessible main content area", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main).toBeVisible();
  });

  test("should support keyboard navigation in sidebar", async ({ page }) => {
    // Tab through sidebar buttons
    await page.keyboard.press("Tab"); // Skip link
    await page.keyboard.press("Tab"); // Dashboard
    
    // Verify focus is on a sidebar button
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("should have proper ARIA labels on buttons", async ({ page }) => {
    // Add limit button should have aria-label
    await page.getByRole("button", { name: /limits/i }).click();
    await expect(
      page.getByRole("button", { name: /add new app limit/i })
    ).toBeVisible();
  });

  test("should announce content changes", async ({ page }) => {
    // Navigate to different sections and verify content updates
    await page.getByRole("button", { name: /history/i }).click();
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    
    // The main region should update its aria-label
    const main = page.getByRole("main");
    await expect(main).toHaveAttribute("aria-label", /History view/i);
  });
});
