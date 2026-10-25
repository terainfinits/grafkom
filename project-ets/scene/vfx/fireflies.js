import * as THREE from 'three';

/*
 * VFX kunang-kunang: titik cahaya kekuningan yang melayang pelan & berkedip, di taman tengah
 * dan halaman depan (suasana senja golden hour).
 *
 * Semua kunang-kunang = SATU THREE.Points (1 draw call), berapa pun jumlahnya:
 *  - bentuk bulat bercahaya dari sprite canvas (gradien radial), bukan geometri
 *  - AdditiveBlending: warna ditambahkan ke latar → tampak menyala, makin terang saat bertumpuk
 *  - depthWrite: false supaya titik transparan tidak saling "memotong"
 *  - kedip lewat warna per titik (vertexColors): warna hitam di blending additive = tak terlihat
 *
 * Gerak: setiap titik punya posisi dasar, lalu dijumlah beberapa gelombang sinus dengan
 * fase & kecepatan acak → melayang tidak beraturan tanpa perlu simulasi fisika.
 *
 * Pemakaian:
 *   const fireflies = createFireflies();
 *   scene.add(fireflies.group);
 *   fireflies.update(dt); // di loop
 */

// Area sebaran [minX, maxX], [minZ, maxZ], jumlah. Ketinggian 0,3–2,2 m (setinggi semak & pinggang).
const AREAS = [
  { x: [-6.5, 6.5], z: [-11.5, -0.5], count: 22 }, // taman tengah (terbuka, di antara selasar)
  { x: [-20, 20], z: [9, 30], count: 55 },        // halaman depan, di depan serambi
];
const Y_RANGE = [0.3, 2.2];
const COLOR = new THREE.Color(0xffe27a);
const SIZE = 0.18;      // meter (sizeAttenuation: makin jauh makin kecil)
const BRIGHTNESS = 0.6; // < 1 → cahaya lembut & samar, tidak menyilaukan

export function createFireflies() {
  const total = AREAS.reduce((n, a) => n + a.count, 0);
  const base = new Float32Array(total * 3);    // posisi dasar
  const params = new Float32Array(total * 4);  // fase gerak, kecepatan, fase kedip, laju kedip
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);

  let i = 0;
  for (const area of AREAS) {
    for (let n = 0; n < area.count; n++, i++) {
      base[i * 3] = rand(area.x[0], area.x[1]);
      base[i * 3 + 1] = rand(Y_RANGE[0], Y_RANGE[1]);
      base[i * 3 + 2] = rand(area.z[0], area.z[1]);
      params[i * 4] = rand(0, Math.PI * 2);
      params[i * 4 + 1] = rand(0.12, 0.3); // kecepatan melayang: pelan, menenangkan
      params[i * 4 + 2] = rand(0, Math.PI * 2);
      params[i * 4 + 3] = rand(0.35, 0.8); // laju kedip: lambat, seperti bernapas
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));

  const material = new THREE.PointsMaterial({
    size: SIZE,
    map: createGlowTexture(),
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'kunang-kunang';
  points.frustumCulled = false; // posisi berubah tiap frame; bounding sphere tidak dihitung ulang

  const group = new THREE.Group();
  group.add(points);

  let time = 0;
  function update(dt) {
    time += dt;
    for (let k = 0; k < total; k++) {
      const [phase, speed, blinkPhase, blinkRate] = [params[k * 4], params[k * 4 + 1], params[k * 4 + 2], params[k * 4 + 3]];
      const t = time * speed + phase;
      // Dua gelombang dengan frekuensi berbeda per sumbu → lintasan berkelok, tidak berulang jelas
      positions[k * 3] = base[k * 3] + Math.sin(t) * 0.6 + Math.sin(t * 2.3) * 0.2;
      positions[k * 3 + 1] = base[k * 3 + 1] + Math.sin(t * 1.7) * 0.25;
      positions[k * 3 + 2] = base[k * 3 + 2] + Math.cos(t * 0.9) * 0.6 + Math.cos(t * 2.1) * 0.2;

      // Kedip: sinus dipangkat supaya sedikit lebih lama redup daripada menyala. Pangkat kecil
      // + laju lambat → nyala-padam mengalun halus (seperti bernapas), bukan berkedip tajam.
      const glow = BRIGHTNESS * Math.pow(0.5 + 0.5 * Math.sin(time * blinkRate + blinkPhase), 1.5);
      colors[k * 3] = COLOR.r * glow;
      colors[k * 3 + 1] = COLOR.g * glow;
      colors[k * 3 + 2] = COLOR.b * glow;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  update(0);
  return { group, update };
}

// Titik bulat bercahaya: inti putih, memudar ke tepi (dipakai juga oleh VFX partikel lain)
export function createGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}
