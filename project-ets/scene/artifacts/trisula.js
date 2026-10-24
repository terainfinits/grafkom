import * as THREE from 'three';
import { extrude, materials } from './common.js';

/*
 * Trisula (Sumatera Selatan): tombak bermata tiga bergagang panjang, dipajang tegak.
 * Mata tengah berbentuk daun & lebih panjang; dua mata samping melengkung keluar lalu naik.
 *
 *        ╲ │ ╱   ← mata samping (kurva) & mata tengah (daun)
 *         ═╪═    ← palang
 *          ▼     ← rumbai merah
 *          ║     ← gagang kayu berbingkai kuningan
 *          ║
 */
const SHAFT = 1.45;

export function createTrisula() {
  const m = materials();
  const shaftWood = new THREE.MeshStandardMaterial({ color: 0x5b3320, roughness: 0.5 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa0281e, roughness: 0.85 });
  const g = new THREE.Group();

  // ---------- Gagang ----------
  addCyl(g, m.brass, 0.02, 0.022, 0.06, 0.03);                     // sepatu logam di kaki
  addCyl(g, shaftWood, 0.016, 0.016, SHAFT, 0.06 + SHAFT / 2);
  for (const y of [0.45, SHAFT - 0.02]) addCyl(g, m.brass, 0.019, 0.019, 0.035, y); // cincin
  const top = 0.06 + SHAFT;

  // ---------- Pangkal mata tombak ----------
  addCyl(g, m.iron, 0.012, 0.019, 0.1, top + 0.05);                // selongsong
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 12), red);
  tassel.rotation.x = Math.PI;                                        // rumbai menjuntai ke bawah
  tassel.position.y = top - 0.03;
  g.add(tassel);
  const base = top + 0.1;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.014), m.iron);
  bar.position.y = base + 0.009;
  g.add(bar);

  // ---------- Mata tengah: bentuk daun ----------
  const leaf = [];
  const LEAF = 0.3, steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    leaf.push([-0.022 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8) - 0.004 * (1 - t), t * LEAF]);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    leaf.push([0.022 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.8) + 0.004 * (1 - t), t * LEAF]);
  }
  const center = new THREE.Mesh(extrude(leaf, 0.006, { bevel: 0.002 }), m.iron);
  center.position.y = base + 0.016;
  g.add(center);

  // ---------- Mata samping: kurva keluar lalu naik, diakhiri ujung lancip ----------
  for (const s of [-1, 1]) {
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(s * 0.05, base + 0.01, 0),
      new THREE.Vector3(s * 0.12, base + 0.03, 0),
      new THREE.Vector3(s * 0.1, base + 0.13, 0),
      new THREE.Vector3(s * 0.07, base + 0.22, 0),
    );
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.006, 8), m.iron));
    // Ujung: kerucut yang diarahkan mengikuti arah kurva di titik akhirnya
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.05, 8), m.iron);
    const dir = curve.getTangent(1);
    tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    tip.position.copy(curve.getPoint(1)).addScaledVector(dir, 0.025);
    g.add(tip);
  }
  return g;
}

function addCyl(parent, material, rTop, rBottom, h, y) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 16), material);
  c.position.y = y;
  parent.add(c);
  return c;
}
