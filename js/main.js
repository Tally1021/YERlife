// YERLIFE Shaharcha — asosiy boshqaruv
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { isMobile, windUniform, strHash, rng, compose } from './util.js';
import { cityInfo, slot, ensureSlots, ringR, ROAD, SIDE, MAHALLA, treePos, yurtPos } from './layout.js';
import { Yurts, buildComTown } from './yurts.js';
import { Extras } from './extras.js';
import { buildCityHall, hokimTex, buildHallInterior } from './civic.js';
import { Buildings, YardPool, DIMS, LEVEL_NAMES, setNightBuildings } from './buildings.js';
import { buildTerrain, SkyBox, Clouds, Trees, buildGarden, bigTree } from './nature.js';
import { buildRoads, buildLamps, buildMahallaSigns, buildStadium, Cars, setNightCity } from './city.js';
import { Crowd, lookFor, makePlayer, animatePlayer } from './people.js';
import { buildInterior, ROOM } from './interior.js';
import { Live } from './live.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const ADMIN = Q.get('admin');
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function toast(t, ms = 2600) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), ms); }

// ---------- jonli rejim: boshqa o'yinchilar va chat ----------
const live = new Live({ url: window.YERLIFE_LIVE || '', labels: $('labels'), onChat: chatAdd, onCount: (n) => { for (const el of document.querySelectorAll('.onl')) el.textContent = n ? '🟢 ' + n + ' onlayn' : ''; } });
if (live.ready) document.body.classList.add('live');
let roomKey = 'o';
function chatAdd(n, m, mine) {
  const log = $('chatLog'), d = document.createElement('div'), b = document.createElement('b'); b.textContent = '@' + n + ': '; d.append(b, m); if (mine) d.className = 'mine';
  log.appendChild(d); while (log.children.length > 40) log.firstChild.remove(); log.scrollTop = log.scrollHeight;
}
$('chatF').onsubmit = (e) => { e.preventDefault(); const i = $('chatI'); if (i.value.trim()) { if (live.chat(i.value)) i.value = ''; else toast('Chat hali ulanmadi'); } i.blur(); };
function myName() { // "Men shu odamman" bo'lsa — o'sha nik, aks holda mehmon
  if (me != null && residents[me]) return residents[me].n;
  let g = ''; try { g = localStorage.getItem('yl_guest') || ''; if (!/^mehmon\d{4}$/.test(g)) { g = 'mehmon' + (1000 + Math.random() * 9000 | 0); localStorage.setItem('yl_guest', g); } } catch { g = 'mehmon' + (1000 + Math.random() * 9000 | 0); }
  return g;
}

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .3, 30000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.1; controls.minDistance = 10; controls.maxDistance = 3500;

const hemi = new THREE.HemisphereLight(0xdfeeff, 0x4a5a35, .9); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff1dc, 3); sunL.castShadow = true;
sunL.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048); sunL.shadow.bias = -.0005; sunL.shadow.normalBias = .5;
scene.add(sunL, sunL.target);
const sky = new SkyBox(scene, renderer);
scene.fog = new THREE.Fog(0xcfdbe3, 600, 3000);
const clouds = new Clouds(scene);

