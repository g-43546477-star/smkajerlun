import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8'
};

function safeFile(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const clean = pathname === '/' ? '/index.html' : pathname;
  const candidates = [clean];
  if (!path.extname(clean)) candidates.push(`${clean.replace(/\/$/, '')}/index.html`);
  if (clean.endsWith('/')) candidates.unshift(`${clean}index.html`);
  for (const candidate of candidates) {
    const absolute = path.resolve(root, `.${candidate}`);
    if (absolute.startsWith(root) && absolute !== root) return absolute;
  }
  return null;
}

export async function startStaticServer(port = 0) {
  const server = http.createServer(async (request, response) => {
    try {
      const file = safeFile(request.url || '/');
      if (!file) {
        response.writeHead(400);
        response.end('Bad request');
        return;
      }
      const stat = await fs.stat(file);
      if (!stat.isFile()) throw new Error('Not a file');
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream'
      });
      if (request.method !== 'HEAD') response.end(await fs.readFile(file));
      else response.end();
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}` };
}
