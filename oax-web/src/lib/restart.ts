// Fire-and-forget detached pod restart. Called from the daemon (via
// /restart or after a self-edit emits [[RESTART_POD]]). The respawn helper
// waits a few seconds, kills the pod, starts it back up, and health-checks
// — all in a detached child process that outlives its caller.
import { spawn } from 'child_process';
import path from 'path';

export function triggerPodRestart(opts: { delaySec?: number; timeoutSec?: number } = {}) {
  const { delaySec = 3, timeoutSec = 60 } = opts;
  // oax-web/ is the cwd at runtime; respawn.js lives at ../bin/respawn.js.
  const respawnBin = path.resolve(process.cwd(), '..', 'bin', 'respawn.js');
  const child = spawn(
    'node',
    [respawnBin, `--delay=${delaySec}`, `--timeout=${timeoutSec}`],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();
}

// Marker emitted by the agent in its reply to request a restart after a
// self-edit. The engine strips it and signals restart only if at least one
// EDIT_FILE / WRITE_FILE actually applied successfully (prevents noisy
// restart loops on failed edits).
export const RESTART_MARKER = '[[RESTART_POD]]';
export function wantsRestart(reply: string): boolean {
  return reply.includes(RESTART_MARKER);
}
export function stripRestartMarker(reply: string): string {
  return reply.split(RESTART_MARKER).join('').replace(/\n{3,}/g, '\n\n').trim();
}
