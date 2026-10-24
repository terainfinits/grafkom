import * as THREE from 'three';
import { extrude, lieFlat, addSupports, materials } from './common.js';

/*
 * Pedang Bara Sangihe (Kepulauan Sangihe, Sulawesi Utara), dimodelkan dari foto referensi.
 *
 *   Pedang tegak di +Y (hulu di bawah y = 0, bilah di atas). Sisi punggung di x = 0,
 *   sisi tajam di x besar — sama dengan konvensi common.js.
 *
 *     bilah : lurus, baja mengilap. Ujungnya bercabang seperti mulut buaya:
 *               rahang atas  — sisi bawahnya bergerigi, punggungnya bersirip runcing
 *               rahang bawah — sisi atasnya bergerigi + kait kecil, lalu menjadi ujung tikam
 *             dan sebuah lubang "mata" di belakang mulut.
 *
 *                       sirip
 *          ────────────╱╲──────╮  ← rahang atas
 *        ◯   ╲╲╲╲╲╲╲╲╲╲╲╲╲╲╲╲╲    (gerigi)
 *        mata  > mulut
 *              ╱╱╱╱╱╱╱╱╱╱╲___________  ← rahang bawah → ujung tikam
 *          ───────────────────────────╱
 *
 *     hulu  : kayu hitam kehijauan mengilap — tudung lebar di pangkal bilah, pegangan
 *             bercincin, lalu bercabang dua (cabang punggung lurus berujung pipih bercelah,
 *             cabang mata menyerong ke luar).
 *     sarung: papan berlapis beludru merah dengan pita sulaman benang emas.
 *
 * createBaraSangihe() mengembalikan Group yang sudah ditata rebah di atas pedestal
 * (titik (0,0,0) = permukaan pedestal).
 */

const L = 0.6;                 // panjang bilah
const PX = L / 815;            // meter per piksel foto (bilah di foto 815 px)
const HILT_X = 0.0165;         // sumbu hulu = tengah pangkal bilah

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function createBaraSangihe() {
  const m = materials();
  const display = new THREE.Group();

  const lyingSword = lieFlat(createBaraModel(), 0.3);
  lyingSword.position.set(-0.31, 0, -0.075);
  display.add(lyingSword);

  const lyingSheath = lieFlat(createSarungModel(), 0.12);
  lyingSheath.position.set(-0.3, 0, 0.115);
  display.add(lyingSheath);

  // titik terendah tiap benda tepat di permukaan pedestal; pedang sedikit diangkat di atas penyangga
  for (const obj of [lyingSword, lyingSheath]) {
    obj.updateMatrixWorld(true);
    obj.position.y -= new THREE.Box3().setFromObject(obj).min.y;
  }
  lyingSword.position.y += 0.012;

  // tinggi penyangga = jarak ke permukaan bawah bilah (raycast dari bawah)
  display.updateMatrixWorld(true);
  const blade = lyingSword.getObjectByName('bilah');
  const ray = new THREE.Raycaster();
  // di badan bilah (t ≈ 0,2 & 0,55), jauh dari celah mulut supaya raycast pasti mengenai bilah
  for (const x of [-0.31 + 0.2 * L, -0.31 + 0.55 * L]) {
    ray.set(new THREE.Vector3(x, -1, lyingSword.position.z + 0.015), new THREE.Vector3(0, 1, 0));
    const hit = ray.intersectObject(blade, false)[0];
    if (hit) addSupports(display, m.woodStand, [x], hit.point.z, hit.point.y);
  }
  return display;
}

export function createBaraModel() {
  const mats = getMaterials();
  const sword = new THREE.Group();
  sword.name = 'bara sangihe';
  const blade = new THREE.Mesh(extrude(bladeShape(), 0.0036, { bevel: 0.0009, segments: 2, curveSegments: 16 }), mats.steel);
  sword.add(named(blade, 'bilah'));
  sword.add(createHulu(mats));
  return sword;
}

export function createSarungModel() {
  const mats = getMaterials();
  const sarung = new THREE.Group();
  sarung.name = 'sarung';
  // bevel besar → tepi membulat seperti papan yang dibungkus kain empuk
  const board = new THREE.Mesh(extrude(sheathShape(), SHEATH_T - 0.012, { bevel: 0.006, segments: 4, curveSegments: 8 }), mats.velvet);
  sarung.add(named(board, 'sarung beludru'));
  return sarung;
}

// ---------------------------------------------------------------------------
// Bilah
// ---------------------------------------------------------------------------

