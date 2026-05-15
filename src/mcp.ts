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

  // Write patched settings.json (replace localhost with host.docker.internal)
  const settingsPath = join(src, "settings.json");
  const raw = existsSync(settingsPath) ? readFileSync(settingsPath, "utf8") : "{}";
  const patched = raw
    .replace(/localhost/g, "host.docker.internal")
    .replace(/127\.0\.0\.1/g, "host.docker.internal");
  writeFileSync(join(tmpDir, "settings.json"), patched);

  return tmpDir;
}

export function claudeDirPath(): string {
  return claudeDir();
}
