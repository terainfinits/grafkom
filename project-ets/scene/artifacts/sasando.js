/*
File Purpose: Membuat model 3D prosedural alat musik tradisional Sasando (Pulau Rote, NTT)
              menggunakan geometri Three.js, dimodelkan dari foto referensi.
Connected Files:
- ../exhibits.js: Diimpor oleh pembuat koleksi pameran untuk diletakkan di atas pedestal pameran.

Bagian-bagian (tegak di +Y, alas di y = 0, muka terbuka menghadap +Z):
  - tabung bambu   : dicat motif belah ketupat silang hitam-merah di atas jingga + pita zig-zag
  - dudukan atas/bawah: cincin kayu bubut; di atas ada kenop & deretan pasak penyetel logam
  - dawai          : ± 28 dawai logam di sepanjang tabung, ditopang penyangga kecil (senda)
  - hiasan sayap   : ukiran burung kecil di tengah tabung
  - resonator      : wadah daun lontar berbentuk tetes, terbuka di depan, berlipat-lipat (serat
                     memanjang), ujung atas diikat simpul pita lontar
  - alas           : papan lontar setengah lingkaran + balok kayu bercat motif
*/

import * as THREE from 'three';

const TUBE_R = 0.032;
const TUBE_Y0 = 0.075, TUBE_Y1 = 0.545;   // bagian tabung yang dicat
const STRINGS = 28;

