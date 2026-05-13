import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOCKERFILE = join(__dirname, "..", "docker", "Dockerfile");
const DOCKER_CONTEXT = join(__dirname, "..", "docker");

export function imageExists(tag: string): boolean {
  const result = spawnSync("docker", ["image", "inspect", tag], { stdio: "pipe" });
  return result.status === 0;
}

export function buildImage(tag: string, mcpPackages: string[]): void {
  const args = ["build", "-t", tag, "-f", DOCKERFILE];
  if (mcpPackages.length > 0) {
    args.push("--build-arg", `MCP_PACKAGES=${mcpPackages.join(" ")}`);
  }
  args.push(DOCKER_CONTEXT);

  console.log(`cbox: building image ${tag}...`);
  const result = spawnSync("docker", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("cbox: image build failed");
    process.exit(result.status ?? 1);
  }
  console.log(`cbox: image ${tag} ready`);
}

export function isContainerRunning(name: string): boolean {
  const result = spawnSync(
    "docker",
    ["ps", "--filter", `name=^/${name}$`, "--format", "{{.Names}}"],
    { stdio: "pipe" }
  );
  return result.stdout.toString().trim() === name;
}

export function stopContainer(name: string): boolean {
  const stop = spawnSync("docker", ["stop", name], { stdio: "pipe" });
  spawnSync("docker", ["rm", "-f", name], { stdio: "pipe" });
  return stop.status === 0;
}

export interface RunOpts {
  tag: string;
  prompt: string;
  mount: string | null;
  mountMode: "rw" | "ro";
  env: string[];
  mountConfig: boolean;
  patchedSettingsPath: string | null;
}

export async function runOneShot(
  opts: RunOpts,
  captureOutput: boolean
): Promise<{ output: string; exitCode: number }> {
  const args = buildRunArgs(opts, null);

  if (captureOutput) {
    const proc = Bun.spawn(
      ["docker", ...args, "claude", "--dangerously-skip-permissions", opts.prompt],
      { stdout: "pipe", stderr: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    return { output, exitCode };
  } else {
    // args is ["run", "--rm", ...flags, tag]
    // Insert -it after "--rm" so the final command is:
    //   docker run --rm -it ...flags <image> claude --dangerously-skip-permissions "prompt"
    const argsWithIt = [args[0], args[1], "-it", ...args.slice(2)];
    const proc = Bun.spawn(
      ["docker", ...argsWithIt, "claude", "--dangerously-skip-permissions", opts.prompt],
      { stdout: "inherit", stderr: "inherit", stdin: "inherit" }
    );
    const exitCode = await proc.exited;
    return { output: "", exitCode };
  }
}

export function buildDockerSessionCmd(opts: {
  tag: string;
  containerName: string;
  mount: string | null;
  mountMode: "rw" | "ro";
  env: string[];
  mountConfig: boolean;
  patchedSettingsPath: string | null;
}): string {
  const args = buildSessionRunArgs(opts);
  return `env ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" docker run -it ${args.join(" ")} claude --dangerously-skip-permissions`;
}

function buildRunArgs(
  opts: {
    tag: string;
    mount: string | null;
    mountMode: "rw" | "ro";
    env: string[];
    mountConfig: boolean;
    patchedSettingsPath: string | null;
  },
  _containerName: null
): string[] {
  const args: string[] = ["run", "--rm", "-e", "ANTHROPIC_API_KEY", "--add-host=host.docker.internal:host-gateway"];

  if (opts.mount) {
    args.push("-v", `${opts.mount}:/workspace:${opts.mountMode}`);
  }

  for (const e of opts.env) {
    args.push("-e", e);
  }

  if (opts.mountConfig) {
    const home = process.env.HOME ?? "/root";
    args.push("-v", `${home}/.claude:/root/.claude:ro`);
    if (opts.patchedSettingsPath) {
      args.push("-v", `${opts.patchedSettingsPath}:/root/.claude/settings.json:ro`);
    }
  }

  args.push(opts.tag);
  return args;
}

function buildSessionRunArgs(opts: {
  tag: string;
  containerName: string;
  mount: string | null;
  mountMode: "rw" | "ro";
  env: string[];
  mountConfig: boolean;
  patchedSettingsPath: string | null;
}): string[] {
  const args: string[] = ["--rm", "--name", opts.containerName, "-e", "ANTHROPIC_API_KEY", "--add-host=host.docker.internal:host-gateway"];

  if (opts.mount) {
    args.push("-v", `${opts.mount}:/workspace:${opts.mountMode}`);
  }

  for (const e of opts.env) {
    args.push("-e", e);
  }

  if (opts.mountConfig) {
    const home = process.env.HOME ?? "/root";
    args.push("-v", `${home}/.claude:/root/.claude:ro`);
    if (opts.patchedSettingsPath) {
      args.push("-v", `${opts.patchedSettingsPath}:/root/.claude/settings.json:ro`);
    }
  }

  args.push(opts.tag);
  return args;
}
