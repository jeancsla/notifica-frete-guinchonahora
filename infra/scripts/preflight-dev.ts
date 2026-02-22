import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type ProcMeta = { pid: number; cmdline: string; cwd: string };

const repoRoot = process.cwd();
const nextPort = 3000;
const apiPort = Number(process.env.API_PORT || 4000);
const lockPath = path.join(repoRoot, ".next", "dev", "lock");

function run(command: string) {
  try {
    return execSync(command, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function getListeningPids(port: number) {
  const output = run("ss -ltnp");
  if (!output) return [] as number[];

  const pids = new Set<number>();
  const lines = output.split("\n");
  for (const line of lines) {
    if (!line.includes(`:${port}`)) continue;
    const matches = line.matchAll(/pid=(\d+)/g);
    for (const match of matches) {
      pids.add(Number(match[1]));
    }
  }

  return [...pids];
}

function getPidMeta(pid: number): ProcMeta {
  const cmdlineRaw = safeRead(`/proc/${pid}/cmdline`);
  const cmdline = cmdlineRaw.replace(/\0/g, " ").trim();

  let cwd = "";
  try {
    cwd = fs.readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    cwd = "";
  }

  return { pid, cmdline, cwd };
}

function safeRead(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function isFromThisRepo(meta: ProcMeta) {
  return meta.cwd === repoRoot || meta.cmdline.includes(repoRoot);
}

function isNextDevProcess(meta: ProcMeta) {
  return meta.cmdline.includes("next dev");
}

function listRepoNextDevProcesses() {
  const output = run("ps -eo pid=,args=");
  if (!output) return [] as Array<{ pid: number; cmdline: string }>;

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const firstSpace = line.indexOf(" ");
      if (firstSpace === -1) return null;
      const pid = Number(line.slice(0, firstSpace));
      const cmdline = line.slice(firstSpace + 1);
      return { pid, cmdline };
    })
    .filter((item): item is { pid: number; cmdline: string } => Boolean(item))
    .filter((item) => item.cmdline.includes("next dev"))
    .filter((item) => item.cmdline.includes(repoRoot));
}

function failPortInUse(
  port: number,
  serviceName: string,
  owner?: { pid: number; cmdline?: string },
) {
  const header = `[preflight-dev] Port ${port} (${serviceName}) is already in use.`;
  const details = owner
    ? `PID ${owner.pid}: ${owner.cmdline || "(command unavailable)"}`
    : "No process details available.";

  console.error(`${header}\n${details}`);
  console.error(
    "Stop the running dev server first (`bun run dev:stop`) and retry.",
  );
  process.exit(1);
}

function ensurePortAvailable(port: number, serviceName: string) {
  const pids = getListeningPids(port);
  if (!pids.length) return;

  const metas = pids.map(getPidMeta);
  const foreign = metas.find((meta) => !isFromThisRepo(meta));
  if (foreign) {
    failPortInUse(port, serviceName, foreign);
  }

  const owned = metas[0];
  failPortInUse(port, serviceName, owned);
}

function cleanupStaleNextLock() {
  if (!fs.existsSync(lockPath)) return;

  const nextPortPids = getListeningPids(nextPort);
  const hasRepoNextOnPort = nextPortPids
    .map(getPidMeta)
    .some((meta) => isFromThisRepo(meta) && isNextDevProcess(meta));
  const hasRepoNextProcess = listRepoNextDevProcesses().length > 0;

  if (!hasRepoNextOnPort && !hasRepoNextProcess) {
    fs.rmSync(lockPath, { force: true });
    console.log("[preflight-dev] Removed stale .next/dev/lock");
  }
}

cleanupStaleNextLock();
ensurePortAvailable(nextPort, "Next.js dev server");
ensurePortAvailable(apiPort, "Bun API server");

console.log("[preflight-dev] OK");
