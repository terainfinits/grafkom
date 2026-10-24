/**
 * PauseMenu — menu jeda (Esc): panduan kontrol, progress, Lanjut & Mulai ulang.
 * Ini satu-satunya tempat panduan kontrol selain dari petugas loket
 * (HUD permanen sengaja tidak dipakai supaya layar bersih).
 *
 * Pemakaian:
 *   const menu = new PauseMenu({
 *     getStatus: () => ({ hasTicket, explored, total }),
 *     onResume: () => { ... },
 *     onRestart: () => { ... },
 *   });
 *   menu.open(); menu.close(); menu.isOpen;
 *
 * Membuka/menutup lewat Esc diatur di main.js, karena Esc juga dipakai dialog
 * (dan nanti mode inspect) — main.js yang tahu prioritasnya.
 */

// Daftar kontrol: [tombol (HTML), keterangan]
const CONTROLS = [
  ['<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / panah', 'Berjalan'],
  ['<kbd>Shift</kbd>', 'Berlari (tahan)'],
  ['<kbd>Spasi</kbd>', 'Melompat'],
  ['Tahan klik kiri + geser', 'Menoleh'],
  ['<kbd>E</kbd>', 'Bicara / berinteraksi'],
  ['<kbd>Esc</kbd>', 'Menu jeda / tutup dialog'],
];

export class PauseMenu {
  constructor({ getStatus, onResume, onRestart }) {
    this.getStatus = getStatus;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.isOpen = false;

    // Latar gelap menutupi canvas → klik/drag tidak sampai ke kontrol jalan
    this.overlay = el('div', 'pause-overlay');
    this.overlay.hidden = true;

    const panel = el('div', 'pause-menu');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'pause-title');

    const title = el('h2', 'pause-title');
    title.id = 'pause-title';
    title.textContent = 'Jeda';

    // ---------- Kontrol ----------
    const controlsHeading = el('div', 'pause-heading');
    controlsHeading.textContent = 'Kontrol';
    const list = el('dl', 'pause-controls');
    for (const [keys, desc] of CONTROLS) {
      const dt = el('dt');
      dt.innerHTML = keys;
      const dd = el('dd');
      dd.textContent = desc;
      list.append(dt, dd);
    }

    // ---------- Progress (diisi ulang tiap menu dibuka) ----------
    const progressHeading = el('div', 'pause-heading');
    progressHeading.textContent = 'Progress';
    this.progressEl = el('div', 'pause-progress');

    // ---------- Tombol ----------
    const actions = el('div', 'pause-actions');
    this.restartBtn = button('Mulai ulang', 'dialog-btn');
    this.restartBtn.addEventListener('click', () => this._onRestartClick());
    const resumeBtn = button('Lanjut', 'dialog-btn is-primary');
    resumeBtn.addEventListener('click', () => this.close());
    actions.append(this.restartBtn, resumeBtn);

    panel.append(title, controlsHeading, list, progressHeading, this.progressEl, actions);
    this.overlay.append(panel);
    document.body.append(this.overlay);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._resetRestartBtn();
    this._renderProgress();
    this.overlay.hidden = false;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.hidden = true;
    this.onResume?.();
  }

  _renderProgress() {
    const { hasTicket, explored = 0, total = 0 } = this.getStatus();
    const ticket = hasTicket ? 'sudah dibeli' : 'belum dibeli — temui petugas loket';
    // total = 0 berarti artifact belum dipasang di museum
    const artifacts = total > 0 ? `${explored} / ${total}` : 'belum tersedia';
    this.progressEl.innerHTML =
      `<div><span>Tiket</span><strong>${ticket}</strong></div>` +
      `<div><span>Artifact dijelajahi</span><strong>${artifacts}</strong></div>`;
  }

  // Mulai ulang perlu klik dua kali, supaya progress tidak hilang karena salah klik
  _onRestartClick() {
    if (this._confirmRestart) {
      this.onRestart?.();
      return;
    }
    this._confirmRestart = true;
    this.restartBtn.textContent = 'Yakin? Klik lagi';
    this.restartBtn.classList.add('is-danger');
  }

  _resetRestartBtn() {
    this._confirmRestart = false;
    this.restartBtn.textContent = 'Mulai ulang';
    this.restartBtn.classList.remove('is-danger');
  }
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function button(label, className) {
  const btn = el('button', className);
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('mousedown', (e) => e.preventDefault()); // jangan ambil fokus (sama seperti dialog)
  return btn;
}
