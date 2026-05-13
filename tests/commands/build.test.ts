import { describe, test, expect } from "bun:test";

describe("buildCommand exports", () => {
  test("exports buildCommand function", async () => {
    const mod = await import("../../src/commands/build.ts");
    expect(typeof mod.buildCommand).toBe("function");
  });
});
