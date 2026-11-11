// Uy darajalari: 0 Uy, 1 Ikki qavatli, 2 Ko'p qavatli, 3 Qasr, 4 VIP minora
import * as THREE from 'three';
import { canvasTex, noiseFill, rng, box, cyl, cone, merge, roofGeo, boxUV, part, inst, compose, ZERO, strHash, hash } from './util.js';
import { SPACING } from './layout.js';

export const LEVEL_NAMES = ['Uy', 'Ikki qavatli', "Ko'p qavatli", 'Qasr', 'VIP minora'];
// w: kenglik (ko'cha bo'ylab), d: chuqurlik, ox: markaz siljishi (garaj uchun)
export const DIMS = [
  { w: 4.6, d: 4.2, h: 4.2, ox: 0 },
  { w: 8.8, d: 5.4, h: 7.6, ox: 0, doorX: -1.6 },
  { w: 7.2, d: 7.2, h: 23, ox: 0 },
  { w: 10.6, d: 10.6, h: 12, ox: 0 },
  { w: 8, d: 8, h: 40, ox: 0 },
];

const nightMats = []; // kechasi yonadigan materiallar
export function setNightBuildings(on) { for (const [m, k] of nightMats) m.emissiveIntensity = on ? k : 0; }

// ---------- teksturalar ----------
function plaster(g, w, h, base = '#f1ece2') { noiseFill(g, w, h, base, 14, 2500, 3); }
function win(g, x, y, ww, wh, lit, frame = '#ffffff') {
  if (lit === undefined) {
    g.fillStyle = frame; g.fillRect(x - 5, y - 5, ww + 10, wh + 10);
    const gr = g.createLinearGradient(x, y, x + ww, y + wh); gr.addColorStop(0, '#34485a'); gr.addColorStop(.55, '#7d97a8'); gr.addColorStop(1, '#2a3946');
    g.fillStyle = gr; g.fillRect(x, y, ww, wh);
    g.fillStyle = frame; g.fillRect(x + ww / 2 - 2, y, 4, wh); g.fillRect(x, y + wh * .42, ww, 4);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - 6, y + wh + 5, ww + 12, 5);
  } else if (lit) { g.fillStyle = '#ffd38a'; g.fillRect(x, y, ww, wh); g.fillStyle = '#000'; g.fillRect(x + ww / 2 - 2, y, 4, wh); g.fillRect(x, y + wh * .42, ww, 4); }
}
function door(g, x, y, w, h, lit) {
  if (lit !== undefined) { if (lit) { g.fillStyle = '#7a5520'; g.fillRect(x + w * .3, y + 8, w * .4, h * .25); } return; }
  g.fillStyle = '#ece6da'; g.fillRect(x - 6, y - 6, w + 12, h + 6);
  const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#5b3a22'); gr.addColorStop(1, '#7e5534'); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.strokeRect(x + 6, y + 8, w - 12, h * .38); g.strokeRect(x + 6, y + h * .5, w - 12, h * .42);
  g.fillStyle = '#e0bb6a'; g.beginPath(); g.arc(x + w - 9, y + h * .55, 3, 0, 7); g.fill();
}
function face(draw) { // [rang xarita, kechki emissiv xarita]
  return [canvasTex(256, 256, (g, w, h) => draw(g, w, h, undefined)), canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); draw(g, w, h, true); })];
}
const R0 = rng(11);
const T = {
  l0front: face((g, w, h, L) => { if (L === undefined) plaster(g, w, h); win(g, 22, 80, 58, 70, L === undefined ? undefined : R0() < .7); win(g, 176, 80, 58, 70, L === undefined ? undefined : R0() < .7); door(g, 100, 112, 56, 144, L); }),
  l0side: face((g, w, h, L) => { if (L === undefined) plaster(g, w, h); win(g, 40, 80, 60, 72, L === undefined ? undefined : R0() < .6); win(g, 156, 80, 60, 72, L === undefined ? undefined : R0() < .6); }),
  l1front: face((g, w, h, L) => { if (L === undefined) { plaster(g, w, h); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 124, w, 6); } win(g, 24, 30, 54, 62, L === undefined ? undefined : R0() < .7); door(g, 108, 18, 48, 104, L === undefined ? undefined : R0() < .8); win(g, 180, 30, 54, 62, L === undefined ? undefined : R0() < .5); win(g, 24, 160, 54, 62, L === undefined ? undefined : R0() < .7); door(g, 106, 140, 52, 116, L); win(g, 180, 160, 54, 62, L === undefined ? undefined : R0() < .7); }),
  l1side: face((g, w, h, L) => { if (L === undefined) plaster(g, w, h); for (const y of [30, 160]) for (const x of [40, 156]) win(g, x, y, 60, 64, L === undefined ? undefined : R0() < .6); }),
};
const l2tile = [canvasTex(256, 128, (g, w, h) => { plaster(g, w, h, '#f4efe6'); g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, h - 6, w, 6); for (let i = 0; i < 3; i++) win(g, 22 + i * 82, 26, 50, 62); }),
canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); })];
// ko'p qavatli uyning kechki derazalari — tasodifiy yongan
l2tile[1] = canvasTex(256, 896, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const r = rng(5); for (let f = 0; f < 7; f++) for (let i = 0; i < 3; i++) if (r() < .55) win(g, 22 + i * 82, f * 128 + 26, 50, 62, true); });
const vipTile = canvasTex(256, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0d1720'); gr.addColorStop(.5, '#2b3d4c'); gr.addColorStop(1, '#0b131a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d6a83a'; for (let x = 0; x <= w; x += 64) g.fillRect(x - 2, 0, 4, h); g.fillRect(0, h - 5, w, 5);
});
const vipLit = canvasTex(256, 768, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const r = rng(9); g.fillStyle = '#ffe2a0'; for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 64) if (r() < .5) g.fillRect(x + 4, y + 8, 56, 110); });
const stone = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8f877a'; g.fillRect(0, 0, w, h); const r = rng(4);
  for (let y = 0; y < h; y += 32) for (let x = -((y / 32) % 2) * 24; x < w; x += 48) {
    const v = 150 + r() * 50 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(x + 2, y + 2, 44, 28);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, y + 26, 44, 4);
  }
}, { repeat: [2, 2] });
const roofTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); const r = rng(3);
  for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 12; x < w; x += 24) { const v = 175 + r() * 70 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 22, 14); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + 12, 22, 3); }
});

