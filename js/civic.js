// Hokimiyat: ustunli bino, gumbaz, bayroqlar, favvorali maydon, "Hokim" taxtasi
import * as THREE from 'three';
import { box, cyl, cone, merge, part, canvasTex, signTex } from './util.js';
import { makePlayer, lookFor } from './people.js';

function flagTex() {
  return canvasTex(192, 96, (g, w, h) => {
    g.fillStyle = '#0099b5'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#ffffff'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#1eb53a'; g.fillRect(0, h * 2 / 3, w, h / 3);
    g.fillStyle = '#ce1126'; g.fillRect(0, h / 3 - 2, w, 3); g.fillRect(0, h * 2 / 3 - 1, w, 3);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(26, 16, 10, 0, 7); g.fill(); g.fillStyle = '#0099b5'; g.beginPath(); g.arc(30, 16, 9, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if (r > 0 || c > 1) { g.beginPath(); g.arc(44 + c * 8, 8 + r * 8, 2, 0, 7); g.fill(); }
  });
}

// Hokimiyat hovlisi (binoga nisbatan lokal o'lchamlar): yon chegarasi, orqa va old tomoni, darvoza kengligi
export const HALL_YARD = { hx: 36, zb: -23, zf: 54, gate: 9 };

export function buildCityHall(info, hokim) {
  const H = info.hok, g = new THREE.Group(); g.position.set(0, 0, H.cz);
  // bino old tomoni +z (shaharga qaragan)
  const W = H.w, Dp = H.d, FH = 4.2, F = 3, wallH = F * FH + .8, P = [], glass = [], gold = [];
  P.push(box(W + 4, 1.2, Dp + 4, 0, 0, 0, '#b8b0a2'));                               // poydevor
  P.push(box(W, wallH, Dp, 0, 1.2, 0, '#f1ead9'));                                   // asosiy bino
  P.push(box(W + .8, .7, Dp + .8, 0, 1.2 + wallH, 0, '#e2d8c3'), box(W + 1.2, .35, Dp + 1.2, 0, 1.9 + wallH, 0, '#d6cab2'));  // karniz
  for (let f = 1; f < F; f++) P.push(box(W + .3, .25, Dp + .3, 0, 1.2 + f * FH, 0, '#e2d8c3'));
  // derazalar (old va orqa, yon tomonlar)
  for (let f = 0; f < F; f++) {
    const y = 1.2 + f * FH + 1.1;
    for (let i = 0; i < 14; i++) {
      const x = -W / 2 + 1.6 + i * (W - 3.2) / 13; if (Math.abs(x) < 7.5) continue;
      for (const s of [1, -1]) { glass.push(box(1.3, 2.2, .1, x, y, s * (Dp / 2 + .03), '#2c4257')); P.push(box(1.6, .18, .25, x, y - .18, s * (Dp / 2 + .1), '#ffffff'), box(1.6, .3, .2, x, y + 2.25, s * (Dp / 2 + .08), '#e2d8c3')); }
    }
    for (let i = 0; i < 6; i++) { const z = -Dp / 2 + 2 + i * (Dp - 4) / 5; for (const s of [1, -1]) glass.push(box(.1, 2.2, 1.3, s * (W / 2 + .03), y, z, '#2c4257')); }
  }
  // markaziy ayvon: zinalar, 8 ustun, uchburchak peshtoq
  const pz = Dp / 2;
  for (let i = 0; i < 6; i++) P.push(box(18 - i * .2, .2, 6 - i * .5, 0, i * .2, pz + 3.2 - i * .25, '#d9d2c4'));
  P.push(box(16, .3, 5, 0, 1.2, pz + 2.5, '#d9d2c4'));
  for (let i = 0; i < 8; i++) { const x = -7 + i * 2; P.push(cyl(.42, .48, 10.6, x, 1.5, pz + 4.4, '#fbf7ee', 14), box(1.2, .4, 1.2, x, 1.5, pz + 4.4, '#e2d8c3'), box(1.2, .4, 1.2, x, 11.9, pz + 4.4, '#e2d8c3')); }
  P.push(box(16.5, 1.2, 5.6, 0, 12.3, pz + 2.6, '#efe7d6'));
  const ped = new THREE.BufferGeometry(); { const a = 8.4, hh = 3.4, z0 = pz - .1, z1 = pz + 5.4; const v = [-a, 0, z1, a, 0, z1, 0, hh, z1, a, 0, z0, -a, 0, z0, 0, hh, z0, -a, 0, z0, -a, 0, z1, 0, hh, z1, -a, 0, z0, 0, hh, z1, 0, hh, z0, a, 0, z1, a, 0, z0, 0, hh, z0, a, 0, z1, 0, hh, z0, 0, hh, z1]; ped.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); ped.computeVertexNormals(); ped.translate(0, 13.5, 0); }
  P.push(part(ped, '#efe7d6'));
  P.push(box(3.4, 5.2, .2, 0, 1.5, pz + .02, '#5a3a22'), box(4, .5, .3, 0, 6.7, pz + .05, '#e2d8c3'));   // eshik
  gold.push(box(.2, .2, .1, .9, 3.8, pz + .15, '#fff'), box(.2, .2, .1, -.9, 3.8, pz + .15, '#fff'));
  // gumbaz
  const top = 1.2 + wallH + .9;
  P.push(cyl(6.2, 6.2, 4.2, 0, top, -1, '#f1ead9', 32), cyl(6.6, 6.6, .5, 0, top + 4.2, -1, '#e2d8c3', 32));
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; glass.push(box(.9, 2.2, .1, Math.sin(a) * 6.22, top + 1, -1 + Math.cos(a) * 6.22, '#2c4257').rotateY(0)); }
  const dome = new THREE.SphereGeometry(6.2, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(0, top + 4.7, -1);
  const domeM = part(dome, '#2f8fa3');
  gold.push(cyl(.5, .7, 1.4, 0, top + 10.8, -1, '#fff', 12), cone(.35, 2.6, 0, top + 12.2, -1, '#fff', 10));
  const sp = new THREE.SphereGeometry(.45, 12, 8); sp.translate(0, top + 12.4, -1); gold.push(part(sp, '#fff'));
  // maydon: tosh plitka, favvora, gulzorlar, bayroq ustunlari
  const plazaD = 34, P2 = [];
  P2.push(box(W + 20, .08, plazaD, 0, 0, pz + 6 + plazaD / 2, '#d8cfbf'));
  P2.push(cyl(5, 5.2, .7, 0, 0, pz + 6 + plazaD / 2, '#cfc6b6', 32), cyl(4.4, 4.4, .05, 0, .66, pz + 6 + plazaD / 2, '#3fa9d6', 32), cyl(.6, .9, 2.2, 0, .6, pz + 6 + plazaD / 2, '#e8e1d3', 12), cyl(1.6, 1.6, .3, 0, 2.6, pz + 6 + plazaD / 2, '#e8e1d3', 16));
  for (const s of [-1, 1]) {
    P2.push(box(10, .5, 14, s * 17, 0, pz + 6 + plazaD / 2, '#8a7a62'), box(9.4, .1, 13.4, s * 17, .45, pz + 6 + plazaD / 2, '#4f8f3a'));
    for (let i = 0; i < 18; i++) { const ic = new THREE.IcosahedronGeometry(.32, 0); ic.translate(s * 17 + ((i % 6) - 2.5) * 1.4, .75, pz + 6 + plazaD / 2 + (Math.floor(i / 6) - 1) * 4); P2.push(part(ic, ['#e53950', '#ffd23f', '#ff8fb1', '#ffffff'][i % 4])); }
  }
  const poles = [-11, -8, 8, 11].map(x => [x, pz + 6 + plazaD - 3]);
  for (const [x, z] of poles) P2.push(cyl(.12, .16, 16, x, 0, z, '#d0d4d8', 10), box(.8, .4, .8, x, 0, z, '#9e9a92'));
  const mat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, ...o });
  const add = (geo, m, sh = true) => { const me = new THREE.Mesh(geo, m); me.castShadow = sh; me.receiveShadow = true; g.add(me); return me; };
  add(merge(P), mat()); add(merge(glass), mat({ metalness: .5, roughness: .15, emissive: 0xffc06a, emissiveIntensity: 0 })).userData.night = 1;
  add(merge(gold), new THREE.MeshStandardMaterial({ color: 0xdcb04a, metalness: 1, roughness: .25 }));
  add(domeM, mat({ metalness: .3, roughness: .35 })); add(merge(P2), mat(), false);
  const ft = flagTex();
  for (const [x, z] of poles) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(4, 2, 8, 1), new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, roughness: .8 })); fl.position.set(x + 2.05, 14.6, z); g.add(fl); fl.userData.flag = 1; }
  // yozuvlar
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshStandardMaterial({ map: signTex(['YERLIFE HOKIMIYATI'], { bg: '#163a5f', border: '#e6c25a', w: 1024, h: 160, font: 'bold 96px system-ui' }) }));
  s1.position.set(0, 12.9, pz + 5.45); g.add(s1);
  const board = new THREE.Group(), bz = pz + 6 + plazaD - 1.5;
  board.add(new THREE.Mesh(merge([box(.35, 3.2, .35, -4.6, 0, 0, '#3b3b3b'), box(.35, 3.2, .35, 4.6, 0, 0, '#3b3b3b')]), mat()));
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.75), new THREE.MeshStandardMaterial({ map: hokimTex(hokim), side: THREE.DoubleSide })); bm.position.y = 4.9; board.add(bm);
  board.position.set(-14, 0, bz); g.add(board); g.userData.board = bm;
  // ---------- hovli: temir panjara, tantanali darvoza, qo'riqchilar, chiroqlar, archalar ----------
  {
    const Y = HALL_YARD, zf = Y.zf, F = [], GD = [], LG = [], iron = '#22262b', stone = '#e6dfcf', base = '#bdb5a5';
    const run = (ax, az, bx, bz, pillars = true) => {
      const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2, y0 = pillars ? .5 : .1;
      if (pillars) {
        F.push(box(.34, .5, L, mx, 0, mz, base, ry));
        const np = Math.max(1, Math.round(L / 6));
        for (let i = 0; i <= np; i++) { const t = i / np, x = ax + (bx - ax) * t, z = az + (bz - az) * t; F.push(box(.62, 2.7, .62, x, .5, z, stone), box(.86, .18, .86, x, 3.2, z, '#cfc6b6')); const s = new THREE.IcosahedronGeometry(.22, 0); s.translate(x, 3.6, z); GD.push(part(s, '#fff')); }
      }
      for (const y of [y0 + .25, y0 + 2.15]) F.push(box(.07, .07, L, mx, y, mz, iron, ry));
      const n = Math.max(2, Math.round(L / .42));
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; F.push(box(.05, 2.3, .05, x, y0, z, iron)); GD.push(cone(.07, .24, x, y0 + 2.3, z, '#fff', 4)); }
    };
    const gp = Y.gate / 2 + .8;
    run(-Y.hx, Y.zb, Y.hx, Y.zb); run(Y.hx, Y.zb, Y.hx, zf); run(-Y.hx, Y.zb, -Y.hx, zf); run(-Y.hx, zf, -gp - .6, zf); run(gp + .6, zf, Y.hx, zf);
    for (const s of [-1, 1]) {
      // darvoza ustunlari, fonarlar, ochiq tavaqalar
      F.push(box(1.9, .6, 1.9, s * gp, 0, zf, base), box(1.5, 5.6, 1.5, s * gp, .6, zf, stone), box(1.9, .3, 1.9, s * gp, 6.2, zf, '#cfc6b6'), box(.16, .5, .16, s * gp, 6.5, zf, iron));
      F.push(box(1.56, .16, 1.56, s * gp, 2.2, zf, '#163a5f'), box(1.56, .16, 1.56, s * gp, 4.9, zf, '#163a5f'));
      LG.push(box(.62, .72, .62, s * gp, 7, zf, '#fff')); F.push(box(.8, .1, .8, s * gp, 7.72, zf, iron)); GD.push(cone(.2, .5, s * gp, 7.8, zf, '#fff', 6));
      run(s * (Y.gate / 2 + .05), zf - .4, s * (Y.gate / 2 + 1.2), zf - 4.6, false);
      // qo'riqchi budkasi
      const bx = s * (gp + 3), bz = zf + 1.9;
      F.push(box(1.8, 2.5, 1.8, bx, 0, bz, '#f4f1ea'), box(1.84, .4, 1.84, bx, 0, bz, '#1f5e3a'), box(1.84, .3, 1.84, bx, 2.2, bz, '#1f5e3a'), box(1, 1.9, .06, bx, .15, bz + .9, '#1b1f24'), box(2.3, .14, 2.3, bx, 2.5, bz, '#163a2a'));
      const rf = new THREE.ConeGeometry(1.55, .9, 4); rf.rotateY(Math.PI / 4); rf.translate(bx, 3.09, bz); F.push(part(rf, '#1f5e3a'));
      // hovli chiroqlari
      for (const lz of [pz + 8, pz + 21, pz + 34]) { F.push(box(.5, .3, .5, s * 9.6, 0, lz, base), cyl(.08, .12, 4.3, s * 9.6, .3, lz, iron, 8), box(.5, .08, .5, s * 9.6, 4.6, lz, iron)); const gl = new THREE.IcosahedronGeometry(.34, 1); gl.translate(s * 9.6, 5, lz); LG.push(part(gl, '#fff')); }
      // archalar (yon panjara bo'ylab) va skameykalar
      for (let z = Y.zb + 4; z < zf - 3; z += 7) F.push(cyl(.16, .22, .9, s * (Y.hx - 2.6), 0, z, '#5a3a22', 6), cone(1.25, 5.6, s * (Y.hx - 2.6), .8, z, '#2f6b3a', 8), cone(.9, 2.6, s * (Y.hx - 2.6), 4.4, z, '#377a43', 8));
      for (const bzz of [pz + 17, pz + 29]) F.push(box(.6, .1, 2.4, s * 24.6, .5, bzz, '#7a5230'), box(.1, .6, 2.4, s * 24.95, .6, bzz, '#7a5230'), box(.5, .5, .12, s * 24.6, 0, bzz - 1, iron), box(.5, .5, .12, s * 24.6, 0, bzz + 1, iron));
    }
    for (let x = -Y.hx + 5; x < Y.hx - 3; x += 7) F.push(cyl(.16, .22, .9, x, 0, Y.zb + 2.6, '#5a3a22', 6), cone(1.25, 5.6, x, .8, Y.zb + 2.6, '#2f6b3a', 8), cone(.9, 2.6, x, 4.4, Y.zb + 2.6, '#377a43', 8));
    // darvoza peshtoqi
    F.push(box(gp * 2 - 1.4, .9, .5, 0, 5.2, zf, '#163a5f'), box(gp * 2 - 1.4, .1, .58, 0, 5.12, zf, '#e6c25a'), box(gp * 2 - 1.4, .1, .58, 0, 6.08, zf, '#e6c25a'));
    add(merge(F), mat()); add(merge(GD), new THREE.MeshStandardMaterial({ color: 0xdcb04a, metalness: 1, roughness: .3 }), false);
    add(merge(LG), mat({ color: 0xfff2c8, emissive: 0xffd27a, emissiveIntensity: 0 }), false).userData.night = 1;
    const gt = signTex(['HOKIMIYAT'], { bg: '#163a5f', fg: '#f1d27a', border: '#163a5f', w: 1024, h: 110, font: 'bold 84px system-ui' });
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(gp * 2 - 1.8, .74), new THREE.MeshStandardMaterial({ map: gt })); m.position.set(0, 5.65, zf + s * .27); if (s < 0) m.rotation.y = Math.PI; g.add(m); }
    // qo'riqchilar: darvoza oldida va bino eshigi yonida
    const capG = merge([box(.4, .13, .38, 0, 1.9, 0, '#16291f'), box(.36, .03, .17, 0, 1.9, .25, '#0e1a14'), box(.1, .07, .02, 0, 1.93, .2, '#e6c25a'), box(.5, .07, .28, 0, .86, 0, '#0e0e0e'), box(.09, .09, .02, 0, .85, .14, '#e6c25a'), box(.12, .03, .2, -.3, 1.44, 0, '#e6c25a'), box(.12, .03, .2, .3, 1.44, 0, '#e6c25a')]);
    const capM = mat();
    for (const [x, z] of [[-3.7, zf + 1.4], [3.7, zf + 1.4], [-4.9, pz + 7.7], [4.9, pz + 7.7]]) {
      const m = makePlayer({ skin: '#dba57d', hair: '#1c1410', shirt: '#1f4d35', pants: '#16291f', girl: false, crown: false, cape: false });
      m.userData.mark.visible = false; m.add(new THREE.Mesh(capG, capM)); m.position.set(x, 0, z); g.add(m);
    }
  }
  return g;
}
export function hokimTex(hokim) {
  return signTex(['HOKIM', hokim ? '@' + hokim : '??? — videoda aniqlanadi'], { bg: '#1b1b1f', border: '#e6c25a', w: 768, h: 288, font: 'bold 110px system-ui' });
}

