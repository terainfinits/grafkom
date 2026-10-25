/*
File Purpose: Model 3D prosedural Tifa (gendang kayu Maluku/Papua, tradisi Maluku: tubular tanpa
              gagang), dimodelkan dari foto referensi.
Connected Files:
- ../exhibits.js: Diimpor oleh pembuat koleksi pameran untuk diletakkan di atas pedestal pameran.

Tegak di +Y, alas di y = 0. Bagian-bagian:
  - badan      : batang kayu yang dilubangi (lathe), ramping di bawah, melebar ke kepala,
                 berdiri di atas kaki bundar
  - membran    : kulit rusa kering, ditegangkan oleh cincin rotan di bibir kepala
  - pasak      : deretan pasak kayu di bawah kepala; tali rotan dari cincin ke pasak membentuk
                 pola zig-zag (W). Pasak dipukul turun untuk mengencangkan membran (nada)
  - cincin rotan terpilin melingkari badan di bawah pasak
  - ukiran     : pita & deretan tonjolan berukir pada badan bagian bawah
  - gantungan  : cincin logam kecil di dekat kepala
*/

import * as THREE from 'three';

const H = 0.62;        // tinggi total (sampai membran)
const HEAD_R = 0.086;  // jari-jari kepala
const PEGS = 12;

// Profil badan: [jari-jari, tinggi], urut dari bawah ke atas (→ muka menghadap keluar)
const BODY = [
  [0.0, 0.0], [0.078, 0.0], [0.086, 0.008], [0.088, 0.02], [0.084, 0.032], [0.07, 0.038], // kaki bundar
  [0.056, 0.046], [0.052, 0.06], [0.053, 0.1], [0.057, 0.16], [0.062, 0.22], [0.067, 0.28],
  [0.072, 0.34], [0.076, 0.4], [0.079, 0.45], [0.081, 0.5], [0.083, 0.56], [HEAD_R, H - 0.012],
  [HEAD_R, H - 0.004],
];
const radiusAt = (y) => {
  for (let i = 1; i < BODY.length; i++) {
    if (y <= BODY[i][1]) {
      const [r0, y0] = BODY[i - 1], [r1, y1] = BODY[i];
      return r0 + (r1 - r0) * ((y - y0) / (y1 - y0 || 1));
    }
  }
  return HEAD_R;
};

/**
 * @param {{ lacing?: 'tegak' | 'w' }} [opts]
 *   'tegak' (bawaan, seperti foto): bilah rotan tegak dari cincin kepala melewati tiap pasak
 *   'w'     : tali zig-zag membentuk pola W (tradisi Pantai Selatan Papua)
 */
