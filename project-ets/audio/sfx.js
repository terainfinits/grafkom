/**
 * Sfx — efek suara pendek (blip dialog, koin, langkah kaki) lewat Web Audio API.
 *
 * Kenapa Web Audio, bukan <audio> seperti musik: efek suara diputar sering & bisa bertumpuk
 * (langkah beruntun), harus tanpa jeda, dan nadanya (playbackRate) perlu sedikit diacak
 * supaya tidak terdengar monoton. File kecil (± 5 KB) jadi semuanya dimuat & di-decode di
 * balik layar loading (load), lalu tinggal diputar dari memori.
 *
 * Aturan autoplay browser: AudioContext baru boleh berbunyi setelah interaksi pengguna,
 * jadi context dilanjutkan (resume) pada klik / tombol pertama.
 *
 * Pemakaian:
 *   const sfx = new Sfx();
 *   await sfx.load();                       // sebelum layar loading hilang
 *   sfx.play('coin');
 *   sfx.play('step-kayu', { volume: 0.4, rate: 1.1 }); // nama tanpa nomor → variasi acak
 *   sfx.muted = true;
 */
const DIR = 'assets/audio/sfx/';
// nama → jumlah variasi (file <nama>-1.mp3 … <nama>-n.mp3); 0 = satu file <nama>.mp3
const SOUNDS = {
  blip: 0,
  coin: 0,
  'step-rumput': 2,
  'step-kayu': 4,
  'step-lantai': 4,
  'quiz-answer': 0,
  completion: 0,
};
const MASTER = 0.8;
const STORAGE_KEY = 'museum-sfx';

export class Sfx {
  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.buffers = {}; // nama → [AudioBuffer, ...]
    this._last = {};   // nama → indeks variasi terakhir (supaya tidak berulang dua kali berturut-turut)

    this._muted = load().muted ?? false;
    this._applyGain();

    const resume = () => {
      if (this.ctx.state === 'suspended') this.ctx.resume();
    };
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
  }

  async load() {
    const jobs = [];
    for (const [name, count] of Object.entries(SOUNDS)) {
      const files = count === 0 ? [`${name}.mp3`] : Array.from({ length: count }, (_, i) => `${name}-${i + 1}.mp3`);
      jobs.push(Promise.all(files.map((f) => this._decode(DIR + f))).then((list) => {
        this.buffers[name] = list.filter(Boolean);
      }));
    }
    await Promise.all(jobs);
  }

  // Efek suara bersifat pelengkap: file yang gagal dimuat (server sibuk, file hilang) dicoba
  // sekali lagi, lalu dilewati dengan peringatan — museum tetap bisa dimainkan tanpa suara itu.
  async _decode(url, retry = true) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await this.ctx.decodeAudioData(await res.arrayBuffer());
    } catch (err) {
      if (retry) return this._decode(url, false);
      console.warn(`Efek suara gagal dimuat: ${url}`, err);
      return null;
    }
  }

  // volume: 0–1 (dikali MASTER), rate: kecepatan putar (1 = asli; > 1 lebih tinggi & cepat)
  play(name, { volume = 1, rate = 1 } = {}) {
    const list = this.buffers[name];
    if (!list?.length || this._muted || this.ctx.state !== 'running') return;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this._last[name]) i = (i + 1) % list.length;
    this._last[name] = i;

    const src = this.ctx.createBufferSource();
    src.buffer = list[i];
    src.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.master);
    src.start();
  }

  get muted() { return this._muted; }
  set muted(m) {
    this._muted = m;
    this._applyGain();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: m }));
    } catch {
      // tidak apa-apa, pengaturan hanya tidak diingat
    }
  }

  _applyGain() {
    this.master.gain.value = this._muted ? 0 : MASTER;
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}
