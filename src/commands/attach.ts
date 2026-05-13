import { findSession } from "../registry.ts";
import { attachTmuxSession } from "../tmux.ts";

export function attachCommand(idOrName: string): void {
  const session = findSession(idOrName);
  if (!session) {
    console.error(`cbox: session not found: ${idOrName}\nRun 'cbox list' to see active sessions.`);
    process.exit(1);
  }
  attachTmuxSession(session.tmuxSession);
}
