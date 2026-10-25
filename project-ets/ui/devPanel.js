/**
 * DevPanel — mode developer untuk menguji akhir permainan tanpa bermain dari awal.
 * Muncul/hilang bersama overlay performa (tombol ` / backtick), tepat di bawahnya.
 *
 *  Selesaikan semua : tiket, semua ruang, & semua koleksi langsung tercatat → layar selesai
 *  Sisakan 1 koleksi: sama, kecuali satu koleksi → uji pemicu layar selesai yang sebenarnya
 *                     (periksa koleksi terakhir itu secara normal)
 *
 * Pemakaian:
 *   new DevPanel({ onCompleteAll: () => { ... }, onLeaveOne: () => { ... } });
 *
 * Logika permainannya ada di main.js; panel ini hanya tombol.
 */
export class DevPanel {
  constructor({ onCompleteAll, onLeaveOne }) {
    this.el = document.createElement('div');
    this.el.className = 'dev-panel';
    this.el.hidden = true;

    const title = document.createElement('div');
    title.className = 'dev-title';
    title.textContent = 'Developer mode';
    this.el.append(
      title,
      button('Selesaikan semua', onCompleteAll),
      button('Sisakan 1 koleksi', onLeaveOne),
    );
    document.body.append(this.el);

    // Sama dengan PerfOverlay, jadi keduanya selalu tampil/hilang bersamaan
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && !e.repeat) this.el.hidden = !this.el.hidden;
    });
  }
}

function button(label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dialog-btn';
  btn.textContent = label;
  btn.addEventListener('mousedown', (e) => e.preventDefault()); // jangan ambil fokus (Spasi tidak memicu ulang)
  btn.addEventListener('click', onClick);
  return btn;
}
