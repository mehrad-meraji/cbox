import { resolve } from "path";
import { existsSync } from "fs";
import { checkApiKey, checkDocker, checkTmux } from "../checks.ts";
import { imageExists, buildImage, buildDockerSessionCmd } from "../docker.ts";
import { tmuxSessionExists, createTmuxSession, attachTmuxSession } from "../tmux.ts";
import { addSession, generateId } from "../registry.ts";
import { loadConfig } from "../config.ts";
import { imageTag } from "../image.ts";
import { patchMcpConfig } from "../mcp.ts";
import { parseMountFlag } from "./run.ts";
import { version } from "../../package.json";

export interface SessionOptions {
  name: string | null;
  mount: string | null;
  env: string[];
  noConfig: boolean;
  noBrowser: boolean;
}

export async function sessionCommand(opts: SessionOptions): Promise<void> {
  checkApiKey();
  checkDocker();
  checkTmux();

  const config = loadConfig();
  const tag = imageTag(version, config.mcpPackages);

  if (!imageExists(tag)) {
    buildImage(tag, config.mcpPackages);
  }

  let resolvedMount: string | null = null;
  let mountMode: "rw" | "ro" = config.defaultMountMode;
  if (opts.mount) {
    const parsed = parseMountFlag(opts.mount);
    resolvedMount = resolve(parsed.path);
    mountMode = parsed.mode;
    if (!existsSync(resolvedMount)) {
      console.error(`cbox: mount path does not exist: ${resolvedMount}`);
      process.exit(1);
    }
  }

  let id = generateId();
  let tmuxSession = `cbox-${id}`;

  // Retry once on name collision
  if (tmuxSessionExists(tmuxSession)) {
    id = generateId();
    tmuxSession = `cbox-${id}`;
  }

  const patchedSettingsPath = opts.noConfig ? null : patchMcpConfig();

  const dockerCmd = buildDockerSessionCmd({
    tag,
    containerName: `cbox-${id}`,
    mount: resolvedMount,
    mountMode,
    env: opts.env,
    mountConfig: !opts.noConfig,
    patchedSettingsPath,
  });

  createTmuxSession(tmuxSession, dockerCmd);

  addSession({
    id,
    name: opts.name,
    tmuxSession,
    containerName: `cbox-${id}`,
    mount: resolvedMount,
    mountMode: resolvedMount ? mountMode : null,
    createdAt: new Date().toISOString(),
  });

  console.log(`cbox: session ${id}${opts.name ? ` (${opts.name})` : ""} started`);
  attachTmuxSession(tmuxSession);
}
