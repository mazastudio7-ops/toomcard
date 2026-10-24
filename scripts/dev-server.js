#!/usr/bin/env node
// 로컬 확인용 서버: vercel.json 의 rewrites 와 api/*.js 를 흉내 낸다. 배포 전에 여기서 보고, 한 번에 푸시한다.
//   node scripts/dev-server.js   →  http://localhost:3737
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3737);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

// "/:company/:slug" 같은 패턴을 정규식으로
function compile(source) {
  const keys = [];
  const re = source.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '*' : '\\' + c)).replace(/:([A-Za-z_]+)\*/g, (_, k) => { keys.push(k); return '(.+)'; }).replace(/:([A-Za-z_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  return { re: new RegExp('^' + re + '$'), keys };
}
const rewrites = (cfg.rewrites || []).map((r) => Object.assign({}, r, compile(r.source)));

function serveStatic(res, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}
function findStatic(p) {
  const clean = decodeURIComponent(p.split('?')[0]).replace(/\.\./g, '');
  const cands = [clean, clean + '.html', clean.replace(/\/$/, '') + '/index.html'];
  for (const c of cands) { const f = path.join(ROOT, c); if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
  return null;
}
function makeRes(res) {
  const wrap = {
    _status: 200,
    setHeader: (k, v) => res.setHeader(k, v),
    status(c) { this._status = c; return this; },
    send(b) { res.statusCode = this._status; if (Buffer.isBuffer(b)) res.end(b); else res.end(String(b == null ? '' : b)); },
    json(o) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.statusCode = this._status; res.end(JSON.stringify(o)); },
    end(b) { res.statusCode = this._status; res.end(b); }
  };
  return wrap;
}
async function runApi(name, req, res, query) {
  const file = path.join(ROOT, 'api', name + '.js');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('no api ' + name); }
  delete require.cache[require.resolve(file)];                 // 수정하면 바로 반영
  const handler = require(file);
  let body = '';
  for await (const chunk of req) body += chunk;
  const r = { method: req.method, url: req.url, headers: req.headers, query, body: body ? (() => { try { return JSON.parse(body); } catch (e) { return body; } })() : undefined };
  try { await (handler.default || handler)(r, makeRes(res)); }
  catch (e) { console.error('[api/' + name + ']', e); if (!res.headersSent) { res.writeHead(500); res.end('api error: ' + e.message); } }
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  // 1) 실제 파일이 있으면 그대로 (cleanUrls: /maker → maker.html)
  const sf = findStatic(p);
  if (sf && !p.startsWith('/api/')) return serveStatic(res, sf);
  // 2) /api/x 직접
  if (p.startsWith('/api/')) return runApi(p.slice(5).split('/')[0], req, res, Object.fromEntries(u.searchParams));
  // 3) rewrites
  for (const rw of rewrites) {
    const m = rw.re.exec(p); if (!m) continue;
    const params = {}; rw.keys.forEach((k, i) => { params[k] = m[i + 1]; });
    let dest = rw.destination.replace(/:([A-Za-z_]+)\*?/g, (_, k) => params[k] || '');
    const du = new URL(dest, 'http://localhost');
    const query = Object.assign(Object.fromEntries(u.searchParams), Object.fromEntries(du.searchParams));
    if (du.pathname.startsWith('/api/')) return runApi(du.pathname.slice(5).split('/')[0], req, res, query);
    const f = findStatic(du.pathname); if (f) return serveStatic(res, f);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('not found: ' + p);
}).listen(PORT, () => console.log(`[dev] http://localhost:${PORT}  (vercel.json rewrites + api/*.js)`));
