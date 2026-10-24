import * as THREE from 'three';

/*
 * Motif Kain Cual (Bangka Belitung), dari foto referensi. Hanya tekstur (tanpa geometri).
 *
 * Dua pilihan:
 *
 *   createCualTextures({ width = 2.0, height = 0.9 })
 *     → kain UTUH seperti foto (dipetakan ke UV 0..1, repeat 1):
 *
 *        ┌──┬────────┬──────────────────────────────┬────────┬──┐
 *        │  │ ✿ ✿ ▶  │  ~~~~ pita tepi ~~~~          │  ◀ ✿ ✿ │  │
 *        │  │ ✿ ✿ ▶  │  ❀  ⸙  ❀  ⸙  badan ikat bunga │  ◀ ✿ ✿ │  │
 *        │  │ ✿ ✿ ▶  │  ⸙  ❀  ⸙  ❀                   │  ◀ ✿ ✿ │  │
 *        │  │ ✿ ✿ ▶  │  ~~~~ pita tepi ~~~~          │  ◀ ✿ ✿ │  │
 *        └──┴────────┴──────────────────────────────┴────────┴──┘
 *         tepi  kepala kain: taburan bunga emas + pucuk rebung (tumpal) emas
 *
 *   createCualBodyTextures()
 *     → hanya motif badan (ikat bunga), bisa diulang tanpa sambungan; tileSize = 16 × 16 cm.
 *
 * Keduanya mengembalikan { color, bump, rough, metal, ... } berupa THREE.CanvasTexture.
 * Pakai dengan MeshStandardMaterial: map, bumpMap (bumpScale ± 1), roughnessMap (roughness 1),
 * metalnessMap (metalness 1) — benang emas songket berkilau, kain ikat tetap kusam.
 */

const PALETTE = {
  red: '#a8161b',       // dasar badan
  redBright: '#bd1220', // dasar kepala kain & tepi (merah tua cerah)
  maroon: '#7e0f16',
  cream: '#f3e3b5',
  yellow: '#efc23c',
  dark: '#3e1d14',
  gold: '#e2b24a',
  goldDark: '#a87a26',
};

// ---------------------------------------------------------------------------
// Badan: ikat bunga (tileable)
// ---------------------------------------------------------------------------

const BODY_CELLS = 32;        // 32 × 32 sel per ulangan
const BODY_CELL_M = 0.004;    // 1 sel = 4 mm → 12,8 cm per ulangan
const BODY_CELL_PX = 10;

export function createCualBodyTextures() {
  const canvas = drawBodyTile();
  const S = canvas.width;
  const bump = canvas2d(S, S), rough = canvas2d(S, S), metal = canvas2d(S, S);
  weaveBase(bump, S, S, '#707070');
  rough.fillStyle = '#cfcfcf'; rough.fillRect(0, 0, S, S);
  metal.fillStyle = '#000000'; metal.fillRect(0, 0, S, S);
  const t = (c, srgb) => repeatTexture(c, srgb);
  return {
    color: t(canvas, true), bump: t(bump.canvas, false), rough: t(rough.canvas, false), metal: t(metal.canvas, false),
    tileSize: { width: BODY_CELLS * BODY_CELL_M, height: BODY_CELLS * BODY_CELL_M },
  };
}

