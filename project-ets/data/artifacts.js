/*
 * Daftar koleksi museum. Menambah artefak = menambah satu entri di sini
 * + (kalau prosedural) satu fungsi pembuat model di scene/artifacts/.
 *
 *  id        : unik, dipakai untuk progress
 *  build     : nama pembuat model (lihat BUILDERS di scene/exhibits.js)
 *  ruang     : id ruang dari layout.js (info.id) — hanya untuk catatan/kuis
 *  display   : 'pedestal' (default), 'stand' (dudukan rendah, benda tegak), atau 'wall' (panel dinding)
 *  position  : [x, z] titik tengah pajangan (untuk 'wall': titik di permukaan dinding);
 *              facing = arah hadap muka pajangan (radian, 0 = +Z, π/2 = +X)
 *  nama, asal, periode, bahan, deskripsiSingkat, deskripsi, sumber: isi panel info
 *  koordinat : [lintang, bujur] asal daerah (untuk kuis peta, opsional)
 *
 * CATATAN: teks di bawah masih SEMENTARA — akan diganti dengan hasil riset.
 */
export const ARTIFACTS = [
  {
    id: 'keris',
    build: 'keris',
    ruang: 'pusaka',
    position: [0, -28.4],
    facing: 0, // menghadap pintu masuk ruang pusaka (+Z)
    nama: 'Keris',
    asal: 'Jawa (dikenal luas di Nusantara)',
    periode: 'Abad ke-9 M–sekarang',
    bahan: 'Besi berpamor, kayu, logam kuningan',
    koordinat: [-7.57, 110.82],
    deskripsi:
      'Keris adalah senjata tikam khas Nusantara dengan bilah asimetris, lurus atau berlekuk (luk) dalam jumlah ganjil. Pola pamor pada bilah terbentuk dari tempaan berlapis besi dan logam lain. Selain sebagai senjata, keris merupakan pusaka yang sarat makna simbolis, identitas budaya, dan nilai filosofis. UNESCO menetapkan keris Indonesia sebagai Karya Agung Warisan Budaya Lisan dan Takbenda Manusia pada 2005.',
    sumber: [
      'https://id.wikipedia.org/wiki/Keris'
    ],
  },
  {
    id: 'mandau',
    build: 'mandau',
    ruang: 'pusaka',
    position: [2.4, -28.5],
    facing: -0.35, // sedikit menghadap ke tengah ruang
    nama: 'Mandau',
    asal: 'Kalimantan Timur (Dayak)',
    periode: '— (menunggu riset)',
    bahan: 'Besi, tanduk, kayu, rotan, rambut',
    koordinat: [-0.5, 117.15],
    deskripsiSingkat: 'Parang tradisional suku Dayak dengan bilah bertakik ukiran.',
    deskripsi:
      'Mandau adalah senjata tradisional suku Dayak di Kalimantan, berupa parang bermata satu yang ' +
      'melebar ke ujung. Punggung bilahnya kerap dihias takik ukiran, hulunya dibuat dari tanduk yang ' +
      'diukir dan dihias rambut, dan bilahnya disimpan dalam sarung kayu (kumpang) berikat rotan. ' +
      '(Teks sementara — menunggu riset.)',
    sumber: [],
  },
  {
    id: 'pasatimpo',
    build: 'pasatimpo',
    ruang: 'pusaka',
    position: [-2.4, -28.5],
    facing: 0.35,
    nama: 'Pasatimpo',
    asal: 'Sulawesi Tengah (Kaili)',
    periode: '— (menunggu riset)',
    bahan: 'Besi, kayu',
    koordinat: [-0.9, 119.87],
    deskripsiSingkat: 'Senjata tikam suku Kaili dengan hulu menyerupai kepala burung.',
    deskripsi:
      'Pasatimpo adalah senjata tradisional suku Kaili di Sulawesi Tengah. Bilahnya sedikit ' +
      'melengkung, hulunya membengkok menyerupai kepala burung, dan sarungnya melebar di bagian ' +
      'pangkal. (Teks sementara — menunggu riset.)',
    sumber: [],
  },
  {
    id: 'trisula',
    build: 'trisula',
    display: 'stand',
    ruang: 'pusaka',
    position: [3.3, -25.4],
    facing: -Math.PI / 2, // menghadap ke tengah ruang (−X)
    nama: 'Trisula',
    asal: 'Sumatera Selatan',
    periode: '— (menunggu riset)',
    bahan: 'Besi, kayu, kuningan',
    koordinat: [-2.99, 104.76],
    deskripsiSingkat: 'Tombak bermata tiga bergagang panjang.',
    deskripsi:
      'Trisula adalah senjata berupa tombak bermata tiga dengan gagang panjang: mata tengah lurus ' +
      'dan lebih panjang, diapit dua mata samping yang melengkung. (Teks sementara — menunggu riset.)',
    sumber: [],
  },
  {
    id: 'busur-panah',
    build: 'busurPanah',
    display: 'wall',
    ruang: 'pusaka',
    position: [-4.0, -26.4], // permukaan dinding barat ruang pusaka
    facing: Math.PI / 2,     // menghadap +X (ke dalam ruang)
    nama: 'Busur & Panah',
    asal: 'Papua',
    periode: '— (menunggu riset)',
    bahan: 'Kayu, bambu, rotan, gelagah',
    koordinat: [-4.1, 138.95],
    deskripsiSingkat: 'Busur kayu dan anak panah tanpa bulu dengan beragam mata panah.',
    deskripsi:
      'Busur dan panah digunakan masyarakat Papua untuk berburu dan berperang. Busur dibuat dari kayu ' +
      'atau bambu dengan tali dari bilah rotan atau bambu, sedangkan anak panahnya dari batang ' +
      'gelagah tanpa bulu, dengan mata panah dari kayu keras atau bambu yang bentuknya berbeda ' +
      'sesuai buruan. (Teks sementara — menunggu riset.)',
    sumber: [],
  },
];