// Hokimiyat ichi: qabul zali — qizil gilam, hokim stoli va o'zi, bayroqlar, majlis stollari
export function buildHallInterior(hokim) {
  const W = 18, Dp = 14, H = 5, scene = new THREE.Scene(); scene.background = new THREE.Color(0x1c1a17);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b5a48, 1.25));
  for (const z of [-3, 3]) { const pl = new THREE.PointLight(0xffe2b0, 60, 26, 1.5); pl.position.set(0, H - .7, z); scene.add(pl); }
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: .8, ...o });
  const marble = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#e9e3d6' : '#cfc6b4'; g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = 'rgba(120,105,80,.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }, { repeat: [5, 4] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp).rotateX(-Math.PI / 2), std({ map: marble, roughness: .35 })); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp).rotateX(Math.PI / 2), std({ color: 0xf6f2ea })); ceil.position.y = H; scene.add(ceil);
  const wm = std({ color: 0xf1e8d4, side: THREE.BackSide }), no = std({ visible: false });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, Dp), [wm, wm, no, no, wm, wm]); walls.position.y = H / 2; scene.add(walls);
  const wood = '#4a2c16', gold = '#d4a93a', P = [];
  // panellar, plintus, karniz
  P.push(box(W, 1.1, .08, 0, 0, -Dp / 2 + .04, wood), box(.08, 1.1, Dp, -W / 2 + .04, 0, 0, wood), box(.08, 1.1, Dp, W / 2 - .04, 0, 0, wood), box(W, .12, .1, 0, 1.1, -Dp / 2 + .05, gold), box(.1, .12, Dp, -W / 2 + .05, 1.1, 0, gold), box(.1, .12, Dp, W / 2 - .05, 1.1, 0, gold));
  P.push(box(W, .2, .12, 0, H - .35, -Dp / 2 + .06, gold), box(.12, .2, Dp, -W / 2 + .06, H - .35, 0, gold), box(.12, .2, Dp, W / 2 - .06, H - .35, 0, gold));
  // ustunlar
  for (const x of [-W / 2 + .7, W / 2 - .7]) for (const z of [-Dp / 2 + .7, 0, Dp / 2 - .7]) P.push(cyl(.3, .34, H - .6, x, .3, z, '#fbf7ee', 14), box(.9, .3, .9, x, 0, z, '#e2d8c3'), box(.9, .3, .9, x, H - .3, z, '#e2d8c3'));
  // eshik (+z devor)
  P.push(box(2.6, 3.4, .1, 0, 0, Dp / 2 - .06, '#5a3a22'), box(3, .16, .14, 0, 3.4, Dp / 2 - .07, gold), box(.06, 3.4, .12, 0, 0, Dp / 2 - .12, '#3a2412'));
  // hokim stoli, kreslo
  P.push(box(4.2, .12, 1.7, 0, .86, -4.3, wood), box(4, .86, .1, 0, 0, -3.55, wood), box(.1, .86, 1.5, -1.95, 0, -4.3, wood), box(.1, .86, 1.5, 1.95, 0, -4.3, wood), box(3.6, .5, .04, 0, .2, -3.49, gold));
  P.push(box(1.1, .5, 1, 0, 0, -6.1, '#6b1d2a'), box(1.1, 1.5, .22, 0, .5, -6.55, '#6b1d2a'), box(.18, .35, 1, -.62, .5, -6.1, '#4a1420'), box(.18, .35, 1, .62, .5, -6.1, '#4a1420'));
  P.push(box(.7, .04, .5, -1.1, .98, -4.3, '#f4f1ea'), box(.5, .32, .04, 1.1, .98, -4.5, '#15181c'), box(.3, .04, .2, 1.1, .98, -4.35, '#3b3b3b'), cyl(.07, .09, .22, -.3, .98, -4.0, gold, 10));
  // majlis stollari va stullar
  for (const s of [-1, 1]) {
    P.push(box(1.7, .1, 5.6, s * 5.6, .78, .4, wood), box(1.3, .78, 5.2, s * 5.6, 0, .4, '#3a2412'));
    for (let k = 0; k < 4; k++) for (const o of [-1, 1]) { const cx = s * 5.6 + o * 1.35, cz = -1.7 + k * 1.4; P.push(box(.6, .48, .6, cx, 0, cz, '#7a5230'), box(.1, .6, .6, cx + o * .28, .48, cz, '#7a5230')); }
  }
  // bayroq ustunlari, qandil
  for (const x of [-3.3, 3.3]) P.push(cyl(.05, .05, 3.6, x, 0, -6.3, '#d0d4d8', 8), cyl(.28, .34, .16, x, 0, -6.3, gold, 12));
  P.push(cyl(.03, .03, .9, 0, H - .9, 0, gold, 6), cyl(.9, .5, .3, 0, H - 1.2, 0, gold, 16), cyl(.6, .3, .25, 0, H - 1.45, 0, '#fff3c4', 16));
  const furn = new THREE.Mesh(merge(P), std({ vertexColors: true })); furn.castShadow = furn.receiveShadow = true; scene.add(furn);
  // qizil gilam
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 9.6).rotateX(-Math.PI / 2), std({ color: 0x9c1c26 })); rug.position.set(0, .012, 1.9); scene.add(rug);
  for (const x of [-1.22, 1.22]) { const e = new THREE.Mesh(new THREE.PlaneGeometry(.12, 9.6).rotateX(-Math.PI / 2), std({ color: 0xe6c25a })); e.position.set(x, .016, 1.9); scene.add(e); }
  // bayroqlar, yozuv, hokimning o'zi
  const ft = flagTex();
  for (const x of [-3.3, 3.3]) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.7, .85), std({ map: ft, side: THREE.DoubleSide })); fl.position.set(x + (x < 0 ? .9 : -.9), 3.1, -6.3); scene.add(fl); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.4), std({ map: signTex(['YERLIFE HOKIMI', hokim ? '@' + hokim : '??? — videoda aniqlanadi'], { bg: '#163a5f', border: '#e6c25a', w: 1024, h: 384, font: 'bold 110px system-ui' }) })); sign.position.set(0, 3.45, -Dp / 2 + .07); scene.add(sign);
  for (const s of [-1, 1]) { const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.5), std({ map: signTex(s < 0 ? ['Xalq bilan', 'birga!'] : ['Shaharcha', 'obod bo\u2018lsin!'], { bg: '#fbf6ea', fg: '#3b2a1a', border: '#7a5230', w: 640, h: 288, font: 'bold 84px Georgia, serif' }) })); fr.position.set(s * (W / 2 - .09), 2.7, .4); fr.rotation.y = -s * Math.PI / 2; scene.add(fr); }
  if (hokim) { const hk = makePlayer(lookFor(hokim, 4)); hk.userData.mark.visible = false; hk.position.set(0, 0, -5.25); scene.add(hk); }
  const colliders = [[-2.2, -6.8, 2.2, -3.4], [3.9, -2.6, 7.3, 3.4], [-7.3, -2.6, -3.9, 3.4], [-3.6, -6.6, -3.0, -6.0], [3.0, -6.6, 3.6, -6.0]];
  return { scene, colliders, dim: { w: W, d: Dp, h: H }, spawn: new THREE.Vector3(0, 0, Dp / 2 - 2.4), door: new THREE.Vector3(0, 0, Dp / 2 - .2) };
}
