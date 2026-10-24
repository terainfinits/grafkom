import * as THREE from 'three';
import { extrude, lieFlat, addSupports, materials } from './common.js';

/*
 * Pasatimpo (Kaili, Sulawesi Tengah): senjata tikam berbilah sedikit melengkung,
 * dengan hulu yang membengkok tajam menyerupai kepala burung, dan sarung yang
 * melebar di bagian pangkal (mulut sarung).
 *
 *        ╭──╮ ← kepala burung (paruh menghadap sisi tajam)
 *        │  │ hulu
 *        ╞══╡ ← cincin
 *        │  ╲  bilah melengkung
 *        │   ╲
 */
const L = 0.28; // panjang bilah

export function createPasatimpo() {
  const m = materials();
  const sheathWood = new THREE.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.55 });

  // ---------- Pasatimpo (tegak di +Y) ----------
  const weapon = new THREE.Group();
  weapon.add(new THREE.Mesh(extrude(bladeOutline(), 0.004), m.iron));

  // Hulu: pegangan turun, lalu membengkok tajam ke sisi tajam membentuk kepala burung
  // dengan jambul di belakang & paruh panjang di depan
  const hulu = new THREE.Shape();
  hulu.moveTo(0, 0);
  hulu.lineTo(0.026, 0);
  hulu.quadraticCurveTo(0.03, -0.035, 0.04, -0.05);       // sisi depan pegangan
  hulu.quadraticCurveTo(0.07, -0.06, 0.118, -0.068);      // atas paruh
  hulu.lineTo(0.124, -0.075);                             // ujung paruh
  hulu.quadraticCurveTo(0.09, -0.08, 0.06, -0.09);        // bawah paruh → dagu
  hulu.quadraticCurveTo(0.035, -0.112, 0.008, -0.11);     // bawah kepala
  hulu.lineTo(-0.012, -0.118);                            // jambul
  hulu.quadraticCurveTo(-0.01, -0.095, -0.004, -0.07);    // belakang kepala
  hulu.quadraticCurveTo(-0.004, -0.03, 0, 0);             // belakang pegangan
  weapon.add(new THREE.Mesh(extrude(hulu, 0.024, { bevel: 0.004, segments: 2, curveSegments: 8 }), m.darkWood));

  // Mata burung (kuningan) di kedua sisi kepala
  for (const z of [-0.016, 0.016]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), m.brass);
    eye.position.set(0.04, -0.085, z);
    weapon.add(eye);
  }
  const ring = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.01, 0.028), m.brass);
  ring.position.set(0.013, -0.004, 0);
  weapon.add(ring);

  // ---------- Sarung: mulut melebar melengkung seperti bulan sabit, badan meruncing ----------
  const s = new THREE.Shape();
  s.moveTo(-0.045, 0.0);                                  // ujung kiri mulut
  s.quadraticCurveTo(-0.03, -0.03, 0.02, -0.028);         // lengkung bawah mulut
  s.quadraticCurveTo(0.08, -0.03, 0.095, 0.0);            // ujung kanan mulut
  s.quadraticCurveTo(0.07, 0.02, 0.045, 0.035);           // bahu kanan
  s.quadraticCurveTo(0.052, 0.2, 0.03, 0.305);            // badan sisi tajam (mengikuti lengkung bilah)
  s.lineTo(0.014, 0.312);                                 // ujung sarung
  s.quadraticCurveTo(0.0, 0.2, 0.0, 0.035);               // badan sisi punggung
  s.quadraticCurveTo(-0.02, 0.02, -0.045, 0.0);           // bahu kiri
  const sheath = new THREE.Mesh(extrude(s, 0.022, { bevel: 0.004, segments: 2, curveSegments: 10 }), sheathWood);
  const sheathGroup = new THREE.Group();
  sheathGroup.add(sheath);

  // ---------- Tata letak rebah ----------
  const display = new THREE.Group();
  const lyingWeapon = lieFlat(weapon, 0.3);
  lyingWeapon.position.set(-0.1, 0.07, -0.06);
  display.add(lyingWeapon);
  const lyingSheath = lieFlat(sheathGroup, 0.2);
  lyingSheath.position.set(-0.12, 0.035, 0.12);
  display.add(lyingSheath);
  addSupports(display, m.woodStand, [-0.08, 0.12], -0.06);
  return display;
}

// Bilah bermata satu yang melengkung ke sisi tajam & meruncing ke ujung
function bladeOutline() {
  const steps = 30;
  const spine = (t) => 0.015 * t * t;
  const width = (t) => 0.03 * (1 - Math.pow(t, 2.2));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([spine(t), t * L]);
  }
  for (let i = steps - 1; i >= 0; i--) {
    const t = i / steps;
    pts.push([spine(t) + width(t), t * L]);
  }
  return pts;
}
