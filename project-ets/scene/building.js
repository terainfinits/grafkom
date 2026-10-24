import * as THREE from 'three';
import { ROOMS, WALLS, MASSES, WALL_THICKNESS } from './layout.js';
import { createHipRoof, createJogloRoof } from './roof.js';
import * as motifs from './motifs.js';

/*
 * Membangun gedung dari data denah di layout.js:
 *  - lantai & langit-langit per ruang
 *  - dinding (box tipis) yang dipotong-potong di sekitar bukaan pintu/jendela
 *  - lis bawah, lambrisering (panel kayu bawah), & pita batik parang di dinding
 *  - lampu langit-langit per ruang
 *  - collider per potongan dinding
 *  - atap limasan / joglo per massa bangunan
 */
// Ketinggian hiasan dinding (meter). Pita batik di atas semua bukaan (pintu tertinggi 3 m).
const LAMBRIS_H = 1.1;
const BAND_Y0 = 3.08, BAND_Y1 = 3.32;

export function createBuilding() {
  const group = new THREE.Group();
  group.name = 'building';
  const colliders = [];

  const mats = {
    wall: new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 0.9 }),
    base: new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.7 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 1 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1d0, emissiveIntensity: 2 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.6 }),
    // Satu material untuk SEMUA potongan lambris / pita parang. Supaya motif tidak melar
    // mengikuti panjang dinding, ulangannya diatur lewat UV geometri (lihat `deco`), bukan
    // texture.repeat — dengan begitu semua potongan bisa digabung jadi satu mesh (optimize.js).
    lambris: new THREE.MeshStandardMaterial({ map: motifs.lambris(1), roughness: 0.6 }),
    parang: new THREE.MeshStandardMaterial({ map: motifs.parang(1), roughness: 0.8 }),
  };
  const lampGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24);

  for (const room of ROOMS) {
    if (!room.open) addRoom(group, room, mats, lampGeo);
    else if (room.floor) addOpenFloor(group, room);
  }
  for (const wall of WALLS) addWall(group, wall, mats, colliders);
  for (const mass of MASSES) addRoof(group, mass);

  return { group, colliders };
}

// ---------- Ruang: lantai, langit-langit, lampu ----------

function addRoom(group, room, mats, lampGeo) {
  const [x0, x1] = room.x;
  const [z0, z1] = room.z;
  const w = x1 - x0, d = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  const floorMaps = {
    kawung: () => motifs.kawung(w, d),
    tegel: () => motifs.tegelBunga(w, d),
    wood: () => createWoodTexture(w, d),
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({
      map: (floorMaps[room.floor] ?? (() => createTileTexture(w, d)))(),
      roughness: room.floor === 'wood' ? 0.7 : 0.45, // tegel sedikit mengilap
    })
  );
  floor.rotation.x = -Math.PI / 2; // plane default menghadap +Z, diputar agar menghadap atas
  floor.position.set(cx, 0, cz);
  floor.name = `lantai ${room.name}`;
  group.add(floor);

  const ceilingMap = room.ceiling === 'gedek' ? motifs.gedek(w, d)
    : room.ceiling === 'kayu' ? motifs.papanKayu(w, d) : null;
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    ceilingMap ? new THREE.MeshStandardMaterial({ map: ceilingMap, roughness: 0.85 }) : mats.ceiling
  );
  ceiling.rotation.x = Math.PI / 2; // menghadap ke bawah
  // 1 cm di bawah atap supaya tidak z-fighting dengan sisi bawah pelat atap
  ceiling.position.set(cx, room.height - 0.01, cz);
  group.add(ceiling);

  // Intensitas mengikuti kuadrat jarak lampu ke lantai (decay 2), dengan patokan
  // 16 untuk langit-langit 5 m — jadi aula 7 m tidak terlalu gelap & selasar 3,5 m tidak silau.
  const drop = room.height - 0.3;
  const intensity = 16 * (drop / 4.7) ** 2 * (room.dim ? 0.45 : 1);
  const color = room.dim ? 0xffc890 : 0xffe8c0; // ruang redup sedikit lebih jingga
  for (const [x, z] of room.lights) {
    const light = new THREE.PointLight(color, intensity, Math.max(12, room.height * 3), 2);
    light.position.set(x, drop, z);
    group.add(light);

    const lamp = new THREE.Mesh(lampGeo, mats.lamp);
    lamp.position.set(x, room.height - 0.025, z);
    group.add(lamp);
  }
}

