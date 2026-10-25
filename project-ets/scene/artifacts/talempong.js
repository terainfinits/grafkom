/*
File Purpose: Model 3D prosedural set Talempong (Minangkabau, Sumatera Barat) di atas rancak
              (rak kayu), dimodelkan dari foto referensi.
Connected Files:
- ../exhibits.js: Diimpor oleh pembuat koleksi pameran. Set ini punya meja (rancak) sendiri
                  setinggi ± 0,5 m, jadi diletakkan langsung di lantai (bukan di atas pedestal).

Bagian-bagian (alas di y = 0, panjang rak sepanjang X, muka depan menghadap +Z):
  - talempong : 12 buah perunggu (2 baris × 6), Ø 16,5 cm, bawah berlubang, tonjolan pencu
                Ø 5 cm di atas sebagai tempat dipukul (createTalempongPiece)
  - rancak    : dua bagian rak berengsel, tiap petak bertali merah bersilang sebagai tumpuan
                (supaya talempong bergetar bebas), pinggiran berukir tembus (krawangan) &
                kaki berukir berbentuk vas
  - pemukul   : dua pemukul bercat merah berumbai benang merah-kuning-hijau, dua bilah
                kayu polos
*/

import * as THREE from 'three';

const CELL = 0.19;         // ukuran petak (talempong Ø 16,5 cm hampir memenuhi petak)
const COLS = 6, ROWS = 2;  // 2 bagian × 3 kolom
const RAIL = 0.022;        // tebal bilah rak
const LEG_H = 0.3;         // tinggi kaki
const BOX_H = 0.11;        // tinggi rangka petak
const TOP_Y = LEG_H + BOX_H;
const LEN = COLS * CELL + RAIL, DEP = ROWS * CELL + RAIL;

export function createTalempong() {
  const mats = getMaterials();
  const g = new THREE.Group();
  g.name = 'talempong';
  g.add(createRack(mats));

  // talempong bertumpu pada tali, sedikit di bawah bibir rangka
  const pieceGeo = createPieceGeometry();
  const rng = mulberry32(4);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const p = new THREE.Mesh(pieceGeo, mats.bronze);
    p.position.set(-LEN / 2 + RAIL / 2 + (c + 0.5) * CELL, TOP_Y - 0.028, -DEP / 2 + RAIL / 2 + (r + 0.5) * CELL);
    p.rotation.set((rng() - 0.5) * 0.06, rng() * Math.PI, (rng() - 0.5) * 0.06); // sedikit miring, tidak seragam
    p.name = `talempong ${r * COLS + c + 1}`;
    g.add(p);
  }

  // pemukul: dua merah berumbai & dua bilah kayu polos, diletakkan melintang di atas talempong
  const add = (obj, x, z, rotY, tilt = 0) => {
    obj.position.set(x, TOP_Y + 0.055, z);
    obj.rotation.set(0, rotY, 0);
    obj.rotateZ(tilt);
    g.add(obj);
  };
  add(createMallet(mats, true), -0.2, 0.02, 1.3, 0.05);
  add(createMallet(mats, true), 0.5, 0.0, -1.5, 0.0);
  add(createMallet(mats, false), -0.42, 0.06, 1.15, 0.1);
  add(createMallet(mats, false), 0.1, -0.01, 1.52, 0.03);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Satu talempong (bisa dipakai terpisah, mis. untuk pajangan inspect di atas pedestal)
export function createTalempongPiece() {
  const m = new THREE.Mesh(createPieceGeometry(), getMaterials().bronze);
  m.name = 'talempong';
  return m;
}

// ---------------------------------------------------------------------------
// Talempong
// ---------------------------------------------------------------------------

function createPieceGeometry() {
  // Profil dari bibir bawah (dalam) → dinding → bahu → muka atas → pencu.
  // Bawah dibiarkan terbuka (berlubang) seperti aslinya; material dua sisi supaya
  // bagian dalam juga terlihat.
  const pts = [
    [0.074, 0.004], [0.0805, 0.0], [0.0825, 0.004], [0.083, 0.03], [0.0825, 0.044], // dinding
    [0.08, 0.052], [0.072, 0.0565], [0.055, 0.0595], [0.033, 0.061],               // bahu & muka
    [0.028, 0.0625], [0.0262, 0.067], [0.025, 0.074], [0.021, 0.081],              // pencu Ø 5 cm
    [0.014, 0.0855], [0.006, 0.0872], [0.0, 0.0875],
  ];
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64);
}

