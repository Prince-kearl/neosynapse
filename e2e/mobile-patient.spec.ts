import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, getRoleCredentials, signInAs } from "./helpers/auth";

const credentials = getRoleCredentials("patient");

test.describe("patient critical mobile flow", () => {
  test.skip(
    !credentials.email || !credentials.password,
    "Set E2E_PATIENT_EMAIL and E2E_PATIENT_PASSWORD to run patient E2E tests.",
  );

  test("signs in and reaches core patient features from mobile navigation", async ({ page }) => {
    await signInAs(page, "patient");

    await expect(page.getByText("Quick Actions", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Symptoms" }).click();
    await expect(page.getByRole("heading", { name: "Symptom Assessment" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: "Consult" }).click();
    await expect(page.getByRole("heading", { name: "Telemedicine", exact: true })).toBeVisible();
    await expect(page.getByText("Queue status", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByRole("heading", { name: "Medical Reports" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page.getByRole("heading", { name: "Health Profile" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
