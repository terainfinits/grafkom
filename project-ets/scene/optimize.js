import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/*
 * mergeStatic(root, cellSize) — menggabungkan mesh statis di dalam `root` menjadi
 * satu mesh per (material × petak area cellSize × cellSize meter).
 *
 * Kenapa digabung: setiap mesh = satu draw call (perintah gambar CPU → GPU). Gedung ini
 * tersusun dari ratusan kotak kecil (potongan dinding, lis, lambris, pita batik, ...)
 * yang materialnya hanya belasan jenis.
 *
 * Kenapa per petak, bukan satu mesh untuk seluruh gedung: mesh raksasa tidak bisa
 * di-culling (dibuang saat di luar pandangan) & tidak bisa diurutkan depan → belakang,
 * sehingga GPU menggambar semua dinding di balik dinding lain — dengan semua lampu per
 * piksel (saat itu 25, sebelum ada light pool). Hasil uji: draw call turun, tapi waktu per frame malah naik ±3×. Dengan petak,
 * draw call tetap rendah dan culling tetap bekerja.
 *
 * Yang TIDAK digabung (dibiarkan apa adanya):
 *  - lampu (PointLight, dll.)
 *  - mesh dengan userData.dynamic = true (benda yang nanti bergerak / diklik)
 *  - mesh dengan beberapa material sekaligus (mis. papan nama: muka bertulisan + bingkai)
 *
 * Konsekuensi: benda yang sudah digabung tidak bisa digerakkan atau di-raycast satu per
 * satu lagi. Karena itu artifact nanti JANGAN dimasukkan ke grup yang di-merge.
 */
const ATTRS = ['position', 'normal', 'uv'];

export function mergeStatic(root, cellSize = 16) {
  root.updateMatrixWorld(true);
  const toRootSpace = root.matrixWorld.clone().invert();

  const buckets = new Map(); // "material|petak" → { material, geos: [geometri dalam ruang lokal root] }
  const center = new THREE.Vector3();
  const keep = [];           // objek yang tidak digabung (lampu, mesh dinamis, ...)
  const used = new Set();    // geometri asli, di-dispose setelah selesai

  root.traverse((obj) => {
    if (obj === root) return;
    const mergeable = obj.isMesh && !Array.isArray(obj.material) && !obj.userData.dynamic
      && ATTRS.every((a) => obj.geometry.attributes[a]);
    if (mergeable) {
      // Semua dijadikan non-indexed supaya bisa digabung dengan geometri yang memang
      // non-indexed (atap buatan sendiri), lalu dipindah ke ruang lokal root
      const g = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!ATTRS.includes(name)) g.deleteAttribute(name);
      g.clearGroups();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRootSpace, obj.matrixWorld));
      // Petak ditentukan dari titik tengah benda (dalam ruang dunia)
      g.computeBoundingBox();
      g.boundingBox.getCenter(center).applyMatrix4(root.matrixWorld);
      const key = `${obj.material.uuid}|${Math.floor(center.x / cellSize)},${Math.floor(center.z / cellSize)}`;
      if (!buckets.has(key)) buckets.set(key, { material: obj.material, geos: [] });
      buckets.get(key).geos.push(g);
      used.add(obj.geometry);
    } else if (obj.isLight || obj.isMesh) {
      keep.push(obj);
    }
  });

  // Objek yang dipertahankan dipindah langsung ke bawah root, posisinya di dunia tetap
  for (const obj of keep) {
    const local = new THREE.Matrix4().multiplyMatrices(toRootSpace, obj.matrixWorld);
    obj.removeFromParent();
    local.decompose(obj.position, obj.quaternion, obj.scale);
    root.add(obj);
  }

  // Sisa anak root (grup & mesh lama) dibuang, diganti mesh gabungan
  for (const child of [...root.children]) if (!keep.includes(child)) root.remove(child);
  for (const { material, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue; // (seharusnya tidak terjadi: atribut sudah diseragamkan)
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `gabungan ${material.name || material.type}`;
    root.add(mesh);
  }
  for (const g of used) g.dispose();

  return { meshes: buckets.size, kept: keep.length };
}