import * as THREE from 'three';
import { extrude, lieFlat, addSupports, materials } from './common.js';

/*
 * Mandau (Dayak, Kalimantan) + kumpang (sarung), dimodelkan dari foto referensi.
 *
 *   Mandau tegak di +Y (hulu di bawah y = 0, bilah di atas). Sisi punggung di x ≈ 0,
 *   sisi tajam (mata) di x besar — sama dengan konvensi common.js.
 *
 *     bilah  : punggung lurus, mata lurus; dekat ujung punggungnya melengkung turun ke mata
 *              → ujung lancip. Penampang: badan tebal + bevel mata yang terang (dua warna).
 *              Tatahan kuningan: sulur panjang (naga) + bintang-bintang kecil.
 *     hulu   : tanduk krem, pegangan lurus lalu kepala besar yang melengkung kembali ke
 *              arah mata (seperti kait), bertonjolan ukiran. Pangkalnya dililit serat.
 *     kumpang: papan kayu hitam yang melebar ke ujung, ujungnya bercabang (ekor ikan),
 *              dilukis motif Dayak warna emas, diikat rotan hitam, manik merah & jumbai rambut.
 *
 * createMandau() mengembalikan Group yang sudah ditata rebah di atas pedestal
 * (titik (0,0,0) = permukaan pedestal), seperti sebelumnya.
 */

const L = 0.5;           // panjang bilah
const TIP_X = 0.037;     // posisi ujung (melintang), sedikit di dalam garis mata

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function createMandau() {
  const m = materials();
  const display = new THREE.Group();

  const lyingMandau = lieFlat(createMandauModel(), 0.3);
  lyingMandau.position.set(-0.24, 0, -0.07);
  display.add(lyingMandau);

  const lyingSheath = lieFlat(createKumpangModel(), 0.16);
  lyingSheath.position.set(-0.3, 0, 0.12);
  display.add(lyingSheath);

  // Turunkan sampai titik terendah tiap benda tepat di permukaan pedestal
  for (const obj of [lyingMandau, lyingSheath]) {
    obj.updateMatrixWorld(true);
    obj.position.y -= new THREE.Box3().setFromObject(obj).min.y;
  }
  lyingMandau.position.y += 0.012; // mandau sedikit diangkat, disangga dua balok

  // Tinggi penyangga diukur dengan raycast dari bawah ke permukaan bawah bilah,
  // jadi penyangga selalu pas menyentuh bilah walau posisi/kemiringan diubah.
  display.updateMatrixWorld(true);
  const blade = lyingMandau.getObjectByName('bilah');
  const ray = new THREE.Raycaster();
  for (const x of [-0.12, 0.12]) {
    ray.set(new THREE.Vector3(x, -1, lyingMandau.position.z + 0.012), new THREE.Vector3(0, 1, 0));
    const hit = ray.intersectObject(blade, false)[0];
    if (hit) addSupports(display, m.woodStand, [x], hit.point.z, hit.point.y);
  }
  return display;
}

export function createMandauModel() {
  const mats = getMaterials();
  const mandau = new THREE.Group();
  mandau.name = 'mandau';
  mandau.add(named(new THREE.Mesh(createBladeGeometry(), mats.blade), 'bilah'));
  mandau.add(createHulu(mats));
  return mandau;
}

export function createKumpangModel() {
  const mats = getMaterials();
  const kumpang = new THREE.Group();
  kumpang.name = 'kumpang';

  const board = new THREE.Mesh(extrude(sheathShape(), SHEATH_T, { bevel: 0.004, segments: 3, curveSegments: 16 }), mats.sheath);
  kumpang.add(named(board, 'papan kumpang'));

  // Ikatan rotan, manik merah, & jumbai rambut
  const beadGeo = new THREE.SphereGeometry(0.0042, 14, 10);
  BANDS.forEach((y, i) => {
    const l = sheathLeft(y), r = sheathRight(y);
    const band = new THREE.Mesh(new THREE.BoxGeometry(r - l + 0.008, 0.011, SHEATH_T + 0.011), mats.rattan);
    band.position.set((l + r) / 2, y, 0);
    kumpang.add(band);

    // dua manik merah di sisi mata, di muka depan
    for (const [dx, dy] of [[-0.012, 0.001], [-0.003, -0.002]]) {
      const bead = new THREE.Mesh(beadGeo, mats.bead);
      bead.position.set(r + dx, y + dy, SHEATH_T / 2 + 0.008);
      kumpang.add(bead);
    }
    // jumbai di beberapa ikatan, bergantian sisi
    if (i % 2 === 0) kumpang.add(createTuft(mats, i % 4 === 0 ? l + 0.006 : r - 0.006, y));
  });
  return kumpang;
}

