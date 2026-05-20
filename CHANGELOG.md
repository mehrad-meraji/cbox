# Changelog

## 0.3.0 — Docker: git, Bun, updated Claude Code

- Docker: added `git` to the sandbox image (required for git-stash snapshot backend and general agent use).
- Docker: added `bun` to the sandbox image (`bun` and `bunx` available at `/usr/local/bin`).
- Docker: updated `@anthropic-ai/claude-code` to latest (2.1.144).

## 0.2.0 — M0: snapshots, --strict, doc honesty

- Added: `cbox session diff <id>` to view mount changes vs session start.
- Added: `--strict` flag on `run` and `session` (currently forces all mounts to `:ro`; M1+ will add further restrictions).
- Added: mount snapshot on session start (git stash backend for git repos, tarball backend for non-git directories).
- Changed: `cbox kill` now cleans up the session snapshot after stopping the container.
- Docs: acknowledged the MCP-bridge sandbox leak in Architecture.md and MCP Servers.md (see DOCS-PATCH.md if applying manually).

## 0.1.24 and earlier

See git log.
