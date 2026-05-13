import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";

function claudeDir(): string {
  return process.env.CLAUDE_DIR ?? join(homedir(), ".claude");
}

function settingsPath(): string {
  return join(claudeDir(), "settings.json");
}

export function patchMcpConfig(): string | null {
  const path = settingsPath();
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, "utf8");
    const patched = raw
      .replace(/localhost/g, "host.docker.internal")
      .replace(/127\.0\.0\.1/g, "host.docker.internal");

    const tmpPath = join(tmpdir(), `cbox-settings-${Date.now()}.json`);
    writeFileSync(tmpPath, patched);
    return tmpPath;
  } catch {
    return null;
  }
}

export function claudeDirPath(): string {
  return claudeDir();
}
