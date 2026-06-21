import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, getRoleCredentials, signInAs } from "./helpers/auth";

const credentials = getRoleCredentials("professional");

test.describe("professional critical mobile flow", () => {
  test.skip(
    !credentials.email || !credentials.password,
    "Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD to run professional E2E tests.",
  );

  test("signs in and reaches clinical workflow pages without blank screens", async ({ page }) => {
    await signInAs(page, "professional");

    await expect(page.getByText("Quick Actions", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Patients" }).click();
    await expect(page.getByRole("heading", { name: "My Patients" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const firstPatient = page.getByTestId("patient-list-item").first();
    if (await firstPatient.isVisible().catch(() => false)) {
      await firstPatient.click();
      await expect(page).toHaveURL(/\/professional\/patient\//);
      await expect(page.locator("body")).not.toBeEmpty();
      await expect(page.getByText("Medical History", { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.goto("/professional/dashboard");
    }

    await page.getByRole("link", { name: "Calls" }).click();
    await expect(page.getByRole("heading", { name: "Telemedicine Console" })).toBeVisible();
    await expect(page.getByText("Waiting Patients", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Notes" }).click();
    await expect(page.getByRole("heading", { name: "Clinical Notes" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("link", { name: "Encounters" }).click();
    await expect(page.getByRole("heading", { name: "Encounters" })).toBeVisible();

    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
