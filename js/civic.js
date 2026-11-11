// Hokimiyat: ustunli bino, gumbaz, bayroqlar, favvorali maydon, "Hokim" taxtasi
import * as THREE from 'three';
import { box, cyl, cone, merge, part, canvasTex, signTex } from './util.js';

function flagTex() {
  return canvasTex(192, 96, (g, w, h) => {
    g.fillStyle = '#0099b5'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#ffffff'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#1eb53a'; g.fillRect(0, h * 2 / 3, w, h / 3);
    g.fillStyle = '#ce1126'; g.fillRect(0, h / 3 - 2, w, 3); g.fillRect(0, h * 2 / 3 - 1, w, 3);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(26, 16, 10, 0, 7); g.fill(); g.fillStyle = '#0099b5'; g.beginPath(); g.arc(30, 16, 9, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if (r > 0 || c > 1) { g.beginPath(); g.arc(44 + c * 8, 8 + r * 8, 2, 0, 7); g.fill(); }
  });
}

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
  const poles = [-6, 0, 6].map(x => [x, pz + 6 + plazaD - 3]);
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
  return g;
}
export function hokimTex(hokim) {
  return signTex(['HOKIM', hokim ? '@' + hokim : '??? — videoda aniqlanadi'], { bg: '#1b1b1f', border: '#e6c25a', w: 768, h: 288, font: 'bold 110px system-ui' });
}
