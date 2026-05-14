import { checkApiKey, checkDocker, checkTmux } from "../checks.ts";
import { imageExists, pullImage, buildImage, buildDockerSessionCmd } from "../docker.ts";
import { tmuxSessionExists, createTmuxSession, attachTmuxSession } from "../tmux.ts";
import { addSession, generateId } from "../registry.ts";
import { loadConfig } from "../config.ts";
import { imageTag } from "../image.ts";
import { patchMcpConfig } from "../mcp.ts";
import { resolveMounts } from "./run.ts";
import { version } from "../../package.json";

export interface SessionOptions {
  name: string | null;
  mount: string[];
  env: string[];
  noConfig: boolean;
  noBrowser: boolean;
}

export async function sessionCommand(opts: SessionOptions): Promise<void> {
  checkApiKey(opts.noConfig);
  checkDocker();
  checkTmux();

  const config = loadConfig();
  const tag = imageTag(version, config.mcpPackages);

  if (!imageExists(tag)) {
    const pulled = config.mcpPackages.length === 0 && pullImage(tag);
    if (!pulled) buildImage(tag, config.mcpPackages);
  }

  const mounts = resolveMounts(opts.mount, config.defaultMountMode);

  let id = generateId();
  let tmuxSession = `cbox-${id}`;

  if (tmuxSessionExists(tmuxSession)) {
    id = generateId();
    tmuxSession = `cbox-${id}`;
  }

  const patchedSettingsPath = opts.noConfig ? null : patchMcpConfig();

  const dockerCmd = buildDockerSessionCmd({
    tag,
    containerName: `cbox-${id}`,
    mounts,
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
    mount: mounts.length === 1 ? mounts[0].hostPath : mounts.length > 1 ? mounts.map(m => m.hostPath).join(",") : null,
    mountMode: mounts.length > 0 ? mounts[0].mode : null,
    createdAt: new Date().toISOString(),
  });

  console.log(`cbox: session ${id}${opts.name ? ` (${opts.name})` : ""} started`);
  attachTmuxSession(tmuxSession);
}