// Lantai ruang terbuka (mis. pelataran batu di taman): tanpa langit-langit & lampu,
// sedikit di atas rumput (−0,01) supaya tidak z-fighting
function addOpenFloor(group, room) {
  const [x0, x1] = room.x;
  const [z0, z1] = room.z;
  const w = x1 - x0, d = z1 - z0;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ map: createStoneTexture(w, d), roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((x0 + x1) / 2, 0.003, (z0 + z1) / 2);
  floor.name = `lantai ${room.name}`;
  group.add(floor);
}

// ---------- Dinding dengan bukaan ----------

/*
 * Dinding dipotong menjadi beberapa kotak:
 *
 *   ┌────┬──────┬────┐  ← potongan di atas bukaan (dari top bukaan sampai tinggi dinding)
 *   │    │bukaan│    │
 *   │    ├──────┤    │  ← potongan di bawah bukaan (hanya untuk jendela, bottom > 0)
 *   └────┴──────┴────┘
 *   potongan penuh di kiri/kanan bukaan
 */
function addWall(group, wall, mats, colliders) {
  const alongX = Array.isArray(wall.x); // dinding sejajar sumbu X (z tetap)
  const [start, end] = alongX ? wall.x : wall.z;
  const fixed = alongX ? wall.z : wall.x;
  const H = wall.height;
  const T = WALL_THICKNESS;

  // Kotak dari rentang di sepanjang dinding (a..b) dan rentang tinggi (y0..y1)
  // sill = potongan di bawah jendela (tingginya berhenti di ambang jendela)
  const piece = (a, b, y0, y1, solid, sill = false) => {
    if (b - a < 0.001 || y1 - y0 < 0.001) return;
    const len = b - a, mid = (a + b) / 2;
    const box = new THREE.Mesh(
      alongX ? new THREE.BoxGeometry(len, y1 - y0, T) : new THREE.BoxGeometry(T, y1 - y0, len),
      mats.wall
    );
    box.position.set(alongX ? mid : fixed, (y0 + y1) / 2, alongX ? fixed : mid);
    group.add(box);

    // Hiasan dinding = kotak sedikit lebih tebal dari dinding, jadi muncul di kedua sisi
    // sekaligus. Tiap lapisan beda ketebalan & sedikit lebih panjang dari potongannya,
    // supaya muka-mukanya tidak sebidang (z-fighting) di sisi kusen bukaan.
    // tiled = true → koordinat u dikali panjang (meter), jadi motif 1 m berulang sepanjang dinding
    const deco = (thick, extend, h0, h1, material, tiled = false) => {
      const l = len + 2 * extend;
      const geo = alongX ? new THREE.BoxGeometry(l, h1 - h0, T + thick) : new THREE.BoxGeometry(T + thick, h1 - h0, l);
      if (tiled) {
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * l);
      }
      const m = new THREE.Mesh(geo, material);
      m.position.set(box.position.x, (h0 + h1) / 2, box.position.z);
      group.add(m);
    };

    if (y0 === 0) {
      // Di bawah jendela, lis & lambris dibuat sedikit LEBIH PENDEK dari potongannya:
      // potongan penuh di kiri-kanannya sudah memanjang 5–6 mm ke sini, jadi kalau
      // ikut memanjang keduanya akan bertumpuk sebidang (z-fighting).
      const ext = (e) => (sill ? -e : e);
      deco(0.04, ext(0.006), 0, 0.15, mats.base);                               // lis bawah
      const top = Math.min(LAMBRIS_H, y1);
      deco(0.03, ext(0.005), 0.15, top, mats.lambris, true);                    // lambrisering
      if (y1 >= LAMBRIS_H) deco(0.05, 0.007, LAMBRIS_H - 0.02, LAMBRIS_H + 0.03, mats.rail); // list atas lambris
    }
    if (sill) {
      // Ambang jendela kayu: lebih tebal & sedikit lebih tinggi dari puncak dinding dan
      // lambris, sehingga menutupi keduanya. Tanpa ini, sisi atas dinding (putih) dan
      // sisi atas lambris (kayu) sebidang di y = ambang dan saling berkedip.
      deco(0.1, 0.06, y1 - 0.01, y1 + 0.04, mats.rail);
    }
    if (y0 <= BAND_Y0 && y1 >= BAND_Y1) {
      deco(0.02, 0.004, BAND_Y0, BAND_Y1, mats.parang, true);                   // pita batik parang
    }
    if (solid) colliders.push(rectCollider(alongX, fixed, a, b));
  };

  const openings = [...(wall.openings ?? [])].sort((p, q) => p.at - q.at);
  let cursor = start;
  for (const o of openings) {
    const a = o.at - o.width / 2, b = o.at + o.width / 2;
    const bottom = o.bottom ?? 0;
    piece(cursor, a, 0, H, true);        // potongan penuh sebelum bukaan
    piece(a, b, o.top, H, false);        // di atas bukaan (di atas kepala, tanpa collider)
    // Jendela (ada ambang bawah) tetap menghalangi pemain → collider selebar bukaan
    piece(a, b, 0, bottom, false, true);
    if (bottom > 0) colliders.push(rectCollider(alongX, fixed, a, b));
    cursor = b;
  }
  piece(cursor, end, 0, H, true);        // potongan penuh terakhir
}

