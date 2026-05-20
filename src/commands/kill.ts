import { findSession, getSessions, removeSession } from "../registry.ts";
import { stopContainer } from "../docker.ts";
import { cleanupSnapshot } from "../snapshot.ts";
import type { Session } from "../registry.ts";

async function killOne(session: Session): Promise<void> {
  const stopped = stopContainer(session.containerName);
  if (!stopped) {
    console.warn(`cbox: warning — could not stop container ${session.containerName} (may already be stopped)`);
  }
  removeSession(session.id);
  console.log(`cbox: killed session ${session.id}${session.name ? ` (${session.name})` : ""}`);

  if (session.snapshot) {
    try {
      await cleanupSnapshot(session.snapshot);
    } catch (err) {
      // Non-fatal — at worst a few MB left in ~/.config/cbox/snapshots/
      console.warn(`cbox: warning: failed to clean up snapshot: ${(err as Error).message}`);
    }
  }
}

export async function killCommand(idOrName: string | null, all: boolean): Promise<void> {
  if (all) {
    const sessions = getSessions();
    if (sessions.length === 0) {
      console.log("cbox: no active sessions");
      return;
    }
    for (const s of sessions) await killOne(s);
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
  await killOne(session);
}
