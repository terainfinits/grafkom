/*
File Purpose: Model 3D prosedural Tehyan (alat musik gesek Betawi/Tionghoa peranakan, bagian dari
              gambang kromong), dimodelkan dari foto referensi.
Connected Files:
- ../exhibits.js: Diimpor oleh pembuat koleksi pameran untuk diletakkan di atas pedestal pameran.

Bagian-bagian (createTehyanModel: tegak di +Y, muka resonator menghadap +Z):
  - leher      : batang kayu jati muda, bagian dekat resonator lebih tebal & dibubut,
                 berujung kaki runcing gelap di bawah & kepala kecil di atas
  - resonator  : batok kelapa lonjong; muka ditutup kulit berbintik dengan kuda-kuda (bridge)
  - lilitan    : tali/rotan krem di beberapa titik sepanjang leher
  - pasak      : dua pasak penyetel bubut yang menembus leher, bersilangan
  - senar      : dua senar dari pasak ke ujung bawah, melintasi kuda-kuda
  - busur      : kayu gelap melengkung berkenop, bulu ditegangkan (createBowModel)

createTehyan() mengembalikan Group yang sudah ditata rebah di atas pedestal
(titik (0,0,0) = permukaan pedestal), dengan busur di depannya.
*/

import * as THREE from 'three';

const NECK_TOP = 0.62;   // tinggi ujung atas leher
const FOOT = -0.15;      // ujung kaki di bawah resonator
const RES_R = 0.062;     // jari-jari resonator (arah X)
const FACE_Z = 0.026;    // muka resonator

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function createTehyan() {
  const display = new THREE.Group();

  // Tehyan rebah: leher → +X, muka resonator menghadap ke atas, sedikit miring ke pengunjung
  const lying = layFlat(createTehyanModel(), 0.25);
  lying.position.set(-0.24, 0, -0.06);
  display.add(lying);

  // Busur rebah di depan, melintang sedikit
  const bow = layFlat(createBowModel(), 0.1);
  bow.rotation.y = 0.12;
  bow.position.set(-0.2, 0, 0.1);
  display.add(bow);

  for (const obj of [lying, bow]) {
    obj.updateMatrixWorld(true);
    obj.position.y -= new THREE.Box3().setFromObject(obj).min.y;
  }

  // Penyangga kayu kecil di bawah leher dekat kepala (resonator bertumpu langsung)
  display.updateMatrixWorld(true);
  const neck = lying.getObjectByName('leher');
  const ray = new THREE.Raycaster();
  const x = -0.24 + 0.42;
  ray.set(new THREE.Vector3(x, -1, lying.position.z + 0.0), new THREE.Vector3(0, 1, 0));
  const hit = ray.intersectObject(neck, false)[0];
  if (hit) {
    const h = hit.point.y;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.05), getMaterials().stand);
    stand.position.set(x, h / 2, hit.point.z);
    display.add(stand);
  }
  return display;
}

