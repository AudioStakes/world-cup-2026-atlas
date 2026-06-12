import { expect, type Page, test } from "@playwright/test";

async function expectVenueMarkerAlignment(page: Page, venueId: string) {
  const anchor = page.locator(`[data-venue-anchor-id="${venueId}"]`);
  const control = page.locator(`.venue-marker-control[data-venue-id="${venueId}"]`);

  await expect
    .poll(async () => {
      const anchorBox = await anchor.boundingBox();
      const controlBox = await control.boundingBox();

      if (!anchorBox || !controlBox) {
        return Number.POSITIVE_INFINITY;
      }

      const deltaX = Math.abs(
        anchorBox.x + anchorBox.width / 2 - (controlBox.x + controlBox.width / 2),
      );
      const deltaY = Math.abs(
        anchorBox.y + anchorBox.height / 2 - (controlBox.y + controlBox.height / 2),
      );

      return Math.max(deltaX, deltaY);
    })
    .toBeLessThanOrEqual(1);
}

async function setBrowserToday(page: Page, dateIso: string) {
  await page.addInitScript((fixedNow) => {
    Date.now = () => new Date(fixedNow).getTime();
  }, `${dateIso}T12:00:00`);
}

test.describe("World Cup 2026 Atlas explorer", () => {
  test("starts from today's tournament date when no URL query present", async ({ page }) => {
    await setBrowserToday(page, "2026-06-12");
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Jun 12" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Select Fri Jun 12/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(page.getByText("/?date=2026-06-12")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /clear/i })).toHaveCount(0);

    const splitHeights = await page.evaluate(() => {
      const result = document.querySelector(".result-card")?.getBoundingClientRect();
      const map = document.querySelector(".map-panel")?.getBoundingClientRect();

      return {
        map: map?.height ?? 0,
        result: result?.height ?? 0,
      };
    });

    expect(Math.abs(splitHeights.result - splitHeights.map)).toBeLessThanOrEqual(1);
  });

  test("restores a country selection from the URL query", async ({ page }) => {
    await page.goto("/?country=jpn");

    await expect(page).toHaveURL(/country=jpn/);
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("selects team groups from the readable groups table", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Japan" }).click();

    await expect(page).toHaveURL(/country=jpn/);
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Groups & Teams" }).getByText("JPN")).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("region", { name: "Groups & Teams" }).getByText("Japan"),
    ).toBeVisible();
  });

  test("selects a date and shows that day's fixture details", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select Tue Jun 16/ }).click();

    await expect(page).toHaveURL(/date=2026-06-16/);
    await expect(page.getByRole("button", { name: /Select Tue Jun 16/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Jun 16" })).toBeVisible();
    await expect(
      page.locator(".detail-metrics").getByText("4 matches", { exact: true }),
    ).toBeVisible();
  });

  test("selects a venue from the map", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select venue Dallas/ }).click();

    await expect(page).toHaveURL(/venue=dallas/);
    await expect(page.getByRole("heading", { name: "Dallas" })).toBeVisible();
    await expect(
      page.locator(".detail-metrics").getByText("Arlington, USA", { exact: true }),
    ).toBeVisible();
  });

  test("keeps HTML venue controls aligned to SVG marker centers across resize changes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await expectVenueMarkerAlignment(page, "dallas");

    await page.setViewportSize({ width: 430, height: 932 });
    await expectVenueMarkerAlignment(page, "dallas");

    await page.setViewportSize({ width: 932, height: 430 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("orientationchange"));
    });
    await expectVenueMarkerAlignment(page, "dallas");
  });

  test("keeps dense East Coast venue controls clickable at their own centers", async ({ page }) => {
    const viewports = [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/?country=bos");

      for (const venueId of ["toronto", "boston", "new-york-new-jersey", "philadelphia"]) {
        await expectVenueMarkerAlignment(page, venueId);
        await page.locator(`.venue-marker-control[data-venue-id="${venueId}"]`).click();
        await expect(page).toHaveURL(new RegExp(`venue=${venueId}`));
      }
    }
  });
});