function rectCollider(alongX, fixed, a, b) {
  const h = WALL_THICKNESS / 2;
  return alongX
    ? { minX: a, maxX: b, minZ: fixed - h, maxZ: fixed + h, enabled: true }
    : { minX: fixed - h, maxX: fixed + h, minZ: a, maxZ: b, enabled: true };
}

// ---------- Atap per massa ----------

function addRoof(group, mass) {
  const [x0, x1] = mass.x;
  const [z0, z1] = mass.z;
  const w = x1 - x0, d = z1 - z0;
  const { type, overhang, slope, trim = {} } = mass.roof;

  if (type === 'joglo') {
    // Tepi atap bawah diturunkan supaya bidang atap tepat melewati puncak dinding (tanpa celah)
    const roof = createJogloRoof(w, d, { eaveY: mass.top - overhang * slope, overhang, lowerSlope: slope });
    roof.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    roof.name = `atap ${mass.name}`;
    group.add(roof);
    return;
  }

  // Limasan: tapak atap = massa + overhang di tiap sisi, kecuali sisi yang di-trim.
  // Tepi atap tetap setinggi (top − overhang × slope) di semua sisi, jadi pada sisi
  // yang menjorok bidang atap tepat melewati puncak dinding, dan pada sisi trim
  // tepinya tersembunyi di dalam dinding tetangga yang lebih tinggi.
  const fx0 = trim.x0 ?? x0 - overhang, fx1 = trim.x1 ?? x1 + overhang;
  const fz0 = trim.z0 ?? z0 - overhang, fz1 = trim.z1 ?? z1 + overhang;
  const roof = createHipRoof(fx1 - fx0, fz1 - fz0, mass.top - overhang * slope, { overhang: 0, slope });
  roof.position.set((fx0 + fx1) / 2, 0, (fz0 + fz1) / 2);
  roof.name = `atap ${mass.name}`;
  group.add(roof);
}

// ---------- Tekstur lantai (canvas) ----------

// Ubin 1 x 1 meter berpola catur halus
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
  for (const [x, y] of [[0, 0], [half, 0], [0, half], [half, half]]) ctx.strokeRect(x, y, half, half);

  return repeatTexture(c, width / 2, depth / 2); // 1 tile canvas = 2 x 2 meter (4 ubin)
}

// Papan kayu memanjang, lebar papan 0,25 m
function createWoodTexture(width, depth) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const tones = ['#6b4a30', '#5f412a', '#735036', '#664629'];
  const boards = 4, bw = size / boards;
  for (let i = 0; i < boards; i++) {
    ctx.fillStyle = tones[i];
    ctx.fillRect(i * bw, 0, bw, size);
    // sambungan ujung papan di ketinggian berbeda tiap baris
    ctx.fillStyle = '#3e2a1b';
    ctx.fillRect(i * bw, ((i * 97) % size), bw, 2);
  }
  ctx.fillStyle = '#3e2a1b';
  for (let i = 0; i <= boards; i++) ctx.fillRect(i * bw - 1, 0, 2, size);

  return repeatTexture(c, width / 1, depth / 1); // 1 tile canvas = 1 x 1 meter
}

// Batu andesit tersusun acak, 1 tile canvas = 2 x 2 meter
function createStoneTexture(width, depth) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4f4b45'; // nat
  ctx.fillRect(0, 0, size, size);
  const tones = ['#7d7a72', '#8a867c', '#726e66', '#858177'];
  const rows = 4, rh = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = -((r * 37) % 60); // tiap baris digeser beda supaya tidak tampak berulang
    let i = 0;
    while (x < size) {
      const w = 48 + ((r * 13 + i * 29) % 40);
      ctx.fillStyle = tones[(r + i) % tones.length];
      ctx.fillRect(x + 2, r * rh + 2, w - 4, rh - 4);
      x += w;
      i++;
    }
  }
  return repeatTexture(c, width / 2, depth / 2);
}

function repeatTexture(canvas, rx, ry) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(rx, ry);
  texture.anisotropy = 8;
  return texture;
}
