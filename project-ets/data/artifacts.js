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
    asal: 'Kalimantan (Dayak)',
    periode: 'Abad ke-17–18 M',
    bahan: 'Besi, tanduk, kayu, rotan, rambut',
    koordinat: [-0.5, 117.15],
    deskripsiSingkat: 'Parang tradisional suku Dayak dengan bilah berhias ukiran.',
    deskripsi:
      'Mandau adalah senjata tradisional suku Dayak di Kalimantan, berupa parang bermata satu dengan bilah yang melebar ke ujung. Bilahnya dihiasi ukiran dan terkadang tatahan logam, sedangkan hulunya terbuat dari kayu, tanduk, atau tulang yang dapat dihias rambut. Mandau disimpan dalam sarung kayu bernama kumpang yang biasanya diikat dengan anyaman rotan.',
    sumber: [
      'https://id.wikipedia.org/wiki/Mandau'
    ],
  },
  {
    id: 'bara-sangihe',
    build: 'baraSangihe',
    ruang: 'pusaka',
    position: [-2.4, -28.5],
    facing: 0.35,
    nama: 'Bara Sangihe',
    asal: 'Kepulauan Sangihe, Sulawesi Utara',
    periode: 'Abad ke-17 M (tercatat)',
    bahan: 'Baja, kayu, beludru, benang emas',
    koordinat: [3.6, 125.5],
    deskripsiSingkat: 'Pedang dari Kepulauan Sangihe dengan ujung bilah bercabang seperti mulut buaya.',
    deskripsi:
      'Bara Sangihe adalah pedang tradisional dari Kepulauan Sangihe, Sulawesi Utara. Bilahnya terbuat dari besi dengan ujung bercabang dan bergerigi, sedangkan gagangnya memiliki dua cabang serta dihiasi ukiran bermotif tradisional. Selain sebagai senjata, pedang ini menjadi simbol keberanian dan kehormatan serta digunakan dalam upacara adat, seperti pernikahan dan penobatan raja.',
    sumber: [
      'https://id.wikipedia.org/wiki/Pedang_Bara_Sangihe'
    ],
  },
  {
    id: 'salawaku',
    build: 'salawaku',
    display: 'wall',
    ruang: 'pusaka',
    position: [4.0, -26.4], // permukaan dinding timur ruang pusaka (berhadapan dengan busur & panah)
    facing: -Math.PI / 2, // menghadap −X (ke dalam ruang)
    nama: 'Salawaku',
    asal: 'Maluku',
    periode: 'Abad ke-14 M',
    bahan: 'Kayu, cat, kepingan kerang',
    koordinat: [-3.7, 128.18],
    deskripsiSingkat: 'Perisai kayu panjang dan sempit dari Maluku, bertatah kepingan kerang.',
    deskripsi:
      'Salawaku adalah perisai tradisional Maluku yang berbentuk panjang dan ramping, dengan bagian atas dan bawah lebih lebar daripada tengahnya. Permukaannya dicat gelap dan dihiasi kepingan kerang bermotif simbol keberanian. Selain melindungi tubuh, salawaku digunakan bersama parang dalam peperangan dan ditampilkan dalam tari Cakalele serta upacara penyambutan tamu.',
    sumber: [
      'https://id.wikipedia.org/wiki/Salawaku'
    ],
  },
  {
    id: 'busur-panah',
    build: 'busurPanah',
    display: 'wall',
    ruang: 'pusaka',
    position: [-4.0, -26.4], // permukaan dinding barat ruang pusaka
    facing: Math.PI / 2, // menghadap +X (ke dalam ruang)
    nama: 'Busur & Panah',
    asal: 'Papua',
    periode: 'Prasejarah–sekarang (perkiraan)',
    bahan: 'Kayu, bambu, rotan, gelagah',
    koordinat: [-4.1, 138.95],
    deskripsiSingkat: 'Busur kayu dan anak panah tanpa bulu dengan beragam mata panah.',
    deskripsi:
      'Busur dan panah merupakan senjata tradisional masyarakat Papua yang digunakan untuk berburu dan berperang. Busur dibuat dari kayu atau bambu dengan tali dari rotan atau bambu, sedangkan anak panah menggunakan batang gelagah tanpa bulu dan mata panah dari kayu keras atau bambu dengan bentuk sesuai fungsinya.',
    sumber: [
      'https://www.traveloka.com/id-id/explore/destination/mengenal-senjata-tradisional-busur-panah-papua-tengah/1006986'
    ],
  },
];