import { spawnSync } from "child_process";

export function tmuxSessionExists(name: string): boolean {
  const result = spawnSync("tmux", ["has-session", "-t", name], { stdio: "pipe" });
  return result.status === 0;
}

export function createTmuxSession(sessionName: string, command: string): void {
  const create = spawnSync("tmux", ["new-session", "-d", "-s", sessionName], { stdio: "inherit" });
  if (create.status !== 0) {
    throw new Error(`Failed to create tmux session: ${sessionName}`);
  }
  spawnSync("tmux", ["send-keys", "-t", sessionName, command, "Enter"], { stdio: "inherit" });
}

export function attachTmuxSession(sessionName: string): void {
  spawnSync("tmux", ["attach", "-t", sessionName], { stdio: "inherit" });
}

export function killTmuxSession(sessionName: string): void {
  spawnSync("tmux", ["kill-session", "-t", sessionName], { stdio: "pipe" });
}
