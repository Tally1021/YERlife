// Shahar infratuzilmasi: ko'chalar, yo'lkalar, chiroqlar, mahalla belgilari, stadion, mashinalar
import * as THREE from 'three';
import { canvasTex, noiseFill, stripGeo, circlePts, merge, box, cyl, cone, part, inst, compose, rng, signTex, ZERO } from './util.js';
import { ringR, avAngle, AVN, ROAD, AVW, SIDE, SPACING, MAHALLA, slot } from './layout.js';
import { plazaTex } from './nature.js';

const nightMats = [];
export function setNightCity(on) { for (const [m, k] of nightMats) { if ('emissiveIntensity' in m) m.emissiveIntensity = on ? k : (m.userData.day || 0); } }

const asphalt = canvasTex(256, 256, (g, w, h) => {
  noiseFill(g, w, h, '#4a4d52', 22, 5000, 2);
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 6, w, 5); g.fillRect(0, h - 11, w, 5);  // chet chiziqlari
  g.fillStyle = '#f4f4f4'; g.fillRect(0, h / 2 - 3, w * .5, 6);                  // o'rtadagi punktir
}, { });
const concrete = canvasTex(256, 64, (g, w, h) => { noiseFill(g, w, h, '#b9b4aa', 14, 800, 5); g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h); g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, 5); });

export function buildRoads(scene, info) {
  const grp = new THREE.Group(), rings = [], avs = [], sides = [];
  const { K, cityR, garden, st } = info;
  for (let k = 0; k <= K; k++) {
    const r = ringR(k), seg = Math.max(96, Math.round(r * 2 * Math.PI / 3));
    rings.push(stripGeo(circlePts(r, seg), ROAD, .08, 8, true));
    sides.push(stripGeo(circlePts(r - ROAD / 2 - SIDE / 2, seg), SIDE, .1, 4, true), stripGeo(circlePts(r + ROAD / 2 + SIDE / 2, seg), SIDE, .1, 4, true));
  }
  for (let j = 0; j < AVN; j++) {
    const a = avAngle(j), c = Math.cos(a), s = Math.sin(a);
    let r1 = cityR; if (j === 0) r1 = garden.x0 + 2; if (j === AVN / 2) r1 = -st.cx - st.ax - 4; if (j === AVN / 4 && info.com) r1 = info.com.z0 + 2; if (j === AVN * 3 / 4 && info.hok) r1 = -info.hok.front + 1;
    const r0 = ringR(0), n = Math.ceil((r1 - r0) / 6), pts = [];
    for (let i = 0; i <= n; i++) { const r = r0 + (r1 - r0) * i / n; pts.push([c * r, s * r]); }
    avs.push(stripGeo(pts, AVW, .09, 8));
    for (const o of [-1, 1]) sides.push(stripGeo(pts.map(([x, z]) => [x - s * o * (AVW / 2 + SIDE / 2), z + c * o * (AVW / 2 + SIDE / 2)]), SIDE, .1, 4));
  }
  const mA = new THREE.MeshStandardMaterial({ map: asphalt, roughness: .95, polygonOffset: true, polygonOffsetFactor: -2 });
  const mS = new THREE.MeshStandardMaterial({ map: concrete, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const add = (geos, m) => { const me = new THREE.Mesh(merge(geos), m); me.receiveShadow = true; grp.add(me); };
  add(sides, mS); add(rings, mA); add(avs, mA.clone()); grp.children[2].material.polygonOffsetFactor = -3;
  // markaziy maydon
  const pl = new THREE.Mesh(new THREE.CircleGeometry(ringR(0) - ROAD / 2 - SIDE, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: plazaTex(), roughness: 1 }));
  pl.position.y = .06; pl.receiveShadow = true; grp.add(pl);
  scene.add(grp); return grp;
}

// ---------- chiroq ustunlari ----------
export function buildLamps(scene, info) {
  const pts = [], { K } = info, off = ROAD / 2 + SIDE - .35;
  const nearAv = (a, r) => { for (let j = 0; j < AVN; j++) { let d = Math.abs(((a - avAngle(j)) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); if (d * r < AVW / 2 + SIDE + 2) return true; } return false; };
  for (let k = 0; k <= K; k++) {
    const r = ringR(k), n = Math.floor(2 * Math.PI * r / 15);
    for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, side = i % 2 ? 1 : -1, rr = r + side * off; if (nearAv(a, rr)) continue; pts.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, rot: Math.atan2(-Math.cos(a) * side, -Math.sin(a) * side) }); }
  }
  for (let j = 0; j < AVN; j++) {
    const a = avAngle(j), c = Math.cos(a), s = Math.sin(a);
    for (let r = ringR(0) + 9; r < info.cityR - 6; r += 15) for (const o of [-1, 1]) {
      const x = c * r - s * o * (AVW / 2 + SIDE - .35), z = s * r + c * o * (AVW / 2 + SIDE - .35);
      if (Math.abs(((r - ringR(0)) % 38) - 0) < 6 || Math.abs(((r - ringR(0)) % 38) - 38) < 6) continue;
      pts.push({ x, z, rot: Math.atan2(s * o, -c * o) });
    }
  }
  const pole = merge([cyl(.08, .12, 5.2, 0, 0, 0, '#2f3438', 6), box(.08, .08, 1.2, 0, 5.1, .55, '#2f3438'), box(.3, .3, .3, 0, 0, 0, '#2f3438')]);
  const head = merge([box(.45, .18, .32, 0, 4.95, 1.1, '#ffffff')]);
  const mp = inst(pole, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .5 }), pts.length, { receive: false });
  const hm = new THREE.MeshStandardMaterial({ color: 0xf6f1e3, emissive: 0xffd28a, emissiveIntensity: 0 }); nightMats.push([hm, 3]);
  const mh = inst(head, hm, pts.length, { shadow: false });
  const glow = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { const M = compose(p.x, 0, p.z, p.rot); mp.setMatrixAt(i, M); mh.setMatrixAt(i, M); glow.set([p.x + Math.sin(p.rot) * 1.1, 4.8, p.z + Math.cos(p.rot) * 1.1], i * 3); });
  mp.count = mh.count = pts.length;
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(glow, 3));
  const sprite = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,220,150,1)'); r.addColorStop(.25, 'rgba(255,200,120,.55)'); r.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const glowPts = new THREE.Points(gg, new THREE.PointsMaterial({ map: sprite, size: 9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
  glowPts.visible = false;
  const grp = new THREE.Group(); grp.add(mp, mh, glowPts); grp.userData.glow = glowPts; scene.add(grp); return grp;
}