// ---------- materiallar ----------
const mWall = (map, em, k = 1.1) => { const m = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0, roughness: .9 }); nightMats.push([m, k]); return m; };
const plain = new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: .95 });
export const MAT = {
  trim: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }),
  roof: new THREE.MeshStandardMaterial({ map: roofTex, roughness: .8 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xdcb04a, metalness: 1, roughness: .28 }),
  glassRail: new THREE.MeshStandardMaterial({ color: 0xbfe3f2, transparent: true, opacity: .45, roughness: .05, metalness: .2 }),
  stone: new THREE.MeshStandardMaterial({ map: stone, roughness: 1 }),
  slit: (() => { const m = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, emissive: 0xffb050, emissiveIntensity: 0 }); nightMats.push([m, 1.4]); return m; })(),
  l0: [mWall(T.l0side[0], T.l0side[1]), mWall(T.l0side[0], T.l0side[1]), plain, plain, mWall(T.l0front[0], T.l0front[1]), mWall(T.l0side[0], T.l0side[1])],
  l1: [mWall(T.l1side[0], T.l1side[1]), mWall(T.l1side[0], T.l1side[1]), plain, plain, mWall(T.l1front[0], T.l1front[1]), mWall(T.l1side[0], T.l1side[1])],
  l2: (() => { const m = mWall(l2tile[0], null, 1.2); m.emissiveMap = l2tile[1]; return m; })(),
  vip: (() => { const m = new THREE.MeshStandardMaterial({ map: vipTile, emissiveMap: vipLit, emissive: 0xffffff, emissiveIntensity: 0, metalness: .55, roughness: .18 }); nightMats.push([m, 1.3]); return m; })(),
};
// l2 kechki xarita butun binoga (7 qavat) cho'zilgan — uv takrorlanmasin
MAT.l2.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
  vec4 emissiveColor = texture2D( emissiveMap, vec2(fract(vEmissiveMapUv.x), vEmissiveMapUv.y / 7.0) );
  totalEmissiveRadiance *= emissiveColor.rgb;