// ---------------------------------------------------------------------------
// Bilah
// ---------------------------------------------------------------------------

const BEVEL_U = 0.62; // batas badan & bevel mata (0 = punggung, 1 = mata)

function bladeWidth(t) {
  return sample([[0, 0.028], [0.15, 0.033], [0.5, 0.040], [0.8, 0.043], [1, 0.043]], t);
}
function edgeX(t) {
  // mata lurus, sedikit masuk menuju ujung
  return t < 0.9 ? bladeWidth(t) : THREE.MathUtils.lerp(bladeWidth(0.9), TIP_X, ((t - 0.9) / 0.1) ** 1.5);
}
function spineX(t) {
  // punggung lurus, mulai t = 0,8 melengkung turun ke ujung
  const curve = t < 0.8 ? 0 : TIP_X * ((t - 0.8) / 0.2) ** 1.7;
  return curve + spineNotch(t);
}
// Gerigi kecil di punggung (t 0,56–0,68), seperti ukiran pada foto
function spineNotch(t) {
  if (t < 0.56 || t > 0.68) return 0;
  const k = (t - 0.56) / 0.03, f = k - Math.floor(k); // 4 gigi
  return 0.0035 * (f < 0.7 ? f / 0.7 : (1 - f) / 0.3);
}
function bladeThick(t) {
  return sample([[0, 0.0058], [0.8, 0.0042], [0.96, 0.002], [1, 0.0006]], t);
}