// ---------- ma'lumotlar ----------
let residents = [], trees = [], comments = [], likeTotal = 0, hokim = '', dataStamp = '';
function normalize(d) {
  const res = Array.isArray(d.residents) ? d.residents : (d.followers || []).map(n => ({ n, l: 0 }));
  return { res: res.map(r => typeof r === 'string' ? { n: r, l: 0 } : r), trees: (d.trees || []).map(t => typeof t === 'string' ? { n: t } : t), com: (d.comments || []).map(t => typeof t === 'string' ? { n: t } : t) };
}
function applyDemo() { // ?demo=1 — faqat ko'rish uchun, saqlanmaydi
  const r = rng(99);
  residents.forEach((x, i) => { const v = r(); x.l = v < .005 ? 4 : v < .012 ? 3 : v < .04 ? 2 : v < .14 ? 1 : 0; });
  [[0, 4], [1, 3], [2, 2], [3, 1], [5, 3], [8, 4], [11, 2], [14, 1]].forEach(([i, l]) => residents[i] && (residents[i].l = l));
  if (!trees.length) trees = residents.slice(0, 900).map((x, i) => ({ n: residents[(i * 37) % residents.length].n }));
  if (!comments.length) comments = residents.slice(0, 700).map((x, i) => ({ n: residents[(i * 53) % residents.length].n }));
}
async function loadData() {
  try { const r = await fetch('data.json?' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw 0; const d = await r.json(); const s = JSON.stringify([d.updated, (d.residents || d.followers || []).length, (d.trees || []).length, (d.comments || []).length, d.likeTotal, d.hokim]); const ch = s !== dataStamp; dataStamp = s; const n = normalize(d); residents = n.res; trees = n.trees; comments = n.com; likeTotal = d.likeTotal | 0; hokim = d.hokim || ''; if (Q.get('demo')) applyDemo(); return ch; }
  catch (e) { return false; }
}
const alive = (x) => x && x.n && !x.d;
const LIST = (k) => k === 'uy' ? residents : k === 'otov' ? comments : trees;
const ICON = { uy: '🏠', daraxt: '🌳', otov: '⛺' }, NAME = { uy: 'Uy', daraxt: 'Daraxt', otov: "O'tov" };

// ---------- shahar qurish ----------
let info, W = {}, buildings = new Buildings(scene), yard = new YardPool(scene), treeSys = new Trees(scene), yurtSys = new Yurts(scene), extras = new Extras(scene), crowd = new Crowd(scene, 190), cars;
let resGrid = new Map(), obsGrid = new Map(), plazaTree;
const GC = 24, key = (x, z) => Math.floor(x / GC) + ',' + Math.floor(z / GC);
const looks = new Map();
const lookOf = (i) => { const r = residents[i]; const k = r.n + '|' + r.l; if (!looks.has(k)) looks.set(k, lookFor(r.n, r.l | 0)); return looks.get(k); };

function addObs(o) { const r = o.R || 6; for (let gx = Math.floor((o.x - r) / GC); gx <= Math.floor((o.x + r) / GC); gx++) for (let gz = Math.floor((o.z - r) / GC); gz <= Math.floor((o.z + r) / GC); gz++) { const k = gx + ',' + gz; if (!obsGrid.has(k)) obsGrid.set(k, []); obsGrid.get(k).push(o); } }

function build() {
  ensureSlots(residents.length + 1);
  const treeAll = trees.concat(Array.from({ length: Math.max(0, likeTotal - trees.length) }, () => ({ n: '', anon: 1 })));
  info = cityInfo(residents.length, treeAll.length, comments.length);
  for (const k of ['roads', 'lamps', 'signs', 'stadium', 'garden', 'comTown', 'hall']) if (W[k]) scene.remove(W[k]);
  W.terrain = buildTerrain(scene, info, W.terrain);
  W.roads = buildRoads(scene, info); W.lamps = buildLamps(scene, info); W.signs = buildMahallaSigns(scene, residents.length);
  W.stadium = buildStadium(scene, info); W.garden = buildGarden(info); scene.add(W.garden); W.comTown = buildComTown(info); scene.add(W.comTown); W.hall = buildCityHall(info, hokim); scene.add(W.hall);
  if (!plazaTree) { plazaTree = bigTree(); scene.add(plazaTree); }
  buildings.build(residents, slot);
  extras.build(residents, slot);
  treeSys.build(treeAll, info);
  yurtSys.build(comments, info);
  if (cars) cars.dispose(scene); cars = new Cars(scene, info, 18);
  // qidiruv to'ri va to'siqlar
  resGrid = new Map(); obsGrid = new Map();
  residents.forEach((r, i) => {
    if (!alive(r)) return; const s = slot(i), L = Math.min(4, r.l | 0), dm = DIMS[L];
    const k = key(s.x, s.z); if (!resGrid.has(k)) resGrid.set(k, []); resGrid.get(k).push(i);
    addObs({ t: 'box', x: s.x - s.fx * dm.d / 2, z: s.z - s.fz * dm.d / 2, rot: s.rot, hw: dm.w / 2, hd: dm.d / 2, h: dm.h, R: Math.hypot(dm.w, dm.d) / 2 });
  });
  for (const t of treeSys.list) addObs({ t: 'c', x: t.x, z: t.z, r: .45 * t.s, h: 6, R: 1 });
  for (const t of yurtSys.list) addObs({ t: 'c', x: t.x, z: t.z, r: 2.5 * t.s, h: 3.4, R: 3 });
  addObs({ t: 'c', x: 0, z: 0, r: 1.4, h: 14, R: 2 });
  { const H = info.hok; addObs({ t: 'box', x: 0, z: H.cz + 3, rot: 0, hw: H.w / 2 + 2, hd: H.d / 2 + 5, h: 30, R: 32 }); addObs({ t: 'c', x: 0, z: H.cz + H.d / 2 + 23, r: 5.4, h: 3, R: 6 }); }
  W.st = info.st; nightApply();
  $('nH').textContent = fmt(residents.filter(alive).length); $('nT').textContent = fmt(Math.max(likeTotal, trees.filter(alive).length)); $('nC').textContent = fmt(comments.filter(alive).length);
  nearTick(true);
}

// ---------- to'qnashuv ----------
const PR = .38; // o'yinchi radiusi
function inStadium(x, z, pad = 0) { const s = W.st; const dx = (x - s.cx) / (s.ax + pad), dz = (z - s.cz) / (s.bz + pad); return dx * dx + dz * dz; }
function stIn(x, z, pad = 0) { const s = W.st; const dx = (x - s.cx) / (s.iax + .7 + pad), dz = (z - s.cz) / (s.ibz + .8 + pad); return dx * dx + dz * dz; }
function resolve(p) {
  if (inSt) { const v = stIn(p.x, p.z, -PR); if (v > 1) { const k = 1 / Math.sqrt(v) * .998; p.x = W.st.cx + (p.x - W.st.cx) * k; p.z = W.st.cz + (p.z - W.st.cz) * k; } return; } // stadion ichida: faqat maydon chegarasi
  const list = obsGrid.get(key(p.x, p.z)) || [];
  for (const o of list) {
    if (o.t === 'c') { const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = o.r + PR; if (d < m && d > 1e-4) { p.x = o.x + dx / d * m; p.z = o.z + dz / d * m; } }
    else {
      const c = Math.cos(o.rot), s = Math.sin(o.rot), dx = p.x - o.x, dz = p.z - o.z;
      let lx = dx * c - dz * s, lz = dx * s + dz * c; // dunyodan lokalga (rot atrofida)
      const ex = o.hw + PR, ez = o.hd + PR;
      if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
        if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez;
        p.x = o.x + lx * c + lz * s; p.z = o.z - lx * s + lz * c;
      }
    }
  }
  const v = inStadium(p.x, p.z, PR); if (v < 1) { const k = 1 / Math.sqrt(v) * 1.002; p.x = W.st.cx + (p.x - W.st.cx) * k; p.z = W.st.cz + (p.z - W.st.cz) * k; }
}
function blocked(x, y, z) {
  if (inSt) { const v = stIn(x, z); return v > 1 && y < 1.6 + (Math.sqrt(v) - 1) * 19; } // tribunalar qiyaligi
  for (const o of obsGrid.get(key(x, z)) || []) {
    if (y > o.h) continue;
    if (o.t === 'c') { if (Math.hypot(x - o.x, z - o.z) < o.r + .2) return true; }
    else { const c = Math.cos(o.rot), s = Math.sin(o.rot), dx = x - o.x, dz = z - o.z, lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < o.hw + .25 && Math.abs(lz) < o.hd + .25) return true; }
  }
  return W.st && y < 16 && inStadium(x, z, .3) < 1;
}

