import * as THREE from 'three';

/*
 * VFX riak air di kolam teratai taman tengah. Dua lapisan, keduanya pelan & tenang:
 *
 *  1. Permukaan beriak halus — normal map gelombang (digambar di canvas) yang digeser perlahan.
 *     Normal map mengubah arah "hadap" permukaan per piksel tanpa menambah geometri, jadi
 *     pantulan cahaya di air ikut bergoyang. Teksturnya dibuat tileable (bisa diulang tanpa
 *     sambungan) dengan memakai gelombang sinus berfrekuensi bulat.
 *
 *  2. Lingkaran riak — cincin tipis yang muncul di titik acak (seperti tetesan air / ikan
 *     menyentuh permukaan), melebar, lalu memudar. Semua cincin = SATU InstancedMesh
 *     (1 draw call): tiap instance punya matriks (posisi & skala) dan warna sendiri. Dengan
 *     AdditiveBlending, warna hitam = tak terlihat, jadi memudarkan cukup dengan menggelapkan warna.
 *
 * Pemakaian:
 *   const ripples = createRipples(courtyard.water); // { material, center, size, y }
 *   scene.add(ripples.group);
 *   ripples.update(dt); // di loop
 */

const RING_COUNT = 5;          // cincin aktif bersamaan (maksimum)
const RING_LIFE = [3.5, 5];    // lama hidup satu cincin (detik)
const RING_RADIUS = [0.35, 0.6]; // radius akhir (m)
const RING_GAP = [0.6, 1.8];   // jeda antar kemunculan cincin baru (detik)
const RING_COLOR = new THREE.Color(0xcfe6e0);
const RING_BRIGHTNESS = 0.35;
const FLOW = new THREE.Vector2(0.012, 0.008); // laju geser normal map (UV per detik)

export function createRipples(water) {
  const group = new THREE.Group();
  group.name = 'riak air';

  // ---------- 1. Normal map bergelombang ----------
  const normalMap = createWaveNormalMap();
  normalMap.repeat.set(water.size[0] / 1.5, water.size[1] / 1.5); // satu ubin ± 1,5 m
  water.material.normalMap = normalMap;
  water.material.normalScale.set(0.18, 0.18); // lembut: kilau kecil, tidak bergelombang kasar
  water.material.needsUpdate = true;

  // ---------- 2. Cincin riak ----------
  const ring = new THREE.RingGeometry(0.9, 1, 48); // radius 1 → diskalakan per instance
  ring.rotateX(-Math.PI / 2);                      // rebah di bidang air
  const mesh = new THREE.InstancedMesh(ring, new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), RING_COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  group.add(mesh);

  // Status tiap cincin: posisi, umur, lama hidup, radius akhir (umur < 0 = tidak aktif)
  const rings = Array.from({ length: RING_COUNT }, () => ({ x: 0, z: 0, age: -1, life: 1, radius: 1 }));
  const black = new THREE.Color(0, 0, 0);
  const color = new THREE.Color();
  const matrix = new THREE.Matrix4();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < RING_COUNT; i++) {
    mesh.setMatrixAt(i, hidden);
    mesh.setColorAt(i, black);
  }

  // Cincin muncul hanya di bagian dalam kolam (sisakan tepi supaya tidak menembus bibir batu)
  const margin = RING_RADIUS[1];
  const spawnX = [water.center[0] - water.size[0] / 2 + margin, water.center[0] + water.size[0] / 2 - margin];
  const spawnZ = [water.center[1] - water.size[1] / 2 + margin, water.center[1] + water.size[1] / 2 - margin];
  const y = water.y + 0.004; // sedikit di atas air (hindari z-fighting), tetap di bawah daun teratai

  let nextSpawn = rand(...RING_GAP);

  function update(dt) {
    normalMap.offset.addScaledVector(FLOW, dt);

    nextSpawn -= dt;
    if (nextSpawn <= 0) {
      const free = rings.find((r) => r.age < 0);
      if (free) Object.assign(free, { x: rand(...spawnX), z: rand(...spawnZ), age: 0, life: rand(...RING_LIFE), radius: rand(...RING_RADIUS) });
      nextSpawn = rand(...RING_GAP);
    }

    rings.forEach((r, i) => {
      if (r.age < 0) return;
      r.age += dt;
      const t = r.age / r.life;
      if (t >= 1) {
        r.age = -1;
        mesh.setMatrixAt(i, hidden);
        mesh.setColorAt(i, black);
        return;
      }
      // Melebar cepat di awal lalu melambat (ease-out), memudar seiring melebar
      const s = r.radius * (1 - Math.pow(1 - t, 2));
      matrix.makeScale(s, 1, s).setPosition(r.x, y, r.z);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, color.copy(RING_COLOR).multiplyScalar(RING_BRIGHTNESS * (1 - t)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }

  return { group, update };
}

// Normal map dari fungsi tinggi gelombang h(x, y) = jumlah beberapa sinus. Frekuensi bulat
// (sekian gelombang per lebar tekstur) → ujung kiri-kanan & atas-bawah menyambung mulus.
function createWaveNormalMap() {
  const N = 128;
  const waves = [[3, 1, 0.0], [1, 4, 1.7], [5, -2, 3.1], [-2, 3, 4.6]]; // [kx, ky, fase]
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N);
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      // Turunan h terhadap x & y (dihitung analitik dari sinus) → kemiringan permukaan
      let dx = 0, dy = 0;
      for (const [kx, ky, ph] of waves) {
        const a = (2 * Math.PI * (kx * px + ky * py)) / N + ph;
        dx += kx * Math.cos(a);
        dy += ky * Math.cos(a);
      }
      const nx = -dx * 0.08, ny = -dy * 0.08;
      const len = Math.hypot(nx, ny, 1);
      const o = (py * N + px) * 4;
      img.data[o] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; // normal map = data, bukan warna → tetap linear
  return tex;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}