export function createTehyanModel() {
  const mats = getMaterials();
  const g = new THREE.Group();
  g.name = 'tehyan';

  // ---------- Leher (satu profil lathe dari kaki ke kepala, bawah → atas) ----------
  const neckProfile = [
    [0.0, FOOT], [0.003, FOOT + 0.008], [0.005, FOOT + 0.03], [0.0058, -0.09],
    [0.0065, -0.075], [0.0068, -0.06],
    [0.0105, 0.04], [0.0118, 0.07], [0.0122, 0.12], [0.0115, 0.2], [0.0098, 0.27], // bagian bubut tebal
    [0.0082, 0.31], [0.0078, 0.45], [0.0074, 0.58], [0.0082, 0.595], [0.0092, 0.605],
    [0.0086, 0.615], [0.006, NECK_TOP], [0.0, NECK_TOP + 0.003],
  ];
  const neck = lathe(neckProfile, 24, mats.neck);
  neck.name = 'leher';
  g.add(neck);
  // kaki runcing berwarna gelap
  g.add(lathe([[0, FOOT - 0.002], [0.003, FOOT + 0.006], [0.0052, FOOT + 0.028], [0, FOOT + 0.03]], 16, mats.dark));

  // ---------- Resonator batok kelapa ----------
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), mats.coconut);
  shell.rotation.x = -Math.PI / 2;            // kubah menghadap −Z (belakang)
  shell.scale.set(RES_R, RES_R * 0.9, 0.05);  // lonjong, tebal 5 cm ke belakang
  shell.position.z = FACE_Z;
  g.add(shell);
  // muka kulit: piringan sedikit cembung
  const face = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mats.skin);
  face.scale.set(RES_R - 0.002, RES_R * 0.9 - 0.002, 1);
  face.position.z = FACE_Z + 0.0008;
  g.add(face);
  // bibir batok
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 48), mats.coconutDark);
  rim.scale.set(RES_R, RES_R * 0.9, RES_R);
  rim.position.z = FACE_Z;
  g.add(rim);
  // kuda-kuda (bridge): bilah kayu kecil miring di tengah muka
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.004), mats.peg);
  bridge.position.set(0, -0.004, FACE_Z + 0.002);
  bridge.rotation.z = -0.2;
  g.add(bridge);

  // ---------- Lilitan tali/rotan ----------
  // tumpukan cincin tebal berselang lilitan tali, seperti di foto (mengecil menjauhi resonator)
  const ringStack = (y0, n, r0, r1, dir) => {
    for (let k = 0; k < n; k++) {
      const r = THREE.MathUtils.lerp(r0, r1, k / (n - 1));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0032, 8, 28), k % 2 ? mats.wrap : mats.bone);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y0 + dir * k * 0.0066;
      g.add(ring);
    }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, n * 0.0066, 20, 1, true), mats.wrap);
    core.position.y = y0 + dir * (n - 1) * 0.0033;
    g.add(core);
  };
  ringStack(0.058, 8, 0.0165, 0.0115, 1);    // di atas resonator
  ringStack(-0.06, 6, 0.0105, 0.0072, -1);   // di bawah resonator
  ringStack(0.47, 6, 0.0105, 0.009, 1);      // di bawah pasak
  for (const [y, len, r] of [[0.6, 0.014, 0.0102]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20, 1, true), mats.wrap);
    w.position.y = y + len / 2;
    g.add(w);
  }

  // ---------- Pasak penyetel (dua, bersilangan) ----------
  const pegProfile = [
    [0, 0], [0.0055, 0.002], [0.0068, 0.008], [0.005, 0.016], [0.0032, 0.022], [0.0034, 0.05],
    [0.0028, 0.085], [0.0022, 0.11], [0, 0.112],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const pegGeo = new THREE.LatheGeometry(pegProfile.map((v) => new THREE.Vector2(v.x * 1.2, v.y)), 16);
  const knobGeo = new THREE.SphereGeometry(0.0075, 14, 10);
  for (const [y, dir] of [[0.53, 1], [0.575, -1]]) {
    const peg = new THREE.Group();
    peg.add(new THREE.Mesh(pegGeo, mats.peg));
    const knob = new THREE.Mesh(knobGeo, mats.peg);
    knob.scale.set(1, 0.8, 1);
    peg.add(knob);
    // kepala pasak di satu sisi leher, batang menembus leher & mencuat sedikit di sisi lain;
    // kedua pasak berlawanan arah
    peg.position.set(-dir * 0.075, y, 0);
    peg.rotation.z = -dir * Math.PI / 2;
    g.add(peg);
  }

  // ---------- Senar ----------
  const top = new THREE.Vector3(0, 0.55, 0.009), bottom = new THREE.Vector3(0, -0.075, 0.008);
  for (const dx of [-0.0025, 0.0025]) {
    const curve = new THREE.CatmullRomCurve3([
      top.clone().setX(dx), new THREE.Vector3(dx * 1.5, 0.06, FACE_Z * 0.5), // melintasi kuda-kuda
      new THREE.Vector3(dx * 2, 0.0, FACE_Z + 0.009), new THREE.Vector3(dx, -0.05, FACE_Z * 0.6), bottom.clone().setX(dx),
    ], false, 'catmullrom', 0.05);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.0005, 4), mats.string));
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createBowModel() {
  const mats = getMaterials();
  const g = new THREE.Group();
  g.name = 'busur gesek';
  const L = 0.56;
  // batang melengkung (busur) dari pangkal (y = 0) ke ujung (y = L)
  const curve = new THREE.CatmullRomCurve3([
    [0, 0], [0.018, 0.12], [0.03, 0.28], [0.03, 0.42], [0.02, 0.52], [0.008, L],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  g.add(new THREE.Mesh(sweepGeometry(curve, (t) => 0.0042 - 0.0016 * t, { tubular: 60, radial: 10 }), mats.bowWood));
  // kenop di pangkal & ujung melengkung kecil di atas
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), mats.bowWood);
  knob.position.set(-0.004, -0.006, 0);
  g.add(knob);
  const hook = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.02, 8), mats.bowWood);
  hook.position.set(0.004, L + 0.006, 0);
  hook.rotation.z = 0.9;
  g.add(hook);
  // bulu busur: pita tipis lurus dari pangkal ke ujung
  const a = new THREE.Vector3(-0.002, 0.01, 0), b = new THREE.Vector3(0.0, L - 0.004, 0);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.0012, a.distanceTo(b), 0.004), mats.hair);
  hair.position.copy(a).add(b).multiplyScalar(0.5);
  hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.add(hair);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  cached = {
    neck: new THREE.MeshPhysicalMaterial({ map: grainTexture([196, 146, 74], [140, 96, 42], 7), roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 }),
    peg: new THREE.MeshPhysicalMaterial({ map: grainTexture([128, 82, 46], [84, 52, 28], 9), roughness: 0.45, clearcoat: 0.3 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xe4d6b4, roughness: 0.55 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.5 }),
    coconut: new THREE.MeshStandardMaterial({ map: mottleTexture([110, 72, 44], [64, 40, 24], 3, 0.6), roughness: 0.85, side: THREE.DoubleSide }),
    coconutDark: new THREE.MeshStandardMaterial({ color: 0x3e2a1c, roughness: 0.8 }),
    skin: new THREE.MeshStandardMaterial({ map: mottleTexture([112, 106, 88], [62, 58, 46], 11, 0.9), roughness: 0.75 }),
    wrap: new THREE.MeshStandardMaterial({ map: wrapTexture(), roughness: 0.8, side: THREE.DoubleSide }),
    string: new THREE.MeshStandardMaterial({ color: 0xcfcfc8, metalness: 0.6, roughness: 0.35 }),
    bowWood: new THREE.MeshPhysicalMaterial({ color: 0x241712, roughness: 0.35, clearcoat: 0.6 }),
    hair: new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.7 }),
    stand: new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.5 }),
  };
  return cached;
}

