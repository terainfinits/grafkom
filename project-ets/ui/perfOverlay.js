/**
 * PerfOverlay — panel kecil pengukur performa, buka/tutup dengan tombol ` (backtick).
 * Dipakai untuk membandingkan sebelum & sesudah optimasi (angka ini juga bisa masuk laporan).
 *
 *  FPS            : frame per detik (rata-rata tiap 0,5 detik)
 *  ms/frame       : waktu antar frame
 *  draw call      : berapa kali CPU menyuruh GPU menggambar dalam 1 frame (termasuk pass bayangan)
 *  segitiga       : jumlah segitiga yang digambar dalam 1 frame
 *  geometri/tekstur: yang tersimpan di memori GPU
 *  shader         : jumlah program shader yang sudah dikompilasi
 */
export class PerfOverlay {
  constructor(renderer) {
    this.renderer = renderer;
    this.el = document.createElement('div');
    this.el.className = 'perf-overlay';
    this.el.hidden = true;
    document.body.append(this.el);

    this._frames = 0;
    this._elapsed = 0;
    this._fps = 0;
    this._ms = 0;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && !e.repeat) this.el.hidden = !this.el.hidden;
    });
  }

  // Dipanggil setiap frame SETELAH renderer.render(), supaya renderer.info berisi frame ini
  update(dt) {
    this._frames++;
    this._elapsed += dt;
    if (this._elapsed < 0.5) return;
    this._fps = this._frames / this._elapsed;
    this._ms = (this._elapsed / this._frames) * 1000;
    this._frames = 0;
    this._elapsed = 0;
    if (!this.el.hidden) this._render();
  }

  _render() {
    const { render, memory, programs } = this.renderer.info;
    this.el.textContent = [
      `FPS        ${this._fps.toFixed(0)}`,
      `ms/frame   ${this._ms.toFixed(1)}`,
      `draw call  ${render.calls}`,
      `segitiga   ${render.triangles.toLocaleString('id-ID')}`,
      `geometri   ${memory.geometries}`,
      `tekstur    ${memory.textures}`,
      `shader     ${programs?.length ?? '-'}`,
    ].join('\n');
  }
}