// Motif digambar per sel (seperti benang ikat yang diikat-celup), lalu tiap baris digeser
// acak ±1 sel → tepi motif bertangga & "meleset" khas tenun ikat. Akhirnya diburamkan sedikit
// (warna merembes) dan diberi coretan mendatar searah benang pakan.
function drawBodyTile() {
  const N = BODY_CELLS;
  const grid = Array.from({ length: N }, () => new Array(N).fill(null));
  const rng = mulberry32(12);
  const jitter = Array.from({ length: N }, () => (rng() < 0.3 ? (rng() < 0.5 ? -1 : 1) : 0));
  const set = (x, y, c) => {
    const yy = ((Math.round(y) % N) + N) % N;
    const xx = (((Math.round(x) + jitter[yy]) % N) + N) % N;
    grid[yy][xx] = c;
  };

  // roset (bunga 8 kelopak) di (8,8) & (24,24), tunas daun di (24,8) & (8,24),
  // garis penghubung diagonal & bunga kecil di sudut → bidang rapat seperti foto
  for (const [cx, cy] of [[8, 8], [24, 24]]) rosette(set, cx, cy);
  for (const [cx, cy, flip] of [[24, 8, 1], [8, 24, -1]]) sprig(set, cx, cy, flip);
  for (const [cx, cy] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + dx, cy + dy, PALETTE.cream);
    for (const [dx, dy] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) set(cx + dx, cy + dy, PALETTE.yellow);
  }
  // garis bertangga dari ujung roset ke arah tunas (kait/sulur bersudut khas ikat cual)
  for (const [cx, cy] of [[8, 8], [24, 24]]) {
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      for (let k = 6; k <= 9; k++) set(cx + sx * k, cy + sy * (k - 1), PALETTE.cream);
      set(cx + sx * 9, cy + sy * 6, PALETTE.cream); set(cx + sx * 9, cy + sy * 7, PALETTE.cream); // kait
    }
  }

  // raster sel → kanvas 3 × 3 ulangan (supaya blur di tepi tetap menyambung), lalu potong tengah
  const P = BODY_CELL_PX, S = N * P;
  const big = canvas2d(S * 3, S * 3);
  big.fillStyle = PALETTE.red; big.fillRect(0, 0, S * 3, S * 3);
  for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!grid[y][x]) continue;
      big.fillStyle = grid[y][x];
      big.fillRect(tx * S + x * P, ty * S + y * P, P, P);
    }
  }
  const out = canvas2d(S, S);
  out.filter = 'blur(1.3px)';
  out.drawImage(big.canvas, -S, -S);
  out.filter = 'none';
  // coretan mendatar (rembesan celup searah pakan) & tekstur benang
  for (let i = 0; i < 700; i++) {
    const light = rng() < 0.5;
    out.fillStyle = light ? 'rgba(255,240,200,0.10)' : 'rgba(80,10,10,0.12)';
    const x = rng() * S, y = rng() * S, w = 6 + rng() * 26;
    out.fillRect(x, y, w, 1.5);
    if (x + w > S) out.fillRect(x - S, y, w, 1.5);
  }
  for (let y = 0; y < S; y += 2) { out.fillStyle = 'rgba(0,0,0,0.05)'; out.fillRect(0, y, S, 1); }
  return out.canvas;
}

function rosette(set, cx, cy) {
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const petal = 4.2 + 2.2 * Math.abs(Math.cos(2 * a)); // empat kelopak besar (seperti foto)
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1) set(cx + dx, cy + dy, PALETTE.dark); // inti persegi cokelat
    else if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) set(cx + dx, cy + dy, PALETTE.cream); // bingkai inti
    else if (Math.abs(d - petal) < 0.8) set(cx + dx, cy + dy, PALETTE.cream);  // garis kelopak
    else if (d < petal - 0.8 && d > 3.2) set(cx + dx, cy + dy, (Math.round(a * 4 / Math.PI) & 1) ? PALETTE.yellow : PALETTE.cream);
  }
}

function sprig(set, cx, cy, flip) {
  // dua daun lonjong miring (isi kuning, tepi krem) + tangkai & sulur kecil
  for (const s of [-1, 1]) {
    const ang = s * 0.8 + (flip < 0 ? Math.PI : 0);
    const ox = cx + Math.cos(ang) * 4, oy = cy + Math.sin(ang) * 4;
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      const u = (dx * Math.cos(ang) + dy * Math.sin(ang)) / 5.2;
      const v = (-dx * Math.sin(ang) + dy * Math.cos(ang)) / 2.3;
      const e = u * u + v * v;
      if (e < 0.55) set(ox + dx, oy + dy, PALETTE.yellow);
      else if (e < 1.05) set(ox + dx, oy + dy, PALETTE.cream);
    }
  }
  for (let k = 0; k < 6; k++) set(cx, cy + flip * (2 + k), PALETTE.cream); // tangkai
  for (const s of [-1, 1]) { // sulur berbentuk L di kiri-kanan bawah
    for (let k = 0; k < 3; k++) set(cx + s * (4 + k), cy + flip * 7, PALETTE.cream);
    set(cx + s * 6, cy + flip * 6, PALETTE.cream);
  }
  set(cx, cy, PALETTE.dark);
}

// ---------------------------------------------------------------------------
// Kain utuh
// ---------------------------------------------------------------------------

const PPM = 1000; // piksel per meter

