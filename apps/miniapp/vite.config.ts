import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // На GitHub Pages проект живёт в подпапке /<repo>/ — путь задаёт CI через VITE_BASE.
  // Локально и для кастомного домена — "/".
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