// ---------- rejimlar ----------
let inSt = false, spot = null; // inSt — o'yinchi stadion ichida; spot — yaqin maxsus eshik
let mode = 'top', player = null, P = { x: 0, z: 12, rot: 0, phase: 0, moving: false, y: 0, vy: 0 }, camDist = 7, room = null, me = null;
const keys = new Set(), joy = { x: 0, y: 0 };
const cam = { yaw: 0, pitch: .4 }; let jumpQ = false; // Roblox uslubi: kamera sichqoncha/barmoq bilan aylanadi, personaj kameraga nisbatan yuradi
function topView(instant) {
  const right = info.garden.x0 + info.garden.Dp, left = info.st.cx - info.st.ax, cx = (right + left) / 2, bot = info.com.z0 + info.com.Dp, topZ = Math.min(-info.cityR, info.hok.cz - 25), cz = (bot + topZ) / 2;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), exX = (right - left) / 2 + 20, exZ = (bot - topZ) / 2 + 20;
  const dist = Math.max(exX / (t * camera.aspect), exZ * 1.2 / t) * 1.02;
  const tgt = new THREE.Vector3(cx, 0, cz), pos = new THREE.Vector3(cx, dist * .93, cz + dist * .38);
  if (instant) { camera.position.copy(pos); controls.target.copy(tgt); } else flyTo(pos, tgt);
}
let fly = null;
function flyTo(pos, tgt, dur = 1600) { fly = { t0: performance.now(), dur, fp: camera.position.clone(), ft: controls.target.clone(), tp: pos.clone(), tt: tgt.clone() }; }
function setMode(m) {
  mode = m; document.body.dataset.mode = m;
  controls.enabled = m === 'top'; if (m !== 'top') document.activeElement?.blur?.();
  if (player) player.visible = m !== 'top';
  if (m === 'top') { inSt = false; $('enter').classList.remove('on'); $('exit').classList.remove('on'); }
}
function spawn(look, x, z, rot) {
  if (player) player.parent && player.parent.remove(player);
  inSt = false; player = makePlayer(look); scene.add(player); P.x = x; P.z = z; P.rot = rot; P.y = P.vy = 0; cam.yaw = rot; cam.pitch = .4; camDist = 7;
  setMode('walk'); camera.position.set(x - Math.sin(rot) * 9, 5, z - Math.cos(rot) * 9);
  live.join(myName(), me != null && residents[me] ? Math.min(4, residents[me].l | 0) : 0);
}
function spawnAs(i) {
  const r = residents[i], s = slot(i); me = i;
  spawn(lookFor(r.n, r.l | 0), s.x + s.fx * 3.6, s.z + s.fz * 3.6, s.rot + Math.PI);
  closeCard(); toast('Siz endi @' + r.n + ' — uyingiz oldidasiz');
}
// Sayr qayerdan boshlanadi: tanlangan uy/daraxt/o'tov/joy oldidan, bo'lmasa — kamera qarab turgan joydan
function walkSpot() {
  const k = card.kind, i = card.i;
  if (k === 'uy' && alive(residents[i])) { const s = slot(i); return [s.x + s.fx * 3.6, s.z + s.fz * 3.6, s.rot + Math.PI]; }
  if (k === 'daraxt' && alive(trees[i])) { const p = treePos(i, info.garden); return [p.x - 2.6, p.z, Math.PI / 2]; }
  if (k === 'otov' && alive(comments[i])) { const p = yurtPos(i, info.com); return [p.x, p.z - 4.6, 0]; }
  if (k === 'hokimiyat') { const H = info.hok; return [3, H.cz + H.d / 2 + 33, Math.PI]; }
  if (k === 'stadion') { const s = info.st; return [s.cx + s.ax + 7, s.cz, -Math.PI / 2]; }
  if (k === 'bog') { const g = info.garden; return [g.x0 - 5, 0, Math.PI / 2]; }
  if (k === 'otovlar') return [0, info.com.z0 - 6, 0];
  if (mode === 'top' && camera.position.distanceTo(controls.target) < 420) { const t = controls.target; return [t.x, t.z, Math.atan2(t.x - camera.position.x, t.z - camera.position.z)]; }
  return [0, ringR(0) - ROAD / 2 - SIDE - 2, 0];
}
$('walk').onclick = () => { me = null; const [wx, wz, wr] = walkSpot(); closeCard(); clearHL(); spawn(lookFor('mehmon'), wx, wz, wr); for (let k = 0; k < 4; k++) { const p = { x: P.x, z: P.z }; resolve(p); P.x = p.x; P.z = p.z; } toast(isMobile ? "Sayr: joystick — yurish, ekranni surish — aylanish, ⤒ — sakrash" : "Sayr: W A S D — yurish, sichqonchani bosib surish — aylanish, Space — sakrash, g'ildirak — yaqinlashtirish"); };
$('meBtn').onclick = () => {
  if (card.kind === 'uy') return spawnAs(card.i);
  const qv = $('q').value.trim().replace(/^@/, '').toLowerCase();
  if (!qv) { toast('Avval nikingizni qidiring'); $('q').focus(); return; }
  const i = residents.findIndex(r => alive(r) && r.n.toLowerCase() === qv); if (i < 0) { toast('Bunday aholi topilmadi: ' + qv); return; }
  spawnAs(i);
};
$('topBtn').onclick = () => { if (mode === 'room') exitRoom(); setMode('top'); topView(); };
$('zin').onclick = () => zoom(.75); $('zout').onclick = () => zoom(1.33);
function zoom(k) {
  if (mode === 'top') { const d = camera.position.clone().sub(controls.target); const nd = THREE.MathUtils.clamp(d.length() * k, 12, 4000); flyTo(controls.target.clone().add(d.setLength(nd)), controls.target, 350); }
  else camDist = THREE.MathUtils.clamp(camDist * k, 2.2, mode === 'room' ? (room.dim ? 10 : 6) : 40);
}

// joystick
const jb = $('joy'), jk = $('knob'); let jid = null;
jb.addEventListener('pointerdown', (e) => { jid = e.pointerId; jb.setPointerCapture(jid); joyMove(e); });
jb.addEventListener('pointermove', (e) => { if (e.pointerId === jid) joyMove(e); });
const joyEnd = () => { jid = null; joy.x = joy.y = 0; jk.style.transform = 'translate(-50%,-50%)'; };
jb.addEventListener('pointerup', joyEnd); jb.addEventListener('pointercancel', joyEnd);
function joyMove(e) { const r = jb.getBoundingClientRect(), R = r.width / 2; let dx = e.clientX - r.left - R, dy = e.clientY - r.top - R; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } joy.x = dx / R; joy.y = dy / R; jk.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; }
addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; keys.add(e.code); if (e.code === 'Space' && mode !== 'top') e.preventDefault(); if (e.code === 'Enter' && mode !== 'top' && live.ready) { e.preventDefault(); keys.clear(); $('chatI').focus(); return; } if (e.code === 'KeyE') { if (mode === 'walk') { if (spot === 'stOut') useExit(); else useEnter(); } else if (mode === 'room' && nearExit) exitRoom(); } if (e.code === 'Escape' && mode === 'room') exitRoom(); });
addEventListener('keyup', (e) => keys.delete(e.code));

