import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as path from "path";
import * as fs from "fs";

test.describe("Resumio FFCS Full User Journey", () => {
  const screensDir = path.resolve(process.cwd(), "../docs/screens");

  test.beforeAll(() => {
    if (!fs.existsSync(screensDir)) {
      fs.mkdirSync(screensDir, { recursive: true });
    }
  });

  test("planner, generation, favourites, re-open, match resolution, and responsive screenshots", async ({
    page
  }, testInfo) => {
    const projectName = testInfo.project.name;
    const widthSuffix = projectName.includes("1440")
      ? "1440"
      : projectName.includes("768")
      ? "768"
      : "375";

    // 1. Visit homepage
    await page.goto("/");
    await expect(page.locator("text=Resumio FFCS").first()).toBeVisible();

    // 2. Accessibility audit on Planner page
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // Optional fine-tuning for dark mode badges
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // 3. Capture Planner Screenshot
    await page.screenshot({
      path: path.join(screensDir, `planner_${widthSuffix}.png`),
      fullPage: false
    });

    // 4. Select Courses (up to 4 conflict-free courses from real dataset)
    // E.g. CS101 (or first 3 available courses)
    const selectButtons = page.locator("button[aria-label^='Select']");
    const count = await selectButtons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(3, count); i++) {
      await selectButtons.nth(i).click();
    }

    // 5. Generate schedules
    const generateBtn = page.locator("button:has-text('Generate Schedules')");
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Wait for Results View
    await expect(page.locator("text=Live Client Filters:").first()).toBeVisible({
      timeout: 15000
    });

    // 6. Capture Timetable Screenshot
    await page.screenshot({
      path: path.join(screensDir, `timetable_${widthSuffix}.png`),
      fullPage: false
    });

    // 7. Favourite the current timetable
    const favBtn = page.locator("button[aria-label='Bookmark this timetable']");
    await expect(favBtn).toBeVisible({ timeout: 8000 });
    await favBtn.click();

    // In modal, click "Save to Favourites"
    const saveModalBtn = page.locator("button:has-text('Save to Favourites')");
    await expect(saveModalBtn).toBeVisible({ timeout: 5000 });
    await saveModalBtn.click();
    await expect(page.locator("text=Save Timetable to Favourites")).not.toBeVisible({ timeout: 6000 });

    // 8. Go to Favourites tab (desktop header or mobile bottom bar)
    const favTabBtn = projectName.includes("Mobile")
      ? page.locator("nav.md\\:hidden button:has-text('Starred')")
      : page.locator("header button:has-text('Favourites')");
    await favTabBtn.click();
    await expect(page.locator("text=Bookmarked & Favourite Timetables")).toBeVisible();

    // Reload page to verify persistence in SQLite backend
    await page.reload();
    const favTabAfterReload = projectName.includes("Mobile")
      ? page.locator("nav.md\\:hidden button:has-text('Starred')")
      : page.locator("header button:has-text('Favourites')");
    await favTabAfterReload.click();
    await expect(page.locator("text=Re-open in Planner").first()).toBeVisible({ timeout: 8000 });

    // 9. Re-open in Planner
    await page.locator("button:has-text('Re-open in Planner')").first().click();
    await expect(page.locator("text=FFCS Timetable Planner")).toBeVisible();

    // 10. Visit Faculty Directory & Capture Screenshot
    const facTabBtn = projectName.includes("Mobile")
      ? page.locator("nav.md\\:hidden button:has-text('Faculty')")
      : page.locator("header button:has-text('Faculty & Reviews')");
    await facTabBtn.click();
    await expect(page.locator("text=Faculty Directory & Reviews")).toBeVisible();

    await page.screenshot({
      path: path.join(screensDir, `faculty_${widthSuffix}.png`),
      fullPage: false
    });

    // 11. Match Resolution Page
    const matchTabBtn = projectName.includes("Mobile")
      ? page.locator("nav.md\\:hidden button:has-text('Queue')")
      : page.locator("header button:has-text('Match Queue')");
    await matchTabBtn.click();
    await expect(page.locator("text=Human Review: Match Resolution Queue")).toBeVisible();

    // If queue has items, resolve one
    const acceptBtns = page.locator("button:has-text('Accept Candidate')");
    if ((await acceptBtns.count()) > 0) {
      await acceptBtns.first().click();
      await expect(page.locator("text=Affected faculty ratings recalculated")).toBeVisible({
        timeout: 5000
      });
    }

    if (widthSuffix === "1440") {
      await page.screenshot({
        path: path.join(screensDir, `matches_1440.png`),
        fullPage: false
      });
    }
  });
});
