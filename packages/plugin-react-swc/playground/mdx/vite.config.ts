import { defineConfig } from "vite";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [mdx(), react()],
});
