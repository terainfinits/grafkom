import * as THREE from 'three';
import { FRONT_Z, WALL_THICKNESS, DOOR } from './layout.js';

// Batas halaman yang boleh dijelajahi pemain (meter). Gedung ada di tengah,
// halaman depan (+Z) dibuat lebih luas karena di situ jalan masuk & loket.
export const YARD = { minX: -28, maxX: 28, minZ: -38, maxZ: 35 };

const GROUND_SIZE = 300; // tanah dibuat jauh lebih luas dari halaman, ujungnya tertutup fog
const PATH_WIDTH = 3;    // lebar jalan paving ke pintu

// Warna langit golden hour, dari puncak (atas) ke bawah cakrawala
const SKY_STOPS = [
  [0.00, '#2c4a7a'], // biru tua di puncak
  [0.30, '#6f86b0'],
  [0.44, '#e8a872'], // jingga mendekati cakrawala
  [0.50, '#ffcf8f'], // cakrawala paling terang
  [0.56, '#b48a62'], // di bawah cakrawala (jarang terlihat, tertutup tanah)
  [1.00, '#5a4632'],
];
const FOG_COLOR = 0xe9b483; // disamakan dengan cakrawala supaya ujung tanah "melebur" ke langit

export function createOutdoor(scene) {
  const group = new THREE.Group();
  group.name = 'outdoor';

  // ---------- Langit ----------
  // Gradien vertikal di canvas dipakai sebagai peta equirectangular:
  // baris atas canvas = puncak langit, tengah = cakrawala, bawah = titik di bawah kaki.
  scene.background = createSkyTexture();
  scene.fog = new THREE.Fog(FOG_COLOR, 35, 140);

  // ---------- Tanah rumput ----------
  // Sedikit di bawah y = 0 agar tidak z-fighting dengan lantai ruangan.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new THREE.MeshStandardMaterial({ map: createGrassTexture(GROUND_SIZE), roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  group.add(ground);

  // ---------- Jalan paving dari tepi halaman ke pintu ----------
  const pathStart = FRONT_Z + WALL_THICKNESS; // tepat di luar ambang pintu
  const pathLength = YARD.maxZ - pathStart;
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(PATH_WIDTH, pathLength),
    new THREE.MeshStandardMaterial({ map: createPavingTexture(PATH_WIDTH, pathLength), roughness: 0.85 })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.002, pathStart + pathLength / 2);
  path.receiveShadow = true;
  group.add(path);

  // Lantai kecil di bawah ambang pintu, supaya celah setebal dinding tidak tampak rumput
  const sill = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR.width, WALL_THICKNESS),
    new THREE.MeshStandardMaterial({ color: 0x5c4d3d, roughness: 0.8 })
  );
  sill.rotation.x = -Math.PI / 2;
  sill.position.set(0, 0.002, FRONT_Z + WALL_THICKNESS / 2);
  group.add(sill);

  // ---------- Cahaya langit (ambient) ----------
  // Atas = pantulan langit sore yang hangat, bawah = pantulan tanah/rumput.
  // Ini yang mengisi bagian bayangan & dalam ruangan supaya tidak gelap pekat.
  group.add(new THREE.HemisphereLight(0xffe2c0, 0x6b5a40, 1.1));

  // ---------- Matahari sore ----------
  // Rendah & dari depan-kiri gedung, sehingga fasad terkena cahaya hangat
  // dan bayangan memanjang ke belakang-kanan.
  const sun = new THREE.DirectionalLight(0xffb36b, 3);
  sun.position.set(-30, 14, 35);
  sun.target.position.set(0, 0, -5); // tengah-tengah halaman & gedung
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // Kotak kamera bayangan cukup menutup halaman; makin kecil makin tajam bayangannya
  const s = 42;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 120 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  group.add(sun, sun.target);

  return { group, sun };
}

// ---------- Tekstur canvas ----------

function createSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  for (const [stop, color] of SKY_STOPS) grad.addColorStop(stop, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

// Rumput: dasar hijau + bintik acak beberapa warna, supaya tidak tampak polos saat berjalan
function createGrassTexture(size) {
  const px = 256;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5d7a34';
  ctx.fillRect(0, 0, px, px);
  const shades = ['#4f6b2b', '#6a8a3c', '#7a9442', '#566f30'];
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = shades[i % shades.length];
    ctx.fillRect(Math.random() * px, Math.random() * px, 2, 2 + Math.random() * 3);
  }

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(size / 4, size / 4); // 1 tile canvas = 4 x 4 meter
  texture.anisotropy = 8;
  return texture;
}

// Paving blok batu bata pola susun (running bond)
function createPavingTexture(width, length) {
  const px = 256;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6e6259'; // warna nat
  ctx.fillRect(0, 0, px, px);

  const rows = 4, cols = 2;
  const bw = px / cols, bh = px / rows, gap = 4;
  const tones = ['#a8968a', '#9c8a7e', '#b3a194'];
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * bw / 2; // baris selang-seling digeser setengah bata
    for (let k = -1; k < cols; k++) {
      ctx.fillStyle = tones[(r + k + 3) % tones.length];
      ctx.fillRect(k * bw + offset + gap / 2, r * bh + gap / 2, bw - gap, bh - gap);
    }
  }

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(width / 1, length / 1); // 1 tile canvas = 1 x 1 meter
  texture.anisotropy = 8;
  return texture;
}
