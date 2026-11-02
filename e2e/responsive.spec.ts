import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", name: "landing" },
  { path: "/app", name: "overview" },
  { path: "/agents", name: "procurement" },
  { path: "/audit", name: "audit" },
];

test("landing and workspace pages render without horizontal overflow at mobile, tablet, and desktop widths", async ({ page }) => {
  test.setTimeout(60_000);
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const item of pages) {
      await page.goto(item.path);
      await expect(page.locator("body")).toBeVisible();
      const viewport = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
      expect(viewport.scroll, `${item.name} overflows at ${width}px`).toBeLessThanOrEqual(viewport.width);
      await page.screenshot({ path: `test-results/ui-${item.name}-${width}.png`, fullPage: true });
    }
  }
});
