import * as THREE from 'three';

/*
 * Motif Tenun Sumba (Nusa Tenggara Timur), dari foto referensi. Hanya tekstur.
 *
 *   createSumbaTextures({ variant = 'hinggi' })
 *     variant 'hinggi' : tenun ikat Sumba Timur — sepasang kuda saling berhadapan mengapit
 *                        pohon hayat, deretan rusa, pita merah bermotif kait. Warna mengkudu
 *                        (merah & marun), putih benang mentah, aksen biru indigo.
 *     variant 'figur'  : figur leluhur bertangan terangkat & bintang di atas dasar cokelat tua,
 *                        diapit pita bergaris jingga-kuning dengan deretan heksagon.
 *
 * Mengembalikan { color, bump, rough, tileSize } (THREE.CanvasTexture, RepeatWrapping),
 * menyambung tanpa sambungan ke segala arah. Atur repeat = ukuran kain / tileSize.
 * Material yang disarankan (katun, pewarna alami, kusam):
 *   new THREE.MeshStandardMaterial({ map: t.color, bumpMap: t.bump, bumpScale: 0.8,
 *     roughnessMap: t.rough, roughness: 1, side: THREE.DoubleSide })
 *
 * Motif digambar per SEL (seperti ikatan benang ikat). Baris digeser acak ±1 sel & tepi
 * warna diburamkan → bentuk bertangga, sedikit meleset, & warna merembes khas tenun ikat.
 */

const PALETTE = {
  W: [236, 226, 206], // putih benang mentah
  R: [184, 36, 34],   // merah mengkudu
  M: [92, 22, 26],    // marun / cokelat-merah tua
  B: [44, 64, 128],   // biru indigo
  D: [40, 22, 16],    // cokelat sangat tua
  O: [214, 112, 36],  // jingga
  Y: [222, 170, 60],  // kuning
  K: [150, 50, 30],   // merah bata
};

// ---------------------------------------------------------------------------
// Templat (huruf = warna PALETTE, '.' = tidak digambar)
// ---------------------------------------------------------------------------

// Kuda menghadap kanan: leher & kepala tegak, ekor di kiri, kaki melangkah
const HORSE = [
  '.............WW.....',
  '............WWWW....',
  '...........WWBWWW...',
  '..........WWWW.WWW..',
  '.........WWWW...WW..',
  '........WWWW........',
  '.......WWRWW........',
  'W.....WWWWWW........',
  'WW..WWWWWWWWW.......',
  '.WWWWRRWWRRWWW......',
  '..WWWWWWWWWWWWW.....',
  '..WWWRRWWBRRWWW.....',
  '...WWWWWWWWWWW......',
  '...WW.W....W.WW.....',
  '...W..W....W..W.....',
  '..W...W...W...W.....',
  '..W....W..W....W....',
  '.WW...WW.WW...WW....',
];

// Rusa menghadap kanan: lebih ramping, bertanduk bercabang
const DEER = [
  '..........W.W.W..',
  '...........WWW.W.',
  '..........W.W.W..',
  '...........WW....',
  '..........WBWW...',
  '.........WWW.....',
  '........WWW......',
  '.W....WWWWW......',
  '..WWWWWRWRWW.....',
  '..WWWWWWWWWW.....',
  '...WWRWRWWW......',
  '...W.W...W.W.....',
  '..W..W...W..W....',
  '..W...W..W...W...',
];

// Pohon hayat (andung): batang bercabang simetris, berbuah, di atas alas segitiga
const TREE = [
  '.....R.....',
  '....RWR....',
  '...R.R.R...',
  '..W..R..W..',
  '.RR..R..RR.',
  '.....R.....',
  '..RRRRRRR..',
  '.W...R...W.',
  'RR...R...RR',
  '.....R.....',
  '...RRBRR...',
  '..R..R..R..',
  '.W...R...W.',
  '.....R.....',
  '....RRR....',
  '...RWRWR...',
  '..RRRRRRR..',
  '.RWRWRWRWR.',
];

