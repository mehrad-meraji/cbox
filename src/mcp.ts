import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";

function claudeDir(): string {
  return process.env.CLAUDE_DIR ?? join(homedir(), ".claude");
}

function settingsPath(): string {
  return join(claudeDir(), "settings.json");
}

export function patchMcpConfig(): string {
  const path = settingsPath();
  const tmpPath = join(tmpdir(), `cbox-settings-${Date.now()}.json`);

  try {
    const raw = existsSync(path) ? readFileSync(path, "utf8") : "{}";
    const patched = raw
      .replace(/localhost/g, "host.docker.internal")
      .replace(/127\.0\.0\.1/g, "host.docker.internal");
    writeFileSync(tmpPath, patched);
  } catch {
    writeFileSync(tmpPath, "{}");
  }

  return tmpPath;
}

export function claudeDirPath(): string {
  return claudeDir();
}
