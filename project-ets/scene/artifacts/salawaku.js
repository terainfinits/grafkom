import * as THREE from 'three';
import { extrude } from './common.js';

/*
 * Salawaku (Maluku): perisai kayu panjang & sempit, dimodelkan dari foto referensi.
 *
 *   Tegak di +Y (bawah di y = 0, atas di y = H), muka menghadap +Z, punggung di z = 0.
 *
 *     bentuk : seperti jam pasir — lebar di kedua ujung (± 12,5 cm), menyempit di tengah (± 7 cm)
 *     muka   : dua bidang miring yang bertemu di rusuk tengah (penampang ⌃), lipatannya tegas
 *     hiasan : cat hitam (agak aus) bertatah kepingan kerang putih — deretan segitiga zig-zag,
 *              bintang, belah ketupat di rusuk, gerigi di tepi, & pasangan "mata" kerang
 *              berbentuk tetes. Kerang memakai iridescence → berkilau pelangi seperti mutiara.
 *     belakang: pegangan dari kayu mentah di tengah
 *
 *          ┌──┐ ← ujung lebar
 *          \  /
 *           ||  ← pinggang (pegangan di belakang)
 *          /  \
 *          └──┘
 *
 * Paling cocok dipajang dengan display: 'wall' (digantung di panel dinding).
 */

const H = 1.05;          // tinggi perisai
const T_RIDGE = 0.026;   // tebal di rusuk tengah
const T_EDGE = 0.012;    // tebal di tepi kiri-kanan

// setengah lebar terhadap t = y / H (0 = bawah, 1 = atas), diukur dari foto
const HALF_W = [[0, 0.060], [0.1, 0.058], [0.25, 0.050], [0.4, 0.040], [0.5, 0.0355],
  [0.6, 0.039], [0.75, 0.049], [0.9, 0.058], [1, 0.0625]];
const halfW = (y) => sample(HALF_W, y / H);

export function createSalawaku() {
  const mats = getMaterials();
  const shield = new THREE.Group();
  shield.name = 'salawaku';
  // grup 0 = muka bertatah, grup 1 = punggung, sisi, & ujung
  shield.add(named(new THREE.Mesh(createShieldGeometry(), [mats.face, mats.body]), 'perisai'));
  shield.add(createHandle(mats));
  return shield;
}

// ---------------------------------------------------------------------------
// Geometri perisai
// ---------------------------------------------------------------------------

