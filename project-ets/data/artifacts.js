/* File Purpose: Mengonfigurasi dan menyimpan struktur data array koleksi artefak dan wastra pameran museum (metadata pameran mencakup ID, posisi koordinat 3D, arah orientasi, jenis dudukan, informasi sejarah, deskripsi, dan tautan referensi).

Connected Files:
- ../scene/exhibits.js: Mengimpor konstanta ARTIFACTS untuk membuat dan memosisikan objek 3D artefak beserta pedestal/dudukan di dalam ruang pameran.
- ../main.js: Membaca daftar artefak untuk menentukan jumlah total koleksi dan menginisialisasi sistem interaksi inspeksi/hover.
- ../ui/inspectPanel.js: Mengambil metadata artefak (nama, asal, periode, bahan, deskripsi, sumber) untuk ditampilkan pada panel antarmuka UI saat pemain memeriksa koleksi.
- ../game/progress.js: Menggunakan ID artefak untuk melacak status koleksi yang sudah atau belum diperiksa oleh pemain.
- ../scene/artifacts/*.js: Fungsi-fungsi prosedural pembentuk model 3D (seperti keris.js, mandau.js, busurPanah.js) yang dirujuk oleh properti 'build'.

 * Daftar koleksi museum. Menambah artefak = menambah satu entri di sini
 * + (kalau prosedural) satu fungsi pembuat model di scene/artifacts/.
 *
 *  id        : unik, dipakai untuk progress
 *  build     : nama pembuat model (lihat BUILDERS di scene/exhibits.js)
 *  ruang     : id ruang dari layout.js (info.id) — hanya untuk catatan/kuis
 *  display   : 'pedestal' (default), 'stand' (dudukan rendah, benda tegak), atau 'wall' (panel dinding)
 *  view      : (opsional) { elevation: derajat, distance: kelipatan } untuk mengganti sudut kamera inspect bawaan
 *  position  : [x, z] titik tengah pajangan (untuk 'wall': titik di permukaan dinding);
 *              facing = arah hadap muka pajangan (radian, 0 = +Z, π/2 = +X)
 *  nama, asal, periode, bahan, deskripsiSingkat, deskripsi, sumber: isi panel info
 *  koordinat : [lintang, bujur] asal daerah (untuk kuis peta, opsional)
 *
 * Khusus model dari file GLB (build: 'gltf', lihat scene/models.js):
 *  model       : path file .glb
 *  modelSize   : panjang sisi mendatar terpanjang dalam meter (skala dinormalisasi otomatis)
 *  modelYaw    : (opsional) rotasi tambahan (radian) kalau arah model aslinya tidak pas
 *  modelHide   : (opsional) nama material yang bagiannya dibuang dari model
 *  kreditModel : { judul, pembuat, lisensi, url } — wajib untuk model berlisensi CC BY
 */