export function createSasando() {
  const mats = getMaterials();
  const group = new THREE.Group();
  group.name = 'sasando';

  group.add(createBase(mats));
  group.add(createResonator(mats));
  group.add(createTube(mats));
  group.add(createStrings(mats));
  group.add(createBow(mats));

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// ---------------------------------------------------------------------------
// Tabung, dudukan, kenop, pasak
// ---------------------------------------------------------------------------

function createTube(mats) {
  const g = new THREE.Group();
  g.name = 'tabung bambu';

  // tabung bercat (lathe dari bawah ke atas → muka menghadap keluar)
  const body = lathe([[TUBE_R, TUBE_Y0], [TUBE_R, TUBE_Y1]], 40, mats.painted);
  g.add(body);

  // dudukan bawah: cincin kayu bubut bertingkat
  g.add(lathe([
    [0, 0.045], [0.040, 0.045], [0.042, 0.05], [0.038, 0.055], [0.041, 0.062],
    [0.036, 0.068], [0.034, 0.072], [0.034, TUBE_Y0 + 0.004], [0, TUBE_Y0 + 0.004],
  ], 40, mats.turned));

  // dudukan atas + kenop bubut
  g.add(lathe([
    [0, TUBE_Y1 - 0.004], [0.034, TUBE_Y1 - 0.004], [0.036, TUBE_Y1 + 0.004], [0.04, TUBE_Y1 + 0.012],
    [0.04, TUBE_Y1 + 0.022], [0.034, TUBE_Y1 + 0.026], [0.022, TUBE_Y1 + 0.03], [0.02, TUBE_Y1 + 0.04],
    [0.024, TUBE_Y1 + 0.05], [0.022, TUBE_Y1 + 0.058], [0.015, TUBE_Y1 + 0.064], [0.017, TUBE_Y1 + 0.072],
    [0.013, TUBE_Y1 + 0.082], [0.006, TUBE_Y1 + 0.088], [0, TUBE_Y1 + 0.09],
  ], 32, mats.turned));

  // pasak penyetel: batang logam miring ke luar-atas, ujung pipih (dua baris berselang)
  const pegGeo = new THREE.CylinderGeometry(0.0012, 0.0016, 0.034, 6);
  pegGeo.translate(0, 0.017, 0);
  const headGeo = new THREE.BoxGeometry(0.004, 0.007, 0.0012);
  for (let i = 0; i < STRINGS; i++) {
    const a = (i / STRINGS) * Math.PI * 2;
    const row = i % 2;
    const base = new THREE.Vector3(Math.sin(a) * 0.037, TUBE_Y1 + 0.008 + row * 0.008, Math.cos(a) * 0.037);
    const dir = new THREE.Vector3(Math.sin(a) * 0.55, 1.0, Math.cos(a) * 0.55).normalize();
    const peg = new THREE.Mesh(pegGeo, mats.steel);
    peg.position.copy(base);
    peg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.add(peg);
    const head = new THREE.Mesh(headGeo, mats.steel);
    head.position.copy(base).addScaledVector(dir, 0.036);
    head.quaternion.copy(peg.quaternion);
    g.add(head);
  }

  // penyangga dawai (senda): balok kayu kecil di permukaan tabung, tinggi berbeda-beda
  // (tiap dawai ditopang dua senda: satu dekat atas, satu dekat bawah → nada berbeda)
  const sendaGeo = new THREE.BoxGeometry(0.006, 0.006, 0.006);
  const rng = mulberry32(2);
  for (let i = 0; i < STRINGS; i++) {
    const a = (i / STRINGS) * Math.PI * 2;
    for (const y of [TUBE_Y0 + 0.02 + rng() * 0.06, TUBE_Y1 - 0.02 - rng() * 0.06]) {
      const s = new THREE.Mesh(sendaGeo, mats.turned);
      s.position.set(Math.sin(a) * (TUBE_R + 0.003), y, Math.cos(a) * (TUBE_R + 0.003));
      s.rotation.y = a;
      g.add(s);
    }
  }

  // hiasan burung bersayap di tengah tabung (sisi depan)
  const wing = new THREE.Shape();
  wing.moveTo(0, 0);
  wing.lineTo(0.05, 0.012); wing.lineTo(0.044, 0.004); wing.lineTo(0.056, 0.0);
  wing.lineTo(0.046, -0.006); wing.lineTo(0.052, -0.014); wing.lineTo(0.03, -0.01); wing.lineTo(0, -0.008);
  const wingGeo = new THREE.ExtrudeGeometry(wing, { depth: 0.004, bevelEnabled: true, bevelSize: 0.001, bevelThickness: 0.001, bevelSegments: 1 });
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(wingGeo, mats.turned);
    w.position.set(side * 0.012, 0.37, TUBE_R + 0.006);
    w.scale.set(side * 0.7, 0.9, 1);
    w.rotation.z = side * 0.45; // sayap terangkat seperti ukiran burung pada foto
    g.add(w);
  }
  const birdBody = new THREE.Mesh(new THREE.SphereGeometry(0.012, 14, 10), mats.turned);
  birdBody.scale.set(1, 0.7, 0.6);
  birdBody.position.set(0, 0.372, TUBE_R + 0.008);
  g.add(birdBody);
  return g;
}

function createStrings(mats) {
  // dawai lurus di atas senda, dari dudukan bawah ke dudukan atas
  const geo = new THREE.CylinderGeometry(0.00045, 0.00045, TUBE_Y1 - TUBE_Y0 + 0.02, 4);
  const mesh = new THREE.InstancedMesh(geo, mats.steel, STRINGS);
  const m = new THREE.Matrix4();
  for (let i = 0; i < STRINGS; i++) {
    const a = (i / STRINGS) * Math.PI * 2, r = TUBE_R + 0.0065;
    m.makeTranslation(Math.sin(a) * r, (TUBE_Y0 + TUBE_Y1) / 2, Math.cos(a) * r);
    mesh.setMatrixAt(i, m);
  }
  mesh.name = 'dawai';
  return mesh;
}

// ---------------------------------------------------------------------------
// Resonator lontar
// ---------------------------------------------------------------------------

