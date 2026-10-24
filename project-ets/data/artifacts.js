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

  // ---------- Ruang Wastra ----------
  {
    id: 'ulos',
    build: 'ulos',
    display: 'floor',
    ruang: 'wastra',
    position: [-18.4, -2],  // dekat dinding barat, lurus dengan pintu masuk dari selasar
    facing: Math.PI / 2,     // menghadap +X (ke arah pintu)
    nama: 'Ulos Batak',
    asal: 'Sumatera Utara — masyarakat Batak Toba, Karo, Simalungun, dan Mandailing',
    periode: '—',
    bahan: 'Benang tenun, benang emas',
    koordinat: [2.6, 98.9],
    deskripsiSingkat: 'Kain sakral masyarakat Batak yang memiliki makna spiritual dan sosial dalam berbagai tahapan kehidupan.',
    deskripsi:
      'Kain sakral masyarakat Batak yang memiliki makna spiritual dan sosial dalam berbagai tahapan kehidupan. ' +
      'Dominan merah, hitam, dan putih dengan pola geometris. ' +
      'Ditenun secara tradisional menggunakan alat tenun bukan mesin (ATBM). ' +
      'Digunakan dalam tradisi mangulosi, pernikahan, kelahiran, dan upacara adat.',
    sumber: ['https://injourney.id/media-publication/article/12-macam-kain-tradisional-indonesia-dan-ciri-khasnya'],
  },
  {
    id: 'cual',
    build: 'cual',
    display: 'wall',
    ruang: 'wastra',
    position: [-15.1, 3.9], // permukaan dinding utara ruang wastra
    facing: Math.PI,         // menghadap −Z (ke dalam ruang)
    nama: 'Kain Cual',
    asal: 'Bangka Belitung — pengaruh budaya Melayu dan Tionghoa',
    periode: '—',
    bahan: 'Benang tenun, benang hias emas',
    koordinat: [-2.13, 106.11],
    deskripsiSingkat: 'Warisan tekstil Bangka Belitung yang dipengaruhi tradisi Melayu dan budaya maritim.',
    deskripsi:
      'Kain cual merupakan warisan tekstil Bangka Belitung yang dipengaruhi tradisi Melayu dan budaya maritim. ' +
      'Ditenun dengan tambahan benang hias dan motif dekoratif. ' +
      'Motif khasnya berupa bunga, dedaunan, dan unsur pesisir dengan warna merah, emas, dan hijau. ' +
      'Digunakan dalam acara adat, penyambutan tamu, dan busana resmi.',
    sumber: ['https://injourney.id/media-publication/article/12-macam-kain-tradisional-indonesia-dan-ciri-khasnya'],
  },
  {
    id: 'songket',
    build: 'songket',
    display: 'floor',
    ruang: 'wastra',
    position: [-15.1, -6.7], // dekat dinding selatan ruang wastra
    facing: 0,                // menghadap +Z (ke tengah ruang)
    nama: 'Songket',
    asal: 'Palembang, Minangkabau, Riau, Lombok, dan komunitas Melayu di berbagai daerah',
    periode: '—',
    bahan: 'Benang tenun, benang emas atau perak',
    koordinat: [-2.99, 104.76],
    deskripsiSingkat: 'Kain tenun mewah dengan kilau benang emas atau perak, lambang status kehormatan.',
    deskripsi:
      'Songket adalah kain tenun mewah yang dikenal dengan kilau benang emas atau peraknya dan sering dikaitkan dengan status kehormatan. ' +
      'Ditenun dengan tambahan benang emas atau perak secara manual. ' +
      'Motif khasnya berupa pucuk rebung, bunga, dan motif geometris dengan warna merah, hitam, ungu, atau hijau. ' +
      'Dipakai untuk pernikahan, upacara adat, dan busana resmi.',
    sumber: ['https://injourney.id/media-publication/article/12-macam-kain-tradisional-indonesia-dan-ciri-khasnya'],
  },
  {
    id: 'sasirangan',
    build: 'sasirangan',
    display: 'floor',
    ruang: 'wastra',
    position: [-12.2, 2.4],  // sudut timur laut ruang wastra
    facing: -2.5,             // serong menghadap ke tengah ruang
    nama: 'Sasirangan',
    asal: 'Kalimantan Selatan — terutama masyarakat Banjar',
    periode: '—',
    bahan: 'Kain, benang jelujur, pewarna',
    koordinat: [-3.32, 114.59],
    deskripsiSingkat: 'Kain berteknik pewarnaan unik yang menjadi simbol identitas budaya masyarakat Banjar.',
    deskripsi:
      'Sasirangan memiliki teknik pewarnaan yang unik dan menjadi simbol identitas budaya masyarakat Banjar. ' +
      'Kain dijelujur atau diikat sebelum dicelup warna. ' +
      'Motif khasnya antara lain Kambang Raja, Bayam Raja, dan motif alam dengan warna cerah. ' +
      'Digunakan dalam tradisi Banjar serta busana sehari-hari maupun formal.',
    sumber: ['https://injourney.id/media-publication/article/12-macam-kain-tradisional-indonesia-dan-ciri-khasnya'],
  },
  {
    id: 'tenun-sumba',
    build: 'sumba',
    display: 'floor',
    ruang: 'wastra',
    position: [-12.3, -6.1], // sudut tenggara ruang wastra
    facing: -0.65,            // serong menghadap ke tengah ruang
    nama: 'Tenun Sumba',
    asal: 'Pulau Sumba, Nusa Tenggara Timur — terutama komunitas adat Marapu',
    periode: '—',
    bahan: 'Benang katun, pewarna alami (mengkudu, indigo)',
    koordinat: [-9.65, 120.26],
    deskripsiSingkat: 'Tenun ikat bermotif detail dengan warna khas dari pewarna alami.',
    deskripsi:
      'Tenun Sumba terkenal karena motifnya yang detail dan penggunaan pewarna alami yang menghasilkan karakter warna yang khas. ' +
      'Dibuat dengan teknik tenun ikat memakai pewarna alami seperti mengkudu dan indigo. ' +
      'Motif khasnya antara lain kuda, rusa, buaya, pohon kehidupan, dan figur manusia dengan warna merah, biru, dan cokelat. ' +
      'Digunakan dalam pernikahan, ritual adat, dan sebagai koleksi wastra bernilai tinggi.',
    sumber: ['https://injourney.id/media-publication/article/12-macam-kain-tradisional-indonesia-dan-ciri-khasnya'],
  },
];
