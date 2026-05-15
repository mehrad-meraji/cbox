import { spawnSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const DOCKERFILE_CONTENT = `FROM node:20-bookworm-slim

# System Chromium + dependencies (works on both x86_64 and ARM64)
RUN apt-get update && apt-get install -y \\
    chromium wget gnupg ca-certificates fonts-liberation \\
    libappindicator3-1 libasound2 libatk-bridge2.0-0 \\
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 \\
    libnspr4 libnss3 libx11-xcb1 libxcomposite1 \\
    libxdamage1 libxrandr2 xdg-utils \\
    --no-install-recommends \\
    && rm -rf /var/lib/apt/lists/*

# Install global tools as root so they land in /usr/local/bin
RUN npm install -g @anthropic-ai/claude-code agent-browser

# Local MCP packages (space-separated list injected at build time)
ARG MCP_PACKAGES=""
RUN if [ -n "$MCP_PACKAGES" ]; then npm install -g $MCP_PACKAGES; fi

# Point agent-browser at system Chromium (avoids arch-specific Chrome for Testing)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# node:20 base image ships a 'node' user at UID 1000 — use it directly
# claude --dangerously-skip-permissions refuses to run as root
RUN mkdir -p /workspace && chown node:node /workspace

USER node
WORKDIR /workspace
ENTRYPOINT []
CMD ["claude", "--dangerously-skip-permissions"]
`;

function dockerBuildContext(): { dockerfile: string; context: string } {
  const dir = join(tmpdir(), "cbox-docker-context");
  mkdirSync(dir, { recursive: true });
  const dockerfile = join(dir, "Dockerfile");
  writeFileSync(dockerfile, DOCKERFILE_CONTENT);
  return { dockerfile, context: dir };
}

export function imageExists(tag: string): boolean {
  const result = spawnSync("docker", ["image", "inspect", tag], { stdio: "pipe" });
  return result.status === 0;
}

const REGISTRY_IMAGE = "mehradm/cbox";

export function pullImage(tag: string): boolean {
  const remoteTag = `${REGISTRY_IMAGE}:latest`;
  console.log(`cbox: pulling ${remoteTag}...`);
  const pull = spawnSync("docker", ["pull", remoteTag], { stdio: "inherit" });
  if (pull.status !== 0) return false;
  spawnSync("docker", ["tag", remoteTag, tag], { stdio: "pipe" });
  return true;
}

export function buildImage(tag: string, mcpPackages: string[]): void {
  const { dockerfile, context } = dockerBuildContext();
  const args = ["build", "-t", tag, "-f", dockerfile];
  if (mcpPackages.length > 0) {
    args.push("--build-arg", `MCP_PACKAGES=${mcpPackages.join(" ")}`);
  }
  args.push(context);

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

export interface MountSpec {
  hostPath: string;
  containerPath: string;
  mode: "rw" | "ro";
}

export interface RunOpts {
  tag: string;
  prompt: string;
  mounts: MountSpec[];
  env: string[];
  mountConfig: boolean;
  patchedSettingsPath: string | null;
}

export async function runOneShot(
  opts: RunOpts,
  captureOutput: boolean
): Promise<{ output: string; exitCode: number }> {
  const args = buildRunArgs(opts);

  if (captureOutput) {
    const proc = Bun.spawn(
      ["docker", ...args, "claude", "--dangerously-skip-permissions", opts.prompt],
      { stdout: "pipe", stderr: "pipe" }
    );
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    return { output, exitCode };
  } else {
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
  mounts: MountSpec[];
  env: string[];
  mountConfig: boolean;
  patchedSettingsPath: string | null;
}): string {
  const args = buildSessionRunArgs(opts);
  return `env ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" docker run -it -e TERM ${args.join(" ")} claude --dangerously-skip-permissions`;
}

function buildRunArgs(opts: {
  tag: string;
  mounts: MountSpec[];
  env: string[];
  mountConfig: boolean;
  patchedSettingsPath: string | null;
}): string[] {
  const args: string[] = ["run", "--rm", "-e", "ANTHROPIC_API_KEY", "--add-host=host.docker.internal:host-gateway"];

  for (const m of opts.mounts) {
    args.push("-v", `${m.hostPath}:${m.containerPath}:${m.mode}`);
  }

  for (const e of opts.env) {
    args.push("-e", e);
  }

  if (opts.mountConfig) {
    const home = process.env.HOME ?? "/root";
    args.push("-v", `${home}/.claude:/home/node/.claude:ro`);
    args.push("-v", `${home}/.claude.json:/home/node/.claude.json:ro`);
    if (opts.patchedSettingsPath) {
      args.push("-v", `${opts.patchedSettingsPath}:/home/node/.claude/settings.json:rw`);
    }
  }

  args.push(opts.tag);
  return args;
}

function buildSessionRunArgs(opts: {
  tag: string;
  containerName: string;
  mounts: MountSpec[];
  env: string[];
  mountConfig: boolean;
  patchedSettingsPath: string | null;
}): string[] {
  const args: string[] = ["--rm", "--name", opts.containerName, "-e", "ANTHROPIC_API_KEY", "--add-host=host.docker.internal:host-gateway"];

  for (const m of opts.mounts) {
    args.push("-v", `${m.hostPath}:${m.containerPath}:${m.mode}`);
  }

  for (const e of opts.env) {
    args.push("-e", e);
  }

  if (opts.mountConfig) {
    const home = process.env.HOME ?? "/root";
    args.push("-v", `${home}/.claude:/home/node/.claude:ro`);
    args.push("-v", `${home}/.claude.json:/home/node/.claude.json:ro`);
    if (opts.patchedSettingsPath) {
      args.push("-v", `${opts.patchedSettingsPath}:/home/node/.claude/settings.json:rw`);
    }
  }

  args.push(opts.tag);
  return args;
}
