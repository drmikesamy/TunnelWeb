#!/usr/bin/env node
// npx tunnelweb                 host a chat, open it, and print an invite
// npx tunnelweb join <ticket>   join someone's chat through the p2p tunnel
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import open from 'open';
import sirv from 'sirv';
import { attachHub } from './hub.js';
import { createFileStore } from './files.js';
import * as tunnel from './tunnel.js';
import { lazyProxy } from './lazyProxy.js';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const DEFAULT_PORT = 4777;
const GUEST_PORT = 4778; // what a guest's browser opens (forwards to p2p-tunnel's :8080)

const HELP = `
  TunnelWeb — peer-to-peer messenger in your browser

  Usage
    npx tunnelweb                 Start a chat and get an invite command for friends
    npx tunnelweb join <ticket>   Join a friend's chat

  Options
    --port <n>    Port for the local chat server (host, default ${DEFAULT_PORT})
    --no-open     Don't open the browser automatically
    --local       Host without the p2p tunnel (this machine only)
    -h, --help    Show this help
`;

function parseArgs(argv) {
  const opts = { command: 'host', ticket: null, port: null, open: true, tunnel: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.command = 'help';
    else if (a === '--no-open') opts.open = false;
    else if (a === '--local') opts.tunnel = false;
    else if (a === '--port') opts.port = Number(argv[++i]);
    else if (a === 'join') {
      opts.command = 'join';
      opts.ticket = argv[++i] ?? null;
    } else if (a === 'host') opts.command = 'host';
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (opts.port !== null && !(opts.port > 0 && opts.port < 65536)) throw new Error('--port needs a number between 1 and 65535');
  if (opts.command === 'join' && !opts.ticket) throw new Error('join needs the ticket from your friend’s invite');
  return opts;
}

const banner = (lines) => console.log(['', ...lines.map((l) => `  ${l}`), ''].join('\n'));

function launchBrowser(url, enabled) {
  if (!enabled) return;
  open(url).catch(() => console.log(`  Couldn't open a browser. Open ${url} yourself.`));
}

/** Listen on `preferred`, or any free port if it's taken. */
function listen(server, preferred) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, fallback) => {
      server.once('error', (err) => (err.code === 'EADDRINUSE' && fallback ? tryPort(0, false) : reject(err)));
      server.listen(port, '127.0.0.1', () => resolve(server.address().port));
    };
    tryPort(preferred, true);
  });
}

async function host(opts) {
  const hasUi = fs.existsSync(path.join(DIST, 'index.html'));
  if (!hasUi) {
    // Fine during development: `npm run dev` serves the UI and proxies here.
    console.warn(`  No built UI in ${DIST}; serving the chat API only. Run "npm run build" to serve the UI too.`);
  }
  const state = { invite: null };
  const files = createFileStore();
  const assets = hasUi
    ? sirv(DIST, { single: true, etag: true, gzip: true })
    : (_req, res) => {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('UI not built. Use `npm run dev`, or run `npm run build` first.');
      };

  const server = http.createServer((req, res) => {
    if (req.url === '/api/info') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ app: 'tunnelweb', invite: state.invite }));
      return;
    }
    if (files.handle(req, res)) return;
    assets(req, res);
  });
  const port = await listen(server, opts.port ?? DEFAULT_PORT);
  attachHub(server); // after listen: ws would rethrow a port-in-use error as unhandled
  const url = `http://localhost:${port}`;
  let tunnelChild = null;
  let stopping = false;

  const shutdown = () => {
    stopping = true;
    tunnelChild?.kill();
    files.cleanup();
    process.exit(0);
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, shutdown);

  banner([`TunnelWeb is running at ${url}`, opts.tunnel ? 'Opening a secure p2p tunnel so friends can join…' : '(local only: no tunnel)']);
  launchBrowser(url, opts.open);

  // p2p-tunnel 0.1.12's `share` exits after a single failed connection. Restart it
  // so the chat stays reachable; each restart has a new ticket, so print it again.
  const startTunnel = () => {
    tunnelChild = tunnel.share(port, (ticket) => {
      state.invite = `npx tunnelweb join ${ticket}`;
      banner(['Invite friends by sending them this command:', '', `  ${state.invite}`, '', 'Keep this window open while you chat. Press Ctrl+C to stop.']);
    });
    tunnelChild.on('exit', () => {
      if (stopping) return;
      state.invite = null;
      console.error('  The p2p tunnel stopped. Restarting it: friends will need the NEW invite printed below.');
      setTimeout(startTunnel, 1000);
    });
  };
  if (opts.tunnel) startTunnel();
}

function join(opts) {
  banner(['Connecting to your friend’s TunnelWeb over p2p…']);
  const child = tunnel.connect(opts.ticket, async (tunnelUrl) => {
    // The browser talks to a local forwarder, not to the tunnel port directly (see lazyProxy.js).
    const { port } = await lazyProxy(Number(new URL(tunnelUrl).port), GUEST_PORT);
    const url = `http://localhost:${port}`;
    banner([`Connected! Opening ${url}`, 'Keep this window open while you chat. Press Ctrl+C to leave.']);
    launchBrowser(url, opts.open);
  });
  child.on('exit', (code) => {
    if (code) console.error(`  Couldn't connect (exit ${code}). Check the ticket, and that port 8080 is free.`);
    process.exit(code ?? 0);
  });
  const stop = () => {
    child.kill();
    process.exit(0);
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, stop);
}

try {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.command === 'help') console.log(HELP);
  else if (opts.command === 'join') join(opts);
  else await host(opts);
} catch (err) {
  console.error(`\n  ${err.message}\n${HELP}`);
  process.exit(1);
}
