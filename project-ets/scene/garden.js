import * as THREE from 'three';
import { FRONT_Z, WALL_THICKNESS } from './layout.js';

/*
 * Taman depan: papan nama museum (prasasti batu di tepi jalan)
 * dan lampu taman berpasangan di kiri-kanan jalan paving.
 *
 *        gedung
 *   ─────────────────
 *     o   ║   o        ← lampu (LAMP_X), mulai LAMP_START_Z
 *  [PAPAN]║            ← papan nama di kiri jalan
 *     o   ║   o
 *     o   ║   o        ← pemain mulai di sekitar sini
 */

const WALL_FRONT_Z = FRONT_Z + WALL_THICKNESS;

// ---------- Papan nama ----------
const SIGN_X = -6;                // kiri jalan, di luar barisan lampu supaya tidak tertutup tiang
const SIGN_Z = WALL_FRONT_Z + 4.5;
const SIGN_ROT_Y = 0.35;          // sedikit diputar ke arah jalan supaya terbaca dari posisi awal
const SIGN_TITLE = 'MUSEUM INTERAKTIF 3D';
const SIGN_SUBTITLE = 'SELAMAT DATANG';

// ---------- Lampu taman ----------
const LAMP_X = 2.2;               // jarak dari tengah jalan (jalan selebar 3 m)
const LAMP_START_Z = WALL_FRONT_Z + 4;
const LAMP_SPACING = 6;
const LAMP_PAIRS = 4;
const LAMP_HEIGHT = 2.4;

export function createGarden() {
  const group = new THREE.Group();
  group.name = 'garden';
  const colliders = [];

  group.add(createNameSign(colliders));

  const lampParts = createLampParts();
  for (let i = 0; i < LAMP_PAIRS; i++) {
    const z = LAMP_START_Z + i * LAMP_SPACING;
    for (const x of [-LAMP_X, LAMP_X]) {
      const lamp = createLamp(lampParts);
      lamp.position.set(x, 0, z);
      group.add(lamp);
      colliders.push({ minX: x - 0.15, maxX: x + 0.15, minZ: z - 0.15, maxZ: z + 0.15, enabled: true });
    }
  }

  return { group, colliders };
}

// ---------- Papan nama ----------

function createNameSign(colliders) {
  const sign = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x6f675e, roughness: 0.95 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x4f4943, roughness: 0.95 });

  const w = 3.4, h = 1.3, d = 0.4;
  const baseH = 0.35;
  addBox(sign, stoneDark, w + 0.4, baseH, d + 0.4, 0, baseH / 2, 0);                 // alas
  addBox(sign, stone, w, h, d, 0, baseH + h / 2, 0);                                  // badan prasasti

  // Panel tulisan sedikit menonjol dari muka batu, supaya tidak z-fighting
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, h - 0.25), createSignFaceMaterial(w - 0.3, h - 0.25));
  panel.position.set(0, baseH + h / 2, d / 2 + 0.005);
  sign.add(panel);
  addBox(sign, stoneDark, w + 0.1, 0.12, d + 0.1, 0, baseH + h + 0.06, 0);         // tutup atas

  sign.position.set(SIGN_X, 0, SIGN_Z);
  sign.rotation.y = SIGN_ROT_Y;

  // Collider dibuat dari kotak pembungkus setelah diputar (cukup akurat untuk sudut kecil)
  sign.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(sign);
  colliders.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, enabled: true });
  return sign;
}

function createSignFaceMaterial(w, h) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round(1024 * (h / w));
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#1b1f2a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#c39a4f';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, c.width - 32, c.height - 32);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8c97a';
  fitFont(ctx, SIGN_TITLE, '600', c.height * 0.3, c.width * 0.86);
  ctx.fillText(SIGN_TITLE, c.width / 2, c.height * 0.42);
  ctx.fillStyle = '#c9b48a';
  ctx.font = `${Math.round(c.height * 0.13)}px Georgia, serif`;
  ctx.fillText(SIGN_SUBTITLE, c.width / 2, c.height * 0.72);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // emissive = tulisan tetap terbaca walau papan membelakangi matahari
  return new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5, roughness: 0.6,
  });
}

// Kecilkan ukuran font sampai teks muat di lebar maksimum
function fitFont(ctx, text, weight, size, maxWidth) {
  do {
    ctx.font = `${weight} ${Math.round(size)}px Georgia, serif`;
    size *= 0.95;
  } while (ctx.measureText(text).width > maxWidth && size > 8);
}

// ---------- Lampu taman ----------

// Geometry & material dipakai bersama oleh semua lampu (hemat memori)
function createLampParts() {
  return {
    iron: new THREE.MeshStandardMaterial({ color: 0x2a2420, metalness: 0.6, roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc878, emissiveIntensity: 1.6 }),
    pole: new THREE.CylinderGeometry(0.05, 0.07, LAMP_HEIGHT, 12),
    foot: new THREE.CylinderGeometry(0.15, 0.18, 0.15, 12),
    lantern: new THREE.BoxGeometry(0.26, 0.34, 0.26),
    frame: new THREE.BoxGeometry(0.32, 0.04, 0.32),
    cap: new THREE.ConeGeometry(0.26, 0.2, 4), // limas segi empat kecil, senada dengan atap gedung
  };
}

function createLamp(p) {
  const lamp = new THREE.Group();

  const foot = new THREE.Mesh(p.foot, p.iron);
  foot.position.y = 0.075;
  const pole = new THREE.Mesh(p.pole, p.iron);
  pole.position.y = LAMP_HEIGHT / 2;
  const frameLow = new THREE.Mesh(p.frame, p.iron);
  frameLow.position.y = LAMP_HEIGHT + 0.02;
  const lantern = new THREE.Mesh(p.lantern, p.glass);
  lantern.position.y = LAMP_HEIGHT + 0.21;
  const cap = new THREE.Mesh(p.cap, p.iron);
  cap.position.y = LAMP_HEIGHT + 0.48;
  cap.rotation.y = Math.PI / 4; // ConeGeometry segi-4 diputar 45° agar sisinya sejajar kotak lentera
  lamp.add(foot, pole, frameLow, lantern, cap);

  // Cahaya kecil saja: matahari sore masih dominan, lampu memberi aksen hangat di jalan
  const light = new THREE.PointLight(0xffc27a, 3, 7, 2);
  light.position.y = LAMP_HEIGHT + 0.2;
  lamp.add(light);
  return lamp;
}

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}
