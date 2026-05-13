import { describe, test, expect, spyOn } from "bun:test";
import { tmpdir } from "os";

describe("attachCommand", () => {
  test("exports attachCommand function", async () => {
    const mod = await import("../../src/commands/attach.ts");
    expect(typeof mod.attachCommand).toBe("function");
  });

  test("exits with 1 when session not found", async () => {
    process.env.CBOX_CONFIG_DIR = tmpdir() + "/cbox-attach-test-" + Date.now();
    const { attachCommand } = await import("../../src/commands/attach.ts?v=2");
    const exitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    expect(() => attachCommand("nonexistent-session")).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
