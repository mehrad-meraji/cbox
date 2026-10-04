# M0 Implementation — Handoff Brief for Claude Code

> You are being asked to implement M0 of the cbox roadmap inside a cbox repo on the user's machine. Read this entire document before writing any code. The brief is self-contained — you do not need to ask the user clarifying questions before starting.

## Your task in one sentence

Implement **cbox v0.2.0** — mount snapshot on session start, `cbox session diff <id>` command, `--strict` flag skeleton, and a documentation-honesty pass on existing notes — then stop one step before publishing.

## Authoritative sources (read in this order)

1. **`/workspace/cbox/Spike - M0 Implementation.md`** — canonical scope and exit criteria for M0. This is the contract. Re-read at the end to verify you've met it.
2. **`/workspace/csb/cbox/m0-patch.md`** — reference patch with concrete code suggestions. Adapt to the actual live source structure where it differs; do **not** treat it as a verbatim drop-in.
3. **`/workspace/cbox/Roadmap.md`** — context for what comes after M0 (M1+). Read for orientation. Do not act on any of it.
4. **`/workspace/cbox/Service Architecture.md`** — explains why M0 ships concrete code and **does not** extract a `MountSnapshot` interface yet. Important for resisting the urge to over-engineer.
5. **`/workspace/cbox/North Star.md`** — product vision. Background only.

The cbox source repo is `gitlab.com/mehrad.meraji/cbox`; it should already be cloned locally. If you're running inside `cbox session -m ./cbox-repo`, that's your working tree.

## In scope (the only things you should change)

- **New file:** `src/snapshot.ts` — mount-snapshot module (git-stash and tarball backends).
- **New file:** `src/commands/diff.ts` — `cbox session diff <id>` command.
- **Modified:** `src/registry.ts` — add `snapshot?: SnapshotRef` and `strict?: boolean` to the `Session` interface.
- **Modified:** `src/commands/run.ts` and `src/commands/session.ts` — add `--strict` flag (forces `:ro` mounts, sets metadata flag), call `snapshotMount` before launching the container.
- **Modified:** `src/commands/kill.ts` — call `cleanupSnapshot` after the container is killed.
- **Modified:** `src/index.ts` — wire `cbox session diff` into the session subcommand router.
- **New file:** `tests/unit/snapshot.test.ts` — unit tests against real git/tar binaries.
- **New file:** `tests/integration/diff.test.ts` — placeholders (real bodies depend on the existing integration harness; do your best to match it).
- **Documentation honesty pass** on these existing Obsidian notes (the user-facing project docs, *not* the new design docs):
  - `/workspace/cbox/Architecture.md`
  - `/workspace/cbox/MCP Servers.md`
  - Add a row/section acknowledging the MCP-bridge sandbox leak. Exact suggested text is in `m0-patch.md` under the "Documentation honesty pass" section.
- **`CHANGELOG.md`** entry for v0.2.0 (create the file if absent).
- **`package.json`** version bump to `0.2.0`.

## Out of scope (do **not** touch these)

This is the most likely source of failure. Read carefully.