#endif`); };

// ---------- geometriyalar (old tomon +z, asos markazi 0,0,0) ----------
function wallsBox(w, h, d, rv = 1, ru = 1) { const g = new THREE.BoxGeometry(w, h, d); boxUV(g, ru, rv); g.translate(0, h / 2, 0); return g; }

// Bezaklar: darcha, gul qutisi, buta, yo'lak, poydevor
function shutters(x, y, ww, hh, z, color) { return [box(.3, hh, .06, x - ww / 2 - .17, y, z, color), box(.3, hh, .06, x + ww / 2 + .17, y, z, color), ...[-1, 1].map(s => box(.04, hh * .9, .02, x + s * (ww / 2 + .17), y + hh * .05, z + .04, '#ffffff'))]; }
function flowerBox(x, y, ww, z) {
  const P = [box(ww + .1, .22, .3, x, y, z + .12, '#7a4b2a')];
  const C = ['#e53950', '#ff8fb1', '#ffd23f', '#ffffff', '#c05cd6'];
  for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(.11, 0); g.translate(x - ww / 2 + .1 + i * (ww - .2) / 5, y + .3, z + .14); P.push(part(g, i % 2 ? '#4f8f3a' : C[i % C.length])); }
  return P;
}
function bush(x, z, r = .5) { return [[0, 0, 1], [.35, -.1, .75], [-.3, .05, .7]].map(([dx, dz, k]) => { const g = new THREE.IcosahedronGeometry(r * k, 0); g.translate(x + dx * r, r * k * .8, z + dz * r); return part(g, k === 1 ? '#4c8a36' : '#5f9c3f'); }); }
function path(x, z0, z1) { const P = []; for (let z = z0; z < z1; z += .55) P.push(box(1.0, .05, .45, x, 0, z + .25, (z * 7 | 0) % 2 ? '#c9bfae' : '#bdb2a0')); return P; }

