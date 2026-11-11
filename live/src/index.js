// YERLIFE jonli server (Cloudflare Worker + Durable Object):
// o'yinchilar bir-birini ko'radi va chatda yozishadi. Har bir "xona" (shard) — bitta Durable Object.
const MAX = 70;                 // bitta xonadagi eng ko'p o'yinchi
const TICK = 300;               // ms — joylashuvlar shu oraliqda tarqatiladi
const ALLOWED = [/^https:\/\/([a-z0-9-]+\.)?yerlife\.pages\.dev$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const BAD = /(с+у+к+[аи]|бл+я+[дт]?ь?|х+у+[йеёяи]\w*|п+и+з+д\w*|[еёe]+б+[ауеиёл]\w*|п+и+д+[оа]р\w*|г+[оа]нд+он\w*|д+[оа]лб+[оа][её]б\w*|qo'?to+q\w*|jalab\w*|s+i+k+[ai]\w*|am+i+n+g\w*|ske+y\w*|fu+ck\w*|bi+tch\w*|su+ka+\w*|bly+a+[td]?\w*|pi+da+r\w*|x+u+y+\w*)/giu;

const num = (v, lo, hi) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0; };
const r2 = (v) => Math.round(v * 100) / 100;
const cleanName = (s) => { s = String(s || '').replace(/^@/, '').slice(0, 30); return /^[\w.]{1,30}$/.test(s) ? s : 'mehmon'; };
const cleanW = (s) => { s = String(s || 'o'); return /^[a-z0-9]{1,10}$/.test(s) ? s : 'o'; };
const cleanMsg = (s) => String(s || '').replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 120).replace(BAD, '***');

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const okOrigin = ALLOWED.some(r => r.test(origin));
    const shard = String(num(url.searchParams.get('s'), 0, 9) | 0);
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket kerak', { status: 426 });
      if (!okOrigin) return new Response('ruxsat yo\'q', { status: 403 });
      return env.ROOM.get(env.ROOM.idFromName('xona-' + shard)).fetch(req);
    }
    return new Response('YERLIFE live', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};

export class Room {
  constructor() { this.ps = new Map(); this.next = 1; this.timer = null; }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch { } }
  all(o, except) { const s = JSON.stringify(o); for (const [ws] of this.ps) if (ws !== except) { try { ws.send(s); } catch { } } }
  tick() {
    const u = [];
    for (const p of this.ps.values()) if (p.dirty && p.n) { p.dirty = false; u.push([p.id, p.x, p.z, p.r, p.y, p.w]); }
    if (u.length) this.all({ t: 's', u });
    if (!this.ps.size && this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  drop(ws) {
    const p = this.ps.get(ws); if (!p) return; this.ps.delete(ws);
    if (p.n) this.all({ t: 'q', id: p.id, on: this.ps.size });
    try { ws.close(1000, 'bye'); } catch { }
  }
  async fetch() {
    const pair = new WebSocketPair(), client = pair[0], ws = pair[1];
    ws.accept();
    if (this.ps.size >= MAX) { ws.close(4001, 'full'); return new Response(null, { status: 101, webSocket: client }); }
    const p = { id: this.next++, n: '', l: 0, x: 0, z: 0, r: 0, y: 0, w: 't', dirty: false, last: 0, cnt: 0, win: 0 };
    this.ps.set(ws, p);
    if (!this.timer) this.timer = setInterval(() => this.tick(), TICK);
    ws.addEventListener('message', (e) => {
      const now = Date.now();
      if (now - p.win > 10000) { p.win = now; p.cnt = 0; }
      if (++p.cnt > 80 || typeof e.data !== 'string' || e.data.length > 600) return this.drop(ws); // spamdan himoya
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (!m || typeof m !== 'object') return;
      if (m.t === 'h') { // salom: nik va daraja
        const first = !p.n; p.n = cleanName(m.n); p.l = num(m.l, 0, 4) | 0;
        if (first) this.send(ws, { t: 'i', id: p.id, on: this.ps.size, ps: [...this.ps.values()].filter(o => o.n && o !== p).map(o => [o.id, o.n, o.l, o.x, o.z, o.r, o.y, o.w]) });
        this.all({ t: 'j', id: p.id, n: p.n, l: p.l, on: this.ps.size }, ws);
      } else if (!p.n) return;
      else if (m.t === 'p') { p.x = r2(num(m.x, -9000, 9000)); p.z = r2(num(m.z, -9000, 9000)); p.r = r2(num(m.r, -100, 100)); p.y = r2(num(m.y, 0, 50)); p.w = cleanW(m.w); p.dirty = true; }
      else if (m.t === 'c') {
        if (now - p.last < 1500) return; const txt = cleanMsg(m.m); if (!txt) return; p.last = now;
        this.all({ t: 'c', id: p.id, n: p.n, m: txt });
      }
    });
    const bye = () => this.drop(ws);
    ws.addEventListener('close', bye); ws.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }
}
