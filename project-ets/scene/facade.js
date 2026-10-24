import * as THREE from 'three';
import { FRONT_MASS } from './layout.js';
import { createJogloRoof } from './roof.js';

/*
 * Fasad bernuansa Indonesia (disederhanakan):
 *  - Atap limasan bertingkat dua, seperti joglo: atap bawah landai yang menjorok
 *    menaungi serambi, lalu "lambang" (pita kayu tegak), lalu atap atas yang curam.
 *  - Serambi depan: lantai batu + deretan saka (tiang kayu) di atas umpak batu.
 *
 * Penampang samping (sumbu Z, depan di kanan):
 *
 *                 /\          ← atap atas (limasan, bubungan sejajar X)
 *              __|  |__       ← lambang
 *           __/        \__    ← atap bawah (terpancung)
 *    ______|  dinding     |   saka
 *          |              |    |
 */

// Fasad & atap ini menaungi massa depan (lobby + ujung kedua selasar)
const OUTER_W = FRONT_MASS.x[1] - FRONT_MASS.x[0];
const OUTER_D = FRONT_MASS.z[1] - FRONT_MASS.z[0];
const CENTER_X = (FRONT_MASS.x[0] + FRONT_MASS.x[1]) / 2;
const CENTER_Z = (FRONT_MASS.z[0] + FRONT_MASS.z[1]) / 2;
const FRONT_OUTER_Z = FRONT_MASS.z[1]; // sisi luar dinding depan

// ---------- Atap joglo (lihat roof.js) ----------
const EAVE_OVERHANG = 1.6; // seberapa jauh atap bawah menjorok dari dinding
const EAVE_Y = 4.3;        // tinggi tepi atap bawah (harus di atas kios loket ± 3 m)
const LOWER_SLOPE = 0.45;  // naik 0,45 m tiap 1 m ke dalam (landai)

// ---------- Serambi ----------
const PORCH_DEPTH = 1.7;   // lebar lantai teras dari dinding depan
const PILLAR_SIZE = 0.24;
const PILLAR_XS = [-10.5, -7.5, -1.9, 1.9, 7.5, 10.5]; // dihindarkan dari kios (x −5,9…−3,1) & jalan paving (±1,5)
const PILLAR_Z = FRONT_OUTER_Z + 1.4;

export function createFacade() {
  const group = new THREE.Group();
  group.name = 'facade';
  const colliders = [];

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.65 });
  const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.7 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8f8579, roughness: 0.9 });

  // Atap dibuat berpusat di (0, 0) lalu digeser ke tengah massa depan
  const roof = createJogloRoof(OUTER_W, OUTER_D, {
    eaveY: EAVE_Y, overhang: EAVE_OVERHANG, lowerSlope: LOWER_SLOPE,
  });
  roof.position.set(CENTER_X, 0, CENTER_Z);
  group.add(roof);

  // ---------- Lantai teras ----------
  const porch = new THREE.Mesh(
    new THREE.PlaneGeometry(OUTER_W + 2 * EAVE_OVERHANG, PORCH_DEPTH),
    new THREE.MeshStandardMaterial({ color: 0x7d7166, roughness: 0.85 })
  );
  porch.rotation.x = -Math.PI / 2;
  // y sedikit di atas jalan paving (0,002) supaya teras yang "menang" di area tumpang tindih
  porch.position.set(CENTER_X, 0.004, FRONT_OUTER_Z + PORCH_DEPTH / 2);
  group.add(porch);

  // ---------- Saka di atas umpak ----------
  // Tinggi saka mengikuti tinggi atap bawah tepat di titik tiang berdiri.
  const distFromEave = (FRONT_OUTER_Z + EAVE_OVERHANG) - PILLAR_Z;
  const pillarTop = EAVE_Y + distFromEave * LOWER_SLOPE;
  const baseH = 0.3;
  for (const x of PILLAR_XS) {
    addBox(group, stoneMat, 0.42, baseH, 0.42, x, baseH / 2, PILLAR_Z);                       // umpak
    addBox(group, woodMat, PILLAR_SIZE, pillarTop - baseH, PILLAR_SIZE, x, baseH + (pillarTop - baseH) / 2, PILLAR_Z); // saka
    colliders.push({ minX: x - 0.21, maxX: x + 0.21, minZ: PILLAR_Z - 0.21, maxZ: PILLAR_Z + 0.21, enabled: true });
  }
  // Balok penghubung di atas saka (blandar), menahan tepi atap bawah
  addBox(group, woodDarkMat, PILLAR_XS[PILLAR_XS.length - 1] - PILLAR_XS[0] + 0.4, 0.2, 0.2,
    0, pillarTop - 0.1, PILLAR_Z);

  return { group, colliders };
}

// ---------- Helper ----------

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}