function createBladeGeometry() {
  const NS = 320;                 // segmen sepanjang bilah (banyak, supaya gerigi tajam)
  const NB = 6, NE = 4;           // segmen melintang: badan & bevel
  const positions = [], uvs = [], indices = [];

  // Satu lembar grid (sepanjang t, melintang u ∈ [u0, u1]) di satu sisi (side = ±1).
  // Badan & bevel dibuat sebagai lembar terpisah (titik tidak dipakai bersama), sehingga
  // garis bevel tetap tegas & tampak dua warna seperti mandau asli.
  const sheet = (u0, u1, nu, side) => {
    const base = positions.length / 3;
    for (let i = 0; i <= NS; i++) {
      const t = i / NS, s = spineX(t), e = edgeX(t), T = bladeThick(t);
      for (let j = 0; j <= nu; j++) {
        const u = THREE.MathUtils.lerp(u0, u1, j / nu);
        const z = u <= BEVEL_U ? T * (1 - 0.15 * u) : T * (1 - 0.15 * BEVEL_U) * (1 - (u - BEVEL_U) / (1 - BEVEL_U));
        positions.push(THREE.MathUtils.lerp(s, e, u), t * L, (side * z) / 2);
        uvs.push(u, t);
      }
    }
    for (let i = 0; i < NS; i++) {
      for (let j = 0; j < nu; j++) {
        const a = base + i * (nu + 1) + j, b = a + 1, c = a + nu + 1, d = c + 1;
        if (side > 0) indices.push(a, b, d, a, d, c);
        else indices.push(a, d, b, a, c, d);
      }
    }
  };
  for (const side of [1, -1]) {
    sheet(0, BEVEL_U, NB, side);
    sheet(BEVEL_U, 1, NE, side);
  }
  // Dinding punggung (tebal, menghadap −x)
  const base = positions.length / 3;
  for (let i = 0; i <= NS; i++) {
    const t = i / NS, s = spineX(t), T = bladeThick(t);
    positions.push(s, t * L, T / 2, s, t * L, -T / 2);
    uvs.push(0, t, 0, t);
  }
  for (let i = 0; i < NS; i++) {
    const a = base + i * 2;
    indices.push(a, a + 3, a + 1, a, a + 2, a + 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Hulu
// ---------------------------------------------------------------------------

function createHulu(mats) {
  const group = new THREE.Group();
  group.name = 'hulu';
  const cx = 0.014; // sumbu pegangan (tengah pangkal bilah)

  // Lilitan serat di pangkal: beberapa cincin bertumpuk
  for (let k = 0; k < 11; k++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0146, 0.0016, 6, 28), k % 3 ? mats.wrap : mats.wrapDark);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.y = (k % 2 ? 1 : -1) * 0.06; // lilitan sedikit miring
    ring.scale.y = 0.82; // setelah rotasi x, sumbu Y lokal torus = arah Z dunia
    ring.position.set(cx, -0.002 - k * 0.0024, 0);
    group.add(ring);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.0138, 0.0138, 0.026, 20), mats.wrap);
  core.scale.z = 0.82;
  core.position.set(cx, -0.0135, 0);
  group.add(core);

  // Pegangan + kepala: satu tabung mengikuti kurva — turun lurus, lalu melengkung ke sisi mata
  // dan kembali naik ke arah bilah seperti kait (diukur dari foto)
  const curve = new THREE.CatmullRomCurve3([
    [cx, -0.018], [cx, -0.048], [0.017, -0.072], [0.031, -0.086], [0.053, -0.091],
    [0.076, -0.088], [0.094, -0.081], [0.104, -0.073],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  const radius = (t) => sample([[0, 0.0118], [0.25, 0.0128], [0.45, 0.0182], [0.7, 0.0176], [0.9, 0.0128], [1, 0.0085]], t);
  group.add(new THREE.Mesh(sweepGeometry(curve, radius, { tubular: 72, radial: 22, squash: 0.85 }), mats.antler));

  // ujung paruh membulat
  const tipCap = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 14, 10), mats.antler);
  tipCap.position.copy(curve.getPointAt(1));
  tipCap.scale.z = 0.85;
  group.add(tipCap);

  // Tonjolan ukiran di sisi luar lengkung kepala
  const knobGeo = new THREE.SphereGeometry(1, 12, 8);
  // ukiran bertonjolan tidak teratur di seluruh kepala (atas, samping depan & belakang)
  const rng = mulberry32(17);
  for (let k = 0; k < 18; k++) {
    const t = 0.38 + rng() * 0.6;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const out = new THREE.Vector3(tan.y, -tan.x, 0);          // sisi luar lengkung
    const side = new THREE.Vector3(0, 0, 1);
    const a = (rng() - 0.5) * Math.PI * 1.6;                     // sebar di sekeliling tabung
    const dir = out.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a) * 0.85);
    const r = radius(t);
    const knob = new THREE.Mesh(knobGeo, mats.antler);
    knob.position.copy(p).addScaledVector(dir, r * 0.8);
    knob.scale.set(r * (0.2 + rng() * 0.12), r * (0.14 + rng() * 0.1), r * (0.2 + rng() * 0.12));
    group.add(knob);
  }
  // mata kecil di kepala (sisi depan & belakang)
  for (const z of [1, -1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 8), mats.wrapDark);
    const p = curve.getPointAt(0.86);
    eye.position.set(p.x, p.y - 0.002, z * radius(0.86) * 0.8);
    group.add(eye);
  }
  return group;
}

function createTuft(mats, x, y) {
  // Jumbai rambut: helai tipis yang menjuntai di atas muka sarung ke arah ujung (+Y),
  // sedikit menyebar seperti seikat rambut
  const tuft = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.0004, 0.0011, 1, 4);
  geo.translate(0, 0.5, 0); // titik putar di pangkal helai
  const rng = mulberry32(Math.round(y * 1000));
  for (let k = 0; k < 16; k++) {
    const h = new THREE.Mesh(geo, k % 3 ? mats.hair : mats.hairDark);
    h.scale.set(1, 0.03 + rng() * 0.03, 1);
    h.rotation.z = (rng() - 0.5) * 0.7;
    h.rotation.x = 0.25 + rng() * 0.3;       // sedikit terangkat dari muka sarung
    h.position.set((rng() - 0.5) * 0.006, 0, 0);
    tuft.add(h);
  }
  tuft.position.set(x, y + 0.006, SHEATH_T / 2 + 0.006);
  return tuft;
}

