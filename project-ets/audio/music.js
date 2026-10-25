import { TRACKS, MUSIC_DIR, MUSIC_CREDIT } from '../data/music.js';

/**
 * Music — musik latar: playlist lagu daerah versi jazz (data/music.js).
 *
 *  - Mulai saat pintu museum terbuka (start), dengan fade-in pelan. Membeli tiket adalah
 *    interaksi pengguna, jadi aturan autoplay browser sudah terpenuhi.
 *  - Lagu pertama dipilih acak, sesudahnya berurutan & kembali ke awal setelah lagu terakhir.
 *  - Diredam (ducking) selama inspect & kuis supaya pemain bisa fokus ke koleksi.
 *  - Volume & mute bisa diatur dari menu Esc, dan diingat di localStorage.
 *
 * Satu <audio> saja: file di-stream (diputar sambil diunduh), tidak dimuat penuh di layar
 * loading. Volume akhir = volume pengguna × gain, dengan gain yang bergerak halus menuju
 * target (fade-in 0 → 1, redam 1 → DUCK) lewat update(dt) di loop utama.
 *
 * Pemakaian:
 *   const music = new Music();
 *   music.start();              // saat pintu terbuka
 *   music.ducked = true/false;  // tiap frame dari main.js
 *   music.update(dt);
 *   music.playTrack(i); music.volume = 0.5; music.muted = true;
 *   music.onTrackChange = (track) => { ... };
 */
const DUCK = 0.3;          // gain saat diredam
const FADE_IN_S = 3;       // lama fade-in saat pertama mulai
const DUCK_S = 0.6;        // lama peralihan redam ↔ normal
const DEFAULT_VOLUME = 0.2; // pelan: musik latar, bukan pusat perhatian
const STORAGE_KEY = 'museum-music';

export class Music {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => this.playTrack((this.index + 1) % TRACKS.length));

    this.index = Math.floor(Math.random() * TRACKS.length);
    this.started = false;
    this.ducked = false;
    this.onTrackChange = null;
    this._gain = 0;        // naik ke 1 saat fade-in
    this._target = 0;

    const saved = load();
    this._volume = saved.volume ?? DEFAULT_VOLUME;
    this._muted = saved.muted ?? false;
    this._apply();
  }

  get tracks() {
    return TRACKS;
  }

  get credit() {
    return MUSIC_CREDIT;
  }

  get current() {
    return this.started ? TRACKS[this.index] : null;
  }

  start() {
    if (this.started) return;
    this.started = true;
    this._target = 1;
    this.playTrack(this.index);
  }

  playTrack(i) {
    this.index = i;
    this.audio.src = MUSIC_DIR + TRACKS[i].file;
    if (!this.started) { // dipilih dari mode developer sebelum pintu dibuka → langsung mulai
      this.started = true;
      this._target = 1;
    }
    // play() mengembalikan Promise; gagal hanya kalau browser menolak autoplay → abaikan
    this.audio.play().catch(() => {});
    this.onTrackChange?.(TRACKS[i]);
  }

  get volume() { return this._volume; }
  set volume(v) {
    this._volume = Math.min(1, Math.max(0, v));
    this._apply();
    save(this);
  }

  get muted() { return this._muted; }
  set muted(m) {
    this._muted = m;
    this._apply();
    save(this);
  }

  update(dt) {
    if (!this.started) return;
    const target = this._target * (this.ducked ? DUCK : 1);
    // Fade-in pertama pelan (FADE_IN_S); sesudahnya peralihan redam ↔ normal lebih cepat (DUCK_S)
    const speed = this._fadedIn ? (1 - DUCK) / DUCK_S : 1 / FADE_IN_S;
    const step = speed * dt;
    this._gain += Math.max(-step, Math.min(step, target - this._gain));
    if (this._gain >= target) this._fadedIn = true;
    this._apply();
  }

  _apply() {
    this.audio.volume = this._muted ? 0 : this._volume * this._gain;
  }
}

// localStorage bisa tidak tersedia (mode privat, diblokir) → selalu dibungkus try/catch
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function save(music) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: music.volume, muted: music.muted }));
  } catch {
    // tidak apa-apa, pengaturan hanya tidak diingat
  }
}
