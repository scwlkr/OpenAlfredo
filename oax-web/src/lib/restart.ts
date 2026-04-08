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

// Fire-and-forget detached pod restart. Called from the daemon (via
// /restart or after a self-edit emits [[RESTART_POD]]). The respawn helper
// waits a few seconds, kills the pod, starts it back up, and health-checks
// — all in a detached child process that outlives its caller.
//
// Uses globalThis.__non_webpack_require__ (Node runtime require) to prevent
// Turbopack from tracing child_process and the dynamic path at build time.
// This function only runs server-side at runtime, never in the browser.
export function triggerPodRestart(opts: { delaySec?: number; timeoutSec?: number } = {}) {
  const { delaySec = 3, timeoutSec = 60 } = opts;
  // Use eval('require') to get the real Node.js require at runtime,
  // hidden from Turbopack's static analysis.
  const _require = eval('require') as NodeRequire;
  const path = _require('path') as typeof import('path');
  const cp = _require('child_process') as typeof import('child_process');
  const respawnBin = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    '..',
    'bin',
    'respawn.js'
  );
  const child = cp.spawn(
    'node',
    [respawnBin, `--delay=${delaySec}`, `--timeout=${timeoutSec}`],
    { detached: true, stdio: 'ignore' }
  );
  child.unref();
}