// ---------------------------------------------------------------------------
// Kumpang (sarung)
// ---------------------------------------------------------------------------

const SHEATH_T = 0.024;   // tebal papan
const SHEATH_L = 0.55;    // panjang sampai pangkal cabang ujung
const BANDS = [0.035, 0.095, 0.155, 0.215, 0.275, 0.415]; // posisi ikatan rotan (dari mulut)
const sheathLeft = (y) => THREE.MathUtils.lerp(-0.012, -0.023, y / SHEATH_L);
const sheathRight = (y) => THREE.MathUtils.lerp(0.046, 0.092, y / SHEATH_L);
// Batas bentuk (untuk memetakan tekstur ke papan)
const SB = { x0: -0.035, x1: 0.105, y0: -0.018, y1: 0.6 };

function sheathShape() {
  const s = new THREE.Shape();
  s.moveTo(sheathLeft(0), 0);
  s.quadraticCurveTo(0.017, -0.026, sheathRight(0), 0); // mulut membulat
  s.lineTo(sheathRight(SHEATH_L), SHEATH_L);
  // ujung ekor ikan: dua cabang runcing dengan takik V di tengah
  s.lineTo(0.088, 0.556);
  s.lineTo(0.058, 0.548);
  s.lineTo(0.044, 0.566);  // taji kecil
  s.lineTo(0.03, 0.552);
  s.lineTo(0.012, 0.556);
  s.lineTo(-0.03, 0.588);  // cabang panjang di sisi punggung
  s.lineTo(sheathLeft(SHEATH_L), SHEATH_L - 0.01);
  s.lineTo(sheathLeft(0), 0);
  return s;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  const blade = createBladeTextures();
  const antler = createAntlerTexture();
  const sheath = createSheathTextures();
  cached = {
    blade: new THREE.MeshStandardMaterial({
      map: blade.color, metalnessMap: blade.metal, roughnessMap: blade.rough, metalness: 1, roughness: 1,
    }),
    antler: new THREE.MeshStandardMaterial({ map: antler, bumpMap: antler, bumpScale: 3, roughness: 0.55 }),
    wrap: new THREE.MeshStandardMaterial({ color: 0x84603a, roughness: 0.9 }),
    wrapDark: new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.6 }),
    sheath: new THREE.MeshStandardMaterial({
      map: sheath.color, metalnessMap: sheath.metal, roughnessMap: sheath.rough, metalness: 1, roughness: 1,
    }),
    rattan: new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.42 }),
    bead: new THREE.MeshPhysicalMaterial({ color: 0xb3161a, roughness: 0.25, clearcoat: 0.8 }),
    hair: new THREE.MeshStandardMaterial({ color: 0xa08460, roughness: 0.95 }),
    hairDark: new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.95 }),
  };
  return cached;
}