export function createCualTextures({ width = 2.0, height = 0.9 } = {}) {
  const W = Math.round(width * PPM), H = Math.round(height * PPM);
  const L = makeLayers(W, H);
  const rng = mulberry32(21);
  const px = (m) => m * PPM;

  // ukuran bagian (meter)
  const SELV = 0.03, HEAD = Math.min(0.36, width * 0.18), BORDER = Math.min(0.11, height * 0.13);
  const bodyX0 = SELV + HEAD, bodyX1 = width - SELV - HEAD;

  // ---------- dasar ----------
  L.ground(0, 0, W, H, PALETTE.redBright);

  // ---------- badan: ikat bunga diulang ----------
  const tile = drawBodyTile();
  const scale = (BODY_CELLS * BODY_CELL_M * PPM) / tile.width;
  const pattern = L.color.createPattern(tile, 'repeat');
  pattern.setTransform(new DOMMatrix().scale(scale));
  L.color.fillStyle = pattern;
  L.color.fillRect(px(bodyX0), px(BORDER), px(bodyX1 - bodyX0), px(height - 2 * BORDER));

  // ---------- pita tepi atas & bawah badan ----------
  for (const top of [true, false]) {
    const y0 = top ? 0 : height - BORDER;
    const yy = (f) => px(top ? y0 + f * BORDER : y0 + (1 - f) * BORDER); // f = 0 di tepi kain
    const x0 = px(bodyX0), x1 = px(bodyX1);
    L.goldRect(x0, yy(0.12) - 2, x1 - x0, 4);
    L.goldWave(x0, x1, yy(0.25), px(0.012), px(0.045), 3);   // gelombang
    L.goldRect(x0, yy(0.4) - 1.5, x1 - x0, 3);
    for (let x = x0 + px(0.02); x < x1 - px(0.01); x += px(0.035)) L.goldFlower(x, yy(0.55), px(0.0065), 6);
    L.goldRect(x0, yy(0.7) - 1.5, x1 - x0, 3);
    L.goldZigzag(x0, x1, yy(0.84), px(0.008), px(0.016), 2.5); // gigi gergaji
    L.goldRect(x0, yy(0.97) - 1.5, x1 - x0, 3);
  }

  // ---------- kepala kain kiri & kanan ----------
  for (const side of [-1, 1]) {
    // xm(f): f = 0 di tepi luar kepala, 1 di batas badan
    const xm = (f) => px(side < 0 ? SELV + f * HEAD : width - SELV - f * HEAD);
    // garis emas di tepi luar & dalam
    for (const [f0, f1] of [[0.0, 0.07], [0.92, 1.0]]) {
      const a = Math.min(xm(f0), xm(f1)), b = Math.max(xm(f0), xm(f1));
      L.goldRect(a, 0, b - a, H, true);
    }
    // taburan bunga emas (berselang-seling)
    const fieldF = [0.12, 0.42], step = 0.034;
    let row = 0;
    for (let y = 0.02; y < height - 0.01; y += step, row++) {
      for (let f = fieldF[0] + (row % 2) * 0.06; f <= fieldF[1]; f += 0.12) {
        L.goldFlower(xm(f), px(y), px(0.0085), 8);
      }
    }
    // pucuk rebung (tumpal): segitiga emas berderet, alas di tepi taburan, ujung menuju badan
    const n = Math.max(6, Math.round(height / 0.068));
    const th = height / n;
    for (let k = 0; k < n; k++) {
      const yc = (k + 0.5) * th;
      L.tumpal(xm(0.47), xm(0.9), px(yc), px(th * 0.5), rng);
      L.goldFlower(xm(0.6), px(yc + th / 2), px(0.004), 5); // bunga kecil di sela tumpal
    }
  }

  // tepi (selvage): merah polos dengan satu garis emas
  for (const x of [SELV - 0.006, width - SELV + 0.004]) L.goldRect(px(x), 0, 3, H);

  // tenunan halus di seluruh permukaan
  for (let y = 0; y < H; y += 2) { L.color.fillStyle = 'rgba(0,0,0,0.04)'; L.color.fillRect(0, y, W, 1); }

  const t = (c, srgb) => { const tex = repeatTexture(c, srgb); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; return tex; };
  return {
    color: t(L.color.canvas, true), bump: t(L.bump.canvas, false), rough: t(L.rough.canvas, false), metal: t(L.metal.canvas, false),
    size: { width, height },
  };
}

