import { expect, test } from "@playwright/test";

test.describe("World Cup 2026 Atlas explorer", () => {
  test("starts from the A1 country when no URL query present", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("/?country=mex")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /clear/i })).toHaveCount(0);
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

  test("selects team groups from the compact groups table", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Japan" }).click();

    await expect(page).toHaveURL(/country=jpn/);
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Groups & Teams" }).getByText("JPN"),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Groups & Teams" }).getByText("Japan"),
    ).toHaveCount(0);
  });

  test("selects a date without showing match-count chip metadata", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select Jun 16/ }).click();

    await expect(page).toHaveURL(/date=2026-06-16/);
    await expect(page.getByRole("button", { name: /Select Jun 16/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText(/matches/)).toHaveCount(0);
  });

  test("selects a venue from the map", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select venue Dallas/ }).click();

    await expect(page).toHaveURL(/venue=dallas/);
    await expect(page.getByRole("heading", { name: "Dallas" })).toBeVisible();
    await expect(page.getByText(/Arlington, USA/)).toHaveCount(0);
  });
});