// export agar bisa di-import file js lain; Array konstanta yang diekspor berisi objek-objek data koleksi artefak dan wastra pameran museum 
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
  // ---------- Ruang Pertunjukan (alat musik tradisional) ----------
  {
    id: 'sasando',
    build: 'sasando',
    display: 'pedestal',
    ruang: 'pertunjukan',
    position: [18.4, -2],   // dekat dinding timur, lurus dengan pintu masuk dari selasar timur
    facing: -Math.PI / 2,    // menghadap −X (ke arah pintu)
    nama: 'Sasando',
    asal: 'Rote Ndao, Nusa Tenggara Timur',
    periode: 'Abad ke-7 M–sekarang',
    bahan: 'Daun lontar, bambu, kayu, kawat dawai',
    koordinat: [-10.73, 123.07],
    deskripsiSingkat: 'Alat musik petik khas Pulau Rote dengan wadah resonator dari daun lontar.',
    deskripsi:
      'Sasando adalah alat musik petik tradisional khas masyarakat Rote Ndao. ' +
      'Bagian utamanya berupa tabung bambu yang dipasangi dawai/senar, dikelilingi wadah berbentuk kipas melingkar yang terbuat dari anyaman daun lontar sebagai resonator suara. ' +
      'Sasando dimainkan dengan memetik dawai menggunakan kedua tangan.',
    sumber: ['https://id.wikipedia.org/wiki/Sasando'],
  },
  {
    id: 'tehyan',
    build: 'tehyan',
    display: 'pedestal',
    ruang: 'pertunjukan',
    position: [15.1, 2.8], // dekat dinding utara ruang pertunjukan
    facing: Math.PI, // menghadap −Z (ke tengah ruang)
    nama: 'Tehyan',
    asal: 'Betawi (Jakarta), dengan pengaruh Tionghoa peranakan',
    periode: 'Abad ke-18 M',
    bahan: 'Kayu jati, batok kelapa, kulit, dawai',
    koordinat: [-6.2, 106.82],
    deskripsiSingkat: 'Alat musik gesek berdawai dua dengan resonator batok kelapa.',
    deskripsi:
      'Tehyan adalah alat musik gesek berdawai dua yang terbuat dari kayu dengan resonator dari batok kelapa berlapis kulit. Alat musik ini menghasilkan nada tinggi dan dimainkan menggunakan busur. Tehyan menjadi bagian dari ansambel gambang kromong masyarakat Betawi yang berkembang melalui perpaduan budaya Tionghoa peranakan dan lokal.',
    sumber: [
      'https://id.wikipedia.org/wiki/Tehyan'
    ],
  },
  {
    id: 'tifa',
    build: 'tifa',
    display: 'pedestal',
    ruang: 'pertunjukan',
    position: [15.1, -6.8], // dekat dinding selatan ruang pertunjukan
    facing: 0, // menghadap +Z (ke tengah ruang)
    nama: 'Tifa',
    asal: 'Maluku dan Papua',
    periode: 'Tradisi turun-temurun; awal belum diketahui',
    bahan: 'Kayu, kulit hewan, rotan',
    koordinat: [-3.7, 128.18],
    deskripsiSingkat: 'Gendang tradisional dari Maluku dan Papua dengan membran kulit.',
    deskripsi:
      'Tifa adalah alat musik pukul berbentuk gendang yang dibuat dari batang kayu berongga dengan salah satu ujungnya ditutup kulit hewan. Bentuk dan hiasannya berbeda menurut daerah dan masyarakat pembuatnya. Tifa dimainkan untuk mengiringi tarian, upacara adat, penyambutan tamu, dan pertunjukan musik tradisional, termasuk ansambel tifa totobuang di Maluku.',
    sumber: [
      'https://id.wikipedia.org/wiki/Tifa'
    ],
  },
  {
    id: 'talempong',
    build: 'talempong',
    display: 'floor', // diletakkan di lantai dengan rancak tersendiri
    view: { elevation: 42, distance: 1.1 },
    ruang: 'pertunjukan',
    position: [12.4, 2.1], // sisi barat laut ruang pertunjukan
    facing: 2.55, // serong menghadap ke tengah ruang
    nama: 'Talempong',
    asal: 'Minangkabau, Sumatera Barat',
    periode: 'Tradisi turun-temurun; awal belum diketahui',
    bahan: 'Perunggu, kuningan, kayu',
    koordinat: [-0.95, 100.35],
    deskripsiSingkat: 'Gong kecil tradisional Minangkabau yang dimainkan dengan pemukul.',
    deskripsi:
      'Talempong adalah alat musik pukul tradisional Minangkabau berbentuk gong kecil dengan tonjolan di bagian atas sebagai tempat memukul. Talempong umumnya dibuat dari logam seperti perunggu atau kuningan dan dimainkan dengan pemukul kayu. Alat musik ini dapat dipegang atau disusun di atas rancak, serta digunakan untuk mengiringi tari, upacara adat, pesta pernikahan, dan penyambutan tamu.',
    sumber: [
      'https://id.wikipedia.org/wiki/Talempong'
    ],
  },
  {
    id: 'serune-kalee',
    build: 'seruneKalee',
    display: 'pedestal',
    ruang: 'pertunjukan',
    position: [12.4, -6.1], // sisi barat daya ruang pertunjukan
    facing: 0.57, // serong menghadap ke tengah ruang
    nama: 'Serune Kalee',
    asal: 'Aceh',
    periode: 'Tradisi lama; awal belum diketahui',
    bahan: 'Kayu keras, kuningan',
    koordinat: [5.55, 95.32],
    deskripsiSingkat: 'Alat musik tiup Aceh dari kayu dengan lubang nada dan cincin kuningan.',
    deskripsi:
      'Serune Kalee adalah alat musik tiup tradisional Aceh yang berbentuk memanjang dengan ujung menyerupai corong. Badannya dibuat dari kayu keras yang dibentuk melalui proses perendaman, pembubutan, dan pelubangan, kemudian dilengkapi lubang-lubang nada serta hiasan cincin kuningan. Serune Kalee dimainkan bersama rapai dan gendang untuk mengiringi tarian, hiburan, upacara, serta penyambutan tamu kehormatan.',
    sumber: [
      'https://budayaaceh.com/opk/serune-kale/96'
    ],
  },
  {
    id: 'peta-indonesia',
    build: 'petaIndonesia', // Kunci yang akan dipanggil oleh exhibits.js
    ruang: 'aula',          // Diletakkan di ruang aula awal
    display: 'floor',       // Diletakkan di lantai, tanpa pedestal
    position: [0.0, -18.0],   // Posisi diganti di tengah aula
    facing: 0,
    nama: 'Peta Kepulauan Indonesia',
    asal: 'Nusantara',
    periode: 'Era Modern',
    bahan: 'Aset 3D Digital',
    deskripsi: 'Sebuah representasi topografi kepulauan Indonesia dalam gaya low-poly. Menyimbolkan kesatuan nusantara dari Sabang hingga Merauke sebagai pembuka perjalanan menelusuri kekayaan budaya pameran ini.',
    // INI ADALAH BAGIAN WAJIB UNTUK MEMATUHI LISENSI CC ATTRIBUTION
    sumber: [
      '"INDONESIA" (https://skfb.ly/6AFNo) by Bijahika is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).'
    ]
  },
  {
    id: 'pinisi',
    build: 'gltf',
    model: 'assets/models/pinisi.glb',
    modelSize: 3.2, // panjang kapal (m); diperbesar/diperkecil cukup dari sini
    modelHide: ['Water_Pool_Light'], // piringan "air" transparan bawaan model
    display: 'plinth',
    ruang: 'lobi',
    position: [0, 2.6], // tengah lobi, agak ke belakang: langsung terlihat dari pintu masuk
    facing: 0, // muka panggung menghadap pintu masuk (+Z)
    nama: 'Kapal Pinisi',
    asal: 'Sulawesi Selatan — masyarakat Konjo, Bugis, dan Mandar (Tana Beru, Bira, Bulukumba)',
    periode: 'Layar pinisi dikenal sejak akhir abad ke-19; tradisi perahunya jauh lebih tua',
    bahan: 'Kayu (ulin, bitti, jati), layar kain, tali',
    koordinat: [-5.55, 120.2],
    deskripsiSingkat: 'Kapal layar tradisional Sulawesi Selatan bertiang dua dengan tujuh helai layar.',
    deskripsi:
      'Pinisi adalah kapal layar kayu tradisional dari Sulawesi Selatan yang dikenal dengan dua tiang utama dan tujuh helai layar. Kapal ini dibangun tanpa gambar kerja oleh para pengrajin (panrita lopi) di Tana Beru, Bulukumba, dengan pengetahuan yang diwariskan turun-temurun dan disertai berbagai ritual. Sejak dahulu pinisi dipakai untuk berdagang antarpulau di Nusantara. UNESCO menetapkan seni pembuatan perahu pinisi sebagai Warisan Budaya Takbenda pada 2017.',
    sumber: [
      'https://id.wikipedia.org/wiki/Pinisi',
      'https://ich.unesco.org/en/RL/pinisi-art-of-boatbuilding-in-south-sulawesi-01197',
    ],
    kreditModel: {
      judul: 'pinisi',
      pembuat: 'pakeotak',
      lisensi: 'CC BY 4.0',
      url: 'https://sketchfab.com/3d-models/pinisi-3111ee505bd7422d9d30c9cf9da2a467',
    },
  },
];
