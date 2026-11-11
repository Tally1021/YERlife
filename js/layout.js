// Shahar rejasi: markaziy maydon, aylana ko'chalar, radial ko'chalar, uy joylari (slot), bog', stadion.
// Har bir uy raqami (indeks) doim bir joyda qoladi — yangi aholi qo'shilsa ham eski uylar siljimaydi.

export const PLAZA = 22;       // birinchi aylana ko'cha radiusi
export const D = 38;           // aylana ko'chalar orasidagi masofa
export const ROAD = 7;         // aylana ko'cha kengligi
export const AVW = 9;          // radial ko'cha kengligi
export const SIDE = 2.2;       // yo'lka kengligi
export const SET = 3;          // yo'lkadan uy old devorigacha (hovli)
export const SPACING = 10.5;   // uylar orasidagi masofa
export const AVN = 8;          // radial ko'chalar soni
export const MAHALLA = 100;    // har 100 uy = 1 mahalla

export const ringR = (k) => PLAZA + k * D;
export const avAngle = (j) => j * Math.PI * 2 / AVN;

const slots = [];
let genBand = 0;
function genBandSlots(k) {
  const rows = [
    { r: ringR(k) + ROAD / 2 + SIDE + SET, f: -1 },     // ichki qator — eshik markaz tomondagi ko'chaga
    { r: ringR(k + 1) - ROAD / 2 - SIDE - SET, f: 1 },  // tashqi qator — eshik tashqi ko'chaga
  ];
  for (const { r, f } of rows) {
    const n = Math.floor(2 * Math.PI * r / SPACING), step = 2 * Math.PI / n;
    for (let i = 0; i < n; i++) {
      const a = (i + .5) * step + k * .13;
      // radial ko'cha ustiga tushadigan joylarni o'tkazib yuborish
      let skip = false;
      for (let j = 0; j < AVN; j++) {
        let da = Math.abs(((a - avAngle(j)) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        if (da * r < AVW / 2 + SIDE + SPACING / 2 + 1) { skip = true; break; }
      }
      if (skip) continue;
      const c = Math.cos(a), s = Math.sin(a);
      // fx,fz — eshik qaragan yo'nalish; x,z — uy old chizig'i markazi
      slots.push({ x: c * r, z: s * r, a, r, k, f, fx: c * f, fz: s * f, rot: Math.atan2(c * f, s * f) });
    }
  }
}
export function ensureSlots(n) { while (slots.length < n) genBandSlots(genBand++); return slots; }
export const slot = (i) => (ensureSlots(i + 1), slots[i]);

// Shahar o'lchamlari (aholi soni va daraxtlar soniga qarab)
export function cityInfo(nRes, nTrees, nCom = 0) {
  ensureSlots(Math.max(1, nRes));
  const lastK = nRes ? slots[nRes - 1].k : 0;
  const K = lastK + 1;                      // eng tashqi aylana ko'cha indeksi
  const cityR = ringR(K);
  // Layklar bog'i: shahar sharqida (+x)
  // aylana shaklida: daraxtlar markazdan boshlab halqa-halqa ekiladi (darvoza tomonda yo'lak uchun bo'shliq)
  const cell = 5, R0 = 10, GAP = 5, rings = []; let tot = 0;
  for (let k = 0; tot < Math.max(40, nTrees) || k < 3; k++) { const r = R0 + k * cell, n = Math.floor((2 * Math.PI * r - GAP) / cell); rings.push({ r, n, start: tot }); tot += n; }
  const GR = rings[rings.length - 1].r + cell / 2 + 3;
  const garden = { round: true, x0: cityR + ROAD / 2 + 16, cell, rings, slots: tot, R: GR, gap: GAP, W: GR * 2, Dp: GR * 2 };
  garden.z0 = -GR; garden.cx = garden.x0 + GR;
  // Stadion: shahar g'arbida (-x)
  const st = { cx: -(cityR + 20 + 52), cz: 0, ax: 46, bz: 60, iax: 25, ibz: 37 };
  // Izohlar shaharchasi: shahar janubida (+z), o'rtasida ko'cha
  const cc = 40, cs = 9, crows = Math.max(4, Math.ceil(nCom / cc) + 1), MID = 8;
  const com = { z0: cityR + ROAD / 2 + 16, cols: cc, rows: crows, cell: cs, mid: MID, W: cc * cs + 8 + MID, Dp: crows * cs + 8 };
  com.x0 = -com.W / 2;
  // Hokimiyat: shahar shimolida (-z), old tomoni shaharga qaragan
  const hok = { w: 44, d: 26, cz: -(cityR + ROAD / 2 + 10 + 40 + 13) }; hok.front = hok.cz + hok.d / 2 + 40;
  const far = Math.max(garden.x0 + garden.Dp, -st.cx + st.ax, cityR, Math.hypot(com.W / 2, com.z0 + com.Dp), -hok.cz + 30) + 40;
  return { K, cityR, garden, st, com, hok, flat: far };
}
export function treePos(j, g) {
  let lo = 0, hi = g.rings.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (g.rings[m].start <= j) lo = m; else hi = m - 1; }
  const R = g.rings[lo], i = Math.min(j - R.start, R.n - 1), d = g.gap / 2 / R.r;                       // d — darvoza yo'lagi uchun burchak bo'shlig'i
  const a = Math.PI + d + (i + .5) / R.n * (2 * Math.PI - 2 * d);                                        // -x (darvoza) tomondan boshlab aylanadi
  const jx = (Math.sin(j * 12.9898) * 43758.5453 % 1) * .7, jz = (Math.sin(j * 78.233) * 12543.123 % 1) * .7;
  return { x: g.cx + Math.cos(a) * R.r + jx, z: Math.sin(a) * R.r + jz };
}

// O'tov joyi: o'rta ko'chaning ikki tomonida qatorlar, eshik o'rta ko'chaga qaragan
export function yurtPos(j, c) {
  const row = Math.floor(j / c.cols), col = j % c.cols, half = c.cols / 2;
  const jx = (Math.sin(j * 91.7) * 43758.5453 % 1) * .7, jz = (Math.sin(j * 27.1) * 12543.123 % 1) * .7;
  const x = c.x0 + 4 + c.cell / 2 + col * c.cell + (col >= half ? c.mid : 0) + jx;
  const z = c.z0 + 4 + c.cell / 2 + row * c.cell + jz;
  return { x, z, rot: x > 0 ? -Math.PI / 2 : Math.PI / 2 };
}
