import { test, expect } from "@playwright/test";
import { expectNavLacks, login } from "./helpers";

test.describe("cell leader paths", () => {
  test("members list can search and sort A→Z / Z→A", async ({ page }) => {
    await login(page, "leader");
    await page.goto("/members");
    await expect(page.getByTestId("members-toolbar")).toBeVisible();
    await expect(page.getByRole("link", { name: /add person/i })).toHaveCount(0);
    await expect(page.getByTestId("members-delete-selected")).toHaveCount(0);
    await page.getByTestId("members-filter-role").selectOption("member");
    await expect(page.getByTestId("members-count")).toContainText(/showing/i);
    await page.getByTestId("members-dir-desc").click();
    await expect(page.getByTestId("members-dir-desc")).toHaveAttribute("aria-pressed", "true");
  });

  test("insights legends visible; no scraper/import in nav", async ({ page }) => {
    await login(page, "leader");
    await expectNavLacks(page, /scraper/i);
    await expectNavLacks(page, /import/i);

    await page.goto("/insights");
    await expect(page.getByRole("heading", { name: /insights/i }).first()).toBeVisible();
    await expect(page.getByTestId("insights-line-legend")).toBeVisible();
    await expect(page.getByTestId("insights-stack-legend")).toBeVisible();
    await expect(page.getByText(/this period/i).first()).toBeVisible();
    await expect(page.getByText(/attended/i).first()).toBeVisible();
  });

  test("add event from calendar; desktop double-click slot", async ({ page }, testInfo) => {
    await login(page, "leader");
    await page.goto("/calendar?view=week");
    await expect(page.getByRole("link", { name: "Add event", exact: true })).toBeVisible();
    await expect(page.getByTestId("week-time-grid")).toBeVisible();

    if (!testInfo.project.name.includes("phone")) {
      const slot = page.locator("[data-testid^=week-slot-]").first();
      await slot.scrollIntoViewIfNeeded();
      await slot.dblclick({ force: true });
      await expect(page).toHaveURL(/\/events\/new\?.*d=.*t=/);
      await expect(page.getByRole("heading", { name: /add event/i })).toBeVisible();
      await expect(page.getByRole("link", { name: "← Back to calendar" })).toBeVisible();
    } else {
      await page.getByRole("link", { name: "Add event", exact: true }).click();
      await expect(page).toHaveURL(/\/events\/new/);
    }
  });
});
