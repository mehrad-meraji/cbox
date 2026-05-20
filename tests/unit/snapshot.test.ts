import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn, spawnSync } from "child_process";
import { snapshotMount, diffSnapshot, cleanupSnapshot } from "../../src/snapshot.ts";

// Some tests require git to be installed. Skip them gracefully when it is not
// (e.g. in the CI container used to develop M0). They pass on the dev machine.
const gitAvailable = spawnSync("git", ["--version"], { stdio: "ignore" }).status === 0;

function run(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { cwd, stdio: "ignore" });
    c.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))
    );
  });
}

describe("snapshotMount", () => {
  let workdir: string;

  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), "cbox-snap-test-"));
  });

  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true });
  });

  test.skipIf(!gitAvailable)("uses git-stash backend for a git repo", async () => {
    await run("git", ["init", "-q"], workdir);
    await run("git", ["config", "user.email", "test@example.com"], workdir);
    await run("git", ["config", "user.name", "test"], workdir);
    await writeFile(join(workdir, "a.txt"), "hello");
    await run("git", ["add", "."], workdir);
    await run("git", ["commit", "-q", "-m", "initial"], workdir);

    const snap = await snapshotMount(workdir, "test-session-1");
    expect(snap.kind).toBe("git-stash");
    expect(snap.ref).toMatch(/^refs\/cbox-snapshots\/test-session-1$/);

    await cleanupSnapshot(snap);
  });

  test("uses tarball backend for a non-git directory", async () => {
    await writeFile(join(workdir, "a.txt"), "hello");

    const snap = await snapshotMount(workdir, "test-session-2");
    expect(snap.kind).toBe("tarball");
    expect(snap.ref).toMatch(/mount\.tgz$/);

    await cleanupSnapshot(snap);
  });

  test.skipIf(!gitAvailable)("diff against an unchanged git snapshot returns empty", async () => {
    await run("git", ["init", "-q"], workdir);
    await run("git", ["config", "user.email", "test@example.com"], workdir);
    await run("git", ["config", "user.name", "test"], workdir);
    await writeFile(join(workdir, "a.txt"), "hello");
    await run("git", ["add", "."], workdir);
    await run("git", ["commit", "-q", "-m", "initial"], workdir);

    const snap = await snapshotMount(workdir, "test-session-3");
    const out = await diffSnapshot(snap);
    expect(out).toBe("");

    await cleanupSnapshot(snap);
  });

  test.skipIf(!gitAvailable)("diff against a mutated git snapshot shows the change", async () => {
    await run("git", ["init", "-q"], workdir);
    await run("git", ["config", "user.email", "test@example.com"], workdir);
    await run("git", ["config", "user.name", "test"], workdir);
    await writeFile(join(workdir, "a.txt"), "hello");
    await run("git", ["add", "."], workdir);
    await run("git", ["commit", "-q", "-m", "initial"], workdir);

    const snap = await snapshotMount(workdir, "test-session-4");
    await writeFile(join(workdir, "a.txt"), "hello, world");

    const out = await diffSnapshot(snap);
    expect(out).toContain("-hello");
    expect(out).toContain("+hello, world");

    await cleanupSnapshot(snap);
  });

  test("diff against a mutated tarball snapshot shows the change", async () => {
    await writeFile(join(workdir, "a.txt"), "hello");

    const snap = await snapshotMount(workdir, "test-session-5");
    await writeFile(join(workdir, "a.txt"), "hello, world");

    const out = await diffSnapshot(snap);
    expect(out).toContain("hello, world");

    await cleanupSnapshot(snap);
  });

  test.skipIf(!gitAvailable)("cleanup removes git ref", async () => {
    await run("git", ["init", "-q"], workdir);
    await run("git", ["config", "user.email", "test@example.com"], workdir);
    await run("git", ["config", "user.name", "test"], workdir);
    await writeFile(join(workdir, "a.txt"), "hello");
    await run("git", ["add", "."], workdir);
    await run("git", ["commit", "-q", "-m", "initial"], workdir);

    const snap = await snapshotMount(workdir, "test-session-6");
    await cleanupSnapshot(snap);

    // After cleanup, the ref should be gone — `git rev-parse refs/...` should fail.
    const code = await new Promise<number>((resolve) => {
      const c = spawn("git", ["-C", workdir, "rev-parse", snap.ref], { stdio: "ignore" });
      c.on("close", (code) => resolve(code ?? 1));
    });
    expect(code).not.toBe(0);
  });
});
