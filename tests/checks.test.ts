import { describe, test, expect, spyOn } from "bun:test";

describe("checkApiKey", () => {
  test("exits when ANTHROPIC_API_KEY is not set", async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const exitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    const { checkApiKey } = await import("../src/checks.ts");
    expect(() => checkApiKey()).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    if (original !== undefined) process.env.ANTHROPIC_API_KEY = original;
  });

  test("does not exit when ANTHROPIC_API_KEY is set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const exitSpy = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    const { checkApiKey } = await import("../src/checks.ts?v=2");
    expect(() => checkApiKey()).not.toThrow();
    exitSpy.mockRestore();
  });
});
