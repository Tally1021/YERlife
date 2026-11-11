// Umumiy yordamchilar: tasodif, shovqin, teksturalar, geometriya
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const rng = (seed) => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 1e9) / 1e9; }; };
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (i, j) => hash(i * 57.0 + j * 113.0);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export const fbm = (x, y) => { let f = 0, a = .5; for (let i = 0; i < 5; i++) { f += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= .5; } return f; };

export const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 700;

// ---------- canvas teksturalar ----------
export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (!opts.linear) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (opts.repeat) t.repeat.set(...opts.repeat); return t;
}
export function noiseFill(g, w, h, base, amt = 18, n = 3000, seed = 7) {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < n; i++) { const v = (r() - .5) * amt; g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 100})` : `rgba(0,0,0,${-v / 100})`; g.fillRect(r() * w, r() * h, 2 + r() * 2, 2 + r() * 2); }
}
export function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// Yozuvli taxta (ko'rsatkichlar uchun)
export function signTex(lines, { w = 512, h = 128, bg = '#1f4d2b', fg = '#ffffff', border = '#e9d9a6', font = 'bold 56px system-ui' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = border; roundRect(g, 0, 0, w, h, 18); g.fill();
    g.fillStyle = bg; roundRect(g, 8, 8, w - 16, h - 16, 12); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const L = Array.isArray(lines) ? lines : [lines];
    L.forEach((t, i) => { g.font = i === 0 ? font : font.replace(/\d+px/, m => (parseInt(m) * .55 | 0) + 'px'); const mw = w - 40, tw = g.measureText(t).width; if (tw > mw) g.font = g.font.replace(/\d+px/, m => (parseInt(m) * mw / tw | 0) + 'px'); g.fillText(t, w / 2, h / 2 + (i - (L.length - 1) / 2) * h * .36); });
  });
}

// ---------- geometriya ----------
// Har bir bo'lakni indekssiz qilib, vertex rang beradi (birlashtirish uchun)
export function part(geo, color = '#ffffff') {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}
export function box(w, h, d, x = 0, y = 0, z = 0, color, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y + h / 2, z); return part(g, color);
}
export function cyl(rt, rb, h, x = 0, y = 0, z = 0, color, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(x, y + h / 2, z); return part(g, color);
}
export function cone(r, h, x = 0, y = 0, z = 0, color, seg = 10) {
  const g = new THREE.ConeGeometry(r, h, seg); g.translate(x, y + h / 2, z); return part(g, color);
}
export function merge(list) { const m = mergeGeometries(list.filter(Boolean)); m.computeBoundingSphere(); return m; }

// Uchburchak prizma tom (tizma x o'qi bo'ylab), asosi y=0, balandligi 1
export function roofGeo() {
  const o = .5, P = [-o, 0, o, o, 0, o, o, 1, 0, -o, 0, o, o, 1, 0, -o, 1, 0, o, 0, -o, -o, 0, -o, -o, 1, 0, o, 0, -o, -o, 1, 0, o, 1, 0, o, 0, o, o, 0, -o, o, 1, 0, -o, 0, -o, -o, 0, o, -o, 1, 0];
  const U = [0, 0, 2, 0, 2, 1.4, 0, 0, 2, 1.4, 0, 1.4, 0, 0, 2, 0, 2, 1.4, 0, 0, 2, 1.4, 0, 1.4, 0, 0, 1, 0, .5, .5, 0, 0, 1, 0, .5, .5];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); return g;
}

// Box UV'larini yon tomonlarda takrorlash (qavatlar uchun)
export function boxUV(g, ru, rv) {
  const uv = g.attributes.uv; // guruhlar: +x,-x,+y,-y,+z,-z — har biri 4 vertex
  for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); if (face === 2 || face === 3) continue; uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); }
  return g;
}

// Yo'l bo'yicha lenta (strip) geometriya: pts [[x,z],...], uv.u = uzunlik / uvScale
export function stripGeo(pts, width, y, uvScale = 1, closed = false) {
  const P = [], U = [], I = []; let L = 0; const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz * width / 2, nz = dx * width / 2;
    if (i > 0) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    P.push(p[0] + nx, y, p[1] + nz, p[0] - nx, y, p[1] - nz); U.push(L / uvScale, 0, L / uvScale, 1);
    if (i < n - 1 || closed) { const j = i * 2, k = ((i + 1) % n) * 2; I.push(j, k, j + 1, j + 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I); g.computeVertexNormals();
  // normal doim yuqoriga qarasin
  const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
  return g;
}
export const circlePts = (r, seg = 128) => Array.from({ length: seg }, (_, i) => { const a = i / seg * Math.PI * 2; return [Math.cos(a) * r, Math.sin(a) * r]; });

// Instanced mesh yaratish
export function inst(geo, mat, n, { shadow = true, receive = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = 0;
  // rang buferi oldindan bo'lsin (aks holda shader rangsiz kompilyatsiya bo'lib qoladi)
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3).fill(1), 3); m.castShadow = shadow; m.receiveShadow = receive; m.frustumCulled = false; return m;
}
export const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _S = new THREE.Vector3(), _P = new THREE.Vector3(), _E = new THREE.Euler();
export const UP = new THREE.Vector3(0, 1, 0);
export function compose(x, y, z, ry, sx = 1, sy = 1, sz = 1, out = _M) { _Q.setFromAxisAngle(UP, ry); return out.compose(_P.set(x, y, z), _Q, _S.set(sx, sy, sz)); }
export const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// Shamol tebranishi (daraxtlar uchun) — vertex shaderga qo'shiladi
export const windUniform = { value: 0 };
export function addWind(mat, amount = .05) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windUniform;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.);
      #endif
      float hgt = max(0., transformed.y - 1.2);
      float ph = uTime * 1.3 + ip.x * .21 + ip.z * .17;
      transformed.x += sin(ph) * ${amount.toFixed(3)} * hgt + sin(ph * 2.7 + transformed.y) * .015 * hgt;
      transformed.z += cos(ph * .8) * ${(amount * .7).toFixed(3)} * hgt;`);
  };
  mat.customProgramCacheKey = () => 'wind' + amount;
  return mat;
}
