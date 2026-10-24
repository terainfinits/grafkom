import * as THREE from 'three';
import { extrude, lieFlat, addSupports, materials } from './common.js';

/*
 * Mandau (Dayak, Kalimantan): parang bermata satu yang melebar ke ujung, dengan
 * takik ukiran di punggung bilah, hulu dari tanduk yang ujungnya melengkung &
 * dihias rambut, serta sarung (kumpang) kayu berikat rotan.
 *
 *    punggung bilah (bertakik) ─┐
 *   ┌──^^^^─────────────────────╲  ← ujung lancip di sisi punggung
 *   │ hulu │ bilah melebar        )
 *   └──────┴───────────────────╱   ← sisi tajam
 */
const L = 0.5; // panjang bilah

export function createMandau() {
  const m = materials();
  const antler = new THREE.MeshStandardMaterial({ color: 0xe6d8b8, roughness: 0.5 }); // tanduk
  const sheathWood = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.6 });
  const rattan = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 });
  const hairBlack = new THREE.MeshStandardMaterial({ color: 0x151210, roughness: 0.9 });
  const hairRed = new THREE.MeshStandardMaterial({ color: 0x9a2418, roughness: 0.9 });

  // ---------- Mandau (tegak di +Y) ----------
  const mandau = new THREE.Group();
  mandau.add(new THREE.Mesh(extrude(bladeOutline(), 0.004), m.iron));

  // Hulu tanduk: pegangan lurus lalu melebar & melengkung ke sisi punggung di ujungnya
  const hulu = new THREE.Mesh(extrude([
    [0.0, 0], [0.03, 0], [0.032, -0.09], [0.045, -0.11], [0.05, -0.135], [0.03, -0.155],
    [-0.02, -0.16], [-0.045, -0.145], [-0.04, -0.125], [-0.005, -0.11], [0.0, -0.09],
  ], 0.026, { bevel: 0.004, segments: 2 }), antler);
  mandau.add(hulu);

  // Cincin kuningan di pangkal bilah
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.032), m.brass);
  collar.position.set(0.015, -0.004, 0);
  mandau.add(collar);

  // Rambut hiasan di tepi hulu: kerucut tipis bergantian hitam & merah
  const hairGeo = new THREE.ConeGeometry(0.005, 0.05, 5);
  [[-0.045, -0.14], [-0.035, -0.152], [-0.02, -0.158], [-0.005, -0.16], [0.012, -0.158]].forEach(([x, y], i) => {
    const h = new THREE.Mesh(hairGeo, i % 2 ? hairRed : hairBlack);
    h.position.set(x, y - 0.02, 0);
    h.rotation.z = Math.PI + (x + 0.015) * 8; // menjuntai ke bawah, sedikit menyebar
    mandau.add(h);
  });

  // ---------- Kumpang (sarung) ----------
  const kumpang = new THREE.Group();
  kumpang.add(new THREE.Mesh(extrude([
    [-0.012, 0], [0.05, 0], [0.072, 0.47], [0.045, 0.555], [0.0, 0.53], [-0.014, 0.48],
  ], 0.022, { bevel: 0.004, segments: 2 }), sheathWood));
  // Ikatan rotan melingkar
  for (const y of [0.04, 0.17, 0.3, 0.43]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.075 + y * 0.04, 0.014, 0.034), rattan);
    band.position.set(0.02 + y * 0.03, y, 0);
    kumpang.add(band);
  }

  // ---------- Tata letak rebah ----------
  const display = new THREE.Group();
  const lyingMandau = lieFlat(mandau, 0.3);
  lyingMandau.position.set(-0.19, 0.07, -0.05);
  display.add(lyingMandau);
  const lyingSheath = lieFlat(kumpang, 0.2);
  lyingSheath.position.set(-0.28, 0.03, 0.13);
  display.add(lyingSheath);
  addSupports(display, m.woodStand, [-0.2, 0.15], -0.05);
  return display;
}

// Garis luar bilah: punggung (x kecil) bertakik di dekat pangkal, sisi tajam (x besar)
// melebar ke ujung, dan ujung yang lancip mengarah ke sisi punggung
function bladeOutline() {
  const steps = 40;
  const spine = (t) => -0.003 * Math.sin(Math.PI * t);
  const width = (t) => 0.03 + 0.024 * Math.pow(t, 1.6);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, y = t * L;
    pts.push([spine(t), y]);
    // takik ukiran pada punggung (t 0,08–0,3): titik ekstra yang masuk ke dalam bilah
    if (t > 0.08 && t < 0.3 && i % 2 === 0) pts.push([spine(t) + 0.005, y + 0.005]);
  }
  pts.push([spine(1) + 0.006, L + 0.045]); // ujung
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    pts.push([spine(t) + width(t), t * L]);
  }
  return pts;
}
