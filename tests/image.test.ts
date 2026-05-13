import { describe, test, expect } from "bun:test";
import { imageTag, mcpHash } from "../src/image.ts";

describe("mcpHash", () => {
  test("returns empty string for no packages", () => {
    expect(mcpHash([])).toBe("");
  });

  test("returns deterministic 8-char hex for packages", () => {
    const h1 = mcpHash(["pkg-a", "pkg-b"]);
    const h2 = mcpHash(["pkg-a", "pkg-b"]);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{8}$/);
  });

  test("is order-independent", () => {
    expect(mcpHash(["a", "b"])).toBe(mcpHash(["b", "a"]));
  });
});

describe("imageTag", () => {
  test("returns version-only tag when no packages", () => {
    expect(imageTag("1.0.0", [])).toBe("csb:1.0.0");
  });

  test("returns version-hash tag when packages present", () => {
    const tag = imageTag("1.0.0", ["some-pkg"]);
    expect(tag).toMatch(/^csb:1\.0\.0-[0-9a-f]{8}$/);
  });
});
