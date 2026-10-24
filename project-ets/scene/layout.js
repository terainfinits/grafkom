/*
 * Denah museum sebagai DATA. building.js membaca data ini lalu membuat lantai,
 * dinding, langit-langit, lampu, dan collider secara otomatis. Mengubah denah
 * cukup di file ini.
 *
 * Tampak atas (depan = +Z di bawah, belakang = −Z di atas), satuan meter:
 *
 *  z=−30            ┌─PUSAKA─┐
 *  z=−24   ┌────────┴──AULA──┴────────┐
 *  z=−12   ├──┬─────────────────────┬──┤
 *          │S │    TAMAN TENGAH     │S │
 *  ┌WASTRA─┤e │      (terbuka)      │e ├PERTUNJUKAN┐
 *  │       │l ├─────────────────────┤l │           │
 *  └───────┤W │       LOBBY         │E ├───────────┘
 *  z=7.1   └──┴─────────▮▮──────────┴──┘   ▮▮ = pintu masuk
 *        x=−20  −10   −7     0     7   10   20
 *
 * Alur pengunjung berputar: Lobby → Selasar barat (→ Wastra) → Aula (→ Pusaka,
 * → Taman tengah) → Selasar timur (→ Pertunjukan) → Lobby.
 */

export const WALL_THICKNESS = 0.2;

// Pintu masuk di tengah dinding depan. Lebarnya dipakai juga oleh kusen & daun pintu.
export const DOOR = { width: 2, height: 2.8 };

// Sisi DALAM dinding depan. Modul luar (loket, pintu, taman, jalan) mengacu ke sini.
export const FRONT_Z = 7;

// Bukaan standar antar-ruang (tanpa daun pintu)
const PASSAGE = { width: 2.4, top: 3 };
// Jendela: ada ambang bawah, jadi tetap terhitung tembok untuk collider
const WINDOW = { width: 3, bottom: 1, top: 2.6 };

/*
 * Ruang: batas lantai (garis tengah dinding), tinggi langit-langit, jenis lantai & plafon, titik lampu.
 *   floor  : 'kawung' (tegel motif batik kawung), 'tegel' (tegel bunga nila), 'wood' (papan jati), 'stone'
 *   ceiling: 'kayu' (papan kayu) atau 'gedek' (anyaman bambu)
 *   info   : data untuk pelacak ruangan (game/roomTracker.js) — id, judul, subjudul,
 *            penjelasan (muncul sekali saat pertama masuk), & judul achievement.
 *            Ruang tanpa `info` (mis. pelataran) tidak dihitung sebagai ruang tersendiri.
 * open: true → tanpa langit-langit & lampu (langit terbuka). Tanpa `floor`, yang terlihat
 *   adalah rumput halaman; dengan `floor`, lantai dipasang sedikit di atas rumput.
 */
