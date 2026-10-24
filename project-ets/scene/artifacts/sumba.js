import * as THREE from 'three';
import { createSumbaTextures } from '../textiles/sumbaPattern.js';

/*
 * Tenun Sumba (hinggi) menjuntai panjang dari tongkat pada rangka gantung berdiri,
 * berumbai di ujung bawah. Muka kain menghadap +Z.
 *
 *     ╤═══════════════╤   ← tongkat atas pada dua tiang
 *     │╔═════════════╗│
 *     │║  kuda  pohon ║│   ← kain hinggi, lipatan vertikal halus
 *     │║  rusa   rusa ║│
 *     │╚═════════════╝│
 *     │ |||||||||||||  │   ← rumbai
 *    ═╧═             ═╧═  ← kaki
 *
 * UV kain dalam meter (texture.repeat = 1 / ukuran tile), sehingga motif berulang dengan
 * ukuran asli berapa pun panjang kainnya.
 */
const CLOTH_W = 1.0;
const CLOTH_H = 1.6;
const ROD_Y = 2.15;      // tinggi tongkat
const POST_X = 0.62;     // jarak tiang dari tengah
const FRINGE = 0.1;      // panjang rumbai

export function createSumba() {
  const g = new THREE.Group();
  g.add(createFrame());

  const t = createSumbaTextures({ variant: 'hinggi' });
  for (const m of [t.color, t.bump, t.rough]) m.repeat.set(1 / t.tileSize.width, 1 / t.tileSize.height);
  const cloth = new THREE.Mesh(createClothGeometry(), new THREE.MeshStandardMaterial({
    map: t.color, bumpMap: t.bump, bumpScale: 0.8, roughnessMap: t.rough, roughness: 1, side: THREE.DoubleSide,
  }));
  g.add(cloth);
  g.add(new THREE.Mesh(createFringeGeometry(), createFringeMaterial()));
  return g;
}

// Kedalaman lipatan di titik (x, y): nol di tongkat, makin dalam ke bawah
function foldZ(x, y) {
  const fromTop = (ROD_Y - y) / CLOTH_H;
  return (0.004 + 0.02 * Math.min(1, fromTop)) * (0.5 + 0.5 * Math.sin((x / 0.24) * Math.PI * 2));
}

function createClothGeometry() {
  const geo = new THREE.PlaneGeometry(CLOTH_W, CLOTH_H, 60, 40);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i) + ROD_Y - CLOTH_H / 2;
    pos.setY(i, y);
    pos.setZ(i, foldZ(x, y));
    uv.setXY(i, x + CLOTH_W / 2, y - (ROD_Y - CLOTH_H)); // meter, dari sudut kiri bawah
  }
  geo.computeVertexNormals();
  return geo;
}

// Pita rumbai di bawah kain, mengikuti lipatan di tepi bawah
function createFringeGeometry() {
  const geo = new THREE.PlaneGeometry(CLOTH_W, FRINGE, 60, 1);
  const pos = geo.attributes.position;
  const yBottom = ROD_Y - CLOTH_H;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setY(i, pos.getY(i) + yBottom - FRINGE / 2);
    pos.setZ(i, foldZ(x, yBottom));
  }
  geo.computeVertexNormals();
  return geo;
}

// Untaian benang pintal (putih mentah, merah mengkudu, cokelat) yang dipilin berkelompok
function createFringeMaterial() {
  const w = 1024, h = 64;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5c161a';                       // anyaman penutup di pangkal rumbai
  ctx.fillRect(0, 0, w, 7);
  const colors = ['#e6dcc6', '#b82422', '#5c161a', '#e6dcc6'];
  for (let k = 0, x = 4; x < w; k++, x += 10) {
    ctx.strokeStyle = colors[k % colors.length];
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, 5);
    ctx.bezierCurveTo(x - 2, h * 0.4, x + 2, h * 0.7, x + (k % 3) - 1, h - 4 - (k % 5) * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 });
}

// Rangka kayu: dua tiang berkaki, tongkat atas bertutup kuningan, kepala tiang berukir sederhana
function createFrame() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.5 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.85, roughness: 0.3 });
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const x = s * POST_X;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, ROD_Y + 0.08, 0.06), wood);
    post.position.set(x, (ROD_Y + 0.08) / 2, 0);
    g.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.55), wood);
    foot.position.set(x, 0.03, 0);
    g.add(foot);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), wood); // kepala tiang limas kecil
    cap.rotation.y = Math.PI / 4;
    cap.position.set(x, ROD_Y + 0.14, 0);
    g.add(cap);
  }
  const rodLen = POST_X * 2 + 0.16;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, rodLen, 16), wood);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, ROD_Y + 0.01, 0.0);
  g.add(rod);
  for (const s of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), brass);
    knob.position.set(s * rodLen / 2, ROD_Y + 0.01, 0);
    g.add(knob);
  }
  return g;
}
