import * as THREE from 'three';
import { FRONT_Z, WALL_THICKNESS, DOOR } from './layout.js';

/*
 * Loket tiket di luar gedung, menempel di dinding depan.
 *
 *   ══════════════╗      ╔══════════════   ← dinding depan, lubang pintu di x = 0
 *      [ LOKET ]                             ← kios + petugas di kiri pintu
 *
 *   Halaman (z lebih besar) — pemain mulai di sini
 *
 * Pintu masuknya sendiri ada di entranceDoor.js.
 *
 * Semua posisi diatur dari konstanta di bawah, jadi mudah dipindah
 * saat layout museum nanti berubah.
 */
const WALL_FRONT_Z = FRONT_Z + WALL_THICKNESS; // sisi luar dinding depan
const BOOTH_X = -4.5;                // posisi kios loket (kiri pintu bila dilihat dari halaman)
const TALK_DISTANCE = 1.8;

export function createTicketBooth() {
  const group = new THREE.Group();
  group.name = 'ticketBooth';
  const colliders = [];

  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.6 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.7 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc39a4f, metalness: 0.8, roughness: 0.35 });

  // Papan "PINTU MASUK" menempel di dinding, di atas ambang pintu
  addSign(group, 'PINTU MASUK', 2.4, 0.45, 0, DOOR.height + 0.4, WALL_FRONT_Z + 0.03);

  // ---------- Kios loket ----------
  const deskW = 2.4;
  const deskD = 0.6;
  const deskZ = WALL_FRONT_Z + 0.8;
  addBox(group, wood, deskW, 1.05, deskD, BOOTH_X, 0.525, deskZ);                 // meja
  addBox(group, brass, deskW + 0.06, 0.04, deskD + 0.06, BOOTH_X, 1.07, deskZ);   // lis meja
  colliders.push(rect(BOOTH_X, deskZ, deskW, deskD));

  const sideDepth = deskZ + deskD / 2 - WALL_FRONT_Z; // dari dinding sampai depan meja
  const sideZ = WALL_FRONT_Z + sideDepth / 2;
  for (const side of [-1, 1]) {
    const x = BOOTH_X + side * (deskW / 2 + 0.05);
    addBox(group, woodDark, 0.1, 2.4, sideDepth, x, 1.2, sideZ);                  // dinding samping
    colliders.push(rect(x, sideZ, 0.1, sideDepth));
  }
  addBox(group, woodDark, deskW + 0.3, 0.08, sideDepth + 0.2, BOOTH_X, 2.42, sideZ); // atap
  addSign(group, 'LOKET TIKET', deskW + 0.2, 0.5, BOOTH_X, 2.72, deskZ + deskD / 2);

  // ---------- Petugas (placeholder) ----------
  const worker = createWorker();
  worker.position.set(BOOTH_X, 0, WALL_FRONT_Z + 0.32);
  group.add(worker);

  // ---------- Lampu kios ----------
  // (lampu lobby dihapus: loket sekarang di luar, sudah diterangi matahari)
  const kioskLight = new THREE.PointLight(0xffe1b0, 4, 4, 2);
  kioskLight.position.set(BOOTH_X, 2.2, WALL_FRONT_Z + 0.9);
  group.add(kioskLight);

  // Titik untuk mengecek "pemain sedang di depan loket"
  const talkPoint = new THREE.Vector2(BOOTH_X, deskZ + 0.9);

  // ---------- State & animasi ----------
  const lookTarget = new THREE.Vector3();

  return {
    group,
    colliders,

    isPlayerNear(position) {
      return Math.hypot(position.x - talkPoint.x, position.z - talkPoint.y) < TALK_DISTANCE;
    },

    update(dt, playerPosition) {
      // petugas menoleh ke pemain (hanya diputar di sumbu Y)
      lookTarget.set(playerPosition.x, worker.position.y, playerPosition.z);
      worker.lookAt(lookTarget);
    },
  };
}

// ---------- Helper ----------

// Collider persegi di bidang XZ dari titik tengah + ukuran
function rect(cx, cz, w, d) {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, enabled: true };
}

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}

function createWorker() {
  const worker = new THREE.Group();
  const uniform = new THREE.MeshStandardMaterial({ color: 0x2f5d62, roughness: 0.7 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc69c74, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1f2a });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.8, 6, 16), uniform);
  body.position.y = 0.85;
  worker.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), skin);
  head.position.y = 1.68;
  worker.add(head);

  // mata di sisi +Z, supaya terlihat arah hadapnya
  for (const x of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), dark);
    eye.position.set(x, 1.71, 0.155);
    worker.add(eye);
  }
  return worker;
}

// Papan nama: teks digambar di canvas, dipasang di sisi depan (+Z)
function addSign(parent, text, w, h, x, y, z) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = Math.round(640 * (h / w));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1b1f2a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#c39a4f';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
  ctx.fillStyle = '#e8c97a';
  ctx.font = `600 ${Math.round(c.height * 0.45)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const frame = new THREE.MeshStandardMaterial({ color: 0x3b2c20 });
  // emissive = papan sedikit "menyala", supaya tetap terbaca walau jauh dari lampu
  const face = new THREE.MeshStandardMaterial({
    map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.6,
  });
  // urutan material BoxGeometry: +X, -X, +Y, -Y, +Z, -Z
  const sign = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), [frame, frame, frame, frame, face, frame]);
  sign.position.set(x, y, z);
  parent.add(sign);
  return sign;
}
