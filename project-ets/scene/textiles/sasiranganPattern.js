import * as THREE from 'three';

/*
 * Motif Sasirangan (Banjar, Kalimantan Selatan), dari foto referensi. Hanya tekstur.
 *
 * Teknik sasirangan: kain dijelujur (dijahit tangan) mengikuti pola, benang ditarik
 * kencang, lalu dicelup. Bagian yang terjepit jahitan tidak kena warna → motif berupa
 * DERETAN TITIK/GARIS PUTUS-PUTUS putih dengan rembesan warna yang lembut di sekelilingnya,
 * di atas dasar celupan yang berbelang tidak rata. Tekstur ini meniru ketiga ciri itu.
 *
 *   createSasiranganTextures({ variant = 'marun' })
 *     variant 'marun' : dasar merah marun berbelang mendatar. Baris-baris motif:
 *                         hiris gagatas (belah ketupat), gigi haruan (zig-zag),
 *                         kulat karikit (ikal bersambung)
 *     variant 'merah' : dasar merah-merah muda bercak kekuningan. Pita gigi haruan rangkap
 *                         tiga berselang dengan bidang kambang (ikal spiral & daun)
 *
 * Mengembalikan { color, bump, rough, tileSize } (THREE.CanvasTexture, RepeatWrapping) —
 * menyambung tanpa sambungan ke segala arah. Atur repeat = ukuran kain / tileSize.
 * Material yang disarankan (kain katun/sutra, tidak logam):
 *   new THREE.MeshStandardMaterial({ map: t.color, bumpMap: t.bump, bumpScale: 0.6,
 *     roughnessMap: t.rough, roughness: 1, side: THREE.DoubleSide })
 */

const PPM = 1600; // piksel per meter

const VARIANTS = {
  marun: {
    size: [0.32, 0.30],
    dyeDark: [92, 16, 38], dyeMid: [150, 42, 72], dyeLight: [196, 104, 132],
    stitch: [248, 236, 238], bleed: [222, 160, 178],
    rows: drawRowsMarun,
  },
  merah: {
    size: [0.36, 0.30],
    dyeDark: [214, 52, 78], dyeMid: [238, 92, 104], dyeLight: [236, 186, 120],
    stitch: [255, 246, 236], bleed: [250, 196, 180],
    rows: drawRowsMerah,
  },
};

