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

async function clickVenueControlCenter(page: Page, venueId: string) {
  const control = page.locator(`.venue-marker-control[data-venue-id="${venueId}"]`);

  await control.scrollIntoViewIfNeeded();

  const controlBox = await control.boundingBox();

  if (!controlBox) {
    throw new Error(`Expected ${venueId} venue control to be visible`);
  }

  await page.mouse.click(controlBox.x + controlBox.width / 2, controlBox.y + controlBox.height / 2);
}

async function setBrowserToday(page: Page, dateIso: string) {
  await page.addInitScript((fixedNow) => {
    Date.now = () => new Date(fixedNow).getTime();
  }, `${dateIso}T12:00:00`);
}

test.describe("World Cup 2026 Atlas explorer", () => {
  test("@smoke starts from today's tournament date when no URL query present", async ({ page }) => {
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

  test("@smoke restores a country selection from the URL query", async ({ page }) => {
    await page.goto("/?country=jpn");

    await expect(page).toHaveURL(/country=jpn/);
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("@smoke selects team groups from the readable groups table", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Japan" }).click();

    await expect(page).toHaveURL(/country=jpn/);
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Groups & Teams" }).getByText("JPN")).toHaveCount(
      1,
    );
    await expect(
      page.getByRole("region", { name: "Groups & Teams" }).getByRole("button", {
        name: "Select Japan",
      }),
    ).toBeVisible();
  });

  test("@smoke keeps a selected filter active when clicked again", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Japan" }).click();
    await expect(page).toHaveURL(/country=jpn/);

    await page.getByRole("button", { name: "Select Japan" }).click();

    await expect(page).toHaveURL(/country=jpn/);
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("Start exploring")).toHaveCount(0);
  });

  test("@smoke keeps every Groups & Teams country flag visible across viewport sizes", async ({
    page,
  }) => {
    const viewports = [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 320, height: 568 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await page.getByRole("region", { name: "Groups & Teams" }).scrollIntoViewIfNeeded();

      const flagVisibility = await page.evaluate(() => {
        const viewport = {
          bottom: window.innerHeight,
          left: 0,
          right: window.innerWidth,
          top: 0,
        };
        const flags = Array.from(document.querySelectorAll(".group-team-flag"));

        return {
          hiddenFlags: flags.filter((flag) => {
            const rect = flag.getBoundingClientRect();

            return (
              rect.width === 0 ||
              rect.height === 0 ||
              rect.left < viewport.left ||
              rect.right > viewport.right ||
              rect.top < viewport.top ||
              rect.bottom > viewport.bottom
            );
          }).length,
          totalFlags: flags.length,
        };
      });

      expect(flagVisibility.totalFlags).toBe(48);
      expect(flagVisibility.hiddenFlags).toBe(0);
    }
  });

  test("@smoke gives Groups & Teams flags larger targets when space allows", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.getByRole("region", { name: "Groups & Teams" }).scrollIntoViewIfNeeded();

    const targetSize = await page.evaluate(() => {
      const button = document.querySelector(".group-team-row-button:not(.is-placeholder)");
      const flag = document.querySelector(".group-team-flag");
      const buttonRect = button?.getBoundingClientRect();
      const flagRect = flag?.getBoundingClientRect();

      return {
        buttonHeight: buttonRect?.height ?? 0,
        flagWidth: flagRect?.width ?? 0,
      };
    });

    expect(targetSize.buttonHeight).toBeGreaterThanOrEqual(28);
    expect(targetSize.flagWidth).toBeGreaterThanOrEqual(24);
  });

  test("@smoke keeps Groups & Teams compact when panels stack", async ({ page }) => {
    await page.setViewportSize({ width: 596, height: 1451 });
    await page.goto("/?date=2026-06-20");

    const compactLayout = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>(".groups-section");
      const grid = section?.querySelector<HTMLElement>(".group-team-grid");
      const firstCopy = grid?.querySelector<HTMLElement>(".group-team-copy");
      const firstName = grid?.querySelector<HTMLElement>(".group-team-name");
      const cards = Array.from(grid?.querySelectorAll<HTMLElement>(".group-team-card") ?? []);
      const flags = Array.from(grid?.querySelectorAll<HTMLElement>(".group-team-flag") ?? []);
      const gridStyles = grid ? getComputedStyle(grid) : null;
      const sectionRect = section?.getBoundingClientRect();
      const rowTops = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)));
      const firstNameRect = firstName?.getBoundingClientRect();

      return {
        columns:
          gridStyles?.gridTemplateColumns.split(" ").filter((column) => column.trim().length > 0)
            .length ?? 0,
        copyDisplay: firstCopy ? getComputedStyle(firstCopy).display : "",
        flagCount: flags.length,
        hiddenFlags: flags.filter((flag) => {
          const rect = flag.getBoundingClientRect();

          return rect.width === 0 || rect.height === 0;
        }).length,
        nameWidth: firstNameRect?.width ?? 0,
        rowCount: rowTops.size,
        sectionHeight: sectionRect?.height ?? 0,
      };
    });

    expect(compactLayout.columns).toBe(4);
    expect(compactLayout.rowCount).toBeLessThanOrEqual(3);
    expect(compactLayout.copyDisplay).toBe("none");
    expect(compactLayout.nameWidth).toBe(0);
    expect(compactLayout.sectionHeight).toBeLessThanOrEqual(220);
    expect(compactLayout.flagCount).toBe(48);
    expect(compactLayout.hiddenFlags).toBe(0);
  });

  test("@smoke selects a date and starts the fixture timeline on that date", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select Tue Jun 16/ }).click();

    await expect(page).toHaveURL(/date=2026-06-16/);
    await expect(page.getByRole("button", { name: /Select Tue Jun 16/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("#selection-results")).toHaveClass(/result-card--date-timeline/);
    await expect(page.locator(".result-card__header")).toHaveCount(0);
    await expect(page.locator(".detail-metrics")).toHaveCount(0);

    const timelineState = await page.evaluate(() => {
      const list = document.querySelector<HTMLElement>(".match-list");
      const scrollTarget = document.querySelector<HTMLElement>("[data-initial-scroll-target]");
      const listRect = list?.getBoundingClientRect();
      const targetRect = scrollTarget?.getBoundingClientRect();

      return {
        canScrollDown: list ? list.scrollTop + list.clientHeight < list.scrollHeight : false,
        canScrollUp: list ? list.scrollTop > 0 : false,
        matchCount: document.querySelectorAll(".match-card").length,
        targetHeading:
          scrollTarget?.querySelector(".match-list__date-row h3")?.textContent?.trim() ?? null,
        targetOffsetFromListTop:
          listRect && targetRect ? Math.round(targetRect.top - listRect.top) : null,
      };
    });

    expect(timelineState.matchCount).toBe(104);
    expect(timelineState.targetHeading).toBe("Tuesday 16 June 2026");
    expect(
      Math.abs(timelineState.targetOffsetFromListTop ?? Number.POSITIVE_INFINITY),
    ).toBeLessThanOrEqual(1);
    expect(timelineState.canScrollUp).toBe(true);
    expect(timelineState.canScrollDown).toBe(true);
  });

  test("@smoke keeps narrow match cards on one score row with flags and time visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/?date=2026-06-20");

    const matchCardLayout = await page.evaluate(() => {
      const card =
        document.querySelector<HTMLElement>("[data-initial-scroll-target] .match-card") ??
        document.querySelector<HTMLElement>(".match-card");
      const scoreRow = card?.querySelector<HTMLElement>(".match-card__score-row");
      const homeFlag = card?.querySelector<HTMLElement>(
        ".match-card__team--home .match-card__flag",
      );
      const awayFlag = card?.querySelector<HTMLElement>(
        ".match-card__team--away .match-card__flag",
      );
      const kickoff = card?.querySelector<HTMLElement>(".match-card__kickoff, .match-card__score");
      const teamName = card?.querySelector<HTMLElement>(".match-card__team-name");
      const homeFlagRect = homeFlag?.getBoundingClientRect();
      const awayFlagRect = awayFlag?.getBoundingClientRect();
      const kickoffRect = kickoff?.getBoundingClientRect();
      const scoreRowRect = scoreRow?.getBoundingClientRect();

      return {
        awayFlagWidth: awayFlagRect?.width ?? 0,
        cardWidth: card?.getBoundingClientRect().width ?? 0,
        homeFlagWidth: homeFlagRect?.width ?? 0,
        kickoffText: kickoff?.textContent?.trim() ?? "",
        kickoffWidth: kickoffRect?.width ?? 0,
        scoreRowHeight: scoreRowRect?.height ?? 0,
        teamNameDisplay: teamName ? getComputedStyle(teamName).display : null,
        verticalCenterSpread:
          homeFlagRect && awayFlagRect && kickoffRect
            ? Math.max(
                Math.abs(
                  homeFlagRect.top +
                    homeFlagRect.height / 2 -
                    (kickoffRect.top + kickoffRect.height / 2),
                ),
                Math.abs(
                  awayFlagRect.top +
                    awayFlagRect.height / 2 -
                    (kickoffRect.top + kickoffRect.height / 2),
                ),
              )
            : Number.POSITIVE_INFINITY,
      };
    });

    expect(matchCardLayout.cardWidth).toBeLessThanOrEqual(390);
    expect(matchCardLayout.teamNameDisplay).toBe("none");
    expect(matchCardLayout.homeFlagWidth).toBeGreaterThan(0);
    expect(matchCardLayout.awayFlagWidth).toBeGreaterThan(0);
    expect(matchCardLayout.kickoffText).toMatch(/^\d{2}:\d{2}$|^FT$/);
    expect(matchCardLayout.kickoffWidth).toBeGreaterThan(0);
    expect(matchCardLayout.scoreRowHeight).toBeLessThanOrEqual(48);
    expect(matchCardLayout.verticalCenterSpread).toBeLessThanOrEqual(2);
  });

  test("@smoke selects a venue from the map", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select venue Dallas/ }).click();

    await expect(page).toHaveURL(/venue=dallas/);
    await expect(page.getByRole("heading", { name: "Dallas" })).toBeVisible();
    await expect(
      page.locator(".detail-metrics").getByText("Arlington, USA", { exact: true }),
    ).toBeVisible();
  });

  test("@smoke keeps HTML venue controls aligned to SVG marker centers across resize changes", async ({
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

  test("@smoke keeps dense East Coast venue controls clickable at their own centers", async ({
    page,
  }) => {
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
        await clickVenueControlCenter(page, venueId);
        await expect(page).toHaveURL(new RegExp(`venue=${venueId}`));
      }
    }
  });
});
