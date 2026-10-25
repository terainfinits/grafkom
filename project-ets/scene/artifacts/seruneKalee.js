/*
File Purpose: Model 3D prosedural Serune Kalee (alat musik tiup Aceh), dimodelkan dari foto referensi.
Connected Files:
- ../exhibits.js: Diimpor oleh pembuat koleksi pameran untuk diletakkan di atas pedestal pameran.

Bagian-bagian (createSeruneKaleeModel: tegak di +Y, corong di bawah y = 0, ujung tiup di atas):
  - corong  : bagian bawah melebar seperti terompet, berongga, bibirnya berlapis cincin kuningan
  - badan   : batang kayu keras gelap (hati kayu) dibubut, rongga ± 2 cm, beruas-ruas dengan
              cincin kuningan di setiap sambungan
  - lubang  : 6 lubang nada di muka atas (+Z) + 1 lubang di belakang (−Z)
  - ujung   : pangkal tiup berlapis kuningan

createSeruneKalee() mengembalikan Group yang sudah ditata rebah di atas pedestal
(titik (0,0,0) = permukaan pedestal), dengan lubang nada menghadap ke atas.
*/

import * as THREE from 'three';

const L = 0.62;          // panjang total
const BELL_L = 0.2;      // panjang corong
const BORE = 0.01;       // jari-jari rongga (Ø 2 cm)

// Profil luar (jari-jari, tinggi) dari bibir corong ke ujung tiup
const OUTER = [
  // corong cembung (seperti bola lampu), bukan terompet cekung
  [0.06, 0], [0.0615, 0.008], [0.0612, 0.025], [0.059, 0.045], [0.055, 0.065], [0.049, 0.085],
  [0.041, 0.105], [0.032, 0.125], [0.0245, 0.145], [0.0195, 0.165], [0.0175, 0.2], [0.0165, 0.25], [0.0155, 0.35], [0.0145, 0.45],
  [0.0135, 0.55], [0.0125, 0.6], [0.0105, L],
];
const outerR = (y) => {
  for (let i = 1; i < OUTER.length; i++) if (y <= OUTER[i][1]) {
    const [r0, y0] = OUTER[i - 1], [r1, y1] = OUTER[i];
    return r0 + (r1 - r0) * ((y - y0) / (y1 - y0));
  }
  return OUTER[OUTER.length - 1][0];
};

export function createSeruneKalee() {
  const display = new THREE.Group();
  const model = createSeruneKaleeModel();
  // rebah: sumbu panjang (+Y) → +X (corong di kiri), lubang nada (+Z) menghadap ke atas
  const inner = new THREE.Group();
  model.rotation.z = -Math.PI / 2;
  inner.add(model);
  const lying = new THREE.Group();
  lying.rotation.x = -Math.PI / 2 + 0.15;
  lying.add(inner);
  lying.position.x = -L / 2;
  display.add(lying);
  lying.updateMatrixWorld(true);
  lying.position.y -= new THREE.Box3().setFromObject(lying).min.y;

  // penyangga kecil di bawah batang (corong bertumpu langsung); tinggi diukur dengan raycast
  display.updateMatrixWorld(true);
  const body = lying.getObjectByName('badan');
  const x = -L / 2 + L * 0.82;
  const hit = new THREE.Raycaster(new THREE.Vector3(x, -1, 0), new THREE.Vector3(0, 1, 0)).intersectObject(body, false)[0];
  if (hit) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.025, hit.point.y, 0.04), getMaterials().stand);
    stand.position.set(x, hit.point.y / 2, hit.point.z);
    display.add(stand);
  }
  return display;
}

export function createSeruneKaleeModel() {
  const mats = getMaterials();
  const g = new THREE.Group();
  g.name = 'serune kalee';

  // Badan berongga: profil luar naik, lalu profil dalam turun kembali (lathe tertutup)
  const pts = OUTER.map(([r, y]) => new THREE.Vector2(r, y));
  pts.push(new THREE.Vector2(BORE * 0.7, L));
  for (let i = OUTER.length - 1; i >= 0; i--) {
    const [r, y] = OUTER[i];
    pts.push(new THREE.Vector2(Math.max(BORE, r - (y < BELL_L ? 0.004 : 0.006)), Math.max(0.001, y)));
  }
  pts.push(new THREE.Vector2(OUTER[0][0] - 0.003, 0.001));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mats.wood);
  body.name = 'badan';
  g.add(body);

  // Cincin kuningan: bibir corong & sambungan ruas sepanjang batang
  const ring = (y, w, r = outerR(y) + 0.0008) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 40, 1, true), mats.brass);
    m.position.y = y;
    g.add(m);
  };
  ring(0.007, 0.014, 0.0622);
  for (const [y, w] of [[0.205, 0.005], [0.225, 0.004], [0.25, 0.004], [0.33, 0.006], [0.37, 0.004],
    [0.405, 0.004], [0.455, 0.005], [0.5, 0.004], [0.535, 0.004], [0.57, 0.005]]) ring(y, w);
  ring(L - 0.012, 0.024, 0.0115); // pangkal tiup kuningan
  // garis alur bubut (tipis, gelap) di dekat cincin
  for (const y of [0.212, 0.34, 0.415, 0.465, 0.545]) {
    const r = outerR(y) + 0.0003;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.0015, 40, 1, true), mats.groove);
    m.position.y = y;
    g.add(m);
  }

  // Lubang nada: cakram gelap sedikit cekung di permukaan (6 depan, 1 belakang)
  const hole = (y, front) => {
    const r = outerR(y);
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.0042, 20), mats.hole);
    d.position.set(0, y, (front ? 1 : -1) * (r + 0.0004));
    if (!front) d.rotation.y = Math.PI;
    g.add(d);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0045, 0.0007, 6, 20), mats.groove);
    lip.position.copy(d.position);
    if (!front) lip.rotation.y = Math.PI;
    g.add(lip);
  };
  for (const y of [0.3, 0.355, 0.43, 0.48, 0.52, 0.56]) hole(y, true);
  hole(0.39, false);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  cached = {
    wood: new THREE.MeshPhysicalMaterial({ map: woodTexture(), roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.35, side: THREE.DoubleSide }),
    brass: new THREE.MeshStandardMaterial({ color: 0xa8864a, metalness: 0.8, roughness: 0.42, side: THREE.DoubleSide }),
    groove: new THREE.MeshStandardMaterial({ color: 0x1c1c1a, roughness: 0.7, side: THREE.DoubleSide }),
    hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
    stand: new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.5 }),
  };
  return cached;
}

// Kayu keras gelap kehijauan-abu, serat halus memanjang & bercak aus
function woodTexture() {
  const W = 128, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  let seed = 3;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = '#3e403c'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(${rng() < 0.5 ? '20,20,18' : '110,110,100'},${0.08 + rng() * 0.18})`;
    ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 2, 30 + rng() * 260);
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(130,125,110,${0.05 + rng() * 0.1})`;
    ctx.beginPath(); ctx.ellipse(rng() * W, rng() * H, 4 + rng() * 12, 10 + rng() * 40, 0, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