// Serat kayu memanjang (v sepanjang leher)
function grainTexture(base, dark, seed) {
  const W = 64, H = 512, c = canvas2d(W, H), rng = mulberry32(seed);
  c.fillStyle = `rgb(${base})`; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(${dark},${0.15 + rng() * 0.3})`;
    c.fillRect(rng() * W, rng() * H, 1 + rng() * 2, 40 + rng() * 300);
  }
  const t = toTexture(c.canvas, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}

// Bercak berserat (batok kelapa / kulit)
function mottleTexture(base, dark, seed, density) {
  const S = 256, c = canvas2d(S, S), rng = mulberry32(seed);
  c.fillStyle = `rgb(${base})`; c.fillRect(0, 0, S, S);
  for (let i = 0; i < 900 * density; i++) {
    const r = 1 + rng() * 6;
    c.fillStyle = `rgba(${rng() < 0.7 ? dark : base.map((v) => Math.min(255, v + 40))},${0.15 + rng() * 0.35})`;
    c.beginPath(); c.ellipse(rng() * S, rng() * S, r, r * (0.4 + rng()), rng() * 3, 0, Math.PI * 2); c.fill();
  }
  for (let i = 0; i < 200; i++) { // serat halus
    c.strokeStyle = `rgba(${dark},0.2)`; c.lineWidth = 1;
    const x = rng() * S, y = rng() * S;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rng() - 0.5) * 30, y + (rng() - 0.5) * 30); c.stroke();
  }
  const t = toTexture(c.canvas, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Lilitan tali krem: garis miring rapat (pada silinder terlihat seperti lilitan spiral)
function wrapTexture() {
  const c = canvas2d(64, 64);
  c.fillStyle = '#e2d2aa'; c.fillRect(0, 0, 64, 64);
  c.strokeStyle = '#a8916a'; c.lineWidth = 2;
  for (let k = -64; k < 128; k += 6) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 10, 64); c.stroke(); }
  const t = toTexture(c.canvas, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  return t;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

// Rebahkan benda tegak (+Y): sumbu panjang → +X, muka (+Z) menghadap ke atas, miring `tilt`
function layFlat(object, tilt) {
  const inner = new THREE.Group();
  object.rotation.z = -Math.PI / 2;
  inner.add(object);
  const outer = new THREE.Group();
  outer.rotation.x = -Math.PI / 2 + tilt;
  outer.add(inner);
  return outer;
}

// Lathe dari daftar [r, y] yang urut dari bawah ke atas → muka menghadap keluar
function lathe(points, segments, material) {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), material);
}

function sweepGeometry(curve, radiusAt, { tubular = 48, radial = 12 } = {}) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions = [], indices = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular, P = curve.getPointAt(t), N = frames.normals[i], B = frames.binormals[i], r = radiusAt(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, cs = Math.cos(a) * r, sn = Math.sin(a) * r;
      positions.push(P.x + N.x * cs + B.x * sn, P.y + N.y * cs + B.y * sn, P.z + N.z * cs + B.z * sn);
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
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function canvas2d(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c.getContext('2d');
}

function toTexture(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
