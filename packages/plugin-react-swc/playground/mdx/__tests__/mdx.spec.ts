import { expect, test } from "@playwright/test";
import {
  setupDevServer,
  setupBuildAndPreview,
  setupWaitForLogs,
} from "../../utils.ts";

test("MDX build", async ({ page }) => {
  const { testUrl, server } = await setupBuildAndPreview("mdx");
  await page.goto(testUrl);
  await expect(page.getByRole("heading", { name: "Hello" })).toBeVisible();
  await server.httpServer.close();
});

test("MDX HMR", async ({ page }) => {
  const { testUrl, server, editFile } = await setupDevServer("mdx");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);
  await waitForLogs("[vite] connected.");

  await expect(page.getByRole("heading", { name: "Hello" })).toBeVisible();

  editFile("src/Counter.tsx", ["{count}", "{count}!"]);
  await waitForLogs("[vite] hot updated: /src/Counter.tsx");
  const button = await page.locator("button");
  await button.click();
  await expect(button).toHaveText("count is 1!");

  editFile("src/hello.mdx", ["Hello", "Hello world"]);
  await waitForLogs("[vite] hot updated: /src/hello.mdx");
  await expect(
    page.getByRole("heading", { name: "Hello world" }),
  ).toBeVisible();
  await expect(button).toHaveText("count is 1!");

  await server.close();
});
