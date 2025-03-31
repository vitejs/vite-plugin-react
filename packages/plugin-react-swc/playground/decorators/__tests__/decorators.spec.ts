import { expect, test } from "@playwright/test";
import { setupDevServer, setupBuildAndPreview } from "../../utils.ts";

test("Decorators build", async ({ page }) => {
  const { testUrl, server } = await setupBuildAndPreview("decorators");
  await page.goto(testUrl);

  await expect(page.locator("body")).toHaveText("Hello World");

  await server.httpServer.close();
});

test("Decorators dev", async ({ page }) => {
  const { testUrl, server } = await setupDevServer("decorators");
  await page.goto(testUrl);

  await expect(page.locator("body")).toHaveText("Hello World");

  await server.close();
});
