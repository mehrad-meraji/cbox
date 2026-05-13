# macOS Cross-Platform Binary Publishing

**Date:** 2026-05-13  
**Status:** Approved

## Problem

The published npm package ships a single `dist/cbox` binary compiled for the host platform. When built on Linux CI, this produces a Linux ELF binary that cannot run on macOS. Users on macOS get an exec format error on install.

## Goal

Publish a single `@_mehrad/cbox` npm package that works on both macOS arm64 and macOS x64, built and published automatically via GitLab CI on tag push.

## Architecture

### Binaries

Two compiled binaries are included in the package:

- `dist/cbox-darwin-arm64` — for Apple Silicon Macs
- `dist/cbox-darwin-x64` — for Intel Macs

Both are cross-compiled from a single Linux GitLab runner using Bun's `--target` flag. The existing `dist/cbox` (single-platform) is removed.

### Wrapper Script

`bin/cbox` is a POSIX shell script and is the npm `bin` entry point. It detects the CPU architecture at runtime and execs the matching binary:

```sh
#!/bin/sh
DIR=$(cd "$(dirname "$0")/.." && pwd)
ARCH=$(uname -m)
[ "$ARCH" = "arm64" ] && exec "$DIR/dist/cbox-darwin-arm64" "$@"
exec "$DIR/dist/cbox-darwin-x64" "$@"
```

Runtime overhead is negligible — the shell process is replaced by the binary via `exec`.

### package.json Changes

- `"bin"` changes from `"dist/cbox"` to `"bin/cbox"`
- `"files"` updated to include `bin/` and `dist/` (remove stale `dist/cbox` reference if present)
- Build script updated to produce both targets

### Build Script

```json
"build": "bun build --compile --minify src/index.ts --target=bun-darwin-arm64 --outfile dist/cbox-darwin-arm64 && bun build --compile --minify src/index.ts --target=bun-darwin-x64 --outfile dist/cbox-darwin-x64"
```

## GitLab CI

`.gitlab-ci.yml` with a single `publish` job:

- Triggered only on tags matching `v*`
- Uses a Linux runner (no macOS runner needed)
- Installs Bun
- Runs the build script
- Publishes to npm using `NPM_PUBLISH_TOKEN` CI variable

## Out of Scope

- Linux and Windows support (can be added later by extending the wrapper and build targets)
- Platform-specific optional packages
- macOS runners in CI