function input() {
  let f = -joy.y, r = joy.x;
  if (keys.has('KeyW') || keys.has('ArrowUp')) f = 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f = -1;
  if (keys.has('KeyA')) r = -1; if (keys.has('KeyD')) r = 1;
  if (Math.abs(f) < .15) f = 0; if (Math.abs(r) < .15) r = 0; return { f, r };
}
// kamerani aylantirish: ekranni (sichqoncha yoki barmoq bilan) surish, g'ildirak — masofa
{
  const cv = renderer.domElement; let drag = null;
  cv.addEventListener('pointerdown', (e) => { if (mode === 'top') return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch { } });
  cv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || mode === 'top') return;
    cam.yaw -= (e.clientX - drag.x) * .0055; cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - drag.y) * .004, -.2, 1.4); drag.x = e.clientX; drag.y = e.clientY;
  });
  const end = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', (e) => { if (mode === 'top') return; e.preventDefault(); zoom(e.deltaY > 0 ? 1.12 : .89); }, { passive: false });
  cv.addEventListener('contextmenu', (e) => { if (mode !== 'top') e.preventDefault(); });
  const jb2 = $('jump'); if (jb2) jb2.addEventListener('pointerdown', (e) => { e.preventDefault(); jumpQ = true; });
}
const camT = new THREE.Vector3(), camD = new THREE.Vector3();
function updateWalk(dt) {
  const { f, r } = input();
  if (keys.has('ArrowLeft')) cam.yaw += 2.2 * dt; if (keys.has('ArrowRight')) cam.yaw -= 2.2 * dt;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw); // kamera qaragan tomon (yerda)
  let mx = fx * f - fz * r, mz = fz * f + fx * r, nx = P.x, nz = P.z; const ml = Math.hypot(mx, mz), sp = 6.5 * Math.min(1, ml);
  P.moving = ml > .1;
  if (P.moving) { // personaj yurgan tomoniga buriladi
    mx /= ml; mz /= ml; nx += mx * sp * dt; nz += mz * sp * dt;
    let da = Math.atan2(mx, mz) - P.rot; da = Math.atan2(Math.sin(da), Math.cos(da)); P.rot += da * (1 - Math.exp(-dt * 14));
  }
  if ((keys.has('Space') || jumpQ) && P.y <= 0) P.vy = 7.5; jumpQ = false; // sakrash
  P.vy -= 22 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; }
  if (mode === 'walk') { const p = { x: nx, z: nz }; resolve(p); P.x = p.x; P.z = p.z; }
  else { // xona ichida
    const RM = room.dim || ROOM;
    let x = THREE.MathUtils.clamp(nx, -RM.w / 2 + .4, RM.w / 2 - .4), z = THREE.MathUtils.clamp(nz, -RM.d / 2 + .4, RM.d / 2 - .4);
    for (const [a, b, c, d] of room.colliders) if (x > a - PR && x < c + PR && z > b - PR && z < d + PR) { const o = [x - (a - PR), c + PR - x, z - (b - PR), d + PR - z], m = Math.min(...o); if (m === o[0]) x = a - PR; else if (m === o[1]) x = c + PR; else if (m === o[2]) z = b - PR; else z = d + PR; }
    P.x = x; P.z = z;
  }
  P.phase += dt * (P.moving ? 10 : 0);
  player.position.set(P.x, P.y, P.z); player.rotation.y = P.rot; animatePlayer(player, P.y > 0 ? 1.2 : P.phase, P.moving || P.y > 0);
  // kamera: o'yinchi atrofida aylanadi
  const ty = 1.6 + P.y; camT.set(P.x, ty, P.z);
  const d = camDist, cp = Math.cos(cam.pitch), want = new THREE.Vector3(P.x - fx * cp * d, Math.max(.3, ty + Math.sin(cam.pitch) * d), P.z - fz * cp * d);
  if (mode === 'walk') { // devorga urilsa yaqinlashadi
    camD.copy(want).sub(camT); const L = camD.length(); let ok = L;
    for (let s = .6; s <= L; s += .4) { const p = camT.clone().addScaledVector(camD, s / L); if (blocked(p.x, p.y, p.z)) { ok = Math.max(1.2, s - .5); break; } }
    want.copy(camT).addScaledVector(camD, ok / L);
  } else { const RM = room.dim || ROOM; want.x = THREE.MathUtils.clamp(want.x, -RM.w / 2 + .25, RM.w / 2 - .25); want.z = THREE.MathUtils.clamp(want.z, -RM.d / 2 + .25, RM.d / 2 - .25); want.y = Math.min(want.y, RM.h - .25); }
  camera.position.lerp(want, 1 - Math.exp(-dt * 12));
  if (mode === 'room') camT.set(P.x + fx * 1.6, 1.15, P.z + fz * 1.6); // xonani ko'rish uchun oldinga qaraydi
  camera.lookAt(camT);
  const fov = mode === 'room' ? 68 : 50; if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ---------- uy ichi ----------
