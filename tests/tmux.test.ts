import { describe, test, expect } from "bun:test";

// For tmux functions that call real binaries, verify exports and types
describe("tmux module exports", () => {
  test("exports expected functions", async () => {
    const tmux = await import("../src/tmux.ts");
    expect(typeof tmux.tmuxSessionExists).toBe("function");
    expect(typeof tmux.createTmuxSession).toBe("function");
    expect(typeof tmux.attachTmuxSession).toBe("function");
    expect(typeof tmux.killTmuxSession).toBe("function");
  });

  test("tmuxSessionExists returns boolean", async () => {
    const { tmuxSessionExists } = await import("../src/tmux.ts");
    // Test with a name that definitely doesn't exist
    const result = tmuxSessionExists("csb-nonexistent-session-xyz-" + Date.now());
    expect(typeof result).toBe("boolean");
    expect(result).toBe(false);
  });
});
