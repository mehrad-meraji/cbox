import { resolve, basename } from "path";
import { readFileSync, existsSync } from "fs";
import { checkApiKey, checkDocker } from "../checks.ts";
import { imageExists, pullImage, buildImage, runOneShot, type MountSpec } from "../docker.ts";
import { loadConfig } from "../config.ts";
import { imageTag } from "../image.ts";
import { patchMcpConfig } from "../mcp.ts";
import { version } from "../../package.json";

export interface RunOptions {
  prompt: string | null;
  file: string | null;
  json: boolean;
  mount: string[];
  env: string[];
  noConfig: boolean;
  noBrowser: boolean;
}

export function parseMountFlag(flag: string): { path: string; mode: "rw" | "ro" } {
  const parts = flag.split(":");
  const mode = parts[parts.length - 1] === "ro" ? "ro" : "rw";
  const path = parts.length > 1 && (parts[parts.length - 1] === "ro" || parts[parts.length - 1] === "rw")
    ? parts.slice(0, -1).join(":")
    : flag;
  return { path, mode };
}

export function resolveMounts(mountFlags: string[], defaultMode: "rw" | "ro"): MountSpec[] {
  const specs: MountSpec[] = [];
  for (const flag of mountFlags) {
    const { path, mode } = parseMountFlag(flag);
    const hostPath = resolve(path);
    if (!existsSync(hostPath)) {
      console.error(`cbox: mount path does not exist: ${hostPath}`);
      process.exit(1);
    }
    const containerPath = mountFlags.length === 1 ? "/workspace" : `/workspace/${basename(hostPath)}`;
    specs.push({ hostPath, containerPath, mode });
  }
  return specs;
}

export async function runCommand(opts: RunOptions): Promise<void> {
  checkApiKey(opts.noConfig);
  checkDocker();

  let prompt = opts.prompt;
  if (opts.file) {
    if (!existsSync(opts.file)) {
      console.error(`cbox: file not found: ${opts.file}`);
      process.exit(1);
    }
    prompt = readFileSync(opts.file, "utf8").trim();
  }

  if (!prompt) {
    console.error("cbox: provide a prompt or use -f <file>");
    process.exit(1);
  }

  const config = loadConfig();
  const tag = imageTag(version, config.mcpPackages);

  if (!imageExists(tag)) {
    const pulled = config.mcpPackages.length === 0 && pullImage(tag);
    if (!pulled) buildImage(tag, config.mcpPackages);
  }

  const mounts = resolveMounts(opts.mount, config.defaultMountMode);
  const patchedSettingsPath = opts.noConfig ? null : patchMcpConfig();

  const { output, exitCode } = await runOneShot(
    {
      tag,
      prompt,
      mounts,
      env: opts.env,
      mountConfig: !opts.noConfig,
      patchedSettingsPath,
    },
    opts.json
  );

  if (opts.json) {
    console.log(
      JSON.stringify({
        output,
        exitCode,
        error: exitCode !== 0 ? `Claude Code exited with code ${exitCode}` : null,
      })
    );
  }

  process.exit(exitCode);
}
