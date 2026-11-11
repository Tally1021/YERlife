// Personajlar: uy egalari, piyodalar, o'yinchi
import * as THREE from 'three';
import { box, cyl, cone, merge, part, inst, strHash, ZERO, rng } from './util.js';
import { MAT } from './buildings.js';

const SKIN = ['#f6d7bd', '#eec39e', '#dba57d', '#c08660', '#9a6442', '#74472d'];
const HAIR = ['#1c1410', '#3b2516', '#6b4226', '#a8742f', '#d9b25a', '#2a2a2a', '#7a3b22', '#b8b1a8'];
const SHIRT = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#00acc1', '#f06292', '#ffffff', '#212121', '#26a69a', '#5c6bc0', '#c0ca33', '#ff7043'];
const PANTS = ['#2b4a7a', '#1f2a44', '#222222', '#5d5d5d', '#8a7350', '#3e5e3a', '#4a3b2e', '#33415c'];

export function lookFor(nick, level = 0) {
  const h = strHash(nick || 'mehmon'), h2 = strHash((nick || 'm') + '#');
  return { skin: SKIN[h % SKIN.length], hair: HAIR[(h >>> 4) % HAIR.length], shirt: SHIRT[(h >>> 8) % SHIRT.length], pants: PANTS[(h >>> 12) % PANTS.length], girl: (h2 % 100) < 42, crown: level === 4, cape: level === 3 };
}

// Qism geometriyalari (oyoq-qo'llar aylanish nuqtasi = 0,0,0)
const G = {
  torso: merge([box(.48, .6, .26, 0, .84, 0, '#fff')]),
  skirt: merge([cyl(.24, .4, .58, 0, .42, 0, '#fff', 12)]),
  leg: merge([box(.19, .7, .21, 0, -.82, 0, '#fff'), box(.21, .12, .3, 0, -.84, .04, '#3a3a3a')].map((g, i) => (i === 0 ? g.translate(0, .12, 0) : g, g))),
  sleeve: merge([box(.16, .26, .18, 0, -.26, 0, '#fff')]),
  fore: merge([box(.12, .4, .13, 0, -.64, 0, '#fff')]),
  head: merge([box(.12, .08, .12, 0, 1.43, 0, '#fff'), box(.33, .34, .3, 0, 1.5, 0, '#fff')]),
  face: merge([box(.05, .05, .02, -.075, 1.69, .155, '#1a1a1a'), box(.05, .05, .02, .075, 1.69, .155, '#1a1a1a'), box(.12, .025, .02, 0, 1.58, .155, '#9c4a3a')]),
  hair: merge([box(.35, .1, .33, 0, 1.82, -.005, '#fff'), box(.35, .22, .07, 0, 1.62, -.15, '#fff'), box(.06, .14, .3, -.17, 1.7, 0, '#fff'), box(.06, .14, .3, .17, 1.7, 0, '#fff')]),
  hairLong: merge([box(.36, .55, .08, 0, 1.25, -.17, '#fff')]),
  crown: merge([cyl(.19, .19, .1, 0, 1.9, 0, '#fff', 10), ...[0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2; return cone(.05, .14, Math.cos(a) * .16, 2.0, Math.sin(a) * .16, '#fff', 5); })]),
  cape: merge([box(.52, 1.0, .04, 0, .42, -.17, '#fff')]),
};
const PIV = { legL: [-.11, .82, 0], legR: [.11, .82, 0], armL: [-.32, 1.42, 0], armR: [.32, 1.42, 0] };

const tmpM = new THREE.Matrix4(), tmpL = new THREE.Matrix4(), tmpR = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v1 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
function limbMat(root, piv, angle, out) { e.set(angle, 0, 0); q.setFromEuler(e); tmpL.compose(v1.set(...piv), q, one); return out.multiplyMatrices(root, tmpL); }

