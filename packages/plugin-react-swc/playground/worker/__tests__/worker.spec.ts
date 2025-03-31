import { test } from "@playwright/test";
import {
  setupDevServer,
  setupBuildAndPreview,
  setupWaitForLogs,
} from "../../utils.ts";

test("Worker build", async ({ page }) => {
  const { testUrl, server } = await setupBuildAndPreview("worker");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);
  await waitForLogs("Worker lives!", "Worker imported!");

  await server.httpServer.close();
});

test("Worker HMR", async ({ page }) => {
  const { testUrl, server, editFile } = await setupDevServer("worker");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);
  await waitForLogs("Worker lives!", "Worker imported!");

  editFile("src/worker-via-url.ts", ["Worker lives!", "Worker updates!"]);
  await waitForLogs("Worker updates!");

  await server.close();
});
