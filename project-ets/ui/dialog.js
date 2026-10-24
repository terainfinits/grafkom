/**
 * Dialog — kotak percakapan NPC + prompt interaksi + toast.
 * Elemen HTML dibuat otomatis di sini, jadi index.html tidak perlu diubah.
 *
 * Pemakaian:
 *   dialog.open({
 *     name: 'Petugas Loket',
 *     pages: [
 *       { text: 'Halo!' },                                   // tombol default: Lanjut / Tutup
 *       { text: 'Beli?', actions: [{ label: 'Ya', onClick }] } // tombol kustom
 *     ],
 *     onClose: () => { ... },
 *   });
 *
 * Keyboard saat dialog terbuka: Enter / Spasi / E = tombol pertama, Esc = tutup.
 */
export class Dialog {
  constructor() {
    // Prompt "E  Bicara dengan ..."
    this.prompt = el('div', 'interact-prompt');
    this.prompt.innerHTML = '<kbd>E</kbd> <span></span>';
    this.promptText = this.prompt.querySelector('span');
    this.prompt.hidden = true;

    // Kotak dialog
    this.box = el('div', 'dialog');
    this.box.setAttribute('role', 'dialog');
    this.box.setAttribute('aria-live', 'polite');
    this.nameEl = el('div', 'dialog-name');
    this.textEl = el('div', 'dialog-text');
    this.actionsEl = el('div', 'dialog-actions');
    this.box.append(this.nameEl, this.textEl, this.actionsEl);
    this.box.hidden = true;

    // Notifikasi singkat
    this.toastEl = el('div', 'toast');
    this.toastEl.hidden = true;

    document.body.append(this.prompt, this.box, this.toastEl);

    this.isOpen = false;
    this.pages = [];
    this.index = 0;
    this.onClose = null;
    this.currentActions = [];

    window.addEventListener('keydown', (e) => this._onKey(e));
  }

  showPrompt(text) {
    this.promptText.textContent = text;
    this.prompt.hidden = false;
  }

  hidePrompt() {
    this.prompt.hidden = true;
  }

  open({ name, pages, onClose = null }) {
    this.nameEl.textContent = name;
    this.pages = pages;
    this.index = 0;
    this.onClose = onClose;
    this.isOpen = true;
    this.box.hidden = false;
    this.hidePrompt();
    this._render();
  }

  next() {
    if (this.index < this.pages.length - 1) {
      this.index++;
      this._render();
    } else {
      this.close();
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.box.hidden = true;
    const callback = this.onClose;
    this.onClose = null;
    if (callback) callback();
  }

  toast(text, duration = 3000) {
    this.toastEl.textContent = text;
    this.toastEl.hidden = false;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (this.toastEl.hidden = true), duration);
  }

  _render() {
    const page = this.pages[this.index];
    const isLast = this.index === this.pages.length - 1;
    this.textEl.innerHTML = page.text;

    this.currentActions = page.actions ?? [
      { label: isLast ? 'Tutup' : 'Lanjut ▸', onClick: () => this.next() },
    ];

    this.actionsEl.replaceChildren(
      ...this.currentActions.map((action, i) => {
        const btn = el('button', i === 0 ? 'dialog-btn is-primary' : 'dialog-btn');
        btn.type = 'button';
        btn.textContent = action.label;
        btn.addEventListener('mousedown', (e) => e.preventDefault()); // jangan ambil fokus (hindari Spasi dobel)
        btn.addEventListener('click', action.onClick);
        return btn;
      })
    );

    // penanda halaman, mis. "2 / 5"
    if (this.pages.length > 1) {
      const counter = el('span', 'dialog-counter');
      counter.textContent = `${this.index + 1} / ${this.pages.length}`;
      this.actionsEl.prepend(counter);
    }
  }

  _onKey(e) {
    if (!this.isOpen) return;
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
      e.preventDefault(); // tandai sudah ditangani, supaya tidak memicu aksi lain
      if (!e.repeat) this.currentActions[0].onClick();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}