function createShieldGeometry() {
  const NY = 180, NU = 10;
  const positions = [], uvs = [], indices = [];
  const groups = [];
  const vert = (x, y, z, u, v) => { positions.push(x, y, z); uvs.push(u, v); return positions.length / 3 - 1; };
  const zFront = (s) => T_EDGE + (T_RIDGE - T_EDGE) * (1 - Math.abs(s)); // s ∈ [−1, 1] melintang

  // ---- Muka: dua bidang (kiri & kanan rusuk) dengan titik terpisah → lipatan rusuk tegas
  let start = indices.length;
  for (const [s0, s1] of [[-1, 0], [0, 1]]) {
    const base = positions.length / 3;
    for (let i = 0; i <= NY; i++) {
      const y = (i / NY) * H, hw = halfW(y);
      for (let j = 0; j <= NU; j++) {
        const s = THREE.MathUtils.lerp(s0, s1, j / NU);
        vert(s * hw, y, zFront(s), (s + 1) / 2, y / H);
      }
    }
    for (let i = 0; i < NY; i++) {
      for (let j = 0; j < NU; j++) {
        const a = base + i * (NU + 1) + j, b = a + 1, c = a + NU + 1, d = c + 1;
        indices.push(a, b, d, a, d, c); // normal +Z
      }
    }
  }
  groups.push([start, indices.length - start, 0]);

  // ---- Punggung (datar, menghadap −Z)
  start = indices.length;
  {
    const base = positions.length / 3, nu = 6;
    for (let i = 0; i <= NY; i++) {
      const y = (i / NY) * H, hw = halfW(y);
      for (let j = 0; j <= nu; j++) vert(THREE.MathUtils.lerp(-hw, hw, j / nu), y, 0, j / nu, y / H);
    }
    for (let i = 0; i < NY; i++) {
      for (let j = 0; j < nu; j++) {
        const a = base + i * (nu + 1) + j, b = a + 1, c = a + nu + 1, d = c + 1;
        indices.push(a, d, b, a, c, d);
      }
    }
  }
  // ---- Sisi kiri (−X) & kanan (+X)
  for (const side of [-1, 1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= NY; i++) {
      const y = (i / NY) * H, x = side * halfW(y);
      vert(x, y, 0, 0, y / H);
      vert(x, y, T_EDGE, 1, y / H);
    }
    for (let i = 0; i < NY; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3; // a,c = punggung; b,d = muka
      if (side < 0) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }
  // ---- Ujung bawah (−Y) & atas (+Y): penampang segi lima, kipas dari titik punggung kiri
  for (const [y, down] of [[0, true], [H, false]]) {
    const hw = halfW(y);
    const ring = [[-hw, 0], [hw, 0], [hw, T_EDGE], [0, T_RIDGE], [-hw, T_EDGE]].map(([x, z]) => vert(x, y, z, 0, 0));
    for (let k = 1; k < ring.length - 1; k++) {
      if (down) indices.push(ring[0], ring[k], ring[k + 1]);
      else indices.push(ring[0], ring[k + 1], ring[k]);
    }
  }
  groups.push([start, indices.length - start, 1]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  for (const [s, c, m] of groups) geo.addGroup(s, c, m);
  geo.computeVertexNormals();
  return geo;
}

// Pegangan di punggung: balok kayu berlubang untuk tangan (profil di bidang Z–Y, diekstrusi ke X)
function createHandle(mats) {
  const y0 = 0.40, y1 = 0.66; // batas tempel pegangan
  const outer = new THREE.Shape();
  outer.moveTo(0.004, y0);
  outer.quadraticCurveTo(-0.03, y0 + 0.01, -0.042, y0 + 0.05);
  outer.lineTo(-0.044, y1 - 0.05);
  outer.quadraticCurveTo(-0.03, y1 - 0.01, 0.004, y1);
  outer.lineTo(0.004, y0);
  const hole = new THREE.Path(); // lubang genggaman
  hole.moveTo(-0.008, y0 + 0.045);
  hole.lineTo(-0.008, y1 - 0.045);
  hole.quadraticCurveTo(-0.02, y1 - 0.03, -0.031, y1 - 0.06);
  hole.lineTo(-0.031, y0 + 0.06);
  hole.quadraticCurveTo(-0.02, y0 + 0.03, -0.008, y0 + 0.045);
  outer.holes.push(hole);
  // extrude() membentangkan bentuk di bidang XY; x bentuk dipakai sebagai Z dengan memutar −90° di Y
  const mesh = new THREE.Mesh(extrude(outer, 0.03, { bevel: 0.004, segments: 2, curveSegments: 10 }), mats.rawWood);
  mesh.rotation.y = -Math.PI / 2;
  mesh.name = 'pegangan';
  return mesh;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  const face = createFaceTextures();
  const raw = createRawWoodTexture();
  cached = {
    face: new THREE.MeshPhysicalMaterial({
      map: face.color, roughnessMap: face.rough, roughness: 1, bumpMap: face.bump, bumpScale: 1.5,
      // kerang: kilau pelangi tipis seperti mutiara, hanya di bagian bertatah (iridescenceMap)
      iridescence: 1, iridescenceMap: face.shell, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520],
    }),
    body: new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.6 }),
    rawWood: new THREE.MeshStandardMaterial({ map: raw, roughness: 0.75 }),
  };
  return cached;
}

