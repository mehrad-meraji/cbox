# macOS Cross-Platform Binary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `dist/cbox-darwin-arm64` and `dist/cbox-darwin-x64` in the npm package, selected at runtime by a shell wrapper, built and published via GitLab CI.

**Architecture:** A POSIX shell wrapper at `bin/cbox` becomes the npm bin entry point. It detects `uname -m` and execs the matching prebuilt binary. Both binaries are cross-compiled from a single Linux GitLab runner using Bun's `--target` flag. Publishing is triggered on `v*` git tags.

**Tech Stack:** Bun (cross-compilation), npm (registry), GitLab CI, POSIX sh

---

### Task 1: Create the platform-detection wrapper script

**Files:**
- Create: `bin/cbox`

- [ ] **Step 1: Create the `bin/` directory and write the wrapper**

```sh
mkdir -p bin
```

Create `bin/cbox` with these exact contents:

```sh
#!/bin/sh
DIR=$(cd "$(dirname "$0")/.." && pwd)
ARCH=$(uname -m)
[ "$ARCH" = "arm64" ] && exec "$DIR/dist/cbox-darwin-arm64" "$@"
exec "$DIR/dist/cbox-darwin-x64" "$@"
```

- [ ] **Step 2: Make the wrapper executable**

```sh
chmod +x bin/cbox
```

- [ ] **Step 3: Verify the wrapper is executable and has the right contents**

```sh
ls -la bin/cbox
cat bin/cbox
```

Expected: `-rwxr-xr-x` permissions, shebang line visible.

- [ ] **Step 4: Commit**

```bash
git add bin/cbox
git commit -m "feat: add platform-detection wrapper script for macOS binaries"
```

---

### Task 2: Update `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update `bin` and `build` script**

In `package.json`, make these two changes:

Change `"bin"`:
```json
"bin": {
  "cbox": "bin/cbox"
},
```

Change the `"build"` script:
```json
"build": "bun build --compile --minify src/index.ts --target=bun-darwin-arm64 --outfile dist/cbox-darwin-arm64 && bun build --compile --minify src/index.ts --target=bun-darwin-x64 --outfile dist/cbox-darwin-x64",
```

- [ ] **Step 2: Verify the JSON is valid**

```sh
bun -e "require('./package.json')" && echo "valid JSON"
```

Expected: `valid JSON`

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: update bin entry to wrapper, build script for dual macOS targets"
```

---

### Task 3: Update `.npmignore`

**Files:**
- Modify: `.npmignore`

- [ ] **Step 1: Add the old binary path and allow the new ones**

The old binary `dist/cbox` is no longer produced. Add an explicit exclusion so it can never accidentally leak in. The new `dist/cbox-darwin-*` binaries are not in `.npmignore` and will be published automatically.

Append to `.npmignore`:
```
dist/cbox
```

- [ ] **Step 2: Commit**

```bash
git add .npmignore
git commit -m "chore: exclude old dist/cbox from npm publish"
```

---

### Task 4: Build and smoke-test locally

**Files:** none (verification only)

- [ ] **Step 1: Run the build**

```sh
bun run build
```

Expected output: two compile steps completing without error, no mention of `dist/cbox`.

- [ ] **Step 2: Verify both binaries exist and are macOS binaries**

```sh
file dist/cbox-darwin-arm64 dist/cbox-darwin-x64
```

Expected:
```
dist/cbox-darwin-arm64: Mach-O 64-bit executable arm64
dist/cbox-darwin-x64:   Mach-O 64-bit executable x86_64
```

- [ ] **Step 3: Smoke-test the wrapper on the current machine**

```sh
bin/cbox --version
```

Expected: prints the version string (e.g., `0.1.3`), no errors.

- [ ] **Step 4: Verify `dist/cbox` (old binary) no longer exists**

```sh
ls dist/
```

Expected: only `cbox-darwin-arm64`, `cbox-darwin-x64`, and `index.js.map` visible.

---

### Task 5: Create `.gitlab-ci.yml`

**Files:**
- Create: `.gitlab-ci.yml`

- [ ] **Step 1: Write the pipeline**

Create `.gitlab-ci.yml`:

```yaml
stages:
  - publish

publish:npm:
  stage: publish
  image: ubuntu:22.04
  rules:
    - if: $CI_COMMIT_TAG =~ /^v/
  before_script:
    - apt-get update -qq && apt-get install -y curl unzip
    - curl -fsSL https://bun.sh/install | bash
    - export PATH="$HOME/.bun/bin:$PATH"
  script:
    - bun install --frozen-lockfile
    - bun run build
    - echo "//registry.npmjs.org/:_authToken=${NPM_PUBLISH_TOKEN}" > .npmrc
    - npm publish --access public
  after_script:
    - rm -f .npmrc
```

The `NPM_PUBLISH_TOKEN` variable must be set in GitLab CI/CD settings → Variables (masked, protected).

- [ ] **Step 2: Verify the YAML is valid**

```sh
bun -e "
const fs = require('fs');
// Basic check: file exists and is non-empty
const content = fs.readFileSync('.gitlab-ci.yml', 'utf8');
console.log('Lines:', content.split('\n').length);
console.log('Has publish job:', content.includes('publish:npm'));
"
```

Expected: line count > 0, `Has publish job: true`.

- [ ] **Step 3: Commit**

```bash
git add .gitlab-ci.yml
git commit -m "ci: add GitLab CI pipeline for macOS binary publish on version tags"
```

---

### Task 6: Update `.gitignore` for new binary names

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Verify `dist/` is already ignored**

```sh
cat .gitignore | grep dist
```

Expected: `dist/` appears — both new binaries are already covered by this glob.

No change needed. If `dist/` is not present, add it.

- [ ] **Step 2: Verify new binaries are not tracked**

```sh
git status dist/
```

Expected: nothing listed (files are ignored).

---

### Task 7: End-to-end publish dry run

**Files:** none (verification only)

- [ ] **Step 1: Check what will be included in the npm package**

```sh
npm pack --dry-run 2>&1
```

Expected output includes:
- `bin/cbox`
- `dist/cbox-darwin-arm64`
- `dist/cbox-darwin-x64`

Expected output does NOT include:
- `dist/cbox` (old binary)
- `src/` files
- `dist/*.map` files

- [ ] **Step 2: If the output looks correct, you're done**

The next publish triggered by a `v*` tag push to GitLab will build and publish the corrected package automatically.
