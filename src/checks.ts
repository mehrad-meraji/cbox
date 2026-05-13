import { spawnSync } from "child_process";

export function checkApiKey(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("cbox: ANTHROPIC_API_KEY is not set.\nExport it and try again: export ANTHROPIC_API_KEY=sk-...");
    process.exit(1);
  }
}

export function checkDocker(): void {
  const version = spawnSync("docker", ["--version"], { stdio: "pipe" });
  if (version.error) {
    console.error("cbox: docker not found.\nInstall Docker from https://docs.docker.com/get-docker/");
    process.exit(1);
  }
  const info = spawnSync("docker", ["info"], { stdio: "pipe" });
  if (info.status !== 0) {
    console.error("cbox: Docker daemon is not running. Start Docker Desktop and try again.");
    process.exit(1);
  }
}

export function checkTmux(): void {
  const result = spawnSync("tmux", ["-V"], { stdio: "pipe" });
  if (result.error) {
    console.error("cbox: tmux not found.\nInstall with: brew install tmux");
    process.exit(1);
  }
}
