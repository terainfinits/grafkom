import * as THREE from 'three';

/*
 * Keris prosedural: bilah berluk + ganja + mendak + hulu (gagang), dan warangka (sarung).
 * Semua ukuran dalam meter, mendekati ukuran asli (panjang keris ± 0,48 m).
 *
 *   Keris dibuat tegak di sepanjang +Y (hulu di bawah, ujung bilah di atas):
 *
 *        ╱╲   ← ujung bilah
 *       ╱  ╲    bilah berluk 7 (lekuk ganjil), dari ExtrudeGeometry
 *       ╲  ╱
 *       ╱  ╲
 *     ▬▬▬▬▬▬  ← ganja (pangkal bilah, asimetris)
 *        ◯    ← mendak (cincin)
 *       ( )   ← hulu (gagang), dari LatheGeometry
 *
 * Fungsi mengembalikan Group berisi keris & warangka yang sudah ditata rebah,
 * siap diletakkan di atas pedestal (titik (0,0,0) = permukaan atas pedestal).
 */

const BLADE_L = 0.36;   // panjang bilah
const BLADE_W = 0.038;  // lebar bilah di pangkal
const LUK = 7;          // jumlah lekuk (selalu ganjil)
const LUK_AMP = 0.0055; // simpangan lekuk ke kiri-kanan

export function createKeris() {
  const metal = new THREE.MeshStandardMaterial({
    map: createPamorTexture(), metalness: 0.85, roughness: 0.35, color: 0xb8b8b8,
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.9, roughness: 0.3 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.4 });
  const lightWood = new THREE.MeshStandardMaterial({ map: createWoodGrainTexture(), roughness: 0.45 });

  // ---------- Keris (tegak di +Y) ----------
  const keris = new THREE.Group();
  keris.add(new THREE.Mesh(createBladeGeometry(), metal));

  const ganja = new THREE.Mesh(createGanjaGeometry(), metal);
  ganja.position.y = -0.014;
  keris.add(ganja);

  const mendak = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 8, 24), gold);
  mendak.rotation.x = Math.PI / 2; // cincin melingkari sumbu Y
  mendak.position.y = -0.018;
  keris.add(mendak);

  // Hulu: profil diputar (lathe), sedikit dipipihkan & dimiringkan ke depan seperti hulu Jawa
  const huluProfile = [[0.009, 0], [0.013, -0.01], [0.016, -0.035], [0.013, -0.058], [0.017, -0.08], [0.012, -0.095], [0.001, -0.1]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const hulu = new THREE.Mesh(new THREE.LatheGeometry(huluProfile, 20), darkWood);
  hulu.scale.z = 0.75;
  hulu.rotation.z = 0.12;
  hulu.position.y = -0.021;
  keris.add(hulu);

  // ---------- Warangka (sarung): ladrang (kepala lebar) + gandar berlapis pendok ----------
  const warangka = new THREE.Group();
  const ladrang = new THREE.Mesh(createLadrangGeometry(), lightWood);
  warangka.add(ladrang);
  const gandar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, BLADE_L - 0.02, 12), gold);
  gandar.scale.z = 0.55; // pipih seperti bilah di dalamnya
  gandar.position.set(-0.012, -(BLADE_L - 0.02) / 2, 0);
  warangka.add(gandar);

  // ---------- Tata letak di atas pedestal ----------
  // Rotasi z −90° merebahkan sumbu panjang (+Y) ke +X; rotasi x membuat sisi lebar bilah
  // menghadap ke atas, sedikit dimiringkan ke arah pengunjung supaya pamornya terlihat.
  const display = new THREE.Group();
  const kerisLying = new THREE.Group();
  keris.rotation.z = -Math.PI / 2;
  kerisLying.add(keris);
  kerisLying.rotation.x = -Math.PI / 2 + 0.35;
  kerisLying.position.set(-0.2, 0.075, -0.05);
  display.add(kerisLying);

  const warangkaLying = new THREE.Group();
  warangka.rotation.z = Math.PI / 2; // ladrang di kiri, gandar memanjang ke kanan (+X)
  warangkaLying.add(warangka);
  warangkaLying.rotation.x = -Math.PI / 2 + 0.2;
  warangkaLying.position.set(-0.14, 0.03, 0.11);
  display.add(warangkaLying);

  // Dua penyangga kayu kecil untuk keris
  for (const x of [-0.17, 0.08]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.06), darkWood);
    stand.position.set(x, 0.03, -0.05);
    display.add(stand);
  }
  return display;
}

// ---------- Geometri ----------

// Bilah berluk: garis tengah bergelombang (sinus) dengan lebar yang menyempit ke ujung
function createBladeGeometry() {
  const steps = 80;
  const left = [], right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // lekuk mulai sedikit di atas pangkal & mengecil ke ujung
    const ramp = THREE.MathUtils.smoothstep(t, 0.05, 0.2) * (1 - 0.5 * t);
    const cx = Math.sin(t * Math.PI * LUK) * LUK_AMP * ramp;
    // sedikit menggembung di pangkal (gandik), lalu meruncing
    const w = BLADE_W * (1 - Math.pow(t, 1.4)) * (1 + 0.15 * Math.exp(-t * 25));
    left.push(new THREE.Vector2(cx - w / 2, t * BLADE_L));
    right.push(new THREE.Vector2(cx + w / 2, t * BLADE_L));
  }
  const shape = new THREE.Shape([...left, ...right.reverse()]);
  const depth = 0.003;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// Ganja: pangkal bilah yang asimetris (sisi kanan melebar)
function createGanjaGeometry() {
  const pts = [[-0.022, 0], [0.05, 0], [0.056, 0.006], [0.042, 0.014], [-0.02, 0.014], [-0.026, 0.007]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: 0.012, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1,
  });
  geo.translate(0, 0, -0.006);
  return geo;
}

// Ladrang: kepala warangka berbentuk perahu
function createLadrangGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.1, 0.018);
  s.quadraticCurveTo(-0.07, -0.004, -0.03, 0);
  s.lineTo(0.07, 0);
  s.quadraticCurveTo(0.1, 0.004, 0.105, 0.03);
  s.quadraticCurveTo(0.09, 0.052, 0.06, 0.05);
  s.lineTo(-0.07, 0.045);
  s.quadraticCurveTo(-0.1, 0.04, -0.1, 0.018);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.02, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10,
  });
  geo.translate(0, 0, -0.01);
  return geo;
}

// ---------- Tekstur ----------

// Pamor: garis-garis keperakan bergelombang di atas besi gelap
function createPamorTexture() {
  const w = 256, h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3c3c3e';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(205, 205, 200, 0.55)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 18; k++) {
    const y0 = (k / 18) * h, phase = k * 1.7;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = y0 + Math.sin(x * 0.05 + phase) * 3 + Math.sin(x * 0.13 + phase * 2) * 1.5;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // UV ExtrudeGeometry = koordinat bentuk dalam meter → diperbesar supaya pamor terlihat halus
  tex.repeat.set(30, 4);
  tex.anisotropy = 8;
  return tex;
}

// Serat kayu cerah (kayu timoho/cendana) untuk ladrang
function createWoodGrainTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(90, 55, 28, 0.35)';
  for (let k = 0; k < 14; k++) {
    ctx.beginPath();
    for (let x = 0; x <= s; x += 4) {
      const y = k * 9 + Math.sin(x * 0.08 + k) * 3;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}
