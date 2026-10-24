import * as THREE from 'three';

/*
 * Pembuat atap tradisional, dipakai fasad depan & semua massa bangunan.
 *
 *  createHipRoof   → limasan: 4 bidang miring, bubungan sejajar sisi terpanjang
 *  createJogloRoof → joglo: atap bawah landai (terpancung) + lambang + atap atas curam
 *
 * Semua atap dibuat berpusat di (0, 0); pemanggil yang menggeser ke tengah massa.
 */

let sharedMaterials = null;

// Material dibuat sekali & dipakai bersama semua atap (hemat memori tekstur)
function getMaterials() {
  if (!sharedMaterials) {
    sharedMaterials = {
      tile: new THREE.MeshStandardMaterial({
        map: createRoofTileTexture(),
        roughness: 0.75,
        side: THREE.DoubleSide, // bagian bawah atap terlihat dari serambi & taman
      }),
      wood: new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.65 }),
      woodDark: new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.7 }),
    };
  }
  return sharedMaterials;
}

/*
 * Limasan di atas massa w × d (ukuran luar dinding) setinggi `top`.
 * Tepi atap diturunkan sebesar overhang × slope, sehingga bidang atap tepat
 * melewati puncak dinding luar — tidak ada celah tempat cahaya matahari bocor.
 */
export function createHipRoof(w, d, top, { overhang = 0.6, slope = 0.5 } = {}) {
  const { tile, woodDark } = getMaterials();
  const group = new THREE.Group();

  const w0 = w + 2 * overhang;
  const d0 = d + 2 * overhang;
  const eaveY = top - overhang * slope;
  const ridgeY = eaveY + (Math.min(w0, d0) / 2) * slope;
  // Bubungan sepanjang selisih sisi → keempat bidang sama kemiringannya
  const alongX = w0 >= d0;
  const ridge = Math.abs(w0 - d0);
  const geo = alongX
    ? createRoofFrustum(w0, d0, eaveY, ridge, 0, ridgeY)
    : createRoofFrustum(w0, d0, eaveY, 0, ridge, ridgeY);
  group.add(new THREE.Mesh(geo, tile));

  // Wuwungan (balok bubungan)
  if (ridge > 0.01) {
    const beam = new THREE.Mesh(
      alongX ? new THREE.BoxGeometry(ridge + 0.2, 0.14, 0.18) : new THREE.BoxGeometry(0.18, 0.14, ridge + 0.2),
      woodDark
    );
    beam.position.y = ridgeY + 0.04;
    group.add(beam);
  }
  return group;
}

/*
 * Joglo: atap bawah (limasan terpancung) yang menjorok jauh, lambang (pita kayu),
 * lalu atap atas yang curam.
 */
export function createJogloRoof(w, d, {
  eaveY,                 // tinggi tepi atap bawah
  overhang = 1.6,        // seberapa jauh atap bawah menjorok dari dinding
  lowerSlope = 0.45,     // naik 0,45 m tiap 1 m ke dalam (landai)
  maxInset = 5.3,        // jarak tepi luar → tepi atas atap bawah
  bandH = 0.5,           // tinggi pita lambang
  upperOverhang = 0.6,
  upperSlope = 0.85,     // lebih curam dari atap bawah, ciri khas joglo
} = {}) {
  const { tile, wood, woodDark } = getMaterials();
  const group = new THREE.Group();

  // ---------- Atap bawah (limasan terpancung) ----------
  const w0 = w + 2 * overhang;
  const d0 = d + 2 * overhang;
  // Dibatasi supaya pada massa yang dangkal masih tersisa bukaan atas untuk lambang
  const inset = Math.min(maxInset, Math.min(w0, d0) / 2 - 1.5);
  const w1 = w0 - 2 * inset;
  const d1 = d0 - 2 * inset;
  const y1 = eaveY + inset * lowerSlope;
  group.add(new THREE.Mesh(createRoofFrustum(w0, d0, eaveY, w1, d1, y1), tile));

  // ---------- Lambang (pita kayu tegak di antara dua atap) ----------
  // Sedikit lebih kecil dari lubang atas atap bawah supaya duduk di atasnya tanpa celah terlihat.
  const band = new THREE.Mesh(new THREE.BoxGeometry(w1 - 0.2, bandH + 0.1, d1 - 0.2), wood);
  band.position.y = y1 - 0.1 + (bandH + 0.1) / 2;
  group.add(band);

  // ---------- Atap atas (limasan penuh) ----------
  const upper = createHipRoof(w1, d1, 0, { overhang: upperOverhang, slope: upperSlope });
  // createHipRoof menurunkan tepi atap dari `top`; di sini tepi atap atas sengaja
  // sedikit di bawah puncak lambang supaya menutupinya
  upper.position.y = y1 + bandH - 0.15 + upperOverhang * upperSlope;
  group.add(upper);

  return group;
}

