import * as THREE from 'three';

/*
 * Isi taman tengah (terbuka, tanpa atap). Batas taman: x −6,9…6,9, z −11,9…−0,1;
 * pelataran batu x −3…3, z −11,9…−4 (lihat layout.js).
 *
 *        lobby (jendela)
 *   ┌───────────────────────┐ z ≈ 0
 *   │ ❀    (lapang: calon    ❀ │
 *   │       panggung)          │
 *   │ ≈≈≈   ┌─────────┐   🌳  │
 *   │ ≈≈≈   │pelataran│  bangku│
 *   │ kolam │  batu   │        │
 *   │ ❀  ⚱  └──pintu──┘ ⚱  ❀ │ z ≈ −12
 *        aula
 */

const POND = { x: [-6.3, -3.6], z: [-10.5, -5.5] }; // kolam teratai di barat
const TREE = { x: 5, z: -8 };                       // pohon kamboja di timur
const BENCH = { x: 4.4, z: -3.2 };                  // bangku menghadap pelataran (−X)
const JARS = [[-2.4, -11.3], [2.4, -11.3]];         // gentong di kiri-kanan pintu aula
const BUSHES = [[-6.2, -0.9], [6.2, -0.9], [-6.3, -11.3], [6.3, -11.3], [6.3, -5.6]];

export function createCourtyard() {
  const group = new THREE.Group();
  group.name = 'taman tengah';
  const colliders = [];

  const stone = new THREE.MeshStandardMaterial({ color: 0x7d776e, roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f6b2e, roughness: 0.8, flatShading: true });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.65 });

  const water = addPond(group, colliders, stone);
  addFrangipani(group, colliders, leaf);
  addBench(group, colliders, wood);
  for (const [x, z] of JARS) addJar(group, colliders, x, z, leaf);
  for (const [x, z] of BUSHES) {
    addBush(group, x, z, leaf);
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.4, maxZ: z + 0.5, enabled: true });
  }

  // water: data permukaan kolam untuk VFX riak (scene/vfx/ripples.js)
  return { group, colliders, water };
}

// ---------- Kolam teratai ----------

function addPond(group, colliders, stone) {
  const [x0, x1] = POND.x;
  const [z0, z1] = POND.z;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const w = x1 - x0, d = z1 - z0;
  const rimW = 0.25, rimH = 0.35;

  // Bibir kolam: 4 balok batu (balok X membentang penuh, balok Z di antaranya)
  for (const s of [-1, 1]) {
    addBox(group, stone, w, rimH, rimW, cx, rimH / 2, cz + s * (d / 2 - rimW / 2));
    addBox(group, stone, rimW, rimH, d - 2 * rimW, cx + s * (w / 2 - rimW / 2), rimH / 2, cz);
  }

  // Air: bidang datar sedikit di bawah bibir, licin (roughness rendah) supaya memantulkan cahaya
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 2 * rimW, d - 2 * rimW),
    new THREE.MeshStandardMaterial({ color: 0x2f5d5a, roughness: 0.08, metalness: 0.2 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx, rimH - 0.08, cz);
  group.add(water);

  // Daun teratai (piringan tipis) & beberapa bunga merah muda
  const pad = new THREE.MeshStandardMaterial({ color: 0x4f7f34, roughness: 0.7 });
  const petal = new THREE.MeshStandardMaterial({ color: 0xf1a7b8, roughness: 0.6 });
  const pads = [[-0.6, -1.6, 0.32], [0.5, -0.9, 0.26], [-0.3, 0.4, 0.36], [0.6, 1.3, 0.3], [-0.5, 1.8, 0.24]];
  pads.forEach(([px, pz, r], i) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.015, 16, 1, false, 0.4, Math.PI * 1.8), pad);
    p.position.set(cx + px, water.position.y + 0.01, cz + pz);
    p.rotation.y = i * 1.3; // potongan "V" khas daun teratai menghadap acak
    group.add(p);
    if (i % 2 === 0) {
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 6), petal);
      flower.position.set(p.position.x + 0.08, water.position.y + 0.08, p.position.z);
      group.add(flower);
    }
  });

  colliders.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, enabled: true });

  // Material tetap dipakai bersama setelah mergeStatic, jadi teksturnya masih bisa dianimasikan
  return {
    material: water.material,
    center: [cx, cz],
    size: [w - 2 * rimW, d - 2 * rimW],
    y: water.position.y,
  };
}

// ---------- Pohon kamboja ----------

