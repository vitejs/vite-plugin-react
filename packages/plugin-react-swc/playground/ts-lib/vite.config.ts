import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  optimizeDeps: { include: ["react-router-dom"] },
  plugins: [react()],
});
