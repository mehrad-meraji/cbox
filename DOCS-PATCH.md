# Documentation Honesty Pass — M0

Apply these changes manually to the two Obsidian notes on your Mac.
The iCloud path is not accessible from the dev container.

---

## File 1: Architecture.md

Location: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/Projects/cbox/Architecture.md`

Under the "Security Model" table, add this row:

| Concern | Approach |
|---|---|
| **MCP-bridge side channels** | When host MCPs are bridged via the `localhost → host.docker.internal` patch, **stateful side effects in those MCPs escape the container boundary**. The container's filesystem is throwaway; the host MCPs are not. Treat any host MCP as part of your trust boundary, not part of the sandbox. See `Threat Model` T10 for the writeup and `--strict` (v0.2.0+) for the opt-out. |

---

## File 2: MCP Servers.md

Location: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/Projects/cbox/MCP Servers.md`

Add a new section at the bottom of the file:

```markdown
## Caveats

**The MCP bridge is a leak.** When `~/.claude/settings.json` lists MCP servers running on the host and cbox patches `localhost` → `host.docker.internal` to make them reachable from the container, anything those servers do persists outside the sandbox. The container is throwaway; the MCPs are not. If an MCP server writes to disk, sends mail, makes API calls, or mutates external state, those effects survive the container's exit and are not captured by `cbox session diff`.

This is by design — the bridge is what makes host MCPs usable from a sandboxed agent — but it does mean **host MCPs are part of your trust boundary, not your sandbox**. For runs where this matters (e.g. an overnight agent task), use `--strict` to refuse host MCPs entirely.
```