// Muka: kanvas dipetakan ke UV (u melintang 0..1, v sepanjang 0..1). Motif digambar dalam
// koordinat fisik (meter) lalu diubah ke piksel lewat toCanvas(), jadi ukuran keping kerang
// tetap sama walaupun perisai menyempit di pinggang.
function createFaceTextures() {
  const W = 360, HC = 3000;
  const [color, rough, bump, shell] = [0, 1, 2, 3].map(() => canvas2d(W, HC));
  const rng = mulberry32(8);
  const toCanvas = (x, y) => [(x / halfW(y) / 2 + 0.5) * W, (1 - y / H) * HC];

  // cat hitam dengan aus: goresan & bintik kayu cokelat yang terlihat
  color.fillStyle = '#121010'; color.fillRect(0, 0, W, HC);
  rough.fillStyle = '#9a9a9a'; rough.fillRect(0, 0, W, HC);
  bump.fillStyle = '#707070'; bump.fillRect(0, 0, W, HC);
  shell.fillStyle = '#000000'; shell.fillRect(0, 0, W, HC);
  for (let i = 0; i < 160; i++) { // serat kayu memanjang yang samar terlihat di bawah cat
    const x = rng() * W;
    color.strokeStyle = `rgba(${40 + rng() * 25}, ${45 + rng() * 20}, ${38 + rng() * 15}, 0.25)`;
    color.lineWidth = 1 + rng() * 2;
    color.beginPath(); color.moveTo(x, 0); color.bezierCurveTo(x + 6, HC / 3, x - 6, (2 * HC) / 3, x + 3, HC); color.stroke();
  }
  for (let i = 0; i < 2600; i++) {
    const x = rng() * W, y = rng() * HC, edgeBias = Math.min(x, W - x) < 25 ? 0.5 : 0.18;
    color.fillStyle = `rgba(${110 + rng() * 60}, ${80 + rng() * 40}, ${50 + rng() * 30}, ${edgeBias * rng()})`;
    color.fillRect(x, y, 1 + rng() * 2, 2 + rng() * 10);
  }

  // satu keping kerang: poligon (koordinat meter) → warna, kekasaran, tonjolan, & masker kilau
  const piece = (pts) => {
    const px = pts.map(([x, y]) => toCanvas(x, y));
    const tone = ['#efe9da', '#e6e8e2', '#f1e6e4', '#e9ecdc'][Math.floor(rng() * 4)];
    const draw = (ctx, fill, stroke) => {
      ctx.beginPath();
      px.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
    };
    draw(color, tone, '#3b3631');
    draw(rough, '#3a3a3a');
    draw(bump, '#d8d8d8');
    draw(shell, '#ffffff');
  };
  const tri = (a, b, c) => piece([a, b, c]);
  const teardrop = (cx, cy, r, dir) => { // tetes: bulat di bawah, lancip ke atas-luar
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const pointy = Math.pow(Math.max(0, Math.sin(a)), 3) * 0.9; // runcing ke arah +y
      pts.push([cx + Math.cos(a) * r * (1 - pointy * 0.6) + dir * pointy * r * 0.4, cy + Math.sin(a) * r * (1 + pointy)]);
    }
    piece(pts);
  };

  // ----- gerigi di kedua tepi sepanjang perisai (segitiga menunjuk ke dalam)
  const S = 0.0085;
  for (let y = 0.015; y < H - 0.015; y += S * 1.15) {
    for (const d of [-1, 1]) {
      const e = (yy) => d * (halfW(yy) - 0.0035);
      tri([e(y), y], [e(y + S), y + S], [e(y + S / 2) - d * S * 0.75, y + S / 2]);
    }
  }

  // ----- baris sel dari atas ke bawah. Tiap bidang (kiri/kanan rusuk) dibagi 2 sel di bagian
  // lebar & 1 sel di pinggang; tiap sel diisi motif bergantian + segitiga kecil di sudutnya.
  // Di posisi "mata", sel dekat rusuk diganti kepingan kerang berbentuk tetes.
  const EYES = [0.80, 0.665, 0.565, 0.455, 0.355].map((t) => t * H);
  const MOTIFS = [star4, hourglass, diamondOut, bowtie];
  let y = H - 0.018, row = 0;
  while (y > 0.03) {
    if (row % 4 === 3) { // baris zig-zag tipis sebagai pemisah
      const h = 0.012;
      zigRow(y - h / 2, h, row % 8 === 3 ? 1 : -1, tri);
      y -= h + 0.005; row++;
      continue;
    }
    const fw = halfW(y) - 0.012;             // lebar satu bidang (tanpa gerigi tepi)
    const n = fw > 0.036 ? 2 : 1;
    const cw = fw / n, ch = THREE.MathUtils.clamp(cw, 0.022, 0.034);
    const yc = y - ch / 2;
    const eye = EYES.find((e) => Math.abs(e - yc) < ch * 0.55);
    for (const d of [-1, 1]) {
      for (let c = 0; c < n; c++) {
        const cx = d * (0.003 + cw * (c + 0.5));
        if (eye !== undefined && c === 0) { teardrop(cx, yc, Math.min(cw, ch) * 0.36, d); continue; }
        MOTIFS[(row + c) % MOTIFS.length](cx, yc, Math.min(cw, ch) * 0.42, tri);
        cornerTris(cx, yc, cw, ch, tri);
      }
    }
    y -= ch + 0.004; row++;
  }

  const tex = (ctx, srgb) => toTexture(ctx.canvas, srgb);
  return { color: tex(color, true), rough: tex(rough, false), bump: tex(bump, false), shell: tex(shell, false) };
}

