import { describe, test, expect } from "bun:test";

describe("sessionCommand exports", () => {
  test("exports sessionCommand function", async () => {
    const mod = await import("../../src/commands/session.ts");
    expect(typeof mod.sessionCommand).toBe("function");
  });
});
