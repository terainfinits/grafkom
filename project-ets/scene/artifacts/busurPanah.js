import * as THREE from 'three';
import { extrude } from './common.js';

/*
 * Busur & panah Papua, dipajang tegak di panel dinding (muka menghadap +Z).
 * Busur dari kayu palem/bambu dengan tali bilah rotan; anak panah dari batang gelagah
 * TANPA bulu, dengan mata yang berbeda-beda sesuai buruan:
 *   (a) kayu keras bergerigi, (b) bilah bambu lebar, (c) kayu keras runcing polos.
 *
 *      ╮     │ │ │   ← mata panah (a, b, c)
 *      │╲    │ │ │
 *      │ )   │ │ │   ← busur melengkung & tali lurus
 *      │╱    │ │ │
 *      ╯
 */
const BOW_HALF = 0.8;
const ARROW_LEN = 1.4;

export function createBusurPanah() {
  const bowWood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.55 });
  const strip = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.7 });
  const binding = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
  const cane = new THREE.MeshStandardMaterial({ color: 0xc8a868, roughness: 0.6 });
  const hardwood = new THREE.MeshStandardMaterial({ color: 0x4a2a14, roughness: 0.5 });
  const bamboo = new THREE.MeshStandardMaterial({ color: 0xd8b878, roughness: 0.6 });
  const g = new THREE.Group();

  // ---------- Busur: kurva melengkung + tali lurus ----------
  const arc = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, -BOW_HALF, 0), new THREE.Vector3(0.34, 0, 0), new THREE.Vector3(0, BOW_HALF, 0)
  );
  g.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 48, 0.012, 8), bowWood));
  const string = new THREE.Mesh(new THREE.BoxGeometry(0.006, BOW_HALF * 2 - 0.02, 0.003), strip);
  g.add(string);
  // Lilitan rotan di pegangan & kedua ujung
  for (const [t, len] of [[0.5, 0.14], [0.03, 0.05], [0.97, 0.05]]) {
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, len, 10), binding);
    const p = arc.getPoint(t);
    wrap.position.copy(p);
    wrap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arc.getTangent(t));
    g.add(wrap);
  }

  // ---------- Anak panah ----------
  const bottom = -BOW_HALF + 0.05;
  const tips = [barbedTip, bambooTip, plainTip];
  [-0.15, -0.27, -0.39].forEach((x, i) => {
    const shaftLen = ARROW_LEN - 0.3;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, shaftLen, 8), cane);
    shaft.position.set(x, bottom + shaftLen / 2, 0);
    g.add(shaft);
    // Ruas gelagah
    for (let k = 1; k < 5; k++) {
      const node = new THREE.Mesh(new THREE.TorusGeometry(0.0065, 0.0016, 6, 12), binding);
      node.rotation.x = Math.PI / 2;
      node.position.set(x, bottom + (shaftLen * k) / 5, 0);
      g.add(node);
    }
    // Ikatan di sambungan batang & mata panah
    const join = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), binding);
    join.position.set(x, bottom + shaftLen, 0);
    g.add(join);
    const tip = tips[i]({ hardwood, bamboo });
    tip.position.set(x, bottom + shaftLen, 0);
    g.add(tip);
  });
  return g;
}

// (a) Kayu keras dengan gerigi (duri balik) bergantian kiri-kanan
function barbedTip({ hardwood }) {
  const t = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.26, 8), hardwood);
  rod.position.y = 0.13;
  t.add(rod);
  for (let k = 0; k < 5; k++) {
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.03, 5), hardwood);
    const side = k % 2 ? 1 : -1;
    barb.position.set(side * 0.006, 0.08 + k * 0.035, 0);
    barb.rotation.z = Math.PI + side * 0.5; // runcing mengarah ke bawah-luar (duri balik)
    t.add(barb);
  }
  const point = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.04, 8), hardwood);
  point.position.y = 0.28;
  t.add(point);
  return t;
}

// (b) Bilah bambu lebar berbentuk daun, untuk buruan besar
function bambooTip({ bamboo }) {
  const pts = [];
  const LEN = 0.3, steps = 16;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    pts.push([-0.02 * Math.sin(Math.PI * Math.min(1, s * 1.1)) - 0.006 * (1 - s), s * LEN]);
  }
  for (let i = steps; i >= 0; i--) {
    const s = i / steps;
    pts.push([0.02 * Math.sin(Math.PI * Math.min(1, s * 1.1)) + 0.006 * (1 - s), s * LEN]);
  }
  return new THREE.Mesh(extrude(pts, 0.003, { bevel: 0.001 }), bamboo);
}

// (c) Kayu keras runcing polos
function plainTip({ hardwood }) {
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.3, 8), hardwood);
  cone.position.y = 0.15;
  return cone;
}
