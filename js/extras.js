// Izohlardagi istaklar: uy rangi, mashina, basseyn, mushuk, daraxt, peshtoq yozuvi (do'kon, bank, masjid...),
// masjid gumbazi va minorasi, futbol maydoncha, otlar, sharlar
import * as THREE from 'three';
import { box, cyl, cone, merge, part, inst, compose, strHash, signTex } from './util.js';
import { DIMS, WISHC, TOPH } from './buildings.js';
const CARC = { pushti: '#f06292', binafsha: '#7e57c2', oltin: '#d4a937', qizil: '#c62828', "ko'k": '#1565c0', yashil: '#2e7d32', sariq: '#fbc02d', qora: '#151515', oq: '#f5f5f5' };
const CARDEF = ['#151515', '#f5f5f5', '#9e9e9e', '#c62828', '#1565c0', '#263238'];

const G = {
  carBody: merge([box(1.8, .62, 4.1, 0, .32, 0, '#fff'), box(1.62, .58, 2.2, 0, .94, -.2, '#fff')]),
  carRest: merge([box(1.66, .46, 2.0, 0, 1.0, -.2, '#1d2a35'), box(1.5, .4, .06, 0, .98, .92, '#1d2a35'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => { const g = new THREE.CylinderGeometry(.34, .34, .26, 12); g.rotateZ(Math.PI / 2); g.translate(x * .86, .34, z * 1.3); return part(g, '#1b1b1b'); }),
    box(.35, .16, .05, -.6, .5, 2.06, '#fffbe6'), box(.35, .16, .05, .6, .5, 2.06, '#fffbe6'), box(.35, .14, .05, -.6, .52, -2.06, '#ff2a2a'), box(.35, .14, .05, .6, .52, -2.06, '#ff2a2a')]),
  pool: merge([box(4.6, .3, 3.2, 0, 0, 0, '#e9e4da'), box(3.9, .02, 2.5, 0, .3, 0, '#2fa6d9'), box(.08, .9, .08, 1.5, .3, -1.1, '#cfd8dc'), box(.08, .9, .08, 1.8, .3, -1.1, '#cfd8dc'),
    box(.7, .12, 1.6, 2.9, 0, .3, '#ffffff'), box(.7, .4, .08, 2.9, .12, -.5, '#ffffff')]),
  cat: merge([box(.22, .2, .44, 0, .12, 0, '#fff'), box(.2, .18, .18, 0, .3, .26, '#fff'), cone(.05, .1, -.06, .46, .26, '#fff', 4), cone(.05, .1, .06, .46, .26, '#fff', 4), box(.05, .05, .32, 0, .2, -.34, '#fff'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => box(.05, .12, .05, x * .07, 0, z * .15, '#fff'))]),
  tree: merge([cyl(.14, .2, 2.2, 0, 0, 0, '#6b4a2f', 7), ...[[0, 2.6, 0, 1.25], [.6, 2.2, .3, .85], [-.55, 2.3, -.2, .9], [0, 3.3, .1, .8]].map(([x, y, z, r]) => { const g = new THREE.IcosahedronGeometry(r, 0); g.translate(x, y, z); return part(g, '#5c9a3a'); })]),
  dome: (() => { const g = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); const t = new THREE.SphereGeometry(.12, 8, 6); t.translate(0, 1.62, 0);
    return merge([part(g, '#2f8f6a'), cyl(1.04, 1.04, .3, 0, -.3, 0, '#f4efe6', 16), cyl(.04, .04, .55, 0, 1, 0, '#d4a937', 6), part(t, '#d4a937')]); })(),
  minaret: (() => { const t = new THREE.SphereGeometry(.13, 8, 6); t.translate(0, 9.5, 0);
    return merge([cyl(.32, .4, 8, 0, 0, 0, '#f4efe6', 10), cyl(.58, .5, .28, 0, 6.1, 0, '#e2d6bd', 10), cyl(.5, .5, .1, 0, 0, 0, '#cfc6b6', 10), cone(.46, 1.4, 0, 8, 0, '#2f8f6a', 10), part(t, '#d4a937')]); })(),
  pitch: merge([box(5.4, .12, 3.5, 0, 0, 0, '#3f9a45'), box(5.1, .02, .07, 0, .12, 1.6, '#ffffff'), box(5.1, .02, .07, 0, .12, -1.6, '#ffffff'), box(.07, .02, 3.27, 2.55, .12, 0, '#ffffff'), box(.07, .02, 3.27, -2.55, .12, 0, '#ffffff'), box(.07, .02, 3.2, 0, .12, 0, '#ffffff'), cyl(.45, .45, .02, 0, .12, 0, '#59b45f', 14),
    ...[-1, 1].flatMap(s => [box(.07, .8, .07, s * 2.55, .12, .62, '#ffffff'), box(.07, .8, .07, s * 2.55, .12, -.62, '#ffffff'), box(.07, .07, 1.31, s * 2.55, .92, 0, '#ffffff'), box(.3, .76, 1.2, s * 2.72, .14, 0, '#dfe7ea')])]),
  horse: merge([box(.46, .5, 1.3, 0, .85, 0, '#7a4a2a'), box(.3, .75, .36, 0, 1.2, .6, '#7a4a2a'), box(.26, .3, .56, 0, 1.78, .84, '#7a4a2a'), box(.08, .5, .3, 0, 1.45, .42, '#2a1a10'), box(.1, .62, .1, 0, .75, -.72, '#2a1a10'),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => box(.12, .86, .12, x * .15, 0, z * .5, '#5f3920'))]),
  bal: (() => { const C = ['#e53950', '#ffd23f', '#3fa7ff', '#59c26a', '#c05cd6', '#ff8a3d', '#ff8fb1'], P = [];
    for (let i = 0; i < 16; i++) { const a = i * 2.4, r = .25 + (i % 4) * .28, y = 2.1 + (i % 5) * .42, g = new THREE.SphereGeometry(.42, 8, 6); g.scale(1, 1.2, 1); g.translate(Math.cos(a) * r, y, Math.sin(a) * r); P.push(part(g, C[i % C.length])); P.push(box(.02, y - .3, .02, Math.cos(a) * r * .5, 0, Math.sin(a) * r * .5, '#eeeeee')); }
    return merge(P); })(),
};
const SGBG = { MASJID: '#1f6b43', BANK: '#0f4c3a', POLITSIYA: '#1b2f6b', 'GAME CLUB': '#5a1f8a', 'TUNGI KLUB': '#3a1250', SHIFOXONA: '#b3261e', STOMATOLOGIYA: '#b3261e' };
const DOMEY = [3.9, 7.0, 21.2, 6.2, 39.6], DOMER = [1.2, 1.5, 2.4, 2.6, 1.6];
const mat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, ...o });