// Bilah: badan baja gelap bergurat memanjang, bevel mata terang, tatahan kuningan
function createBladeTextures() {
  const W = 256, H = 2048;
  const rng = mulberry32(5);
  const [color, metal, rough] = [0, 1, 2].map(() => canvas2d(W, H));
  const all = (fn) => [color, metal, rough].forEach(fn);
  const bevelX = BEVEL_U * W;

  // dasar: badan & bevel
  color.fillStyle = '#3e4145'; color.fillRect(0, 0, bevelX, H);
  color.fillStyle = '#8f9398'; color.fillRect(bevelX, 0, W - bevelX, H);
  metal.fillStyle = '#d0d0d0'; metal.fillRect(0, 0, W, H);
  rough.fillStyle = '#8c8c8c'; rough.fillRect(0, 0, bevelX, H);
  rough.fillStyle = '#4a4a4a'; rough.fillRect(bevelX, 0, W - bevelX, H);
  // gurat asahan memanjang
  for (let i = 0; i < 900; i++) {
    const x = rng() * W, y = rng() * H, len = 40 + rng() * 200;
    color.strokeStyle = rng() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    color.lineWidth = 1;
    color.beginPath(); color.moveTo(x, y); color.lineTo(x + (rng() - 0.5) * 2, y + len); color.stroke();
  }
  // garis gelap di punggung
  color.fillStyle = '#2c2e31'; color.fillRect(0, 0, 6, H);

  // tatahan kuningan: sulur panjang (naga) dari dekat hulu ke tengah bilah
  const vy = (v) => (1 - v) * H; // v = posisi sepanjang bilah → baris kanvas (flipY)
  const ux = (u) => u * W;
  const ribbon = [];
  for (let v = 0.07; v <= 0.54; v += 0.002) ribbon.push([ux(0.33 + 0.05 * Math.sin(v * 46) * (0.5 + v)), vy(v)]);
  const strokeRibbon = (ctx, style, width) => {
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ribbon.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  };
  strokeRibbon(color, '#4a3610', 62);
  strokeRibbon(color, '#b88f3c', 52);
  strokeRibbon(metal, '#ffffff', 62);
  strokeRibbon(rough, '#5a5a5a', 62);
  // sisik/gerigi di tepi pita & granulasi di dalamnya
  ribbon.forEach(([x, y], i) => {
    if (i % 5) return;
    for (const d of [-1, 1]) {
      color.fillStyle = '#d9b860';
      color.beginPath(); color.moveTo(x + d * 24, y - 5); color.lineTo(x + d * 34, y); color.lineTo(x + d * 24, y + 5); color.fill();
      metal.fillStyle = '#ffffff';
      metal.beginPath(); metal.moveTo(x + d * 24, y - 5); metal.lineTo(x + d * 34, y); metal.lineTo(x + d * 24, y + 5); metal.fill();
    }
  });
  for (let i = 0; i < 5000; i++) {
    const [x, y] = ribbon[Math.floor(rng() * ribbon.length)];
    color.fillStyle = rng() < 0.5 ? '#6a4c16' : '#ecd28c';
    color.fillRect(x + (rng() - 0.5) * 46, y + (rng() - 0.5) * 8, 2.5, 2.5);
  }
  // kepala sulur: ikal di dekat hulu
  all((ctx) => { ctx.lineCap = 'round'; });
  const curl = (ctx, style, w) => {
    ctx.strokeStyle = style; ctx.lineWidth = w;
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const a = k * 0.16, r = 26 - k * 0.35;
      const x = ux(0.32) + Math.cos(a) * r, y = vy(0.06) + Math.sin(a) * r * 1.4;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  };
  curl(color, '#c9a04a', 9); curl(metal, '#ffffff', 11); curl(rough, '#555555', 11);
  // garpu kecil & bintang-bintang kuningan
  const fork = (ctx, style) => {
    ctx.strokeStyle = style; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ux(0.35), vy(0.6)); ctx.lineTo(ux(0.35), vy(0.545));
    for (const du of [-0.08, 0, 0.08]) { ctx.moveTo(ux(0.35), vy(0.565)); ctx.lineTo(ux(0.35 + du), vy(0.545)); }
    ctx.stroke();
  };
  fork(color, '#c9a04a'); fork(metal, '#ffffff'); fork(rough, '#555555');
  for (const [u, v] of [[0.22, 0.63], [0.4, 0.66], [0.27, 0.7], [0.45, 0.74], [0.2, 0.78]]) {
    star(color, ux(u), vy(v), 11, '#d4ad58');
    star(metal, ux(u), vy(v), 11, '#ffffff');
    star(rough, ux(u), vy(v), 11, '#555555');
  }
  return {
    color: toTexture(color.canvas, true), metal: toTexture(metal.canvas, false), rough: toTexture(rough.canvas, false),
  };
}

// Tanduk: krem kekuningan dengan bercak & pori kecokelatan (dipakai juga sebagai bump)
function createAntlerTexture() {
  const S = 256;
  const noise = createNoise(21);
  const data = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const n = noise.fbm(u * 4, v * 4, 4, 4, 4);
      const pits = noise.fbm(u * 24, v * 24, 2, 24, 24);
      const k = Math.min(1, Math.max(0, (n - 0.3) * 1.8) * 0.75 + (pits > 0.64 ? 0.55 : 0));
      const i = (y * S + x) * 4;
      data[i] = 222 - 96 * k; data[i + 1] = 192 - 100 * k; data[i + 2] = 124 - 80 * k; data[i + 3] = 255;
    }
  }
  const c = document.createElement('canvas');
  c.width = c.height = S;
  c.getContext('2d').putImageData(new ImageData(data, S, S), 0, 0);
  const tex = toTexture(c, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  return tex;
}

