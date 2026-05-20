# PR: M0 — Snapshots, `cbox session diff`, `--strict`, doc honesty (v0.2.0)

## ⚠ Before pushing this branch

**The feature branch `feat/m0-snapshot-and-strict` has NO COMMITS yet.** All M0 work
is uncommitted working-tree changes. The dev container has no `git` binary, so commits
must be created on your Mac:

```sh
git checkout feat/m0-snapshot-and-strict   # branch already exists, HEAD is clean
git add src/snapshot.ts src/commands/diff.ts src/commands/run.ts \
        src/commands/session.ts src/commands/kill.ts src/registry.ts src/index.ts \
        tests/unit/snapshot.test.ts tests/integration/diff.test.ts \
        package.json CHANGELOG.md DOCS-PATCH.md PR-DESCRIPTION.md M0-NOTES.md
git commit -m "feat(m0): snapshot on session start, cbox session diff, --strict flag (v0.2.0)"
```

**The Obsidian doc-honesty pass is already done.** Both notes at `/workspace/cbox/`
have been updated in this session:

- `Architecture.md` — "MCP-bridge side channels" row added to the Security Model table
- `MCP Servers.md` — "Caveats" section added at the bottom

If your Obsidian vault lives in iCloud and `/workspace/cbox/` is a separate copy,
sync the changes to your Mac manually (or copy from `DOCS-PATCH.md` which has the
exact text). Either way, the exit criterion is met in the working tree.

---

## Summary

This PR implements the M0 milestone scoped in [[Spike - M0 Implementation]]. It adds
mount snapshotting on session start (git stash for git repos, tarball for everything
else), a `cbox session diff <id>` command to show what an agent mutated in its mount,
and a `--strict` flag on `run` and `session` that forces all mounts to `:ro`. It also
adds the first acknowledgement of the MCP-bridge sandbox-leak to `Architecture.md` and
`MCP Servers.md` (the Obsidian notes at `/workspace/cbox/`). The code is deliberately concrete — no new
interfaces or abstractions — per the [[Service Architecture]] "concrete first" principle.

## Files added

| File | Purpose |
|---|---|
| `src/snapshot.ts` | Mount snapshot module: git-stash and tarball backends, `snapshotMount`, `diffSnapshot`, `cleanupSnapshot` |
| `src/commands/diff.ts` | `cbox session diff <id>` command implementation |
| `tests/unit/snapshot.test.ts` | Unit tests for snapshot module (real git/tar binaries) |
| `tests/integration/diff.test.ts` | Integration test placeholders |
| `CHANGELOG.md` | v0.2.0 entry (created) |
| `DOCS-PATCH.md` | Exact text for the Obsidian Architecture.md and MCP Servers.md doc honesty pass |
| `PR-DESCRIPTION.md` | This file |
| `M0-NOTES.md` | Implementation notes and adaptation log |

## Files modified

| File | Change |
|---|---|
| `src/registry.ts` | Added `snapshot?: SnapshotRef` and `strict?: boolean` to `Session` interface |
| `src/commands/run.ts` | Added `strict` to `RunOptions`; `--strict` forces `:ro`; snapshot taken and cleaned up in-flight |
| `src/commands/session.ts` | Added `strict` to `SessionOptions`; `--strict` forces `:ro`; snapshot taken before container start, cleaned up after exit |
| `src/commands/kill.ts` | Made `killOne`/`killCommand` async; added `cleanupSnapshot` call after container stop |
| `src/index.ts` | Added `--strict` to `addSharedFlags`; wired `registerDiffCommand` under `sessionCmd`; made kill action async |
| `package.json` | Version bumped to `0.2.0` |

## Test plan

### What was run

```sh
npx bun test                          # Full test suite
npx bun build src/index.ts --target=bun  # Bundle compilation (TypeScript validity)
```

### Results

- **Pre-existing failures (7):** unchanged — tmux.ts missing (×2), patchMcpConfig type
  mismatch (×4), buildDockerSessionCmd undefined (×1). None introduced by M0.
- **New passes (2):** tarball snapshot + tarball diff tests.
- **New skips (6):** git-based snapshot tests (git not in PATH in dev container) +
  integration placeholders. Git tests will run on the dev Mac where git is available.
- **Total: 38 pass, 6 skip, 7 fail** (all 7 failures pre-existing).

### Expected to pass on the dev machine (macOS)

- `cbox run --strict -m . "noop"` → `:ro` mount visible in `docker inspect`
- `cbox session diff <id>` on a git repo → shows agent mutations
- `cbox session diff <id>` on a non-git dir → shows agent mutations via tarball diff
- All 6 snapshot unit tests (4 git + 2 tarball)

### Expected to fail until M1+

- Integration tests in `tests/integration/diff.test.ts` (body is placeholder)
- `--strict` currently only enforces `:ro` mounts — MCP restrictions, egress firewall etc. are M1+

## Known limitations

- **Untracked files not in git snapshots.** `git stash create` excludes untracked files.
  They appear as additions in `cbox session diff`. Fix: build snapshot tree via git
  plumbing. Documented in M0-NOTES.md follow-up #5.
- **No tarball size guard.** Large mounts will create large snapshots silently.
  Documented in M0-NOTES.md follow-up #4.
- **run sessions not diffable.** `cbox run` doesn't persist a session ID to the
  registry, so `cbox session diff` doesn't work for one-shot runs. Documented in
  M0-NOTES.md follow-up #2.
- **Obsidian notes may need iCloud sync.** Both notes are updated at `/workspace/cbox/`;
  if your vault is iCloud-only, copy the changes to your Mac before tagging.
- **Orphaned snapshot cleanup.** If cbox crashes mid-session, `~/.config/cbox/snapshots/`
  accumulates. Documented in M0-NOTES.md follow-up #3.

## Reference

[[Spike - M0 Implementation]] — canonical scope and exit criteria for this PR.
