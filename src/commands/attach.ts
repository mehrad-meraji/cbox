import { spawnSync } from "child_process";
import { findSession } from "../registry.ts";

export function attachCommand(idOrName: string): void {
  const session = findSession(idOrName);
  if (!session) {
    console.error(`cbox: session not found: ${idOrName}\nRun 'cbox list' to see active sessions.`);
    process.exit(1);
  }
  spawnSync("docker", ["exec", "-it", session.containerName, "tmux", "attach-session", "-t", "main"], { stdio: "inherit" });
}