// ---------------------------------------------------------------------------
// Rancak
// ---------------------------------------------------------------------------

function createRack(mats) {
  const g = new THREE.Group();
  g.name = 'rancak';
  const box = (w, h, d, x, y, z, mat = mats.wood) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const x0 = -LEN / 2, z0 = -DEP / 2;
  const yMid = LEG_H + BOX_H / 2;

  // rangka petak: bilah memanjang (X) & melintang (Z), atas & bawah
  for (let r = 0; r <= ROWS; r++) {
    const z = z0 + RAIL / 2 + r * CELL;
    box(LEN, 0.022, RAIL, 0, TOP_Y - 0.011, z);
    box(LEN, 0.022, RAIL, 0, LEG_H + 0.011, z);
  }
  for (let c = 0; c <= COLS; c++) {
    const x = x0 + RAIL / 2 + c * CELL;
    const outer = c === 0 || c === COLS || c === COLS / 2;
    box(outer ? RAIL * 1.3 : RAIL, outer ? BOX_H : 0.022, DEP, x, outer ? yMid : TOP_Y - 0.011, 0);
    if (!outer) box(RAIL, 0.022, DEP, x, LEG_H + 0.011, 0);
  }
  // tiang di setiap persilangan (menghubungkan bilah atas & bawah)
  for (let c = 0; c <= COLS; c++) for (let r = 0; r <= ROWS; r++) {
    box(0.02, BOX_H, 0.02, x0 + RAIL / 2 + c * CELL, yMid, z0 + RAIL / 2 + r * CELL);
  }
  // alas bilah tipis di dasar petak (seperti papan putih di foto)
  for (let c = 0; c < COLS; c++) {
    box(CELL - RAIL, 0.006, DEP - RAIL, x0 + RAIL / 2 + (c + 0.5) * CELL, LEG_H + 0.025, 0, mats.board);
  }

  // tali merah bersilang di tiap petak (tumpuan talempong)
  const cordGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 1, 5);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const cx = x0 + RAIL / 2 + (c + 0.5) * CELL, cz = z0 + RAIL / 2 + (r + 0.5) * CELL;
    const s = (CELL - RAIL) / 2;
    for (const d of [-1, 1]) {
      const a = new THREE.Vector3(cx - s, TOP_Y - 0.03, cz - d * s), b = new THREE.Vector3(cx + s, TOP_Y - 0.03, cz + d * s);
      const cord = new THREE.Mesh(cordGeo, mats.cord);
      cord.scale.y = a.distanceTo(b);
      cord.position.copy(a).add(b).multiplyScalar(0.5);
      cord.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(cord);
    }
  }

  // engsel logam di sambungan dua bagian (muka depan)
  for (const y of [TOP_Y - 0.03, LEG_H + 0.03]) {
    box(0.03, 0.025, 0.004, 0, y, DEP / 2 + 0.003, mats.metal);
  }

  // pinggiran berukir tembus di muka depan & belakang, di bawah rangka
  const apronH = 0.07;
  for (const z of [DEP / 2 + 0.004, -DEP / 2 - 0.004]) {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(LEN, apronH, 0.016), mats.fretwork);
    apron.position.set(0, LEG_H - apronH / 2 + 0.01, z);
    g.add(apron);
  }
  // kaki berukir berbentuk vas, 2 pasang per bagian rak
  for (const x of [-LEN * 0.27, LEN * 0.27]) { // satu pasang kaki per bagian rak
    for (const z of [DEP / 2 - 0.02, -DEP / 2 + 0.02]) {
      const hidden = mats.hidden;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, LEG_H - 0.02, 0.024), [hidden, hidden, hidden, hidden, mats.leg, mats.leg]);
      leg.position.set(x, (LEG_H - 0.02) / 2, z);
      g.add(leg);
    }
    box(0.03, 0.03, DEP - 0.04, x, 0.04, 0); // palang bawah penghubung kaki depan-belakang
  }
  return g;
}

