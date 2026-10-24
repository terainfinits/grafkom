import * as THREE from 'three';

/*
 * Motif Ulos (Batak, Sumatera Utara) — gaya Ulos Sadum: dasar merah tua dengan pakan
 * tambahan berwarna-warni (kuning, hijau, jingga, putih, merah) & pita garis berbenang emas.
 * Hanya tekstur (tanpa geometri/pajangan). Dibuat dari foto referensi close-up tenunan.
 *
 * Info koleksi (nama, asal, deskripsi, ...) ada di data/artifacts.js; file ini khusus motif.
 *
 * Pemakaian:
 *   import { createUlosTextures } from './textiles/ulosPattern.js';
 *   const t = createUlosTextures();
 *   // t.tileSize = ukuran satu ulangan motif dalam meter → atur repeat sesuai ukuran kain
 *   for (const map of [t.color, t.bump, t.rough, t.metal]) map.repeat.set(kainLebar / t.tileSize.width, kainTinggi / t.tileSize.height);
 *   const mat = new THREE.MeshStandardMaterial({
 *     map: t.color, bumpMap: t.bump, bumpScale: 1.5, roughnessMap: t.rough, roughness: 1,
 *     metalnessMap: t.metal, metalness: 1, side: THREE.DoubleSide,
 *   });
 *
 * Susunan satu ulangan (atas → bawah), mengikuti foto:
 *   A  deretan figur (manusia/pohon) bergantian warna, dihubungkan garis zig-zag di kaki
 *   B  pita garis: titik putih · merah · benang emas · merah · titik putih
 *   C  segitiga besar berselang naik-turun, berisi titik & bintang kecil, bertepi putih
 *   B  pita garis
 *   E  deretan bunga kecil (empat kelopak) berjarak
 *   B  pita garis
 *   G  jala belah ketupat bertangga dari gugus titik
 *   B  pita garis (penutup)
 * Tekstur menyambung tanpa sambungan ke kiri-kanan & atas-bawah (RepeatWrapping).
 */

// Satu sel = satu "titik" pakan tambahan (± 3 mm, seperti pada foto)
const CELL_M = 0.003;
const CELL_PX = 12;
const COLS = 80;   // 80 sel = 24 cm, harus kelipatan periode motif (10 & 20) supaya menyambung
const ROWS = 104;  // 104 sel = 31,2 cm

const C = {
  ground: '#6e1212',
  groundDark: '#4e0b0b',
  yellow: '#eda31a',
  green: '#1d8a3c',
  orange: '#f25a1f',
  white: '#f1efe8',
  red: '#df1f1b',
  gold: '#e7b23a',
};