export function createSasiranganTextures({ variant = 'marun' } = {}) {
  const V = VARIANTS[variant];
  if (!V) throw new Error(`Varian sasirangan "${variant}" tidak dikenal (pakai 'marun' atau 'merah')`);
  const W = Math.round(V.size[0] * PPM), H = Math.round(V.size[1] * PPM);

  // 1) Kumpulkan semua jahitan (polyline dalam piksel) dari pola baris
  const paths = [];
  V.rows(paths, W, H);

  // 2) Masker jahitan: titik-titik putih di sepanjang tiap jalur, digambar 3 × 3 kali
  //    (bergeser ±W, ±H) di kanvas besar supaya rembesan blur menyambung di tepi ulangan
  const mask = canvas2d(W * 3, H * 3);
  const rng = mulberry32(5);
  mask.fillStyle = '#fff';
  for (const pts of paths) {
    const stitches = stitchesAlong(pts, 10, 3.5, rng); // panjang tusukan & jarak antartusukan (px)
    for (let ty = 0; ty < 3; ty++) for (let tx = 0; tx < 3; tx++) {
      for (const [x, y, ang, len, wid] of stitches) {
        mask.save();
        mask.translate(x + tx * W, y + ty * H);
        mask.rotate(ang);
        mask.beginPath();
        mask.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2);
        mask.fill();
        mask.restore();
      }
    }
  }

  // 3) Dasar celupan: belang mendatar & bercak tidak rata (noise periodik)
  const color = canvas2d(W, H);
  const img = color.createImageData(W, H);
  const noise = createNoise(variant === 'marun' ? 3 : 8);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const streak = noise.fbm(u * 3, v * 14, 4, 3, 14);       // belang memanjang mendatar
      const blot = noise.fbm(u * 6 + 11, v * 6, 4, 6, 6);       // bercak celupan
      let k = streak * 0.65 + blot * 0.35;
      k = THREE.MathUtils.smoothstep(k, 0.3, 0.72);
      let c = mix3(V.dyeDark, V.dyeMid, k);
      if (variant === 'merah') c = mix3(c, V.dyeLight, THREE.MathUtils.smoothstep(blot, 0.55, 0.75) * 0.75);
      else c = mix3(c, V.dyeLight, THREE.MathUtils.smoothstep(streak, 0.7, 0.85) * 0.35);
      const i = (y * W + x) * 4;
      img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
    }
  }
  color.putImageData(img, 0, 0);

  // 4) Rembesan: masker diburamkan lebar, diberi warna "bleed", ditumpuk tipis
  const bleed = tinted(mask.canvas, V.bleed, 'blur(10px)');
  color.globalAlpha = 0.85;
  color.drawImage(bleed, -W, -H);
  color.drawImage(bleed, -W, -H); // dua kali → rembesan lebih pekat
  const halo = tinted(mask.canvas, V.bleed, 'blur(3.5px)');
  color.globalAlpha = 0.9;
  color.drawImage(halo, -W, -H);
  // 5) Titik jahitan itu sendiri (sedikit buram, karena warna tetap merembes sedikit)
  const core = tinted(mask.canvas, V.stitch, 'blur(0.7px)');
  color.globalAlpha = 0.95;
  color.drawImage(core, -W, -H);
  color.globalAlpha = 1;

  // serat kain halus
  for (let y = 0; y < H; y += 2) { color.fillStyle = 'rgba(0,0,0,0.035)'; color.fillRect(0, y, W, 1); }
  for (let x = 0; x < W; x += 3) { color.fillStyle = 'rgba(255,255,255,0.02)'; color.fillRect(x, 0, 1, H); }

  // Bump: bekas lubang & kerutan jahitan (sedikit cekung di titik jahitan) + tenunan halus
  const bump = canvas2d(W, H);
  bump.fillStyle = '#808080'; bump.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) { bump.fillStyle = y % 4 ? '#7a7a7a' : '#868686'; bump.fillRect(0, y, W, 1); }
  bump.globalAlpha = 0.5;
  bump.drawImage(tinted(mask.canvas, [40, 40, 40], 'blur(1.5px)'), -W, -H);
  bump.globalAlpha = 1;

  const rough = canvas2d(W, H);
  rough.fillStyle = variant === 'marun' ? '#b8b8b8' : '#c4c4c4'; // sutra/katun: kusam
  rough.fillRect(0, 0, W, H);

  const tex = (ctx, srgb) => {
    const t = new THREE.CanvasTexture(ctx.canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { color: tex(color, true), bump: tex(bump, false), rough: tex(rough, false), tileSize: { width: V.size[0], height: V.size[1] } };
}

// ---------------------------------------------------------------------------
// Susunan baris motif. Semua jalur dalam piksel; jalur boleh melewati tepi (menyambung).
// Periode mendatar tiap motif harus membagi habis lebar W supaya menyambung.
// ---------------------------------------------------------------------------

function drawRowsMarun(paths, W, H) {
  const rowH = H / 4; // 4 baris per ulangan: belah ketupat, zig-zag, ikal, zig-zag ganda
  const yA = rowH * 0.5, yB = rowH * 1.25, yC = rowH * 2.15, yD = rowH * 3.25;

  // Hiris gagatas: belah ketupat bertepi titik + belah ketupat kecil di dalamnya, berselang
  const nA = 8, pA = W / nA;
  for (let k = 0; k < nA; k++) {
    const cx = (k + 0.5) * pA;
    const big = k % 2 === 0;
    diamond(paths, cx, yA, pA * (big ? 0.36 : 0.26), rowH * (big ? 0.36 : 0.26));
    if (big) diamond(paths, cx, yA, pA * 0.13, rowH * 0.13);
  }
  // garis titik tipis di atas & bawah baris belah ketupat
  paths.push(line(-20, yA - rowH * 0.48, W + 20, yA - rowH * 0.48));

  // Gigi haruan: zig-zag rapat
  paths.push(zigzag(yB, W / 24, rowH * 0.13, W));

  // Kulat karikit: ikal bersambung (huruf S berulang) di atas garis gelombang
  const nC = 10, pC = W / nC;
  const wave = [];
  for (let x = -20; x <= W + 20; x += 4) wave.push([x, yC + Math.sin((x / pC) * Math.PI * 2) * rowH * 0.1]);
  paths.push(wave);
  for (let k = 0; k < nC; k++) {
    const x = k * pC + pC * 0.25;
    paths.push(spiral(x, yC - rowH * 0.2, rowH * 0.15, 1.6, k % 2 ? 1 : -1));
  }

  // Gigi haruan ganda
  paths.push(zigzag(yD - rowH * 0.12, W / 16, rowH * 0.12, W));
  paths.push(zigzag(yD + rowH * 0.12, W / 16, rowH * 0.12, W));
  paths.push(line(-20, yD + rowH * 0.42, W + 20, yD + rowH * 0.42));
}

function drawRowsMerah(paths, W, H) {
  // Pita gigi haruan rangkap tiga (zig-zag besar sejajar)
  const yZ = H * 0.2, amp = H * 0.1, per = W / 4;
  for (const dy of [-H * 0.07, 0, H * 0.07]) paths.push(zigzag(yZ + dy, per, amp, W));

  // Bidang kambang: ikal spiral besar & daun berpasangan
  const yF = H * 0.65;
  const nF = 2, pF = W / nF;
  for (let k = 0; k < nF; k++) {
    const x = k * pF;
    paths.push(spiral(x + pF * 0.3, yF - H * 0.06, H * 0.13, 2.2, 1));
    // tangkai melengkung dari spiral
    const stem = [];
    for (let t = 0; t <= 1; t += 0.05) stem.push([x + pF * 0.3 + t * pF * 0.35, yF + H * 0.02 + Math.sin(t * Math.PI) * H * 0.06]);
    paths.push(stem);
    // dua daun di ujung tangkai & bunga titik kecil
    leaf(paths, x + pF * 0.74, yF - H * 0.1, H * 0.09, -0.6);
    leaf(paths, x + pF * 0.84, yF + H * 0.14, H * 0.09, 0.7);
    flower(paths, x + pF * 0.06, yF + H * 0.2, H * 0.045);
  }
}

// ---------- bentuk dasar (hasil: polyline) ----------

function line(x0, y0, x1, y1) { return [[x0, y0], [x1, y1]]; }

function zigzag(y, period, amp, W) {
  const pts = [];
  for (let x = -period, k = 0; x <= W + period; x += period / 2, k++) pts.push([x, y + (k % 2 ? amp : -amp)]);
  return pts;
}

function diamond(paths, cx, cy, rx, ry) {
  paths.push([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy], [cx, cy - ry]]);
}