// Jari-jari wadah terhadap tinggi: dasar terpotong datar, melebar, lalu meruncing ke puncak
function shellRadius(y) {
  return sample([[0.05, 0.11], [0.1, 0.16], [0.18, 0.19], [0.27, 0.195], [0.38, 0.175],
    [0.5, 0.13], [0.6, 0.075], [0.67, 0.028], [0.7, 0.004]], y);
}

function createResonator(mats) {
  const g = new THREE.Group();
  g.name = 'resonator lontar';
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const y = 0.05 + (i / 60) * 0.65;
    pts.push(new THREE.Vector2(shellRadius(y), y));
  }
  // terbuka di depan: lathe hanya ± 250° di belakang (φ = 0 = +Z)
  const open = 1.35; // sudut bukaan depan (rad) — wadah hanya menaungi bagian belakang
  const geo = new THREE.LatheGeometry(pts, 96, open, Math.PI * 2 - 2 * open);
  // lipatan daun lontar: permukaan sedikit bergelombang mengikuti serat memanjang
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    const a = Math.atan2(x, z), r = Math.hypot(x, z);
    const fold = 1 + 0.0035 * Math.sin(a * 70) * Math.min(1, r / 0.08); // lipatan halus antarhelai
    pos.setX(i, x * fold); pos.setZ(i, z * fold);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, mats.lontar));

  // tepi depan kiri-kanan: bilah lontar tebal yang dilipat (garis tepi)
  for (const phi of [open, Math.PI * 2 - open]) {
    const curve = new THREE.CatmullRomCurve3(pts.filter((_, i) => i % 3 === 0).map(
      (p) => new THREE.Vector3(Math.sin(phi) * p.x, p.y, Math.cos(phi) * p.x)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.0028, 6), mats.lontarEdge));
  }

  // papan dasar lontar (setengah lingkaran sedikit lebih lebar dari mulut wadah bawah)
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.008, 48), mats.lontarEdge);
  plate.position.y = 0.046;
  g.add(plate);
  return g;
}

// Simpul pita lontar di puncak: beberapa lengkung pita pipih + dua ujung menjuntai
function createBow(mats) {
  const g = new THREE.Group();
  g.name = 'simpul lontar';
  const top = new THREE.Vector3(0, 0.69, -0.01);
  // tiap lengkung = pita melingkar; diputar di sumbu Y supaya muka pita terlihat dari depan
  const loops = [
    { ang: 1.2, tilt: 0.7, rx: 0.03, ry: 0.034 },
    { ang: -1.2, tilt: -0.7, rx: 0.03, ry: 0.034 },
    { ang: 1.4, tilt: 1.3, rx: 0.026, ry: 0.03 },
    { ang: -1.4, tilt: -1.3, rx: 0.026, ry: 0.03 },
    { ang: 1.57, tilt: 0.1, rx: 0.02, ry: 0.036 },
  ];
  for (const { ang, tilt, rx, ry } of loops) {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const t = (k / 24) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.sin(t) * rx, (1 - Math.cos(t)) * ry, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const loop = new THREE.Mesh(ribbonGeometry(curve, 0.016), mats.lontarEdge);
    loop.position.copy(top);
    loop.rotation.set(0, ang, tilt);
    g.add(loop);
  }
  for (const s of [-1, 1]) { // ujung pita menjuntai
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(s * 0.02, -0.01, 0.01),
      new THREE.Vector3(s * 0.04, -0.035, 0.015), new THREE.Vector3(s * 0.045, -0.06, 0.012),
    ]);
    const tail = new THREE.Mesh(ribbonGeometry(curve, 0.011), mats.lontarEdge);
    tail.position.copy(top).add(new THREE.Vector3(0, 0.004, 0.012));
    g.add(tail);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Alas
// ---------------------------------------------------------------------------