export const ROOMS = [
  { name: 'Lobby', x: [-7, 7], z: [0, 7.1], height: 5, floor: 'kawung', ceiling: 'kayu',
    lights: [[-3.5, 3.5], [3.5, 3.5]],
    info: { id: 'lobi', title: 'Lobi', subtitle: 'Gerbang penyambutan',
      description: 'Titik awal kunjungan. Patung dan lukisan dekoratif di sini menjadi pengantar kekayaan budaya Nusantara.',
      achievement: 'Selamat Datang' } },
  { name: 'Selasar barat', x: [-10.1, -7], z: [-12, 7.1], height: 3.5, floor: 'wood', ceiling: 'gedek',
    lights: [[-8.55, 2], [-8.55, -7]],
    info: { id: 'selasar-barat', title: 'Selasar Barat', subtitle: 'Lorong menuju Ruang Wastra & Aula',
      description: 'Lorong berjendela yang menghadap taman, dihiasi lukisan dan patung dekoratif.',
      achievement: 'Penjelajah Lorong Barat' } },
  { name: 'Selasar timur', x: [7, 10.1], z: [-12, 7.1], height: 3.5, floor: 'wood', ceiling: 'gedek',
    lights: [[8.55, 2], [8.55, -7]],
    info: { id: 'selasar-timur', title: 'Selasar Timur', subtitle: 'Lorong menuju Ruang Pertunjukan & Aula',
      description: 'Lorong berjendela yang menghadap taman, dihiasi lukisan dan patung dekoratif.',
      achievement: 'Penjelajah Lorong Timur' } },
  { name: 'Ruang Wastra', x: [-20.1, -10.1], z: [-8, 4], height: 4, floor: 'tegel', ceiling: 'gedek',
    lights: [[-15.1, 1], [-15.1, -5]],
    info: { id: 'wastra', title: 'Ruang Wastra', subtitle: 'Kain tradisional Nusantara',
      description: 'Batik, tenun ikat, songket, hingga ulos — setiap helai menyimpan cerita daerah asalnya.',
      achievement: 'Pencinta Wastra' } },
  { name: 'Ruang Pertunjukan', x: [10.1, 20.1], z: [-8, 4], height: 4, floor: 'tegel', ceiling: 'gedek',
    lights: [[15.1, 1], [15.1, -5]],
    info: { id: 'pertunjukan', title: 'Ruang Pertunjukan', subtitle: 'Alat musik tradisional',
      description: 'Bunyi-bunyian yang mengiringi upacara dan pertunjukan, dari gamelan hingga alat musik daerah lainnya.',
      achievement: 'Penikmat Nada' } },
  { name: 'Taman tengah', x: [-7, 7], z: [-12, 0], open: true,
    info: { id: 'taman', title: 'Taman', subtitle: 'Ruang terbuka di jantung museum',
      description: 'Kolam teratai, pohon kamboja, dan pelataran batu yang kelak menjadi panggung pertunjukan.',
      achievement: 'Di Bawah Langit Terbuka' } },
  // Pelataran batu di taman, dari pintu aula ke tengah taman (calon panggung pertunjukan)
  { name: 'Pelataran', x: [-3, 3], z: [-11.9, -4], open: true, floor: 'stone' },
  { name: 'Aula utama', x: [-10.1, 10.1], z: [-24, -12], height: 7, floor: 'kawung', ceiling: 'kayu',
    lights: [[-5, -18], [5, -18]],
    info: { id: 'aula', title: 'Aula', subtitle: 'Koleksi utama',
      description: 'Ruang termegah dengan empat soko guru dan langit-langit tumpang sari. Di tengahnya tersimpan artefak unggulan museum.',
      achievement: 'Jantung Museum' } },
  { name: 'Ruang Pusaka', x: [-4.1, 4.1], z: [-30, -24], height: 3.5, floor: 'wood', ceiling: 'kayu',
    lights: [[0, -27]], dim: true,
    info: { id: 'pusaka', title: 'Ruang Pusaka', subtitle: 'Senjata dan pusaka tradisional',
      description: 'Keris, mandau, pasatimpo, trisula, serta busur dan panah dari berbagai penjuru Nusantara.',
      achievement: 'Penjaga Pusaka' } },
];

/*
 * Dinding: garis tengah lurus (sejajar sumbu X atau Z), tinggi, dan bukaan.
 * Bukaan: at = posisi tengah di sepanjang dinding, width, bottom (default 0), top.
 *
 * Aturan sudut supaya kotak dinding tidak saling tumpuk di permukaan yang sama:
 * dinding sejajar X membentang penuh sampai tepi luar, dinding sejajar Z
 * berhenti di muka dinding X yang ditemuinya.
 */