// ---------- mahalla ko'rsatkichlari ----------
export function buildMahallaSigns(scene, nRes) {
  const grp = new THREE.Group(), poleG = merge([cyl(.07, .07, 3.2, 0, 0, 0, '#3a3f44', 6)]), poleM = new THREE.MeshStandardMaterial({ vertexColors: true });
  for (let m = 0; m * MAHALLA < nRes; m++) {
    const s = slot(m * MAHALLA), tx = -s.fz, tz = s.fx; // ko'cha bo'ylab yo'nalish
    const x = s.x + s.fx * 3.6 + tx * (SPACING / 2), z = s.z + s.fz * 3.6 + tz * (SPACING / 2);
    const p = new THREE.Mesh(poleG, poleM); p.position.set(x, 0, z); p.castShadow = true;
    const tex = signTex([`${m + 1}-MAHALLA`, `${m * MAHALLA + 1}–${(m + 1) * MAHALLA}-uylar`], { w: 512, h: 160, bg: '#1d4f86', border: '#ffffff', font: 'bold 64px system-ui' });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .8), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
    b.position.set(x, 3.0, z); b.rotation.y = Math.atan2(tx, tz) + Math.PI / 2; b.castShadow = true;
    grp.add(p, b);
  }
  scene.add(grp); return grp;
}