// Titik bilah dalam meter: x = jarak dari punggung, y = t·L sepanjang bilah
const P = (x, t) => new THREE.Vector2(x, t * L);
const V = P(0.019, 0.65);     // pangkal mulut (titik V)
const J = P(0.006, 0.885);    // ujung bawah rahang atas
const K = P(0.026, 0.80);     // akhir gerigi rahang bawah

function bladeShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.012);                 // mulai sedikit di dalam tudung hulu
  s.lineTo(0.033, -0.012);
  s.lineTo(0.033, 0);
  s.lineTo(0.040, 0.65 * L);           // mata (sisi tajam) melebar perlahan
  s.lineTo(0.0465, 1.0 * L);           // ujung tikam
  s.lineTo(0.027, 0.815 * L);          // tepi atas rahang bawah
  s.lineTo(0.0205, 0.821 * L);         // kait kecil di ujung gerigi bawah
  s.lineTo(K.x + 0.0005, K.y + 0.004);
  addTeeth(s, K, V, 10, -1);           // gerigi rahang bawah (dari K mundur ke V)
  addTeeth(s, V, J, 17, -1);           // gerigi rahang atas (dari V maju ke ujung rahang)
  s.lineTo(-0.0045, 0.893 * L);        // ujung rahang atas sedikit mencuat
  s.lineTo(0, 0.86 * L);
  s.lineTo(0, 0.815 * L);
  s.lineTo(-0.0095, 0.818 * L);        // sirip runcing di punggung, menghadap ke ujung
  s.lineTo(0, 0.785 * L);
  s.lineTo(0, -0.012);

  // lubang "mata" di belakang mulut
  const eye = new THREE.Path();
  eye.absarc(0.0125, 0.607 * L, 0.0048, 0, Math.PI * 2, true);
  s.holes.push(eye);
  return s;
}

// Gerigi gergaji dari titik a ke b: tiap gigi menonjol `0.0026 m` ke dalam mulut.
// side menentukan arah tonjolan (kiri/kanan dari arah a → b).
function addTeeth(shape, a, b, n, side) {
  const d = b.clone().sub(a);
  const normal = new THREE.Vector2(-d.y, d.x).normalize().multiplyScalar(0.0026 * side);
  for (let k = 0; k < n; k++) {
    const p0 = a.clone().lerp(b, k / n);
    const tip = a.clone().lerp(b, (k + 0.65) / n).add(normal);
    shape.lineTo(p0.x, p0.y);
    shape.lineTo(tip.x, tip.y);
  }
  shape.lineTo(b.x, b.y);
}

// ---------------------------------------------------------------------------
// Hulu
// ---------------------------------------------------------------------------

function createHulu(mats) {
  const group = new THREE.Group();
  group.name = 'hulu';

  // Tudung (pangkal hulu) & pegangan bercincin: satu profil lathe, dipipihkan sedikit.
  // Titik lathe disusun dari bawah ke atas supaya mukanya menghadap keluar.
  const profile = [
    [0.0, -0.128], [0.0132, -0.127], [0.0138, -0.105], [0.0140, -0.088],
    // empat cincin ukiran
    [0.0140, -0.085], [0.0160, -0.083], [0.0160, -0.077], [0.0140, -0.075],
    [0.0140, -0.072], [0.0160, -0.070], [0.0160, -0.064], [0.0140, -0.062],
    [0.0140, -0.059], [0.0160, -0.057], [0.0160, -0.051], [0.0140, -0.049],
    [0.0140, -0.046], [0.0163, -0.044], [0.0163, -0.040], [0.0145, -0.037],
    // tudung: melebar ke arah bilah dengan sudut membulat
    [0.0170, -0.0355], [0.0215, -0.032], [0.0240, -0.024], [0.0248, -0.011],
    [0.0243, -0.003], [0.0228, 0.0], [0.0, 0.0005],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), mats.wood);
  body.scale.z = 0.72;
  body.position.x = HILT_X;
  group.add(body);

  // Cabang punggung: lurus, sedikit naik, berujung pipih (seperti paruh bebek) dengan celah
  const upper = new THREE.CatmullRomCurve3([
    [HILT_X, -0.11], [HILT_X - 0.003, -0.17], [HILT_X - 0.007, -0.24], [HILT_X - 0.009, -0.298],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  group.add(new THREE.Mesh(sweepGeometry(upper, (t) => sample([[0, 0.0135], [0.4, 0.0118], [1, 0.0108]], t), { squash: 0.8 }), mats.wood));
  // ujung pipih bersudut (seperti paruh bebek), sedikit lebih lebar dari cabangnya
  const bill = new THREE.Mesh(extrude([
    [-0.0115, 0.01], [0.0105, 0.01], [0.0115, -0.034], [0.005, -0.043], [-0.0125, -0.041],
  ], 0.014, { bevel: 0.0026, segments: 2 }), mats.wood);
  bill.position.copy(upper.getPointAt(1));
  group.add(bill);
  for (const z of [1, -1]) { // celah memanjang di sisi cabang punggung
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.0015), mats.woodDark);
    slot.position.set(HILT_X - 0.0075, -0.262, z * 0.0087); // rata dengan permukaan cabang
    slot.rotation.z = 0.05;
    group.add(slot);
  }

  // Cabang mata: menyerong ke luar, meruncing & ujungnya membulat
  const lower = new THREE.CatmullRomCurve3([
    [HILT_X, -0.11], [HILT_X + 0.007, -0.17], [HILT_X + 0.022, -0.235], [HILT_X + 0.040, -0.300], [HILT_X + 0.047, -0.335],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const lowerR = (t) => sample([[0, 0.0132], [0.5, 0.0110], [1, 0.0082]], t);
  group.add(new THREE.Mesh(sweepGeometry(lower, lowerR, { squash: 0.8 }), mats.wood));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(lowerR(1), 14, 10), mats.wood);
  cap.position.copy(lower.getPointAt(1));
  cap.scale.z = 0.8;
  group.add(cap);
  return group;
}

