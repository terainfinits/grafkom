import * as THREE from 'three';
import { createCualTextures } from '../textiles/cualPattern.js';

/*
 * Kain Cual dibentangkan utuh dari tongkat kayu, dipajang di panel dinding (muka +Z),
 * supaya kepala kain di kedua ujung (taburan bunga emas & pucuk rebung) terlihat lengkap.
 *
 *     ●━━━━━━━━━━━━━━━━━━━━━━━━━━━●   ← tongkat kayu bertutup kuningan
 *      ┃kepala┃   badan ikat   ┃kepala┃
 *      ┃ kain ┃     bunga      ┃ kain ┃  ← lipatan vertikal halus, makin dalam ke bawah
 *      ┗━━━━━━┻━━━━━━━━━━━━━━━━┻━━━━━━┛
 *
 * Tekstur kain utuh dipetakan ke UV 0..1 (repeat 1), jadi cukup PlaneGeometry biasa
 * yang titik-titiknya digeser di sumbu Z untuk membuat lipatan.
 */
const W = 2.0;        // lebar kain
const H = 0.9;        // tinggi kain
const ROD_R = 0.016;  // jari-jari tongkat

export function createCual() {
  const g = new THREE.Group();

  const t = createCualTextures({ width: W, height: H });
  const cloth = new THREE.Mesh(createClothGeometry(), new THREE.MeshStandardMaterial({
    map: t.color, bumpMap: t.bump, bumpScale: 1, roughnessMap: t.rough, roughness: 1,
    metalnessMap: t.metal, metalness: 1, side: THREE.DoubleSide,
  }));
  g.add(cloth);

  // Tongkat kayu tempat kain digantung, dengan tutup kuningan di kedua ujung
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.5 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.85, roughness: 0.3 });
  const rodLen = W + 0.16;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R, ROD_R, rodLen, 16), wood);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, H / 2 + ROD_R * 0.6, ROD_R);
  g.add(rod);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(ROD_R * 1.8, 16, 12), brass);
    cap.position.set(s * rodLen / 2, rod.position.y, rod.position.z);
    g.add(cap);
  }
  return g;
}

// Lipatan: gelombang sinus sepanjang x yang dalamnya bertambah dari atas (terjepit di
// tongkat) ke bawah (bebas menjuntai)
function createClothGeometry() {
  const geo = new THREE.PlaneGeometry(W, H, 100, 30);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const fromTop = (H / 2 - y) / H;                        // 0 di atas, 1 di bawah
    const depth = 0.004 + 0.016 * fromTop;
    pos.setZ(i, depth * (0.5 + 0.5 * Math.sin((x / 0.22) * Math.PI * 2)));
  }
  geo.computeVertexNormals();
  return geo;
}