/*
 * Atap berbentuk limas terpancung: persegi panjang bawah (w0 × d0 di y0)
 * dihubungkan ke persegi panjang atas (w1 × d1 di y1) oleh 4 bidang miring.
 * Dengan salah satu sisi atas = 0, persegi atas menjadi garis bubungan → limasan penuh.
 * UV diisi dalam satuan meter, jadi tekstur genteng ber-repeat dengan ukuran tetap.
 */
export function createRoofFrustum(w0, d0, y0, w1, d1, y1) {
  const a = w0 / 2, b = d0 / 2, c = w1 / 2, e = d1 / 2;
  // Tiap bidang: [kiri-bawah, kanan-bawah, kanan-atas, kiri-atas], dilihat dari luar (urutan CCW)
  const faces = [
    [[-a, y0,  b], [ a, y0,  b], [ c, y1,  e], [-c, y1,  e]], // depan  (+Z)
    [[ a, y0, -b], [-a, y0, -b], [-c, y1, -e], [ c, y1, -e]], // belakang (−Z)
    [[ a, y0,  b], [ a, y0, -b], [ c, y1, -e], [ c, y1,  e]], // kanan  (+X)
    [[-a, y0, -b], [-a, y0,  b], [-c, y1,  e], [-c, y1, -e]], // kiri   (−X)
  ];

  const positions = [];
  const uvs = [];
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  for (const [bl, br, tr, tl] of faces) {
    const bottomW = p.fromArray(br).distanceTo(q.fromArray(bl));
    const topW = p.fromArray(tr).distanceTo(q.fromArray(tl));
    // panjang miring = jarak dari tengah tepi bawah ke tengah tepi atas
    const midBottom = p.fromArray(bl).add(q.fromArray(br)).multiplyScalar(0.5).clone();
    const midTop = p.fromArray(tl).add(q.fromArray(tr)).multiplyScalar(0.5);
    const slant = midBottom.distanceTo(midTop);

    const uv = {
      bl: [-bottomW / 2, 0], br: [bottomW / 2, 0],
      tr: [topW / 2, slant], tl: [-topW / 2, slant],
    };
    for (const [v, key] of [[bl, 'bl'], [br, 'br'], [tr, 'tr'], [bl, 'bl'], [tr, 'tr'], [tl, 'tl']]) {
      positions.push(...v);
      uvs.push(...uv[key]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals(); // non-indexed → normal per bidang (flat), cocok untuk atap
  return geo;
}

// Genteng tanah liat: 1 tile canvas = 1 × 1 meter, berisi 4 baris genteng
function createRoofTileTexture() {
  const px = 128;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a3420';
  ctx.fillRect(0, 0, px, px);

  const rows = 4, cols = 4;
  const rh = px / rows, cw = px / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * cw / 2; // susunan genteng selang-seling
    for (let k = -1; k < cols; k++) {
      const x = k * cw + offset;
      // gradien tiap keping: terang di atas, gelap di bawah → kesan genteng bertumpuk
      const g = ctx.createLinearGradient(0, r * rh, 0, (r + 1) * rh);
      g.addColorStop(0, '#9c4a2c');
      g.addColorStop(1, '#6a2c1a');
      ctx.fillStyle = g;
      ctx.fillRect(x + 1, r * rh + 1, cw - 2, rh - 2);
    }
  }

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  // v = 0 di tepi bawah atap = bagian bawah canvas, jadi sisi gelap tiap keping menghadap talang
  return texture;
}
