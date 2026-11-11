// Uy ichi: alohida xona sahnasi
import * as THREE from 'three';
import { canvasTex, noiseFill, box, cyl, merge, part, signTex, roundRect, rng } from './util.js';

export const ROOM = { w: 10, d: 8, h: 3.2 };

const woodFloor = canvasTex(256, 256, (g, w, h) => {
  const r = rng(8);
  for (let y = 0; y < h; y += 32) for (let x = -(y / 32 % 2) * 64; x < w; x += 128) {
    const v = 120 + r() * 40 | 0; g.fillStyle = `rgb(${v + 40},${v},${v - 45})`; g.fillRect(x, y, 128, 32);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y, 2, 32); g.fillRect(x, y + 30, 128, 2);
    g.strokeStyle = 'rgba(60,30,10,.18)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x, y + 6 + i * 9 + r() * 3); g.bezierCurveTo(x + 40, y + 4 + i * 9, x + 80, y + 12 + i * 9, x + 128, y + 6 + i * 9); g.stroke(); }
  }
}, { repeat: [4, 3] });
const wallTex = (vip) => canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, vip ? '#f3e7cf' : '#e9e1d2', 10, 1500, 6); if (vip) { g.strokeStyle = 'rgba(201,160,70,.35)'; g.lineWidth = 3; for (let x = 16; x < w; x += 64) g.strokeRect(x, 40, 40, 170); } }, { repeat: [3, 1] });
const rugTex = canvasTex(256, 192, (g, w, h) => {
  g.fillStyle = '#8e1f2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8c27a'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48);
  g.fillStyle = '#1f3b6b'; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w - 60, h / 2); g.lineTo(w / 2, h - 40); g.lineTo(60, h / 2); g.closePath(); g.fill();
  g.fillStyle = '#e8c27a'; g.beginPath(); g.arc(w / 2, h / 2, 16, 0, 7); g.fill();
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8c27a' : '#2f6b4f'; g.fillRect(36 + i * 24, h / 2 - 4, 12, 8); }
});
const tvTex = canvasTex(512, 288, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0b3d2e'); gr.addColorStop(1, '#1a6a4a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.font = 'bold 64px system-ui'; g.textAlign = 'center'; g.fillText('YERLIFE TV', w / 2, h / 2 + 10);
  g.font = '28px system-ui'; g.fillStyle = '#bfe8c9'; g.fillText('jonli efir • shaharcha yangiliklari', w / 2, h / 2 + 60);
  g.fillStyle = '#e53935'; roundRect(g, 24, 22, 92, 36, 8); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 22px system-ui'; g.textAlign = 'left'; g.fillText('● LIVE', 34, 48);
});
const skyTex = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5aa6e6'); gr.addColorStop(1, '#cfe9fb'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, s] of [[60, 70, 26], [90, 64, 32], [120, 74, 24], [180, 130, 20], [205, 124, 26]]) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  g.fillStyle = '#6aa144'; g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(w * .3, h * .72, w * .6, h * .86); g.quadraticCurveTo(w * .85, h * .78, w, h * .84); g.lineTo(w, h); g.fill();
});

