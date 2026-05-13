import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { checkApiKey, checkDocker } from "../checks.ts";
import { imageExists, buildImage, runOneShot } from "../docker.ts";
import { loadConfig } from "../config.ts";
import { imageTag } from "../image.ts";
import { patchMcpConfig } from "../mcp.ts";
import { version } from "../../package.json";

export interface RunOptions {
  prompt: string | null;
  file: string | null;
  json: boolean;
  mount: string | null;
  env: string[];
  noConfig: boolean;
  noBrowser: boolean;
}

export function parseMountFlag(flag: string): { path: string; mode: "rw" | "ro" } {
  const parts = flag.split(":");
  const mode = parts[parts.length - 1] === "ro" ? "ro" : "rw";
  // Remove trailing :ro or :rw if present
  const path = parts.length > 1 && (parts[parts.length - 1] === "ro" || parts[parts.length - 1] === "rw")
    ? parts.slice(0, -1).join(":")
    : flag;
  return { path, mode };
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

  const patchedSettingsPath = opts.noConfig ? null : patchMcpConfig();

  const { output, exitCode } = await runOneShot(
    {
      tag,
      prompt,
      mount: resolvedMount,
      mountMode,
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
