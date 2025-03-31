import { expect, test } from "@playwright/test";
import { setupDevServer, setupWaitForLogs } from "../../utils.ts";

test("Class component HMR", async ({ page }) => {
  const { testUrl, server, editFile } =
    await setupDevServer("class-components");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);

  await expect(page.locator("body")).toHaveText("Hello World");
  editFile("src/App.tsx", ["World", "class components"]);
  await waitForLogs("[vite] hot updated: /src/App.tsx");
  await expect(page.locator("body")).toHaveText("Hello class components");

  editFile("src/utils.tsx", ["Hello", "Hi"]);
  await waitForLogs("[vite] hot updated: /src/App.tsx");
  await expect(page.locator("body")).toHaveText("Hi class components");

  await server.close();
});
