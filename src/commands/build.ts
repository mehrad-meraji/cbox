import { checkDocker } from "../checks.ts";
import { buildImage } from "../docker.ts";
import { loadConfig } from "../config.ts";
import { imageTag } from "../image.ts";
import { version } from "../../package.json";

export async function buildCommand(_opts: { force: boolean }): Promise<void> {
  checkDocker();
  const config = loadConfig();
  const tag = imageTag(version, config.mcpPackages);
  buildImage(tag, config.mcpPackages);
}
