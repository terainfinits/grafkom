import { MAP_BOUNDS, LAND } from '../data/mapIndonesia.js';

/**
 * MapQuiz — mini game ala GeoGuessr: tebak asal koleksi dengan mengeklik peta Indonesia.
 * Muncul saat koleksi bertanda `kuis: true` (data/artifacts.js) pertama kali diperiksa.
 *
 * Kuis tampil sebagai panel samping (seperti panel info inspect), sementara kamera sudah
 * dalam mode inspect: artefak bisa diputar & di-zoom selama menebak, jadi tebakan bisa
 * berdasar nama & ciri khas bendanya (educated guess), bukan tebakan buta. Panel info yang
 * memuat asal koleksi baru ditampilkan setelah menebak.
 *
 * Alur: klik peta (penanda tebakan, bisa dipindah) → "Tebak" → lokasi asli + garis jarak +
 * skor → "Lanjut periksa koleksi" → onDone(skor) → main.js mengganti panel ini dengan panel info.
 *
 * Peta bisa di-zoom (scroll / tombol + −, berpusat di kursor) & digeser (seret). Label
 * bertingkat: pulau besar selalu tampil, pulau kecil & wilayah mulai zoom 2×, kota mulai 3×.
 * Daratan digambar ulang dari data vektor tiap kali tampilan berubah, jadi tetap tajam.
 *
 * Skor: jarak dihitung dengan rumus haversine (jarak lingkaran besar di permukaan bumi),
 * lalu skor = 5000 × e^(−jarak / 500 km). Tepat sasaran = 5000, meleset 500 km ≈ 1840,
 * meleset 1500 km ≈ 250 — menebak pulau yang benar sudah dapat skor lumayan.
 *
 * Proyeksi equirectangular (bujur → x, lintang → y), cukup akurat di sekitar khatulistiwa.
 * Koordinat "peta" = posisi pada peta utuh selebar W piksel; tampilan (zoom & geser)
 * mengubahnya ke piksel canvas: layar = (peta − pusat) × zoom + tengah canvas.
 *
 * Pemakaian:
 *   const quiz = new MapQuiz({ onAnswer: (score) => { ... } }); // onAnswer: saat tebakan dikunci (mis. bunyi)
 *   quiz.open(data, (score) => { ... });  // data: entri artefak (nama, asal, koordinat)
 *   quiz.close(); quiz.isOpen;            // Esc diatur di main.js
 */
export const MAX_SCORE = 5000;
const SCORE_KM = 500;
const W = 800;
const H = Math.round(W * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon));
const ZOOM = [1, 8];
const DRAG_PX = 5; // geser kurang dari ini = klik (menaruh tebakan), lebih = menggeser peta

// [nama, lintang, bujur, zoom minimal, kota?]
const LABELS = [
  ['Sumatera', 0.2, 101.6, 1], ['Kalimantan', 0.6, 114.2, 1], ['Jawa', -7.35, 110.2, 1],
  ['Sulawesi', -2.1, 120.4, 1], ['Papua', -4.2, 138.6, 1], ['Maluku', -2.4, 129.8, 1],
  ['Nusa Tenggara', -10.6, 118.6, 1],
  ['Aceh', 4.4, 96.9, 2], ['Nias', 1.1, 97.6, 2], ['Riau', 0.9, 104.4, 2], ['Bangka', -2.2, 106.1, 2],
  ['Belitung', -2.9, 107.9, 2], ['Madura', -6.95, 113.3, 2], ['Bali', -8.35, 115.1, 2],
  ['Lombok', -8.6, 116.3, 2], ['Sumbawa', -8.7, 117.9, 2], ['Flores', -8.6, 121.2, 2],
  ['Sumba', -9.7, 120.0, 2], ['Timor', -9.6, 124.4, 2], ['Halmahera', 0.9, 128.0, 2],
  ['Seram', -3.1, 129.6, 2], ['Buru', -3.4, 126.6, 2], ['Kep. Sangihe', 3.6, 125.5, 2],
  ['Medan', 3.6, 98.7, 3, true], ['Padang', -0.95, 100.35, 3, true], ['Palembang', -2.98, 104.75, 3, true],
  ['Jakarta', -6.2, 106.8, 3, true], ['Surabaya', -7.25, 112.75, 3, true], ['Pontianak', -0.03, 109.33, 3, true],
  ['Banjarmasin', -3.32, 114.59, 3, true], ['Makassar', -5.15, 119.43, 3, true], ['Manado', 1.49, 124.84, 3, true],
  ['Ambon', -3.7, 128.18, 3, true], ['Kupang', -10.18, 123.6, 3, true], ['Rote', -10.75, 123.1, 3, true],
  ['Jayapura', -2.53, 140.72, 3, true],
];