// Batang pendek bercabang, tiap ujung cabang berisi gerombol daun & bunga putih-kuning
function addFrangipani(group, colliders, leaf) {
  const tree = new THREE.Group();
  tree.position.set(TREE.x, 0, TREE.z);
  const bark = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 0.95 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0x3a2a00, roughness: 0.6 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 8), bark);
  trunk.position.y = 0.8;
  tree.add(trunk);

  // [arah horizontal (radian), kemiringan dari tegak, panjang]
  const branches = [[0, 0.6, 1.3], [2.1, 0.55, 1.2], [4.2, 0.65, 1.25], [1.0, 0.25, 1.1]];
  const leafGeo = new THREE.IcosahedronGeometry(0.55, 0);
  const flowerGeo = new THREE.SphereGeometry(0.06, 6, 4);
  for (const [dir, tilt, len] of branches) {
    // Cabang = silinder yang porosnya diputar dari sumbu Y ke arah (dir, tilt)
    const axis = new THREE.Vector3(Math.sin(tilt) * Math.cos(dir), Math.cos(tilt), Math.sin(tilt) * Math.sin(dir));
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, len, 6), bark);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    branch.position.set(0, 1.6, 0).addScaledVector(axis, len / 2);
    tree.add(branch);

    const tip = new THREE.Vector3(0, 1.6, 0).addScaledVector(axis, len);
    const cluster = new THREE.Mesh(leafGeo, leaf);
    cluster.position.copy(tip).add(new THREE.Vector3(0, 0.25, 0));
    cluster.scale.set(1.2, 0.7, 1.2); // gerombol daun kamboja melebar & pipih
    tree.add(cluster);

    for (let k = 0; k < 5; k++) {
      const a = k * 1.25 + dir;
      const f = new THREE.Mesh(flowerGeo, flowerMat);
      f.position.copy(cluster.position).add(new THREE.Vector3(Math.cos(a) * 0.4, 0.3, Math.sin(a) * 0.4));
      tree.add(f);
    }
  }
  group.add(tree);
  colliders.push({ minX: TREE.x - 0.3, maxX: TREE.x + 0.3, minZ: TREE.z - 0.3, maxZ: TREE.z + 0.3, enabled: true });
}

// ---------- Bangku kayu ----------

function addBench(group, colliders, wood) {
  const bench = new THREE.Group();
  bench.position.set(BENCH.x, 0, BENCH.z);
  bench.rotation.y = -Math.PI / 2; // sandaran (lokal −Z) pindah ke +X → dudukan menghadap −X (ke pelataran)
  const L = 1.6;
  addBox(bench, wood, L, 0.06, 0.45, 0, 0.45, 0);                        // dudukan
  addBox(bench, wood, L, 0.35, 0.05, 0, 0.75, -0.2);                     // sandaran
  for (const sx of [-1, 1]) {
    addBox(bench, wood, 0.07, 0.45, 0.4, sx * (L / 2 - 0.12), 0.225, 0); // kaki
    addBox(bench, wood, 0.07, 0.35, 0.07, sx * (L / 2 - 0.12), 0.6, -0.2);
  }
  group.add(bench);
  // Setelah diputar 90°, panjang bangku sejajar sumbu Z
  colliders.push({ minX: BENCH.x - 0.3, maxX: BENCH.x + 0.3, minZ: BENCH.z - L / 2, maxZ: BENCH.z + L / 2, enabled: true });
}

// ---------- Gentong tanah liat berisi tanaman ----------

function addJar(group, colliders, x, z, leaf) {
  const clay = new THREE.MeshStandardMaterial({ color: 0x9c5a36, roughness: 0.8 });
  // Profil gentong diputar (LatheGeometry): sempit di kaki, gembung di tengah, bibir di atas
  const profile = [[0.18, 0], [0.32, 0.15], [0.38, 0.38], [0.32, 0.62], [0.24, 0.72], [0.27, 0.76]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const jar = new THREE.Mesh(new THREE.LatheGeometry(profile, 16), clay);
  jar.position.set(x, 0, z);
  group.add(jar);

  const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), leaf);
  plant.position.set(x, 0.95, z);
  plant.scale.set(1, 0.8, 1);
  group.add(plant);
  colliders.push({ minX: x - 0.38, maxX: x + 0.38, minZ: z - 0.38, maxZ: z + 0.38, enabled: true });
}

// ---------- Semak ----------

function addBush(group, x, z, leaf) {
  for (const [ox, oz, r] of [[0, 0, 0.45], [0.3, 0.2, 0.32], [-0.25, 0.25, 0.3]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf);
    b.position.set(x + ox, r * 0.7, z + oz);
    b.scale.y = 0.8;
    group.add(b);
  }
}

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}
