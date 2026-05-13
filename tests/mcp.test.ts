import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testDir = join(tmpdir(), "cbox-test-mcp-" + process.pid);
const claudeDir = join(testDir, ".claude");
const settingsPath = join(claudeDir, "settings.json");

beforeEach(() => mkdirSync(claudeDir, { recursive: true }));
afterEach(() => rmSync(testDir, { recursive: true, force: true }));

describe("patchMcpConfig", () => {
  test("returns null when settings.json does not exist", async () => {
    process.env.CLAUDE_DIR = join(testDir, "nonexistent");
    const { patchMcpConfig } = await import("../src/mcp.ts");
    expect(patchMcpConfig()).toBeNull();
  });

  test("replaces localhost with host.docker.internal", async () => {
    process.env.CLAUDE_DIR = claudeDir;
    writeFileSync(settingsPath, JSON.stringify({
      mcpServers: { myServer: { url: "http://localhost:3000/sse" } }
    }));
    const { patchMcpConfig } = await import("../src/mcp.ts?v=2");
    const tmpPath = patchMcpConfig();
    expect(tmpPath).not.toBeNull();
    const patched = readFileSync(tmpPath!, "utf8");
    expect(patched).toContain("host.docker.internal");
    expect(patched).not.toContain("localhost");
  });

  test("replaces 127.0.0.1 with host.docker.internal", async () => {
    process.env.CLAUDE_DIR = claudeDir;
    writeFileSync(settingsPath, JSON.stringify({
      mcpServers: { myServer: { url: "http://127.0.0.1:8080" } }
    }));
    const { patchMcpConfig } = await import("../src/mcp.ts?v=3");
    const tmpPath = patchMcpConfig();
    const patched = readFileSync(tmpPath!, "utf8");
    expect(patched).not.toContain("127.0.0.1");
    expect(patched).toContain("host.docker.internal");
  });

  test("patched file is written to tmp directory, not original path", async () => {
    process.env.CLAUDE_DIR = claudeDir;
    writeFileSync(settingsPath, JSON.stringify({ mcpServers: {} }));
    const { patchMcpConfig } = await import("../src/mcp.ts?v=4");
    const tmpPath = patchMcpConfig();
    expect(tmpPath).not.toBeNull();
    // Should be in system tmpdir, not claude dir
    expect(tmpPath!).not.toBe(settingsPath);
    // Original file should be unchanged
    const original = readFileSync(settingsPath, "utf8");
    expect(original).toContain("mcpServers");
  });
});

describe("claudeDirPath", () => {
  test("returns CLAUDE_DIR env var when set", async () => {
    process.env.CLAUDE_DIR = "/tmp/test-claude";
    const { claudeDirPath } = await import("../src/mcp.ts?v=5");
    expect(claudeDirPath()).toBe("/tmp/test-claude");
  });
});