// Figur leluhur: tangan terangkat berjari, wajah, dada bermotif merah, kaki terbuka
const FIGURE = [
  'W.W.W...........W.W.W',
  'W.W.W...........W.W.W',
  'WWWWW....WWWWW..WWWWW',
  'WWWWW...WWWWWWW.WWWWW',
  '.WWW....WDWWWDW..WWW.',
  '..W.....WWWDWWW...W..',
  '..W.....WWDDDWW...W..',
  '..W......WWWWW....W..',
  '..W.......WWW.....W..',
  '..WWWWWWWWWWWWWWWWW..',
  '.......WWWWWWW.......',
  '.......WRRRRRW.......',
  '.......WWRRRWW.......',
  '.......WRWRWRW.......',
  '.......WWRWRWW.......',
  '.......WRWRWRW.......',
  '.......WWWWWWW.......',
  '........WWWWW........',
  '........WW.WW........',
  '........WW.WW........',
  '........WW.WW........',
  '.......WWW.WWW.......',
  '......WWWW.WWWW......',
  '....WWWWW...WWWWW....',
];

const STAR = [
  '...W...',
  '.W.W.W.',
  '..WWW..',
  'WWWRWWW',
  '..WWW..',
  '.W.W.W.',
  '...W...',
];

const HEX = ['.WWW.', 'WWRWW', 'WWRWW', '.WWW.'];

// Kait kecil (pita merah hinggi)
const HOOK = ['.WW.', 'W..W', '...W', '..W.', '.W..', 'WWWW'];

// ---------------------------------------------------------------------------
// Varian
// ---------------------------------------------------------------------------

const VARIANTS = {
  hinggi: { cell: 0.004, cols: 104, rows: 96, jitter: 0.4, blur: 2.6, build: buildHinggi },
  figur: { cell: 0.005, cols: 52, rows: 66, jitter: 0.15, blur: 1.4, build: buildFigur },
};

function buildHinggi(g) {
  const { cols } = g;
  // A. pita merah bermotif kait (baris 0–11)
  g.fillRows(0, 12, 'R');
  for (let x = 0; x < cols; x += 8) {
    g.stamp(HOOK, x + 1, 3);
    g.stamp(mirrorX(HOOK), x + 5, 3);
  }
  g.hline(0, 'W', 2); g.hline(11, 'M');
  // B. sepasang kuda saling berhadapan mengapit pohon hayat (baris 12–51), skala 2
  g.fillRows(12, 52, 'M');
  g.stamp(HORSE, 0, 14, 2);              // menghadap kanan, ke pohon
  g.stamp(TREE, 41, 14, 2);
  g.stamp(mirrorX(HORSE), 64, 14, 2);    // menghadap kiri
  for (const x of [2, 50, 98]) g.stamp(['.R.', 'RBR', '.R.'], x, 48);
  // C. pemisah: garis putih + belah ketupat kecil (baris 52–57)
  g.fillRows(52, 58, 'M');
  g.hline(52, 'W', 2); g.hline(57, 'W', 2);
  for (let x = 0; x < cols; x += 4) g.stamp(['.R.', 'RWR', '.R.'], x + 1, 53);
  // D. sepasang rusa saling berhadapan + bunga (baris 58–89), skala 2
  g.fillRows(58, 90, 'M');
  g.stamp(DEER, 4, 60, 2);
  g.stamp(mirrorX(DEER), 66, 60, 2);
  g.stamp(['..R..', '.RWR.', 'RWBWR', '.RWR.', '..R..'], 0, 76, 2);
  g.stamp(['..R..', '.RWR.', 'RWBWR', '.RWR.', '..R..'], 47, 76, 2);
  // E. pita merah bertitik putih (baris 90–95)
  g.fillRows(90, 96, 'R');
  for (let x = 0; x < cols; x += 2) g.set(x, 92, 'W');
  g.hline(90, 'M'); g.hline(95, 'M');
}