function level0() {
  const { w, d } = DIMS[0], h = 3;
  const roof = roofGeo(); roof.scale(w * 1.2, 1.35, d * 1.26); roof.translate(0, h, 0);
  const trim = merge([
    box(1.6, .18, .8, 0, 0, d / 2 + .4, '#bdb6aa'),                 // zina
    box(.55, 1.6, .55, w * .25, h + .3, -d * .15, '#8a6a58'),      // mo'ri
    box(1.2, .08, .2, -w * .32, 1.0, d / 2 + .1, '#ffffff'), box(1.2, .08, .2, w * .32, 1.0, d / 2 + .1, '#ffffff'), // tokchalar
    box(2.2, .12, 1.5, 0, 2.5, d / 2 + .7, '#7a3f2a'),             // ayvon tomi
    box(.14, 2.5, .14, -.95, 0, d / 2 + 1.3, '#f4efe6'), box(.14, 2.5, .14, .95, 0, d / 2 + 1.3, '#f4efe6'), // ayvon ustunlari
    box(w + .14, .38, d + .14, 0, 0, 0, '#a99f8f'),                  // poydevor
    box(.12, h, .12, -w / 2 - .02, 0, d / 2 + .02, '#e9e2d4'), box(.12, h, .12, w / 2 + .02, 0, d / 2 + .02, '#e9e2d4'),
    box(.16, .16, .06, .62, 2.1, d / 2 + .06, '#ffe08a'),            // eshik chirog'i
    ...shutters(-1.38, 1.22, 1.04, .9, d / 2 + .04, '#3f6b4f'), ...shutters(1.38, 1.22, 1.04, .9, d / 2 + .04, '#3f6b4f'),
    ...flowerBox(-1.38, .95, 1.1, d / 2), ...flowerBox(1.38, .95, 1.1, d / 2),
    ...bush(-w / 2 + .3, d / 2 + .75, .45), ...bush(w / 2 - .3, d / 2 + .75, .45),
    ...path(0, d / 2 + .8, d / 2 + 3.1),
  ]);
  return [{ geo: wallsBox(w, h, d), mat: MAT.l0, tint: 'wall' }, { geo: roof, mat: MAT.roof, tint: 'roof' }, { geo: trim, mat: MAT.trim, detail: true }];
}
function level1() {
  const w = 5.6, d = 5.4, h = 5.8, ox = -1.6; // asosiy bino chapga, garaj o'ngga
  const walls = wallsBox(w, h, d); walls.translate(ox, 0, 0);
  const roof = roofGeo(); roof.scale(w * 1.15, 1.7, d * 1.2); roof.translate(ox, h, 0);
  const gx = ox + w / 2 + 1.6, gd = 4.8;
  const parts = [
    box(3.2, 2.9, gd, gx, 0, d / 2 - gd / 2, '#e7dfd0'), box(3.5, .2, gd + .3, gx, 2.9, d / 2 - gd / 2, '#6b6f74'),   // garaj
    box(2.6, 2.2, .06, gx, 0, d / 2 + .02, '#5c6166'),
    ...[.45, .9, 1.35, 1.8].map(y => box(2.6, .05, .1, gx, y, d / 2 + .05, '#454a4f')),
    box(3, .16, 1.2, ox, 2.95, d / 2 + .6, '#d9d4cb'),                                                                 // balkon
    box(3, .06, .06, ox, 3.95, d / 2 + 1.17, '#ffffff'), box(.06, 1, .06, ox - 1.47, 3.0, d / 2 + 1.17, '#ffffff'), box(.06, 1, .06, ox + 1.47, 3.0, d / 2 + 1.17, '#ffffff'),
    ...[-1, -.5, 0, .5, 1].map(x => box(.04, .9, .04, ox + x, 3.05, d / 2 + 1.17, '#ffffff')),
    box(1.6, .18, .8, ox, 0, d / 2 + .4, '#bdb6aa'),
    box(.55, 1.8, .55, ox + w * .25, h + .4, -d * .15, '#8a6a58'),
    box(w + .14, .4, d + .14, ox, 0, 0, '#a99f8f'), box(3.3, .4, gd + .14, gx, 0, d / 2 - gd / 2, '#a99f8f'),
    ...shutters(ox - 1.68, .77, 1.18, 1.4, d / 2 + .04, '#4f5a78'), ...shutters(ox + 1.73, .77, 1.18, 1.4, d / 2 + .04, '#4f5a78'),
    ...flowerBox(ox - 1.68, .55, 1.25, d / 2), ...flowerBox(ox + 1.73, .55, 1.25, d / 2),
    ...bush(ox - w / 2 + .2, d / 2 + .8, .5), ...path(-1.51, d / 2 + .8, d / 2 + 3.1),
    box(.16, .16, .06, -.85, 2.3, d / 2 + .06, '#ffe08a'),
  ];
  return [{ geo: walls, mat: MAT.l1, tint: 'wall' }, { geo: roof, mat: MAT.roof, tint: 'roof' }, { geo: merge(parts), mat: MAT.trim, detail: true }];
}
function level2() {
  const { w, d } = DIMS[2], F = 7, fh = 3, h = F * fh;
  const walls = wallsBox(w, h, d, F, 1);
  const P = [];
  for (let f = 1; f <= F; f++) { P.push(box(w + .25, .22, d + .25, 0, f * fh - .11, 0, '#d8d2c6')); }
  // tokchalar 4 tomonda
  for (let f = 0; f < F; f++) for (let i = -1; i <= 1; i++) for (let s = 0; s < 4; s++) {
    const ry = s * Math.PI / 2, ux = i * w / 3, y = f * fh + .66;
    const g = box(1.5, .1, .28, 0, y, 0, '#ffffff'); g.translate(0, 0, d / 2 + .14); g.rotateY(ry); g.translate(Math.cos(ry) * ux, 0, -Math.sin(ry) * ux); P.push(g);
  }
  // balkonlar (2,4,6-qavat old tomonda)
  const rails = [];
  for (const f of [1, 3, 5]) for (const i of [-1, 1]) {
    const x = i * w / 3, y = f * fh;
    P.push(box(2.1, .18, 1.2, x, y, d / 2 + .6, '#cfc8bb'), box(2.1, .08, .08, x, y + 1.05, d / 2 + 1.18, '#e9e9e9'));
    rails.push(box(2.0, .9, .05, x, y + .16, d / 2 + 1.18, '#ffffff'), box(.05, .9, 1.1, x - 1.0, y + .16, d / 2 + .6, '#ffffff'), box(.05, .9, 1.1, x + 1.0, y + .16, d / 2 + .6, '#ffffff'));
  }
  // tom: parapet + suv baki
  P.push(box(w, .7, .2, 0, h, d / 2 - .1, '#d8d2c6'), box(w, .7, .2, 0, h, -d / 2 + .1, '#d8d2c6'), box(.2, .7, d, w / 2 - .1, h, 0, '#d8d2c6'), box(.2, .7, d, -w / 2 + .1, h, 0, '#d8d2c6'));
  for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) P.push(box(.12, 1.2, .12, x + 1, h, z - 1, '#5d6166'));
  P.push(cyl(1.1, 1.1, 1.8, 1, h + 1.2, -1, '#9aa3a8', 14), cone(1.15, .5, 1, h + 3, -1, '#7d868b', 14));
  // kirish
  P.push(box(2.4, 2.6, .1, 0, 0, d / 2 + .03, '#e8e2d6'), box(1.8, 2.3, .1, 0, 0, d / 2 + .07, '#4b3a2b'), box(3, .15, 1.4, 0, 2.7, d / 2 + .7, '#8a8f94'), box(2.6, .2, 1.2, 0, 0, d / 2 + .6, '#bdb6aa'));
  return [{ geo: walls, mat: MAT.l2, tint: 'wall' }, { geo: merge(P), mat: MAT.trim, detail: true }, { geo: merge(rails), mat: MAT.glassRail, shadow: false, detail: true }];
}
function level3() {
  const S = 8, H = 6, P = [], roofs = [], trim = [], slits = [];
  const sb = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); return g.toNonIndexed(); };
  P.push(sb(S, H, S, 0, 0, 0));
  // devor tishlari
  for (let i = 0; i < 8; i++) { const t = -S / 2 + .5 + i * (S - 1) / 7; P.push(sb(.6, .7, .6, t, H, S / 2 - .3), sb(.6, .7, .6, t, H, -S / 2 + .3), sb(.6, .7, .6, S / 2 - .3, H, t), sb(.6, .7, .6, -S / 2 + .3, H, t)); }
  // 4 minora
  const TH = 9;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const tx = x * S / 2, tz = z * S / 2;
    const c = new THREE.CylinderGeometry(1.45, 1.6, TH, 14); c.translate(tx, TH / 2, tz); P.push(c.toNonIndexed());
    const r = new THREE.ConeGeometry(1.95, 3.6, 14); r.translate(tx, TH + 1.8, tz); roofs.push(r.toNonIndexed());
    trim.push(box(1.75, .25, 1.75, tx, TH - .1, tz, '#6f685d'));
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const g = box(.22, .9, .1, 0, 6, 0, '#000'); g.translate(0, 0, 1.52); g.rotateY(ry); g.translate(tx, 0, tz); slits.push(g); }
  }
  // darvoza
  trim.push(box(2.6, 3.4, .25, 0, 0, S / 2 + .05, '#5a3a1f'), box(2.9, .3, .3, 0, 3.4, S / 2 + .06, '#3b3b3b'));
  for (const x of [-.7, 0, .7]) trim.push(box(.08, 3.3, .3, x, 0, S / 2 + .08, '#2f2a24'));
  trim.push(box(.12, .12, .32, .9, 1.6, S / 2 + .12, '#c9a34a'));
  // bayroq (old o'ng minorada)
  trim.push(cyl(.05, .05, 3, S / 2, TH + 3.4, S / 2, '#3d3d3d', 6), box(1.6, 1, .05, S / 2 + .82, TH + 5.3, S / 2, '#c8202a'), box(.5, .3, .06, S / 2 + .6, TH + 5.6, S / 2, '#f2d34a'));
  for (const x of [-2.5, 2.5]) for (const y of [2.2, 4.2]) slits.push(box(.35, 1, .1, x, y, S / 2 + .02, '#000'));
  const stoneG = merge(P.map(g => part(g)));
  return [{ geo: stoneG, mat: MAT.stone, tint: 'stone' }, { geo: merge(roofs.map(g => part(g))), mat: new THREE.MeshStandardMaterial({ roughness: .7, vertexColors: true }), tint: 'roof' }, { geo: merge(trim), mat: MAT.trim, detail: true }, { geo: merge(slits), mat: MAT.slit, shadow: false, detail: true }];
}
function level4() {
  const tiers = [[8, 12], [6.6, 10], [5.2, 8], [3.8, 6]];
  const glass = [], gold = []; let y = 0;
  for (const [s, h] of tiers) {
    const g = new THREE.BoxGeometry(s, h, s); boxUV(g, 1, h / 3.4); g.translate(0, y + h / 2, 0); glass.push(g.toNonIndexed());
    const e = .18;
    gold.push(box(s + .3, .3, s + .3, 0, y + h - .15, 0, '#fff'));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) gold.push(box(e, h, e, x * s / 2, y, z * s / 2, '#fff'));
    y += h;
  }
  gold.push(cone(.7, 7, 0, y, 0, '#fff', 12), cyl(.9, .9, .4, 0, y - .1, 0, '#fff', 12));
  const sp = new THREE.SphereGeometry(.35, 10, 8); sp.translate(0, y + 7.1, 0); gold.push(part(sp));
  // kirish soyaboni oltin ustunlar bilan
  gold.push(box(5, .3, 3.2, 0, 3.4, 4 + 1.6, '#fff'), cyl(.2, .22, 3.4, -2.2, 0, 4 + 3, '#fff'), cyl(.2, .22, 3.4, 2.2, 0, 4 + 3, '#fff'), box(2.4, 3, .15, 0, 0, 4.03, '#fff'));
  const doorG = merge([box(2, 2.7, .1, 0, 0, 4.08, '#0a0a0a'), box(5.6, .12, 4, 0, 0, 5.6, '#2a2a2a')]);
  return [{ geo: merge(glass.map(g => part(g))), mat: MAT.vip }, { geo: merge(gold), mat: MAT.gold }, { geo: doorG, mat: MAT.trim, detail: true }];
}
// Binoning eng baland nuqtasi ("teskari uy" istagi uchun) va aylantirish matritsasi
export const TOPH = [4.9, 8, 24.8, 14.6, 47.6];
const FLIPM = new THREE.Matrix4().makeRotationZ(Math.PI);
export const LEVEL_GEO = [level0(), level1(), level2(), level3(), level4()];

