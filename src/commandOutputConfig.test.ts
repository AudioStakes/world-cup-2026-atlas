import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("command output configuration", () => {
  it("keeps Vitest output controls in Vite config", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;

    expect(viteConfig).toContain('reporters: ["dot"]');
    expect(viteConfig).toContain('silent: "passed-only"');
    expect(scripts.test).toBe("vitest run");
  });

  it("keeps normal Playwright verification concise via config", () => {
    const playwrightConfig = readFileSync("playwright.config.ts", "utf8");
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;

    expect(playwrightConfig).toContain('reporter: isVerbose ? "list" : "dot"');
    expect(scripts.e2e).toBe("playwright test");
    expect(scripts["e2e:verbose"]).toBe("PLAYWRIGHT_VERBOSE=true playwright test");
  });

  it("does not add tool-specific output flags to the stop gate", () => {
    const stopGate = readFileSync(".codex/hooks/stop_gate.mjs", "utf8");

    expect(stopGate).toContain('args: ["--silent", "fix"]');
    expect(stopGate).toContain('args: ["--silent", "verify:full"]');
    expect(stopGate).not.toMatch(
      /--reporter|--silent=|--max-diagnostics|--pretty false|--noErrorTruncation|--trace=/,
    );
  });
});
