import * as THREE from 'three';

/*
 * Lukisan berbingkai (koleksi pendukung di dinding Lobi, Selasar, & Aula).
 *
 *   const textures = await loadPaintingTextures(ARTIFACTS); // gambar lokal, di balik layar loading
 *   const model = createPainting(data, textures);            // dipakai exhibits.js untuk build: 'painting'
 *
 * Bentuknya sederhana: bidang kanvas bertekstur gambar + bingkai 4 balok + papan belakang.
 * Lebar lukisan diatur di data (`lebar`, meter); tingginya mengikuti rasio gambar, jadi
 * gambar tidak pernah gepeng. Model menghadap +Z dengan titik tengah di (0, 0, 0) —
 * posisinya di dinding diatur jenis pajangan 'frame' (exhibits.js).
 */
const FRAME_W = 0.07;  // lebar bilah bingkai (m)
const FRAME_D = 0.05;  // tebal bingkai
const MAX_TEX = 2048;  // sisi terpanjang tekstur (px)
const loader = new THREE.TextureLoader();

export async function loadPaintingTextures(artifacts) {
  const paths = [...new Set(artifacts.filter((a) => a.gambar).map((a) => a.gambar))];
  const textures = new Map();
  await Promise.all(paths.map(async (path) => {
    const tex = await loader.loadAsync(path);
    downscale(tex);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4; // tetap tajam saat dilihat menyamping dari selasar
    textures.set(path, tex);
  }));
  return textures;
}

// Gambar beresolusi sangat besar (mis. 6000 px dari Rijksmuseum) dikecilkan ke MAX_TEX
// sebelum diunggah ke GPU. Ukuran FILE boleh kecil, tetapi di GPU gambar disimpan tanpa
// kompresi: 6000 × 4800 px ≈ 115 MB per lukisan — belasan lukisan bisa menghabiskan memori GPU.
function downscale(tex) {
  const img = tex.image;
  const scale = MAX_TEX / Math.max(img.width, img.height);
  if (scale >= 1) return;
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  tex.image = c;
  tex.needsUpdate = true;
}

export function createPainting(data, textures) {
  const tex = textures.get(data.gambar);
  const w = data.lebar;
  const h = w * (tex.image.height / tex.image.width);
  const group = new THREE.Group();
  group.name = data.id;

  const canvas = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }) // cat minyak: kusam, tidak berkilau
  );
  canvas.position.z = FRAME_D * 0.5; // sedikit masuk dari muka bingkai
  group.add(canvas);

  // Papan belakang (menutup sisi belakang kanvas, terlihat dari samping). Muka depannya
  // (z = 0,2 × FRAME_D) harus jelas DI BELAKANG kanvas; kalau sebidang, keduanya saling
  // berkedip (z-fighting) dan papan gelap bisa menutupi lukisan saat dilihat dari dekat.
  // Material bingkai dibuat per lukisan, TIDAK dipakai bersama: sorotan hover (game/hover.js)
  // mengubah emissive material — kalau dipakai bersama, semua bingkai ikut menyala.
  const barMat = new THREE.MeshStandardMaterial({ color: 0xb08a45, metalness: 0.6, roughness: 0.4 }); // prada
  const backMat = new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.9 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, FRAME_D * 0.4), backMat);
  group.add(back);

  // Bingkai: bilah atas-bawah membentang penuh, bilah kiri-kanan di antaranya
  const outerW = w + 2 * FRAME_W;
  for (const s of [-1, 1]) {
    addBar(group, barMat, outerW, FRAME_W, 0, s * (h / 2 + FRAME_W / 2));
    addBar(group, barMat, FRAME_W, h, s * (w / 2 + FRAME_W / 2), 0);
  }
  return group;
}

function addBar(group, material, w, h, x, y) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, FRAME_D), material);
  bar.position.set(x, y, FRAME_D / 2);
  group.add(bar);
}
