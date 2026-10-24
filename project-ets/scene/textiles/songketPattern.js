import * as THREE from 'three';

/*
 * Motif Songket (Palembang / Minangkabau / Melayu), dari foto referensi. Hanya tekstur.
 * Dasar sutra merah-ungu tua, pakan tambahan BENANG EMAS yang mengapung di atas tenunan.
 *
 * Dua pilihan:
 *
 *   createSongketTextures({ width = 1.0, height = 2.0 })
 *     → kain UTUH (dipetakan ke UV 0..1, repeat 1). Susunan dari ujung ke tengah, simetris:
 *
 *        ▼▼▼▼▼▼▼▼   pucuk rebung (berisi jala), ujung menunjuk ke badan
 *        ◇─◇─◇─◇    rantai belah ketupat di atas dasar merah muda keperakan
 *        ╳╳╳╳╳╳╳╳   jala diagonal
 *        ✦ ◇ ✦ ◇    badan: bunga bertangga dalam jala belah ketupat
 *        ╳╳╳╳╳╳╳╳
 *        ◇─◇─◇─◇
 *        ▲▲▲▲▲▲▲▲
 *
 *   createSongketBodyTextures()
 *     → hanya motif badan, bisa diulang tanpa sambungan; tileSize = 7,2 × 7,2 cm.
 *
 * Keduanya mengembalikan { color, bump, rough, metal, ... } (THREE.CanvasTexture).
 *
 * KILAU EMAS: benang emas punya metalness tinggi (± 0,9) & roughness rendah dengan variasi
 * per helai → berkilau saat cahaya/kamera bergerak. Logam memantulkan lingkungan, jadi
 * kilaunya paling terlihat bila scene memakai env map, mis.:
 *   scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
 * plus lampu sorot ke kain. Material yang disarankan:
 *   new THREE.MeshStandardMaterial({ map: t.color, bumpMap: t.bump, bumpScale: 1.2,
 *     roughnessMap: t.rough, roughness: 1, metalnessMap: t.metal, metalness: 1, side: THREE.DoubleSide })
 */

const CELL_M = 0.003; // satu apungan benang = 3 mm
const PX = 3;         // piksel per sel (5 → tekstur 1665 × 3335 px, ± 6 dtk dibuat; 3 → ± 1,7 dtk)

// Kode sel
const GROUND = 0, GOLD = 1, PALE = 2;

