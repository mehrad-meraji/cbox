# cbox — Claude Sandbox CLI

Run Claude Code in a throwaway Docker container. One-shot automation or persistent interactive sessions that survive terminal disconnects.

## Requirements

- [Docker](https://docs.docker.com/get-docker/) (running)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/getting-started) installed and logged in via `claude login`
- [tmux](https://github.com/tmux/tmux) (required for `session`, `attach`)

## Install

```sh
bun install -g @_mehrad/cbox     # global install
bunx @_mehrad/cbox               # no-install, always latest
```

## Quick Start

```sh
# One-shot: run a prompt and stream output
cbox "refactor the auth module to use JWT"

# Interactive: persistent Claude Code session
cbox session -m .

# Mount current directory and run a task from a file
cbox run -f task.md -m .

# Mount multiple directories
cbox run -m ./src -m ./tests "add tests for the auth module"

# JSON output for scripting
cbox run -j "list all TODO comments" -m ./src
```

## Commands

### One-shot mode

```sh
cbox "<prompt>"                          # implicit run
cbox run "<prompt>"                      # explicit (same behaviour)
cbox run -f task.md                      # prompt from file
cbox run -j "<prompt>"                   # JSON output
cbox run -m . "<prompt>"                 # mount cwd read-write
cbox run -m ./src:ro "<prompt>"          # mount read-only
cbox run -m ./src -m ./data "<prompt>"   # mount multiple directories
cbox run --env KEY=VALUE "<prompt>"      # pass env var into container
cbox run --no-config "<prompt>"          # skip mounting ~/.claude
cbox run --no-browser "<prompt>"         # skip agent-browser (lighter image)
```

Streams Claude Code's stdout/stderr directly. Exits with the container's exit code.

### Interactive session mode

```sh
cbox session                             # start interactive session
cbox session -m .                        # mount cwd read-write
cbox session -m ./src:ro                 # mount read-only
cbox session -m ./src -m ./data          # mount multiple directories
cbox session --name refactor-auth        # named session
cbox session --env KEY=VALUE             # pass env var
cbox session --no-config                 # skip mounting ~/.claude
cbox session --no-browser                # lighter container
```

Creates a tmux session on the host, starts Docker inside it. Attaching/detaching from tmux leaves the container running. Reconnect anytime with `cbox attach`.

### Session management

```sh
cbox list                              # list active sessions
cbox attach <id|name>                  # reattach to a session
cbox kill <id|name>                    # stop container + tmux + prune registry
cbox kill --all                        # kill everything
```

`cbox list` cross-references live sessions against `docker ps` and automatically prunes dead entries.

### Image management

```sh
cbox build                             # force rebuild Docker image
```

The image is built automatically on first run and cached. It rebuilds when the CLI version changes or `mcpPackages` in config changes.

## Flags

| Flag | Commands | Description |
|---|---|---|
| `-m, --mount <path>` | `run`, `session` | Mount a host path (repeatable; append `:ro` for read-only) |
| `--env KEY=VALUE` | `run`, `session` | Pass an environment variable into the container (repeatable) |
| `--no-config` | `run`, `session` | Skip mounting `~/.claude` (fully isolated container) |
| `--no-browser` | `run`, `session` | Skip agent-browser (smaller, faster startup) |
| `-f, --file <path>` | `run` | Read prompt from a file instead of argument |
| `-j, --json` | `run` | Wrap output in a JSON envelope |

## Mounts

Pass `-m` once for a single mount (lands at `/workspace`) or multiple times for named mounts (each lands at `/workspace/<dirname>`).

```sh
# Single mount — lands at /workspace
cbox run -m .                    # /workspace = cwd (read-write)
cbox run -m ./src:ro             # /workspace = ./src (read-only)
cbox run -m /abs/path            # /workspace = /abs/path (read-write)

# Multiple mounts — each named by directory basename
cbox run -m ./src -m ./tests     # /workspace/src + /workspace/tests
cbox run -m ./src -m ./data:ro   # /workspace/src (rw) + /workspace/data (ro)
```

## Tools Inside the Container

| Tool | Description |
|---|---|
| `claude` | Claude Code with `--dangerously-skip-permissions` |
| `agent-browser` | Headless browser automation (Chrome baked in) |
| Host skills | Mounted from `~/.claude` (unless `--no-config`) |
| MCP servers | Host config mounted read-only; `localhost` URLs rewritten to `host.docker.internal` |
| Local MCP packages | Installed at image build time via `mcpPackages` in config |

## JSON Output (`-j`)

```json
{
  "output": "...",
  "exitCode": 0,
  "error": null
}
```

On failure:

```json
{
  "output": "",
  "exitCode": 1,
  "error": "Claude Code exited with code 1"
}
```

Always valid JSON — safe to pipe into `jq`.

## Configuration

`~/.config/cbox/config.json`:

```json
{
  "defaultMountMode": "rw",
  "terminalApp": "Terminal",
  "mcpPackages": ["@my-org/my-mcp-server"]
}
```

| Field | Default | Description |
|---|---|---|
| `defaultMountMode` | `"rw"` | Default mount mode (`"rw"` or `"ro"`) |
| `terminalApp` | `"Terminal"` | Terminal for Raycast attach (`"Terminal"` or `"iTerm"`) |
| `mcpPackages` | `[]` | npm packages for local-process MCP servers (installed in image) |

Adding or removing a package in `mcpPackages` triggers an automatic image rebuild on the next run.

## Session Registry

Active sessions are tracked at `~/.config/cbox/sessions.json`. Each session entry records its ID, name, tmux session name, container name, mount path, and creation time. Writes are atomic (temp file + rename).

## Raycast Integration

Four Script Commands live in `raycast/`:

| Script | Behaviour |
|---|---|
| `cbox-list-sessions.sh` | Searchable list of active sessions |
| `cbox-attach-session.sh` | Opens Terminal and runs `cbox attach <id>` |
| `cbox-kill-session.sh` | Runs `cbox kill <id>` with confirmation |
| `cbox-run-prompt.sh` | Runs `cbox run -j "<input>"`, shows output inline |

Copy the scripts into your Raycast Script Commands directory. The terminal app used by `cbox-attach-session.sh` is configurable via `terminalApp` in config.

## MCP Servers

**Network MCP servers** (configured with `localhost`/`127.0.0.1` URLs) are reachable from inside the container — cbox patches the config transparently at runtime, replacing those URLs with `host.docker.internal`. The host config is never modified; the patched copy lives in a temp file for the duration of the run.

Network MCP servers must already be running on the host before invoking `cbox`.

**Local process MCP servers** run inside the container as Claude Code child processes. Install them by adding their npm package names to `mcpPackages` in config and running `cbox build`.

## Security

- `ANTHROPIC_API_KEY` is passed as an environment variable reference — the value is never embedded in command strings, shell history, or tmux state.
- `~/.claude` is mounted **read-only**. Claude Code inside the container cannot modify your host config.
- MCP config patching writes to a system temp directory. Your `~/.claude/settings.json` is never touched.

## Docker Image

Based on `node:20-bookworm-slim` with Chrome dependencies for headless browser support. Images are tagged `cbox:<version>` or `cbox:<version>-<mcpHash>`.

Old images are left in place after upgrades. Clean them up with `docker image prune`.

## Building from Source

```sh
git clone https://gitlab.com/mehrad.meraji/cbox
cd cbox
bun install
bun run build        # produces dist/cbox
bun test             # run test suite
```