// ---------------------------------------------------------------------------
// Pemukul
// ---------------------------------------------------------------------------

function createMallet(mats, tasseled) {
  const g = new THREE.Group();
  const L = tasseled ? 0.3 : 0.34;
  // batang: sumbu X, pangkal di −X
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(tasseled ? 0.0085 : 0.006, tasseled ? 0.0095 : 0.006, L, 12), tasseled ? mats.red : mats.stick);
  stick.rotation.z = Math.PI / 2;
  g.add(stick);
  if (!tasseled) return g;
  // ujung pemukul membulat
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 12, 8), mats.red);
  tip.position.x = L / 2;
  g.add(tip);
  // lilitan benang warna-warni di pangkal
  const bands = [mats.yarnY, mats.yarnG, mats.yarnR, mats.yarnY];
  bands.forEach((m, k) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.008, 12), m);
    b.rotation.z = Math.PI / 2;
    b.position.x = -L / 2 + 0.012 + k * 0.008;
    g.add(b);
  });
  // rumbai: helai benang menjuntai & menyebar dari pangkal
  const strand = new THREE.CylinderGeometry(0.0014, 0.0014, 1, 4);
  strand.translate(0, -0.5, 0);
  const rng = mulberry32(Math.round(L * 1000));
  const yarns = [mats.yarnR, mats.yarnG, mats.yarnY];
  for (let k = 0; k < 160; k++) {
    const s = new THREE.Mesh(strand, yarns[k % 3]);
    s.position.set(-L / 2 - 0.002, 0, 0);
    s.scale.y = 0.08 + rng() * 0.05;
    // menjuntai ke arah −X (keluar dari pangkal), menyebar di Y & Z
    s.rotation.set((rng() - 0.5) * 0.9, 0, Math.PI / 2 + 0.15 + (rng() - 0.5) * 0.8);
    g.add(s);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  const wood = woodTexture();
  cached = {
    bronze: new THREE.MeshStandardMaterial({ map: bronzeTexture(), metalness: 0.85, roughness: 0.38, side: THREE.DoubleSide }),
    wood: new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
    board: new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.8 }),
    cord: new THREE.MeshStandardMaterial({ color: 0xb3221c, roughness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8a8a84, metalness: 0.8, roughness: 0.4 }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
    fretwork: carvedMaterial(fretworkCanvas(1024, 60), wood),
    leg: carvedMaterial(legCanvas(128, 240), wood),
    red: new THREE.MeshPhysicalMaterial({ color: 0xb41e1c, roughness: 0.35, clearcoat: 0.6 }),
    stick: new THREE.MeshStandardMaterial({ color: 0xd8bc86, roughness: 0.55 }),
    yarnR: new THREE.MeshStandardMaterial({ color: 0xc8241e, roughness: 0.9 }),
    yarnG: new THREE.MeshStandardMaterial({ color: 0x2c8a3a, roughness: 0.9 }),
    yarnY: new THREE.MeshStandardMaterial({ color: 0xe0b626, roughness: 0.9 }),
  };
  return cached;
}

// Ukiran tembus: kanvas putih = kayu, transparan = lubang → alphaTest membuang lubang
function carvedMaterial(alphaCanvas, wood) {
  const alpha = new THREE.CanvasTexture(alphaCanvas);
  return new THREE.MeshPhysicalMaterial({
    map: wood, alphaMap: alpha, alphaTest: 0.5, transparent: false, color: 0x8a5a3c,
    roughness: 0.5, clearcoat: 0.4, side: THREE.DoubleSide,
  });
}

