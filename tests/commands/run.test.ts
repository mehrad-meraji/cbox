import { describe, test, expect } from "bun:test";
import { parseMountFlag } from "../../src/commands/run.ts";

describe("parseMountFlag", () => {
  test("parses path without mode as rw", () => {
    const result = parseMountFlag("./src");
    expect(result.path).toBe("./src");
    expect(result.mode).toBe("rw");
  });

  test("parses :ro suffix", () => {
    const result = parseMountFlag("./src:ro");
    expect(result.path).toBe("./src");
    expect(result.mode).toBe("ro");
  });

  test("parses dot as path", () => {
    const result = parseMountFlag(".");
    expect(result.path).toBe(".");
    expect(result.mode).toBe("rw");
  });

  test("parses absolute path with :ro", () => {
    const result = parseMountFlag("/Users/me/project:ro");
    expect(result.path).toBe("/Users/me/project");
    expect(result.mode).toBe("ro");
  });
});

describe("runCommand exports", () => {
  test("exports runCommand function", async () => {
    const mod = await import("../../src/commands/run.ts");
    expect(typeof mod.runCommand).toBe("function");
    expect(typeof mod.parseMountFlag).toBe("function");
  });
});
