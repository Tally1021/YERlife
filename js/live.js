// Jonli rejim: boshqa o'yinchilarni ko'rsatish va chat (server: live/src/index.js)
import * as THREE from 'three';
import { makePlayer, animatePlayer, lookFor } from './people.js';

const SEND_MS = 400, NEAR = 130, MAXSHOW = 24, v3 = new THREE.Vector3();

export class Live {
  constructor({ url, labels, onChat, onCount }) {
    this.url = url; this.labels = labels; this.onChat = onChat; this.onCount = onCount;
    this.ws = null; this.me = null; this.id = 0; this.shard = 0; this.retry = 0; this.others = new Map();
    this.grp = new THREE.Group(); this.lastSend = 0; this.lastKey = ''; this.on = 0;
  }
  get ready() { return !!this.url; }
  join(n, l) { if (!this.url) return; this.me = { n, l }; if (this.ws && this.ws.readyState === 1) this.send({ t: 'h', n, l }); else if (!this.ws) this.connect(); }
  connect() {
    let ws; try { ws = new WebSocket(this.url.replace(/\/$/, '') + '/ws?s=' + this.shard); } catch { return; }
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; this.lastKey = ''; this.send({ t: 'h', n: this.me.n, l: this.me.l }); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } this.handle(m); };
    ws.onclose = (e) => {
      if (this.ws !== ws) return; this.ws = null; this.clear(); this.count(0);
      if (e.code === 4001 && this.shard < 9) { this.shard++; return this.connect(); }          // xona to'la — keyingisiga
      if (this.retry < 6) setTimeout(() => { if (!this.ws && this.me) this.connect(); }, 2000 * 2 ** this.retry++);
    };
    ws.onerror = () => { };
  }
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  count(n) { this.on = n; this.onCount && this.onCount(n); }
  add(id, n, l, x = 0, z = 0, r = 0, y = 0, w = 't') {
    if (id === this.id) return; this.remove(id);
    const lab = document.createElement('div'); lab.className = 'pn'; lab.innerHTML = '<q></q><b></b>'; lab.lastChild.textContent = '@' + n; this.labels.appendChild(lab);
    this.others.set(id, { id, n, l, x, z, r, y, w, tx: x, tz: z, tr: r, ty: y, mesh: null, ph: 0, lab, say: '', sayT: 0 });
  }
  remove(id) { const o = this.others.get(id); if (!o) return; if (o.mesh) this.grp.remove(o.mesh); o.lab.remove(); this.others.delete(id); }
  clear() { for (const id of [...this.others.keys()]) this.remove(id); }
  handle(m) {
    if (m.t === 'i') { this.id = m.id; this.clear(); for (const p of m.ps) this.add(...p); this.count(m.on); }
    else if (m.t === 'j') { this.add(m.id, m.n, m.l); this.count(m.on); }
    else if (m.t === 'q') { this.remove(m.id); this.count(m.on); }
    else if (m.t === 's') { for (const [id, x, z, r, y, w] of m.u) { const o = this.others.get(id); if (!o) continue; if (o.w !== w || Math.hypot(x - o.x, z - o.z) > 25) { o.x = x; o.z = z; o.r = r; } o.tx = x; o.tz = z; o.tr = r; o.ty = y; o.w = w; } }
    else if (m.t === 'c') { const o = this.others.get(m.id); if (o) { o.say = m.m; o.sayT = performance.now() + 7000; } this.onChat && this.onChat(m.n, m.m, m.id === this.id); }
  }
  chat(text) { text = String(text).trim().slice(0, 120); if (!text || !this.ws || this.ws.readyState !== 1) return false; this.send({ t: 'c', m: text }); return true; }
  // har kadrda: o'z holatimni yuborish + boshqalarni chizish. st = {x,z,r,y,w} yoki null (tepadan ko'rish)
  update(dt, st, camera, scene) {
    if (!this.ws) return;
    const now = performance.now(), w = st ? st.w : 't';
    if (now - this.lastSend > SEND_MS) {
      const key = st ? [st.x.toFixed(1), st.z.toFixed(1), st.r.toFixed(1), st.y > 0 ? 1 : 0, w].join() : 't';
      if (key !== this.lastKey) { this.lastKey = key; this.lastSend = now; this.send(st ? { t: 'p', x: +st.x.toFixed(2), z: +st.z.toFixed(2), r: +st.r.toFixed(2), y: +st.y.toFixed(2), w } : { t: 'p', w: 't' }); }
    }
    if (this.grp.parent !== scene) scene.add(this.grp);
    const fx = st ? st.x : camera.position.x, fz = st ? st.z : camera.position.z, k = 1 - Math.exp(-dt * 9), list = [];
    const top = !st, wantW = top ? 'o' : w;   // tepadan qaraganda ko'chadagilar ko'rinadi
    for (const o of this.others.values()) {
      const dx = o.tx - o.x, dz = o.tz - o.z, mv = Math.hypot(dx, dz) > .06;
      o.x += dx * k; o.z += dz * k; o.y += (o.ty - o.y) * k; let da = o.tr - o.r; da = Math.atan2(Math.sin(da), Math.cos(da)); o.r += da * k; o.mv = mv; if (mv) o.ph += dt * 10;
      const d = (o.x - fx) ** 2 + (o.z - fz) ** 2; o.show = false;
      if (o.w === wantW && d < (top ? 400 : NEAR) ** 2) list.push([d, o]);
    }
    list.sort((a, b) => a[0] - b[0]);
    for (const [, o] of list.slice(0, MAXSHOW)) {
      o.show = true;
      if (!o.mesh) { o.mesh = makePlayer(lookFor(o.n, o.l)); o.mesh.userData.mark.visible = false; this.grp.add(o.mesh); }
      o.mesh.position.set(o.x, o.y, o.z); o.mesh.rotation.y = o.r; animatePlayer(o.mesh, o.y > 0 ? 1.2 : o.ph, o.mv || o.y > 0);
    }
    for (const o of this.others.values()) {
      if (o.mesh) o.mesh.visible = o.show;
      let vis = false;
      if (o.show) { v3.set(o.x, o.y + 2.45, o.z).project(camera); if (v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05) { vis = true; o.lab.style.transform = `translate(${(v3.x * .5 + .5) * innerWidth}px,${(-v3.y * .5 + .5) * innerHeight}px) translate(-50%,-100%)`; } }
      const say = o.sayT > now ? o.say : ''; if (o._say !== say) { o._say = say; o.lab.firstChild.textContent = say; o.lab.classList.toggle('say', !!say); }
      if (o._vis !== vis) { o._vis = vis; o.lab.style.display = vis ? 'block' : 'none'; }
    }
  }
}
