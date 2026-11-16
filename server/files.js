// Temporary file store for transfers. The sender uploads once
// (POST /api/files/:id); each recipient who accepts downloads it
// (GET /api/files/:id). Files live in a temp dir that's deleted on exit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const ROUTE = /^\/api\/files\/([A-Za-z0-9_-]{1,64})$/;
const MAX_BYTES = 2 * 1024 ** 3; // 2 GB

export function createFileStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tunnelweb-'));
  /** @type {Map<string, { name: string, size: number, path: string }>} */
  const ready = new Map();

  async function upload(id, req, res) {
    const size = Number(req.headers['content-length']);
    if (!Number.isFinite(size) || size > MAX_BYTES) return send(res, 413, 'File too large');
    let name = 'file';
    try {
      name = decodeURIComponent(String(req.headers['x-file-name'] ?? 'file')).replace(/[\\/\r\n"]/g, '_').slice(0, 200);
    } catch {}
    const file = path.join(dir, id);
    try {
      await pipeline(req, fs.createWriteStream(file));
      ready.set(id, { name, size: fs.statSync(file).size, path: file });
      send(res, 201, 'ok');
    } catch {
      fs.rmSync(file, { force: true });
      if (!res.headersSent) send(res, 500, 'Upload failed');
    }
  }

  function download(id, res) {
    const f = ready.get(id);
    if (!f) return send(res, 404, 'Not ready'); // the client retries while the sender is still uploading
    res.writeHead(200, {
      'content-type': 'application/octet-stream',
      'content-length': f.size,
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'cache-control': 'no-store',
    });
    fs.createReadStream(f.path).pipe(res);
  }

  return {
    /** Returns true if the request was a file request (and has been handled). */
    handle(req, res) {
      const m = ROUTE.exec((req.url ?? '').split('?')[0]);
      if (!m) return false;
      if (req.method === 'POST') upload(m[1], req, res);
      else if (req.method === 'GET') download(m[1], res);
      else send(res, 405, 'Method not allowed');
      return true;
    },
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

function send(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain' });
  res.end(text);
}
