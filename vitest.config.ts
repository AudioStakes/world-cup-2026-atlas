import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        provider: "v8",
        reportOnFailure: true,
        reporter: ["text-summary", "json-summary", "html"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.test.{ts,tsx}",
          "src/**/*.spec.{ts,tsx}",
          "src/**/*.contract.test.{ts,tsx}",
          "src/**/*.integration.test.{ts,tsx}",
          "src/test/**",
          "src/vite-env.d.ts",
          "src/main.tsx",
          "src/domain/types.ts",
        ],
        thresholds: {
          lines: 96,
          statements: 96,
          functions: 96,
          branches: 83,
          "src/domain/ids.ts": {
            lines: 100,
            statements: 100,
            functions: 100,
            branches: 100,
          },
          "src/calculations/**": {
            lines: 100,
            statements: 100,
            functions: 100,
            branches: 100,
          },
          "src/indexes/**": {
            lines: 96,
            statements: 96,
            functions: 100,
            branches: 90,
          },
          "src/queries/**": {
            lines: 90,
            statements: 90,
            functions: 100,
            branches: 85,
          },
          "src/features/explorer/**": {
            lines: 95,
            statements: 95,
            functions: 98,
            branches: 85,
          },
          "src/data/**": {
            lines: 99,
            statements: 99,
            functions: 100,
            branches: 80,
          },
          "src/ui/components/**": {
            lines: 83,
            statements: 83,
            functions: 88,
            branches: 74,
          },
          "src/app/**": {
            lines: 92,
            statements: 92,
            functions: 100,
            branches: 64,
          },
        },
      },
    },
  }),
);
