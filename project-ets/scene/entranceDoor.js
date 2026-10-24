import * as THREE from 'three';
import { FRONT_Z, WALL_THICKNESS, DOOR } from './layout.js';

/*
 * Pintu masuk "kupu tarung": dua daun pintu kayu berukir yang membuka ke tengah,
 * khas rumah Jawa. Tertutup sampai pemain membeli tiket.
 *
 * Tampak atas (pintu membuka ke DALAM gedung, supaya daunnya tidak menabrak
 * pemain yang berdiri di depan pintu):
 *
 *        dalam (−Z)
 *       |          |        ← daun saat terbuka (tegak lurus dinding)
 *   ════●──────────●════    ← dinding depan, ● = engsel di tepi kusen
 *        luar (+Z)
 */

const FRAME_W = 0.12;                        // lebar kusen
const OPENING_HALF = DOOR.width / 2 - 0.02;  // kusen masuk 2 cm ke lubang, supaya sisinya tidak z-fighting dengan dinding
const LEAF_W = OPENING_HALF;                 // tiap daun selebar setengah bukaan
const LEAF_H = DOOR.height - 0.04;
const LEAF_T = 0.06;
const HINGE_Z = FRONT_Z + LEAF_T / 2 + 0.02; // daun dekat sisi dalam dinding → saat berputar ke dalam tidak menembus dinding
const OPEN_ANGLE = Math.PI / 2 * 0.95;       // hampir 90°, sedikit miring supaya terlihat alami
const OPEN_SPEED = 2;                        // makin besar makin cepat

export function createEntranceDoor() {
  const group = new THREE.Group();
  group.name = 'entranceDoor';

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc39a4f, metalness: 0.8, roughness: 0.35 });

  // ---------- Kusen ----------
  // Sedikit lebih tebal dari dinding, supaya menonjol di kedua sisi (dalam & luar)
  const frameD = WALL_THICKNESS + 0.04;
  const frameZ = FRONT_Z + WALL_THICKNESS / 2;
  for (const side of [-1, 1]) {
    addBox(group, frameMat, FRAME_W, DOOR.height + FRAME_W, frameD,
      side * (OPENING_HALF + FRAME_W / 2), (DOOR.height + FRAME_W) / 2, frameZ);
  }
  addBox(group, frameMat, 2 * (OPENING_HALF + FRAME_W), FRAME_W, frameD,
    0, DOOR.height - 0.02 + FRAME_W / 2, frameZ);                              // ambang atas kusen

  // ---------- Daun pintu ----------
  const leafMat = createLeafMaterial();
  const leafGeo = new THREE.BoxGeometry(LEAF_W, LEAF_H, LEAF_T);
  const knobGeo = new THREE.SphereGeometry(0.035, 12, 8);

  // side = −1 → daun kiri (engsel di x negatif), +1 → daun kanan
  const leaves = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); // titik putar = engsel
    pivot.position.set(side * OPENING_HALF, 0, HINGE_Z);
    group.add(pivot);

    const leaf = new THREE.Mesh(leafGeo, leafMat);
    // geser setengah lebar ke arah tengah, supaya tepi daun tepat di engsel
    leaf.position.set(-side * LEAF_W / 2, 0.01 + LEAF_H / 2, 0);
    pivot.add(leaf);

    // Gagang kuningan di kedua muka, dekat tepi tengah
    for (const face of [-1, 1]) {
      const knob = new THREE.Mesh(knobGeo, brass);
      knob.position.set(-side * (LEAF_W - 0.1), 1.05, face * (LEAF_T / 2 + 0.02));
      pivot.add(knob);
    }
    return { pivot, side };
  });

  // ---------- Collider ----------
  // Tertutup: menutup lubang pintu. Terbuka: dua daun jadi penghalang tipis di sisi dalam.
  const closedCollider = {
    minX: -OPENING_HALF, maxX: OPENING_HALF,
    minZ: FRONT_Z, maxZ: FRONT_Z + WALL_THICKNESS, enabled: true,
  };
  const openColliders = [-1, 1].map((side) => ({
    minX: side * OPENING_HALF - 0.03, maxX: side * OPENING_HALF + 0.03,
    minZ: HINGE_Z - LEAF_W, maxZ: HINGE_Z, enabled: false,
  }));

  // ---------- State & animasi ----------
  let angle = 0;
  let target = 0;

  return {
    group,
    colliders: [closedCollider, ...openColliders],

    open() {
      target = OPEN_ANGLE;
      closedCollider.enabled = false;
      for (const c of openColliders) c.enabled = true;
    },

    // Mengembalikan true selama daun pintu masih bergerak (dipakai untuk memperbarui bayangan)
    update(dt) {
      if (Math.abs(target - angle) < 0.001) return false;
      angle += (target - angle) * Math.min(1, dt * OPEN_SPEED);
      // Rotasi Y positif memutar sisi +X ke arah −Z (ke dalam). Daun kiri membentang ke +X dari engselnya,
      // daun kanan ke −X, jadi arah putarnya berlawanan: −side × sudut.
      for (const { pivot, side } of leaves) pivot.rotation.y = -side * angle;
      return true;
    },
  };
}

// ---------- Helper ----------

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}

/*
 * Muka daun pintu: kayu jati dengan dua panel timbul dan ornamen belah ketupat.
 * Canvas yang sama dipakai sebagai map (warna) dan bumpMap (relief): bagian terang
 * dianggap lebih menonjol, jadi panel & ukiran terlihat bertekstur saat terkena cahaya.
 */
function createLeafMaterial() {
  const w = 256, h = Math.round(256 * (LEAF_H / LEAF_W));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // dasar kayu + serat tipis
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(30, 18, 10, 0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x + Math.random() * 3, 0);
    ctx.lineTo(x + Math.random() * 3, h);
    ctx.stroke();
  }

  // dua panel: atas pendek, bawah panjang (pola pintu Jawa yang umum)
  const m = 22;
  const panels = [
    [m, m, w - 2 * m, h * 0.3],
    [m, h * 0.3 + 2 * m, w - 2 * m, h - h * 0.3 - 3 * m],
  ];
  for (const [x, y, pw, ph] of panels) {
    ctx.fillStyle = '#3e2615';            // alur gelap di sekeliling panel
    ctx.fillRect(x - 5, y - 5, pw + 10, ph + 10);
    ctx.fillStyle = '#7a5232';            // panel timbul (lebih terang)
    ctx.fillRect(x, y, pw, ph);
    drawOrnament(ctx, x + pw / 2, y + ph / 2, Math.min(pw, ph) * 0.32);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 3, roughness: 0.6 });
}

// Ornamen sederhana: belah ketupat bertingkat + titik di tengah (kesan ukiran)
function drawOrnament(ctx, cx, cy, r) {
  for (const [scale, color] of [[1, '#9a6a40'], [0.7, '#4a2d18'], [0.45, '#a8784a']]) {
    const s = r * scale;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.7, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.7, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#c39a4f';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}
