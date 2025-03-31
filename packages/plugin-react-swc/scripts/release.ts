import { readFileSync, writeFileSync } from "node:fs";
import { release } from "@vitejs/release-scripts";
import colors from "picocolors";

const changelog = readFileSync("CHANGELOG.md", "utf-8");

release({
  repo: "vite-plugin-react-swc",
  packages: ["plugin-react-swc"],
  toTag: (_, version) => `v${version}`,
  logChangelog: () => {
    if (!changelog.includes("## Unreleased")) {
      throw new Error("Can't find '## Unreleased' section in CHANGELOG.md");
    }
    const index = changelog.indexOf("## Unreleased") + 13;
    console.log(
      colors.dim(
        changelog.slice(index, changelog.indexOf("\n## ", index)).trim(),
      ),
    );
  },
  generateChangelog: (_, version) => {
    console.log(colors.dim("Write package.json & CHANGELOG.md"));
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    pkg.version = version;
    writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
    writeFileSync(
      "CHANGELOG.md",
      changelog.replace("## Unreleased", `## Unreleased\n\n## ${version}`),
    );
  },
  getPkgDir: () => "dist",
});
