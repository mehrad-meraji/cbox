import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const testDir = join(tmpdir(), "csb-test-registry-" + process.pid);

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
  process.env.CSB_CONFIG_DIR = testDir;
});
afterEach(() => rmSync(testDir, { recursive: true, force: true }));

describe("registry", () => {
  test("getSessions returns empty array when file is missing", async () => {
    const { getSessions } = await import("../src/registry.ts");
    expect(getSessions()).toEqual([]);
  });

  test("addSession writes to file and getSessions returns it", async () => {
    const { addSession, getSessions } = await import("../src/registry.ts?v=2");
    const session = {
      id: "abc123",
      name: "test-session",
      tmuxSession: "csb-abc123",
      containerName: "csb-abc123",
      mount: "/tmp/foo",
      mountMode: "rw" as const,
      createdAt: new Date().toISOString(),
    };
    addSession(session);
    expect(getSessions()).toHaveLength(1);
    expect(getSessions()[0].id).toBe("abc123");
  });

  test("removeSession removes by id", async () => {
    const { addSession, removeSession, getSessions } = await import("../src/registry.ts?v=3");
    addSession({ id: "abc123", name: null, tmuxSession: "csb-abc123", containerName: "csb-abc123", mount: null, mountMode: null, createdAt: new Date().toISOString() });
    removeSession("abc123");
    expect(getSessions()).toHaveLength(0);
  });

  test("findSession finds by id", async () => {
    const { addSession, findSession } = await import("../src/registry.ts?v=4");
    addSession({ id: "xyz789", name: "my-session", tmuxSession: "csb-xyz789", containerName: "csb-xyz789", mount: null, mountMode: null, createdAt: new Date().toISOString() });
    expect(findSession("xyz789")?.id).toBe("xyz789");
  });

  test("findSession finds by name", async () => {
    const { addSession, findSession } = await import("../src/registry.ts?v=5");
    addSession({ id: "xyz789", name: "my-session", tmuxSession: "csb-xyz789", containerName: "csb-xyz789", mount: null, mountMode: null, createdAt: new Date().toISOString() });
    expect(findSession("my-session")?.id).toBe("xyz789");
  });

  test("getSessions returns empty array on corrupt JSON", async () => {
    writeFileSync(join(testDir, "sessions.json"), "not json {{{");
    const { getSessions } = await import("../src/registry.ts?v=6");
    expect(getSessions()).toEqual([]);
  });

  test("addSession writes atomically (temp file then rename)", async () => {
    const { addSession } = await import("../src/registry.ts?v=7");
    addSession({ id: "a1", name: null, tmuxSession: "csb-a1", containerName: "csb-a1", mount: null, mountMode: null, createdAt: new Date().toISOString() });
    // temp file should not exist after write
    expect(existsSync(join(testDir, "sessions.json.tmp"))).toBe(false);
    expect(existsSync(join(testDir, "sessions.json"))).toBe(true);
  });

  test("generateId returns 6-char hex string", async () => {
    const { generateId } = await import("../src/registry.ts?v=8");
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{6}$/);
  });
});