// Pita krawangan: sulur bersambung yang dipotong tembus (hitam = lubang)
function fretworkCanvas(W, H) {
  const c = canvas2d(W, H);
  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
  const n = 26, pw = W / n;
  c.fillStyle = '#000';
  for (let k = 0; k < n; k++) {
    const cx = k * pw + pw / 2, cy = H / 2, s = k % 2 ? 1 : -1;
    for (const d of [-1, 1]) { // dua lubang ikal besar berlawanan
      c.beginPath();
      c.ellipse(cx + d * pw * 0.24, cy + d * s * H * 0.1, pw * 0.2, H * 0.3, 0.5 * d * s, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.fillStyle = '#fff';
  for (let k = 0; k < n; k++) { // "inti" ikal & tangkai yang tersisa
    const cx = k * pw + pw / 2, cy = H / 2, s = k % 2 ? 1 : -1;
    for (const d of [-1, 1]) {
      c.beginPath(); c.ellipse(cx + d * pw * 0.27, cy + d * s * H * 0.12, pw * 0.08, H * 0.11, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillRect(cx - 1.5, 0, 3, H); // tangkai tegak
  }
  c.fillRect(0, 0, W, 6); c.fillRect(0, H - 6, W, 6);
  return c.canvas;
}

// Kaki berbentuk vas (siluet) dengan ukiran sulur tembus di dalamnya
function legCanvas(W, H) {
  const c = canvas2d(W, H);
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const half = (t) => { // setengah lebar siluet terhadap t (0 = atas, 1 = bawah)
    const pts = [[0, 0.5], [0.08, 0.42], [0.2, 0.3], [0.38, 0.2], [0.55, 0.22], [0.72, 0.34], [0.88, 0.46], [1, 0.5]];
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) {
      const [t0, w0] = pts[i - 1], [t1, w1] = pts[i];
      return w0 + (w1 - w0) * ((t - t0) / (t1 - t0));
    }
    return 0.5;
  };
  c.fillStyle = '#fff';
  c.beginPath();
  for (let y = 0; y <= H; y += 2) c.lineTo(W / 2 + half(y / H) * W, y);
  for (let y = H; y >= 0; y -= 2) c.lineTo(W / 2 - half(y / H) * W, y);
  c.fill();
  c.fillStyle = '#000';
  for (const [t, r] of [[0.13, 0.32], [0.45, 0.22], [0.8, 0.3]]) {
    for (const d of [-1, 1]) {
      c.beginPath(); c.ellipse(W / 2 + d * half(t) * W * 0.42, t * H, r * W * 0.42, r * H * 0.22, d * 0.6, 0, Math.PI * 2); c.fill();
    }
  }
  c.fillStyle = '#fff'; // tangkai tengah & inti ikal
  c.fillRect(W / 2 - 4, 0, 8, H);
  for (const [t] of [[0.13], [0.45], [0.8]]) for (const d of [-1, 1]) {
    c.beginPath(); c.ellipse(W / 2 + d * half(t) * W * 0.42, t * H, W * 0.05, H * 0.025, 0, 0, Math.PI * 2); c.fill();
  }
  return c.canvas;
}

function woodTexture() {
  const W = 256, H = 64, c = canvas2d(W, H), rng = mulberry32(3);
  c.fillStyle = '#8c3e1c'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) {
    c.fillStyle = `rgba(${rng() < 0.5 ? '120,52,24' : '200,120,70'},${0.15 + rng() * 0.3})`;
    c.fillRect(rng() * W, rng() * H, 30 + rng() * 120, 1 + rng() * 2);
  }
  const t = new THREE.CanvasTexture(c.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Perunggu kusam: kuning keemasan dengan noda gelap & cincin bubut halus (UV lathe: v = profil)
function bronzeTexture() {
  const W = 256, H = 256, c = canvas2d(W, H), rng = mulberry32(12);
  c.fillStyle = '#b39a5a'; c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) { c.fillStyle = `rgba(${rng() < 0.5 ? '90,70,30' : '230,210,150'},0.08)`; c.fillRect(0, y, W, 1); }
  for (let i = 0; i < 160; i++) {
    c.fillStyle = `rgba(70,55,25,${0.05 + rng() * 0.15})`;
    c.beginPath(); c.ellipse(rng() * W, rng() * H, 4 + rng() * 18, 2 + rng() * 8, 0, 0, Math.PI * 2); c.fill();
  }
  const t = new THREE.CanvasTexture(c.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
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