// ----- Motif sel (semua dalam meter, berpusat di (cx, cy), "jari-jari" r) -----

// Jam pasir: dua segitiga bertemu ujung di tengah (atas–bawah)
function hourglass(cx, cy, r, tri) {
  const b = r * 0.7, g = r * 0.08;
  tri([cx - b, cy + r], [cx + b, cy + r], [cx, cy + g]);
  tri([cx - b, cy - r], [cx, cy - g], [cx + b, cy - r]);
}

// Dasi kupu-kupu: dua segitiga bertemu ujung di tengah (kiri–kanan)
function bowtie(cx, cy, r, tri) {
  const b = r * 0.7, g = r * 0.08;
  tri([cx - r, cy - b], [cx - r, cy + b], [cx - g, cy]);
  tri([cx + r, cy - b], [cx + g, cy], [cx + r, cy + b]);
}

// Belah ketupat: empat segitiga yang ujungnya menghadap keluar
function diamondOut(cx, cy, r, tri) {
  const b = r * 0.42, g = r * 0.12;
  tri([cx - b, cy + g], [cx + b, cy + g], [cx, cy + r]);
  tri([cx - b, cy - g], [cx, cy - r], [cx + b, cy - g]);
  tri([cx - g, cy - b], [cx - r, cy], [cx - g, cy + b]);
  tri([cx + g, cy - b], [cx + g, cy + b], [cx + r, cy]);
}

// Segitiga siku di keempat sudut sel. Sudut empat sel yang bertemu membentuk
// belah ketupat, seperti pola tatahan pada foto.
function cornerTris(cx, cy, cw, ch, tri) {
  const s = Math.min(cw, ch) * 0.26, m = 0.0012;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x0 = cx + sx * (cw / 2 - m), y0 = cy + sy * (ch / 2 - m);
    tri([x0, y0], [x0 - sx * s, y0], [x0, y0 - sy * s]);
  }
}

// Baris segitiga kecil dari rusuk ke tepi; up = 1 ujung ke atas, −1 ke bawah
function zigRow(yc, h, up, tri) {
  const hw = halfW(yc) - 0.012, w = h * 1.05;
  for (const d of [-1, 1]) {
    for (let x = 0.003; x + w <= hw + 0.002; x += w * 1.15) {
      tri([d * x, yc - (up * h) / 2], [d * (x + w), yc - (up * h) / 2], [d * (x + w / 2), yc + (up * h) / 2]);
    }
  }
}

// Bintang empat ujung dari empat segitiga yang ujungnya menghadap ke tengah
function star4(cx, cy, r, tri) {
  const g = r * 0.12, b = r * 0.45;
  tri([cx - b, cy + r], [cx + b, cy + r], [cx, cy + g]);
  tri([cx - b, cy - r], [cx, cy - g], [cx + b, cy - r]);
  tri([cx - r, cy - b], [cx - r, cy + b], [cx - g, cy]);
  tri([cx + r, cy - b], [cx + g, cy], [cx + r, cy + b]);
}

// Kayu mentah (pegangan): cokelat muda dengan serat
function createRawWoodTexture() {
  const ctx = canvas2d(128, 128);
  const rng = mulberry32(4);
  ctx.fillStyle = '#a9824f'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(90, 60, 30, ${0.15 + rng() * 0.2})`;
    ctx.lineWidth = 1 + rng() * 2;
    const y = rng() * 128;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(40, y + 6, 90, y - 6, 128, y); ctx.stroke();
  }
  const tex = toTexture(ctx.canvas, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function sample(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * (t * t * (3 - 2 * t));
    }
  }
  return table[table.length - 1][1];
}

function named(object, name) {
  object.name = name;
  return object;
}

function canvas2d(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c.getContext('2d');
}

function toTexture(canvas, srgb) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}