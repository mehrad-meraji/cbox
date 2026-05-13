import { getSessions, updateSessions } from "../registry.ts";
import { isContainerRunning } from "../docker.ts";
import type { Session } from "../registry.ts";

function age(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function listCommand(): void {
  const sessions = getSessions();
  const live = sessions.filter((s) => isContainerRunning(s.containerName));

  if (live.length !== sessions.length) {
    updateSessions(live);
  }

  if (live.length === 0) {
    console.log("No active sessions. Start one with: cbox session");
    return;
  }

  console.log("\nID       NAME                MOUNT                          AGE");
  console.log("─".repeat(65));
  for (const s of live) {
    const id = s.id.padEnd(8);
    const name = (s.name ?? "—").padEnd(19);
    const mount = (s.mount ?? "—").padEnd(30);
    const a = age(s.createdAt);
    console.log(`${id} ${name} ${mount} ${a}`);
  }
  console.log();
}