function createBase(mats) {
  const g = new THREE.Group();
  g.name = 'alas';
  // balok kayu bercat motif di bawah tabung
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.042, 0.07), [
    mats.woodBlock, mats.woodBlock, mats.woodDark, mats.woodDark, mats.baseFront, mats.baseFront,
  ]);
  block.position.y = 0.021;
  g.add(block);
  return g;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  const painted = createPaintedTexture();
  const lontar = createLontarTextures();
  cached = {
    painted: new THREE.MeshPhysicalMaterial({ map: painted, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    turned: new THREE.MeshPhysicalMaterial({ color: 0xa8683a, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.9, roughness: 0.25 }),
    lontar: new THREE.MeshStandardMaterial({ map: lontar.color, bumpMap: lontar.bump, bumpScale: 1.5, roughness: 0.75, side: THREE.DoubleSide }),
    lontarEdge: new THREE.MeshStandardMaterial({ color: 0xe0c696, roughness: 0.7, side: THREE.DoubleSide }),
    woodBlock: new THREE.MeshStandardMaterial({ color: 0x7a3e22, roughness: 0.6 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x4a2414, roughness: 0.6 }),
    baseFront: new THREE.MeshStandardMaterial({ map: createBaseTexture(), roughness: 0.55 }),
  };
  return cached;
}

// Cat tabung: u mengelilingi tabung, v sepanjang tabung (0 = bawah). Panel jingga dengan
// silang ganda hitam membentuk belah ketupat berisi merah, berselang dengan pita zig-zag.
function createPaintedTexture() {
  const W = 512, H = 1400;
  const c = canvas2d(W, H);
  const rows = [
    ['band', 0.07], ['panel', 0.2], ['wave', 0.06], ['panel', 0.2], ['band', 0.07], ['panel', 0.2], ['wave', 0.06], ['band', 0.14],
  ];
  let v = 0;
  for (const [kind, h] of rows) {
    const y1 = H * (1 - v), y0 = H * (1 - v - h), hh = y1 - y0; // kanvas: y ke bawah, v ke atas
    if (kind === 'panel') {
      c.fillStyle = '#c86a32'; c.fillRect(0, y0, W, hh);
      const n = 5, pw = W / n;
      for (let k = 0; k < n; k++) {
        const x0 = k * pw, cx = x0 + pw / 2, cy = y0 + hh / 2;
        // belah ketupat merah di tengah dan segitiga merah di sela silang
        c.fillStyle = '#9c2a1c';
        poly(c, [[cx, y0 + hh * 0.18], [x0 + pw * 0.82, cy], [cx, y1 - hh * 0.18], [x0 + pw * 0.18, cy]]);
        c.fillStyle = '#e8c27a';
        poly(c, [[cx, cy - hh * 0.12], [cx + pw * 0.12, cy], [cx, cy + hh * 0.12], [cx - pw * 0.12, cy]]);
        // silang ganda hitam (X) dari sudut ke sudut panel
        c.strokeStyle = '#1c120c'; c.lineWidth = 9;
        for (const off of [-8, 8]) {
          c.beginPath(); c.moveTo(x0 + off, y0); c.lineTo(x0 + pw + off, y1); c.stroke();
          c.beginPath(); c.moveTo(x0 + pw + off, y0); c.lineTo(x0 + off, y1); c.stroke();
        }
      }
      c.fillStyle = '#1c120c'; c.fillRect(0, y0, W, 5); c.fillRect(0, y1 - 5, W, 5);
    } else if (kind === 'band') {
      c.fillStyle = '#d9a35a'; c.fillRect(0, y0, W, hh);
      c.strokeStyle = '#5a2a14'; c.lineWidth = 4;
      c.beginPath();
      for (let x = 0, k = 0; x <= W; x += W / 32, k++) c.lineTo(x, y0 + hh * (k % 2 ? 0.3 : 0.7));
      c.stroke();
      c.fillStyle = '#5a2a14'; c.fillRect(0, y0 + 2, W, 3); c.fillRect(0, y1 - 5, W, 3);
    } else {
      c.fillStyle = '#b75a2a'; c.fillRect(0, y0, W, hh);
      c.strokeStyle = '#e8c27a'; c.lineWidth = 4;
      c.beginPath();
      for (let x = 0; x <= W; x += 4) c.lineTo(x, y0 + hh / 2 + Math.sin((x / W) * Math.PI * 2 * 12) * hh * 0.25);
      c.stroke();
    }
    v += h;
  }
  // pernis tua: sedikit belang & aus
  const rng = mulberry32(6);
  for (let i = 0; i < 1800; i++) {
    c.fillStyle = `rgba(${rng() < 0.5 ? '255,230,180' : '40,20,10'},0.06)`;
    c.fillRect(rng() * W, rng() * H, 1, 6 + rng() * 30);
  }
  const t = new THREE.CanvasTexture(c.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Daun lontar: krem pucat dengan serat & lipatan memanjang (u mengelilingi, v ke atas)
function createLontarTextures() {
  const W = 1024, H = 512;
  const color = canvas2d(W, H), bump = canvas2d(W, H);
  const rng = mulberry32(14);
  color.fillStyle = '#d9bb87'; color.fillRect(0, 0, W, H);
  bump.fillStyle = '#808080'; bump.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 1.5) {
    const k = rng();
    color.fillStyle = k < 0.33 ? 'rgba(170,140,90,0.18)' : k < 0.66 ? 'rgba(255,248,225,0.22)' : 'rgba(200,175,125,0.12)';
    color.fillRect(x, 0, 1, H);
    bump.fillStyle = k < 0.5 ? '#6c6c6c' : '#949494';
    bump.fillRect(x, 0, 1, H);
  }
  for (let k = 0; k < 70; k++) { // garis lipatan antarhelai daun
    const x = (k / 70) * W;
    color.fillStyle = 'rgba(150,120,75,0.35)'; color.fillRect(x, 0, 2, H);
    bump.fillStyle = '#3c3c3c'; bump.fillRect(x, 0, 2, H);
  }
  const tex = (ctx, srgb) => {
    const t = new THREE.CanvasTexture(ctx.canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { color: tex(color, true), bump: tex(bump, false) };
}

// Muka depan balok alas: motif belah ketupat merah-hitam di atas cokelat
function createBaseTexture() {
  const c = canvas2d(256, 108);
  c.fillStyle = '#8a4426'; c.fillRect(0, 0, 256, 108);
  c.fillStyle = '#1c120c'; c.fillRect(0, 0, 256, 8); c.fillRect(0, 100, 256, 8);
  for (let k = 0; k < 4; k++) {
    const cx = 32 + k * 64;
    c.fillStyle = '#b8321e'; poly(c, [[cx, 16], [cx + 28, 54], [cx, 92], [cx - 28, 54]]);
    c.fillStyle = '#1c120c'; poly(c, [[cx, 34], [cx + 14, 54], [cx, 74], [cx - 14, 54]]);
    c.fillStyle = '#e8c27a'; poly(c, [[cx, 46], [cx + 6, 54], [cx, 62], [cx - 6, 54]]);
  }
  const t = new THREE.CanvasTexture(c.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

// Lathe dari daftar [r, y] yang diurutkan dari bawah ke atas → muka menghadap keluar
function lathe(points, segments, material) {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), material);
}

// Pita pipih mengikuti kurva (lebar `width`, bidang pita tegak lurus normal kurva)
function ribbonGeometry(curve, width) {
  const N = 64, frames = curve.computeFrenetFrames(N, curve.closed);
  const positions = [], indices = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.getPointAt(i / N), b = frames.binormals[i % (N + (curve.closed ? 0 : 1))] ?? frames.binormals[N - 1];
    positions.push(p.x + b.x * width / 2, p.y + b.y * width / 2, p.z + b.z * width / 2);
    positions.push(p.x - b.x * width / 2, p.y - b.y * width / 2, p.z - b.z * width / 2);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
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
