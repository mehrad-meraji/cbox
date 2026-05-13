import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testDir = join(tmpdir(), "csb-test-config-" + process.pid);

beforeEach(() => mkdirSync(testDir, { recursive: true }));
afterEach(() => rmSync(testDir, { recursive: true, force: true }));

describe("loadConfig", () => {
  test("returns defaults when file is missing", async () => {
    process.env.CSB_CONFIG_DIR = testDir;
    const { loadConfig } = await import("../src/config.ts");
    const config = loadConfig();
    expect(config.defaultMountMode).toBe("rw");
    expect(config.terminalApp).toBe("Terminal");
    expect(config.mcpPackages).toEqual([]);
  });

  test("merges file values over defaults", async () => {
    process.env.CSB_CONFIG_DIR = testDir;
    writeFileSync(join(testDir, "config.json"), JSON.stringify({ terminalApp: "iTerm" }));
    const { loadConfig } = await import("../src/config.ts?v=2");
    const config = loadConfig();
    expect(config.terminalApp).toBe("iTerm");
    expect(config.defaultMountMode).toBe("rw");
  });

  test("returns defaults when file is corrupt JSON", async () => {
    process.env.CSB_CONFIG_DIR = testDir;
    writeFileSync(join(testDir, "config.json"), "not valid json {{");
    const { loadConfig } = await import("../src/config.ts?v=3");
    const config = loadConfig();
    expect(config.defaultMountMode).toBe("rw");
  });

  test("saveConfig writes config and loadConfig reads it back", async () => {
    process.env.CSB_CONFIG_DIR = testDir;
    const { saveConfig, loadConfig } = await import("../src/config.ts?v=4");
    saveConfig({ defaultMountMode: "ro", terminalApp: "iTerm", mcpPackages: ["some-pkg"] });
    const loaded = loadConfig();
    expect(loaded.defaultMountMode).toBe("ro");
    expect(loaded.terminalApp).toBe("iTerm");
    expect(loaded.mcpPackages).toEqual(["some-pkg"]);
  });
});