// Hovli devori va darvoza (faqat yaqindagi uylar uchun)
export function yardGeo() {
  const L = SPACING - .8, gap = 1.9, seg = (L - gap) / 2;
  const wall = merge([box(seg, 1.35, .25, -(gap / 2 + seg / 2), 0, 0, '#ffffff'), box(seg, 1.35, .25, gap / 2 + seg / 2, 0, 0, '#ffffff'), box(seg + .1, .12, .35, -(gap / 2 + seg / 2), 1.35, 0, '#d9d2c4'), box(seg + .1, .12, .35, gap / 2 + seg / 2, 1.35, 0, '#d9d2c4'), box(.4, 1.8, .4, -gap / 2 - .2, 0, 0, '#cfc6b6'), box(.4, 1.8, .4, gap / 2 + .2, 0, 0, '#cfc6b6')]);
  const gate = merge([box(gap * .48, 1.6, .06, -gap / 4 - .02, 0, .05, '#ffffff', -.6), box(gap * .48, 1.6, .06, gap / 4 + .02, 0, .05, '#ffffff', .6)]);
  return { wall, gate };
}

export const WALLC = ['#f3e9d6', '#efe2c4', '#e8d3b5', '#f5f1ea', '#e9cfae', '#dfe3da', '#f0dcc8', '#e6d9c3', '#d9c2a3', '#f2e6c9', '#e3eef0', '#f0e1e6'];
export const ROOFC = ['#a2482e', '#8f3d26', '#b55a37', '#6d4637', '#5a5f66', '#7b3a2b', '#3f6b4f', '#4f5a78'];
export const GATEC = ['#3f6b4f', '#4f5a78', '#7b3a2b', '#2f5f6e', '#6b5a3a', '#55606a'];

