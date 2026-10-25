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

  // ---------- Petugas ----------
  const clerk = createWorker();
  const worker = clerk.group;
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
      clerk.update(dt);
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

// ---------- Petugas loket ----------
// Pegawai museum berseragam: kemeja batik motif kawung, celana gelap, peci hitam, name tag
// kuningan, & kartu identitas berpita. Semua dari primitive; menghadap +Z (ke pemain).
// Tangan bertumpu ke arah meja loket (meja ± 0,18 m di depan, tinggi 1,07 m).
// Mengembalikan grup + fungsi update untuk animasi napas (dada naik-turun pelan).
function createWorker() {
  const worker = new THREE.Group();
  const batik = new THREE.MeshStandardMaterial({ map: createBatikTexture(), roughness: 0.75 });
  const trousers = new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb98a63, roughness: 0.75 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc39a4f, metalness: 0.8, roughness: 0.35 });
  const red = new THREE.MeshStandardMaterial({ color: 0x9c2a22, roughness: 0.6 });

  // Kaki (sebagian besar tertutup meja, tetap dibuat supaya utuh dari samping)
  for (const x of [-0.1, 0.1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.85, 12), trousers);
    leg.position.set(x, 0.425, 0);
    worker.add(leg);
  }

  // Badan: dibungkus grup sendiri supaya bisa "bernapas" tanpa menggeser kepala & lengan
  const torso = new THREE.Group();
  torso.position.y = 0.85;
  worker.add(torso);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.62, 20), batik);
  chest.position.y = 0.31;
  chest.scale.z = 0.7; // badan lebih pipih dari depan ke belakang
  torso.add(chest);
  for (const x of [-0.2, 0.2]) { // bahu membulat
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), batik);
    shoulder.position.set(x, 0.57, 0);
    torso.add(shoulder);
  }

  // Name tag kuningan (dada kanan pemakai = kiri bila dilihat pemain) & kartu identitas berpita
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.03), createNameTagMaterial('BIMA'));
  tag.position.set(-0.1, 0.44, 0.158);
  torso.add(tag);
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.085, 0.004), new THREE.MeshStandardMaterial({ color: 0xf2efe6 }));
  card.position.set(0.04, 0.3, 0.145);
  torso.add(card);
  for (const s of [-1, 1]) { // tali pita dari leher ke kartu
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.3, 0.004), red);
    strap.position.set(0.04 + s * 0.035, 0.47, 0.145);
    strap.rotation.z = s * -0.25;
    torso.add(strap);
  }

  // Lengan: lengan atas turun dari bahu, lengan bawah menjulur ke meja
  for (const s of [-1, 1]) {
    const shoulderPt = new THREE.Vector3(s * 0.24, 1.38, 0);
    const elbowPt = new THREE.Vector3(s * 0.27, 1.1, 0.06);
    const handPt = new THREE.Vector3(s * 0.15, 1.1, 0.3);
    worker.add(limb(shoulderPt, elbowPt, 0.055, batik));
    worker.add(limb(elbowPt, handPt, 0.045, skin));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin);
    hand.position.copy(handPt);
    hand.scale.set(1, 0.6, 1.3);
    worker.add(hand);
  }

  // Leher & kepala
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 12), skin);
  neck.position.y = 1.5;
  worker.add(neck);
  const head = new THREE.Group();
  head.position.y = 1.64;
  worker.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 18), skin);
  skull.scale.set(0.95, 1.12, 1);
  head.add(skull);

  // Peci hitam (oval, sedikit lebih lebar di atas)
  const peci = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.1, 0.085, 24), black);
  peci.position.y = 0.1;
  peci.scale.z = 1.12;
  head.add(peci);

  // Wajah: mata, alis, hidung, senyum
  for (const x of [-0.04, 0.04]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), black);
    eye.position.set(x, 0.02, 0.1);
    head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.007, 0.008), black);
    brow.position.set(x, 0.048, 0.1);
    brow.rotation.z = x > 0 ? -0.12 : 0.12;
    head.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), skin);
  nose.position.set(0, -0.01, 0.112);
  head.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a2a20 }));
  smile.position.set(0, -0.045, 0.098);
  smile.rotation.z = Math.PI; // busur menghadap ke bawah = tersenyum
  head.add(smile);

  let time = 0;
  function update(dt) {
    time += dt;
    // Napas: dada mengembang pelan ± 1,5 % tiap ± 4 detik → petugas tidak tampak seperti patung
    const breath = Math.sin(time * 1.6) * 0.015;
    torso.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath);
  }

  return { group: worker, update };
}

// Silinder dari titik a ke titik b (untuk lengan)
function limb(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, dir.length(), 12), material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

// Kemeja batik: motif kawung (empat elips mengelilingi titik) krem di atas cokelat soga
function createBatikTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5b3a22';
  ctx.fillRect(0, 0, 128, 128);
  const cell = 32;
  for (let y = 0; y < 128; y += cell) {
    for (let x = 0; x < 128; x += cell) {
      const cx = x + cell / 2, cy = y + cell / 2;
      ctx.fillStyle = '#c9a46a';
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 7, 3.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#2e1d10';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4); // motif kecil & rapat, seperti kemeja batik sungguhan
  return tex;
}

function createNameTagMaterial(name) {
  const c = document.createElement('canvas');
  c.width = 200;
  c.height = 60;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c39a4f';
  ctx.fillRect(0, 0, 200, 60);
  ctx.fillStyle = '#2e1e0c';
  ctx.font = '600 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 100, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.4 });
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
