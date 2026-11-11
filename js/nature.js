// Tabiat: yer, osmon (kun/tun), bulutlar, daraxtlar (LOD bilan), Layklar bog'i
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { fbm, smooth, rng, hash, strHash, part, merge, box, cyl, inst, compose, ZERO, addWind, canvasTex, signTex, noiseFill } from './util.js';
import { treePos } from './layout.js';

// ---------- yer ----------
let FLAT = 600;
export function heightAt(x, z) {
  const d = Math.hypot(x, z); if (d < FLAT) return 0;
  return smooth(FLAT, FLAT + 320, d) * (fbm(x * .0035 + 7, z * .0035 - 3) * .6 + .6) * 95;
}
export function buildTerrain(scene, info, old) {
  if (old) { scene.remove(old); old.geometry.dispose(); }
  FLAT = info.flat;
  const size = 2 * (FLAT + 2200), seg = 260;
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color();
  const g1 = new THREE.Color('#5f8a38'), g2 = new THREE.Color('#7d9a45'), dry = new THREE.Color('#9d9a5e'), rock = new THREE.Color('#77705f'), lush = new THREE.Color('#4a7a2e'), meadow = new THREE.Color('#9fb25a');
  const G = info.garden;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = heightAt(x, z); p.setY(i, h - .02);
    const n = fbm(x * .02, z * .02) * .5 + .5, n2 = fbm(x * .005 + 3, z * .005) * .5 + .5;
    c.copy(g1).lerp(g2, n).lerp(dry, smooth(.6, .9, n2) * .5).lerp(rock, smooth(30, 80, h) * .7);
    if (x > G.x0 && x < G.x0 + G.Dp && z > G.z0 && z < G.z0 + G.W) c.lerp(lush, .7);
    const C = info.com; if (C && x > C.x0 && x < C.x0 + C.W && z > C.z0 && z < C.z0 + C.Dp) c.lerp(meadow, .55);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); m.receiveShadow = true; scene.add(m); return m;
}

// ---------- osmon ----------
export class SkyBox {
  constructor(scene, renderer) {
    this.scene = scene; this.sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 32), THREE.MathUtils.degToRad(140));
    this.sky = new Sky(); this.sky.scale.setScalar(20000); const u = this.sky.material.uniforms;
    u.turbidity.value = 5; u.rayleigh.value = 1.3; u.mieCoefficient.value = .004; u.mieDirectionalG.value = .82; u.sunPosition.value.copy(this.sun);
    scene.add(this.sky);
    const pm = new THREE.PMREMGenerator(renderer); const s2 = new THREE.Scene(); const sk2 = new Sky(); sk2.scale.setScalar(1000); for (const k in u) sk2.material.uniforms[k].value = u[k].value; s2.add(sk2);
    this.envDay = pm.fromScene(s2).texture;
    // yulduzlar
    const N = 2500, pos = new Float32Array(N * 3), r = rng(77);
    for (let i = 0; i < N; i++) { const th = r() * Math.PI * 2, ph = Math.acos(r() * .95), R = 9000; pos.set([Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R, Math.sin(ph) * Math.sin(th) * R], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: .9 }));
    // oy
    const moonTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(.45, '#f3edd2'); gr.addColorStop(.55, 'rgba(255,250,220,.25)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(180,170,140,.35)'; for (const [x, y, rr] of [[50, 52, 8], [74, 70, 6], [62, 80, 4]]) { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); } });
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, depthWrite: false })); this.moon.scale.setScalar(900);
    this.moonDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(-120));
    this.moon.position.copy(this.moonDir).multiplyScalar(8500);
  }
  setNight(on, scene) {
    this.night = on;
    this.sky.visible = !on;
    if (on) { scene.background = new THREE.Color(0x0a1224); scene.add(this.stars, this.moon); scene.environment = null; }
    else { scene.background = null; scene.remove(this.stars, this.moon); scene.environment = this.envDay; }
  }
  follow(cam) { this.stars.position.copy(cam.position); this.moon.position.copy(cam.position).addScaledVector(this.moonDir, 8500); }
}

