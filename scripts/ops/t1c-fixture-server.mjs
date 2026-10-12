// Tiny static-file server for the T1C browser-check fixture.
// Run with: node scripts/ops/t1c-fixture-server.mjs
// Listens on port 4000 by default; override with FIXTURE_PORT.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..', 'docs', 'tasks', 'hrp-t1c-sticky-marquee-entry-hotfix', 'evidence');
const PORT = Number(process.env.FIXTURE_PORT ?? 4000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const safe = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const p = join(ROOT, safe);
    if (!p.startsWith(ROOT)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    const data = await readFile(p);
    const ct = MIME[extname(p)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + (err && err.message));
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`fixture server listening on http://127.0.0.1:${PORT}/ (root: ${ROOT})`);
});
