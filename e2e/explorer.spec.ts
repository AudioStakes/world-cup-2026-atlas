import { expect, type Page, test } from "@playwright/test";

function urlState(page: Page) {
  return page.locator(".atlas-header__state code");
}

test.describe("World Cup 2026 Atlas explorer", () => {
  test("starts from the A1 country when no URL query is present", async ({ page }) => {
    await page.goto("/");

    await expect(urlState(page)).toHaveText("/?country=mex");
    await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("restores a country selection from the URL query", async ({ page }) => {
    await page.goto("/?country=jpn");

    await expect(urlState(page)).toHaveText("/?country=jpn");
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("selects a team from the groups table and updates the result", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Japan" }).click();

    await expect(urlState(page)).toHaveText("/?country=jpn");
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("re-clicking the selected team clears the country filter", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Mexico" }).click();

    await expect(urlState(page)).toHaveText("/");
    await expect(page.getByRole("heading", { name: "Start exploring" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("selects a group after clearing the default country", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByRole("button", { name: "Select Group F" }).click();

    await expect(urlState(page)).toHaveText("/?group=F");
    await expect(page.getByRole("heading", { name: "Group F" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Group F" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("selects an incompatible date and clears the country filter", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Jun 16" }).click();

    await expect(urlState(page)).toHaveText("/?date=2026-06-16");
    await expect(page.getByRole("heading", { name: "Jun 16" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("selects an incompatible venue from the map and clears the country filter", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select venue Dallas/i }).click();

    await expect(urlState(page)).toHaveText("/?venue=dallas");
    await expect(page.getByRole("heading", { name: "Dallas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
