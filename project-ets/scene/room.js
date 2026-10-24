import * as THREE from 'three';

// Ukuran ruangan dalam meter
export const ROOM = {
  width: 20,  // sumbu X
  depth: 14,  // sumbu Z
  height: 5 // sumbu Y
};

export function createRoom() {
  const { width, depth, height } = ROOM;
  const room = new THREE.Group();
  room.name = 'room';

  // ---------- Lantai (tekstur ubin dari canvas, supaya gerakan terasa) ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: createTileTexture(width, depth), roughness: 0.6 })
  );
  floor.rotation.x = -Math.PI / 2; // plane default menghadap +Z, diputar agar menghadap atas
  floor.name = 'floor';
  room.add(floor);

  // ---------- Langit-langit ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2; // menghadap ke bawah
  ceiling.position.y = height;
  room.add(ceiling);

  // ---------- Dinding ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 0.9 });
  //        lebar   posisi x     posisi z     rotasi y (menghadap ke dalam)
  addWall(room, wallMat, width, 0,          -depth / 2,  0);            // belakang
  addWall(room, wallMat, width, 0,           depth / 2,  Math.PI);      // depan
  addWall(room, wallMat, depth, -width / 2,  0,          Math.PI / 2);  // kiri
  addWall(room, wallMat, depth,  width / 2,  0,         -Math.PI / 2);  // kanan

  // ---------- Lis bawah dinding (baseboard) ----------
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.7 });
  const t = 0.04; // tebal lis
  addBox(room, baseMat, width, 0.15, t,  0, 0.075, -depth / 2 + t / 2);
  addBox(room, baseMat, width, 0.15, t,  0, 0.075,  depth / 2 - t / 2);
  addBox(room, baseMat, t, 0.15, depth, -width / 2 + t / 2, 0.075, 0);
  addBox(room, baseMat, t, 0.15, depth,  width / 2 - t / 2, 0.075, 0);

  // ---------- Pencahayaan ----------
  room.add(new THREE.HemisphereLight(0xfff4e0, 0x3a3027, 0.8));

  // 2 x 3 lampu langit-langit
  const lampGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d0, emissiveIntensity: 2 });
  for (const x of [-6, 0, 6]) {
    for (const z of [-3, 3]) {
      const light = new THREE.PointLight(0xffe8c0, 12, 14, 2);
      light.position.set(x, height - 0.3, z);
      room.add(light);

      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, height - 0.025, z);
      room.add(lamp);
    }
  }

  return room;
}

// ---------- Helper ----------

function addWall(parent, material, wallWidth, x, z, rotationY) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(wallWidth, ROOM.height), material);
  wall.position.set(x, ROOM.height / 2, z);
  wall.rotation.y = rotationY;
  parent.add(wall);
  return wall;
}

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}

// Ubin 1 x 1 meter berpola catur halus, digambar di canvas lalu di-repeat
function createTileTexture(width, depth) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  const half = size / 2;
  ctx.fillStyle = '#8a7660';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#7a6752';
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);

  // nat ubin
  ctx.strokeStyle = '#5c4d3d';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, half, half);
  ctx.strokeRect(half, 0, half, half);
  ctx.strokeRect(0, half, half, half);
  ctx.strokeRect(half, half, half, half);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(width / 2, depth / 2); // 1 tile canvas = 2 x 2 meter (4 ubin)
  texture.anisotropy = 8;
  return texture;
}