import { expect, test } from "@playwright/test";
import {
  setupDevServer,
  setupBuildAndPreview,
  setupWaitForLogs,
} from "../../utils.ts";

test("Default build", async ({ page }) => {
  const { testUrl, server } = await setupBuildAndPreview("hmr");
  await page.goto(testUrl);

  await page.click("button");
  await expect(page.locator("button")).toHaveText("count is 1");

  await server.httpServer.close();
});

test("HMR invalidate", async ({ page }) => {
  const { testUrl, server, editFile } = await setupDevServer("hmr");
  const waitForLogs = await setupWaitForLogs(page);
  await page.goto(testUrl);
  await waitForLogs("[vite] connected.");

  await page.click("button");
  await expect(page.locator("button")).toHaveText("count is 1");

  editFile("src/App.tsx", ["{count}", "{count}!"]);
  await waitForLogs("[vite] hot updated: /src/App.tsx");
  await expect(page.locator("button")).toHaveText("count is 1!");

  // Edit component
  editFile("src/TitleWithExport.tsx", ["Vite +", "Vite *"]);
  await waitForLogs("[vite] hot updated: /src/TitleWithExport.tsx");

  // Edit export
  editFile("src/TitleWithExport.tsx", ["React", "React!"]);
  await waitForLogs(
    '[vite] invalidate /src/TitleWithExport.tsx: Could not Fast Refresh ("framework" export is incompatible). Learn more at https://github.com/vitejs/vite-plugin-react-swc#consistent-components-exports',
    "[vite] hot updated: /src/App.tsx",
  );
  await expect(page.locator("h1")).toHaveText("Vite * React!");

  // Add non-component export
  editFile("src/TitleWithExport.tsx", [
    'React!";',
    'React!";\nexport const useless = 3;',
  ]);
  await waitForLogs(
    "[vite] invalidate /src/TitleWithExport.tsx: Could not Fast Refresh (new export)",
    "[vite] hot updated: /src/App.tsx",
  );

  // Add component export
  editFile("src/TitleWithExport.tsx", [
    "</h1>;",
    "</h1>;\nexport const Title2 = () => <h2>Title2</h2>;",
  ]);
  await waitForLogs("[vite] hot updated: /src/TitleWithExport.tsx");

  // Import new component
  editFile(
    "src/App.tsx",
    ["import { TitleWithExport", "import { TitleWithExport, Title2"],
    ["<TitleWithExport />", "<TitleWithExport /> <Title2 />"],
  );
  await waitForLogs("[vite] hot updated: /src/App.tsx");
  await expect(page.locator("h2")).toHaveText("Title2");

  // Remove component export
  editFile("src/TitleWithExport.tsx", [
    "\nexport const Title2 = () => <h2>Title2</h2>;",
    "",
  ]);
  await waitForLogs(
    "[vite] invalidate /src/TitleWithExport.tsx: Could not Fast Refresh (export removed)",
    "[vite] hot updated: /src/App.tsx",
    /Failed to reload \/src\/App\.tsx. This could be due to syntax errors or importing non-existent modules\. \(see errors above\)$/,
  );

  // Remove usage from App
  editFile(
    "src/App.tsx",
    ["import { TitleWithExport, Title2", "import { TitleWithExport"],
    ["<TitleWithExport /> <Title2 />", "<TitleWithExport />"],
  );
  await waitForLogs("[vite] hot updated: /src/App.tsx");
  await expect(page.locator("button")).toHaveText("count is 1!");

  // Remove useless export
  editFile("src/TitleWithExport.tsx", ["\nexport const useless = 3;", ""]);
  await waitForLogs(
    "[vite] invalidate /src/TitleWithExport.tsx: Could not Fast Refresh (export removed)",
    "[vite] hot updated: /src/App.tsx",
  );

  await server.close();
});