// Empat kanvas (warna, bump, roughness, metalness) yang selalu digambar bersamaan.
// Bagian emas songket: menonjol, licin, & metalik; kain ikat: datar, kusam, non-logam.
function makeLayers(W, H) {
  const color = canvas2d(W, H), bump = canvas2d(W, H), rough = canvas2d(W, H), metal = canvas2d(W, H);
  const goldPat = goldPattern(color);
  const layers = [
    // metalness ± 0,5: tetap berkilau, tapi tidak menghitam di ruangan tanpa env map
    [color, goldPat], [bump, '#c4c4c4'], [rough, '#5a5a5a'], [metal, '#808080'],
  ];
  const goldFill = (pathFn) => layers.forEach(([ctx, style]) => { ctx.fillStyle = style; pathFn(ctx); ctx.fill(); });
  const goldStroke = (pathFn, w) => layers.forEach(([ctx, style]) => {
    ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; pathFn(ctx); ctx.stroke();
  });
  return {
    color, bump, rough, metal,
    ground(x, y, w, h, fill) {
      color.fillStyle = fill; color.fillRect(x, y, w, h);
      weaveBase(bump, w, h, '#707070');
      rough.fillStyle = '#cfcfcf'; rough.fillRect(x, y, w, h);
      metal.fillStyle = '#000000'; metal.fillRect(x, y, w, h);
    },
    goldRect(x, y, w, h, hatched = false) {
      goldFill((c) => { c.beginPath(); c.rect(x, y, w, h); });
      if (hatched) { // pita emas bergaris merah halus
        color.strokeStyle = 'rgba(160,20,20,0.6)'; color.lineWidth = 1.5;
        for (let yy = y; yy < y + h; yy += 7) { color.beginPath(); color.moveTo(x, yy); color.lineTo(x + w, yy + 4); color.stroke(); }
      }
    },
    goldWave(x0, x1, y, amp, period, w) {
      goldStroke((c) => {
        c.beginPath();
        for (let x = x0; x <= x1; x += 2) { const yy = y + Math.sin(((x - x0) / period) * Math.PI * 2) * amp; x === x0 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
      }, w);
    },
    goldZigzag(x0, x1, y, amp, period, w) {
      goldStroke((c) => {
        c.beginPath();
        for (let x = x0, k = 0; x <= x1; x += period / 2, k++) { const yy = y + (k % 2 ? amp : -amp); k ? c.lineTo(x, yy) : c.moveTo(x, yy); }
      }, w);
    },
    goldFlower(cx, cy, r, petals) {
      goldFill((c) => {
        c.beginPath();
        for (let k = 0; k < petals; k++) {
          const a = (k / petals) * Math.PI * 2;
          c.moveTo(cx, cy);
          c.ellipse(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.5, r * 0.28, a, 0, Math.PI * 2);
        }
      });
      color.fillStyle = PALETTE.redBright; // inti merah
      color.beginPath(); color.arc(cx, cy, r * 0.18, 0, Math.PI * 2); color.fill();
    },
    // Tumpal: segitiga emas dari xBase ke xTip, berisi sulur merah tipis seperti songket
    tumpal(xBase, xTip, yc, half, rng) {
      const tri = (c) => { c.beginPath(); c.moveTo(xBase, yc - half); c.lineTo(xTip, yc); c.lineTo(xBase, yc + half); c.closePath(); };
      goldFill(tri);
      color.save(); tri(color); color.clip();
      color.strokeStyle = 'rgba(170,25,25,0.75)'; color.lineWidth = 1.6;
      const len = xTip - xBase;
      for (let k = 1; k < 7; k++) { // ikal-ikal kecil di sepanjang sumbu tumpal
        const x = xBase + (len * k) / 7, s = half * (1 - k / 7);
        color.beginPath(); color.moveTo(x, yc); color.quadraticCurveTo(x + len * 0.04, yc - s * 0.7, x + len * 0.09, yc - s * 0.2); color.stroke();
        color.beginPath(); color.moveTo(x, yc); color.quadraticCurveTo(x + len * 0.04, yc + s * 0.7, x + len * 0.09, yc + s * 0.2); color.stroke();
      }
      color.beginPath(); color.moveTo(xBase, yc); color.lineTo(xTip, yc); color.stroke(); // tulang tengah
      for (let i = 0; i < 60; i++) { // bintik merah kecil di sela emas
        const f = rng(), x = xBase + len * f, s = half * (1 - f) * (rng() * 2 - 1);
        color.fillStyle = 'rgba(170,25,25,0.5)'; color.fillRect(x, yc + s, 2, 2);
      }
      color.restore();
    },
  };
}

// Benang emas songket: kuning keemasan dengan garis pakan halus & bintik gelap
function goldPattern(ctx) {
  const c = canvas2d(16, 8);
  c.fillStyle = PALETTE.gold; c.fillRect(0, 0, 16, 8);
  c.fillStyle = PALETTE.goldDark; c.fillRect(0, 3, 16, 1); c.fillRect(0, 7, 16, 1);
  c.fillStyle = 'rgba(255,240,190,0.6)'; c.fillRect(3, 1, 4, 1); c.fillRect(11, 5, 4, 1);
  return ctx.createPattern(c.canvas, 'repeat');
}

function weaveBase(ctx, W, H, base) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) { ctx.fillStyle = y % 4 ? '#666666' : '#7a7a7a'; ctx.fillRect(0, y, W, 1); }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function repeatTexture(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
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
