/**
 * InspectPanel — panel info artefak di sisi kanan layar selama mode inspect.
 * Berisi nama, asal, periode, bahan, deskripsi, sumber, petunjuk kontrol, dan
 * bilah "mengamati" yang terisi sampai artefak tercatat sudah diperiksa.
 */
export class InspectPanel {
  constructor({ onBack }) {
    this.el = document.createElement('aside');
    this.el.className = 'inspect-panel';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="inspect-kicker">Koleksi</div>
      <h2 class="inspect-title"></h2>
      <dl class="inspect-meta"></dl>
      <p class="inspect-text"></p>
      <div class="inspect-sources"></div>
      <div class="inspect-progress"><div class="inspect-bar"><span></span></div><div class="inspect-status"></div></div>
      <div class="inspect-hint">Seret untuk memutar · scroll untuk zoom</div>
      <button type="button" class="dialog-btn is-primary inspect-back">Kembali (Esc)</button>`;
    document.body.append(this.el);

    this.titleEl = this.el.querySelector('.inspect-title');
    this.metaEl = this.el.querySelector('.inspect-meta');
    this.textEl = this.el.querySelector('.inspect-text');
    this.sourcesEl = this.el.querySelector('.inspect-sources');
    this.barEl = this.el.querySelector('.inspect-bar span');
    this.statusEl = this.el.querySelector('.inspect-status');
    const back = this.el.querySelector('.inspect-back');
    back.addEventListener('mousedown', (e) => e.preventDefault()); // jangan ambil fokus
    back.addEventListener('click', onBack);
  }

  show(data, alreadyExplored) {
    this.titleEl.textContent = data.nama;
    this.metaEl.replaceChildren(...[['Asal', data.asal], ['Periode', data.periode], ['Bahan', data.bahan]]
      .filter(([, v]) => v)
      .flatMap(([k, v]) => {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        return [dt, dd];
      }));
    this.textEl.textContent = data.deskripsi;
    this.sourcesEl.replaceChildren();
    if (data.sumber?.length) {
      this.sourcesEl.append('Sumber: ');
      data.sumber.forEach((url, i) => {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `[${i + 1}]`;
        this.sourcesEl.append(a, ' ');
      });
    }
    // Model dari pihak lain (mis. CC BY): nama pembuat & lisensi wajib dicantumkan
    if (data.kreditModel) {
      const { judul, pembuat, lisensi, url } = data.kreditModel;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = `"${judul}"`;
      const line = document.createElement('div');
      line.append('Model 3D: ', a, ` oleh ${pembuat} · ${lisensi}`);
      this.sourcesEl.append(line);
    }
    this.setProgress(alreadyExplored ? 1 : 0, alreadyExplored);
    this.el.hidden = false;
  }

  setProgress(fraction, done) {
    this.barEl.style.width = `${Math.min(1, fraction) * 100}%`;
    this.statusEl.textContent = done ? '✓ Tercatat sudah diperiksa' : 'Mengamati…';
    this.el.classList.toggle('is-explored', done);
  }

  hide() {
    this.el.hidden = true;
  }
}
