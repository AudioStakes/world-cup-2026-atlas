import { expect, test } from "@playwright/test";

test.describe("World Cup 2026 Atlas explorer", () => {
  test("starts from the A1 country when no URL query is present", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("/?country=mex")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("selects a team from the groups table and updates the result", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Select Japan" }).click();

    await expect(page.getByText("/?country=jpn")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Japan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Japan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("selects an incompatible venue from the map and clears the country filter", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Select venue Dallas/i }).click();

    await expect(page.getByText("/?venue=dallas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dallas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Mexico" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
