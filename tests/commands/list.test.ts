import { describe, test, expect } from "bun:test";
import { tmpdir } from "os";

describe("listCommand exports", () => {
  test("exports listCommand function", async () => {
    const mod = await import("../../src/commands/list.ts");
    expect(typeof mod.listCommand).toBe("function");
  });
});

describe("age helper (via observable behavior)", () => {
  test("listCommand runs without throwing on empty registry", async () => {
    // We can test behavior without mocking by using CBOX_CONFIG_DIR
    process.env.CBOX_CONFIG_DIR = tmpdir() + "/cbox-list-test-" + Date.now();
    const { listCommand } = await import("../../src/commands/list.ts?v=2");
    const logs: string[] = [];
    const orig = console.log;
    console.log = (msg: string) => logs.push(msg);
    listCommand();
    console.log = orig;
    expect(logs.some(l => l.includes("No active sessions"))).toBe(true);
  });
});