export function createTifa({ lacing = 'tegak' } = {}) {
  const mats = getMaterials();
  const g = new THREE.Group();
  g.name = 'tifa';

  g.add(new THREE.Mesh(new THREE.LatheGeometry(BODY.map(([r, y]) => new THREE.Vector2(r, y)), 48), mats.wood));

  // ---------- Membran kulit rusa + cincin rotan ----------
  const skin = new THREE.Mesh(new THREE.CircleGeometry(HEAD_R + 0.003, 48), mats.skin);
  skin.rotation.x = -Math.PI / 2;
  skin.position.y = H;
  g.add(skin);
  // tepi kulit yang terlipat ke bawah melewati bibir
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(HEAD_R + 0.003, HEAD_R + 0.002, 0.014, 48, 1, true), mats.skinEdge)
    .translateY(H - 0.007));
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(HEAD_R + 0.006, 0.0055, 10, 64), mats.rattan);
  hoop.rotation.x = Math.PI / 2;
  hoop.position.y = H - 0.012;
  g.add(hoop);

  // ---------- Pasak penyetel & tali zig-zag ----------
  const pegTop = 0.51, pegBottom = 0.42; // pasak terjepit cincin rotan (seperti foto)
  const pegGeo = new THREE.BoxGeometry(0.024, pegTop - pegBottom, 0.012);
  // pasak meruncing ke bawah (baji)
  const pos = pegGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) { pos.setX(i, pos.getX(i) * 0.6); pos.setZ(i, pos.getZ(i) * 0.7); }
  pegGeo.computeVertexNormals();
  const lacePts = [];
  for (let k = 0; k < PEGS; k++) {
    const a = (k / PEGS) * Math.PI * 2;
    const y = (pegTop + pegBottom) / 2, r = radiusAt(y) + 0.004;
    const peg = new THREE.Mesh(pegGeo, mats.pegWood);
    peg.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    peg.rotation.y = a;
    peg.rotation.x = 0.08; // ujung atas sedikit condong ke luar mengikuti badan
    g.add(peg);
    // titik tali: cincin (di antara dua pasak) → puncak pasak → cincin ...
    const ah = a - Math.PI / PEGS;
    lacePts.push(new THREE.Vector3(Math.sin(ah) * (HEAD_R + 0.006), H - 0.014, Math.cos(ah) * (HEAD_R + 0.006)));
    const rp = radiusAt(pegTop) + 0.011;
    lacePts.push(new THREE.Vector3(Math.sin(a) * rp, pegTop - 0.006, Math.cos(a) * rp));
  }
  if (lacing === 'w') {
    const lace = new THREE.CatmullRomCurve3(lacePts, true, 'catmullrom', 0.02);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(lace, PEGS * 24, 0.0022, 6, true), mats.lace));
  } else {
    // bilah rotan pipih tegak dari cincin kepala, menempel badan, menutupi muka tiap pasak
    for (let k = 0; k < PEGS; k++) {
      const a = (k / PEGS) * Math.PI * 2;
      const pts = [];
      for (let y = H - 0.012; y >= pegBottom + 0.01; y -= 0.01) {
        const onPeg = y <= pegTop && y >= pegBottom;
        const r = radiusAt(y) + (onPeg ? 0.011 : 0.0015);
        pts.push(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r));
      }
      const strip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0028, 4), mats.lace);
      strip.scale.set(1, 1, 1);
      g.add(strip);
    }
  }

  // ---------- Cincin rotan terpilin ----------
  const twist = new THREE.Mesh(new THREE.TorusGeometry(radiusAt(0.45) + 0.012, 0.009, 12, 72), mats.twist);
  twist.rotation.x = Math.PI / 2;
  twist.position.y = 0.45;
  g.add(twist);

  // ---------- Ukiran badan bawah ----------
  // pita timbul (cincin tipis)
  for (const y of [0.405, 0.365, 0.29, 0.255, 0.12, 0.085]) {
    const r = radiusAt(y);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.001, 0.0035, 6, 56), mats.wood);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  // deretan tonjolan ukir berbentuk tameng/segi (di antara pita)
  const knob = (y0, y1, n, offset) => {
    const h = y1 - y0, geo = new THREE.BoxGeometry(0.018, h * 0.8, 0.01);
    const p = geo.attributes.position; // runcing ke bawah seperti ujung tombak
    for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) p.setX(i, p.getX(i) * 0.35);
    geo.computeVertexNormals();
    for (let k = 0; k < n; k++) {
      const a = ((k + offset) / n) * Math.PI * 2, y = (y0 + y1) / 2, r = radiusAt(y) + 0.002;
      const m = new THREE.Mesh(geo, mats.wood);
      m.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      m.rotation.y = a;
      g.add(m);
    }
  };
  knob(0.37, 0.4, 14, 0);
  knob(0.26, 0.285, 14, 0.5);
  knob(0.09, 0.115, 12, 0);
  // alur tegak di antara tonjolan bawah (ukiran garis)
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, y = 0.19, r = radiusAt(y) + 0.0005;
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.11, 0.002), mats.groove);
    groove.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    groove.rotation.y = a;
    groove.rotation.x = -Math.atan2(radiusAt(0.245) - radiusAt(0.135), 0.11); // ikut kemiringan badan
    g.add(groove);
  }

  // ---------- Gantungan logam ----------
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0018, 8, 24), mats.metal);
  loop.position.set(-radiusAt(0.58) - 0.012, 0.58, 0.02);
  loop.rotation.y = Math.PI / 2 + 0.3;
  g.add(loop);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // proporsi seperti foto: badan sedikit lebih gemuk
  const wrap = new THREE.Group();
  g.scale.set(1.12, 1, 1.12);
  wrap.add(g);
  wrap.name = 'tifa';
  return wrap;
}

