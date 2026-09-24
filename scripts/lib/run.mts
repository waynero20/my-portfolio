import { spawnSync } from "node:child_process";

export interface RunOptions {
  cwd?: string;
}

/** Room for raw video frames and PNG stills piped through stdout (spawnSync's default is 1 MiB). */
const MAX_STDOUT_BYTES = 512 * 1024 * 1024;

function spawnChecked(cmd: string, args: string[], opts: RunOptions): Buffer {
  const result = spawnSync(cmd, args, { cwd: opts.cwd, maxBuffer: MAX_STDOUT_BYTES });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const exit = result.status ?? result.signal;
    throw new Error(`${cmd} ${args.join(" ")} exited with ${exit}:\n${result.stderr.toString("utf8").trim()}`);
  }
  return result.stdout;
}

/** Runs a command synchronously and returns its stdout. Throws with stderr on a non-zero exit. */
export function run(cmd: string, args: string[], opts: RunOptions = {}): string {
  return spawnChecked(cmd, args, opts).toString("utf8");
}

/** Like `run`, but returns stdout as raw bytes (for piped frames and images). */
export function runBuffer(cmd: string, args: string[], opts: RunOptions = {}): Buffer {
  return spawnChecked(cmd, args, opts);
}
