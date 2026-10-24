import * as THREE from 'three';
import { createSongketTextures } from '../textiles/songketPattern.js';

/*
 * Songket dibentangkan di atas meja pajang rendah: badan kain rebah di permukaan meja,
 * lalu ujungnya menjuntai melewati tepi depan meja sehingga pucuk rebung terlihat.
 *
 *   Tampak samping (depan = +Z, ke kanan):
 *
 *        gulungan  ════════════════╮   ← kain rebah di atas meja
 *        (lipatan) ┌───────────────┤╲
 *                  │     meja      │ │ ← ujung kain menjuntai (pucuk rebung di bawah)
 *                  │               │ │
 *
 * Kain = satu lembar geometri buatan sendiri, diparameterkan dengan s = jarak sepanjang
 * kain. Hanya ± 1,5 m dari 2 m kain yang terlihat; sisanya dianggap terlipat di bawah
 * gulungan di belakang. UV-nya tetap sesuai kain utuh, jadi ujung yang menjuntai
 * menampilkan pita & pucuk rebung yang benar.
 */
const CLOTH_W = 1.0;     // lebar kain (melintang meja, sumbu X)
const CLOTH_L = 2.0;     // panjang kain utuh (sesuai tekstur)
const TABLE = { w: 1.2, d: 0.9, h: 0.75 };
const TOP_LEN = TABLE.d - 0.06;   // bagian kain yang rebah di meja
const BEND_R = 0.02;              // jari-jari lengkung di tepi depan meja
const HANG = 0.58;                // panjang yang menjuntai

export function createSongket() {
  const g = new THREE.Group();
  g.add(createTable());

  const t = createSongketTextures({ width: CLOTH_W, height: CLOTH_L });
  const mat = new THREE.MeshStandardMaterial({
    map: t.color, bumpMap: t.bump, bumpScale: 1.2, roughnessMap: t.rough, roughness: 1,
    // Metalness diturunkan dari 1: scene tidak memakai env map, dan logam penuh tanpa
    // lingkungan untuk dipantulkan tampak gelap. 0,55 → emas tetap berkilau oleh lampu.
    metalnessMap: t.metal, metalness: 0.55, side: THREE.DoubleSide,
  });
  g.add(new THREE.Mesh(createClothGeometry(), mat));

  // Gulungan di belakang: kesan sisa kain terlipat di bawahnya
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, CLOTH_W, 20), mat);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, TABLE.h + 0.028, -TABLE.d / 2 + 0.06);
  g.add(roll);
  return g;
}

// Posisi titik kain pada jarak s dari ujung belakang bagian yang terlihat
function clothPoint(x, s, out) {
  const y0 = TABLE.h + 0.004, z0 = -TABLE.d / 2 + 0.06, zEdge = z0 + TOP_LEN;
  const bendLen = (Math.PI / 2) * BEND_R;
  if (s < TOP_LEN) {                                       // rebah di atas meja, sedikit bergelombang
    out.set(x, y0 + 0.003 * Math.sin(x * 14 + s * 9), z0 + s);
  } else if (s < TOP_LEN + bendLen) {                      // melengkung di tepi depan
    const a = (s - TOP_LEN) / BEND_R;
    out.set(x, y0 - BEND_R + BEND_R * Math.cos(a), zEdge + BEND_R * Math.sin(a));
  } else {                                                 // menjuntai, lipatan makin dalam ke bawah
    const drop = s - TOP_LEN - bendLen;
    const depth = 0.018 * Math.min(1, drop / 0.4);
    out.set(x, y0 - BEND_R - drop, zEdge + BEND_R + depth * (0.5 + 0.5 * Math.sin((x / 0.2) * Math.PI * 2)));
  }
  return out;
}

function createClothGeometry() {
  const visible = TOP_LEN + (Math.PI / 2) * BEND_R + HANG;
  const sStart = CLOTH_L - visible; // bagian awal kain tersembunyi di bawah gulungan
  const nx = 60, ns = 90;
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= ns; j++) {
    const s = (visible * j) / ns;
    for (let i = 0; i <= nx; i++) {
      const x = -CLOTH_W / 2 + (CLOTH_W * i) / nx;
      clothPoint(x, s, p);
      pos.push(p.x, p.y, p.z);
      uv.push(i / nx, 1 - (sStart + s) / CLOTH_L); // v = 0 di ujung kain yang menjuntai
    }
  }
  for (let j = 0; j < ns; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, d, b, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Meja pajang kayu gelap dengan lis prada & empat kaki
function createTable() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x3e2716, roughness: 0.55 });
  const prada = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.7, roughness: 0.35 });
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w, 0.05, TABLE.d), wood);
  top.position.y = TABLE.h - 0.025;
  g.add(top);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w + 0.02, 0.02, TABLE.d + 0.02), prada);
  trim.position.y = TABLE.h - 0.06;
  g.add(trim);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, TABLE.h - 0.05, 0.06), wood);
    leg.position.set(sx * (TABLE.w / 2 - 0.06), (TABLE.h - 0.05) / 2, sz * (TABLE.d / 2 - 0.06));
    g.add(leg);
  }
  return g;
}