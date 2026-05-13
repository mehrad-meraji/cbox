import { createHash } from "crypto";

export function mcpHash(packages: string[]): string {
  if (packages.length === 0) return "";
  return createHash("md5")
    .update([...packages].sort().join(","))
    .digest("hex")
    .slice(0, 8);
}

export function imageTag(version: string, packages: string[]): string {
  const hash = mcpHash(packages);
  return hash ? `cbox:${version}-${hash}` : `cbox:${version}`;
}
