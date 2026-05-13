import { findSession, getSessions, removeSession } from "../registry.ts";
import { stopContainer } from "../docker.ts";
import { killTmuxSession } from "../tmux.ts";
import type { Session } from "../registry.ts";

function killOne(session: Session): void {
  stopContainer(session.containerName);
  killTmuxSession(session.tmuxSession);
  removeSession(session.id);
  console.log(`csb: killed session ${session.id}${session.name ? ` (${session.name})` : ""}`);
}

export function killCommand(idOrName: string | null, all: boolean): void {
  if (all) {
    const sessions = getSessions();
    if (sessions.length === 0) {
      console.log("csb: no active sessions");
      return;
    }
    for (const s of sessions) killOne(s);
    return;
  }

  if (!idOrName) {
    console.error("csb: provide a session id/name or use --all");
    process.exit(1);
  }

  const session = findSession(idOrName);
  if (!session) {
    console.error(`csb: session not found: ${idOrName}\nRun 'csb list' to see active sessions.`);
    process.exit(1);
  }
  killOne(session);
}
