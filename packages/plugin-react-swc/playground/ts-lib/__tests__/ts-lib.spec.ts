import { expect, test } from "@playwright/test";
import { setupDevServer, setupBuildAndPreview } from "../../utils.ts";

test("TS lib build", async ({ page }) => {
  const { testUrl, server } = await setupBuildAndPreview("ts-lib");
  await page.goto(testUrl);
  await expect(page.locator("main")).toHaveText("Home page");

  await page.locator("a", { hasText: "About" }).click();
  await expect(page.locator("main")).toHaveText("About page");

  await server.httpServer.close();
});

test("TS lib dev", async ({ page }) => {
  const { testUrl, server } = await setupDevServer("ts-lib");
  await page.goto(testUrl);
  await expect(page.locator("main")).toHaveText("Home page");

  await page.locator("a", { hasText: "About" }).click();
  await expect(page.locator("main")).toHaveText("About page");

  await server.close();
});
