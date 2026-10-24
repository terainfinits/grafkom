/*
File Purpose: Membuat model 3D prosedural alat musik tradisional Sasando menggunakan geometri Three.js.
Connected Files:
- ../exhibits.js: Diimpor oleh pembuat koleksi pameran untuk diletakkan di atas pedestal pameran.
*/

import * as THREE from 'three';

export function createSasando() {
  const group = new THREE.Group();

  // : Material untuk tabung bambu, wadah lontar, dan dudukan kayu
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xddb87d, roughness: 0.5 });
  const lontarMat = new THREE.MeshStandardMaterial({ color: 0xe3d2ad, roughness: 0.8, side: THREE.DoubleSide });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.6 });
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });

  // : 1. Tabung Bambu Utama (Pusat Dawai)
  const tubeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 16);
  const tube = new THREE.Mesh(tubeGeo, bambooMat);
  tube.position.y = 0.35;
  tube.castShadow = true;
  group.add(tube);

  // : 2. Resonator Daun Lontar (Bentuk Kerucut Terbuka/Kipas)
  const lontarGeo = new THREE.ConeGeometry(0.35, 0.45, 16, 1, true, 0, Math.PI * 1.5);
  const lontar = new THREE.Mesh(lontarGeo, lontarMat);
  lontar.position.y = 0.3;
  lontar.rotation.x = Math.PI; // Kerucut terbuka menghadap ke atas
  lontar.castShadow = true;
  group.add(lontar);

  // : 3. Dasar / Kakian Kayu Penyangga
  const baseGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.08, 12);
  const base = new THREE.Mesh(baseGeo, woodMat);
  base.position.y = 0.04;
  base.castShadow = true;
  group.add(base);

  // : 4. Simulasi Senar Dawai Melingkar
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stringGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.5, 4);
    const str = new THREE.Mesh(stringGeo, stringMat);
    str.position.set(Math.cos(angle) * 0.07, 0.35, Math.sin(angle) * 0.07);
    group.add(str);
  }

  return group;
}