// Kumpang: kayu hitam berlukis motif Dayak emas. Kanvas dipetakan ke kotak batas bentuk (SB),
// karena UV muka ExtrudeGeometry = koordinat bentuk dalam meter.
function createSheathTextures() {
  const W = 460, H = Math.round(W * (SB.y1 - SB.y0) / (SB.x1 - SB.x0));
  const [color, metal, rough] = [0, 1, 2].map(() => canvas2d(W, H));
  const px = (x) => ((x - SB.x0) / (SB.x1 - SB.x0)) * W;
  const py = (y) => (1 - (y - SB.y0) / (SB.y1 - SB.y0)) * H;
  const rng = mulberry32(9);

  // kayu hitam dengan serat samar
  color.fillStyle = '#151311'; color.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) {
    const x = rng() * W;
    color.strokeStyle = `rgba(${55 + rng() * 30}, ${55 + rng() * 25}, ${60 + rng() * 20}, 0.08)`;
    color.lineWidth = 1 + rng() * 2;
    color.beginPath(); color.moveTo(x, 0); color.bezierCurveTo(x + 8, H / 3, x - 8, (2 * H) / 3, x + 4, H); color.stroke();
  }
  metal.fillStyle = '#000000'; metal.fillRect(0, 0, W, H);
  rough.fillStyle = '#a8a8a8'; rough.fillRect(0, 0, W, H);

  // Cat emas: digambar sama persis di 3 kanvas (warna, metalness, roughness)
  const paints = [[color, '#d6a748'], [metal, '#b0b0b0'], [rough, '#6a6a6a']];
  const paint = (fn) => paints.forEach(([ctx, style]) => {
    ctx.save(); ctx.fillStyle = style; ctx.strokeStyle = style; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(ctx); ctx.restore();
  });

  // Panel di antara ikatan rotan
  const panels = [[0.0, BANDS[0]], ...BANDS.slice(0, -1).map((y, i) => [y, BANDS[i + 1]]), [BANDS.at(-1), SHEATH_L - 0.02]];
  panels.forEach(([ya, yb], i) => {
    const y = (ya + yb) / 2;
    const cx = px((sheathLeft(y) + sheathRight(y)) / 2);
    const cy = py(y);
    const wPx = px(sheathRight(y)) - px(sheathLeft(y));
    const hPx = py(ya) - py(yb);
    const s = Math.min(wPx * 0.95, hPx * 1.05) / 100; // motif digambar dalam kotak 100 × 100
    paint((ctx) => {
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      if (i === 5) motifStar(ctx);                 // panel besar: bintang bersayap ikal
      else if (i === 6) motifAso(ctx);             // panel bawah: aso (naga-anjing) ikal ganda
      else {
        [motifDiamondHooks, motifScrolls, motifCross, motifInfinity, motifScrolls, motifDiamondHooks][i](ctx);
        // ikal pengapit di kiri & kanan, seperti deretan motif kecil pada foto
        ctx.lineWidth = 3.5;
        for (const d of [-1, 1]) { hook(ctx, d * 44, -6, 7, d, Math.PI / 2); ctx.beginPath(); ctx.arc(d * 44, 14, 3, 0, Math.PI * 2); ctx.fill(); }
      }
    });
  });

  // aus: titik-titik hitam kecil di atas cat
  for (let i = 0; i < 2500; i++) {
    color.fillStyle = 'rgba(20,18,16,0.7)';
    color.fillRect(rng() * W, rng() * H, 1.5, 1.5);
  }
  return {
    color: mapToShape(toTexture(color.canvas, true)),
    metal: mapToShape(toTexture(metal.canvas, false)),
    rough: mapToShape(toTexture(rough.canvas, false)),
  };
}

