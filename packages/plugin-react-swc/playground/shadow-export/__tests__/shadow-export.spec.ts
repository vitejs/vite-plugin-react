import { expect, test } from "@playwright/test";
import { setupDevServer, setupWaitForLogs } from "../../utils.ts";

test("Shadow export HMR", async ({ page }) => {
  const { testUrl, server, editFile } = await setupDevServer("shadow-export");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);
  await waitForLogs("[vite] connected.");
  await expect(page.locator("body")).toHaveText("Shadow export");

  editFile("src/App.tsx", ["Shadow export", "Shadow export updates!"]);
  await expect(page.locator("body")).toHaveText("Shadow export updates!");

  await server.close();
});