export function buildInterior(nick, level) {
  const vip = level === 4, scene = new THREE.Scene(), W = ROOM.w, Dp = ROOM.d, H = ROOM.h;
  scene.background = new THREE.Color(vip ? 0x2a2216 : 0x1d1a16);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b5a48, 1.2));
  const pl = new THREE.PointLight(0xffe2b0, 30, 18, 1.6); pl.position.set(0, H - .4, 0); pl.castShadow = true; scene.add(pl);
  const dl = new THREE.DirectionalLight(0xdfefff, 1.2); dl.position.set(-W / 2 + .5, 2.2, -1); scene.add(dl);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: .8, ...o });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp).rotateX(-Math.PI / 2), std({ map: woodFloor })); floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, Dp).rotateX(Math.PI / 2), std({ color: 0xf6f2ea })); ceil.position.y = H; scene.add(ceil);
  const wm = std({ map: wallTex(vip), side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(W, H, Dp), [wm, wm, std({ visible: false }), std({ visible: false }), wm, wm]); room.position.y = H / 2; room.receiveShadow = true; scene.add(room);
  const trimC = vip ? '#d4a93a' : '#ffffff';
  const P = [];
  // plintuslar
  P.push(box(W, .14, .05, 0, 0, -Dp / 2 + .03, trimC), box(W, .14, .05, 0, 0, Dp / 2 - .03, trimC), box(.05, .14, Dp, -W / 2 + .03, 0, 0, trimC), box(.05, .14, Dp, W / 2 - .03, 0, 0, trimC));
  if (vip) P.push(box(W, .1, .05, 0, H - .25, -Dp / 2 + .03, trimC), box(.05, .1, Dp, -W / 2 + .03, H - .25, 0, trimC), box(.05, .1, Dp, W / 2 - .03, H - .25, 0, trimC));
  // eshik (+z devor)
  P.push(box(1.3, 2.3, .08, 0, 0, Dp / 2 - .05, '#6b4527'), box(1.5, .1, .1, 0, 2.3, Dp / 2 - .05, trimC), box(.08, .08, .08, .45, 1.05, Dp / 2 - .12, '#d9b25a'));
  // divan (chap tomonda, TV ga qarab)
  const sofaC = vip ? '#6b1d2a' : '#3f5f7a';
  P.push(box(2.6, .45, 1, -2.4, 0, 1.6, sofaC), box(2.6, .8, .25, -2.4, .3, 2.0, sofaC), box(.25, .65, 1, -3.65, 0, 1.6, sofaC), box(.25, .65, 1, -1.15, 0, 1.6, sofaC), box(.5, .35, .15, -3.0, .45, 1.85, '#e8d9b0'), box(.5, .35, .15, -1.9, .45, 1.85, '#e8d9b0'));
  // stol
  const tw = vip ? '#3a2412' : '#8a5a34';
  P.push(box(1.4, .08, .8, -2.4, .45, .2, tw), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => box(.07, .45, .07, -2.4 + x * .62, 0, .2 + z * .33, tw)));
  P.push(cyl(.12, .1, .14, -2.2, .53, .2, '#ffffff', 10), box(.3, .04, .22, -2.7, .53, .25, '#c62828'));
  // TV (orqa devorda)
  P.push(box(2.2, .5, .5, -2.4, 0, -Dp / 2 + .3, tw), box(1.9, 1.1, .08, -2.4, 1.0, -Dp / 2 + .12, '#111111'));
  // karavot (o'ng orqa burchak)
  P.push(box(2.0, .4, 2.6, 3.2, 0, -2.2, tw), box(2.0, .25, 2.5, 3.2, .4, -2.15, '#f4f1ea'), box(1.96, .12, 1.7, 3.2, .63, -1.75, vip ? '#c9a046' : '#4f7fb0'), box(.8, .18, .4, 2.75, .65, -3.15, '#ffffff'), box(.8, .18, .4, 3.65, .65, -3.15, '#ffffff'), box(2.0, 1.1, .12, 3.2, 0, -3.48, tw));
  // kitob javoni (o'ng devor)
  P.push(box(.4, 2.2, 1.8, W / 2 - .25, 0, 1.4, tw));
  const bc = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a', '#ef6c00', '#00838f'], r = rng(3);
  for (let s = 0; s < 4; s++) { P.push(box(.36, .04, 1.7, W / 2 - .27, .35 + s * .5, 1.4, tw)); for (let b = 0; b < 9; b++) { const hh = .3 + r() * .1; P.push(box(.26, hh, .14, W / 2 - .3, .39 + s * .5, .65 + b * .17, bc[(s * 9 + b) % 7])); } }
  // gul
  P.push(cyl(.22, .16, .4, 3.9, 0, 3.2, '#b5532f', 12), cyl(.04, .04, .5, 3.9, .4, 3.2, '#3d6e2a', 6));
  const leaves = []; for (let i = 0; i < 7; i++) { const g = new THREE.IcosahedronGeometry(.22, 0); const a = i / 7 * 6.28; g.translate(3.9 + Math.cos(a) * .18, .95 + (i % 3) * .12, 3.2 + Math.sin(a) * .18); leaves.push(part(g, '#4f9a3a')); }
  P.push(...leaves);
  // deraza ramkasi (chap devor)
  P.push(box(.1, 1.5, 2.1, -W / 2 + .05, 1.0, -1.5, trimC), box(.18, .08, 2.2, -W / 2 + .1, .96, -1.5, trimC));
  // VIP qandil
  if (vip) P.push(cyl(.02, .02, .5, 0, H - .5, 0, '#d4a93a', 6), cyl(.5, .3, .25, 0, H - .75, 0, '#d4a93a', 12));
  const furn = new THREE.Mesh(merge(P), std({ vertexColors: true })); furn.castShadow = furn.receiveShadow = true; scene.add(furn);
  if (vip) { const gm = new THREE.MeshStandardMaterial({ color: 0xdcb04a, metalness: 1, roughness: .3 }); furn.material.onBeforeCompile = () => {}; scene.add(new THREE.Mesh(new THREE.TorusGeometry(.45, .03, 6, 24).rotateX(Math.PI / 2).translate(0, H - .65, 0), gm)); }
  // gilam, TV ekrani, deraza manzarasi, ramka
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4).rotateX(-Math.PI / 2), std({ map: rugTex })); rug.position.set(-2.4, .01, .6); rug.receiveShadow = true; scene.add(rug);
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.76, .98), new THREE.MeshBasicMaterial({ map: tvTex })); tv.position.set(-2.4, 1.55, -Dp / 2 + .17); scene.add(tv);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.35), new THREE.MeshBasicMaterial({ map: skyTex })); win.position.set(-W / 2 + .11, 1.72, -1.5); win.rotation.y = Math.PI / 2; scene.add(win);
  const frameTex = signTex(['Xush kelibsiz!', '@' + nick], { w: 512, h: 320, bg: vip ? '#1b1408' : '#fbf6ea', fg: vip ? '#f1d27a' : '#3b2a1a', border: vip ? '#d4a93a' : '#7a5230', font: 'bold 64px Georgia, serif' });
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), std({ map: frameTex })); frame.position.set(.55, 1.95, -Dp / 2 + .07); scene.add(frame);
  // to'qnashuv qutilari [minX,minZ,maxX,maxZ]
  const colliders = [[-3.8, 1.05, -1.0, 2.15], [-3.15, -.25, -1.65, .65], [-3.6, -Dp / 2, -1.2, -Dp / 2 + .6], [2.15, -Dp / 2, 4.25, -.85], [W / 2 - .5, .45, W / 2, 2.35], [3.6, 2.9, 4.2, 3.5]];
  return { scene, colliders, spawn: new THREE.Vector3(0, 0, Dp / 2 - 2.4), door: new THREE.Vector3(0, 0, Dp / 2 - .2) };
}
