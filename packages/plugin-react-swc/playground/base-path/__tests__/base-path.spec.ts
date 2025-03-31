import { expect, test } from "@playwright/test";
import { setupDevServer, setupWaitForLogs } from "../../utils.ts";

test("Base path HMR", async ({ page }) => {
  const { testUrl, server, editFile } = await setupDevServer("base-path");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);

  const button = page.locator("button");
  await button.click();
  await expect(button).toHaveText("count is 1");

  editFile("src/App.tsx", ["{count}", "{count}!"]);
  await waitForLogs("[vite] hot updated: /src/App.tsx");
  await expect(button).toHaveText("count is 1!");

  await server.close();
});