- ❌ **The `MountSnapshot` interface in `src/services/`.** M0 ships concrete code only. Interface extraction waits for a second adapter (per [[Service Architecture]] "premature abstraction" risk #1). Do not create `src/services/MountSnapshot.ts` and do not refactor `src/snapshot.ts` to fit an abstract interface "while you're at it."
- ❌ **Anything Pipelock-related.** M1 territory. Out of scope.
- ❌ **Anything egress-firewall, gauntlet-runner, TaggedData, AuditSink, EgressFirewall, IngressReducer, SchemaExtractor, ContainerRuntime.** All M1+. Not your problem this round.
- ❌ **Unrelated refactors.** Don't reformat unrelated files. Don't fix lint errors outside the files you're actively editing. Don't "modernize" anything.
- ❌ **Snapshot rotation, pruning, or size limits.** Listed as known follow-ups in `m0-patch.md`. Defer.
- ❌ **Untracked-files-in-git-snapshots.** Known limitation, documented, leave it. The fix is in a follow-up milestone.
- ❌ **`npm publish`.** Stop before this. The human handles it.
- ❌ **`git push`.** Stop before this. The human handles it.
- ❌ **`git tag`.** Stop before this.

If you find yourself touching a file outside the "in scope" list, stop and reconsider.

## Hard rules

1. **If a test fails, fix the source — not the test.** The unit tests in `m0-patch.md` are specific by design. Loosening an assertion to make a red test green is a bug, not a fix.

2. **When the live source differs from `m0-patch.md`, adapt the patch.** Don't invent new files to make the patch fit. The patch is a reference written without seeing the live source; the live source wins.

3. **Smallest change that fits existing conventions.** If `Session` is defined in `registry.ts`, add fields there — don't create `types.ts`. If imports use `.js` extensions (ESM convention), match. If they don't, match that.

4. **If you're blocked (not "ambiguous", but actually stuck), stop.** Write a single-question prompt to a file called `M0-QUESTIONS.md` at the cbox repo root, listing each blocking question with the file/line context. Do not speculate in code.

5. **Resist abstraction.** If you find yourself writing an interface, a base class, a generic factory, or a strategy pattern, stop. M0 is hygiene, not architecture. Concrete code wins.

6. **Do not modify any of the design docs** in `/workspace/cbox/` *except* for the two user-facing ones explicitly listed under "In scope" (Architecture.md and MCP Servers.md). The new design docs (North Star, Roadmap, Service Architecture, etc.) are read-only for this task.

## Exit criteria (from `Spike - M0 Implementation.md`, must all pass)

- [ ] `cbox run --strict -m . "noop"` succeeds with `:ro` mount enforcement visible in `docker inspect` output.
- [ ] `cbox session diff <id>` produces output equivalent to `git diff` on a known mutation in a git-backed mount.
- [ ] `cbox session diff <id>` produces a usable diff on a non-git mount (tarball path).
- [ ] `Architecture.md` and `MCP Servers.md` notes explicitly acknowledge the MCP-bridge leak (per `m0-patch.md` suggested text).
- [ ] `package.json` version is `0.2.0`.
- [ ] `CHANGELOG.md` has an entry for `0.2.0`.
- [ ] All unit tests pass.
- [ ] `npm run build` (or equivalent) succeeds with no new TypeScript errors.

## Deliverables

When you believe you're done:

1. **A feature branch** named `feat/m0-snapshot-and-strict` with all M0 commits.
2. **All unit tests passing locally.**
3. **`npm run build` succeeding.**
4. **`npm run lint`** (or equivalent — whatever the repo uses) **succeeding on the files you changed.** Don't fix unrelated lint errors.
5. **A draft PR description** written to `PR-DESCRIPTION.md` at the cbox repo root. Include:
   - Summary of changes (one paragraph).
   - List of files added / modified.
   - Test plan (what you ran, what's expected to fail until M1+).
   - Known limitations (untracked files in git snapshots, no size guard on tarball backend, etc.).
   - Reference: link to the [[Spike - M0 Implementation]] note.
6. **An implementation notes file** written to `M0-NOTES.md` at the cbox repo root capturing:
   - Anywhere `m0-patch.md`'s assumptions didn't match the live source, and how you adapted.
   - Decisions you made on ambiguous points (and the reasoning).
   - Follow-up items you discovered while implementing.
   - Any places where you wanted to do more but resisted (so the user can decide whether to expand scope later).
   - This file is **input back to the design docs** — the user will review and refold into [[Roadmap]] follow-ups.

**Do not:** push, tag, publish, or open a PR. Stop one step before each of those.

## Suggested workflow

1. Read all five authoritative sources in order. Take notes mentally.
2. Survey the live cbox source: `src/commands/run.ts`, `src/commands/session.ts`, `src/commands/kill.ts`, `src/registry.ts`, `src/index.ts`. Note how they actually differ from `m0-patch.md`'s assumptions. Write deltas to `M0-NOTES.md` as you go.
3. Create the feature branch.
4. Implement `src/snapshot.ts` (purely additive, lowest risk). Run the unit tests as soon as they're written; iterate until green.
5. Implement `src/commands/diff.ts` (also purely additive).
6. Modify `src/registry.ts` to add the new optional fields.
7. Modify `src/commands/run.ts`, `session.ts`, `kill.ts`. Add `--strict`, call `snapshotMount`, call `cleanupSnapshot`.
8. Wire `src/index.ts` to register the diff subcommand.
9. Run the full test suite. Build. Lint files you touched.
10. Documentation honesty pass on `Architecture.md` and `MCP Servers.md`.
11. `CHANGELOG.md` entry. Bump `package.json` version.
12. Write `PR-DESCRIPTION.md` and `M0-NOTES.md`.
13. Verify each exit criterion one by one against the running build. If any fails, fix the source (not the test, not the criterion). Do not claim done unless every box is checked.

## When you disagree with the patch

If you read the design docs and form an opinion that differs from `m0-patch.md`, that's valuable signal — and the right place for it is `M0-NOTES.md`, not the code. Examples:

- "`git stash create` should be replaced with manual `write-tree` to include untracked files." → Note it in `M0-NOTES.md`. Ship the `git stash create` version.
- "The `--strict` flag should also disable host MCPs in M0." → Note it. Ship the `:ro`-mounts-only behavior described in `Spike - M0 Implementation.md`.
- "There's an obvious better abstraction here." → Note it. Resist it. Concrete code first.

The point of M0 is to ship the scoped thing in 2 days. Design-evolving conversations are a separate channel.

## When in doubt

**Smaller.** M0 is hygiene, not perfection. Anything you can defer to a follow-up, defer. The whole milestone exists to convert design work into a real release without expanding scope. Discipline here is the deliverable.

## Final check before claiming done

Re-read `Spike - M0 Implementation.md`'s "Exit criteria" section. For each bullet, run the actual command or check the actual file. Do not claim done from inference; verify from observation.

If everything passes, leave the branch ready and tell the user. They run the publish.