// ---------- bulutlar ----------
export class Clouds {
  constructor(scene, R) {
    const parts = [], r = rng(31);
    for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(1, 1); const s = i === 0 ? 1.5 : .8 + r() * .5; g.scale(s, s * .7, s); const a = r() * 6.28, d = i ? .9 + r() * .9 : 0; g.translate(Math.cos(a) * d * 1.3, i ? r() * .4 : .2, Math.sin(a) * d); parts.push(part(g, '#ffffff')); }
    this.geo = merge(parts);
    this.mesh = inst(this.geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, transparent: true, opacity: .95 }), 26, { shadow: false, receive: false });
    this.c = []; for (let i = 0; i < 26; i++) this.c.push({ x: (r() - .5) * 3000, z: (r() - .5) * 3000, y: 160 + r() * 90, s: 14 + r() * 18, v: 2 + r() * 3, rot: r() * 6 });
    this.mesh.count = 26; scene.add(this.mesh);
  }
  update(dt, night) {
    this.c.forEach((c, i) => { c.x += c.v * dt; if (c.x > 1500) c.x = -1500; this.mesh.setMatrixAt(i, compose(c.x, c.y, c.z, c.rot, c.s, c.s * .75, c.s)); });
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.material.color.set(night ? 0x8a96b8 : 0xffffff); this.mesh.material.opacity = night ? .35 : .95;
  }
}

// ---------- daraxt geometriyalari ----------
const WOOD = '#5b4330';
function jitterIco(r, seed, detail = 0) {
  const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = hash(Math.round(v.x * 100) * 3.1 + Math.round(v.y * 100) * 7.7 + Math.round(v.z * 100) * 1.3 + seed); v.multiplyScalar(.82 + k * .36); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
function branch(from, dir, len, r0, r1) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 6); g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())); g.translate(from.x, from.y, from.z); return part(g, WOOD);
}
function deciduous(seed) {
  const r = rng(seed * 97 + 5), wood = [cyl(.17, .3, 2.6, 0, 0, 0, WOOD, 7)], leaves = [];
  const ends = [new THREE.Vector3(0, 4.2, 0)];
  wood.push(branch(new THREE.Vector3(0, 2.4, 0), new THREE.Vector3(0, 1, 0), 1.9, .17, .1));
  const nb = 4 + (r() * 2 | 0);
  for (let i = 0; i < nb; i++) {
    const a = i / nb * Math.PI * 2 + r() * .6, up = .7 + r() * .6, from = new THREE.Vector3(0, 1.9 + r() * 1.2, 0);
    const dir = new THREE.Vector3(Math.cos(a), up, Math.sin(a)), len = 1.3 + r() * .7;
    wood.push(branch(from, dir, len, .11, .05));
    const end = from.clone().add(dir.normalize().multiplyScalar(len)); ends.push(end);
    // kichik shoxcha
    const d2 = dir.clone().add(new THREE.Vector3(-Math.sin(a) * .8, .3, Math.cos(a) * .8)); wood.push(branch(from.clone().add(dir.clone().multiplyScalar(len * .55)), d2, .8, .05, .03));
    ends.push(from.clone().add(dir.clone().multiplyScalar(len * .55)).add(d2.normalize().multiplyScalar(.8)));
  }
  ends.forEach((e, i) => {
    const s = (i === 0 ? 1.15 : .75) + r() * .35, g = jitterIco(s, seed * 13 + i, 0); g.scale(1, .78, 1); g.rotateY(r() * 3); g.translate(e.x, e.y + .15, e.z);
    const k = .82 + r() * .3; leaves.push(part(g, new THREE.Color(k, k, k).getStyle()));
  });
  return { wood: merge(wood), leaves: merge(leaves), r: .3 };
}
function pine(seed) {
  const r = rng(seed * 31 + 9), wood = [cyl(.12, .2, 1.4, 0, 0, 0, WOOD, 6)], leaves = [];
  for (let i = 0; i < 5; i++) {
    const rad = 1.7 - i * .3, g = new THREE.ConeGeometry(rad, 1.5, 8, 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) if (p.getY(k) < 0) { const j = .82 + hash(k * 7.1 + i + seed) * .32; p.setX(k, p.getX(k) * j); p.setZ(k, p.getZ(k) * j); p.setY(k, p.getY(k) - hash(k + seed) * .25); }
    g.computeVertexNormals(); g.rotateY(r() * 2); g.translate(0, 1.4 + i * .95 + .75, 0); const kk = .85 + i * .05; leaves.push(part(g, new THREE.Color(kk, kk, kk).getStyle()));
  }
  return { wood: merge(wood), leaves: merge(leaves), r: .22 };
}
const FAR = {
  dec: { wood: merge([cyl(.18, .28, 2.8, 0, 0, 0, WOOD, 5)]), leaves: (() => { const a = jitterIco(1.7, 1, 0); a.scale(1.15, .85, 1.15); a.translate(0, 3.9, 0); const b = jitterIco(1.1, 2, 0); b.translate(.6, 4.8, .2); return merge([part(a), part(b)]); })() },
  pine: { wood: merge([cyl(.12, .2, 1.4, 0, 0, 0, WOOD, 5)]), leaves: (() => { const g = new THREE.ConeGeometry(1.6, 5.2, 7); g.translate(0, 4, 0); return merge([part(g)]); })() },
};
const VARIANTS = [deciduous(1), deciduous(2), deciduous(3), pine(1), pine(2)];
const woodMat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), .02);
const leafMat = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .85 }), .05);
const LEAFC = ['#4f8a34', '#5c9a3a', '#3f7a2c', '#6aa144', '#4d8f3f', '#7aa83f', '#3d6e2a'];
const PINEC = ['#2f5e2e', '#28522a', '#355f34'];