// ---------------------------------------------------------------------------
// Sarung
// ---------------------------------------------------------------------------

const SHEATH_T = 0.024;
const SHEATH_L = 0.72;
const SB = { x0: -0.04, x1: 0.075, y0: -0.01, y1: 0.735 }; // kotak batas (pemetaan tekstur)
const EMBROIDERY = [0.05, 0.125, 0.555];                    // posisi pita sulaman emas

function sheathShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.028, 0);
  s.lineTo(0.063, 0);
  s.lineTo(0.063, SHEATH_L - 0.035);
  s.lineTo(-0.028, SHEATH_L);       // ujung dipotong miring seperti di foto
  s.lineTo(-0.028, 0);
  return s;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  const steel = createSteelTexture();
  const wood = createEbonyTexture();
  const velvet = createVelvetTextures();
  cached = {
    steel: new THREE.MeshStandardMaterial({ color: 0xdde2e6, map: steel, metalness: 0.8, roughness: 0.22 }),
    wood: new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x0c0d0b, roughness: 0.7 }),
    // beludru: "sheen" memberi kilau lembut di sudut miring seperti kain asli
    velvet: new THREE.MeshPhysicalMaterial({
      map: velvet.color, bumpMap: velvet.bump, bumpScale: 2.5, metalnessMap: velvet.metal, metalness: 1,
      roughnessMap: velvet.rough, roughness: 1,
      sheen: 1, sheenColor: new THREE.Color(0xc8303a), sheenRoughness: 0.5,
    }),
  };
  return cached;
}

// Baja dipoles: gurat halus memanjang (UV bilah = meter → diulang)
function createSteelTexture() {
  const W = 128, H = 1024;
  const ctx = canvas2d(W, H);
  const rng = mulberry32(3);
  ctx.fillStyle = '#c9ced3'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) {
    const x = rng() * W, y = rng() * H;
    ctx.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(60,70,80,0.08)';
    ctx.fillRect(x, y, 1, 20 + rng() * 140);
  }
  const tex = toTexture(ctx.canvas, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 0.05, 1 / 0.6);
  return tex;
}

// Kayu hitam kehijauan dengan serat cokelat-hijau (seperti hulu di foto)
function createEbonyTexture() {
  const S = 256;
  const noise = createNoise(13);
  const data = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const n = noise.fbm(u * 2, v * 6, 4, 2, 6);
      const streak = 0.5 + 0.5 * Math.sin((u * 8 + n * 4) * Math.PI); // 8π: periodik di u = 1
      const k = Math.pow(streak, 2) * 0.45 + noise.fbm(u * 3, v * 3, 3, 3, 3) * 0.4;
      const i = (y * S + x) * 4;
      data[i] = 20 + 52 * k; data[i + 1] = 27 + 48 * k; data[i + 2] = 23 + 26 * k; data[i + 3] = 255;
    }
  }
  const c = document.createElement('canvas');
  c.width = c.height = S;
  c.getContext('2d').putImageData(new ImageData(data, S, S), 0, 0);
  const tex = toTexture(c, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2); // lathe & tabung: u mengelilingi, v sepanjang hulu
  return tex;
}

