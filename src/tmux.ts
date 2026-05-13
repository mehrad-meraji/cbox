import { spawnSync } from "child_process";

export function tmuxSessionExists(name: string): boolean {
  const result = spawnSync("tmux", ["has-session", "-t", name], { stdio: "pipe" });
  return result.status === 0;
}

export function createTmuxSession(sessionName: string, command: string): void {
  const result = spawnSync("tmux", ["new-session", "-d", "-s", sessionName, command], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Failed to create tmux session: ${sessionName}`);
  }
}

export function attachTmuxSession(sessionName: string): void {
  spawnSync("tmux", ["attach", "-t", sessionName], { stdio: "inherit" });
}

export function killTmuxSession(sessionName: string): void {
  spawnSync("tmux", ["kill-session", "-t", sessionName], { stdio: "pipe" });
}
