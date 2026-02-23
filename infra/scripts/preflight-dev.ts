#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

function run(cmd: string[]): { ok: boolean; stdout: string; stderr: string } {
  const proc = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8" });
  return {
    ok: proc.status === 0,
    stdout: (proc.stdout ?? "").trim(),
    stderr: (proc.stderr ?? "").trim(),
  };
}

function isPortInUse(port: number): boolean {
  const checks: string[][] = [
    ["bash", "-lc", `lsof -nP -iTCP:${port} -sTCP:LISTEN`],
    ["bash", "-lc", `ss -ltn '( sport = :${port} )' | tail -n +2`],
    [
      "bash",
      "-lc",
      `netstat -ltn 2>/dev/null | awk '$4 ~ /:${port}$/ {print $0}'`,
    ],
  ];

  for (const cmd of checks) {
    const result = run(cmd);
    if (!result.ok) continue;
    if (result.stdout.length > 0) return true;
  }

  return false;
}

function hasRunningNextDev(): boolean {
  const result = run([
    "bash",
    "-lc",
    "pgrep -f '(next dev|bun --bun next dev)'",
  ]);
  return result.ok && result.stdout.length > 0;
}

async function removeStaleNextLockIfNeeded(): Promise<void> {
  const lockPath = path.join(process.cwd(), ".next", "dev", "lock");

  if (!existsSync(lockPath)) return;
  if (hasRunningNextDev()) {
    console.log(
      "[preflight:dev] Next dev process detected; keeping .next/dev/lock",
    );
    return;
  }

  await rm(lockPath, { force: true });
  console.log("[preflight:dev] Removed stale .next/dev/lock");
}

async function main(): Promise<void> {
  const apiPortRaw = process.env.API_PORT ?? "4000";
  const apiPort = Number(apiPortRaw);

  if (!Number.isFinite(apiPort)) {
    console.error(`[preflight:dev] Invalid API_PORT: ${apiPortRaw}`);
    process.exit(1);
  }

  const blockedPorts = [3000, apiPort].filter((port) => isPortInUse(port));

  await removeStaleNextLockIfNeeded();

  if (blockedPorts.length > 0) {
    console.error(
      `[preflight:dev] Port(s) in use: ${blockedPorts.join(", ")}. Run \`bun run dev:stop\` and retry.`,
    );
    process.exit(1);
  }

  console.log("[preflight:dev] OK");
}

await main();
