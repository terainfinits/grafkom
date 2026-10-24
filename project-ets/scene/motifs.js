import * as THREE from 'three';

/*
 * Tekstur bernuansa Indonesia, semuanya digambar di canvas (tanpa file gambar):
 *  - kawung      : motif batik klasik (empat buah aren mengelilingi titik), untuk tegel kunci
 *  - tegelBunga  : tegel kunci bermotif bunga warna nila, khas rumah lama Jawa
 *  - gedek       : anyaman bambu untuk plafon
 *  - papanKayu   : plafon papan kayu jati
 *  - parang      : pita batik parang (diagonal bergelombang) di dinding
 *  - lambris     : lambrisering, panel kayu di bagian bawah dinding
 *
 * Setiap fungsi menerima ukuran bidang (meter) dan mengatur repeat sendiri,
 * jadi ukuran motif di dunia 3D selalu tetap berapa pun luas bidangnya.
 */

// ---------- Lantai ----------

// 1 tile canvas = 1 keping tegel 0,5 × 0,5 m
export function kawung(width, depth) {
  const s = 256;
  const { c, ctx } = canvas(s, s);
  ctx.fillStyle = '#e3d3b0';
  ctx.fillRect(0, 0, s, s);

  // Bunga kawung di tengah + di keempat sudut (terpotong) supaya sambung saat di-repeat
  for (const [x, y] of [[s / 2, s / 2], [0, 0], [s, 0], [0, s], [s, s]]) {
    drawKawungFlower(ctx, x, y, 45);
  }

  // nat tegel
  ctx.strokeStyle = '#7a6a54';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, s, s);
  return finish(c, width / 0.5, depth / 0.5);
}

function drawKawungFlower(ctx, cx, cy, d) {
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2; // empat kelopak menghadap diagonal
    const ex = cx + Math.cos(a) * d, ey = cy + Math.sin(a) * d;
    ctx.fillStyle = '#7a4a2a'; // warna sogan
    ellipse(ctx, ex, ey, d * 0.95, d * 0.52, a);
    ctx.fillStyle = '#c99a62';
    ellipse(ctx, ex, ey, d * 0.55, d * 0.22, a);
  }
  ctx.fillStyle = '#4a2a16';
  ctx.beginPath();
  ctx.arc(cx, cy, d * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

// 1 tile canvas = 1 keping tegel 0,4 × 0,4 m
export function tegelBunga(width, depth) {
  const s = 256;
  const { c, ctx } = canvas(s, s);
  ctx.fillStyle = '#cfc6b6';
  ctx.fillRect(0, 0, s, s);

  // seperempat lingkaran di tiap sudut → membentuk lingkaran penuh saat 4 tegel bertemu
  ctx.fillStyle = '#3f5468';
  for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // bunga 8 kelopak di tengah
  const cx = s / 2, cy = s / 2;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    ctx.fillStyle = k % 2 ? '#5b7184' : '#3f5468';
    ellipse(ctx, cx + Math.cos(a) * 38, cy + Math.sin(a) * 38, 34, 13, a);
  }
  ctx.fillStyle = '#b08a4a';
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8a8174';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, s - 20, s - 20); // garis bingkai tipis di dalam tegel
  ctx.strokeStyle = '#6e665a';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, s, s);             // nat
  return finish(c, width / 0.4, depth / 0.4);
}

// ---------- Plafon ----------

// Anyaman bambu pola kepang: kotak-kotak bergantian arah serat. 1 tile = 0,4 × 0,4 m
export function gedek(width, depth) {
  const s = 128;
  const { c, ctx } = canvas(s, s);
  const n = 8, cell = s / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const horizontal = (i + j) % 2 === 0;
      ctx.fillStyle = horizontal ? '#d2b47a' : '#c4a466';
      ctx.fillRect(i * cell, j * cell, cell, cell);
      // garis serat bilah bambu
      ctx.strokeStyle = 'rgba(110, 80, 40, 0.45)';
      ctx.lineWidth = 1;
      for (let t = 1; t < 4; t++) {
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(i * cell, j * cell + t * cell / 4);
          ctx.lineTo((i + 1) * cell, j * cell + t * cell / 4);
        } else {
          ctx.moveTo(i * cell + t * cell / 4, j * cell);
          ctx.lineTo(i * cell + t * cell / 4, (j + 1) * cell);
        }
        ctx.stroke();
      }
    }
  }
  return finish(c, width / 0.4, depth / 0.4);
}

// Papan kayu jati memanjang, lebar papan 0,2 m. 1 tile = 1 × 1 m
export function papanKayu(width, depth) {
  const s = 256;
  const { c, ctx } = canvas(s, s);
  const tones = ['#9a7048', '#8e6640', '#a2774e', '#946b44', '#8a6240'];
  const n = 5, bw = s / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = tones[i];
    ctx.fillRect(i * bw, 0, bw, s);
    ctx.fillStyle = '#5a3c24';
    ctx.fillRect(i * bw, 0, 2, s); // celah antar papan
  }
  return finish(c, width, depth);
}

// ---------- Dinding ----------

// Pita batik parang. 1 tile = panjang 1 m × tinggi pita penuh
export function parang(length) {
  const w = 512, h = 128;
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = '#ecdcb8';
  ctx.fillRect(0, 0, w, h);

  // Bilah-bilah diagonal: tiap bilah jajaran genjang miring 45° dengan garis isen di tengah
  const step = 64, band = 30, top = 14, bottom = h - 14;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, w, bottom - top);
  ctx.clip();
  for (let x = -h; x < w + h; x += step) {
    ctx.fillStyle = '#6b3f22';
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x + band, bottom);
    ctx.lineTo(x + band + (bottom - top), top);
    ctx.lineTo(x + (bottom - top), top);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9b47a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + band / 2, bottom);
    ctx.lineTo(x + band / 2 + (bottom - top), top);
    ctx.stroke();
    // titik-titik (mlinjon) di sela bilah
    ctx.fillStyle = '#9a6a3c';
    ctx.beginPath();
    ctx.arc(x + band + 17 + (bottom - top) / 2, h / 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // garis tepi atas & bawah pita
  ctx.fillStyle = '#4a2a16';
  ctx.fillRect(0, 0, w, top - 4);
  ctx.fillRect(0, bottom + 4, w, h - bottom - 4);
  return finish(c, length, 1);
}

// Lambrisering: papan vertikal lebar 0,25 m + list atas. 1 tile = panjang 1 m × tinggi panel penuh
export function lambris(length) {
  const w = 256, h = 256;
  const { c, ctx } = canvas(w, h);
  const tones = ['#6a4429', '#62402a', '#704a2e', '#664328'];
  const n = 4, bw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = tones[i];
    ctx.fillRect(i * bw, 0, bw, h);
    // panel timbul di tiap papan
    ctx.fillStyle = 'rgba(255, 220, 170, 0.08)';
    ctx.fillRect(i * bw + 10, 30, bw - 20, h - 60);
    ctx.fillStyle = '#3e2615';
    ctx.fillRect(i * bw, 0, 3, h); // alur antar papan
  }
  return finish(c, length, 1);
}

// ---------- Helper ----------

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d') };
}

function ellipse(ctx, x, y, rx, ry, rotation) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

function finish(c, rx, ry) {
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(rx, ry);
  texture.anisotropy = 8;
  return texture;
}
