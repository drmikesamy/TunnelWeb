// Thin wrapper around the p2p-tunnel CLI (an npm dependency that ships the
// Rust binary). `share` exposes a local port and yields a ticket; `connect`
// turns a ticket back into a local URL.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';

const require = createRequire(import.meta.url);

/**
 * Prefer the installed native binary: the package's JS wrapper runs it with
 * spawnSync and doesn't forward signals, so killing the wrapper would orphan
 * the tunnel. Fall back to the wrapper, which can install the binary on demand.
 */
function command(args) {
  const wrapper = require.resolve('p2p-tunnel/run-p2p-tunnel.js');
  const binDir = path.join(path.dirname(wrapper), 'node_modules', '.bin_real');
  for (const name of ['p2p-tunnel', 'p2p-tunnel.exe']) {
    const bin = path.join(binDir, name);
    if (fs.existsSync(bin)) return [bin, args];
  }
  return [process.execPath, [wrapper, ...args]];
}

function run(args, onLine) {
  const [cmd, argv] = command(args);
  const child = spawn(cmd, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
  readline.createInterface({ input: child.stdout }).on('line', onLine);
  readline.createInterface({ input: child.stderr }).on('line', (line) => line.trim() && console.error(`  [tunnel] ${line}`));
  return child;
}

/** Share `port`; calls onTicket(ticket) once the endpoint is online. */
export function share(port, onTicket) {
  return run(['share', String(port)], (line) => {
    const m = /p2p-tunnel connect\s+(\S+)/.exec(line);
    if (m) onTicket(m[1]);
  });
}

/** Connect to a ticket; calls onReady(url) once the local port is listening. */
export function connect(ticket, onReady) {
  return run(['connect', ticket], (line) => {
    const m = /(https?:\/\/(?:localhost|127\.0\.0\.1):\d+)/.exec(line);
    if (m) onReady(m[1]);
  });
}
