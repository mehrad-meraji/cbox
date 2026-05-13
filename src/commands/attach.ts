import { findSession } from "../registry.ts";
import { attachTmuxSession } from "../tmux.ts";

export function attachCommand(idOrName: string): void {
  const session = findSession(idOrName);
  if (!session) {
    console.error(`csb: session not found: ${idOrName}\nRun 'csb list' to see active sessions.`);
    process.exit(1);
  }
  attachTmuxSession(session.tmuxSession);
}
