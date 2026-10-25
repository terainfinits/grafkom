/**
 * PauseMenu — menu jeda (Esc): panduan kontrol, quest, daftar ruang, Lanjut & Mulai ulang.
 * Ini satu-satunya tempat panduan kontrol selain dari petugas loket
 * (HUD permanen sengaja tidak dipakai supaya layar bersih).
 *
 * Pemakaian:
 *   const menu = new PauseMenu({
 *     getStatus: () => ({ quests: progress.quests, rooms: [{ title, visited }] }),
 *     onResume: () => { ... },
 *     onRestart: () => { ... },
 *     music,              // (opsional) audio/music.js → bagian Musik: lagu, volume, mute
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
  constructor({ getStatus, onResume, onRestart, music }) {
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

    // ---------- Quest & ruang (diisi ulang tiap menu dibuka) ----------
    const questHeading = el('div', 'pause-heading');
    questHeading.textContent = 'Quest';
    this.questsEl = el('ul', 'pause-quests');
    const roomHeading = el('div', 'pause-heading');
    roomHeading.textContent = 'Ruang';
    this.roomsEl = el('div', 'pause-rooms');

    // ---------- Musik ----------
    const musicParts = music ? this._buildMusic(music) : [];

    // ---------- Tombol ----------
    const actions = el('div', 'pause-actions');
    this.restartBtn = button('Mulai ulang', 'dialog-btn');
    this.restartBtn.addEventListener('click', () => this._onRestartClick());
    const resumeBtn = button('Lanjut', 'dialog-btn is-primary');
    resumeBtn.addEventListener('click', () => this.close());
    actions.append(this.restartBtn, resumeBtn);

    panel.append(title, controlsHeading, list, questHeading, this.questsEl, roomHeading, this.roomsEl, ...musicParts, actions);
    this.overlay.append(panel);
    document.body.append(this.overlay);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._resetRestartBtn();
    this._renderStatus();
    this.overlay.hidden = false;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.hidden = true;
    this.onResume?.();
  }

  _buildMusic(music) {
    this.music = music;
    const heading = el('div', 'pause-heading');
    heading.textContent = 'Musik';
    this.trackEl = el('div', 'pause-track');
    const row = el('div', 'pause-music');
    this.muteBtn = button('', 'dialog-btn');
    this.muteBtn.addEventListener('click', () => {
      music.muted = !music.muted;
      this._renderMusic();
    });
    this.volumeEl = el('input', 'pause-volume');
    Object.assign(this.volumeEl, { type: 'range', min: 0, max: 100, step: 5 });
    this.volumeEl.setAttribute('aria-label', 'Volume musik');
    this.volumeEl.addEventListener('input', () => {
      music.volume = this.volumeEl.value / 100;
      if (music.muted) music.muted = false; // menggeser volume = ingin mendengar
      this._renderMusic();
    });
    row.append(this.muteBtn, this.volumeEl);
    // Lagu bisa berganti saat menu sedang terbuka → perbarui labelnya
    const prev = music.onTrackChange;
    music.onTrackChange = (track) => {
      prev?.(track);
      if (this.isOpen) this._renderMusic();
    };
    const credit = el('div', 'pause-credit');
    credit.textContent = `Musik: ${music.credit}`;
    return [heading, this.trackEl, row, credit];
  }

  _renderMusic() {
    if (!this.music) return;
    const track = this.music.current;
    this.trackEl.textContent = track ? `♪ ${track.judul}` : 'Mulai diputar saat pintu museum terbuka';
    this.muteBtn.textContent = this.music.muted ? 'Nyalakan' : 'Bisukan';
    this.volumeEl.value = Math.round(this.music.volume * 100);
  }

  _renderStatus() {
    this._renderMusic();
    const { quests, rooms } = this.getStatus();
    const marks = { done: '✓', active: '▸', pending: '·', locked: '—' };

    this.questsEl.replaceChildren(...quests.map((q) => {
      const li = el('li', `is-${q.status}`);
      const mark = el('span', 'q-mark');
      mark.textContent = marks[q.status];
      const label = el('span');
      label.textContent = q.status === 'locked' ? `${q.label} (segera hadir)`
        : q.optional ? `${q.label} (opsional)` : q.label;
      li.append(mark, label);
      if (q.total && q.status !== 'locked') {
        const count = el('span', 'q-count');
        count.textContent = `${q.count}/${q.total}`;
        li.append(count);
      }
      return li;
    }));

    // Ruang yang belum dikunjungi disamarkan "???" supaya ada kejutan saat menemukannya
    this.roomsEl.replaceChildren(...rooms.map((r) => {
      const item = el('div', r.visited ? 'is-visited' : 'is-unknown');
      item.textContent = r.visited ? r.title : '???';
      return item;
    }));
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
