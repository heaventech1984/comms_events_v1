import { test, expect } from "@playwright/test";
import { dismissAttendancePrompt, login } from "./helpers";

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth
    };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("mobile matrix layouts", () => {
  test("home / month / week / bookings do not overflow; month agenda present", async ({ page }, testInfo) => {
    await login(page, "member");

    await page.goto("/");
    await dismissAttendancePrompt(page);
    await expect(page.getByTestId("home-dashboard")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const isWideDesktop = testInfo.project.name === "firefox-desktop" || testInfo.project.name === "chromium-desktop";
    // Tab bar appears under 900px (phones, landscape, tablet). Desktop projects keep top nav only.
    if (!isWideDesktop) {
      await expect(page.locator(".tab-bar")).toBeVisible();
    }

    await page.goto("/calendar?view=month");
    await dismissAttendancePrompt(page);
    await expect(page.getByTestId("month-grid")).toBeVisible();
    await expect(page.getByTestId("month-day-agenda")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const dayLink = page.locator("a.daynum").filter({ hasNotText: /^$/ }).nth(10);
    await expect(dayLink).toBeVisible();
    const href = await dayLink.getAttribute("href");
    expect(href).toMatch(/view=month/);
    expect(href).toMatch(/d=\d{4}-\d{2}-\d{2}/);
    await dayLink.click();
    await dismissAttendancePrompt(page);
    await expect(page).toHaveURL(/view=month/);
    await expect(page.getByTestId("month-day-agenda")).toBeVisible();

    // Month cells use dots, not chopped time+title. Full titles live in the day agenda.
    await expect(page.locator(".month-event-list")).toHaveCount(0);

    await page.goto("/calendar?view=week");
    await dismissAttendancePrompt(page);
    await expect(page.getByTestId("week-time-grid")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const scroll = page.locator(".week-time-scroll");
    if (await scroll.isVisible()) {
      const touchAction = await scroll.evaluate((el) => getComputedStyle(el).touchAction);
      expect(touchAction).toMatch(/pan-x/);
    }

    await page.goto("/bookings");
    await dismissAttendancePrompt(page);
    await assertNoHorizontalOverflow(page);

    await page.goto("/calendar?view=list");
    await dismissAttendancePrompt(page);
    const eventLink = page.locator('a[href^="/events/"]').filter({ hasNotText: /add/i }).first();
    if (await eventLink.isVisible().catch(() => false)) {
      await eventLink.click();
      await dismissAttendancePrompt(page);
      await expect(page).toHaveURL(/\/events\//);
      await assertNoHorizontalOverflow(page);
    }

    // Manifest is linked for install / Add to Home Screen (no service worker).
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute("href", /manifest\.webmanifest/);
  });
});
