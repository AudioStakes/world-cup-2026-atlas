import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";

const githubPagesBasePath = "/world-cup-2026-atlas/";
const { GITHUB_PAGES } = process.env;

export default defineConfig({
  base: GITHUB_PAGES === "true" ? githubPagesBasePath : "/",
  plugins: [preact()],
  test: {
    environment: "jsdom",
    globals: true,
    reporters: ["dot"],
    silent: "passed-only",
    include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    setupFiles: "./src/test/setup.ts",
  },
});
