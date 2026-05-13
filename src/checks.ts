import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export function checkApiKey(noConfig = false): void {
  if (process.env.ANTHROPIC_API_KEY) return;

  // claude login stores credentials in ~/.claude — valid if the dir is mounted
  if (!noConfig) {
    const claudeDir = process.env.CLAUDE_DIR ?? join(homedir(), ".claude");
    if (existsSync(claudeDir)) return;
  }

  console.error(
    "cbox: no Claude credentials found.\n" +
    "Either set ANTHROPIC_API_KEY or run 'claude login' on the host first."
  );
  process.exit(1);
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