let doorNear = -1, nearExit = false, outsideFrom = null;
function doorPos(i) { const s = slot(i), L = Math.min(4, residents[i].l | 0), dx = DIMS[L].doorX || 0; return [s.x + Math.cos(s.rot) * dx, s.z - Math.sin(s.rot) * dx]; }
function goRoom(r, back, msg, key) {
  room = r; outsideFrom = back; roomKey = key; const RM = room.dim || ROOM;
  room.scene.add(player); P.x = room.spawn.x; P.z = room.spawn.z; P.rot = Math.PI; P.y = P.vy = 0; cam.yaw = Math.PI; cam.pitch = .25; camDist = room.dim ? 4.5 : 2.6; setMode('room');
  camera.position.set(0, 2.2, RM.d / 2 - .3); $('enter').classList.remove('on'); toast(msg);
}
function enterRoom(i) { const r = residents[i], s = slot(i); goRoom(buildInterior(r.n, r.l | 0), { x: s.x + s.fx * 1.8, z: s.z + s.fz * 1.8, rot: s.rot }, '@' + r.n + ' uyidasiz', 'u' + i); }
function enterHall() { const H = info.hok; goRoom(buildHallInterior(hokim), { x: 0, z: H.cz + H.d / 2 + 9.6, rot: 0 }, hokim ? '🏛️ Hokimiyat — hokim @' + hokim + ' qabulxonasi' : '🏛️ Hokimiyat binosidasiz', 'h'); }
function exitRoom() {
  if (!room) return; const b = outsideFrom; room = null; scene.add(player);
  P.x = b.x; P.z = b.z; P.rot = b.rot; P.y = P.vy = 0; cam.yaw = b.rot; cam.pitch = .4; camDist = 7; setMode('walk'); $('exit').classList.remove('on');
}
// stadion: darvozadan maydonga kirish va chiqish (shu sahnaning o'zida)
function enterStadium() { const s = info.st; inSt = true; P.x = s.cx + s.iax - 3; P.z = s.cz; P.rot = cam.yaw = -Math.PI / 2; P.y = P.vy = 0; cam.pitch = .35; camDist = 9; camera.position.set(P.x + 7, 5, P.z); $('enter').classList.remove('on'); toast('🏟️ YERLIFE ARENA — maydondasiz ⚽'); }
function exitStadium() { const s = info.st; inSt = false; P.x = s.cx + s.ax + 3; P.z = s.cz; P.rot = cam.yaw = Math.PI / 2; P.y = P.vy = 0; camDist = 7; camera.position.set(P.x - 7, 5, P.z); $('exit').classList.remove('on'); }
function spotNear() {
  const H = info.hok, s = info.st;
  if (inSt) return Math.hypot(P.x - (s.cx + s.iax), P.z - s.cz) < 3.6 ? 'stOut' : null;
  if (Math.hypot(P.x, P.z - (H.cz + H.d / 2 + 8.6)) < 4.5) return 'hall';
  if (Math.hypot(P.x - (s.cx + s.ax + 1), P.z - s.cz) < 4.5) return 'stIn';
  return null;
}
function useEnter() { if (spot === 'hall') enterHall(); else if (spot === 'stIn') enterStadium(); else if (doorNear >= 0) enterRoom(doorNear); }
function useExit() { if (mode === 'room') exitRoom(); else if (inSt) exitStadium(); }
$('enter').onclick = useEnter;
$('exit').onclick = useExit;

// ---------- yaqin atrof (LOD, personajlar, yozuvlar) ----------
let nearRes = [], nearTrees = [], nearYurts = [], lastNear = 0;
function focusPoint() { if (mode !== 'top') return [P.x, P.z, 0]; const d = camera.position.distanceTo(controls.target); return [controls.target.x, controls.target.z, d]; }
function nearTick(force) {
  const [fx, fz, camd] = focusPoint(); const R = 95, out = [];
  if (mode !== 'top' || camd < 420) {
    for (let gx = Math.floor((fx - R) / GC); gx <= Math.floor((fx + R) / GC); gx++) for (let gz = Math.floor((fz - R) / GC); gz <= Math.floor((fz + R) / GC); gz++) for (const i of resGrid.get(gx + ',' + gz) || []) { const s = slot(i), d = (s.x - fx) ** 2 + (s.z - fz) ** 2; if (d < R * R) out.push([d, i]); }
  }
  out.sort((a, b) => a[0] - b[0]); nearRes = out.map(a => a[1]);
  yard.set(nearRes.slice(0, 420), residents, slot);
  buildings.updateLOD(fx, fz, mode !== 'top' ? 150 : camd < 520 ? Math.max(150, camd * .7) : 0);
  // uy egalari personajlari (20..189)
  for (let c = 20; c < crowd.cap; c++) crowd.hide(c);
  nearRes.filter(i => !(mode !== 'top' && i === me)).slice(0, crowd.cap - 20).forEach((i, n) => { const s = slot(i); crowd.set(20 + n, s.x + s.fx * 1.3 - s.fz * 1.5, s.z + s.fz * 1.3 + s.fx * 1.5, s.rot, lookOf(i), 0); });
  nearTrees = treeSys.updateLOD(fx, fz, mode === 'top' && camd > 420 ? 0 : 110);
  nearYurts = mode === 'top' && camd > 420 ? [] : yurtSys.near(fx, fz, 110);
  crowd.commit();
}

// HTML taxtachalar
const plq = Array.from({ length: 34 }, () => { const d = document.createElement('div'); d.className = 'plq'; $('labels').appendChild(d); return d; });
const v3 = new THREE.Vector3();
function labels() {
  let u = 0; const cam = camera.position;
  const show = mode === 'walk' || (mode === 'top' && camera.position.distanceTo(controls.target) < 230);
  if (show) {
    const items = [];
    for (const i of nearRes.slice(0, 40)) { const s = slot(i), L = Math.min(4, residents[i].l | 0); items.push({ x: s.x - s.fx * DIMS[L].d / 2, y: DIMS[L].h + 1.2, z: s.z - s.fz * DIMS[L].d / 2, i, L }); }
    for (const t of nearTrees.filter(t => !t.anon).slice(0, 14)) items.push({ x: t.x, y: 6.4 * t.s, z: t.z, tree: t });
    for (const t of nearYurts.slice(0, 16)) items.push({ x: t.x, y: 3.9 * t.s, z: t.z, yurt: t });
    // darvoza yozuvi ko'rinsa, uning ustiga nik chiqmasin
    let gateS = null; const gz = info.com.z0;
    if (cam.z < gz) { v3.set(0, 7, gz).project(camera); const d = Math.hypot(cam.x, cam.z - gz) || 1; if (v3.z < 1) gateS = { x: v3.x, y: v3.y - 1.5 / d, w: 12 / d * innerHeight, h: 6 / d * innerHeight }; }
    items.sort((a, b) => ((a.x - cam.x) ** 2 + (a.z - cam.z) ** 2) - ((b.x - cam.x) ** 2 + (b.z - cam.z) ** 2));
    for (const it of items) {
      if (u >= (isMobile ? 12 : plq.length)) break; if ((it.x - cam.x) ** 2 + (it.z - cam.z) ** 2 > (isMobile ? 90 : 140) ** 2) continue;
      v3.set(it.x, it.y, it.z).project(camera); if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) continue;
      if (it.yurt && gateS && Math.abs(v3.x - gateS.x) * innerWidth < gateS.w && Math.abs(v3.y - gateS.y) * innerHeight < gateS.h) continue;
      const el = plq[u++], html = it.yurt ? `<b>@${esc(it.yurt.n)}</b> 💬` : it.tree ? `<b>@${esc(it.tree.n)}</b> <span class="hrt">❤</span>` : it.L >= 3 ? `<small>${it.L === 3 ? 'QASR' : 'VIP MINORA'}</small><b>@${esc(residents[it.i].n)}</b>` : `<b>@${esc(residents[it.i].n)}</b><i>№${it.i + 1}</i>`;
      if (el._h !== html) { el.innerHTML = html; el._h = html; el.className = 'plq' + (it.yurt ? ' yurt' : it.tree ? ' tree' : it.L >= 3 ? ' gold' : ''); }
      el.style.transform = `translate(${(v3.x * .5 + .5) * innerWidth}px,${(-v3.y * .5 + .5) * innerHeight}px) translate(-50%,-100%)`; el.style.display = 'block';
    }
  }
  for (; u < plq.length; u++) plq[u].style.display = 'none';
}
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- piyodalar ----------
const walkers = []; { const r = rng(5); for (let i = 0; i < 20; i++) walkers.push({ k: 0, side: r() < .5 ? -1 : 1, a: r() * 6.28, dir: r() < .5 ? -1 : 1, v: 1.1 + r() * .5, look: lookFor('piyoda' + i), ph: r() * 6, rk: r() }); }
function updateWalkers(dt) {
  for (let i = 0; i < walkers.length; i++) {
    const w = walkers[i]; w.k = Math.min(info.K, Math.floor(w.rk * (Math.min(info.K, 4) + 1)));
    const r = ringR(w.k) + w.side * (ROAD / 2 + SIDE / 2); w.a += w.dir * w.v / r * dt; w.ph += dt * 7;
    const x = Math.cos(w.a) * r, z = Math.sin(w.a) * r; crowd.set(i, x, z, Math.atan2(-Math.sin(w.a) * w.dir, Math.cos(w.a) * w.dir), w.look, Math.sin(w.ph) * .55, .1);
  }
}

