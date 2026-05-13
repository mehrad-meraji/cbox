import { describe, test, expect } from "bun:test";
import { imageTag } from "../src/image.ts";

// Smoke test: imageTag integration (pure function, no mocking needed)
describe("imageTag integration", () => {
  test("produces correct tag for no packages", () => {
    expect(imageTag("0.1.0", [])).toBe("csb:0.1.0");
  });
});

// For docker functions that call child_process, we just verify they're exported
// and have the right signature (integration testing happens in Task 18)
describe("docker module exports", () => {
  test("exports expected functions", async () => {
    const docker = await import("../src/docker.ts");
    expect(typeof docker.imageExists).toBe("function");
    expect(typeof docker.buildImage).toBe("function");
    expect(typeof docker.isContainerRunning).toBe("function");
    expect(typeof docker.stopContainer).toBe("function");
    expect(typeof docker.runOneShot).toBe("function");
    expect(typeof docker.buildDockerSessionCmd).toBe("function");
  });
});
