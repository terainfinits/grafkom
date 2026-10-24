import * as THREE from 'three';
import { createUlosTextures } from '../textiles/ulosPattern.js';

/*
 * Ulos Batak disampirkan di gawangan (rak kain kayu berdiri).
 *
 * Kain = satu lembar geometri buatan sendiri yang melingkari palang gawangan:
 *
 *            ╭─╮        ← kain melingkar di atas palang (setengah lingkaran)
 *      bel.  │ │  depan
 *      akang │ │        ← lipatan bergelombang, makin dalam ke bawah
 *            │ │
 *        ||||  │
 *              │
 *             ||||      ← rumbai di kedua ujung
 *
 * Parameter s = jarak sepanjang kain dari ujung belakang (0) melewati palang ke ujung
 * depan (S). Dari s dihitung posisi y & z; dari x dihitung gelombang lipatan.
 * UV mengikuti (x, s) dalam meter, jadi motif tidak melar walau kain melengkung.
 */
const W = 0.8;          // lebar kain
const FRONT = 1.2;      // panjang yang menjuntai di depan
const BACK = 0.85;      // panjang yang menjuntai di belakang
const BAR_Y = 1.68;     // tinggi palang
const BAR_R = 0.025;    // jari-jari palang
const POST_X = 0.55;    // jarak tiang dari tengah
const FRINGE = 0.09;    // panjang rumbai

export function createUlos() {
  const g = new THREE.Group();
  g.add(createGawangan());

  const t = createUlosTextures();
  const r = BAR_R + 0.004;                  // kain sedikit di luar permukaan palang
  const S = BACK + Math.PI * r + FRONT;     // panjang total kain
  for (const map of [t.color, t.bump, t.rough, t.metal]) map.repeat.set(1 / t.tileSize.width, 1 / t.tileSize.height);
  const cloth = new THREE.Mesh(createClothGeometry(r, S), new THREE.MeshStandardMaterial({
    map: t.color, bumpMap: t.bump, bumpScale: 1.5, roughnessMap: t.rough, roughness: 1,
    metalnessMap: t.metal, metalness: 1, side: THREE.DoubleSide,
  }));
  g.add(cloth);

  // Rumbai di kedua ujung, mengikuti gelombang lipatan di ujung kain
  const fringeMat = createFringeMaterial();
  for (const end of ['back', 'front']) g.add(new THREE.Mesh(createFringeGeometry(r, end), fringeMat));
  return g;
}

// ---------- Kain ----------

// Posisi titik kain pada jarak s (sepanjang kain) & x (melintang)
function clothPoint(x, s, r, out) {
  let y, z, side, drop;
  if (s < BACK) {                                   // menjuntai di belakang
    drop = BACK - s; y = BAR_Y - drop; z = -r; side = -1;
  } else if (s < BACK + Math.PI * r) {              // melingkar di atas palang
    const a = (s - BACK) / r;
    drop = 0; y = BAR_Y + r * Math.sin(a); z = -r * Math.cos(a); side = 0;
  } else {                                          // menjuntai di depan
    drop = s - BACK - Math.PI * r; y = BAR_Y - drop; z = r; side = 1;
  }
  // Lipatan: gelombang sepanjang x yang makin dalam ke bawah. Selalu ke arah luar
  // (depan → +z, belakang → −z) supaya dua sisi kain tidak saling menembus.
  const depth = 0.03 * Math.min(1, drop / 0.6);
  const wave = 0.5 + 0.5 * Math.sin((x / 0.18) * Math.PI * 2 + (side < 0 ? 1.3 : 0));
  return out.set(x, y, z + side * depth * wave);
}

function createClothGeometry(r, S) {
  const nx = 48, ns = 110;
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= ns; j++) {
    const s = (S * j) / ns;
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + (W * i) / nx;
      clothPoint(x, s, r, p);
      pos.push(p.x, p.y, p.z);
      uv.push(x + W / 2, s); // dalam meter; texture.repeat = 1 / ukuran tile
    }
  }
  for (let j = 0; j < ns; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ---------- Rumbai ----------

// Pita tipis tepat di bawah ujung kain, mengikuti gelombang lipatan di ujung itu
function createFringeGeometry(r, end) {
  const nx = 48;
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3();
  const s = end === 'back' ? 0 : BACK + Math.PI * r + FRONT;
  for (let j = 0; j <= 1; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + (W * i) / nx;
      clothPoint(x, s, r, p);
      pos.push(p.x, p.y - j * FRINGE, p.z);
      uv.push(i / nx, 1 - j);
    }
  }
  for (let i = 0; i < nx; i++) idx.push(i, i + 1, i + nx + 2, i, i + nx + 2, i + nx + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Untaian benang terpilin: digambar di canvas; bagian kosong dibuang dengan alphaTest
function createFringeMaterial() {
  const w = 1024, h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#5a0f0f';                         // simpul/anyaman penutup di pangkal rumbai
  ctx.fillRect(0, 0, w, 8);
  const colors = ['#6e1212', '#2a0a0a', '#6e1212', '#d8d2c4'];
  for (let k = 0, x = 3; x < w; k++, x += 9) {
    ctx.strokeStyle = colors[k % colors.length];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 6);
    // untaian sedikit bergoyang supaya tidak kaku
    ctx.bezierCurveTo(x + 2, h * 0.4, x - 2, h * 0.7, x + (k % 3) - 1, h - 6 - (k % 4) * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
}

// ---------- Gawangan ----------

function createGawangan() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.5 });
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const x = sx * POST_X;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, BAR_Y + 0.05, 0.05), wood);
    post.position.set(x, (BAR_Y + 0.05) / 2, 0);
    g.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.5), wood);
    foot.position.set(x, 0.03, 0);
    g.add(foot);
    // Mahkota tiang: bulatan kecil di atas sambungan palang
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), wood);
    knob.position.set(x, BAR_Y + 0.07, 0);
    g.add(knob);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(BAR_R, BAR_R, POST_X * 2 + 0.1, 16), wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = BAR_Y;
  g.add(bar);
  // Palang bawah sebagai penguat
  const low = new THREE.Mesh(new THREE.BoxGeometry(POST_X * 2, 0.04, 0.04), wood);
  low.position.y = 0.25;
  g.add(low);
  return g;
}
