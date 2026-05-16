# cbox — Claude Sandbox CLI

Run Claude Code in a throwaway Docker container. One-shot automation or persistent interactive sessions, sandboxed to a specific directory.

## Requirements

- [Docker Desktop](https://docs.docker.com/get-docker/) (running)
- macOS (Darwin) — Linux/Windows not yet supported
- Claude Code logged in via `claude login` on the host, or `ANTHROPIC_API_KEY` set

## Install

```sh
npm install -g @_mehrad/cbox
```

## Quick Start

```sh
# Interactive session — Claude Code sandboxed to current directory
cbox session -m .

# One-shot: run a prompt and stream output
cbox run "refactor the auth module to use JWT" -m .

# Read prompt from a file
cbox run -f task.md -m .

# JSON output for scripting
cbox run -j "list all TODO comments" -m ./src
```

## How It Works

cbox pulls a pre-built Docker image (`mehradm/cbox`) and runs Claude Code inside it as a non-root user. Your workspace is bind-mounted into the container at `/workspace`. Everything else on your host is invisible to the container — no access to `~`, SSH keys, other projects, or system files.

Your `~/.claude` config (MCP servers, settings, skills) is copied to a writable temp directory at session start so Claude has your preferences, but any writes stay in the temp copy and never touch your real config.

## Commands

### Interactive session

```sh
cbox session                             # start interactive session (no mount)
cbox session -m .                        # mount cwd read-write
cbox session -m ./src:ro                 # mount read-only
cbox session -m ./src -m ./tests         # mount multiple directories
cbox session --name refactor-auth        # named session
cbox session --env KEY=VALUE             # pass extra env var into container
cbox session --no-config                 # skip mounting ~/.claude (fully isolated)
```

Runs `docker run -it` directly — your terminal is connected to the container with full PTY ownership. Exit with `/exit` inside Claude Code or Ctrl-C twice.

### One-shot mode

```sh
cbox run "<prompt>" -m .                 # stream output
cbox run -f task.md -m .                 # prompt from file
cbox run -j "<prompt>" -m .              # JSON output
cbox run -m ./src:ro "<prompt>"          # read-only mount
cbox run -m ./src -m ./data "<prompt>"   # multiple mounts
cbox run --no-config "<prompt>"          # skip ~/.claude
```

### Session management

```sh
cbox list                        # list active sessions
cbox attach <id|name>            # reattach to a running container
cbox kill <id|name>              # stop container and remove from registry
cbox kill --all                  # stop all sessions
```

### Image management

```sh
cbox build                       # force rebuild image locally
```

The image is pulled automatically from Docker Hub on first run and cached locally. It rebuilds only when `mcpPackages` in config changes.

## Flags

| Flag | Commands | Description |
|---|---|---|
| `-m, --mount <path>` | `run`, `session` | Mount a host path (repeatable; append `:ro` for read-only) |
| `--env KEY=VALUE` | `run`, `session` | Pass an environment variable into the container (repeatable) |
| `--no-config` | `run`, `session` | Skip mounting `~/.claude` (fully isolated container) |
| `--no-browser` | `run`, `session` | Skip agent-browser (smaller, faster startup) |
| `-f, --file <path>` | `run` | Read prompt from a file |
| `-j, --json` | `run` | Wrap output in a JSON envelope |
| `--name <name>` | `session` | Name the session for easier `attach`/`kill` |

## Mounts

One `-m` mounts at `/workspace`. Multiple `-m` flags mount each path under `/workspace/<dirname>`.

```sh
cbox run -m .                    # /workspace = cwd (read-write)
cbox run -m ./src:ro             # /workspace = ./src (read-only)
cbox run -m ./src -m ./tests     # /workspace/src + /workspace/tests
```

## Configuration

`~/.config/cbox/config.json`:

```json
{
  "defaultMountMode": "rw",
  "mcpPackages": ["@my-org/my-mcp-server"]
}
```

| Field | Default | Description |
|---|---|---|
| `defaultMountMode` | `"rw"` | Default mount mode (`"rw"` or `"ro"`) |
| `mcpPackages` | `[]` | npm packages for local-process MCP servers (installed in image at build time) |

## MCP Servers

**Network MCP servers** configured with `localhost`/`127.0.0.1` URLs are automatically reachable from the container — cbox patches those URLs to `host.docker.internal` in a temp copy of your config. Your real `~/.claude/settings.json` is never modified.

**Local process MCP servers** run inside the container. Add their npm package names to `mcpPackages` in config, then run `cbox build`.

## JSON Output (`-j`)

```json
{ "output": "...", "exitCode": 0, "error": null }
```

Always valid JSON — safe to pipe into `jq`.

## Security Model

The container can only access what you explicitly mount:

- **Filesystem**: only the `-m` mount is visible at `/workspace`. Your home directory, SSH keys, credentials, and all other host files are inaccessible.
- **Process isolation**: container processes cannot see or interact with host processes.
- **Non-root user**: Claude runs as `node` (UID 1000) inside the container, not root.
- **Config safety**: `~/.claude` is copied to a writable temp directory — Claude can write session state there, but your real config directory is untouched.
- **Network**: full internet access (useful for web search, npm installs, API calls). If you need network isolation, pass `--env` or use `--no-config` to limit the attack surface.

If Claude does something destructive inside the container, `cbox kill <id>` removes it entirely. Your host is unaffected.

## Docker Image

`mehradm/cbox` on Docker Hub — built on `node:20-bookworm-slim` with:
- System Chromium (for headless browser, works on `linux/amd64` and `linux/arm64`)
- `@anthropic-ai/claude-code` and `agent-browser` installed globally
- Runs as non-root `node` user

Images are tagged `cbox:<version>` locally (or `cbox:<version>-<mcpHash>` when custom MCP packages are installed).

## Building from Source

```sh
git clone https://gitlab.com/mehrad.meraji/cbox
cd cbox
bun install
bun run build        # produces dist/cbox-darwin-{arm64,x64}
bun test
```
