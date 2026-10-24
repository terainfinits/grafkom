import * as THREE from 'three';
import { extrude } from './common.js';

/*
 * Busur & panah Papua, dimodelkan dari foto referensi. Dipajang tegak di panel dinding
 * (display: 'wall', muka menghadap +Z). Bawah di y = 0.
 *
 *   busur : bilah kayu palem (nibung) ± 1,72 m — penampang pipih (tipis dilihat dari depan,
 *           lebar ke arah pengunjung), meruncing ke ujung, serat palem gelap memanjang.
 *           Tali dari bilah rotan gelap, diikat lilitan di kedua ujung.
 *   panah : enam batang gelagah beruas ± 1,55 m, TANPA bulu, ekor dililit gelap, sambungan
 *           mata panah dililit serat (cokelat / kuning anggrek / kehijauan). Diikat jadi satu
 *           berkas dengan tali yang ujungnya menjuntai, sedikit dikipaskan supaya tiap mata
 *           panah terlihat. Mata panah berbeda-beda sesuai buruan:
 *             (a) kayu keras bergerigi selang-seling   (d) bercabang tiga (burung/ikan)
 *             (b) bilah bambu lebar bertulang tengah   (e) gerigi satu sisi, dicat oker merah-putih
 *             (c) runcing polos berukir cincin          (f) tumpul berkenop (burung)
 *
 *      │││╱╲   ╮
 *      ││││    │╲      ← busur melengkung, tali lurus di sisi panah
 *     ═╪╪╪═~~  │ )     ← ikatan berkas + ujung tali menjuntai
 *      ││││    │╱
 *     ╱│││╲    ╯
 */

const BOW_H = 1.72;
const SHAFT_LEN = 1.22;   // batang gelagah
const TIE_Y = 1.12;       // tinggi ikatan berkas (dari ekor panah)

export function createBusurPanah() {
  const mats = getMaterials();
  const g = new THREE.Group();
  g.name = 'busur & panah';
  g.add(createBow(mats));

  // ---------- Berkas anak panah ----------
  const kinds = ['barbed', 'bamboo', 'plain', 'prong', 'painted', 'blunt'];
  const wraps = [mats.fiberDark, mats.fiberYellow, mats.fiberGreen, mats.fiberDark, mats.fiberYellow, mats.fiberGreen];
  const bundle = new THREE.Group();
  bundle.name = 'berkas panah';
  const SPACING = 0.02;                            // jarak antarbatang di titik ikatan
  const LIFT = [0.03, -0.02, 0.055, 0.0, -0.035, 0.02]; // tinggi tiap panah sedikit berbeda (ujung tidak sejajar)
  kinds.forEach((kind, i) => {
    const k = i - (kinds.length - 1) / 2;
    // tiap panah diputar sedikit di titik ikatan: ekor menyebar lebar, ujung tetap rapat
    // (seperti berkas pada foto)
    const pivot = new THREE.Group();
    pivot.position.set(-0.22 + k * SPACING, 0.02 + TIE_Y, (i % 2 ? 1 : -1) * 0.004);
    pivot.rotation.z = k * 0.011;
    const arrow = createArrow(kind, mats, wraps[i], i);
    arrow.position.y = -TIE_Y + LIFT[i];
    pivot.add(arrow);
    bundle.add(pivot);
  });
  bundle.add(createTie(mats, -0.22, 0.02 + TIE_Y, kinds.length * SPACING + 0.008));
  g.add(bundle);
  return g;
}

// ---------------------------------------------------------------------------
// Busur
// ---------------------------------------------------------------------------

function createBow(mats) {
  const bow = new THREE.Group();
  bow.name = 'busur';
  const X0 = 0.1; // garis tali
  const arc = new THREE.CatmullRomCurve3([
    [X0, 0], [0.165, 0.25], [0.232, 0.6], [0.258, 0.86], [0.234, 1.12], [0.168, 1.47], [X0, BOW_H],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  // jari-jari = setengah tebal (terlihat dari depan); squash > 1 → bilah lebih lebar ke arah Z
  const half = (t) => 0.0034 + 0.0032 * Math.sin(Math.PI * t);
  bow.add(named(new THREE.Mesh(sweepGeometry(arc, half, { tubular: 120, radial: 14, squash: 2.2 }), mats.palm), 'bilah busur'));

  for (const t of [0, 1]) {
    // ujung busur sedikit mencuat & membulat
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0036, 10, 8), mats.palm);
    tip.position.copy(arc.getPointAt(t));
    tip.scale.set(1, 1.6, 2.2);
    bow.add(tip);
    // lilitan rotan pengikat tali di ujung
    const p = arc.getPointAt(t === 0 ? 0.025 : 0.975), dir = arc.getTangentAt(t === 0 ? 0.025 : 0.975);
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.05, 12), mats.fiberDark);
    wrap.scale.z = 1.9;
    wrap.position.copy(p);
    wrap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    bow.add(wrap);
  }

  // Tali: bilah rotan pipih, lurus di antara kedua lilitan
  const a = arc.getPointAt(0.03), b = arc.getPointAt(0.97);
  const len = a.distanceTo(b);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, len, 8), mats.rattan);
  string.scale.z = 2.2;
  string.position.copy(a).add(b).multiplyScalar(0.5);
  string.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  bow.add(named(string, 'tali busur'));
  return bow;
}