// Beludru merah berkerut halus + pita sulaman emas bertepi bergelombang (payet & benang)
function createVelvetTextures() {
  const W = 300, H = Math.round(W * (SB.y1 - SB.y0) / (SB.x1 - SB.x0));
  const [color, bump, metal, rough] = [0, 1, 2, 3].map(() => canvas2d(W, H));
  const rng = mulberry32(31);
  const py = (y) => (1 - (y - SB.y0) / (SB.y1 - SB.y0)) * H;

  // dasar beludru + kerutan memanjang
  color.fillStyle = '#8a0b12'; color.fillRect(0, 0, W, H);
  bump.fillStyle = '#808080'; bump.fillRect(0, 0, W, H);
  metal.fillStyle = '#000000'; metal.fillRect(0, 0, W, H);
  rough.fillStyle = '#e0e0e0'; rough.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = rng() * W, len = 80 + rng() * 400, y = rng() * H;
    const g = bump.createLinearGradient(x - 10, 0, x + 10, 0);
    g.addColorStop(0, 'rgba(128,128,128,0)'); g.addColorStop(0.5, 'rgba(170,170,170,0.5)'); g.addColorStop(1, 'rgba(128,128,128,0)');
    bump.fillStyle = g; bump.fillRect(x - 10, y, 20, len);
    color.fillStyle = `rgba(${rng() < 0.5 ? '70,0,5' : '200,40,50'},0.05)`;
    color.fillRect(x - 6, y, 12, len);
  }

  // pita sulaman: tepi bergelombang, diisi ribuan payet kecil berbagai warna emas
  for (const yb of EMBROIDERY) {
    const cy = py(yb), half = 0.016 / (SB.y1 - SB.y0) * H; // lebar pita ±1,6 cm
    // Bentuk pita: gugusan "daun" lonjong berselang kiri-kanan sepanjang lebar sarung,
    // digabung jadi satu wilayah → tepinya berlekuk-lekuk seperti sulaman di foto
    const lobes = [];
    for (let x = -10, k = 0; x <= W + 10; x += 16 + rng() * 6, k++) {
      lobes.push([x, cy + (k % 2 ? -1 : 1) * half * 0.28, 11 + rng() * 5, half * (0.75 + rng() * 0.25), (k % 2 ? 1 : -1) * 0.35]);
    }
    const lobePath = (ctx) => {
      ctx.beginPath();
      for (const [x, y, rx, ry, rot] of lobes) { ctx.moveTo(x + rx, y); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
    };
    const region = (ctx, fill) => { lobePath(ctx); ctx.fillStyle = fill; ctx.fill('nonzero'); };
    region(color, '#8a6418'); region(bump, '#c8c8c8'); region(metal, '#d0d0d0'); region(rough, '#707070');
    // payet kecil berbagai warna emas, hanya di dalam wilayah pita
    for (const ctx of [color, bump]) { ctx.save(); lobePath(ctx); ctx.clip('nonzero'); }
    for (let i = 0; i < 3200; i++) {
      const x = rng() * W, y = cy + (rng() - 0.5) * half * 2.6;
      const sz = 1.5 + rng() * 3;
      color.fillStyle = ['#f2d36b', '#d9ac3c', '#b8892a', '#fff1a8'][Math.floor(rng() * 4)]; color.fillRect(x, y, sz, sz);
      bump.fillStyle = rng() < 0.5 ? '#ffffff' : '#a0a0a0'; bump.fillRect(x, y, sz, sz);
    }
    color.restore(); bump.restore();
    const edge = (x, side) => cy + side * half * (0.9 + 0.3 * Math.abs(Math.sin(x * 0.2)));
    // benang lepas di tepi
    color.strokeStyle = '#e8c45a'; color.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const x = rng() * W, side = rng() < 0.5 ? -1 : 1, y = edge(x, side);
      color.beginPath(); color.moveTo(x, y); color.lineTo(x + (rng() - 0.5) * 8, y + side * (4 + rng() * 10)); color.stroke();
    }
  }
  const map = (ctx, srgb) => {
    const tex = toTexture(ctx.canvas, srgb);
    tex.repeat.set(1 / (SB.x1 - SB.x0), 1 / (SB.y1 - SB.y0));
    tex.offset.set(-SB.x0 / (SB.x1 - SB.x0), -SB.y0 / (SB.y1 - SB.y0));
    return tex;
  };
  return { color: map(color, true), bump: map(bump, false), metal: map(metal, false), rough: map(rough, false) };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

// Tabung mengikuti kurva, jari-jari berubah, penampang lonjong (muka menghadap keluar)
function sweepGeometry(curve, radiusAt, { tubular = 48, radial = 20, squash = 1 } = {}) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular, Pt = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], r = radiusAt(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r * squash;
      positions.push(Pt.x + N.x * c + B.x * s, Pt.y + N.y * c + B.y * s, Pt.z + N.z * c + B.z * s);
      uvs.push(j / radial, t);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

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

// Value noise 2D periodik + fbm (px, py = periode bilangan bulat; 0 = tidak periodik)
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