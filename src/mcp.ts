import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, chmodSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

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
  const settingsOut = join(tmpDir, "settings.json");
  writeFileSync(settingsOut, out);
  chmodSync(settingsOut, 0o666);   // writable by container's node user (UID 1000)
  chmodSync(tmpDir, 0o777);

  // Extract OAuth credentials from macOS Keychain and write .credentials.json
  // so Claude Code on Linux (which can't access Keychain) finds them in ~/.claude/
  const keychainResult = spawnSync(
    "security",
    ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
    { stdio: "pipe" }
  );
  if (keychainResult.status === 0) {
    const credJson = keychainResult.stdout.toString().trim();
    const credPath = join(tmpDir, ".credentials.json");
    writeFileSync(credPath, credJson);
    chmodSync(credPath, 0o666);
  }

  return tmpDir;
}

export function prepareClaudeJson(): string {
  const src = join(homedir(), ".claude.json");
  const tmpPath = join(tmpdir(), `cbox-claude-${Date.now()}.json`);

  let data: Record<string, unknown> = {};
  if (existsSync(src)) {
    try { data = JSON.parse(readFileSync(src, "utf8")); } catch {}
  }

  // Skip workspace trust dialog
  data.hasTrustDialogAccepted = true;
  const projects = (data.projects as Record<string, unknown>) ?? {};
  projects["/workspace"] = {
    ...(projects["/workspace"] as Record<string, unknown> ?? {}),
    hasTrustDialogAccepted: true,
    hasCompletedProjectOnboarding: true,
  };
  data.projects = projects;

  // Skip --dangerously-skip-permissions disclaimer
  data.bypassPermissionsModeAccepted = true;

  writeFileSync(tmpPath, JSON.stringify(data));
  chmodSync(tmpPath, 0o666);   // writable by container's node user (UID 1000)
  return tmpPath;
}

export function claudeDirPath(): string {
  return claudeDir();
}
