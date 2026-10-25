/**
 * CompletionScreen — layar selesai, muncul sekali saat semua ruang sudah dikunjungi dan
 * semua koleksi sudah diperiksa. Berisi ringkasan kunjungan, ucapan penutup, dan dua
 * pilihan: lanjut menjelajah (museum tetap bisa dikelilingi) atau mulai ulang.
 *
 * Pemakaian:
 *   const done = new CompletionScreen({ onContinue: () => { ... }, onRestart: () => { ... } });
 *   done.open({ rooms: [8, 8], artifacts: [15, 15], elapsedMs: 754000 });
 *   done.close(); done.isOpen;
 *
 * Tampilannya memakai gaya menu jeda (.pause-overlay / .pause-menu) ditambah sedikit
 * gaya khusus, supaya seluruh UI terasa satu keluarga.
 */
export class CompletionScreen {
  constructor({ onContinue, onRestart }) {
    this.onContinue = onContinue;
    this.onRestart = onRestart;
    this.isOpen = false;

    this.overlay = el('div', 'pause-overlay completion-overlay');
    this.overlay.hidden = true;

    const panel = el('div', 'pause-menu completion');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'completion-title');

    const kicker = el('div', 'completion-kicker');
    kicker.textContent = 'Kunjungan selesai';
    const title = el('h2', 'completion-title');
    title.id = 'completion-title';
    title.textContent = 'Terima kasih telah berkunjung';
    const rule = el('div', 'room-banner-rule');

    // Angka ringkasan diisi saat open(), karena baru diketahui di akhir kunjungan
    this.statsEl = el('dl', 'completion-stats');

    const text = el('p', 'completion-text');
    text.textContent = 'Kamu sudah menjelajahi seluruh ruang dan memeriksa semua koleksi. '
      + 'Semoga kunjungan ini membuatmu makin mengenal kekayaan budaya Nusantara, '
      + 'dari pusaka, wastra, hingga alat musik tradisionalnya.';

    const actions = el('div', 'pause-actions');
    this.restartBtn = button('Mulai ulang', 'dialog-btn');
    this.restartBtn.addEventListener('click', () => this.onRestart?.());
    const continueBtn = button('Lanjut menjelajah', 'dialog-btn is-primary');
    continueBtn.addEventListener('click', () => this.close());
    actions.append(this.restartBtn, continueBtn);

    panel.append(kicker, title, rule, this.statsEl, text, actions);
    this.overlay.append(panel);
    document.body.append(this.overlay);
  }

  open({ rooms, artifacts, elapsedMs }) {
    if (this.isOpen) return;
    this.isOpen = true;
    const stats = [
      ['Ruang dijelajahi', `${rooms[0]}/${rooms[1]}`],
      ['Koleksi diperiksa', `${artifacts[0]}/${artifacts[1]}`],
      ['Lama kunjungan', formatDuration(elapsedMs)],
    ];
    this.statsEl.replaceChildren(...stats.flatMap(([label, value]) => {
      const dt = el('dt');
      dt.textContent = label;
      const dd = el('dd');
      dd.textContent = value;
      return [dt, dd];
    }));
    this.overlay.hidden = false;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.hidden = true;
    this.onContinue?.();
  }
}

// 754000 ms → "12 menit 34 detik"
function formatDuration(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} menit ${s} detik` : `${s} detik`;
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
