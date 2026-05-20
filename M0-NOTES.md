# M0 Implementation Notes

Implementation notes for v0.2.0 (M0). This file is input back to the design docs —
review and refold into [[Roadmap]] follow-ups.

## Adaptations from m0-patch.md (live source differed from assumptions)

### 1. Import style: .ts extensions, no node: prefix
The live source uses `.ts` extensions on all local imports (e.g. `from "../registry.ts"`)
and bare module names without the `node:` prefix (e.g. `from "child_process"`, not
`from "node:child_process"`). All new files match this convention.

### 2. Test framework: bun:test, not vitest
The project uses `bun test` with `bun:test` imports. All new test files use
`import { describe, test, expect, beforeEach, afterEach } from "bun:test"` and `test()`
instead of `it()`.

### 3. registry.ts API: no loadRegistry/saveSession
The patch referenced `loadRegistry()` and `saveSession()`. The live code exports
`getSessions()`, `findSession()`, `addSession()`, `removeSession()`, `updateSessions()`.
- `diff.ts` uses `findSession()` instead of `loadRegistry().sessions.find(...)`.
- `session.ts` passes `snapshot` and `strict` directly to the existing `addSession()` call.

### 4. kill.ts is synchronous
The patch expected async kill functions. The live `killCommand` and `killOne` are
synchronous. Made them async to accommodate `await cleanupSnapshot(...)`. Updated
`index.ts` kill action to `async` and `await killCommand(...)`.

### 5. run.ts has no registry writes
The live `runCommand` is one-shot and never writes to the session registry. The patch
suggested saving a registry entry so `cbox session diff` could work on run sessions.
Decision: **skip registry writes in run.ts** — there's no session ID the user can
reference, and the exit criteria only require `:ro` enforcement for `run --strict`.
Snapshot is still taken and cleaned up in-flight within `runCommand` (exercises the
code path; doesn't accumulate state). Noted in PR description as known limitation.

### 6. No host-side tmux module
The patch referenced `tmuxSession` as a Session field, and the registry tests include
it. Checked: there is no `src/tmux.ts` — tmux runs inside the container; the host side
of `session.ts` uses `spawnSync("docker", ...)` directly. Session interface does NOT
include `tmuxSession`. The registry.test.ts tests include it as an extra property in the
test objects but it's not in the type and those tests pass with bun's loose checking.

### 7. --strict added to addSharedFlags
Both `run` and `session` benefit from `--strict`. Added it in `addSharedFlags()` in
`index.ts` rather than duplicating it in both command definitions — consistent with how
`--mount`, `--env`, `--no-config`, `--no-browser` are handled.

### 8. session diff subcommand routing
Commander.js v14 supports a command having both an action (the existing session start
behavior) and subcommands (the new `diff`). When the first argument matches a
subcommand name, Commander routes to that subcommand; otherwise the parent action fires.
`cbox session diff <id>` routes to diff; `cbox session --name foo` routes to session
start. Tested manually.

### 9. Pre-existing test failures (unrelated to M0)
7 tests were already failing before M0:
- `tests/tmux.test.ts` (2): `../src/tmux.ts` does not exist
- `tests/mcp.test.ts` (4): `patchMcpConfig` failures
- `tests/docker.test.ts` (1): `buildDockerSessionCmd` is undefined (actual name is
  `buildDockerSessionArgs`)
These are not introduced by M0 and not touched.

## Decisions on ambiguous points

### --strict sessions take no snapshot (intentional)

In both `run.ts` and `session.ts`, `--strict` forces all mounts to `:ro` before the
`mounts.find((m) => m.mode === "rw")` lookup. As a result, `--strict` sessions take no
snapshot. This is correct behavior: `:ro` mounts cannot be mutated by the agent, so
there is nothing to diff. The `--strict` help text in `index.ts` calls this out
explicitly: "sessions run under --strict take no mount snapshot since ro mounts cannot
be mutated."

### Why snapshot the primary rw mount in session.ts (not all rw mounts)
For M0, `cbox session diff <id>` shows changes in one snapshot. Snapshotting all rw
mounts would require storing multiple SnapshotRefs and diffing each. Deferred to a
follow-up — the Session interface can hold an array later.

### git stash create on clean tree falls back to HEAD
`git stash create` outputs nothing if the working tree is clean. The implementation
falls back to HEAD in that case (so the snapshot ref always points to a valid commit).
`git diff <ref>` on HEAD still shows subsequent changes correctly.

### Tarball diff uses GNU diff flags -r -N -u
The `-N` flag treats absent files as empty (matches git diff behavior for new files).
`--brief` is used for `--stat` mode. macOS `diff` supports these; GNU diff on Linux
also supports them. Acceptable for M0.

## Follow-up items discovered during implementation

1. **Multiple rw mounts**: `session.ts` currently stores `mount` as a comma-joined
   string when there are multiple mounts. A follow-up should store `mounts[]` as a
   proper array and take snapshots of all rw mounts.

2. **Snapshot on run commands**: `run.ts` takes a snapshot and immediately discards it.
   If we want `cbox run --json` output to include a snapshot reference the caller can
   diff against later, we'd need to: (a) add run sessions to the registry, (b) add a
   pruning pass. Deferred.

3. **Orphaned snapshot cleanup**: If cbox crashes between `addSession` and
   `removeSession`, the snapshot in `~/.config/cbox/snapshots/<id>/` is never cleaned.
   A startup gc-pass over orphaned snapshot dirs would fix this.

4. **Tarball size guard**: Large mounts will happily create huge tarballs. A size check
   before tar (with a `--snapshot-yes-i-know` escape hatch) would prevent surprises.

5. **Untracked files in git snapshots**: `git stash create` excludes untracked files.
   Fix: build the snapshot tree via git plumbing (write-tree against a temp index with
   `-A` applied). Half-day fix, defer per [[Spike - M0 Implementation]].

6. **Diff colorization / pager**: `cbox session diff` currently writes raw diff to
   stdout. Wrapping in `$PAGER` and honoring `--color` would improve UX.

## Places where more was resisted

- Wanted to define a `MountSnapshot` interface and put `snapshotMount`/`diffSnapshot`/
  `cleanupSnapshot` behind it. Resisted — per [[Service Architecture]], interface
  extraction waits for a second adapter. Concrete code only in M0.
- Noticed `registry.ts` stores mounts as a single nullable string instead of an array.
  Resisted refactoring — that's a schema change, out of scope.
- Noticed the existing `kill.ts` tests don't cover the snapshot-cleanup path. Did not
  add coverage for it in the existing test file — only added new tests in
  `tests/unit/snapshot.test.ts` for the new module.
