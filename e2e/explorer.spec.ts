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

async function openMobileFiltersIfNeeded(page: Page, viewportWidth: number) {
  if (viewportWidth > 720) {
    await page.getByRole("region", { name: "Group and Tournament" }).scrollIntoViewIfNeeded();
    return;
  }

  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.locator("#group-filter-sheet")).toBeVisible();
}

async function openMobileMapIfNeeded(page: Page, viewportWidth: number) {
  if (viewportWidth > 720) {
    return;
  }

  await page.getByRole("button", { name: "Open map" }).click();
  await expect(page.locator(".map-panel.is-map-expanded")).toBeVisible();
}

async function dispatchTouchGesture(
  page: Page,
  selector: string,
  events: readonly {
    readonly type: "touchend" | "touchmove" | "touchstart";
    readonly touches: readonly { readonly id: number; readonly x: number; readonly y: number }[];
  }[],
) {
  await page.locator(selector).evaluate((element, gestureEvents) => {
    const target = element as HTMLElement;

    const createTouch = (touch: { readonly id: number; readonly x: number; readonly y: number }) =>
      new Touch({
        clientX: touch.x,
        clientY: touch.y,
        force: 1,
        identifier: touch.id,
        pageX: touch.x,
        pageY: touch.y,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        screenX: touch.x,
        screenY: touch.y,
        target,
      });

    for (const gestureEvent of gestureEvents) {
      const touches = gestureEvent.touches.map(createTouch);

      target.dispatchEvent(
        new TouchEvent(gestureEvent.type, {
          bubbles: true,
          cancelable: true,
          changedTouches: touches,
          targetTouches: touches,
          touches: gestureEvent.type === "touchend" ? [] : touches,
        }),
      );
    }
  }, events);
}

async function setBrowserToday(page: Page, dateIso: string) {
  await page.addInitScript((fixedNow) => {
    Date.now = () => new Date(fixedNow).getTime();
  }, `${dateIso}T12:00:00`);
}

