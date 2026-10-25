/**
 * SecretViewer — layar easter egg: "asal-usul" semesta kecil museum ini, yaitu screenshot
 * lembar tugas Project ETS yang membuatnya ada. Dibuka dari prasasti rahasia di taman
 * (scene/secretStone.js) setelah semua quest selesai.
 *
 * Gambar dimuat dari IMAGE saat layar dibuka (bukan di layar loading — hampir tidak ada
 * pemain yang sampai ke sini). Kalau filenya belum ada, ditampilkan petunjuk tempat file
 * harus diletakkan, bukan gambar rusak.
 *
 * Pemakaian:
 *   const viewer = new SecretViewer({ onClose: () => { ... } });
 *   viewer.open(); viewer.close(); viewer.isOpen;   // Esc diatur di main.js
 */
const IMAGE = 'assets/easter-egg/tugas.png';

export class SecretViewer {
  constructor({ onClose }) {
    this.onClose = onClose;
    this.isOpen = false;

    this.overlay = el('div', 'pause-overlay secret-overlay');
    this.overlay.hidden = true;
    const panel = el('div', 'pause-menu secret');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'secret-title');

    const kicker = el('div', 'completion-kicker');
    kicker.textContent = 'Rahasia ditemukan';
    const title = el('h2', 'completion-title');
    title.id = 'secret-title';
    title.textContent = 'Asal-usul Alam Semesta';
    const subtitle = el('p', 'secret-subtitle');
    subtitle.textContent = 'Mengapa museum ini ada?';

    this.figure = el('div', 'secret-figure');
    const caption = el('p', 'completion-text');
    caption.textContent = 'Setiap semesta punya asal-usulnya. Semesta kecil ini lahir dari selembar tugas: '
      + 'Project ETS Grafika Komputer. Dari sinilah gedung joglo, koleksi, dan petugas loketnya berawal. '
      + 'Terima kasih sudah menjelajah sampai sejauh ini.';

    const actions = el('div', 'pause-actions');
    const closeBtn = el('button', 'dialog-btn is-primary');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Tutup';
    closeBtn.addEventListener('mousedown', (e) => e.preventDefault()); // jangan ambil fokus
    closeBtn.addEventListener('click', () => this.close());
    actions.append(closeBtn);

    panel.append(kicker, title, subtitle, this.figure, caption, actions);
    this.overlay.append(panel);
    document.body.append(this.overlay);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this._loadImage();
    this.overlay.hidden = false;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.hidden = true;
    this.onClose?.();
  }

  _loadImage() {
    if (this.figure.childElementCount) return; // sudah dimuat sebelumnya
    const img = el('img', 'secret-image');
    img.alt = 'Lembar tugas Project ETS Grafika Komputer';
    img.addEventListener('error', () => {
      const note = el('div', 'secret-missing');
      note.textContent = `Gambar belum dipasang — letakkan screenshot tugas di ${IMAGE}`;
      img.replaceWith(note);
    });
    img.src = IMAGE;
    this.figure.append(img);
  }
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
