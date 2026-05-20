import { Command } from "commander";
import { findSession } from "../registry.ts";
import { diffSnapshot } from "../snapshot.ts";

export function registerDiffCommand(parent: Command): void {
  parent
    .command("diff <id>")
    .description("Show mount changes for a session vs its start-of-session snapshot")
    .option("--stat", "show file-level summary only")
    .option("-p, --subpath <path>", "limit diff to subpath of the mount")
    .action(async (id: string, opts: { stat?: boolean; subpath?: string }) => {
      const session = findSession(id);
      if (!session) {
        console.error(`cbox: no session found for "${id}"`);
        process.exit(2);
      }
      if (!session.snapshot) {
        console.error(
          `cbox: session "${id}" has no snapshot (created before snapshots were enabled, or snapshotting was disabled)`
        );
        process.exit(2);
      }
      try {
        const out = await diffSnapshot(session.snapshot, {
          stat: opts.stat,
          subpath: opts.subpath,
        });
        process.stdout.write(out);
      } catch (err) {
        console.error(`cbox: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