// ---------------------------------------------------------------------------
// Anak panah
// ---------------------------------------------------------------------------

function createArrow(kind, mats, wrapMat, seed) {
  const arrow = new THREE.Group();
  const rng = mulberry32(seed + 1);

  // Batang gelagah: satu lathe dengan tonjolan ruas tiap ± 26 cm (posisi berbeda tiap panah).
  // Titik lathe urut dari bawah ke atas → muka menghadap keluar.
  const pts = [new THREE.Vector2(0, 0)];
  const nodes = [];
  for (let y = 0.12 + rng() * 0.12; y < SHAFT_LEN - 0.08; y += 0.24 + rng() * 0.06) nodes.push(y);
  for (let i = 0; i <= 160; i++) {
    const y = (i / 160) * SHAFT_LEN;
    const bump = nodes.reduce((m, n) => Math.max(m, Math.exp(-(((y - n) / 0.006) ** 2))), 0);
    pts.push(new THREE.Vector2(0.0047 - 0.0006 * (y / SHAFT_LEN) + 0.0009 * bump, y));
  }
  pts.push(new THREE.Vector2(0, SHAFT_LEN));
  arrow.add(named(new THREE.Mesh(new THREE.LatheGeometry(pts, 10), mats.cane), 'batang'));

  // Ekor: lilitan gelap + ujung berlekuk (tempat tali busur)
  addWrap(arrow, mats.fiberDark, 0.01, 0.045, 0.0055);
  const nock = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.008, 0.012), mats.hardwood);
  nock.position.y = 0.002;
  arrow.add(nock);

  // Sambungan mata panah: lilitan serat (warna berbeda tiap panah) + satu cincin hias di bawahnya
  addWrap(arrow, wrapMat, SHAFT_LEN - 0.05, 0.06, 0.0058);
  addWrap(arrow, wrapMat === mats.fiberDark ? mats.fiberYellow : mats.fiberDark, SHAFT_LEN - 0.2, 0.018, 0.0055);

  const tip = TIPS[kind](mats);
  tip.position.y = SHAFT_LEN - 0.03; // pangkal mata panah masuk ke dalam batang
  arrow.add(tip);
  return arrow;
}

function addWrap(parent, material, y, len, r) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12, 1, false), material);
  w.position.y = y + len / 2;
  parent.add(w);
  return w;
}

// ----- Mata panah (pangkal di y = 0, mengarah ke +Y) -----