const COL = {
  ground: [52, 12, 26],     // merah-ungu tua
  groundHi: [68, 20, 36],
  pale: [132, 84, 92],     // dasar pita rantai (sutra merah muda keperakan)
  paleHi: [158, 112, 116],
  gold: [226, 176, 74],
  goldDark: [150, 104, 34],
  goldHi: [255, 236, 170],
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const BODY = 24; // ulangan badan: 24 × 24 sel

export function createSongketBodyTextures() {
  const grid = makeGrid(BODY, BODY, GROUND);
  for (let y = 0; y < BODY; y++) for (let x = 0; x < BODY; x++) grid.set(x, y, bodyCell(x, y));
  const out = renderGrid(grid, { wrap: true });
  return { ...out, tileSize: { width: BODY * CELL_M, height: BODY * CELL_M } };
}

export function createSongketTextures({ width = 1.0, height = 2.0 } = {}) {
  const C = Math.round(width / CELL_M), R = Math.round(height / CELL_M);
  const grid = makeGrid(C, R, GROUND);

  // tinggi tiap pita (sel), dari tepi kain ke arah badan
  const EDGE = 4, REBUNG = Math.min(110, Math.floor(R * 0.17)), STRIPE = 5, CHAIN = 30, JALA = 22;
  const end = EDGE + REBUNG + STRIPE + CHAIN + STRIPE + JALA + STRIPE;

  for (let y = 0; y < R; y++) {
    // d = jarak baris dari tepi terdekat (pita simetris atas-bawah)
    const top = y < R / 2, d = top ? y : R - 1 - y;
    for (let x = 0; x < C; x++) {
      let v;
      if (d < end) v = bandCell(x, d, { EDGE, REBUNG, STRIPE, CHAIN, JALA });
      else v = bodyCell(x, y - end); // badan
      // tepi kiri-kanan: dua garis emas
      if (x === 2 || x === 3 || x === C - 3 || x === C - 4) v = GOLD;
      grid.set(x, y, v);
    }
  }
  const out = renderGrid(grid, { wrap: false });
  for (const t of [out.color, out.bump, out.rough, out.metal]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { ...out, size: { width, height } };
}

// ---------------------------------------------------------------------------
// Motif (semua dalam satuan sel)
// ---------------------------------------------------------------------------

// Badan: bunga bertangga besar di tengah ulangan, bintang kecil di sudut, dihubungkan
// garis jala belah ketupat tipis (seperti foto bagian atas)
function bodyCell(x, y) {
  const lx = mod(x, BODY) - BODY / 2, ly = mod(y, BODY) - BODY / 2;
  const d = Math.abs(lx) + Math.abs(ly);                       // jarak "belah ketupat" ke pusat
  const cx = mod(x + BODY / 2, BODY) - BODY / 2, cy = mod(y + BODY / 2, BODY) - BODY / 2;
  const dc = Math.abs(cx) + Math.abs(cy);                     // jarak ke sudut ulangan
  // bunga tengah
  if (d <= 1) return GOLD;                                     // inti
  if (d === 3) return GOLD;                                    // lingkar dalam
  if (d === 5 && (lx === 0 || ly === 0 || Math.abs(lx) === Math.abs(ly))) return GOLD; // ujung kelopak
  if (d === 6 && (Math.abs(lx) <= 1 || Math.abs(ly) <= 1)) return GOLD;               // kelopak memanjang
  if (d === 7 && (lx === 0 || ly === 0)) return GOLD;
  // bintang kecil di sudut
  if (dc <= 1 || ((cx === 0 || cy === 0) && dc <= 3)) return GOLD;
  // jala tipis bertitik di antara keduanya
  if (d === BODY / 2 && (x + y) % 2 === 0) return GOLD;
  return GROUND;
}

function bandCell(x, d, { EDGE, REBUNG, STRIPE, CHAIN, JALA }) {
  if (d < EDGE) return d === 1 ? GOLD : GROUND;
  d -= EDGE;
  if (d < REBUNG) return rebungCell(x, d, REBUNG);
  d -= REBUNG;
  if (d < STRIPE) return stripeCell(x, d);
  d -= STRIPE;
  if (d < CHAIN) return chainCell(x, d, CHAIN);
  d -= CHAIN;
  if (d < STRIPE) return stripeCell(x, d);
  d -= STRIPE;
  if (d < JALA) return jalaCell(x, d);
  d -= JALA;
  return stripeCell(x, d);
}

// Garis pemisah: emas penuh - kosong - titik-titik - kosong - emas penuh
function stripeCell(x, d) {
  if (d === 0 || d === 4) return GOLD;
  if (d === 2) return x % 2 ? GOLD : GROUND;
  return GROUND;
}

// Jala diagonal dengan belah ketupat kecil di setiap persilangan
function jalaCell(x, y) {
  const P = 10;
  const a = mod(x + y, P), b = mod(x - y, P);
  if (a === 0 || b === 0) return GOLD;
  const lx = mod(x, P) - P / 2, ly = mod(y + P / 2, P) - P / 2;
  if (Math.abs(lx) + Math.abs(ly) <= 1) return GOLD;
  return GROUND;
}

// Rantai belah ketupat bertepi emas di atas dasar merah muda, berisi bunga kecil
function chainCell(x, y, H) {
  const P = 30, lx = mod(x, P) - P / 2, ly = y - (H - 1) / 2;
  const d = Math.abs(lx) * 0.9 + Math.abs(ly);
  if (y === 0 || y === H - 1) return GOLD;
  if (Math.abs(d - 12) < 1) return GOLD;                       // tepi belah ketupat besar
  if (Math.abs(d - 9) < 0.6) return GOLD;                      // tepi dalam
  if (d < 3 || (d < 6 && (lx === 0 || Math.round(ly) === 0))) return GOLD; // bunga di tengah
  if (d > 12.5 && Math.abs(lx) > P / 2 - 3 && Math.abs(ly) < 2) return GOLD; // sambungan antarbelah ketupat
  return PALE;
}

// Pucuk rebung: segitiga tinggi bertepi emas, berisi jala & belah ketupat di pangkal.
// d = 0 di alas (tepi kain), d = H di ujung (menunjuk ke badan).
function rebungCell(x, d, H) {
  const P = 36, lx = mod(x, P) - P / 2;
  const half = (P / 2) * (1 - d / H);                          // setengah lebar segitiga pada baris ini
  const ax = Math.abs(lx);
  if (ax <= half) {
    if (half - ax < 1.6) return GOLD;                          // tepi tebal
    if (d < 3) return GOLD;                                    // alas
    const dd = Math.abs(lx) + Math.abs(d - H * 0.16);          // belah ketupat besar di pangkal
    if (Math.abs(dd - 7) < 0.8 || dd <= 2) return GOLD;
    if ((mod(x + d, 6) === 0 || mod(x - d, 6) === 0)) return GOLD; // isi jala
    return GROUND;
  }
  // di sela segitiga (rebung terbalik): titik-titik emas menurun
  const gap = ax - half;
  if (d > 6 && gap > 2 && mod(d, 6) === 0 && mod(x, 3) === 0) return GOLD;
  if (d < H * 0.92 && Math.abs(gap - 1.5 - (d / H) * 3) < 0.6 && mod(d, 2) === 0) return GOLD;
  return GROUND;
}

// ---------------------------------------------------------------------------
// Render: tiap sel emas = apungan benang (mendatar, menyambung dengan tetangganya),
// gradasi tebal-tipis + kilau acak per helai. Dasar = tenunan sutra halus.
// ---------------------------------------------------------------------------

function renderGrid(grid, { wrap }) {
  const { C, R } = grid;
  const W = C * PX, H = R * PX;
  const color = new Uint8ClampedArray(W * H * 4);
  const bump = new Uint8ClampedArray(W * H * 4);
  const rough = new Uint8ClampedArray(W * H * 4);
  const metal = new Uint8ClampedArray(W * H * 4);
  const rng = mulberry32(3);
  const cellGlint = new Float32Array(C * R).map(() => rng()); // kilau per helai

  for (let cy = 0; cy < R; cy++) {
    for (let cx = 0; cx < C; cx++) {
      const v = grid.get(cx, cy);
      const glint = cellGlint[cy * C + cx];
      // apungan menyambung mendatar bila tetangga kiri/kanan juga emas
      const left = v === GOLD && grid.get(wrap ? mod(cx - 1, C) : cx - 1, cy) === GOLD;
      const right = v === GOLD && grid.get(wrap ? mod(cx + 1, C) : cx + 1, cy) === GOLD;
      for (let py = 0; py < PX; py++) {
        for (let px = 0; px < PX; px++) {
          const i = ((cy * PX + py) * W + cx * PX + px) * 4;
          const fy = (py + 0.5) / PX, fx = (px + 0.5) / PX;
          if (v === GOLD) {
            // penampang benang: tebal di tengah baris, tipis di atas-bawah; ujung apungan membulat
            const across = 1 - Math.abs(fy * 2 - 1);
            const endFade = (!left && fx < 0.2) || (!right && fx > 0.8) ? 0.55 : 1;
            const h = Math.pow(across, 0.6) * endFade;
            const lit = THREE.MathUtils.clamp(h * (0.75 + glint * 0.5), 0, 1);
            const c = mix3(COL.goldDark, mix3(COL.gold, COL.goldHi, Math.max(0, lit - 0.7) / 0.3), Math.min(1, lit / 0.7));
            put(color, i, c);
            put(bump, i, gray(110 + 145 * h));
            put(rough, i, gray(48 + glint * 55));        // licin, bervariasi per helai → berkilau
            put(metal, i, gray(h > 0.25 ? 232 : 120));
          } else {
            const base = v === PALE ? [COL.pale, COL.paleHi] : [COL.ground, COL.groundHi];
            // tenunan polos: pola kotak-kotak halus lungsin/pakan
            const weave = ((cx * PX + px) >> 1) % 2 === ((cy * PX + py) >> 1) % 2 ? 0.35 : 0;
            put(color, i, mix3(base[0], base[1], weave + (rng() - 0.5) * 0.15));
            put(bump, i, gray(70 + weave * 40));
            put(rough, i, gray(v === PALE ? 170 : 215));   // sutra kusam → emas tampak lebih berkilau
            put(metal, i, gray(0));
          }
        }
      }
    }
  }
  const tex = (data, srgb) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    c.getContext('2d').putImageData(new ImageData(data, W, H), 0, 0);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { color: tex(color, true), bump: tex(bump, false), rough: tex(rough, false), metal: tex(metal, false) };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeGrid(C, R, fill) {
  const a = new Uint8Array(C * R).fill(fill);
  return {
    C, R,
    get: (x, y) => (x < 0 || y < 0 || x >= C || y >= R ? GROUND : a[y * C + x]),
    set: (x, y, v) => { a[y * C + x] = v; },
  };
}

const mod = (a, n) => ((a % n) + n) % n;
const gray = (g) => [g, g, g];
const put = (arr, i, [r, g, b]) => { arr[i] = r; arr[i + 1] = g; arr[i + 2] = b; arr[i + 3] = 255; };
function mix3(a, b, t) {
  t = THREE.MathUtils.clamp(t, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
