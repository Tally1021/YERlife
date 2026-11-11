// YERLIFE Shaharcha serveri: saytni ochib beradi va admin o'zgarishlarini data.json ga saqlaydi.
// Ishga tushirish:  node server.js   →  http://localhost:8765
// Admin:            http://localhost:8765/?admin=KOD   (KOD .env faylidagi ADMIN_CODE)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const DATA = path.join(DIR, 'data.json');
const ENVF = path.join(DIR, '.env');

function loadEnv() {
  const env = {};
  try { for (const line of fs.readFileSync(ENVF, 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch { }
  return env;
}
const env = loadEnv();
if (!env.ADMIN_CODE) { // birinchi ishga tushishda maxfiy kod yaratiladi
  env.ADMIN_CODE = crypto.randomBytes(6).toString('base64url');
  fs.appendFileSync(ENVF, `\nADMIN_CODE=${env.ADMIN_CODE}\n`);
}
const PORT = +(process.env.PORT || env.PORT || 8765);
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

// ---------- ma'lumotlar ----------
function load() {
  let d; try { d = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { d = {}; }
  if (!Array.isArray(d.residents)) d.residents = (d.followers || []).map(n => ({ n, l: 0 }));   // eski formatdan ko'chirish
  if (!Array.isArray(d.trees)) d.trees = [];
  if (!Array.isArray(d.comments)) d.comments = [];
  delete d.followers; delete d.likes;
  return d;
}
function save(d) { d.updated = new Date().toISOString(); const tmp = DATA + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d)); fs.renameSync(tmp, DATA); }
save(load()); // formatni yangilab qo'yish

const clean = (s) => String(s || '').trim().replace(/^@/, '').slice(0, 60);
function admin(body) {
  if (!body || body.code !== env.ADMIN_CODE) return [403, { error: "Admin kodi noto'g'ri" }];
  const d = load(), list = body.kind === 'tree' ? d.trees : body.kind === 'com' ? d.comments : d.residents;
  const idx = new Map(); list.forEach((x, i) => { if (x.n && !x.d) idx.set(x.n.toLowerCase(), i); });
  if (body.op === 'add') {
    const added = [], skipped = [];
    for (const raw of body.names || []) {
      const n = clean(raw); if (!n || !/^[\w.]+$/.test(n)) { if (n) skipped.push(n); continue; }
      if (idx.has(n.toLowerCase())) { skipped.push(n); continue; }
      list.push(body.kind === 'res' || !body.kind ? { n, l: 0 } : { n }); idx.set(n.toLowerCase(), list.length - 1); added.push({ n, num: list.length });
    }
    save(d); log(`Admin: +${added.length} ${body.kind === 'tree' ? 'daraxt' : body.kind === 'com' ? "o'tov" : 'uy'}`); return [200, { added, skipped }];
  }
  if (body.op === 'hokim') { d.hokim = clean(body.n); save(d); return [200, { hokim: d.hokim }]; }
  if (body.op === 'likes') { d.likeTotal = Math.max(0, body.v | 0); save(d); return [200, { likeTotal: d.likeTotal }]; }
  if (body.op === 'level') {
    const n = clean(body.n), i = d.residents.findIndex(x => x.n && !x.d && x.n.toLowerCase() === n.toLowerCase());
    if (i < 0) return [404, { error: 'Aholi topilmadi: ' + n }];
    d.residents[i].l = Math.max(0, Math.min(4, body.l | 0)); save(d); return [200, { n: d.residents[i].n, l: d.residents[i].l, num: i + 1 }];
  }
  if (body.op === 'del') {
    const n = clean(body.n), i = list.findIndex(x => x.n && !x.d && x.n.toLowerCase() === n.toLowerCase());
    if (i < 0) return [404, { error: 'Topilmadi: ' + n }];
    list[i] = { n: '', d: 1 }; save(d); return [200, { ok: true }]; // joy bo'sh qoladi — boshqa raqamlar o'zgarmaydi
  }
  return [400, { error: "Noma'lum amal" }];
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
function readBody(req, cb) { let b = ''; req.on('data', c => { b += c; if (b.length > 5e6) req.destroy(); }); req.on('end', () => { try { cb(JSON.parse(b)); } catch { cb(null); } }); }
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/admin') return readBody(req, (b) => { const [c, o] = admin(b); send(res, c, o); });
  // brauzerdan yig'ilgan obunachilar (faqat shu kompyuterdan)
  if (req.method === 'POST' && req.url === '/api/followers') {
    if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '')) { res.writeHead(403); return res.end(); }
    return readBody(req, (b) => { if (!b) return send(res, 400, { error: 'json' }); if (b.raw) { fs.writeFileSync(path.join(DIR, '.izohlar.json'), JSON.stringify(b.raw)); return send(res, 200, { saved: b.raw.length }); } const r = admin({ code: env.ADMIN_CODE, op: 'add', kind: b.likers ? 'tree' : b.commenters ? 'com' : 'res', names: b.likers || b.commenters || b.followers || [] }); send(res, r[0], { added: r[1].added?.length, total: b.likers ? load().trees.length : b.commenters ? load().comments.length : load().residents.length }); });
  }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
  const f = path.join(DIR, path.normalize(p)), name = path.basename(f);
  if (!f.startsWith(DIR) || name.startsWith('.') || name === 'server.js' || /\.(bat|md|tmp)$/.test(name)) { res.writeHead(404); return res.end(); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(buf);
  });
}).listen(PORT, () => {
  log(`Shaharcha:  http://localhost:${PORT}`);
  log(`Admin:      http://localhost:${PORT}/?admin=${env.ADMIN_CODE}`);
});
