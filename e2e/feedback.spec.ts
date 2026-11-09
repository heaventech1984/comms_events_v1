import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("feedback hub", () => {
  test("leader can submit an issue", async ({ page }) => {
    await login(page, "leader");
    await page.goto("/feedback");
    await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeVisible();
    await expect(page.locator("#issues-heading")).toBeVisible();
    await expect(page.locator("#desirables-heading")).toBeVisible();
    await page.locator('section:has(#issues-heading) input[name="summary"]').fill("E2E test issue");
    await page.locator('section:has(#issues-heading) textarea[name="body"]').fill("Automated smoke submit.");
    await page.locator('section:has(#issues-heading) button[type="submit"]').click();
    await expect(page.getByText(/Saved I-/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2E test issue")).toBeVisible();
  });

  test("member sees gate message", async ({ page }) => {
    await login(page, "member");
    await page.goto("/feedback");
    await expect(page.getByText(/for admins and cell leaders/i)).toBeVisible();
  });
});