const TIPS = {
  // (a) kayu keras dengan gerigi (duri balik) bergantian kiri-kanan, diukir dari satu batang
  barbed(mats) {
    const L = 0.34, r = 0.0035;
    const right = [[r, 0]], left = [[-r, 0]];
    for (let k = 0; k < 6; k++) {
      const y = 0.12 + k * 0.03, side = k % 2 ? left : right, s = k % 2 ? -1 : 1;
      side.push([s * r, y - 0.012], [s * 0.0105, y - 0.018], [s * r, y]); // duri menghadap ke bawah
    }
    right.push([r * 0.8, L - 0.05]);
    left.push([-r * 0.8, L - 0.05]);
    return carved([...right, [0, L], ...left.reverse()], 0.0062, mats.hardwood);
  },

  // (b) bilah bambu lebar berbentuk daun dengan tulang tengah, untuk buruan besar
  bamboo(mats) {
    const g = new THREE.Group();
    const L = 0.3, pts = [], steps = 24;
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      pts.push([0.021 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.75) + 0.0045 * (1 - s), s * L]);
    }
    for (let i = steps; i >= 0; i--) {
      const s = i / steps;
      pts.push([-0.021 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.75) - 0.0045 * (1 - s), s * L]);
    }
    g.add(new THREE.Mesh(extrude(pts, 0.0026, { bevel: 0.0008 }), mats.bamboo));
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.0035, L * 0.86, 0.0045), mats.bambooDark);
    rib.position.y = L * 0.43;
    g.add(rib);
    return g;
  },

  // (c) kayu keras runcing polos dengan ukiran cincin di pangkal
  plain(mats) {
    const pts = [[0, 0]];
    for (let i = 0; i <= 60; i++) {
      const y = (i / 60) * 0.33;
      const groove = y > 0.03 && y < 0.1 && Math.floor(y / 0.008) % 2 === 0 ? -0.0009 : 0;
      pts.push([Math.max(0.0004, 0.0046 * (1 - Math.pow(y / 0.33, 1.6))) + groove, y]);
    }
    return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 10), mats.hardwood);
  },

  // (d) tiga cabang runcing yang sedikit menyebar, diikat di pangkal (untuk burung & ikan)
  prong(mats) {
    const g = new THREE.Group();
    for (const s of [-1, 0, 1]) {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.0025, 0, s * 0.0015), new THREE.Vector3(s * 0.008, 0.12, s * 0.003),
        new THREE.Vector3(s * 0.018, 0.24, s * 0.004), new THREE.Vector3(s * 0.022, 0.30 - Math.abs(s) * 0.02, s * 0.004),
      ]);
      g.add(new THREE.Mesh(sweepGeometry(c, (t) => 0.0034 * (1 - t) + 0.0005, { tubular: 24, radial: 8 }), mats.hardwood));
    }
    addWrap(g, mats.fiberDark, 0.01, 0.05, 0.0058);
    addWrap(g, mats.fiberYellow, 0.07, 0.012, 0.0048);
    return g;
  },

  // (e) gerigi besar di satu sisi, batang dicat pita oker merah & kapur putih
  painted(mats) {
    const L = 0.35, r = 0.0038;
    const right = [[r, 0]];
    for (let k = 0; k < 5; k++) {
      const y = 0.14 + k * 0.034;
      right.push([r, y - 0.016], [0.0125, y - 0.022], [r, y]);
    }
    right.push([r * 0.8, L - 0.05], [0, L]);
    const outline = [...right, [-r * 0.8, L - 0.05], [-r, 0]];
    return carved(outline, 0.0066, mats.painted);
  },

  // (f) tumpul berkenop: melumpuhkan burung tanpa merusak bulunya
  blunt(mats) {
    const pts = [[0, 0], [0.0045, 0], [0.0042, 0.2], [0.0062, 0.215], [0.0105, 0.235], [0.0115, 0.255],
      [0.0095, 0.272], [0.005, 0.282], [0, 0.284]];
    return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 14), mats.hardwood);
  },
};

// Bentuk 2D diukir dari batang kayu: ekstrusi dengan bevel supaya tepinya membulat
function carved(outline, depth, material) {
  return new THREE.Mesh(extrude(outline, depth, { bevel: 0.0012, segments: 2 }), material);
}

