import * as THREE from 'three';

/*
 * Light pool — hanya N lampu terdekat dengan pemain yang benar-benar menyala.
 *
 * Masalah: setiap PointLight dihitung oleh SETIAP piksel di layar, walaupun lampunya
 * jauh di ruang lain. Museum ini punya 23 PointLight → 23 perhitungan cahaya per piksel.
 *
 * Solusi: semua PointLight di scene diubah menjadi "lampu virtual" (cukup data posisi,
 * warna, intensitas). Di scene hanya ada N PointLight sungguhan; setiap frame keduanya
 * dipindah ke N lampu virtual terdekat dengan kamera.
 *
 * Kenapa jumlahnya tetap N (bukan menyalakan/mematikan lampu): shader Three.js dikompilasi
 * untuk jumlah lampu tertentu. Mengubah jumlah lampu = kompilasi ulang = tersendat.
 * Memindah posisi & intensitas hanya mengubah nilai uniform, jadi gratis.
 *
 * Supaya tidak "berkedip" saat lampu masuk/keluar daftar terdekat, intensitas dipudarkan:
 * lampu yang jaraknya mendekati lampu pertama yang TIDAK terpilih bernilai ≈ 0, sehingga
 * saat bertukar tempat keduanya sama-sama redup.
 *
 * Dipanggil sekali setelah scene selesai dibangun (sebelum compileAsync).
 */
export function createLightPool(scene, { size = 8, fade = 3 } = {}) {
  scene.updateMatrixWorld(true);

  // Kumpulkan semua PointLight yang dibuat modul-modul scene, lalu lepas dari scene
  const sources = [];
  scene.traverse((obj) => { if (obj.isPointLight) sources.push(obj); });
  const virtual = sources.map((light) => ({
    position: light.getWorldPosition(new THREE.Vector3()),
    color: light.color.clone(),
    intensity: light.intensity,
    distance: light.distance,
    decay: light.decay,
    dist: 0,
  }));
  for (const light of sources) light.removeFromParent();

  const pool = [];
  for (let i = 0; i < Math.min(size, virtual.length); i++) {
    const light = new THREE.PointLight(0xffffff, 0);
    light.name = `lampu pool ${i + 1}`;
    scene.add(light);
    pool.push(light);
  }

  return {
    virtualCount: virtual.length,
    activeCount: pool.length,

    update(viewer) {
      for (const v of virtual) v.dist = v.position.distanceTo(viewer);
      virtual.sort((a, b) => a.dist - b.dist);
      // Jarak lampu pertama yang tidak kebagian tempat → batas pemudaran
      const cutoff = virtual.length > pool.length ? virtual[pool.length].dist : Infinity;

      pool.forEach((light, i) => {
        const v = virtual[i];
        const weight = Math.min(1, (cutoff - v.dist) / fade);
        light.position.copy(v.position);
        light.color.copy(v.color);
        light.intensity = v.intensity * weight;
        light.distance = v.distance;
        light.decay = v.decay;
      });
    },
  };
}
