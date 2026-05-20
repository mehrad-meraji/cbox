import { describe, test, expect } from "bun:test";

/**
 * Integration tests for `cbox session diff`.
 *
 * These are placeholders. Real bodies depend on having a working Docker
 * environment and the existing integration test harness. Fill in once
 * docker-in-docker or testcontainers support is in place.
 *
 * The unit tests in tests/unit/snapshot.test.ts cover the snapshot and diff
 * logic directly against real git/tar binaries.
 */

describe("cbox session diff (integration)", () => {
  test.skip("--strict forces mount mode to ro (docker inspect verification)", async () => {
    // Smoke test: run with --strict against a known mount, inspect the
    // resulting container to verify the mount is ro.
    // Skipped until docker-in-docker CI setup is available.
  });

  test.skip("shows mutations made inside an interactive session", async () => {
    // Real integration test: start a session, exec into the container, mutate
    // a file in the mount, run `cbox session diff <id>`, check output.
    // Skipped until docker-in-docker CI setup is available.
  });
});
