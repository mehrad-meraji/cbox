import { findSession, getSessions, removeSession } from "../registry.ts";
import { stopContainer } from "../docker.ts";
import { killTmuxSession } from "../tmux.ts";
import type { Session } from "../registry.ts";

function killOne(session: Session): void {
  const stopped = stopContainer(session.containerName);
  if (!stopped) {
    console.warn(`cbox: warning — could not stop container ${session.containerName} (may already be stopped)`);
  }
  killTmuxSession(session.tmuxSession);
  removeSession(session.id);
  console.log(`cbox: killed session ${session.id}${session.name ? ` (${session.name})` : ""}`);
}

export function killCommand(idOrName: string | null, all: boolean): void {
  if (all) {
    const sessions = getSessions();
    if (sessions.length === 0) {
      console.log("cbox: no active sessions");
      return;
    }
    for (const s of sessions) killOne(s);
    return;
  }

  if (!idOrName) {
    console.error("cbox: provide a session id/name or use --all");
    process.exit(1);
  }

  const session = findSession(idOrName);
  if (!session) {
    console.error(`cbox: session not found: ${idOrName}\nRun 'cbox list' to see active sessions.`);
    process.exit(1);
  }
  killOne(session);
}
