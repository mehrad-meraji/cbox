# csb — Claude Sandbox CLI

Run Claude Code in a throwaway Docker container. One-shot automation or persistent interactive sessions that survive terminal disconnects.

## Requirements

- [Docker](https://docs.docker.com/get-docker/) (running)
- [tmux](https://github.com/tmux/tmux) (required for `session`, `attach`)
- `ANTHROPIC_API_KEY` environment variable set

## Install

```sh
bun install -g csb     # global install
bunx csb               # no-install, always latest
```

## Quick Start

```sh
# One-shot: run a prompt and stream output
csb "refactor the auth module to use JWT"

# Interactive: persistent Claude Code session
csb session --mount .

# Mount current directory and run a task from a file
csb run -f task.md --mount .

# JSON output for scripting
csb run -j "list all TODO comments" --mount ./src
```

## Commands

### One-shot mode

```sh
csb "<prompt>"                        # implicit run
csb run "<prompt>"                    # explicit (same behaviour)
csb run -f task.md                    # prompt from file
csb run -j "<prompt>"                 # JSON output
csb run --mount . "<prompt>"          # mount cwd read-write
csb run --mount ./src:ro "<prompt>"   # mount read-only
csb run --env KEY=VALUE "<prompt>"    # pass env var into container
csb run --no-config "<prompt>"        # skip mounting ~/.claude
csb run --no-browser "<prompt>"       # skip agent-browser (lighter image)
```

Streams Claude Code's stdout/stderr directly. Exits with the container's exit code.

### Interactive session mode

```sh
csb session                           # start interactive session
csb session --mount .                 # mount cwd read-write
csb session --mount ./src:ro          # mount read-only
csb session --name refactor-auth      # named session
csb session --env KEY=VALUE           # pass env var
csb session --no-config               # skip mounting ~/.claude
csb session --no-browser              # lighter container
```

Creates a tmux session on the host, starts Docker inside it. Attaching/detaching from tmux leaves the container running. Reconnect anytime with `csb attach`.

### Session management

```sh
csb list                              # list active sessions
csb attach <id|name>                  # reattach to a session
csb kill <id|name>                    # stop container + tmux + prune registry
csb kill --all                        # kill everything
```

`csb list` cross-references live sessions against `docker ps` and automatically prunes dead entries.

### Image management

```sh
csb build                             # force rebuild Docker image
```

The image is built automatically on first run and cached. It rebuilds when the CLI version changes or `mcpPackages` in config changes.

## Flags

| Flag | Commands | Description |
|---|---|---|
| `--mount <path>` or `--mount <path>:ro` | `run`, `session` | Mount a host path into `/workspace` (default: read-write) |
| `--env KEY=VALUE` | `run`, `session` | Pass an environment variable into the container (repeatable) |
| `--no-config` | `run`, `session` | Skip mounting `~/.claude` (fully isolated container) |
| `--no-browser` | `run`, `session` | Skip agent-browser (smaller, faster startup) |
| `-f, --file <path>` | `run` | Read prompt from a file instead of argument |
| `-j, --json` | `run` | Wrap output in a JSON envelope |

## Mounts

`--mount .` resolves to the absolute path of your cwd at invocation time and mounts it as `-v /abs/path:/workspace:rw` inside the container. All mounts land at `/workspace`.

```sh
csb run --mount .            # /workspace = cwd (read-write)
csb run --mount ./src:ro     # /workspace = ./src (read-only)
csb run --mount /abs/path    # /workspace = /abs/path (read-write)
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

`~/.config/csb/config.json`:

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

Active sessions are tracked at `~/.config/csb/sessions.json`. Each session entry records its ID, name, tmux session name, container name, mount path, and creation time. Writes are atomic (temp file + rename).

## Raycast Integration

Four Script Commands live in `raycast/`:

| Script | Behaviour |
|---|---|
| `csb-list-sessions.sh` | Searchable list of active sessions |
| `csb-attach-session.sh` | Opens Terminal and runs `csb attach <id>` |
| `csb-kill-session.sh` | Runs `csb kill <id>` with confirmation |
| `csb-run-prompt.sh` | Runs `csb run -j "<input>"`, shows output inline |

Copy the scripts into your Raycast Script Commands directory. The terminal app used by `csb-attach-session.sh` is configurable via `terminalApp` in config.

## MCP Servers

**Network MCP servers** (configured with `localhost`/`127.0.0.1` URLs) are reachable from inside the container — csb patches the config transparently at runtime, replacing those URLs with `host.docker.internal`. The host config is never modified; the patched copy lives in a temp file for the duration of the run.

Network MCP servers must already be running on the host before invoking `csb`.

**Local process MCP servers** run inside the container as Claude Code child processes. Install them by adding their npm package names to `mcpPackages` in config and running `csb build`.

## Security

- `ANTHROPIC_API_KEY` is passed as an environment variable reference — the value is never embedded in command strings, shell history, or tmux state.
- `~/.claude` is mounted **read-only**. Claude Code inside the container cannot modify your host config.
- MCP config patching writes to a system temp directory. Your `~/.claude/settings.json` is never touched.

## Docker Image

Based on `node:20-bookworm-slim` with Chrome dependencies for headless browser support. Images are tagged `csb:<version>` or `csb:<version>-<mcpHash>`.

Old images are left in place after upgrades. Clean them up with `docker image prune`.

## Building from Source

```sh
git clone https://github.com/mehrad/csb
cd csb
bun install
bun run build        # produces dist/csb
bun test             # run test suite
```
