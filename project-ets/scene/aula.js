/*
File Purpose: Merakit struktur arsitektur Joglo interior aula utama museum (4 tiang soko guru bermotif prada, alas umpak batu, plafon tumpang sari 5 tingkat, panel ukiran padma, dan lentera gantung pusat).

Connected Files:
- ./layout.js: Mengambil data dimensi dan koordinat batas ruang 'Aula utama' (ROOMS).
- ./data/artifacts.js: Menyediakan titik koordinat [0.0, 0.0] di antara 4 soko guru untuk artefak utama (Peta Indonesia).
- ./exhibits.js: Menempatkan objek 3D artefak pameran di dalam area lantai aula.
- ../main.js: Mengimpor createAula untuk memasukkan grup 3D dan array colliders ke dalam scene serta sistem WalkControls.
*/
import * as THREE from 'three';
import { ROOMS } from './layout.js';

/*
 * Inti aula utama (dalem): empat soko guru yang menopang tumpang sari.
 *
 * Tumpang sari = langit-langit bertingkat khas joglo: bingkai-bingkai kayu yang
 * makin ke atas makin kecil, sehingga dari bawah terlihat seperti tangga terbalik
 * menuju satu panel di puncak. Tiap bingkai tepat menyambung ke bingkai di atasnya
 * (tepi dalam bingkai i = tepi luar bingkai i+1), jadi tidak ada celah ke plafon.
 *
 *   Penampang (dilihat dari samping):
 *                  ┌──┐               ← panel puncak (motif padma)
 *               ┌──┘  └──┐
 *            ┌──┘        └──┐         ← bingkai tumpang sari
 *         ┌──┘              └──┐
 *         ║                    ║      ← soko guru
 *        ▟█▙                  ▟█▙     ← umpak batu
 */

const AULA = ROOMS.find((r) => r.name === 'Aula utama');
const CX = (AULA.x[0] + AULA.x[1]) / 2;
const CZ = (AULA.z[0] + AULA.z[1]) / 2;

const SOKO_OFFSET = 2.85;   // jarak soko guru dari tengah aula (X & Z) → ruang tengah ± 5,4 m untuk artifact utama
const SOKO_SIZE = 0.32;
const SOKO_TOP = 5.2;       // puncak soko guru = dasar tumpang sari
const STEP = 0.35;          // lebar tiap bingkai (sekaligus seberapa jauh bingkai berikutnya masuk ke dalam)
const BEAM_H = 0.3;         // tinggi tiap bingkai
const LEVELS = 5;
const OUTER_HALF = SOKO_OFFSET + 0.15; // bingkai terbawah sedikit melewati soko guru

export function createAula() {
  const group = new THREE.Group();
  group.name = 'aula';
  group.position.set(CX, 0, CZ);
  const colliders = [];

  const woodDark = new THREE.MeshStandardMaterial({ color: 0x3e2716, roughness: 0.6 });
  const woodMid = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.6 });
  // Prada: aksen keemasan khas ukiran Jawa, dibuat sedikit metalik
  const prada = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.7, roughness: 0.35 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x8f8579, roughness: 0.9 });

  // ---------- Soko guru di atas umpak ----------
  // Umpak = limas terpancung dari batu; CylinderGeometry 4 sisi diputar 45° agar sisinya sejajar sumbu
  const umpakGeo = new THREE.CylinderGeometry(0.3, 0.42, 0.4, 4);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * SOKO_OFFSET, z = sz * SOKO_OFFSET;
      const umpak = new THREE.Mesh(umpakGeo, stone);
      umpak.position.set(x, 0.2, z);
      umpak.rotation.y = Math.PI / 4;
      group.add(umpak);

      addBox(group, woodDark, SOKO_SIZE, SOKO_TOP - 0.4, SOKO_SIZE, x, 0.4 + (SOKO_TOP - 0.4) / 2, z);
      // cincin prada di pangkal & ujung soko
      for (const y of [0.55, SOKO_TOP - 0.25]) {
        addBox(group, prada, SOKO_SIZE + 0.04, 0.06, SOKO_SIZE + 0.04, x, y, z);
      }

      // Collider dalam koordinat dunia (group digeser ke tengah aula)
      colliders.push({
        minX: CX + x - 0.3, maxX: CX + x + 0.3,
        minZ: CZ + z - 0.3, maxZ: CZ + z + 0.3, enabled: true,
      });
    }
  }

  // ---------- Tumpang sari ----------
  for (let i = 0; i < LEVELS; i++) {
    const outer = OUTER_HALF - i * STEP;
    const y = SOKO_TOP + i * BEAM_H;
    addFrame(group, i % 2 ? woodMid : woodDark, outer, STEP + 0.02, BEAM_H, y);
    // garis prada tipis di tepi bawah-dalam tiap bingkai → tingkatnya terbaca dari bawah.
    // Menonjol 2 cm di bawah balok supaya sisi bawahnya tidak sebidang (z-fighting).
    addFrame(group, prada, outer - STEP + 0.03, 0.04, 0.03, y - 0.02);
  }

  // Panel puncak bermotif padma (teratai), menutup lubang bingkai teratas
  const topHalf = OUTER_HALF - LEVELS * STEP + 0.02;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(topHalf * 2, topHalf * 2),
    new THREE.MeshStandardMaterial({ map: createPadmaTexture(), roughness: 0.55, metalness: 0.2 })
  );
  panel.rotation.x = Math.PI / 2; // menghadap ke bawah
  panel.position.y = SOKO_TOP + LEVELS * BEAM_H - 0.01;
  group.add(panel);

  // ---------- Lampu gantung di tengah tumpang sari ----------
  // Menerangi sisi bawah bingkai (yang tidak terkena lampu plafon aula) & tengah aula,
  // tempat artifact utama nanti.
  const lanternY = 4.6;
  const rodTop = panel.position.y;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, rodTop - lanternY), prada);
  rod.position.y = (rodTop + lanternY) / 2;
  group.add(rod);
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc878, emissiveIntensity: 1.8 })
  );
  lantern.position.y = lanternY;
  lantern.castShadow = false;
  group.add(lantern);
  addBox(group, prada, 0.5, 0.04, 0.5, 0, lanternY + 0.24, 0); // tutup lentera
  const light = new THREE.PointLight(0xffd9a0, 14, 14, 2);
  light.position.y = lanternY - 0.1;
  group.add(light);

  return { group, colliders };
}

// ---------- Helper ----------

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}

// Bingkai persegi dari 4 balok. `half` = setengah sisi luar, `width` = lebar balok,
// `y` = sisi bawah bingkai. Balok X membentang penuh, balok Z mengisi di antaranya.
function addFrame(parent, material, half, width, height, y) {
  const yc = y + height / 2;
  for (const s of [-1, 1]) {
    addBox(parent, material, half * 2, height, width, 0, yc, s * (half - width / 2));
    addBox(parent, material, width, height, half * 2 - 2 * width, s * (half - width / 2), yc, 0);
  }
}

// Motif padma (teratai) keemasan di atas latar merah tua, khas panel tengah tumpang sari
function createPadmaTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a1e14';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#c9a050';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, s - 20, s - 20);

  const cx = s / 2, cy = s / 2;
  // dua lapis kelopak: 8 besar + 8 kecil berselang
  for (const [count, len, wid, color, offset] of [
    [8, 92, 26, '#c9a050', 0],
    [8, 60, 18, '#e2c27a', Math.PI / 8],
  ]) {
    for (let k = 0; k < count; k++) {
      const a = offset + k * (Math.PI * 2 / count);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2, len / 2, wid / 2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#5a1e14';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2c27a';
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