export function bigTree() {
  const t = deciduous(7), g = new THREE.Group();
  const w = new THREE.Mesh(t.wood, woodMat), l = new THREE.Mesh(t.leaves, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, color: 0x55923a, roughness: .85 }));
  addWind(l.material, .02); g.add(w, l); g.scale.setScalar(3.4); g.traverse(o => { o.castShadow = o.receiveShadow = true; }); return g;
}

// ---------- daraxtlar tizimi (yaqinda batafsil, uzoqda sodda) ----------
export class Trees {
  constructor(scene) { this.scene = scene; this.near = []; this.far = []; this.list = []; this.nearSet = new Set(); }
  build(trees, info) {
    for (const m of [...this.near.flatMap(x => [x.w, x.l]), ...this.far.flatMap(x => [x.w, x.l]), this.holes]) if (m) { this.scene.remove(m); m.dispose(); }
    this.list = []; const G = info.garden; this.G = G;
    trees.forEach((t, j) => {
      if (!t || t.d || (!t.n && !t.anon)) return; const h = strHash(t.n || ('anon' + j)), v = h % 5, p = treePos(j, G);
      const pineT = v >= 3, s = .9 + (h >>> 8) % 100 / 300;
      this.list.push({ j, x: p.x, z: p.z, v, pine: pineT, s, rot: (h >>> 3) % 628 / 100, c: pineT ? PINEC[(h >>> 5) % 3] : LEAFC[(h >>> 5) % LEAFC.length], n: t.n, anon: !t.n });
    });
    const N = this.list.length, NEAR = 260;
    this.near = VARIANTS.map(v => ({ w: inst(v.wood, woodMat, NEAR), l: inst(v.leaves, leafMat, NEAR) }));
    this.far = [FAR.dec, FAR.pine].map(v => ({ w: inst(v.wood, woodMat, N + 4), l: inst(v.leaves, leafMat, N + 4) }));
    for (const x of [...this.near, ...this.far]) this.scene.add(x.w, x.l);
    const col = new THREE.Color();
    this.list.forEach((t, k) => { t.k = k; const f = this.far[t.pine ? 1 : 0]; t.fi = f.w.count++; f.l.count++; this.setFar(t, true); f.l.setColorAt(t.fi, col.set(t.c)); });
    for (const f of this.far) { f.w.instanceMatrix.needsUpdate = f.l.instanceMatrix.needsUpdate = true; if (f.l.instanceColor) f.l.instanceColor.needsUpdate = true; }
    this.byJ = new Map(this.list.map(t => [t.j, t]));
    // tuproq chuqurlari (hamma ekish joylarida)
    const holeG = (() => { const a = new THREE.CircleGeometry(.75, 14); a.rotateX(-Math.PI / 2); a.translate(0, .03, 0); const b = new THREE.RingGeometry(.75, .95, 14); b.rotateX(-Math.PI / 2); b.translate(0, .04, 0); return merge([part(a, '#4a3423'), part(b, '#6b5238')]); })();
    const NP = G.rows * G.cols; this.holes = inst(holeG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), NP, { shadow: false });
    for (let j = 0; j < NP; j++) { const p = treePos(j, G); this.holes.setMatrixAt(j, compose(p.x, 0, p.z, 0)); }
    this.holes.count = NP; this.scene.add(this.holes); this.nearSet = new Set();
  }
  setFar(t, show) { const f = this.far[t.pine ? 1 : 0]; const M = show ? compose(t.x, 0, t.z, t.rot, t.s, t.s, t.s) : ZERO; f.w.setMatrixAt(t.fi, M); f.l.setMatrixAt(t.fi, M); }
  // yaqindagi daraxtlarni batafsil qilish
  updateLOD(fx, fz, R = 110) {
    const want = this.list.filter(t => (t.x - fx) ** 2 + (t.z - fz) ** 2 < R * R).sort((a, b) => ((a.x - fx) ** 2 + (a.z - fz) ** 2) - ((b.x - fx) ** 2 + (b.z - fz) ** 2)).slice(0, 250);
    const ws = new Set(want.map(t => t.k));
    for (const k of this.nearSet) if (!ws.has(k)) this.setFar(this.list[k], true);
    for (const k of ws) if (!this.nearSet.has(k)) this.setFar(this.list[k], false);
    this.nearSet = ws;
    const cnt = [0, 0, 0, 0, 0], col = new THREE.Color();
    for (const t of want) { const n = this.near[t.v], i = cnt[t.v]++; const M = compose(t.x, 0, t.z, t.rot, t.s, t.s, t.s); n.w.setMatrixAt(i, M); n.l.setMatrixAt(i, M); n.l.setColorAt(i, col.set(t.hl ? '#ffd23a' : t.c)); }
    this.near.forEach((n, v) => { n.w.count = n.l.count = cnt[v]; n.w.instanceMatrix.needsUpdate = n.l.instanceMatrix.needsUpdate = true; if (n.l.instanceColor) n.l.instanceColor.needsUpdate = true; });
    for (const f of this.far) f.w.instanceMatrix.needsUpdate = f.l.instanceMatrix.needsUpdate = true;
    return want;
  }
  highlight(j, on) { const t = this.byJ.get(j); if (!t) return; t.hl = on; const f = this.far[t.pine ? 1 : 0]; f.l.setColorAt(t.fi, new THREE.Color(on ? '#ffd23a' : t.c)); f.l.instanceColor.needsUpdate = true; }
}