// Tali pengikat berkas: lilitan di depan & belakang berkas + dua ujung tali menjuntai ke kiri
function createTie(mats, x, y, width) {
  const g = new THREE.Group();
  // beberapa lilitan tali melingkari berkas (tabung lonjong pipih)
  for (const dy of [-0.006, -0.002, 0.002, 0.006]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 6, 36), mats.cord);
    loop.scale.set(width / 2, 0.012, 0.016); // torus di bidang XY → dipipihkan jadi lingkaran lonjong di bidang XZ
    loop.rotation.x = Math.PI / 2;
    loop.position.set(x, y + dy, 0);
    g.add(loop);
  }
  for (const [dx, dy, droop] of [[-0.11, -0.03, 0.05], [-0.13, 0.02, 0.02]]) {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - width / 2, y, 0.01),
      new THREE.Vector3(x - width / 2 + dx * 0.4, y + dy * 0.2, 0.014),
      new THREE.Vector3(x - width / 2 + dx * 0.75, y + dy - droop * 0.4, 0.012),
      new THREE.Vector3(x - width / 2 + dx, y + dy - droop, 0.01),
    ]);
    g.add(new THREE.Mesh(sweepGeometry(c, () => 0.0018, { tubular: 30, radial: 6, squash: 1.8 }), mats.cord));
  }
  return g;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  const palm = fiberTexture([84, 44, 28], [[42, 20, 13], [118, 72, 46]], 110, 3);
  palm.repeat.set(1, 5);
  const cane = fiberTexture([206, 178, 112], [[160, 128, 70], [228, 206, 150]], 50, 5, true);
  cane.repeat.set(1, 3);
  const hard = fiberTexture([58, 34, 20], [[30, 16, 10], [90, 58, 36]], 40, 7);
  hard.repeat.set(1, 2);
  const bamboo = fiberTexture([214, 180, 112], [[176, 136, 74]], 30, 9);
  bamboo.repeat.set(20, 3);
  cached = {
    palm: new THREE.MeshStandardMaterial({ map: palm, roughness: 0.55 }),
    rattan: new THREE.MeshStandardMaterial({ color: 0x2c2118, roughness: 0.5 }),
    cane: new THREE.MeshStandardMaterial({ map: cane, roughness: 0.5 }),
    hardwood: new THREE.MeshStandardMaterial({ map: hard, roughness: 0.45 }),
    bamboo: new THREE.MeshStandardMaterial({ map: bamboo, roughness: 0.55 }),
    bambooDark: new THREE.MeshStandardMaterial({ color: 0x9c7840, roughness: 0.6 }),
    painted: new THREE.MeshStandardMaterial({ map: paintedTexture(), roughness: 0.6 }),
    fiberDark: new THREE.MeshStandardMaterial({ map: wrapTexture('#2e2117', '#4a3726'), roughness: 0.8 }),
    fiberYellow: new THREE.MeshStandardMaterial({ map: wrapTexture('#c9a235', '#8f7020'), roughness: 0.7 }),
    fiberGreen: new THREE.MeshStandardMaterial({ map: wrapTexture('#5f7d6a', '#3d5446'), roughness: 0.75 }),
    cord: new THREE.MeshStandardMaterial({ color: 0x1f1a16, roughness: 0.8 }),
  };
  return cached;
}

// Serat memanjang (garis tegak pada kanvas = sepanjang benda pada UV lathe/sweep);
// spots = bintik cokelat seperti pada gelagah
function fiberTexture(base, lines, count, seed, spots = false) {
  const W = 64, H = 512;
  const ctx = canvas2d(W, H);
  const rng = mulberry32(seed);
  ctx.fillStyle = `rgb(${base})`; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < count; i++) {
    const [r, g, b] = lines[Math.floor(rng() * lines.length)];
    ctx.fillStyle = `rgba(${r},${g},${b},${0.25 + rng() * 0.4})`;
    ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 1.5, 30 + rng() * 300);
  }
  if (spots) {
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(120, 82, 40, ${0.2 + rng() * 0.3})`;
      ctx.beginPath(); ctx.ellipse(rng() * W, rng() * H, 1 + rng() * 2, 3 + rng() * 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  const tex = toTexture(ctx.canvas, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Lilitan serat: garis miring (pada silinder tampak seperti lilitan spiral)
function wrapTexture(light, dark) {
  const ctx = canvas2d(64, 64);
  ctx.fillStyle = light; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = dark; ctx.lineWidth = 3;
  for (let k = -64; k < 128; k += 8) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 24, 64); ctx.stroke(); }
  const tex = toTexture(ctx.canvas, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  return tex;
}

// Mata panah (e): kayu gelap dengan pita oker merah & kapur putih. UV ekstrusi = meter,
// jadi kanvas dipetakan ke y ∈ [0, 0,36 m] lewat repeat.
function paintedTexture() {
  const ctx = canvas2d(16, 360);
  ctx.fillStyle = '#3a2416'; ctx.fillRect(0, 0, 16, 360);
  const band = (y0, y1, c) => { ctx.fillStyle = c; ctx.fillRect(0, 360 - y1 * 1000, 16, (y1 - y0) * 1000); };
  band(0.03, 0.05, '#a8432a'); band(0.05, 0.058, '#e8e0cc'); band(0.058, 0.075, '#a8432a');
  band(0.09, 0.1, '#e8e0cc'); band(0.29, 0.3, '#e8e0cc'); band(0.3, 0.315, '#a8432a');
  const tex = toTexture(ctx.canvas, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1 / 0.36);
  return tex;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

// Tabung mengikuti kurva, jari-jari berubah, penampang lonjong (muka menghadap keluar)
function sweepGeometry(curve, radiusAt, { tubular = 48, radial = 20, squash = 1 } = {}) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular, P = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], r = radiusAt(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r * squash;
      positions.push(P.x + N.x * c + B.x * s, P.y + N.y * c + B.y * s, P.z + N.z * c + B.z * s);
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