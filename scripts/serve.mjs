// 本机预览:伺服 _site/,和 GitHub Pages 一样认不带 .html 的网址(/about → about.html,/views/x → views/x.html)。
// python http.server 不会这样找,所以预览改用这个。用法:node scripts/serve.mjs <端口>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('_site');
const port = Number(process.argv[2]) || 0;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.yml': 'text/yaml' };

const resolve = (p) => {
  const f = path.join(root, p);
  if (!f.startsWith(root)) return null;
  for (const c of [f, `${f}.html`, path.join(f, 'index.html')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
};

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p !== '/' && p.endsWith('/') === false && fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).isDirectory() && !fs.existsSync(path.join(root, `${p}.html`))) {
    res.writeHead(301, { Location: `${p}/` }); return res.end();
  }
  const f = resolve(p);
  if (!f) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
server.listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}/`));
