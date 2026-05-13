import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "fs";
import { randomBytes } from "crypto";

export interface Session {
  id: string;
  name: string | null;
  tmuxSession: string;
  containerName: string;
  mount: string | null;
  mountMode: "rw" | "ro" | null;
  createdAt: string;
}

interface Registry {
  version: number;
  sessions: Session[];
}

function configDir(): string {
  return process.env.CBOX_CONFIG_DIR ?? join(homedir(), ".config", "cbox");
}

function sessionsPath(): string {
  return join(configDir(), "sessions.json");
}

function read(): Registry {
  const path = sessionsPath();
  if (!existsSync(path)) return { version: 1, sessions: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    console.warn("cbox: sessions registry corrupted, resetting");
    return { version: 1, sessions: [] };
  }
}

function write(registry: Registry): void {
  const dir = configDir();
  mkdirSync(dir, { recursive: true });
  const path = sessionsPath();
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(registry, null, 2));
  renameSync(tmp, path);
}

export function generateId(): string {
  return randomBytes(3).toString("hex");
}

export function getSessions(): Session[] {
  return read().sessions;
}

export function addSession(session: Session): void {
  const reg = read();
  reg.sessions.push(session);
  write(reg);
}

export function removeSession(id: string): void {
  const reg = read();
  reg.sessions = reg.sessions.filter((s) => s.id !== id);
  write(reg);
}

export function findSession(idOrName: string): Session | undefined {
  return getSessions().find((s) => s.id === idOrName || s.name === idOrName);
}

export function updateSessions(sessions: Session[]): void {
  write({ version: 1, sessions });
}
