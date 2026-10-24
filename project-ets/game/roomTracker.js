/**
 * RoomTracker — mendeteksi pemain sedang berada di ruang mana.
 *
 * Setiap ruang di layout.js yang punya `info` adalah persegi panjang di bidang XZ.
 * Cukup dicek: apakah posisi pemain ada di dalam persegi panjang itu? Di luar semua
 * ruang = halaman (null).
 *
 * Supaya pesan tidak muncul bolak-balik saat pemain berdiri tepat di ambang pintu,
 * ruang baru dianggap "dimasuki" kalau pemain sudah berada di dalamnya selama
 * DWELL detik berturut-turut.
 *
 * Pemakaian:
 *   const tracker = new RoomTracker(ROOMS);
 *   const entered = tracker.update(dt, camera.position); // info ruang, atau null kalau tidak ada perpindahan
 */
const DWELL = 0.5;

export class RoomTracker {
  constructor(rooms) {
    this.rooms = rooms.filter((r) => r.info);
    this.current = null;    // info ruang yang sedang ditempati (null = halaman)
    this._candidate = null; // ruang yang sedang "ditunggu" selama DWELL
    this._timer = 0;
  }

  // Daftar info semua ruang, urut sesuai layout (dipakai menu Esc)
  get all() {
    return this.rooms.map((r) => r.info);
  }

  roomAt(pos) {
    const room = this.rooms.find((r) =>
      pos.x >= r.x[0] && pos.x <= r.x[1] && pos.z >= r.z[0] && pos.z <= r.z[1]
    );
    return room ? room.info : null;
  }

  update(dt, pos) {
    const here = this.roomAt(pos);
    if (here === this.current) {
      this._candidate = null; // kembali ke ruang semula sebelum DWELL habis → batal
      return null;
    }
    if (here !== this._candidate) {
      this._candidate = here;
      this._timer = 0;
    }
    this._timer += dt;
    if (this._timer < DWELL) return null;

    this.current = here;
    this._candidate = null;
    return here; // null berarti keluar ke halaman — tidak memunculkan pesan
  }
}