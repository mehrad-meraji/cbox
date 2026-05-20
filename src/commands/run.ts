import { resolve, basename } from "path";
import { readFileSync, existsSync } from "fs";
import { checkApiKey, checkDocker } from "../checks.ts";
import { imageExists, pullImage, buildImage, runOneShot, type MountSpec } from "../docker.ts";
import { loadConfig } from "../config.ts";
import { imageTag } from "../image.ts";
import { prepareClaudeDir, prepareClaudeJson } from "../mcp.ts";
import { generateId } from "../registry.ts";
import { snapshotMount, cleanupSnapshot } from "../snapshot.ts";
import { version } from "../../package.json";

export interface RunOptions {
  prompt: string | null;
  file: string | null;
  json: boolean;
  mount: string[];
  env: string[];
  noConfig: boolean;
  noBrowser: boolean;
  strict: boolean;
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
  const used = new Set<string>();
  for (const flag of mountFlags) {
    const { path, mode } = parseMountFlag(flag);
    const hostPath = resolve(path);
    if (!existsSync(hostPath)) {
      console.error(`cbox: mount path does not exist: ${hostPath}`);
      process.exit(1);
    }
    let containerPath: string;
    if (mountFlags.length === 1) {
      containerPath = "/workspace";
    } else {
      const base = basename(hostPath);
      containerPath = `/workspace/${base}`;
      let counter = 2;
      while (used.has(containerPath)) {
        containerPath = `/workspace/${base}-${counter++}`;
      }
      if (counter > 2) {
        console.warn(`cbox: duplicate mount basename "${base}", using ${containerPath}`);
      }
    }
    used.add(containerPath);
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

  if (opts.strict) {
    for (const m of mounts) m.mode = "ro";
  }

  const claudeDirPath = opts.noConfig ? null : prepareClaudeDir();
  const claudeJsonPath = opts.noConfig ? null : prepareClaudeJson();

  // Snapshot the primary rw mount before running so the code path is exercised.
  // For one-shot runs there is no persistent session ID, so the snapshot is
  // cleaned up after the container exits (not persisted to registry).
  const primaryMount = mounts.find((m) => m.mode === "rw");
  const snapId = generateId();
  let snapshot;
  if (primaryMount) {
    try {
      snapshot = await snapshotMount(primaryMount.hostPath, `run-${snapId}`);
    } catch (err) {
      console.warn(`cbox: warning: failed to snapshot mount: ${(err as Error).message}`);
    }
  }

  const { output, exitCode } = await runOneShot(
    {
      tag,
      prompt,
      mounts,
      env: opts.env,
      mountConfig: !opts.noConfig,
      claudeDirPath,
      claudeJsonPath,
    },
    opts.json
  );

  if (snapshot) {
    try {
      await cleanupSnapshot(snapshot);
    } catch {
      // Non-fatal — at worst a few MB left in ~/.config/cbox/snapshots/
    }
  }

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