// Istakdagi rang nomi → chiroyli tus
export const WISHC = { pushti: '#f3a9c4', binafsha: '#a98bd8', oltin: '#e6c45c', qizil: '#d35a4c', "ko'k": '#7fa9df', yashil: '#8cc47f', sariq: '#f5d562', qora: '#4a4a52', oq: '#fbfbf7' };
const _w = new THREE.Color('#ffffff');
function tintFor(r, L, t, h, col) {
  const wc = r.c && WISHC[r.c.w];
  if (t === 'wall') return col.set(wc || WALLC[h % WALLC.length]);
  if (t === 'roof') { if (wc && (r.c.w === 'qora' || r.c.w === 'oltin')) return col.set(r.c.w === 'qora' ? '#2b2b30' : '#c9a23a'); return col.set(L === 3 ? ['#2f4f8a', '#9b2b2b', '#2f6b4f'][h % 3] : ROOFC[(h >>> 4) % ROOFC.length]); }
  if (t === 'stone') return wc ? col.set(wc).lerp(_w, r.c.w === 'qora' ? 0 : .3) : col.setRGB(1, 1, 1);
  return col.setRGB(1, 1, 1);
}

// Bino joylashuvi (rezident uchun): markaz, burilish
export function placement(sl, L) {
  const dm = DIMS[L];
  const cx = sl.x - sl.fx * dm.d / 2, cz = sl.z - sl.fz * dm.d / 2;
  return { cx, cz, rot: sl.rot, dm };
}

