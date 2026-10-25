import { ROOMS, FRONT_Z } from '../scene/layout.js';

/**
 * Footsteps — bunyi langkah kaki yang mengikuti gerak pemain & jenis lantai.
 *
 * Langkah dihitung dari JARAK, bukan waktu: setiap pemain menempuh STRIDE meter di tanah,
 * satu langkah dibunyikan. Saat berlari langkahnya lebih panjang tetapi pemain jauh lebih
 * cepat, jadi bunyi otomatis lebih rapat — tanpa perlu tahu tombol apa yang ditekan.
 *
 *  - lompat   : bunyi tolakan pelan saat lepas dari tanah, tidak ada langkah selama di udara,
 *               lalu bunyi mendarat (lebih keras bila sambil berlari)
 *  - berhenti : hitungan jarak di-reset, sehingga langkah pertama berikutnya cepat terdengar
 *  - variasi  : file acak (Sfx) + nada & volume sedikit diacak tiap langkah
 *
 * Permukaan ditentukan dari posisi pemain:
 *   ruang ber-`floor` di layout.js : 'wood' → kayu; 'tegel' / 'kawung' / 'stone' → lantai
 *   di luar ruang                  : teras depan & jalan paving → lantai; selain itu → rumput
 *   ruang terbuka tanpa lantai     : (taman) → rumput
 *
 * Pemakaian:
 *   const footsteps = new Footsteps(sfx, controls);
 *   footsteps.update(dt, camera.position); // di loop, setelah controls.update
 */
// Meter per langkah. Kecepatan jalan di game 3 m/s (lari 5,4 m/s), jadi langkah dibuat panjang
// supaya iramanya alami: ± 2 langkah/detik saat jalan, ± 2,8 langkah/detik saat lari.
const STRIDE = { walk: 1.45, run: 1.95 };
const RUN_SPEED = 4;                     // m/s; di atas ini dianggap berlari (jalan = 3, lari = 5,4)
const VOLUME = { walk: 0.35, run: 0.5, takeoff: 0.25, land: 0.5, landRun: 0.75 };

const PORCH = { x: [-11.8, 11.8], z: [FRONT_Z, FRONT_Z + 2] }; // teras depan (facade.js)
const PATH_HALF = 1.5;                                          // jalan paving ke pintu (outdoor.js)
const FLOOR_SURFACE = { wood: 'step-kayu', tegel: 'step-lantai', kawung: 'step-lantai', stone: 'step-lantai' };

export class Footsteps {
  constructor(sfx, controls) {
    this.sfx = sfx;
    this.controls = controls;
    this._dist = 0;
    this._wasOnGround = true;
    this._last = null; // posisi frame sebelumnya
  }

  update(dt, pos) {
    const c = this.controls;
    if (!this._last) this._last = pos.clone();
    const moved = Math.hypot(pos.x - this._last.x, pos.z - this._last.z);
    this._last.copy(pos);
    // Teleport (mis. kamera kembali dari mode inspect) atau kontrol nonaktif → bukan langkah
    if (!c.enabled || dt <= 0 || moved > 1) {
      this._dist = 0;
      this._wasOnGround = c.onGround;
      return;
    }

    const running = moved / dt > RUN_SPEED;
    const surface = surfaceAt(pos.x, pos.z);

    if (this._wasOnGround && !c.onGround) {
      this._step(surface, VOLUME.takeoff); // tolakan saat melompat
    } else if (!this._wasOnGround && c.onGround) {
      this._step(surface, running ? VOLUME.landRun : VOLUME.land, 0.9); // mendarat: lebih berat
      this._dist = 0;
    } else if (c.onGround) {
      if (moved < 0.001) {
        this._dist = STRIDE.walk * 0.6; // diam → langkah pertama berikutnya cepat terdengar
      } else {
        this._dist += moved;
        const stride = running ? STRIDE.run : STRIDE.walk;
        if (this._dist >= stride) {
          this._dist -= stride;
          this._step(surface, running ? VOLUME.run : VOLUME.walk);
        }
      }
    }
    this._wasOnGround = c.onGround;
  }

  _step(surface, volume, rate = 1) {
    this.sfx.play(surface, {
      volume: volume * (0.85 + Math.random() * 0.3),
      rate: rate * (0.92 + Math.random() * 0.16),
    });
  }
}

export function surfaceAt(x, z) {
  const inside = (r) => x >= r.x[0] && x <= r.x[1] && z >= r.z[0] && z <= r.z[1];
  // Ruang berlantai didahulukan (pelataran batu ada di dalam area taman)
  const floored = ROOMS.find((r) => r.floor && inside(r));
  if (floored) return FLOOR_SURFACE[floored.floor] ?? 'step-lantai';
  if (ROOMS.some(inside)) return 'step-rumput'; // ruang terbuka tanpa lantai = taman
  const onPorch = x >= PORCH.x[0] && x <= PORCH.x[1] && z >= PORCH.z[0] && z <= PORCH.z[1];
  const onPath = Math.abs(x) <= PATH_HALF && z > FRONT_Z;
  return onPorch || onPath ? 'step-lantai' : 'step-rumput';
}
