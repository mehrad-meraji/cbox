import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

export interface Config {
  defaultMountMode: "rw" | "ro";
  terminalApp: "Terminal" | "iTerm";
  mcpPackages: string[];
}

const DEFAULTS: Config = {
  defaultMountMode: "rw",
  terminalApp: "Terminal",
  mcpPackages: [],
};

function configDir(): string {
  return process.env.CSB_CONFIG_DIR ?? join(homedir(), ".config", "csb");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

export function loadConfig(): Config {
  const path = configPath();
  if (!existsSync(path)) return { ...DEFAULTS };
  try {
    const raw = readFileSync(path, "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(config: Config): void {
  const dir = configDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(config, null, 2));
}