const T = WALL_THICKNESS;
export const WALLS = [
  // ---------- Massa depan (lobby + ujung selasar) ----------
  { x: [-10.2, 10.2], z: 7.1, height: 5, openings: [{ at: 0, width: DOOR.width, top: DOOR.height }] }, // depan
  { x: [-7.1, 7.1], z: 0, height: 5, openings: [{ at: 0, ...WINDOW, width: 6 }] },                    // belakang lobby, jendela ke taman
  { x: -7, z: [0.1, 7.1 - T / 2], height: 5, openings: [{ at: 3.5, ...PASSAGE }] },                    // lobby → selasar barat
  { x: 7, z: [0.1, 7.1 - T / 2], height: 5, openings: [{ at: 3.5, ...PASSAGE }] },                     // lobby → selasar timur
  { x: -10.1, z: [0, 7.1 - T / 2], height: 5 },
  { x: 10.1, z: [0, 7.1 - T / 2], height: 5 },

  // ---------- Selasar ----------
  // Sisi taman: dua jendela per selasar
  { x: -7, z: [-12 + T / 2, -0.1], height: 4, openings: [{ at: -3, ...WINDOW }, { at: -9, ...WINDOW }] },
  { x: 7, z: [-12 + T / 2, -0.1], height: 4, openings: [{ at: -3, ...WINDOW }, { at: -9, ...WINDOW }] },
  // Sisi luar: bukaan ke ruang sayap
  { x: -10.1, z: [-12 + T / 2, 0], height: 4, openings: [{ at: -2, ...PASSAGE }] },
  { x: 10.1, z: [-12 + T / 2, 0], height: 4, openings: [{ at: -2, ...PASSAGE }] },

  // ---------- Ruang sayap ----------
  { x: [-20.2, -10.2], z: 4, height: 4 },
  { x: [-20.2, -10.2], z: -8, height: 4 },
  { x: -20.1, z: [-8 + T / 2, 4 - T / 2], height: 4 },
  { x: [10.2, 20.2], z: 4, height: 4 },
  { x: [10.2, 20.2], z: -8, height: 4 },
  { x: 20.1, z: [-8 + T / 2, 4 - T / 2], height: 4 },

  // ---------- Aula utama ----------
  { x: [-10.2, 10.2], z: -12, height: 7, openings: [
    { at: -8.55, ...PASSAGE },          // dari selasar barat
    { at: 8.55, ...PASSAGE },           // ke selasar timur
    { at: 0, width: 3, top: 3 },        // pintu ke taman tengah (nanti: area pertunjukan)
    { at: -4.5, ...WINDOW },            // jendela kiri-kanan pintu, tetap memandang taman
    { at: 4.5, ...WINDOW },
  ] },
  { x: [-10.2, 10.2], z: -24, height: 7, openings: [{ at: 0, width: 2, top: 2.8 }] }, // ke ruang pusaka
  { x: -10.1, z: [-24 + T / 2, -12 - T / 2], height: 7 },
  { x: 10.1, z: [-24 + T / 2, -12 - T / 2], height: 7 },

  // ---------- Ruang pusaka ----------
  { x: [-4.2, 4.2], z: -30, height: 3.5 },
  { x: -4.1, z: [-30 + T / 2, -24 - T / 2], height: 3.5 },
  { x: 4.1, z: [-30 + T / 2, -24 - T / 2], height: 3.5 },
];

/*
 * Massa bangunan = kotak luar (sisi luar dinding) yang diberi atap masing-masing.
 * Massa depan diberi atap joglo oleh facade.js (karena menyatu dengan serambi).
 *
 * roof.type: 'limasan' (4 bidang miring) atau 'joglo' (dua tingkat, paling megah).
 * Tinggi atap mengikuti `top` & kemiringan, jadi aula (top 7) otomatis paling menjulang.
 * roof.trim: tepi atap yang TIDAK boleh menjorok, karena menempel ke ruang tetangga yang
 *   langit-langitnya lebih tinggi (kalau menjorok, ujung atap menembus masuk ke ruang itu).
 *   Nilainya koordinat tepi atap, biasanya garis tengah dinding tetangga.
 */
export const FRONT_MASS = { x: [-10.2, 10.2], z: [-0.1, 7.2], top: 5 };
export const MASSES = [
  // Selasar diapit massa depan, aula, & ruang sayap → hanya sisi taman yang menjorok
  { name: 'Selasar barat', x: [-10.2, -6.9], z: [-11.9, -0.1], top: 4,
    roof: { type: 'limasan', overhang: 0.4, slope: 0.5, trim: { x0: -10.1, z0: -12, z1: 0 } } },
  { name: 'Selasar timur', x: [6.9, 10.2], z: [-11.9, -0.1], top: 4,
    roof: { type: 'limasan', overhang: 0.4, slope: 0.5, trim: { x1: 10.1, z0: -12, z1: 0 } } },
  { name: 'Ruang Wastra', x: [-20.2, -10.2], z: [-8.1, 4.1], top: 4,
    roof: { type: 'limasan', overhang: 0.8, slope: 0.5 } },
  { name: 'Ruang Pertunjukan', x: [10.2, 20.2], z: [-8.1, 4.1], top: 4,
    roof: { type: 'limasan', overhang: 0.8, slope: 0.5 } },
  { name: 'Aula utama', x: [-10.2, 10.2], z: [-24.1, -11.9], top: 7,
    roof: { type: 'joglo', overhang: 1.2, slope: 0.45 } },
  { name: 'Ruang Pusaka', x: [-4.2, 4.2], z: [-30.1, -23.9], top: 3.5,
    roof: { type: 'limasan', overhang: 0.5, slope: 0.6, trim: { z1: -24 } } }, // menempel aula
];