function spiral(cx, cy, r, turns, dir) {
  const pts = [];
  for (let t = 0; t <= 1; t += 0.01) {
    const a = dir * t * turns * Math.PI * 2, rr = r * (1 - t * 0.85);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

function leaf(paths, cx, cy, len, ang) {
  const pts = [];
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const a = t * Math.PI * 2, x = Math.cos(a) * len, y = Math.sin(a) * len * 0.38;
    pts.push([cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)]);
  }
  paths.push(pts);
}

function flower(paths, cx, cy, r) {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    paths.push(spiral(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.5, 1, 1));
  }
}

// Titik-titik jahitan jelujur di sepanjang polyline: [x, y, sudut, panjang, lebar]
function stitchesAlong(pts, len, gap, rng) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    const ang = Math.atan2(y1 - y0, x1 - x0);
    let s = carry;
    while (s < seg) {
      const t = s / seg;
      const l = len * (0.8 + rng() * 0.4); // jahitan tangan: panjang tidak seragam
      out.push([x0 + (x1 - x0) * t + (rng() - 0.5) * 1.5, y0 + (y1 - y0) * t + (rng() - 0.5) * 1.5, ang, l, 5.5 + rng() * 1.5]);
      s += l + gap;
    }
    carry = s - seg;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

// Masker putih → kanvas berwarna `rgb` dengan filter (blur), ukuran sama dengan masker
function tinted(maskCanvas, rgb, filter) {
  const c = canvas2d(maskCanvas.width, maskCanvas.height);
  c.filter = filter;
  c.drawImage(maskCanvas, 0, 0);
  c.filter = 'none';
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = `rgb(${rgb.join(',')})`;
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  return c.canvas;
}

function mix3(a, b, t) {
  t = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
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

// Value noise 2D periodik + fbm (px, py = periode bilangan bulat)
function createNoise(seed) {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512), vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rng(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const wrap = (i, p) => (p ? ((i % p) + p) % p : i);
  const h = (x, y, px, py) => vals[perm[(perm[wrap(x, px) & 255] + wrap(y, py)) & 255]];
  const noise = (x, y, px, py) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi, px, py), b = h(xi + 1, yi, px, py), c = h(xi, yi + 1, px, py), d = h(xi + 1, yi + 1, px, py);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return {
    fbm(x, y, oct = 4, px = 0, py = 0) {
      let sum = 0, amp = 0.5, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) { sum += amp * noise(x * f, y * f, px * f, py * f); norm += amp; amp *= 0.5; f *= 2; }
      return sum / norm;
    },
  };
}