// ---------- qidiruv, kartochka, havolalar ----------
let marker = null, hl = null;
const card = { kind: null, i: -1 };
function search(qv) {
  qv = qv.trim().replace(/^@/, '').toLowerCase(); const out = [];
  if (!qv) return out;
  for (let i = 0; i < residents.length && out.length < 6; i++) if (alive(residents[i]) && residents[i].n.toLowerCase().includes(qv)) out.push({ kind: 'uy', i });
  for (let j = 0; j < trees.length && out.length < 9; j++) if (alive(trees[j]) && trees[j].n.toLowerCase().includes(qv)) out.push({ kind: 'daraxt', i: j });
  for (let j = 0; j < comments.length && out.length < 12; j++) if (alive(comments[j]) && comments[j].n.toLowerCase().includes(qv)) out.push({ kind: 'otov', i: j });
  const exact = (o) => LIST(o.kind)[o.i].n.toLowerCase() === qv; out.sort((a, b) => exact(b) - exact(a));
  return out;
}
$('q').addEventListener('input', () => {
  const res = search($('q').value), box = $('res');
  box.innerHTML = res.map((o, k) => { const n = LIST(o.kind)[o.i].n; return `<button data-k="${k}">${ICON[o.kind]} <b>@${esc(n)}</b><span>${NAME[o.kind]} №${o.i + 1}</span></button>`; }).join('') || ($('q').value.trim() ? '<div class="none">Topilmadi</div>' : '');
  box.querySelectorAll('button').forEach(b => b.onclick = () => { const o = res[+b.dataset.k]; box.innerHTML = ''; $('q').blur(); location.hash = o.kind + '-' + (o.i + 1); });
});
$('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const b = $('res').querySelector('button'); if (b) b.click(); } });

function focusItem(kind, i) {
  if (mode === 'room') exitRoom(); if (mode === 'walk') setMode('top');
  clearHL();
  let x, z, h;
  if (kind === 'uy') { const r = residents[i]; if (!alive(r)) return toast('Bunday uy yo\'q'); const s = slot(i), L = Math.min(4, r.l | 0); x = s.x - s.fx * DIMS[L].d / 2; z = s.z - s.fz * DIMS[L].d / 2; h = DIMS[L].h; buildings.highlight(i, true, residents); hl = { kind, i };
    flyTo(new THREE.Vector3(x + s.fx * (24 + h), 14 + h * .9, z + s.fz * (24 + h)), new THREE.Vector3(x, h * .4, z)); }
  else if (kind === 'daraxt') { const t = trees[i]; if (!alive(t)) return toast('Bunday daraxt yo\'q'); const p = treePos(i, info.garden); x = p.x; z = p.z; h = 6; treeSys.highlight(i, true); hl = { kind, i };
    flyTo(new THREE.Vector3(x - 16, 12, z + 10), new THREE.Vector3(x, 2, z)); }
  else if (kind === 'otov') { const t = comments[i]; if (!alive(t)) return toast("Bunday o'tov yo'q"); const p = yurtPos(i, info.com); x = p.x; z = p.z; h = 4; yurtSys.highlight(i, true); hl = { kind, i };
    flyTo(new THREE.Vector3(x + (x > 0 ? -14 : 14), 11, z - 12), new THREE.Vector3(x, 1.5, z)); }
  marker = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 80, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: .35, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 40 + h;
  const ring = new THREE.Mesh(new THREE.RingGeometry(Math.max(3, h * .25) + 1.5, Math.max(3, h * .25) + 2.4, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: .9 })); ring.position.y = .15;
  marker.add(beam, ring); marker.position.set(x, 0, z); scene.add(marker);
  openCard(kind, i);
}
function clearHL() { if (hl) { if (hl.kind === 'uy') buildings.highlight(hl.i, false, residents); else if (hl.kind === 'otov') yurtSys.highlight(hl.i, false); else treeSys.highlight(hl.i, false); hl = null; } if (marker) { scene.remove(marker); marker = null; } }
function openCard(kind, i) {
  card.kind = kind; card.i = i; const x = LIST(kind)[i];
  $('cTitle').textContent = `${ICON[kind]} ${NAME[kind]} №${i + 1}`;
  $('cNick').textContent = '@' + x.n;
  $('cInfo').textContent = kind === 'uy' ? `${LEVEL_NAMES[Math.min(4, x.l | 0)]} • ${Math.floor(i / MAHALLA) + 1}-mahalla` : kind === 'otov' ? "Izohlar shaharchasi • izoh uchun rahmat 💬" : "Layklar shaharchasi • layk uchun rahmat ❤";
  if (kind === 'uy' && x.iz) $('cInfo').innerHTML = esc($('cInfo').textContent) + `<div class="wish">💬 “${esc(x.iz)}”<br><b>Istagingiz bajarildi ✅</b></div>`;
  $('cMe').style.display = kind === 'uy' ? '' : 'none';
  $('card').classList.add('on');
}
function closeCard() { $('card').classList.remove('on'); card.kind = null; }
$('cClose').onclick = () => { closeCard(); clearHL(); history.replaceState(null, '', location.pathname + location.search); };
$('cMe').onclick = () => card.kind === 'uy' && spawnAs(card.i);
$('cCopy').onclick = async () => {
  const url = location.origin + location.pathname + '#' + card.kind + (card.i >= 0 ? '-' + (card.i + 1) : '');
  try { await navigator.clipboard.writeText(url); toast('Havola nusxalandi: ' + url); } catch (e) { prompt('Havolani nusxalang:', url); }
};
function readHash() { const m = location.hash.match(/^#(uy|daraxt|otov)-(\d+)$/); if (m && info) focusItem(m[1], +m[2] - 1); else if (info && PLACES[location.hash.slice(1)]) focusPlace(location.hash.slice(1)); }
// Joylar: hokimiyat, stadion, layklar bog'i, izohlar shaharchasi
const PLACES = {
  hokimiyat: () => { const H = info.hok; return { pos: [34, 24, H.front + 34], tgt: [0, 8, H.cz + 4], title: '🏛️ YERLIFE Hokimiyati', nick: hokim ? 'Hokim: @' + hokim : 'Hokim: ???', info: hokim ? 'Shahar hokimi' : 'Hokim videoda aniqlanadi 👀' }; },
  stadion: () => { const s = info.st; return { pos: [s.cx + s.ax + 70, 55, s.cz + 70], tgt: [s.cx, 0, s.cz], title: '🏟️ YERLIFE ARENA', nick: 'Stadion', info: 'Shahar stadioni ⚽' }; },
  bog: () => { const g = info.garden; return { pos: [g.x0 - 40, 45, 40], tgt: [g.x0 + 40, 0, 0], title: '🌳 Layklar shaharchasi', nick: fmt(Math.max(likeTotal, trees.length)) + ' ta daraxt', info: 'Har bir layk — bitta daraxt ❤' }; },
  otovlar: () => { const c = info.com; return { pos: [30, 40, c.z0 - 40], tgt: [0, 0, c.z0 + 40], title: "⛺ Izohlar shaharchasi", nick: fmt(comments.filter(alive).length) + " ta o'tov", info: "Har bir izoh — bitta o'tov 💬" }; },
};
function focusPlace(name) {
  if (mode === 'room') exitRoom(); if (mode === 'walk') setMode('top');
  clearHL(); const p = PLACES[name](); flyTo(new THREE.Vector3(...p.pos), new THREE.Vector3(...p.tgt));
  card.kind = name; card.i = -1; $('cTitle').textContent = p.title; $('cNick').textContent = p.nick; $('cInfo').textContent = p.info; $('cMe').style.display = 'none'; $('card').classList.add('on');
}
addEventListener('hashchange', readHash);

// uyni bosish (tepadan ko'rish rejimida)
const ray = new THREE.Raycaster(), mv = new THREE.Vector2(); let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; if (fly) fly = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (mode !== 'top' || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  mv.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(mv, camera);
  const places = [['hokimiyat', W.hall], ['stadion', W.stadium], ['bog', W.garden], ['otovlar', W.comTown]].filter(p => p[1]);
  const hits = ray.intersectObjects([...buildings.pickMeshes(), ...places.map(p => p[1])], true);
  if (!hits[0]) return;
  let o = hits[0].object; while (o && !places.some(p => p[1] === o)) o = o.parent;
  if (o) { const p = places.find(p => p[1] === o)[0]; if (location.hash === '#' + p) focusPlace(p); else location.hash = p; }
  else location.hash = 'uy-' + (buildings.residentFromHit(hits[0].object, hits[0].instanceId) + 1);
});

// ---------- kun / tun ----------
const darkQ = matchMedia('(prefers-color-scheme: dark)');
let night = false;
function nightApply() {
  night = Q.get('tun') ? true : Q.get('kun') ? false : darkQ.matches;
  sky.setNight(night, scene); setNightBuildings(night); setNightCity(night);
  if (W.lamps) W.lamps.userData.glow.visible = night;
  W.hall?.traverse(o => { if (o.userData.night) o.material.emissiveIntensity = night ? .9 : 0; });
  hemi.color.set(night ? 0x4a5f95 : 0xdfeeff); hemi.groundColor.set(night ? 0x1f2a3a : 0x4a5a35); hemi.intensity = night ? 1.25 : .9;
  sunL.color.set(night ? 0xa9bcff : 0xfff1dc); sunL.intensity = night ? .9 : 3;
  scene.fog.color.set(night ? 0x0b1426 : 0xcfdbe3);
  renderer.toneMappingExposure = night ? 1.0 : .55;
  document.body.classList.toggle('night', night);
}
darkQ.addEventListener?.('change', nightApply);

// ---------- admin ----------
if (ADMIN) {
  $('adminBtn').style.display = '';
  $('adminBtn').onclick = () => $('admin').classList.toggle('on');
  $('aClose').onclick = () => $('admin').classList.remove('on');
  const call = async (body) => { const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: ADMIN, ...body }) }); const j = await r.json().catch(() => ({ error: 'Server javob bermadi' })); if (!r.ok || j.error) throw new Error(j.error || r.status); return j; };
  $('aAdd').onclick = async () => {
    const kind = $('aKind').value, names = $('aNames').value.split(/\r?\n/).map(s => s.trim().replace(/^@/, '')).filter(Boolean);
    if (!names.length) return toast('Nik yozing');
    try {
      const j = await call({ op: 'add', kind, names });
      $('aOut').value = j.added.map(a => kind === 'res' ? `@${a.n}, tabriklaymiz! Siz YERLIFE shaharchasiga qo'shildingiz 🏠 Uyingiz: №${a.num}` : kind === 'com' ? `@${a.n}, izoh uchun rahmat! Siz uchun Izohlar shaharchasida o'tov qurildi 💬 O'tovingiz: №${a.num}` : `@${a.n}, layk uchun rahmat! Siz uchun Layklar shaharchasida daraxt ekildi 🌳 Daraxtingiz: №${a.num}`).join('\n');
      toast(`Qo'shildi: ${j.added.length}, takroriy (o'tkazildi): ${j.skipped.length}`); $('aNames').value = ''; await loadData(); build();
    } catch (e) { toast('Xato: ' + e.message); }
  };
  $('aCopy').onclick = async () => { try { await navigator.clipboard.writeText($('aOut').value); toast('Javoblar nusxalandi'); } catch (e) { $('aOut').select(); } };
  $('aHokim').onclick = async () => { try { const j = await call({ op: 'hokim', n: $('aNick').value.trim().replace(/^@/, '') }); toast(j.hokim ? `🏛️ Hokim: @${j.hokim}` : 'Hokim olib tashlandi'); await loadData(); build(); } catch (e) { toast('Xato: ' + e.message); } };
  $('aLikesBtn').onclick = async () => { try { const j = await call({ op: 'likes', v: +$('aLikes').value }); toast(`🌳 Jami daraxt: ${j.likeTotal}`); await loadData(); build(); } catch (e) { toast('Xato: ' + e.message); } };
  $('aLvl').onclick = async () => { try { const j = await call({ op: 'level', n: $('aNick').value.trim().replace(/^@/, ''), l: +$('aLevel').value }); toast(`@${j.n} → ${LEVEL_NAMES[j.l]}`); await loadData(); build(); } catch (e) { toast('Xato: ' + e.message); } };
  $('aDel').onclick = async () => { const n = $('aNick').value.trim().replace(/^@/, ''); if (!n || !confirm(`@${n} o'chirilsinmi? (${{ res: 'uy', tree: 'daraxt', com: "o'tov" }[$('aKind').value]})`)) return; try { await call({ op: 'del', kind: $('aKind').value, n }); toast(`@${n} o'chirildi`); await loadData(); build(); } catch (e) { toast('Xato: ' + e.message); } };
}