// ---------------------------------------------------------------------------
// Material & tekstur
// ---------------------------------------------------------------------------

let cached = null;

function getMaterials() {
  if (cached) return cached;
  cached = {
    wood: new THREE.MeshStandardMaterial({ map: woodTexture([156, 86, 40], [96, 50, 20], 3), roughness: 0.65 }),
    pegWood: new THREE.MeshStandardMaterial({ map: woodTexture([140, 76, 34], [88, 44, 18], 5), roughness: 0.65 }),
    groove: new THREE.MeshStandardMaterial({ color: 0x6a3416, roughness: 0.8 }),
    skin: new THREE.MeshStandardMaterial({ map: skinTexture(), roughness: 0.8 }),
    skinEdge: new THREE.MeshStandardMaterial({ color: 0xc8b48c, roughness: 0.85, side: THREE.DoubleSide }),
    rattan: new THREE.MeshStandardMaterial({ color: 0xb88c52, roughness: 0.6 }),
    lace: new THREE.MeshStandardMaterial({ color: 0xc8aa78, roughness: 0.7 }),
    twist: new THREE.MeshStandardMaterial({ map: twistTexture(), roughness: 0.75 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x6c6c66, metalness: 0.8, roughness: 0.4 }),
  };
  return cached;
}

// Kayu: serat tegak (v sepanjang badan pada UV lathe) + belang lebih gelap
function woodTexture(base, dark, seed) {
  const W = 256, Hh = 512, c = canvas2d(W, Hh), rng = mulberry32(seed);
  c.fillStyle = `rgb(${base})`; c.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = `rgba(${dark},${0.12 + rng() * 0.3})`;
    const x = rng() * W;
    c.fillRect(x, rng() * Hh, 1 + rng() * 3, 40 + rng() * 300);
  }
  for (let i = 0; i < 25; i++) { // noda & retak kecil
    c.fillStyle = `rgba(${dark},0.25)`;
    c.beginPath(); c.ellipse(rng() * W, rng() * Hh, 2 + rng() * 8, 6 + rng() * 20, 0, 0, Math.PI * 2); c.fill();
  }
  const t = toTexture(c.canvas, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Kulit rusa kering: krem kekuningan, bercak & lebih gelap di tepi (UV lingkaran 0..1)
function skinTexture() {
  const S = 256, c = canvas2d(S, S), rng = mulberry32(8);
  const grad = c.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2);
  grad.addColorStop(0, '#e6d6b0'); grad.addColorStop(0.8, '#d6c094'); grad.addColorStop(1, '#a8885a');
  c.fillStyle = grad; c.fillRect(0, 0, S, S);
  for (let i = 0; i < 500; i++) {
    c.fillStyle = `rgba(${rng() < 0.6 ? '140,110,70' : '250,240,215'},${0.06 + rng() * 0.12})`;
    c.beginPath(); c.ellipse(rng() * S, rng() * S, 2 + rng() * 10, 1 + rng() * 6, rng() * 3, 0, Math.PI * 2); c.fill();
  }
  return toTexture(c.canvas, true);
}

// Rotan terpilin: garis miring terang-gelap
function twistTexture() {
  const c = canvas2d(256, 32);
  c.fillStyle = '#d8c69c'; c.fillRect(0, 0, 256, 32);
  c.strokeStyle = '#9c8458'; c.lineWidth = 3;
  for (let k = -32; k < 288; k += 9) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 14, 32); c.stroke(); }
  const t = toTexture(c.canvas, true);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}

function canvas2d(W, Hh) {
  const c = document.createElement('canvas');
  c.width = W; c.height = Hh;
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
