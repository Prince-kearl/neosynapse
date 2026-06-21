import { expect, type Page } from "@playwright/test";

export type E2ERole = "patient" | "professional";

export function getRoleCredentials(role: E2ERole) {
  const prefix = role === "patient" ? "E2E_PATIENT" : "E2E_PROFESSIONAL";
  return {
    email: process.env[`${prefix}_EMAIL`]?.trim() || "",
    password: process.env[`${prefix}_PASSWORD`] || "",
  };
}

export async function signInAs(page: Page, role: E2ERole) {
  const credentials = getRoleCredentials(role);

  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}/`));
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}