function buildFigur(g) {
  const { cols } = g;
  g.fillRows(0, g.rows, 'D');
  // pita tepi: garis jingga-kuning & deretan heksagon di atas cokelat tua (baris 0–11)
  g.hline(0, 'O'); g.hline(1, 'Y'); g.hline(2, 'K');
  for (let x = 0; x < cols; x += 6.5) g.stamp(HEX, Math.round(x) + 1, 4);
  g.hline(9, 'K'); g.hline(10, 'Y'); g.hline(11, 'O');
  // figur leluhur besar (skala 2) di tengah ulangan
  g.stamp(FIGURE, 5, 14, 2);
  // bintang di kiri-kanan kaki & belah ketupat merah bata pengisi dasar
  g.stamp(STAR, 0, 50); g.stamp(STAR, 45, 50);
  g.stamp(STAR, 19, 58);
  for (let y = 15; y < 64; y += 5) for (let x = 2; x < cols; x += 5) {
    if (g.get(x, y) === 'D' && g.get(x + 1, y + 1) === 'D' && g.get(x - 1, y - 1) === 'D') g.stamp(['.K.', 'KRK', '.K.'], x - 1, y - 1);
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const PX = 10; // piksel per sel

export function createSumbaTextures({ variant = 'hinggi' } = {}) {
  const V = VARIANTS[variant];
  if (!V) throw new Error(`Varian tenun Sumba "${variant}" tidak dikenal (pakai 'hinggi' atau 'figur')`);
  const g = makeGrid(V.cols, V.rows);
  V.build(g);

  const { cols, rows } = V, W = cols * PX, H = rows * PX;
  const rng = mulberry32(variant === 'hinggi' ? 4 : 9);
  // pergeseran per baris (sel) → tepi motif meleset khas ikat
  const shift = Array.from({ length: rows }, () => (rng() < V.jitter ? (rng() < 0.5 ? -1 : 1) : 0));

  // raster 3 × 3 ulangan supaya blur menyambung di tepi, lalu potong tengah
  const big = canvas2d(W * 3, H * 3);
  for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const c = PALETTE[g.get(x - shift[y], y)];
      big.fillStyle = `rgb(${c.join(',')})`;
      big.fillRect(tx * W + x * PX, ty * H + y * PX, PX + 0.5, PX + 0.5);
    }
  }
  const color = canvas2d(W, H);
  color.filter = `blur(${V.blur}px)`;
  color.drawImage(big.canvas, -W, -H);
  color.filter = 'none';

  // rembesan pewarna: coretan mendatar searah benang pakan + belang lungsin samar
  for (let i = 0; i < 1600; i++) {
    const x = rng() * W, y = rng() * H, w = 8 + rng() * 40;
    color.fillStyle = rng() < 0.5 ? 'rgba(255,240,220,0.07)' : 'rgba(40,0,0,0.10)';
    color.fillRect(x, y, w, 1.5);
    if (x + w > W) color.fillRect(x - W, y, w, 1.5);
  }
  for (let x = 0; x < W; x += 3) { color.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.04})`; color.fillRect(x, 0, 1, H); }
  for (let y = 0; y < H; y += 2) { color.fillStyle = 'rgba(0,0,0,0.05)'; color.fillRect(0, y, W, 1); }

  // bump: tenunan kasar benang pintal tangan
  const bump = canvas2d(W, H);
  bump.fillStyle = '#7c7c7c'; bump.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
    if (((x / 3) + (y / 3)) % 2 === 0) { bump.fillStyle = '#929292'; bump.fillRect(x, y, 3, 3); }
  }
  const rough = canvas2d(W, H);
  rough.fillStyle = '#d4d4d4'; rough.fillRect(0, 0, W, H);

  const tex = (ctx, srgb) => {
    const t = new THREE.CanvasTexture(ctx.canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return {
    color: tex(color, true), bump: tex(bump, false), rough: tex(rough, false),
    tileSize: { width: cols * V.cell, height: rows * V.cell },
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeGrid(cols, rows) {
  const a = Array.from({ length: rows }, () => new Array(cols).fill('M'));
  const wrapX = (x) => ((x % cols) + cols) % cols;
  const g = {
    cols, rows,
    get: (x, y) => a[((y % rows) + rows) % rows][wrapX(x)],
    set: (x, y, c) => { if (y >= 0 && y < rows) a[y][wrapX(x)] = c; },
    fillRows: (y0, y1, c) => { for (let y = y0; y < y1; y++) for (let x = 0; x < cols; x++) g.set(x, y, c); },
    hline: (y, c, step = 1) => { for (let x = 0; x < cols; x += step) g.set(x, y, c); },
    // scale = tiap sel templat menjadi scale × scale sel
    stamp: (tpl, x0, y0, scale = 1) => tpl.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] === '.') continue;
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) g.set(x0 + c * scale + sx, y0 + r * scale + sy, row[c]);
      }
    }),
  };
  return g;
}

function mirrorX(tpl) {
  return tpl.map((row) => [...row].reverse().join(''));
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