export function createUlosTextures() {
  const W = COLS * CELL_PX, H = ROWS * CELL_PX;
  const color = canvas2d(W, H), bump = canvas2d(W, H), rough = canvas2d(W, H), metal = canvas2d(W, H);
  const rng = mulberry32(7);

  // ---------- Dasar: tenunan merah tua (garis lungsin-pakan halus + belang samar) ----------
  color.fillStyle = C.ground; color.fillRect(0, 0, W, H);
  bump.fillStyle = '#606060'; bump.fillRect(0, 0, W, H);
  rough.fillStyle = '#c8c8c8'; rough.fillRect(0, 0, W, H);
  metal.fillStyle = '#000000'; metal.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) {
    color.fillStyle = `rgba(0,0,0,${y % 4 ? 0.10 : 0.04})`; color.fillRect(0, y, W, 1);
    bump.fillStyle = y % 4 ? '#585858' : '#6a6a6a'; bump.fillRect(0, y, W, 1);
  }
  for (let x = 0; x < W; x += 3) {
    color.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.03})`; color.fillRect(x, 0, 1, H);
  }

  // ---------- Titik pakan tambahan: benang mengapung, sedikit menonjol & lebih licin ----------
  const dot = (cx, cy, fill, { w = 0.82, h = 0.62, shine = true } = {}) => {
    const x = (((cx % COLS) + COLS) % COLS) * CELL_PX, y = cy * CELL_PX;
    for (const dx of x + CELL_PX > W ? [0, -W] : [0]) { // sambung di tepi kiri-kanan
      const px = x + dx + (CELL_PX * (1 - w)) / 2, py = y + (CELL_PX * (1 - h)) / 2;
      const pw = CELL_PX * w, ph = CELL_PX * h;
      roundRect(color, px, py, pw, ph, ph / 2, fill);
      if (shine) roundRect(color, px + pw * 0.15, py + ph * 0.15, pw * 0.7, ph * 0.3, ph * 0.15, 'rgba(255,255,255,0.22)');
      roundRect(bump, px, py, pw, ph, ph / 2, '#d8d8d8');
      roundRect(rough, px, py, pw, ph, ph / 2, '#6c6c6c');
      if (fill === C.gold) roundRect(metal, px, py, pw, ph, ph / 2, '#b0b0b0');
    }
  };
  const fromTemplate = (rows, x0, y0, fill) => rows.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) if (line[c] === '#') dot(x0 + c, y0 + r, fill);
  });

  let y = 1;
  y = bandFigures(y, dot, fromTemplate);
  y = bandStripes(y, dot);
  y = bandTriangles(y, dot);
  y = bandStripes(y, dot);
  y = bandFlowers(y, dot, fromTemplate);
  y = bandStripes(y, dot);
  y = bandDiamonds(y, dot);
  bandStripes(y, dot); // penutup → saat diulang, bertemu pita figur di ulangan berikutnya

  // sedikit benang tidak rata (variasi kecerahan acak) supaya tidak terlihat seperti cetakan
  for (let i = 0; i < 2500; i++) {
    color.fillStyle = `rgba(${rng() < 0.5 ? '0,0,0' : '255,255,255'},0.06)`;
    color.fillRect(rng() * W, rng() * H, 2 + rng() * 6, 1);
  }

  const tex = (ctx, srgb) => {
    const t = new THREE.CanvasTexture(ctx.canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return {
    color: tex(color, true), bump: tex(bump, false), rough: tex(rough, false), metal: tex(metal, false),
    tileSize: { width: COLS * CELL_M, height: ROWS * CELL_M },
  };
}

// ---------------------------------------------------------------------------
// Pita-pita motif (semua dalam satuan sel). Masing-masing mengembalikan baris berikutnya.
// ---------------------------------------------------------------------------

// A: deretan figur bergantian warna, kaki dihubungkan garis zig-zag
function bandFigures(y0, dot, fromTemplate) {
  // figur leluhur/pohon hayat: kepala, tangan terangkat, badan beruas, kaki melebar.
  // Lebar 10 sel = periode, jadi ujung kaki menyambung dengan figur sebelahnya.
  const FIG = [
    '....##....',
    '...####...',
    '....##....',
    '##..##..##',
    '.##.##.##.',
    '..######..',
    '....##....',
    '...####...',
    '..######..',
    '...####...',
    '....##....',
    '...####...',
    '..######..',
    '.##.##.##.',
    '##..##..##',
    '#...##...#',
    '...#..#...',
    '..#....#..',
  ];
  const colors = [C.yellow, C.green, C.orange, C.white, C.red, C.orange, C.white, C.green];
  for (let k = 0; k < COLS / 10; k++) {
    const x = k * 10;
    fromTemplate(FIG, x, y0, colors[k]);
  }
  return y0 + 20;
}

// B: pita garis bertitik dengan benang emas di tengah
function bandStripes(y0, dot) {
  const fine = { w: 0.55, h: 0.5, shine: false };
  const line = { w: 1.04, h: 0.7, shine: false };
  for (let x = 0; x < COLS; x++) {
    dot(x, y0 + 0.5, x % 2 ? C.white : C.red, fine);       // titik putih-merah berselang
    dot(x, y0 + 1.3, C.red, line);
    dot(x, y0 + 2.2, C.gold, { w: 1.04, h: 0.8 });         // benang emas
    dot(x, y0 + 3.0, C.orange, line);
    dot(x, y0 + 3.8, C.gold, { w: 1.04, h: 0.8 });
    dot(x, y0 + 4.7, C.red, line);
    dot(x, y0 + 5.5, x % 2 ? C.red : C.white, fine);
  }
  return y0 + 7;
}

// C: segitiga besar berselang naik & turun. Tiap segitiga berisi titik berselang (seperti
// tenunan pada foto), bertepi putih, dengan bintang kecil di tengahnya.
function bandTriangles(y0, dot) {
  const H = 22, HALF = 10;
  const upColors = [C.orange, C.yellow, C.green, C.white];
  const downColors = [C.red, C.green, C.white, C.yellow];
  const inner = { [C.orange]: C.red, [C.yellow]: C.green, [C.green]: C.yellow, [C.white]: C.orange, [C.red]: C.orange };
  for (let k = 0; k < COLS / (HALF * 2); k++) {
    for (const up of [true, false]) {
      const cx = k * HALF * 2 + (up ? HALF : 0); // segitiga turun berpusat di antara dua segitiga naik
      const fill = (up ? upColors : downColors)[k % 4];
      const edgeColor = fill === C.white ? C.red : C.white;
      for (let r = 0; r < H; r++) {
        const level = up ? H - 1 - r : r;                 // 0 = ujung segitiga
        const half = Math.round((level / (H - 1)) * (HALF - 1));
        for (let dx = -half; dx <= half; dx++) {
          const fromEdge = half - Math.abs(dx);
          if (fromEdge <= 1 || level >= H - 2) dot(cx + dx, y0 + r, edgeColor);   // tepi tebal 2 sel
          else if (fromEdge >= 4 && level >= 8 && level <= H - 6) {                 // segitiga dalam
            if ((dx + r) % 2 === 0) dot(cx + dx, y0 + r, inner[fill]);
          } else if (fromEdge >= 3) dot(cx + dx, y0 + r, fill);
        }
      }
      // bintang kecil (gugus plus) di tengah segitiga, warna kontras
      const sy = y0 + (up ? Math.round(H * 0.66) : Math.round(H * 0.33));
      const star = fill === C.white ? C.red : C.white;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) dot(cx + dx, sy + dy, star);
    }
  }
  return y0 + H + 1;
}

// E: deretan bunga kecil empat kelopak, berjarak, bergantian warna
function bandFlowers(y0, dot, fromTemplate) {
  const FLOWER = ['..#..', '.###.', '##.##', '.###.', '..#..'];
  const colors = [C.orange, C.white, C.red, C.yellow];
  for (let k = 0; k < COLS / 20; k++) fromTemplate(FLOWER, k * 20 + 8, y0 + 1, colors[k % 4]);
  return y0 + 7;
}

// G: jala belah ketupat bertangga dari gugus titik 2 × 2, warna bergantian
function bandDiamonds(y0, dot) {
  const H = 24, P = 20; // tinggi pita & periode mendatar
  const colors = [C.white, C.orange, C.green, C.yellow, C.red];
  for (let r = 0; r < H; r += 2) {
    for (let x = 0; x < COLS; x += 2) {
      // jarak "berlian" (Manhattan) ke pusat sel terdekat → garis-garis belah ketupat konsentris
      const lx = ((x % P) + P) % P - P / 2, ly = r - H / 2;
      const d = Math.abs(lx) + Math.abs(ly);
      if (d % 6 !== 0) continue;
      const fill = colors[(Math.floor(x / P) + d / 6) % colors.length];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) dot(x + dx, y0 + r + dy, fill);
    }
  }
  return y0 + H;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function canvas2d(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c.getContext('2d');
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
