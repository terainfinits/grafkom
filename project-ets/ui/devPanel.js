/**
 * DevPanel — mode developer untuk menguji akhir permainan tanpa bermain dari awal.
 * Muncul/hilang bersama overlay performa (tombol ` / backtick), tepat di bawahnya.
 *
 *  Selesaikan semua : tiket, ruang, koleksi utama, kuis, & lukisan langsung tercatat
 *                     → layar selesai + achievement lukisan (nanti juga easter egg)
 *  Sisakan 1 koleksi: semua ruang & koleksi utama kecuali satu → uji pemicu layar selesai
 *                     yang sebenarnya (periksa koleksi terakhir itu secara normal)
 *  Sisakan 1 lukisan: semua lukisan kecuali satu → uji achievement lukisan (game belum selesai)
 *  Pilih lagu       : putar lagu tertentu dari playlist musik latar (audio/music.js)
 *
 * Pemakaian:
 *   new DevPanel({ onCompleteAll, onLeaveOne, onLeaveOnePainting, music });
 *
 * Logika permainannya ada di main.js; panel ini hanya tombol.
 */
export class DevPanel {
  constructor({ onCompleteAll, onLeaveOne, onLeaveOnePainting, music }) {
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
      button('Sisakan 1 lukisan', onLeaveOnePainting),
    );
    if (music) this.el.append(trackSelect(music));
    document.body.append(this.el);

    // Sama dengan PerfOverlay, jadi keduanya selalu tampil/hilang bersamaan
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && !e.repeat) this.el.hidden = !this.el.hidden;
    });
  }
}

// Dropdown lagu; ikut berganti saat lagu berikutnya diputar otomatis
function trackSelect(music) {
  const select = document.createElement('select');
  select.className = 'dev-select';
  select.setAttribute('aria-label', 'Pilih lagu');
  select.append(new Option('♪ Pilih lagu…', ''));
  music.tracks.forEach((t, i) => select.append(new Option(`${i + 1}. ${t.judul}`, i)));
  select.addEventListener('change', () => {
    if (select.value !== '') music.playTrack(Number(select.value));
    select.blur(); // kembalikan keyboard ke permainan (WASD tidak mengganti pilihan)
  });
  const prev = music.onTrackChange;
  music.onTrackChange = (track) => {
    prev?.(track);
    select.value = music.tracks.indexOf(track);
  };
  return select;
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
