import { spawn } from "child_process";
import { mkdir, mkdtemp, rm } from "fs/promises";
import { existsSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";

/**
 * Mount snapshot module.
 *
 * Captures the state of a session's mount at start-of-session so that
 * `cbox session diff <id>` can show the agent's mutations afterwards.
 *
 * Two backends:
 *  - git-stash: for mounts inside a git repo. Uses `git stash create` to
 *    produce a stash commit object (no working-tree change), pins it with a
 *    named ref (`refs/cbox-snapshots/<sessionId>`) so it survives GC.
 *    LIMITATION: untracked files are not included in the snapshot — they
 *    will show as additions in the diff. Fix in a follow-up by building the
 *    snapshot tree manually via plumbing (write-tree + commit-tree).
 *
 *  - tarball: for non-git mounts. Tars the mount under
 *    ~/.config/cbox/snapshots/<sessionId>/mount.tgz.
 */

export type SnapshotKind = "git-stash" | "tarball";

export interface SnapshotRef {
  kind: SnapshotKind;
  /** For git-stash: a refs/cbox-snapshots/<id> ref name. For tarball: an absolute path. */
  ref: string;
  /** The host path that was snapshotted. */
  mountPath: string;
  /** Unix ms. */
  takenAt: number;
}

export interface DiffOptions {
  /** Show only file-level summary, not full unified diff. */
  stat?: boolean;
  /** Limit the diff to a subpath of the mount. */
  subpath?: string;
}

const SNAPSHOTS_BASE = join(homedir(), ".config", "cbox", "snapshots");

interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

function exec(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    child.on("error", (err) => resolve({ stdout, stderr: String(err), code: 1 }));
  });
}

async function isGitRepo(path: string): Promise<boolean> {
  const r = await exec("git", ["-C", path, "rev-parse", "--is-inside-work-tree"]);
  return r.code === 0 && r.stdout.trim() === "true";
}

export async function snapshotMount(
  mountPath: string,
  sessionId: string,
): Promise<SnapshotRef> {
  if (await isGitRepo(mountPath)) {
    return snapshotGit(mountPath, sessionId);
  }
  return snapshotTar(mountPath, sessionId);
}

async function snapshotGit(mountPath: string, sessionId: string): Promise<SnapshotRef> {
  const create = await exec("git", ["-C", mountPath, "stash", "create"]);
  if (create.code !== 0) {
    throw new Error(`snapshot: git stash create failed: ${create.stderr.trim()}`);
  }

  // git stash create outputs the stash SHA, or empty if the tree is clean.
  let sha = create.stdout.trim();
  if (!sha) {
    const head = await exec("git", ["-C", mountPath, "rev-parse", "HEAD"]);
    if (head.code !== 0) {
      throw new Error(`snapshot: rev-parse HEAD failed: ${head.stderr.trim()}`);
    }
    sha = head.stdout.trim();
  }

  const refName = `refs/cbox-snapshots/${sessionId}`;
  const update = await exec("git", ["-C", mountPath, "update-ref", refName, sha]);
  if (update.code !== 0) {
    throw new Error(`snapshot: update-ref ${refName} failed: ${update.stderr.trim()}`);
  }

  return {
    kind: "git-stash",
    ref: refName,
    mountPath,
    takenAt: Date.now(),
  };
}

async function snapshotTar(mountPath: string, sessionId: string): Promise<SnapshotRef> {
  const dir = join(SNAPSHOTS_BASE, sessionId);
  await mkdir(dir, { recursive: true });
  const tarPath = join(dir, "mount.tgz");

  const r = await exec("tar", ["czf", tarPath, "-C", mountPath, "."]);
  if (r.code !== 0) {
    throw new Error(`snapshot: tar create failed: ${r.stderr.trim()}`);
  }

  return {
    kind: "tarball",
    ref: tarPath,
    mountPath,
    takenAt: Date.now(),
  };
}

export async function diffSnapshot(
  snap: SnapshotRef,
  opts: DiffOptions = {},
): Promise<string> {
  if (snap.kind === "git-stash") {
    return diffGit(snap, opts);
  }
  return diffTar(snap, opts);
}

async function diffGit(snap: SnapshotRef, opts: DiffOptions): Promise<string> {
  const args = ["-C", snap.mountPath, "diff"];
  if (opts.stat) args.push("--stat");
  args.push(snap.ref);
  if (opts.subpath) args.push("--", opts.subpath);

  const r = await exec("git", args);
  // git diff returns 0 for no-diff, 1 for diff present, >1 for error.
  if (r.code > 1) {
    throw new Error(`diff: git diff failed: ${r.stderr.trim()}`);
  }
  return r.stdout;
}

async function diffTar(snap: SnapshotRef, opts: DiffOptions): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), "cbox-diff-"));
  try {
    const extract = await exec("tar", ["xzf", snap.ref, "-C", tmp]);
    if (extract.code !== 0) {
      throw new Error(`diff: tar extract failed: ${extract.stderr.trim()}`);
    }

    const sub = opts.subpath ?? ".";
    const left = join(tmp, sub);
    const right = join(snap.mountPath, sub);
    const args = opts.stat
      ? ["-r", "--brief", left, right]
      : ["-r", "-N", "-u", left, right];

    const r = await exec("diff", args);
    // diff returns 0 (identical) or 1 (different); >1 is error.
    if (r.code > 1) {
      throw new Error(`diff: diff failed: ${r.stderr.trim()}`);
    }
    return r.stdout;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

export async function cleanupSnapshot(snap: SnapshotRef): Promise<void> {
  if (snap.kind === "git-stash") {
    // Best-effort: drop the named ref. The underlying stash commit will be
    // GC'd eventually. Errors are non-fatal.
    await exec("git", ["-C", snap.mountPath, "update-ref", "-d", snap.ref]);
    return;
  }

  // Tarball: remove the snapshot directory.
  if (existsSync(snap.ref)) {
    const dir = join(snap.ref, "..");
    await rm(dir, { recursive: true, force: true });
  }
}