function mapToShape(tex) {
  // UV (meter) → [0,1] kotak batas: uv' = (uv − x0) / lebar
  tex.repeat.set(1 / (SB.x1 - SB.x0), 1 / (SB.y1 - SB.y0));
  tex.offset.set(-SB.x0 / (SB.x1 - SB.x0), -SB.y0 / (SB.y1 - SB.y0));
  return tex;
}

// ----- Motif Dayak (semua dalam kotak −50..50, sumbu Y kanvas ke bawah) -----

function hook(ctx, x, y, r, dir, rot = 0) {
  // ikal (spiral) khas ukiran Dayak
  ctx.beginPath();
  for (let k = 0; k <= 40; k++) {
    const a = rot + dir * k * 0.18, rr = r * (1 - k / 48);
    const X = x + Math.cos(a) * rr, Y = y + Math.sin(a) * rr;
    k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.stroke();
}

function motifDiamondHooks(ctx) {
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(14, 0); ctx.lineTo(0, 24); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(d * 14, 0); ctx.quadraticCurveTo(d * 30, -4, d * 34, 10); ctx.stroke();
    hook(ctx, d * 30, 14, 9, d, d > 0 ? -Math.PI / 2 : -Math.PI / 2);
  }
  ctx.beginPath(); ctx.arc(0, -36, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 36, 5, 0, Math.PI * 2); ctx.fill();
}

function motifScrolls(ctx) {
  ctx.lineWidth = 4.5;
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, d * 30); ctx.bezierCurveTo(d * 30, d * 24, d * 30, -d * 6, d * 10, -d * 4); ctx.stroke();
    hook(ctx, d * 14, -d * 10, 10, -d, d * Math.PI / 2);
  }
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
}

function motifCross(ctx) {
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, 32); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke();
  for (const [x, y] of [[-18, -20], [18, -20], [-18, 20], [18, 20]]) {
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const d of [-1, 1]) hook(ctx, d * 34, 0, 9, d, Math.PI);
}

function motifInfinity(ctx) {
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  for (let k = 0; k <= 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    const X = 34 * Math.sin(a), Y = 18 * Math.sin(a) * Math.cos(a) * 2;
    k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.stroke();
  hook(ctx, 0, -30, 9, 1, Math.PI / 2);
  hook(ctx, 0, 30, 9, -1, -Math.PI / 2);
}

function motifStar(ctx) {
  // bintang empat ujung memanjang dengan sayap ikal (panel besar di tengah sarung)
  ctx.beginPath();
  ctx.moveTo(0, -48); ctx.lineTo(9, -9); ctx.lineTo(40, 0); ctx.lineTo(9, 9);
  ctx.lineTo(0, 48); ctx.lineTo(-9, 9); ctx.lineTo(-40, 0); ctx.lineTo(-9, -9); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke(); // lingkar di tengah bintang
  ctx.lineWidth = 4;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath(); ctx.moveTo(dx * 12, dy * 12); ctx.quadraticCurveTo(dx * 34, dy * 16, dx * 34, dy * 34); ctx.stroke();
    hook(ctx, dx * 30, dy * 30, 8, dx * dy, dy > 0 ? 0 : Math.PI);
    // sulur tambahan menyebar ke samping
    ctx.beginPath(); ctx.moveTo(dx * 40, 0); ctx.quadraticCurveTo(dx * 46, dy * 10, dx * 42, dy * 20); ctx.stroke();
    hook(ctx, dx * 44, dy * 22, 5, -dx * dy, 0);
  }
}

function motifAso(ctx) {
  // aso: dua ikal besar bercermin (mata) dengan belah ketupat di tengah & sulur ke bawah
  ctx.lineWidth = 4.5;
  for (const d of [-1, 1]) {
    hook(ctx, d * 20, -14, 22, -d, d > 0 ? Math.PI : 0);
    ctx.beginPath(); ctx.moveTo(d * 6, 8); ctx.bezierCurveTo(d * 30, 14, d * 40, 30, d * 26, 46); ctx.stroke();
    hook(ctx, d * 28, 40, 8, d, 0);
  }
  ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 2); ctx.lineTo(0, 16); ctx.lineTo(-8, 2); ctx.closePath(); ctx.fill();
}

function star(ctx, x, y, r, style) {
  ctx.fillStyle = style;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.3 : r;
    k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
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