async function disableBrowserLocalTimeZone(page: Page) {
  await page.addInitScript(() => {
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

    Intl.DateTimeFormat.prototype.resolvedOptions = function resolvedOptionsWithoutTimeZone() {
      return { ...originalResolvedOptions.call(this), timeZone: "" };
    };
  });
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
      const result = document.querySelector('[data-testid="result-card"]')?.getBoundingClientRect();
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

  test("@smoke defaults match times to the browser local time zone", async ({ page }) => {
    await page.addInitScript(() => {
      const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

      Intl.DateTimeFormat.prototype.resolvedOptions = function resolvedOptionsWithLocalTimeZone() {
        return { ...originalResolvedOptions.call(this), timeZone: "Asia/Tokyo" };
      };
    });

    await page.goto("/?group=F");

    await expect(page.getByTestId("result-card-header")).toHaveCount(0);

    const timeZoneState = await page.evaluate(() => {
      const select = document.querySelector<HTMLSelectElement>("#match-time-zone");
      const selectedOption = select?.selectedOptions[0];

      return {
        firstKickoff:
          document.querySelector('[data-testid="match-card-kickoff"]')?.textContent?.trim() ?? "",
        hasHeaderStatus: Boolean(document.querySelector(".atlas-header__data-status")),
        selectedOptionText: selectedOption?.textContent?.trim() ?? "",
        selectWidth: select?.getBoundingClientRect().width ?? 0,
        selectValue: select?.value ?? "",
      };
    });

    expect(timeZoneState.selectValue).toBe("browser-local");
    expect(timeZoneState.selectedOptionText).toBe("Your local time · JST · Asia/Tokyo");
    expect(timeZoneState.selectWidth).toBeLessThanOrEqual(360);
    expect(timeZoneState.hasHeaderStatus).toBe(false);
    expect(timeZoneState.firstKickoff).toBe("05:00");
  });

  test("@smoke selects team groups from the readable groups table", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Japan" }).click();

    await expect(page).toHaveURL(/country=jpn/);
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Group and Tournament" })
        .getByTestId("group-team-grid")
        .getByText("JPN", { exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("region", { name: "Group and Tournament" }).getByRole("button", {
        name: "Select Japan",
      }),
    ).toBeVisible();
  });

  test("@smoke switches the group panel to tournament rounds", async ({ page }) => {
    await page.goto("/");

    const panel = page.getByRole("region", { name: "Group and Tournament" });
    await panel.getByRole("tab", { name: "Tournament" }).click();

    await expect(panel.getByRole("tab", { name: "Tournament" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(panel.getByRole("heading", { name: "Round of 32" })).toBeVisible();
    await expect(panel.getByText("Match 73", { exact: true })).toBeVisible();
    await expect(panel.getByText("Runner-up Group A vs Runner-up Group B")).toBeVisible();

    const tabVisualState = await page.evaluate(() => {
      const selectedTab = document.querySelector<HTMLElement>("[role='tab'][aria-selected='true']");
      const inactiveTab = document.querySelector<HTMLElement>(
        "[role='tab'][aria-selected='false']",
      );
      const tabPanel = document.querySelector<HTMLElement>(
        "[data-testid='groups-section'] [role='tabpanel']",
      );
      const selectedRect = selectedTab?.getBoundingClientRect();
      const panelRect = tabPanel?.getBoundingClientRect();
      const selectedStyles = selectedTab ? getComputedStyle(selectedTab) : null;
      const inactiveStyles = inactiveTab ? getComputedStyle(inactiveTab) : null;
      const selectedIndicator = selectedTab ? getComputedStyle(selectedTab, "::before") : null;

      return {
        activeIndicatorColor: selectedIndicator?.backgroundColor ?? "",
        activeTabBackground: selectedStyles?.backgroundColor ?? "",
        inactiveTabBackground: inactiveStyles?.backgroundColor ?? "",
        selectedLabel: selectedTab?.textContent?.trim() ?? "",
        tabPanelSeamGap:
          selectedRect && panelRect ? Math.round(panelRect.top - selectedRect.bottom) : null,
      };
    });

    expect(tabVisualState.selectedLabel).toBe("Tournament");
    expect(tabVisualState.activeIndicatorColor).toBe("rgb(47, 125, 240)");
    expect(tabVisualState.activeTabBackground).not.toBe(tabVisualState.inactiveTabBackground);
    expect(
      Math.abs(tabVisualState.tabPanelSeamGap ?? Number.POSITIVE_INFINITY),
    ).toBeLessThanOrEqual(1);
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
      await openMobileFiltersIfNeeded(page, viewport.width);

      const flagVisibility = await page.evaluate(() => {
        const flags = Array.from(document.querySelectorAll('[data-testid="group-team-flag"]'));

        return {
          hiddenFlags: flags.filter((flag) => {
            const rect = flag.getBoundingClientRect();
            const style = getComputedStyle(flag);

            return rect.width === 0 || rect.height === 0 || style.visibility === "hidden";
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
    await page.getByRole("region", { name: "Group and Tournament" }).scrollIntoViewIfNeeded();

    const targetSize = await page.evaluate(() => {
      const button = document.querySelector('button[data-testid="group-team-row-button"]');
      const flag = document.querySelector('[data-testid="group-team-flag"]');
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

  test("@smoke expands mobile Groups & Teams into readable filter targets", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?date=2026-06-20");
    await openMobileFiltersIfNeeded(page, 390);

    const stackedLayout = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('[data-testid="groups-section"]');
      const grid = section?.querySelector<HTMLElement>('[data-testid="group-team-grid"]');
      const firstCopy = grid?.querySelector<HTMLElement>('[data-testid="group-team-copy"]');
      const firstName = grid?.querySelector<HTMLElement>('[data-testid="group-team-name"]');
      const firstButton = grid?.querySelector<HTMLElement>(
        'button[data-testid="group-team-row-button"]',
      );
      const cards = Array.from(
        grid?.querySelectorAll<HTMLElement>('[data-testid="group-team-card"]') ?? [],
      );
      const flags = Array.from(
        grid?.querySelectorAll<HTMLElement>('[data-testid="group-team-flag"]') ?? [],
      );
      const gridStyles = grid ? getComputedStyle(grid) : null;
      const firstButtonRect = firstButton?.getBoundingClientRect();
      const sectionRect = section?.getBoundingClientRect();
      const rowTops = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)));
      const firstNameRect = firstName?.getBoundingClientRect();

      return {
        buttonHeight: firstButtonRect?.height ?? 0,
        buttonWidth: firstButtonRect?.width ?? 0,
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
        sheetVisibility: document.querySelector("#group-filter-sheet")
          ? getComputedStyle(document.querySelector("#group-filter-sheet") as HTMLElement)
              .visibility
          : "",
      };
    });

    expect(stackedLayout.columns).toBe(1);
    expect(stackedLayout.rowCount).toBe(12);
    expect(stackedLayout.copyDisplay).toBe("block");
    expect(stackedLayout.nameWidth).toBeGreaterThan(0);
    expect(stackedLayout.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(stackedLayout.buttonWidth).toBeGreaterThanOrEqual(60);
    expect(stackedLayout.sectionHeight).toBeLessThanOrEqual(90);
    expect(stackedLayout.flagCount).toBe(48);
    expect(stackedLayout.hiddenFlags).toBe(0);
    expect(stackedLayout.sheetVisibility).toBe("visible");
    await expect(
      page.locator("#group-filter-sheet").getByText("South Africa", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("#group-filter-sheet").getByText("Bosnia and Herzegovina", { exact: true }),
    ).toBeVisible();
  });

  test("@smoke dismisses mobile Groups & Teams sheet and returns focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?date=2026-06-20");

    const opener = page.getByRole("button", { name: /Filters/ });
    const sheet = page.locator("#group-filter-sheet");

    await opener.click();
    await expect(page.getByRole("dialog", { name: "Teams and groups" })).toBeVisible();
    await expect(sheet).toHaveAttribute("aria-modal", "true");
    await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();

    await opener.click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(sheet).toBeVisible();
    await page.mouse.click(12, 12);
    await expect(sheet).toBeHidden();
  });

  test("@smoke keeps the narrow mobile dashboard controlled and scrollable", async ({ page }) => {
    const viewports = [
      { height: 1451, minMapHeight: 176, minResultsHeight: 360, width: 537 },
      { height: 844, minMapHeight: 176, minResultsHeight: 300, width: 390 },
      { height: 568, minMapHeight: 176, minResultsHeight: 260, width: 320 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const dashboard = await page.evaluate(() => {
        const rectFor = (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector);
          const rect = element?.getBoundingClientRect();

          return rect
            ? {
                bottom: rect.bottom,
                height: rect.height,
                top: rect.top,
              }
            : null;
        };
        const viewportBottom = window.innerHeight;
        const regions = {
          dates: rectFor('[data-testid="date-section"]'),
          groups: rectFor('[data-testid="groups-section"]'),
          header: rectFor(".atlas-header"),
          map: rectFor(".map-panel"),
          results: rectFor('[data-testid="result-card"]'),
          summary: rectFor(".mobile-selection-summary"),
        };
        const chromeInsideViewport = [
          regions.header,
          regions.dates,
          regions.groups,
          regions.summary,
        ].every(
          (rect) => rect && rect.height > 0 && rect.top >= 0 && rect.bottom <= viewportBottom,
        );
        const scrollingElement = document.scrollingElement ?? document.documentElement;

        return {
          bodyOverflowX:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          datesHeight: regions.dates?.height ?? 0,
          groupsHeight: regions.groups?.height ?? 0,
          headerHeight: regions.header?.height ?? 0,
          mapTop: regions.map?.top ?? 0,
          chromeInsideViewport,
          mapHeight: regions.map?.height ?? 0,
          pageScrollHeight: scrollingElement.scrollHeight,
          resultsHeight: regions.results?.height ?? 0,
          summaryHeight: regions.summary?.height ?? 0,
          viewportHeight: viewportBottom,
        };
      });

      expect(dashboard.headerHeight).toBeLessThanOrEqual(52);
      expect(dashboard.datesHeight).toBeLessThanOrEqual(110);
      expect(dashboard.groupsHeight).toBeLessThanOrEqual(90);
      expect(dashboard.summaryHeight).toBeLessThanOrEqual(90);
      expect(dashboard.resultsHeight).toBeGreaterThanOrEqual(viewport.minResultsHeight);
      expect(dashboard.mapHeight).toBeGreaterThanOrEqual(viewport.minMapHeight);
      expect(dashboard.chromeInsideViewport).toBe(true);
      expect(dashboard.mapTop).toBeLessThanOrEqual(dashboard.viewportHeight + 180);
      expect(dashboard.pageScrollHeight).toBeLessThanOrEqual(dashboard.viewportHeight + 360);
      expect(dashboard.bodyOverflowX).toBe(0);
    }
  });

  test("@smoke selects a date and starts the fixture timeline on that date", async ({ page }) => {
    await disableBrowserLocalTimeZone(page);
    await page.goto("/");

    await page.getByRole("button", { name: /Select Tue Jun 16/ }).click();

    await expect(page).toHaveURL(/date=2026-06-16/);
    await expect(page.getByRole("button", { name: /Select Tue Jun 16/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator("#selection-results")).toHaveCount(1);
    await expect(page.getByTestId("result-card-header")).toHaveCount(0);
    await expect(page.getByTestId("detail-metrics")).toHaveCount(0);

    const timelineState = await page.evaluate(() => {
      const list = document.querySelector<HTMLElement>('[data-testid="match-list"]');
      const scrollTarget = document.querySelector<HTMLElement>("[data-initial-scroll-target]");
      const listRect = list?.getBoundingClientRect();
      const targetRect = scrollTarget?.getBoundingClientRect();

      return {
        canScrollDown: list ? list.scrollTop + list.clientHeight < list.scrollHeight : false,
        canScrollUp: list ? list.scrollTop > 0 : false,
        matchCount: document.querySelectorAll('[data-testid="match-card"]').length,
        targetHeading: scrollTarget?.querySelector("h3")?.textContent?.trim() ?? null,
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
        document.querySelector<HTMLElement>(
          '[data-initial-scroll-target] [data-testid="match-card"]',
        ) ?? document.querySelector<HTMLElement>('[data-testid="match-card"]');
      const scoreRow = card?.querySelector<HTMLElement>('[data-testid="match-card-score-row"]');
      const homeFlag = card?.querySelector<HTMLElement>(
        '[data-team-side="home"] [data-testid="match-card-flag"]',
      );
      const awayFlag = card?.querySelector<HTMLElement>(
        '[data-team-side="away"] [data-testid="match-card-flag"]',
      );
      const kickoff = card?.querySelector<HTMLElement>(
        '[data-testid="match-card-kickoff"], [data-testid="match-card-score"]',
      );
      const teamName = card?.querySelector<HTMLElement>('[data-testid="match-card-team-name"]');
      const teamCode = card?.querySelector<HTMLElement>('[class*="matchCardTeamCode"]');
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
        teamCodeDisplay: teamCode ? getComputedStyle(teamCode).display : null,
        teamCodeText: teamCode?.textContent?.trim() ?? "",
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
    expect(matchCardLayout.teamCodeDisplay).toBe("block");
    expect(matchCardLayout.teamCodeText).toMatch(/^[A-Z0-9]{2,4}$/);
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
      page.getByTestId("detail-metrics").getByText("Arlington, USA", { exact: true }),
    ).toBeVisible();
  });

  test("@smoke opens the mobile map with legend and supports zoom and pan", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?date=2026-06-14");

    await openMobileMapIfNeeded(page, 390);

    await expect(page.getByRole("dialog", { name: "Interactive map" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();

    const legend = page.locator(".map-legend");

    await expect(legend.getByText("Selected venue", { exact: true })).toBeVisible();
    await expect(legend.getByText("Venue with match", { exact: true })).toBeVisible();
    await expect(legend.getByText("Other venue", { exact: true })).toBeVisible();
    await expect(page.locator(".map-venue-detail")).toContainText("match");

    const mapCanvas = page.locator(".map-panel.is-map-expanded .map-canvas");
    const mapCanvasBox = await mapCanvas.boundingBox();

    if (!mapCanvasBox) {
      throw new Error("Expected expanded map canvas to be visible");
    }

    const beforeZoomViewBox = await page
      .locator(".map-panel.is-map-expanded .map-svg")
      .getAttribute("viewBox");

    await page.mouse.move(
      mapCanvasBox.x + mapCanvasBox.width * 0.25,
      mapCanvasBox.y + mapCanvasBox.height * 0.3,
    );
    await page.mouse.wheel(0, -500);

    const zoomedViewBox = await page
      .locator(".map-panel.is-map-expanded .map-svg")
      .getAttribute("viewBox");

    await page.mouse.down();
    await page.mouse.move(
      mapCanvasBox.x + mapCanvasBox.width * 0.25 - 80,
      mapCanvasBox.y + mapCanvasBox.height * 0.3 - 30,
      { steps: 8 },
    );
    await page.mouse.up();

    const pannedViewBox = await page
      .locator(".map-panel.is-map-expanded .map-svg")
      .getAttribute("viewBox");

    expect(zoomedViewBox).not.toBe(beforeZoomViewBox);
    expect(pannedViewBox).not.toBe(zoomedViewBox);

    await page
      .locator(".map-panel.is-map-expanded .venue-marker-control.is-highlighted")
      .first()
      .click();
    await expect(page).toHaveURL(/venue=/);
    await expect(page.locator(".map-venue-detail")).toContainText("Selected venue");

    await page.keyboard.press("Escape");
    await expect(page.locator(".map-panel.is-map-expanded")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open map" })).toBeFocused();
  });

  test("@smoke supports mobile touch pinch zoom and pan on the expanded map", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:5173",
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto("/?date=2026-06-14");
    await openMobileMapIfNeeded(page, 390);

    const mapCanvas = page.locator(".map-panel.is-map-expanded .map-canvas");
    const mapCanvasBox = await mapCanvas.boundingBox();

    if (!mapCanvasBox) {
      throw new Error("Expected expanded map canvas to be visible");
    }

    const svg = page.locator(".map-panel.is-map-expanded .map-svg");
    const initialViewBox = await svg.getAttribute("viewBox");
    const centerX = mapCanvasBox.x + mapCanvasBox.width / 2;
    const centerY = mapCanvasBox.y + mapCanvasBox.height / 2;

    await dispatchTouchGesture(page, ".map-panel.is-map-expanded .map-canvas", [
      {
        type: "touchstart",
        touches: [
          { id: 1, x: centerX - 24, y: centerY - 24 },
          { id: 2, x: centerX + 24, y: centerY + 24 },
        ],
      },
      {
        type: "touchmove",
        touches: [
          { id: 1, x: centerX - 96, y: centerY - 96 },
          { id: 2, x: centerX + 96, y: centerY + 96 },
        ],
      },
      { type: "touchend", touches: [] },
    ]);

    await expect.poll(() => svg.getAttribute("viewBox")).not.toBe(initialViewBox);

    const zoomedViewBox = await svg.getAttribute("viewBox");

    await dispatchTouchGesture(page, ".map-panel.is-map-expanded .map-canvas", [
      { type: "touchstart", touches: [{ id: 1, x: centerX, y: centerY }] },
      { type: "touchmove", touches: [{ id: 1, x: centerX - 80, y: centerY - 40 }] },
      { type: "touchend", touches: [] },
    ]);

    await expect.poll(() => svg.getAttribute("viewBox")).not.toBe(zoomedViewBox);

    await context.close();
  });

  test("@smoke keeps HTML venue controls aligned to SVG marker centers across resize changes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await expectVenueMarkerAlignment(page, "dallas");

    await page.setViewportSize({ width: 430, height: 932 });
    await openMobileMapIfNeeded(page, 430);
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
      await openMobileMapIfNeeded(page, viewport.width);

      for (const venueId of ["toronto", "boston", "new-york-new-jersey", "philadelphia"]) {
        await expectVenueMarkerAlignment(page, venueId);
        await clickVenueControlCenter(page, venueId);
        await expect(page).toHaveURL(new RegExp(`venue=${venueId}`));
      }
    }
  });
});
