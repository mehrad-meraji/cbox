import { describe, test, expect, spyOn } from "bun:test";
import { tmpdir } from "os";

describe("killCommand", () => {
  test("exports killCommand function", async () => {
    const mod = await import("../../src/commands/kill.ts");
    expect(typeof mod.killCommand).toBe("function");
  });

  test("exits with 1 when no idOrName and no --all", async () => {
    const { killCommand } = await import("../../src/commands/kill.ts?v=2");
    const exitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    expect(() => killCommand(null, false)).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  test("exits with 1 when session not found", async () => {
    process.env.CBOX_CONFIG_DIR = tmpdir() + "/cbox-kill-test-" + Date.now();
    const { killCommand } = await import("../../src/commands/kill.ts?v=3");
    const exitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    expect(() => killCommand("nonexistent", false)).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  test("--all with no sessions prints message", async () => {
    process.env.CBOX_CONFIG_DIR = tmpdir() + "/cbox-kill-all-test-" + Date.now();
    const { killCommand } = await import("../../src/commands/kill.ts?v=4");
    const logs: string[] = [];
    const orig = console.log;
    console.log = (msg: string) => logs.push(msg);
    killCommand(null, true);
    console.log = orig;
    expect(logs.some(l => l.includes("no active sessions"))).toBe(true);
  });
});
