import { expect, test } from "@playwright/test";
import {
  setupDevServer,
  setupBuildAndPreview,
  setupWaitForLogs,
  expectColor,
} from "../../utils.ts";

test("styled-components build", async ({ page }) => {
  const { testUrl, server } = await setupBuildAndPreview("styled-components");
  await page.goto(testUrl);

  const button = page.locator("button");
  await button.click();
  await expect(button).toHaveText("count is 1");
  await expectColor(button, "color", "#ffffff");

  const code = page.locator("code");
  await expectColor(code, "color", "#db7093");
  await expect(code).toHaveClass(/Button__StyledCode/);

  await server.httpServer.close();
});

test("styled-components HMR", async ({ page }) => {
  const { testUrl, server, editFile } =
    await setupDevServer("styled-components");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);
  await waitForLogs("[vite] connected.");

  const button = page.locator("button");
  await expect(button).toHaveText("count is 0", { timeout: 30000 });
  await expectColor(button, "color", "#ffffff");
  await button.click();
  await expect(button).toHaveText("count is 1");

  const code = page.locator("code");
  await expectColor(code, "color", "#db7093");
  await expect(code).toHaveClass(/Button__StyledCode/);

  editFile("src/App.tsx", ["<Counter />", "<Counter primary />"]);
  await waitForLogs("[vite] hot updated: /src/App.tsx");
  await expect(button).toHaveText("count is 1");
  await expectColor(button, "color", "#000000");

  editFile("src/Button.tsx", ["color: black;", "color: palevioletred;"]);
  await waitForLogs("[vite] hot updated: /src/Button.tsx");
  await expect(button).toHaveText("count is 1");
  await expectColor(button, "color", "#db7093");

  editFile("src/Button.tsx", ["color: palevioletred;", "color: white;"]);
  await waitForLogs("[vite] hot updated: /src/Button.tsx");
  await expect(button).toHaveText("count is 1");
  await expectColor(code, "color", "#ffffff");

  await server.close();
});
