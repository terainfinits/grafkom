import * as THREE from 'three';

/*
 * Prasasti rahasia di taman (easter egg). Sejak awal sudah ada sebagai hiasan biasa: batu
 * tegak di bawah pohon kamboja, ukirannya gelap. Setelah SEMUA quest selesai (koleksi utama,
 * kuis, & lukisan), ukirannya menyala keemasan & berdenyut pelan, dan pemain bisa
 * berinteraksi dengannya (E) untuk membuka "asal-usul" museum ini (ui/secretViewer.js).
 *
 * Ukiran digambar dua kali dengan pola yang sama: sebagai `map` (goresan gelap di atas batu)
 * dan `emissiveMap` (goresan putih di atas hitam = hanya goresan yang bisa menyala).
 * Menyala/padam cukup dengan mengubah emissiveIntensity — tanpa lampu tambahan.
 *
 * Pemakaian:
 *   const stone = createSecretStone();
 *   scene.add(stone.group);
 *   stone.active = true;              // saat easter egg terbuka
 *   stone.isPlayerNear(camera.position);
 *   stone.update(dt);                 // di loop (denyut cahaya)
 */
const POS = { x: 4.2, z: -10.4 };  // di bawah pohon kamboja (courtyard.js: pohon di (5, −8))
const FACING = -Math.PI / 2;        // menghadap −X: ke pelataran & pintu aula (jalan masuk taman)
const TALK_DISTANCE = 1.6;

export function createSecretStone() {
  const group = new THREE.Group();
  group.name = 'prasasti rahasia';
  group.position.set(POS.x, 0, POS.z);
  group.rotation.y = FACING;

  const stone = new THREE.MeshStandardMaterial({ color: 0x77736b, roughness: 0.95 });
  const face = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    map: createCarvingTexture('#77736b', '#3e3a33'),
    emissiveMap: createCarvingTexture('#000', '#fff'),
    emissive: 0xffc860, emissiveIntensity: 0,
  });

  // Alas batu
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.45), stone);
  base.position.y = 0.07;
  group.add(base);

  // Badan prasasti: muka depan (+Z) memakai material berukir, sisi lain batu polos
  const stele = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.8, 0.14), [stone, stone, stone, stone, face, stone]);
  stele.position.y = 0.14 + 0.4;
  group.add(stele);
  // Puncak membulat: setengah silinder (sisi −Z) yang direbahkan → setelah diputar, sisi itu menghadap ke atas
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 24, 1, false, Math.PI / 2, Math.PI), stone);
  top.rotation.x = Math.PI / 2;
  top.position.y = 0.94;
  group.add(top);

  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(base);
  const colliders = [{ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, enabled: true }];

  let time = 0;
  return {
    group,
    colliders,
    active: false,

    isPlayerNear(pos) {
      return Math.hypot(pos.x - POS.x, pos.z - POS.z) < TALK_DISTANCE;
    },

    update(dt) {
      time += dt;
      // Padam saat belum terbuka; menyala & berdenyut pelan setelah terbuka
      face.emissiveIntensity = this.active ? 0.9 + Math.sin(time * 2) * 0.4 : 0;
    },
  };
}

// Ukiran: bingkai, matahari bersinar di atas, & beberapa baris "aksara" (goresan acak tetapi
// tetap — memakai pembangkit acak berbenih, jadi bentuknya sama setiap kali dimuat)
function createCarvingTexture(background, ink) {
  const W = 256, H = 366; // rasio muka prasasti 0,56 × 0,8
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';

  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, W - 28, H - 28);

  // Matahari: lingkaran + sinar
  const cx = W / 2, cy = 82;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
    ctx.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
    ctx.stroke();
  }

  // Baris aksara
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.lineWidth = 3;
  for (let row = 0; row < 5; row++) {
    const y = 160 + row * 38;
    for (let x = 40; x < W - 40; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, y + rand() * 10);
      ctx.quadraticCurveTo(x + 8, y - 10 + rand() * 8, x + 14, y + 4 + rand() * 10);
      if (rand() > 0.5) ctx.lineTo(x + 6, y + 16);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