// ---------- stadion ----------
export function buildStadium(scene, info) {
  const st = info.st, grp = new THREE.Group(); grp.position.set(st.cx, 0, st.cz);
  const ROWS = 11, STEP = 1.25, SEG = 96, P = [], C = [];
  const ell = (t, a) => [Math.cos(a) * (st.iax + (st.ax - st.iax) * t), Math.sin(a) * (st.ibz + (st.bz - st.ibz) * t)];
  const quad = (a, b, c, d, col) => { P.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) C.push(col.r, col.g, col.b); };
  const seatCols = ['#c62828', '#1565c0', '#f9a825', '#2e7d32'].map(c => new THREE.Color(c)), conc = new THREE.Color('#b8b2a6'), wallC = new THREE.Color('#d9d4ca');
  const t0 = .06;
  for (let i = 0; i < SEG; i++) {
    const a0 = i / SEG * Math.PI * 2, a1 = (i + 1) / SEG * Math.PI * 2;
    for (let r = 0; r < ROWS; r++) {
      const ta = t0 + (1 - t0) * r / ROWS, tb = t0 + (1 - t0) * (r + 1) / ROWS, y0 = 1.2 + r * STEP, y1 = y0 + STEP;
      const [x0, z0] = ell(ta, a0), [x1, z1] = ell(ta, a1), [x2, z2] = ell(tb, a1), [x3, z3] = ell(tb, a0);
      quad([x0, y0, z0], [x3, y0, z3], [x2, y0, z2], [x1, y0, z1], conc);                 // o'tirgich tekisligi
      quad([x3, y0, z3], [x3, y1, z3], [x2, y1, z2], [x2, y0, z2], seatCols[(r + (i / 12 | 0)) % 4]); // ko'tarilish (rangli)
    }
    const top = 1.2 + ROWS * STEP;
    const [ox0, oz0] = ell(1, a0), [ox1, oz1] = ell(1, a1), [ix0, iz0] = ell(t0, a0), [ix1, iz1] = ell(t0, a1);
    quad([ox0, 0, oz0], [ox1, 0, oz1], [ox1, top + 1.2, oz1], [ox0, top + 1.2, oz0], wallC);   // tashqi devor
    quad([ix1, 0, iz1], [ix0, 0, iz0], [ix0, 1.2, iz0], [ix1, 1.2, iz1], wallC);              // ichki devor
    quad([ox0, top, oz0], [ox0, top + 1.2, oz0], [ox1, top + 1.2, oz1], [ox1, top, oz1], wallC);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
  const stands = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide })); stands.castShadow = stands.receiveShadow = true; grp.add(stands);
  // maydon
  const pitchTex = canvasTex(512, 768, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#3f8f3a' : '#4a9c42'; g.fillRect(0, i * h / 12, w, h / 12); }
    g.strokeStyle = '#f4f4f4'; g.lineWidth = 6; g.strokeRect(30, 30, w - 60, h - 60); g.beginPath(); g.moveTo(30, h / 2); g.lineTo(w - 30, h / 2); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 70, 0, 7); g.stroke(); g.strokeRect(w / 2 - 130, 30, 260, 110); g.strokeRect(w / 2 - 130, h - 140, 260, 110); g.strokeRect(w / 2 - 60, 30, 120, 40); g.strokeRect(w / 2 - 60, h - 70, 120, 40);
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(w / 2, h / 2, 6, 0, 7); g.fill();
  });
  const track = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xa5482f, roughness: 1 }));
  track.scale.set(st.iax + 1, 1, st.ibz + 1); track.position.y = .05; track.receiveShadow = true; grp.add(track);
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(34, 52).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 1 }));
  pitch.position.y = .08; pitch.receiveShadow = true; grp.add(pitch);
  // darvozalar
  const goal = merge([box(.12, 2.2, .12, -3.6, 0, 0, '#fff'), box(.12, 2.2, .12, 3.6, 0, 0, '#fff'), box(7.3, .12, .12, 0, 2.2, 0, '#fff')]);
  for (const z of [-26, 26]) { const m = new THREE.Mesh(goal, new THREE.MeshStandardMaterial({ vertexColors: true })); m.position.set(0, 0, z * .97); grp.add(m); }
  // muxlislar
  const bodyG = merge([box(.42, .55, .3, 0, 0, 0, '#fff')]), headG = merge([box(.26, .28, .26, 0, .57, 0, '#fff')]);
  const r = rng(41), fans = [];
  for (let row = 0; row < ROWS; row++) {
    const t = t0 + (1 - t0) * (row + .45) / ROWS, y = 1.2 + row * STEP, n = Math.round((st.iax + (st.ax - st.iax) * t) * 2 * Math.PI * 1.1 / .75);
    for (let i = 0; i < n; i++) { if (r() < .32) continue; const a = (i + r() * .3) / n * Math.PI * 2, [x, z] = ell(t, a); fans.push([x, y, z, Math.atan2(-x, -z)]); }
  }
  const SH = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#ffffff', '#8e24aa', '#fb8c00', '#00acc1', '#212121'], SK = ['#f1c9a5', '#d9a77f', '#b07a52', '#8d5a3b', '#f6dcc4'];
  const bm = inst(bodyG, new THREE.MeshStandardMaterial({ vertexColors: true }), fans.length, { shadow: false }), hm = inst(headG, new THREE.MeshStandardMaterial({ vertexColors: true }), fans.length, { shadow: false });
  const col = new THREE.Color();
  fans.forEach(([x, y, z, ry], i) => { const M = compose(x, y, z, ry); bm.setMatrixAt(i, M); hm.setMatrixAt(i, M); bm.setColorAt(i, col.set(SH[i * 7 % SH.length])); hm.setColorAt(i, col.set(SK[i * 3 % SK.length])); });
  bm.count = hm.count = fans.length; grp.add(bm, hm); grp.userData.fans = { bm, hm, fans };
  // projektor minoralari
  const lm = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d6, emissiveIntensity: .2 }); lm.userData.day = .2; nightMats.push([lm, 2.5]);
  for (const a of [.75, 2.39, 3.9, 5.53]) {
    const [x, z] = ell(1.12, a), tw = new THREE.Group(); tw.position.set(x, 0, z); tw.rotation.y = Math.atan2(-x, -z);
    const pole = new THREE.Mesh(merge([cyl(.35, .6, 30, 0, 0, 0, '#9aa0a6', 8), box(1, 1, 1, 0, 0, 0, '#9aa0a6')]), new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .6, roughness: .4 })); pole.castShadow = true;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(6, 3.2, .5), new THREE.MeshStandardMaterial({ color: 0x55595e })); panel.position.set(0, 31, 0); panel.rotation.x = .35;
    const lights = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.6), lm); lights.position.set(0, 31.1, .28); lights.rotation.x = .35;
    tw.add(pole, panel, lights); grp.add(tw);
  }
  // YERLIFE ARENA yozuvi (shahar tomonda, +x)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 5), new THREE.MeshStandardMaterial({ map: signTex(['YERLIFE ARENA'], { w: 1024, h: 196, bg: '#0f2a4a', border: '#f1c84b', font: 'bold 120px system-ui' }), emissive: 0xffffff, emissiveIntensity: 0, side: THREE.DoubleSide }));
  sign.material.emissiveMap = sign.material.map; nightMats.push([sign.material, .8]);
  sign.position.set(st.ax + .4, 1.2 + ROWS * STEP + 3.6, 0); sign.rotation.y = Math.PI / 2; grp.add(sign);
  const sp = merge([box(.4, 4, .4, st.ax + .2, 1.2 + ROWS * STEP, -9, '#555'), box(.4, 4, .4, st.ax + .2, 1.2 + ROWS * STEP, 9, '#555')]); grp.add(new THREE.Mesh(sp, new THREE.MeshStandardMaterial({ vertexColors: true })));
  scene.add(grp); return grp;
}