// Barcha binolar boshqaruvchisi
export class Buildings {
  constructor(scene) { this.scene = scene; this.meshes = []; this.lv = [[], [], [], [], []]; this.inst = []; }
  build(residents, slotOf) {
    for (const ms of this.meshes) for (const m of ms) { this.scene.remove(m); m.dispose(); }
    this.meshes = []; this.lv = [[], [], [], [], []]; this.inst = []; this.det = [];
    residents.forEach((r, i) => { if (r && r.n && !r.d) { const L = Math.min(4, Math.max(0, r.l | 0)); this.inst[i] = { L, j: this.lv[L].length }; this.lv[L].push(i); } });
    const col = new THREE.Color();
    for (let L = 0; L < 5; L++) {
      const ids = this.lv[L], layers = LEVEL_GEO[L], ms = [];
      for (const ly of layers) {
        const m = inst(ly.geo, ly.mat, ids.length + 8, { shadow: ly.shadow !== false }); m.userData = { L, tint: ly.tint, detail: !!ly.detail }; ms.push(m); this.scene.add(m);
      }
      // har bir uyning matritsasi va joyi saqlanadi — bezak qatlamlari shundan yaqinlik bo'yicha to'ldiriladi
      const MA = new Float32Array(ids.length * 16), PX = new Float32Array(ids.length), PZ = new Float32Array(ids.length);
      this.det[L] = { MA, PX, PZ, ms: ms.filter(m => m.userData.detail) };
      ids.forEach((ri, j) => {
        const p = placement(slotOf(ri), L), h = strHash(residents[ri].n);
        const flip = residents[ri].c && residents[ri].c.flip;
        const M = compose(p.cx, flip ? TOPH[L] : 0, p.cz, p.rot); if (flip) M.multiply(FLIPM);
        M.toArray(MA, j * 16); PX[j] = p.cx; PZ[j] = p.cz;
        for (const m of ms) {
          if (m.userData.detail) continue;
          m.setMatrixAt(j, M);
          const t = m.userData.tint;
          if (t) m.setColorAt(j, tintFor(residents[ri], L, t, h, col));
        }
      });
      for (const m of ms) { m.count = m.userData.detail ? 0 : ids.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      this.meshes.push(ms);
    }
    this.lodKey = '';
  }
  // Tezlik uchun: mayda bezaklar (gullar, panjara, buta, tokcha...) faqat (fx,fz) atrofidagi R masofadagi uylarda chiziladi
  updateLOD(fx, fz, R) {
    const key = Math.round(fx / 6) + ',' + Math.round(fz / 6) + ',' + R; if (key === this.lodKey) return; this.lodKey = key;
    const R2 = R * R;
    for (const d of this.det) {
      if (!d || !d.ms.length) continue; let n = 0; const A = d.ms[0].instanceMatrix.array;
      if (R > 0) for (let j = 0; j < d.PX.length; j++) { const dx = d.PX[j] - fx, dz = d.PZ[j] - fz; if (dx * dx + dz * dz < R2) { A.set(d.MA.subarray(j * 16, j * 16 + 16), n * 16); n++; } }
      for (const m of d.ms) { if (m !== d.ms[0]) m.instanceMatrix.array.set(A.subarray(0, n * 16)); m.count = n; m.instanceMatrix.needsUpdate = true; }
    }
  }
  // Belgilash (sariq) yoki asl rangga qaytarish
  highlight(ri, on, residents) {
    const it = this.inst[ri]; if (!it) return; const ms = this.meshes[it.L]; const h = strHash(residents[ri].n); const col = new THREE.Color();
    for (const m of ms) {
      if (!m.instanceColor || m.userData.detail) continue; const t = m.userData.tint;
      if (on) col.set('#ffd23a'); else tintFor(residents[ri], it.L, t, h, col);
      m.setColorAt(it.j, col); m.instanceColor.needsUpdate = true;
    }
  }
  pickMeshes() { return this.meshes.map(ms => ms[0]); }
  residentFromHit(mesh, id) { return this.lv[mesh.userData.L][id]; }
}

// Yaqin uylar uchun hovli devorlari pul'i
export class YardPool {
  constructor(scene, cap = 420) {
    const { wall, gate } = yardGeo();
    this.wall = inst(wall, MAT.trim, cap); this.gate = inst(gate, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .4, roughness: .5 }), cap);
    scene.add(this.wall, this.gate); this.cap = cap;
  }
  set(list, residents, slotOf) { // list: rezident indekslari
    const col = new THREE.Color(); let n = 0;
    for (const ri of list) {
      const r = residents[ri]; if (!r || (r.l | 0) > 1 || n >= this.cap) continue;
      const s = slotOf(ri), x = s.x + s.fx * 2.5, z = s.z + s.fz * 2.5, h = strHash(r.n);
      this.wall.setMatrixAt(n, compose(x, 0, z, s.rot)); this.gate.setMatrixAt(n, compose(x, 0, z, s.rot));
      this.wall.setColorAt(n, col.set(WALLC[(h >>> 3) % WALLC.length])); this.gate.setColorAt(n, col.set(GATEC[(h >>> 6) % GATEC.length]));
      n++;
    }
    for (const m of [this.wall, this.gate]) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
}