// ---------- Layklar bog'i: panjara + darvoza ----------
export function buildGarden(info) {
  const G = info.garden, g = new THREE.Group(), P = [];
  const x0 = G.x0, x1 = G.x0 + G.Dp, z0 = G.z0, z1 = G.z0 + G.W, gate = 7;
  const segs = [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, gate / 2], [x0, -gate / 2, x0, z0]];
  for (const [ax, az, bx, bz] of segs) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.5)), ry = Math.atan2(bx - ax, bz - az);
    for (let i = 0; i <= n; i++) { const t = i / n; P.push(box(.14, 1.6, .14, ax + (bx - ax) * t, 0, az + (bz - az) * t, '#2c3b2e')); }
    for (const y of [.5, 1.35]) { const b = box(.06, .06, L, 0, y, 0, '#3b4d3d'); b.rotateY(ry); b.translate((ax + bx) / 2, 0, (az + bz) / 2); P.push(b); }
    for (let i = 0; i < n * 6; i++) { const t = (i + .5) / (n * 6); P.push(box(.03, 1.25, .03, ax + (bx - ax) * t, .25, az + (bz - az) * t, '#3b4d3d')); }
  }
  // ichki yo'lak
  P.push(box(G.Dp, .04, 2.2, x0 + G.Dp / 2, 0, 0, '#b7a37c'));
  // darvoza arka
  P.push(box(.5, 4.6, .5, x0, 0, -gate / 2 - .3, '#2c3b2e'), box(.5, 4.6, .5, x0, 0, gate / 2 + .3, '#2c3b2e'), box(.6, .4, gate + 1.6, x0, 4.6, 0, '#2c3b2e'));
  const fence = new THREE.Mesh(merge(P), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: .3 })); fence.castShadow = true; fence.receiveShadow = true; g.add(fence);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.9), new THREE.MeshStandardMaterial({ map: signTex(['LAYKLAR SHAHARCHASI', 'har bir layk — bitta daraxt ❤'], { bg: '#24502d', border: '#f1d27a' }), side: THREE.DoubleSide }));
  sign.position.set(x0 - .1, 5.9, 0); sign.rotation.y = -Math.PI / 2; g.add(sign);
  const pick = new THREE.Mesh(new THREE.PlaneGeometry(G.Dp, G.W).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(x0 + G.Dp / 2, 3, z0 + G.W / 2); g.add(pick);
  // skameykalar
  return g;
}

export function plazaTex() { return canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#cbbfa8', 16, 1500, 9); g.strokeStyle = 'rgba(90,70,50,.25)'; g.lineWidth = 2; for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, { repeat: [12, 12] }); }
