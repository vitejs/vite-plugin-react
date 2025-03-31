import { publish } from "@vitejs/release-scripts";

publish({
  defaultPackage: "plugin-react-swc",
  getPkgDir: () => "dist",
  provenance: true,
});
