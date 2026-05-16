import { spawnSync } from "child_process";
import { checkApiKey, checkDocker } from "../checks.ts";
import { imageExists, pullImage, buildImage, buildDockerSessionArgs } from "../docker.ts";
import { addSession, generateId, removeSession } from "../registry.ts";
import { loadConfig } from "../config.ts";
import { imageTag } from "../image.ts";
import { prepareClaudeDir, prepareClaudeJson } from "../mcp.ts";
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

  const config = loadConfig();
  const tag = imageTag(version, config.mcpPackages);

  if (!imageExists(tag)) {
    const pulled = config.mcpPackages.length === 0 && pullImage(tag);
    if (!pulled) buildImage(tag, config.mcpPackages);
  }

  const mounts = resolveMounts(opts.mount, config.defaultMountMode);

  const id = generateId();
  const containerName = `cbox-${id}`;
  const claudeDirPath = opts.noConfig ? null : prepareClaudeDir();
  const claudeJsonPath = opts.noConfig ? null : prepareClaudeJson();

  const dockerArgs = buildDockerSessionArgs({
    tag,
    containerName,
    mounts,
    env: opts.env,
    mountConfig: !opts.noConfig,
    claudeDirPath,
    claudeJsonPath,
    cboxVersion: version,
  });

  addSession({
    id,
    name: opts.name,
    containerName,
    mount: mounts.length === 1 ? mounts[0].hostPath : mounts.length > 1 ? mounts.map(m => m.hostPath).join(",") : null,
    mountMode: mounts.length > 0 ? mounts[0].mode : null,
    createdAt: new Date().toISOString(),
  });

  console.log(`cbox: session ${id}${opts.name ? ` (${opts.name})` : ""} started`);

  // Spawn docker directly — no shell wrapper, no nested PTY layers
  spawnSync("docker", dockerArgs, { stdio: "inherit" });

  removeSession(id);
}