export class MapQuiz {
  constructor({ onAnswer } = {}) {
    this.onAnswer = onAnswer;
    this.isOpen = false;

    // Panel samping, bukan overlay layar penuh: sisi kiri layar tetap bisa diseret untuk memutar artefak
    const panel = el('aside', 'quiz-panel');
    panel.hidden = true;
    this.el = panel; // lebarnya dipakai main.js untuk menggeser pusat pandangan inspect

    const kicker = el('div', 'completion-kicker');
    kicker.textContent = 'Kuis · tebak asal koleksi';
    this.titleEl = el('h2', 'quiz-title');
    this.hintEl = el('p', 'quiz-hint');

    // Resolusi canvas mengikuti devicePixelRatio supaya teks label tajam di layar retina
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas = el('canvas', 'quiz-map');
    this.canvas.width = W * this.dpr;
    this.canvas.height = H * this.dpr;
    this.ctx = this.canvas.getContext('2d');
    this._bindMapInput();

    // Tombol zoom di pojok peta
    const mapWrap = el('div', 'quiz-map-wrap');
    const zoomBar = el('div', 'quiz-zoom');
    zoomBar.append(
      button('+', 'Perbesar', () => this._zoomAt(W / 2, H / 2, 1.6)),
      button('−', 'Perkecil', () => this._zoomAt(W / 2, H / 2, 1 / 1.6)),
      button('⟲', 'Tampilkan seluruh peta', () => this._resetView()),
    );
    mapWrap.append(this.canvas, zoomBar);

    this.resultEl = el('div', 'quiz-result');
    const actions = el('div', 'pause-actions');
    this.button = button('', '', () => this._onButton());
    this.button.className = 'dialog-btn is-primary';
    actions.append(this.button);

    const controlsHint = el('div', 'inspect-hint');
    controlsHint.textContent = 'Peta: scroll untuk zoom, seret untuk geser · Artefak: seret untuk memutar · Esc untuk batal';

    panel.append(kicker, this.titleEl, this.hintEl, mapWrap, this.resultEl, actions, controlsHint);
    document.body.append(panel);
  }

  open(data, onDone) {
    this.data = data;
    this.onDone = onDone;
    this.guess = null;   // [lintang, bujur] tebakan pemain
    this.answered = false;
    this.score = 0;
    this.titleEl.textContent = data.nama;
    this.hintEl.textContent = 'Amati bentuk & cirinya, lalu klik peta di tempat yang kamu kira menjadi asal koleksi ini.';
    this.resultEl.replaceChildren();
    this.button.textContent = 'Tebak';
    this.button.disabled = true;
    this._resetView();
    this.isOpen = true;
    this.el.hidden = false;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.hidden = true;
  }

  // ---------- Tampilan: zoom & geser ----------

  _resetView() {
    this.zoom = 1;
    this.cx = W / 2; // pusat tampilan, dalam koordinat peta
    this.cy = H / 2;
    this._draw();
  }

  // Zoom dengan titik (sx, sy) di canvas tetap di tempatnya (seperti peta online)
  _zoomAt(sx, sy, factor) {
    const [mx, my] = this._toMap(sx, sy);
    this.zoom = clamp(this.zoom * factor, ZOOM[0], ZOOM[1]);
    this.cx = mx - (sx - W / 2) / this.zoom;
    this.cy = my - (sy - H / 2) / this.zoom;
    this._clampView();
    this._draw();
  }

  // Jangan sampai peta digeser keluar layar
  _clampView() {
    const hw = W / 2 / this.zoom, hh = H / 2 / this.zoom;
    this.cx = clamp(this.cx, hw, W - hw);
    this.cy = clamp(this.cy, hh, H - hh);
  }

  _toScreen(mx, my) {
    return [(mx - this.cx) * this.zoom + W / 2, (my - this.cy) * this.zoom + H / 2];
  }

  _toMap(sx, sy) {
    return [(sx - W / 2) / this.zoom + this.cx, (sy - H / 2) / this.zoom + this.cy];
  }

  // Posisi kursor → piksel canvas (ukuran tampil canvas berbeda dari resolusinya, CSS width: 100%)
  _eventPos(e) {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }

  _bindMapInput() {
    const c = this.canvas;
    c.addEventListener('wheel', (e) => {
      e.preventDefault(); // jangan menggulir panel
      const [sx, sy] = this._eventPos(e);
      this._zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });

    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      drag = { start: this._eventPos(e), cx: this.cx, cy: this.cy, moved: false };
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const [sx, sy] = this._eventPos(e);
      const dx = sx - drag.start[0], dy = sy - drag.start[1];
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_PX) return;
      drag.moved = true;
      c.classList.add('is-dragging');
      this.cx = drag.cx - dx / this.zoom;
      this.cy = drag.cy - dy / this.zoom;
      this._clampView();
      this._draw();
    });
    c.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const wasDrag = drag.moved;
      drag = null;
      c.classList.remove('is-dragging');
      if (!wasDrag) this._placeGuess(...this._eventPos(e));
    });
  }

  _placeGuess(sx, sy) {
    if (this.answered) return;
    this.guess = unproject(...this._toMap(sx, sy));
    this.button.disabled = false;
    this._draw();
  }

  _onButton() {
    if (!this.answered) {
      if (!this.guess) return;
      this.answered = true;
      const km = haversineKm(this.guess, this.data.koordinat);
      this.score = Math.round(MAX_SCORE * Math.exp(-km / SCORE_KM));
      this.onAnswer?.(this.score);
      this.hintEl.textContent = `Asal: ${this.data.asal}`;
      const line = el('div');
      line.innerHTML = `Jarak tebakan <strong></strong> · Skor <strong></strong> / ${MAX_SCORE.toLocaleString('id-ID')}`;
      const [kmEl, scoreEl] = line.querySelectorAll('strong');
      kmEl.textContent = `${Math.round(km).toLocaleString('id-ID')} km`;
      scoreEl.textContent = this.score.toLocaleString('id-ID');
      this.resultEl.replaceChildren(line);
      this.button.textContent = 'Lanjut periksa koleksi';
      this._draw();
    } else {
      this.close();
      this.onDone?.(this.score);
    }
  }

  // ---------- Menggambar ----------

  _draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); // selanjutnya cukup berpikir dalam piksel W × H
    ctx.fillStyle = '#1c2b33'; // laut
    ctx.fillRect(0, 0, W, H);

    // Daratan: negara tetangga dulu (redup), Indonesia terakhir (menonjol)
    for (const country of LAND_SORTED) {
      ctx.fillStyle = country.indonesia ? '#8f7a4a' : '#3a4051';
      ctx.strokeStyle = country.indonesia ? '#c39a4f' : '#4a5163';
      ctx.lineWidth = 0.8;
      for (const ring of country.rings) {
        ctx.beginPath();
        for (let i = 0; i < ring.length; i += 2) {
          const [x, y] = this._toScreen(...project(ring[i + 1], ring[i]));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    this._drawLabels();

    // Penanda & garis jarak (ukurannya tetap, tidak ikut membesar saat zoom)
    const guess = this.guess && this._toScreen(...project(...this.guess));
    const truth = this.answered && this._toScreen(...project(...this.data.koordinat));
    if (guess && truth) {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#e6e2d6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(...guess);
      ctx.lineTo(...truth);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (guess) pin(ctx, guess, '#e05a4f');
    if (truth) pin(ctx, truth, '#e8c97a');
  }

  _drawLabels() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const [name, lat, lon, minZoom, city] of LABELS) {
      if (this.zoom < minZoom) continue;
      const [x, y] = this._toScreen(...project(lat, lon));
      if (x < -40 || x > W + 40 || y < -10 || y > H + 10) continue;
      // Tingkat 1 (pulau besar) lebih besar & tebal; kota bertitik, namanya di atas titik
      ctx.font = minZoom === 1 ? '600 13px "IBM Plex Mono", monospace' : '11px "IBM Plex Mono", monospace';
      const ty = city ? y - 9 : y;
      if (city) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#e6e2d6';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(20, 24, 32, 0.85)'; // garis tepi gelap supaya terbaca di darat & laut
      ctx.lineWidth = 3;
      ctx.strokeText(name, x, ty);
      ctx.fillStyle = minZoom === 1 ? '#f3e7c8' : '#e6e2d6';
      ctx.fillText(name, x, ty);
    }
  }
}

// ---------- Peta ----------

const LAND_SORTED = [...LAND].sort((a, b) => a.indonesia - b.indonesia);

// [lintang, bujur] → koordinat peta utuh (W × H)
function project(lat, lon) {
  const { minLon, maxLon, minLat, maxLat } = MAP_BOUNDS;
  return [((lon - minLon) / (maxLon - minLon)) * W, ((maxLat - lat) / (maxLat - minLat)) * H];
}

function unproject(x, y) {
  const { minLon, maxLon, minLat, maxLat } = MAP_BOUNDS;
  return [maxLat - (y / H) * (maxLat - minLat), minLon + (x / W) * (maxLon - minLon)];
}

// Penanda bulat bertepi gelap
function pin(ctx, [x, y], color) {
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1b1f2a';
  ctx.stroke();
}

// Jarak lingkaran besar antara dua titik [lintang, bujur] (derajat) dalam km
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function button(label, title, onClick) {
  const btn = el('button', 'dialog-btn');
  btn.type = 'button';
  btn.textContent = label;
  if (title) btn.title = title;
  btn.addEventListener('mousedown', (e) => e.preventDefault()); // jangan ambil fokus
  btn.addEventListener('click', onClick);
  return btn;
}