// ---------- asosiy tsikl ----------
const clock = new THREE.Clock(); let tAcc = 0;
// Avto-sifat: kadrlar sekinlashsa avval aniqlik, keyin soyalar pasaytiriladi
const Qual = { ms: 16, n: 0, step: 0, pr: Math.min(devicePixelRatio, isMobile ? 1.5 : 2) };
function autoQuality(rawDt) {
  if (document.hidden || rawDt > 1) return; Qual.ms += (rawDt * 1000 - Qual.ms) * .05;
  if (++Qual.n < 90) return; // har ~90 kadrda bir marta qaror
  Qual.n = 0; if (Qual.ms < 36 || Qual.step >= 4) return; Qual.step++;
  if (Qual.step === 1) renderer.setPixelRatio(Math.min(Qual.pr, 1));
  else if (Qual.step === 2) { renderer.shadowMap.type = THREE.PCFShadowMap; sunL.shadow.mapSize.set(1024, 1024); if (sunL.shadow.map) { sunL.shadow.map.dispose(); sunL.shadow.map = null; } scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); }
  else if (Qual.step === 3) renderer.setPixelRatio(.75);
  else { sunL.castShadow = false; renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; }); }
  Qual.ms = 16; console.log('Avto-sifat bosqichi:', Qual.step);
}
function tick() {
  requestAnimationFrame(tick);
  const rawDt = clock.getDelta(), dt = Math.min(.05, rawDt), now = performance.now(); windUniform.value += dt; autoQuality(rawDt);
  if (fly) { const t = Math.min(1, (now - fly.t0) / fly.dur), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; camera.position.lerpVectors(fly.fp, fly.tp, e); controls.target.lerpVectors(fly.ft, fly.tt, e); if (t >= 1) fly = null; }
  if (mode === 'top') controls.update(); else updateWalk(dt);
  cars.update(dt); updateWalkers(dt); crowd.commit(); clouds.update(dt, night); sky.follow(camera);
  if ((tAcc += dt) > .35) { tAcc = 0; nearTick(); }
  // eshik yaqinligi
  if (mode === 'walk') {
    doorNear = -1; spot = spotNear(); const b = $('enter');
    $('exit').classList.toggle('on', spot === 'stOut');
    if (spot === 'hall' || spot === 'stIn') { b.textContent = (spot === 'hall' ? '🏛️ Hokimiyatga kirish' : '🏟️ Stadionga kirish') + (isMobile ? '' : '  (E)'); b.classList.add('on'); }
    else if (inSt) b.classList.remove('on');
    else {
      let best = 9;
      for (const i of nearRes.slice(0, 30)) { const [dx, dz] = doorPos(i), d = (dx - P.x) ** 2 + (dz - P.z) ** 2; if (d < best) { best = d; doorNear = i; } }
      if (doorNear >= 0) { b.textContent = '🚪 Kirish: @' + residents[doorNear].n + (isMobile ? '' : '  (E)'); b.classList.add('on'); } else b.classList.remove('on');
    }
  } else if (mode === 'room') { nearExit = Math.hypot(P.x - room.door.x, P.z - room.door.z) < 1.9; $('exit').classList.toggle('on', nearExit); }
  // soya kamerasi diqqat nuqtasiga ergashadi
  const f = mode === 'top' ? controls.target : player.position, ext = mode === 'top' ? THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * .55, 60, 420) : 45;
  const sd = night ? sky.moonDir : sky.sun; sunL.position.copy(f).addScaledVector(sd, 900); sunL.target.position.copy(f);
  const sc = sunL.shadow.camera; if (Math.abs(sc.right - ext) > ext * .1) { sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.near = 100; sc.far = 2000; sc.updateProjectionMatrix(); }
  scene.fog.near = mode === 'top' ? camera.position.distanceTo(controls.target) * .9 : 160; scene.fog.far = scene.fog.near + (mode === 'top' ? 3000 : 700);
  live.update(dt, mode === 'top' ? null : { x: P.x, z: P.z, r: P.rot, y: P.y, w: mode === 'room' ? roomKey : 'o' }, camera, mode === 'room' ? room.scene : scene);
  if (mode === 'room') renderer.render(room.scene, camera); else { renderer.render(scene, camera); labels(); }
  if (mode === 'room') for (const p of plq) p.style.display = 'none';
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- ishga tushirish ----------
(async () => {
  await loadData(); build(); setMode('top'); topView(true);
  $('loading').classList.add('off'); tick();
  if (location.hash) setTimeout(readHash, 300);
  setInterval(async () => { if (await loadData()) build(); }, 30000);
})();
window.__city = { renderer, scene, sunL, Qual, get residents() { return residents; }, get mode() { return mode; }, focusItem, spawnAs, get P() { return P; }, get info() { return info; },
  view(x, y, z, tx, ty, tz) { if (mode !== 'top') { if (mode === 'room') exitRoom(); setMode('top'); } fly = null; camera.position.set(x, y, z); controls.target.set(tx, ty, tz); } };