// ---------- mashinalar ----------
export class Cars {
  constructor(scene, info, n = 18) {
    const body = merge([box(1.8, .62, 4.1, 0, .32, 0, '#fff'), box(1.62, .58, 2.2, 0, .94, -.2, '#fff')]);
    const glass = merge([box(1.66, .46, 2.0, 0, 1.0, -.2, '#1d2a35'), box(1.5, .4, .06, 0, .98, .92, '#1d2a35')]);
    const wheels = merge([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => { const g = new THREE.CylinderGeometry(.34, .34, .26, 12); g.rotateZ(Math.PI / 2); g.translate(x * .86, .34, z * 1.3); return part(g, '#1b1b1b'); }));
    const lights = merge([box(.35, .16, .05, -.6, .5, 2.06, '#fffbe6'), box(.35, .16, .05, .6, .5, 2.06, '#fffbe6'), box(.35, .14, .05, -.6, .52, -2.06, '#ff2a2a'), box(.35, .14, .05, .6, .52, -2.06, '#ff2a2a')]);
    this.mB = inst(body, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .45, roughness: .35 }), n);
    this.mG = inst(glass, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .6, roughness: .1 }), n, { shadow: false });
    this.mW = inst(wheels, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), n);
    this.mL = inst(lights, new THREE.MeshBasicMaterial({ vertexColors: true }), n, { shadow: false });
    const r = rng(17), CC = ['#d32f2f', '#1976d2', '#fbc02d', '#388e3c', '#f5f5f5', '#212121', '#7b1fa2', '#f57c00', '#00897b', '#c0ca33', '#5d4037', '#90a4ae'];
    this.c = []; const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const k = Math.min(info.K, Math.floor(r() * (info.K + 1))), dir = r() < .5 ? 1 : -1;
      this.c.push({ k, dir, a: r() * Math.PI * 2, v: 7 + r() * 5 }); this.mB.setColorAt(i, col.set(CC[i % CC.length]));
    }
    for (const m of [this.mB, this.mG, this.mW, this.mL]) { m.count = n; scene.add(m); }
    this.list = [this.mB, this.mG, this.mW, this.mL];
  }
  update(dt) {
    this.pos = [];
    this.c.forEach((c, i) => {
      const r = ringR(c.k) - c.dir * 1.75; c.a += c.dir * c.v / r * dt;
      const x = Math.cos(c.a) * r, z = Math.sin(c.a) * r, tx = -Math.sin(c.a) * c.dir, tz = Math.cos(c.a) * c.dir;
      const M = compose(x, .02, z, Math.atan2(tx, tz)); for (const m of this.list) m.setMatrixAt(i, M); this.pos.push([x, z]);
    });
    for (const m of this.list) m.instanceMatrix.needsUpdate = true;
  }
  dispose(scene) { for (const m of this.list) { scene.remove(m); m.dispose(); } }
}
