/**
 * Banner — pesan tidak memblokir untuk pelacak ruangan (pemain tetap bisa berjalan).
 *
 *  showRoom(info)            : banner besar saat ruang PERTAMA kali dimasuki
 *                              (judul, subjudul, penjelasan singkat)
 *  showLabel(title)          : label nama ruang kecil saat ruang dimasuki lagi
 *  achievement(title, detail): kartu achievement di pojok kanan bawah
 *
 * Elemen HTML dibuat di sini (seperti dialog.js), jadi index.html tidak perlu diubah.
 * Muncul/hilang memakai class `is-visible` + transisi CSS supaya memudar halus.
 */
const ROOM_MS = 5500;
const LABEL_MS = 1600;
const ACHIEVEMENT_MS = 4000;

export class Banner {
  constructor() {
    this.room = el('div', 'room-banner');
    this.room.setAttribute('aria-live', 'polite');
    this.label = el('div', 'room-label');
    this.award = el('div', 'achievement');
    this.award.setAttribute('aria-live', 'polite');
    document.body.append(this.room, this.label, this.award);
    this._timers = new Map();
  }

  showRoom(info) {
    this._hide(this.label); // banner besar menggantikan label kecil yang mungkin masih tampil
    this.room.innerHTML = `
      <div class="room-banner-kicker">Ruang baru ditemukan</div>
      <div class="room-banner-title"></div>
      <div class="room-banner-subtitle"></div>
      <div class="room-banner-rule"></div>
      <div class="room-banner-text"></div>`;
    // textContent (bukan innerHTML) untuk isi dari data, supaya aman dari karakter HTML
    this.room.querySelector('.room-banner-title').textContent = info.title;
    this.room.querySelector('.room-banner-subtitle').textContent = info.subtitle;
    this.room.querySelector('.room-banner-text').textContent = info.description;
    this._show(this.room, ROOM_MS);
  }

  showLabel(title) {
    if (this.room.classList.contains('is-visible')) return; // jangan tumpuk dengan banner besar
    this.label.textContent = title;
    this._show(this.label, LABEL_MS);
  }

  achievement(title, detail) {
    this.award.innerHTML = '<div class="achievement-kicker">Achievement</div><div class="achievement-title"></div><div class="achievement-detail"></div>';
    this.award.querySelector('.achievement-title').textContent = title;
    this.award.querySelector('.achievement-detail').textContent = detail;
    this._show(this.award, ACHIEVEMENT_MS);
  }

  _show(node, ms) {
    clearTimeout(this._timers.get(node));
    node.classList.add('is-visible');
    this._timers.set(node, setTimeout(() => this._hide(node), ms));
  }

  _hide(node) {
    clearTimeout(this._timers.get(node));
    node.classList.remove('is-visible');
  }
}

function el(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}
