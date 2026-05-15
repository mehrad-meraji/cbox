import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";

function claudeDir(): string {
  return process.env.CLAUDE_DIR ?? join(homedir(), ".claude");
}

// Directories/files worth copying into the container (skip large caches/history)
const COPY_ENTRIES = ["settings.local.json", "commands", "skills", "plugins", "statsig"];

export function prepareClaudeDir(): string {
  const src = claudeDir();
  const tmpDir = join(tmpdir(), `cbox-claude-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  for (const entry of COPY_ENTRIES) {
    const srcPath = join(src, entry);
    if (existsSync(srcPath)) {
      cpSync(srcPath, join(tmpDir, entry), { recursive: true });
    }
  }

  // Write patched settings.json — patch localhost and strip container-incompatible keys
  const settingsPath = join(src, "settings.json");
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, "utf8")); } catch {}
  }

  // Remove keys that cause hangs in containers: local binaries, npm downloads, plugin paths
  const { statusLine: _, enabledPlugins: __, extraKnownMarketplaces: ___, ...rest } = settings as any;

  // Patch MCP server URLs but drop servers that use local commands (no absolute path, no http)
  if (rest.mcpServers && typeof rest.mcpServers === "object") {
    const patched: Record<string, unknown> = {};
    for (const [name, cfg] of Object.entries(rest.mcpServers as Record<string, any>)) {
      const cmd: string = Array.isArray(cfg.command) ? cfg.command[0] : (cfg.command ?? "");
      // Keep only servers whose command is an absolute path or a known container binary
      if (cmd.startsWith("/") || cmd === "node" || cmd === "python" || cmd === "python3") {
        patched[name] = cfg;
      }
    }
    rest.mcpServers = patched;
  }

  // Pre-accept the workspace trust dialog so it never appears in the container
  rest.hasTrustDialogAccepted = true;

  const out = JSON.stringify(rest)
    .replace(/localhost/g, "host.docker.internal")
    .replace(/127\.0\.0\.1/g, "host.docker.internal");
  writeFileSync(join(tmpDir, "settings.json"), out);

  return tmpDir;
}

export function claudeDirPath(): string {
  return claudeDir();
}
