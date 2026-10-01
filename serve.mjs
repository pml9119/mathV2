import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] || '.';
const port = parseInt(process.argv[3] || '4173', 10);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const fp = join(root, p);
  if (!existsSync(fp) || statSync(fp).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': mime[extname(fp)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
  res.end(readFileSync(fp));
}).listen(port, '127.0.0.1', () => console.log('serving', root, 'on http://127.0.0.1:' + port));
