// Izohlar shaharchasi: har bir izoh yozgan odamga — nik yozilgan bitta o'tov
import * as THREE from 'three';
import { box, cyl, cone, merge, inst, compose, strHash, signTex } from './util.js';
import { yurtPos } from './layout.js';

const FELT = ['#f4efe2', '#efe6d2', '#f7f3ea', '#e9dfc8', '#f1ead9'];
const ACCENT = ['#b3261e', '#1f5fa8', '#2e7d4f', '#7b2d6b', '#c27c0e', '#8c3b1a', '#0f6e74', '#a8324a'];

// Kigiz qismi (devor + gumbaz)
const feltGeo = merge([
  cyl(2.3, 2.3, 1.9, 0, 0, 0, '#ffffff', 16),
  cone(2.62, 1.45, 0, 1.9, 0, '#ffffff', 16),
]);
// Naqshli qismlar (belbog', tom hoshiyasi, tom chiziqlari)
const accentGeo = merge([
  cyl(2.33, 2.33, .32, 0, 1.38, 0, '#ffffff', 16),
  cyl(2.45, 2.66, .22, 0, 1.88, 0, '#ffffff', 16),
  cyl(1.02, 1.12, .16, 0, 2.78, 0, '#ffffff', 12),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i / 8 * Math.PI * 2, g = box(.12, .06, 1.75, 0, 0, 0, '#ffffff'); g.rotateX(-.66); g.rotateY(a); g.translate(Math.sin(a) * 1.65, 2.32, Math.cos(a) * 1.65); return g; }),
]);
// O'zgarmas ranglar (eshik, tunduk, poydevor)
const fixedGeo = merge([
  cyl(.55, .62, .22, 0, 3.22, 0, '#5a3a22', 10),
  cyl(2.5, 2.55, .12, 0, 0, 0, '#9b8a6e', 16),
  box(1.15, 1.6, .2, 0, .1, 2.28, '#7a4320'),
  box(.85, 1.35, .06, 0, .18, 2.39, '#a0582a'),
  box(.12, .12, .03, 0, .85, 2.43, '#e6c25a'),
  box(1.4, .18, .3, 0, 1.68, 2.27, '#c79a3a'),
]);

export class Yurts {
  constructor(scene) { this.scene = scene; this.list = []; this.meshes = []; }
  build(items, info) {
    for (const m of this.meshes) { this.scene.remove(m); m.dispose(); }
    const live = []; items.forEach((x, j) => { if (x && x.n && !x.d) live.push(j); });
    const n = Math.max(1, live.length), mat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 });
    this.felt = inst(feltGeo, mat(), n); this.acc = inst(accentGeo, mat(), n); this.fixed = inst(fixedGeo, mat(), n);
    this.meshes = [this.felt, this.acc, this.fixed]; this.meshes.forEach(m => this.scene.add(m));
    this.list = []; this.byJ = new Map(); const c = new THREE.Color();
    live.forEach((j, k) => {
      const p = yurtPos(j, info.com), h = strHash(items[j].n), s = .92 + (h % 17) / 100;
      const t = { j, k, x: p.x, z: p.z, rot: p.rot, s, n: items[j].n, felt: FELT[h % FELT.length], acc: ACCENT[(h >>> 5) % ACCENT.length] };
      const M = compose(p.x, 0, p.z, p.rot, s, s, s);
      for (const m of this.meshes) m.setMatrixAt(k, M);
      this.felt.setColorAt(k, c.set(t.felt)); this.acc.setColorAt(k, c.set(t.acc));
      this.list.push(t); this.byJ.set(j, t);
    });
    for (const m of this.meshes) { m.count = live.length; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
  }
  near(fx, fz, R) { const R2 = R * R; return this.list.filter(t => (t.x - fx) ** 2 + (t.z - fz) ** 2 < R2).sort((a, b) => ((a.x - fx) ** 2 + (a.z - fz) ** 2) - ((b.x - fx) ** 2 + (b.z - fz) ** 2)); }
  highlight(j, on) {
    const t = this.byJ.get(j); if (!t) return; const c = new THREE.Color();
    this.felt.setColorAt(t.k, c.set(on ? '#ffe680' : t.felt)); this.acc.setColorAt(t.k, c.set(on ? '#ffc400' : t.acc));
    this.felt.instanceColor.needsUpdate = this.acc.instanceColor.needsUpdate = true;
  }
}

// Panjara, darvoza, o'rta ko'cha, yozuv
export function buildComTown(info) {
  const C = info.com, g = new THREE.Group(), P = [];
  const x0 = C.x0, x1 = C.x0 + C.W, z0 = C.z0, z1 = C.z0 + C.Dp, gate = C.mid;
  const wood = '#8a6a44', wood2 = '#6e5233';
  const segs = [[x0, z0, -gate / 2, z0], [gate / 2, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]];
  for (const [ax, az, bx, bz] of segs) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.4)), ry = Math.atan2(bx - ax, bz - az);
    for (let i = 0; i <= n; i++) { const t = i / n; P.push(box(.18, 1.25, .18, ax + (bx - ax) * t, 0, az + (bz - az) * t, wood2)); }
    for (const y of [.45, .95]) { const b = box(.08, .12, L, 0, y, 0, wood); b.rotateY(ry); b.translate((ax + bx) / 2, 0, (az + bz) / 2); P.push(b); }
  }
  // o'rta ko'cha (tosh yo'lak) va yon chiroqlar
  P.push(box(gate - 1, .05, C.Dp, 0, 0, (z0 + z1) / 2, '#c9b48f'));
  for (let z = z0 + 10; z < z1 - 4; z += 18) for (const o of [-1, 1]) {
    P.push(box(.16, 2.6, .16, o * (gate / 2 - .3), 0, z, '#3b2f24'), box(.45, .45, .45, o * (gate / 2 - .3), 2.6, z, '#ffd27a'), box(.6, .1, .6, o * (gate / 2 - .3), 3.05, z, '#3b2f24'));
  }
  // darvoza (yog'och arka)
  P.push(box(.6, 5, .6, -gate / 2 - .3, 0, z0, wood2), box(.6, 5, .6, gate / 2 + .3, 0, z0, wood2), box(gate + 2.2, .5, .7, 0, 5, z0, wood2), box(gate + 3, .25, .9, 0, 5.5, z0, '#b3261e'));
  const fence = new THREE.Mesh(merge(P), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85 })); fence.castShadow = true; fence.receiveShadow = true; g.add(fence);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2), new THREE.MeshStandardMaterial({ map: signTex(['IZOHLAR SHAHARCHASI', "har bir izoh — bitta o'tov 💬"], { bg: '#6b2a1a', border: '#f1d27a' }), side: THREE.DoubleSide }));
  sign.position.set(0, 7.05, z0 - .05); sign.rotation.y = Math.PI; g.add(sign);
  const pick = new THREE.Mesh(new THREE.PlaneGeometry(C.W, C.Dp).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0, 2, z0 + C.Dp / 2); g.add(pick);
  return g;
}