// Bino turi bo'yicha qo'shimchalar joyi (uy old chizig'iga nisbatan; +z ko'chaga)
const CARPOS = [[3.9, -1.2, 0], [2.9, 1.35, Math.PI / 2], [3.2, 1.4, Math.PI / 2], [3.3, 1.4, Math.PI / 2], [4.0, 1.5, Math.PI / 2]];

export class Extras {
  constructor(scene) { this.scene = scene; this.objs = []; }
  build(residents, slotOf) {
    for (const o of this.objs) { this.scene.remove(o); o.dispose?.(); o.material?.map?.dispose(); }
    this.objs = [];
    const list = []; residents.forEach((r, i) => { if (r && r.n && !r.d && r.c) list.push(i); });
    const n = Math.max(1, list.length);
    const cB = inst(G.carBody, mat({ metalness: .5, roughness: .3 }), n), cR = inst(G.carRest, mat(), n), pool = inst(G.pool, mat({ roughness: .3 }), n), cat = inst(G.cat, mat(), n), tree = inst(G.tree, mat({ flatShading: true }), n);
    const dome = inst(G.dome, mat({ roughness: .5 }), n), minaret = inst(G.minaret, mat(), n), pitch = inst(G.pitch, mat(), n), horse = inst(G.horse, mat(), n * 2), bal = inst(G.bal, mat({ roughness: .4 }), n);
    const all = [cB, cR, pool, cat, tree, dome, minaret, pitch, horse, bal];
    for (const m of all) { this.scene.add(m); this.objs.push(m); }
    const col = new THREE.Color(), loc = new THREE.Vector3();
    const at = (s, lx, lz) => [s.x + s.fz * lx + s.fx * lz, s.z - s.fx * lx + s.fz * lz];
    for (const i of list) {
      const r = residents[i], c = r.c, s = slotOf(i), L = Math.min(4, r.l | 0), dm = DIMS[L], h = strHash(r.n);
      if (c.car) {
        const [x, y, ry] = CARPOS[L], [wx, wz] = at(s, x, y);
        const M = compose(wx, .02, wz, s.rot + ry); cB.setMatrixAt(cB.count, M); cR.setMatrixAt(cR.count, M);
        cB.setColorAt(cB.count, col.set(CARC[c.carc] || CARC[c.w] || CARDEF[h % CARDEF.length])); cB.count++; cR.count++;
      }
      if (c.pool) { const [wx, wz] = at(s, 0, -(dm.d + 2.4)); pool.setMatrixAt(pool.count++, compose(wx, 0, wz, s.rot)); }
      if (c.cat) { const [wx, wz] = at(s, 1.1, .9); cat.setMatrixAt(cat.count, compose(wx, 0, wz, s.rot + .6)); cat.setColorAt(cat.count++, col.set(['#f2a04b', '#3a3a3a', '#f4f1ea', '#9a9a9a'][h % 4])); }
      if (c.tree) { const [wx, wz] = at(s, -(dm.w / 2 + 1.4), -dm.d / 2); tree.setMatrixAt(tree.count++, compose(wx, 0, wz, h % 6)); }
      const bx = L === 1 ? -1.6 : 0; // bino markazi (ikki qavatli uy chapga surilgan)
      if (c.dome) {
        const [dx, dz] = at(s, bx, -dm.d / 2), k = DOMER[L]; dome.setMatrixAt(dome.count++, compose(dx, DOMEY[L], dz, s.rot, k, k, k));
        const [mx, mz] = at(s, -(dm.w / 2 + .9), -.7); minaret.setMatrixAt(minaret.count++, compose(mx, 0, mz, s.rot, 1, Math.min(2.2, Math.max(.8, (dm.h + 3.5) / 9.6)), 1));
      }
      if (c.pitch) { const [wx, wz] = at(s, 0, -(dm.d + 2.6 + (c.pool ? 3.8 : 0))); pitch.setMatrixAt(pitch.count++, compose(wx, 0, wz, s.rot)); }
      if (c.horse) for (const [lx, lz, a, hc] of [[-(dm.w / 2 + 1.2), .9, .3, '#ffffff'], [-(dm.w / 2 + 1.7), -1.1, -.5, '#d9c7a8']]) { const [wx, wz] = at(s, lx, lz); horse.setMatrixAt(horse.count, compose(wx, 0, wz, s.rot + a)); horse.setColorAt(horse.count++, col.set(hc)); }
      if (c.bal) { const [wx, wz] = at(s, bx, -dm.d / 2); bal.setMatrixAt(bal.count++, compose(wx, TOPH[L] - .5, wz, s.rot)); }
      if (c.shop || c.sg) {
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .95), new THREE.MeshStandardMaterial({ map: signTex([c.sg || "DO'KON", '@' + r.n], { bg: SGBG[c.sg] || '#1d5e9e', border: '#ffd34d', font: 'bold 60px system-ui' }) }));
        const y = [2.35, 2.95, 3.0, 3.6, 3.2][L], z = [.55, .32, .3, .45, .3][L], [wx, wz] = at(s, L === 1 ? -1.6 : 0, z);
        sg.position.set(wx, y + .5, wz); sg.rotation.y = s.rot; this.scene.add(sg); this.objs.push(sg);
      }
    }
    for (const m of all) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
    this.list = list;
  }
}
