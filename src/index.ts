#!/usr/bin/env bun
import { Command } from "commander";
import { buildCommand } from "./commands/build.ts";
import { runCommand } from "./commands/run.ts";
import { sessionCommand } from "./commands/session.ts";
import { listCommand } from "./commands/list.ts";
import { attachCommand } from "./commands/attach.ts";
import { killCommand } from "./commands/kill.ts";
import { registerDiffCommand } from "./commands/diff.ts";
import { version } from "../package.json";

const program = new Command();

program
  .name("cbox")
  .description("Claude Sandbox CLI — run Claude Code in Docker")
  .version(version);

function addSharedFlags(cmd: Command): Command {
  return cmd
    .option(
      "-m, --mount <path>",
      "mount a host path into /workspace (repeatable; append :ro for read-only)",
      (val: string, prev: string[]) => [...prev, val],
      [] as string[]
    )
    .option(
      "--env <KEY=VALUE>",
      "pass environment variable into container (repeatable)",
      (val: string, prev: string[]) => [...prev, val],
      [] as string[]
    )
    .option("--no-config", "skip mounting ~/.claude into container")
    .option("--no-browser", "accepted for future slim image variant (no-op in v1)")
    .option("--strict", "tighter security defaults: forces all mounts to :ro (M1+ will add further restrictions); sessions run under --strict take no mount snapshot since ro mounts cannot be mutated");
}

// cbox run (explicit subcommand, also default)
const runCmd = new Command("run")
  .description("run a one-shot prompt in a throwaway container")
  .argument("[prompt]", "prompt string (or use -f)")
  .option("-f, --file <path>", "read prompt from file")
  .option("-j, --json", "output result as JSON");

addSharedFlags(runCmd);
runCmd.action(async (prompt: string | undefined, opts) => {
  await runCommand({
    prompt: prompt ?? null,
    file: opts.file ?? null,
    json: opts.json ?? false,
    mount: opts.mount ?? [],
    env: opts.env ?? [],
    noConfig: !opts.config,
    noBrowser: !opts.browser,
    strict: opts.strict ?? false,
  });
});

program.addCommand(runCmd, { isDefault: true });

// cbox session
const sessionCmd = new Command("session")
  .description("start a persistent interactive Claude Code session")
  .option("--name <name>", "name the session for easy reattachment");

addSharedFlags(sessionCmd);
sessionCmd.action(async (opts) => {
  await sessionCommand({
    name: opts.name ?? null,
    mount: opts.mount ?? [],
    env: opts.env ?? [],
    noConfig: !opts.config,
    noBrowser: !opts.browser,
    strict: opts.strict ?? false,
  });
});

registerDiffCommand(sessionCmd);

program.addCommand(sessionCmd);

// cbox list
program
  .command("list")
  .description("list active sessions")
  .action(() => listCommand());

// cbox attach
program
  .command("attach <idOrName>")
  .description("reattach to a running session")
  .action((idOrName: string) => attachCommand(idOrName));

// cbox kill
program
  .command("kill [idOrName]")
  .description("stop a session and clean up")
  .option("--all", "kill all active sessions")
  .action(async (idOrName: string | undefined, opts) => {
    await killCommand(idOrName ?? null, opts.all ?? false);
  });

// cbox build
program
  .command("build")
  .description("force rebuild the Docker image")
  .action(async () => buildCommand({ force: true }));

program.parse();