// Ko'p personajlar (instanced)
export class Crowd {
  constructor(scene, cap) {
    this.cap = cap; const mk = (g, n = cap, mat) => { const m = inst(g, mat || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), n, { receive: false }); scene.add(m); return m; };
    this.m = { torso: mk(G.torso), skirt: mk(G.skirt), leg: mk(G.leg, cap * 2), sleeve: mk(G.sleeve, cap * 2), fore: mk(G.fore, cap * 2), head: mk(G.head), face: mk(G.face), hair: mk(G.hair), hairLong: mk(G.hairLong), crown: mk(G.crown, cap, MAT.gold), cape: mk(G.cape) };
    for (const k in this.m) this.m[k].count = this.m[k] === this.m.leg || this.m[k] === this.m.sleeve || this.m[k] === this.m.fore ? cap * 2 : cap;
    this.col = new THREE.Color(); this.root = new THREE.Matrix4();
    for (let i = 0; i < cap; i++) this.hide(i);
  }
  hide(i) { for (const k in this.m) { const m = this.m[k]; if (m.count > this.cap) { m.setMatrixAt(i * 2, ZERO); m.setMatrixAt(i * 2 + 1, ZERO); } else m.setMatrixAt(i, ZERO); } }
  set(i, x, z, rot, look, swing = 0, y = 0) {
    const M = this.m, R = this.root; q.setFromAxisAngle(v1.set(0, 1, 0), rot); R.compose(new THREE.Vector3(x, y, z), q, one);
    M.torso.setMatrixAt(i, R); M.head.setMatrixAt(i, R); M.face.setMatrixAt(i, R); M.hair.setMatrixAt(i, R);
    M.skirt.setMatrixAt(i, look.girl ? R : ZERO); M.hairLong.setMatrixAt(i, look.girl ? R : ZERO);
    M.crown.setMatrixAt(i, look.crown ? R : ZERO); M.cape.setMatrixAt(i, look.cape ? R : ZERO);
    M.leg.setMatrixAt(i * 2, limbMat(R, PIV.legL, swing, tmpM)); M.leg.setMatrixAt(i * 2 + 1, limbMat(R, PIV.legR, -swing, tmpM));
    for (const [k, s] of [['sleeve', 0], ['fore', 0]]) { M[k].setMatrixAt(i * 2, limbMat(R, PIV.armL, -swing * .8, tmpM)); M[k].setMatrixAt(i * 2 + 1, limbMat(R, PIV.armR, swing * .8, tmpM)); }
    if (look !== this['l' + i]) {
      this['l' + i] = look; const c = this.col;
      M.torso.setColorAt(i, c.set(look.shirt)); M.skirt.setColorAt(i, c.set(look.shirt)); M.head.setColorAt(i, c.set(look.skin));
      M.hair.setColorAt(i, c.set(look.hair)); M.hairLong.setColorAt(i, c.set(look.hair)); M.cape.setColorAt(i, c.set('#b71c1c')); M.face.setColorAt(i, c.set('#ffffff')); M.crown.setColorAt(i, c.set('#ffffff'));
      for (const j of [i * 2, i * 2 + 1]) { M.leg.setColorAt(j, c.set(look.girl ? look.skin : look.pants)); M.sleeve.setColorAt(j, c.set(look.shirt)); M.fore.setColorAt(j, c.set(look.skin)); }
    }
  }
  commit() { for (const k in this.m) { const m = this.m[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
}

// O'yinchi — alohida guruh (oyoq-qo'llari harakatlanadi)
export function makePlayer(look) {
  const g = new THREE.Group(), mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, vertexColors: true });
  const add = (geo, c, parent = g) => { const m = new THREE.Mesh(geo, mat(c)); m.castShadow = true; parent.add(m); return m; };
  add(G.torso, look.shirt); add(G.head, look.skin); add(G.face, '#ffffff'); add(G.hair, look.hair);
  if (look.girl) { add(G.skirt, look.shirt); add(G.hairLong, look.hair); }
  if (look.crown) { const c = new THREE.Mesh(G.crown, MAT.gold); g.add(c); }
  if (look.cape) add(G.cape, '#b71c1c');
  const limb = (piv) => { const p = new THREE.Group(); p.position.set(...piv); g.add(p); return p; };
  const lL = limb(PIV.legL), lR = limb(PIV.legR), aL = limb(PIV.armL), aR = limb(PIV.armR);
  const legC = look.girl ? look.skin : look.pants;
  add(G.leg, legC, lL); add(G.leg, legC, lR); add(G.sleeve, look.shirt, aL); add(G.fore, look.skin, aL); add(G.sleeve, look.shirt, aR); add(G.fore, look.skin, aR);
  // o'yinchi ustida kichik yashil belgi
  const mark = new THREE.Mesh(new THREE.ConeGeometry(.16, .3, 4), new THREE.MeshBasicMaterial({ color: 0x7cff6b })); mark.rotation.x = Math.PI; mark.position.y = 2.35; g.add(mark);
  g.userData = { lL, lR, aL, aR, mark };
  return g;
}
export function animatePlayer(p, phase, moving) {
  const s = moving ? Math.sin(phase) * .7 : 0, u = p.userData;
  u.lL.rotation.x = s; u.lR.rotation.x = -s; u.aL.rotation.x = -s * .8; u.aR.rotation.x = s * .8;
  u.mark.rotation.y += .05;
}
