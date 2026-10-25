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
 *  kuis      : (opsional) true → sebelum inspect pertama, muncul mini game tebak asal di peta
 *
 * Khusus model dari file GLB (build: 'gltf', lihat scene/models.js):
 *  model       : path file .glb
 *  modelSize   : panjang sisi mendatar terpanjang dalam meter (skala dinormalisasi otomatis)
 *  modelYaw    : (opsional) rotasi tambahan (radian) kalau arah model aslinya tidak pas
 *  modelHide   : (opsional) nama material yang bagiannya dibuang dari model
 *  kreditModel : { judul, pembuat, lisensi, url } — wajib untuk model berlisensi CC BY
 *
 * Khusus lukisan (build: 'painting', display: 'frame', lihat scene/paintings.js):
 *  gambar       : path file gambar; lebar : lebar kanvas (m), tinggi mengikuti rasio gambar
 *  seniman      : nama pelukis (ditampilkan di panel)
 *  kreditGambar : { judul, pembuat, lisensi, url } — asal file gambar
 *
 *  sekunder  : (opsional) true → koleksi pendukung: bisa diperiksa, tetapi tidak dihitung ke
 *              progres koleksi & tanpa aturan mengamati 3 detik
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
    kuis: true, // mini game tebak asal sebelum inspect (ui/mapQuiz.js)
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
    kuis: true, // mini game tebak asal sebelum inspect (ui/mapQuiz.js)
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
    kuis: true, // mini game tebak asal sebelum inspect (ui/mapQuiz.js)
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
    build: 'gltf',
    model: 'assets/models/indonesia.glb',
    modelSize: 3.5, // lebar peta (m); diperbesar/diperkecil cukup dari sini
    ruang: 'aula',          // Diletakkan di ruang aula awal
    display: 'floor',       // Diletakkan di lantai, tanpa pedestal
    view: { elevation: 50, distance: 0.9 }, // peta rendah → dilihat dari atas supaya pulau-pulaunya terbaca
    position: [0.0, -18.0],   // Posisi diganti di tengah aula
    facing: 0,
    nama: 'Peta Kepulauan Indonesia',
    asal: 'Nusantara',
    periode: 'Era Modern',
    bahan: 'Aset 3D Digital',
    deskripsi: 'Sebuah representasi topografi kepulauan Indonesia dalam gaya low-poly. Menyimbolkan kesatuan nusantara dari Sabang hingga Merauke sebagai pembuka perjalanan menelusuri kekayaan budaya pameran ini.',
    // Lisensi CC BY: nama pembuat & lisensi wajib dicantumkan (tampil di panel inspect)
    kreditModel: {
      judul: 'INDONESIA',
      pembuat: 'Bijahika',
      lisensi: 'CC BY 4.0',
      url: 'https://sketchfab.com/3d-models/indonesia-84f5b344957540a295743def72f1db66',
    },
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
  // ---------- Koleksi pendukung: lukisan ----------
  {
    id: 'lukisan-diponegoro',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/diponegoro.jpg',
    lebar: 2.0,
    ruang: 'lobi',
    position: [-5, 0.1], // dinding belakang lobi, kiri jendela taman (muka dinding z = 0,1)
    facing: 0,
    nama: 'Penangkapan Pangeran Diponegoro',
    seniman: 'Raden Saleh',
    asal: 'Jawa, Hindia Belanda',
    periode: '1857',
    bahan: 'Cat minyak di atas kanvas',
    deskripsi:
      'Lukisan karya Raden Saleh ini menggambarkan penangkapan Pangeran Diponegoro oleh pihak Belanda di Magelang pada 1830, yang mengakhiri Perang Jawa (1825–1830). Berbeda dengan versi pelukis Belanda Nicolaas Pieneman yang menampilkan Diponegoro tertunduk kalah, Raden Saleh melukisnya berdiri tegak dengan wajah tegas di tengah para pengikutnya. Lukisan ini dipersembahkan kepada Raja Willem III dan dikembalikan ke Indonesia pada 1978.',
    sumber: [
      'https://id.wikipedia.org/wiki/Penangkapan_Pangeran_Diponegoro',
    ],
    kreditGambar: {
      judul: 'Raden Saleh - Diponegoro arrest',
      pembuat: 'Wikimedia Commons',
      lisensi: 'Domain publik',
      url: 'https://commons.wikimedia.org/wiki/File:Raden_Saleh_-_Diponegoro_arrest.jpg',
    },
  },
  {
    id: 'lukisan-indonesia-vrij',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/indonesiaFree.jpg',
    lebar: 0.85,
    ruang: 'lobi',
    position: [5, 0.1], // dinding belakang lobi, kanan jendela taman (pasangan Diponegoro)
    facing: 0,
    nama: 'Indonesië vrij (Indonesia Free)',
    seniman: 'Mohammad Hatta',
    asal: 'Belanda, ditulis oleh pelajar Indonesia',
    periode: '1928',
    deskripsi:
      'Mohammad Hatta, pelajar Indonesia di Belanda, adalah ketua Perhimpoenan Indonesia, perhimpunan pelajar Indonesia yang berhaluan nasionalis. Pada 1927 ia dipenjara karena kegiatan politiknya di Belanda. Sebagai pembelaan, dari dalam selnya ia menulis Indonesië vrij (Indonesia Merdeka) yang mengecam penindasan kolonial dan memperjuangkan masa depan ketika rakyat Indonesia bebas dari penjajahan. Tulisan ini diterbitkan tak lama setelah ia dibebaskan.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Indonesi%C3%AB%20vrij%20%28Indonesia%20Free%29'],
    kreditGambar: {
      judul: 'Indonesië vrij (Indonesia Free)',
      pembuat: 'Rijksmuseum',
      lisensi: 'Hak cipta mungkin masih berlaku (cek di Rijksmuseum)',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Indonesi%C3%AB%20vrij%20%28Indonesia%20Free%29',
    },
  },
  {
    id: 'lukisan-reizigers-draagstoelen',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/gezichtIn.jpg',
    lebar: 1.5,
    ruang: 'selasar-barat',
    position: [-10.0, -7], // dinding luar selasar barat, antara bukaan Ruang Wastra & aula
    facing: Math.PI / 2,
    nama: 'Gezicht in een stadje met reizigers in draagstoelen',
    seniman: 'Anonim',
    asal: 'Hindia Belanda',
    periode: '1900–1915',
    deskripsi:
      'Jalan berderet toko di sebuah kota di Hindia Belanda, antara lain "Toko Tosari", dengan para pelancong yang duduk di tandu.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Gezicht%20in%20een%20stadje%20met%20reizigers%20in%20draagstoelen'],
    kreditGambar: {
      judul: 'Gezicht in een stadje met reizigers in draagstoelen',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Gezicht%20in%20een%20stadje%20met%20reizigers%20in%20draagstoelen',
    },
  },
  {
    id: 'lukisan-minangkabau-huis',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/minangkabau.jpg',
    lebar: 1.5,
    ruang: 'selasar-barat',
    position: [-10.0, 1.8], // dinding luar selasar barat, dekat lobi
    facing: Math.PI / 2,
    nama: 'Minangkabau huis op Sumatra',
    seniman: 'Anonim',
    asal: 'Sumatra Barat',
    periode: '± 1895–1915',
    deskripsi:
      'Rumah Minangkabau di Sumatra, Hindia Belanda, dengan para perempuan dan anak-anak di depannya.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Minangkabau%20huis%20op%20Sumatra'],
    kreditGambar: {
      judul: 'Minangkabau huis op Sumatra',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Minangkabau%20huis%20op%20Sumatra',
    },
  },
  {
    id: 'lukisan-benedenstad-batavia',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/benedenstad.jpg',
    lebar: 1.3,
    ruang: 'selasar-barat',
    position: [-7.1, -6], // dinding sisi taman, di antara dua jendela
    facing: -Math.PI / 2,
    nama: 'Benedenstad Batavia',
    seniman: 'Willem Witsen',
    asal: 'Batavia (kini Jakarta)',
    periode: '1870–1923',
    deskripsi:
      'Rumah-rumah tua di tepi air di kota bawah Batavia.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Benedenstad%20Batavia'],
    kreditGambar: {
      judul: 'Benedenstad Batavia',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Benedenstad%20Batavia',
    },
  },
  {
    id: 'lukisan-prambanan',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/tempel.jpg',
    lebar: 1.6,
    ruang: 'selasar-timur',
    position: [10.0, -7], // dinding luar selasar timur, antara bukaan Ruang Pertunjukan & aula
    facing: -Math.PI / 2,
    nama: 'Tempel van Prambanan bij Jogyakarta',
    seniman: 'Anonim',
    asal: 'Yogyakarta',
    periode: '± 1895–1915',
    deskripsi:
      'Candi Prambanan di dekat Yogyakarta, Hindia Belanda.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Tempel%20van%20Prambanan%20bij%20Jogyakarta'],
    kreditGambar: {
      judul: 'Tempel van Prambanan bij Jogyakarta',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Tempel%20van%20Prambanan%20bij%20Jogyakarta',
    },
  },
  {
    id: 'lukisan-landarbeiders-koffie',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/indonesische.jpg',
    lebar: 1.6,
    ruang: 'selasar-timur',
    position: [10.0, 1.8], // dinding luar selasar timur, dekat lobi
    facing: -Math.PI / 2,
    nama: 'Indonesische landarbeiders planten koffieplanten op een veld',
    seniman: 'Anonim',
    asal: 'Hindia Belanda',
    periode: '± 1890–1910',
    deskripsi:
      'Para buruh tani Indonesia menanam bibit kopi di sebuah ladang.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Indonesische%20landarbeiders%20planten%20koffieplanten%20op%20een%20veld'],
    kreditGambar: {
      judul: 'Indonesische landarbeiders planten koffieplanten op een veld',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Indonesische%20landarbeiders%20planten%20koffieplanten%20op%20een%20veld',
    },
  },
  {
    id: 'lukisan-vrouwen-offers',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/vrouwenBauer.jpg',
    lebar: 0.8,
    ruang: 'selasar-timur',
    position: [7.1, -6], // dinding sisi taman, di antara dua jendela
    facing: Math.PI / 2,
    nama: 'Indonesische vrouwen met offers',
    seniman: 'Marius Bauer',
    asal: 'Indonesia',
    periode: '1925',
    bahan: 'Halaman buku sketsa',
    deskripsi:
      'Para perempuan Indonesia membawa sesaji dan mengenakan bunga di rambut, sementara beberapa sosok di latar depan dan belakang menonton. Kemungkinan mereka bagian dari sebuah upacara persembahan. Karya ini adalah halaman 108 dari buku sketsa berisi 74 lembar.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Indonesische%20vrouwen%20met%20offers'],
    kreditGambar: {
      judul: 'Indonesische vrouwen met offers',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Indonesische%20vrouwen%20met%20offers',
    },
  },
  {
    id: 'lukisan-hollandse-koopman',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/hollandse.jpg',
    lebar: 1.6,
    ruang: 'aula',
    position: [-10.0, -15], // dinding barat aula, dekat pintu taman
    facing: Math.PI / 2,
    nama: 'Hollandse koopman met twee tot slaaf gemaakte mannen in heuvellandschap',
    seniman: 'Anonim',
    asal: 'Indonesia atau India (tidak pasti)',
    periode: '1700–1725',
    deskripsi:
      'Seorang pria Belanda dan seorang perempuan Asia berjalan berdampingan, diikuti dua pria yang diperbudak dalam keadaan terbelenggu. Sang perempuan mengenakan sarung dan kebaya. Sang pria memakai jas merah selutut yang di Eropa disebut justaucorps, dengan saku yang letaknya sangat rendah khas mode awal abad ke-18, pedang pendek di pinggang, topi, tongkat rotan, dan sepatu bergesper perak, satu-satunya di rombongan itu yang bersepatu. Tidak jelas apakah kedua pria yang diperbudak berasal dari Afrika atau Asia. Rombongan ditutup tiga penjaga Asia berpakaian biru yang bersenjata pedang pendek dan tombak, dengan latar pegunungan tropis, mungkin di Indonesia atau India. Wajah sang pria dan perempuan pernah digores tanda silang dengan benda tajam. Lukisan ini masih berada dalam bingkai kayu aslinya.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Hollandse%20koopman%20met%20twee%20tot%20slaaf%20gemaakte%20mannen%20in%20heuvellandschap'],
    kreditGambar: {
      judul: 'Hollandse koopman met twee tot slaaf gemaakte mannen in heuvellandschap',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Hollandse%20koopman%20met%20twee%20tot%20slaaf%20gemaakte%20mannen%20in%20heuvellandschap',
    },
  },
  {
    id: 'lukisan-twee-afbeeldingen',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/twee.jpg',
    lebar: 0.9,
    ruang: 'aula',
    position: [-10.0, -18], // dinding barat aula, tengah
    facing: Math.PI / 2,
    nama: 'Twee afbeeldingen van woningen in Indonesië',
    seniman: 'Anonim',
    asal: 'Indonesia',
    periode: '1830–1880',
    deskripsi:
      'Dua gambar dalam satu lembar. Gambar atas menampilkan seorang pria memanggul senjata, dengan tiga bangunan berkubah di sebelah kirinya. Gambar bawah menampilkan dua sosok di dekat tembok rendah yang mengelilingi sebuah bangunan persegi panjang.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Twee%20afbeeldingen%20van%20woningen%20in%20Indonesi%C3%AB'],
    kreditGambar: {
      judul: 'Twee afbeeldingen van woningen in Indonesië',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Twee%20afbeeldingen%20van%20woningen%20in%20Indonesi%C3%AB',
    },
  },
  {
    id: 'lukisan-gayo-road',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/soldiersGayo.jpg',
    lebar: 1.5,
    ruang: 'aula',
    position: [-10.0, -21], // dinding barat aula, dekat ruang pusaka
    facing: Math.PI / 2,
    nama: 'Soldiers on the Gayo Road',
    seniman: 'Anonim',
    asal: 'Aceh (dahulu bagian Sumatra Utara)',
    periode: '1910–1913',
    bahan: 'Foto dalam album',
    deskripsi:
      'Sekelompok tentara di Jalan Gayo. Foto kecil yang ditempel dalam album berisi 87 foto tentang pembangunan Jalan Gayo di Sumatra bagian utara, antara Bireuen dan Takengon, pada 1903–1914.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Soldiers%20on%20the%20Gayo%20Road'],
    kreditGambar: {
      judul: 'Soldiers on the Gayo Road',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Soldiers%20on%20the%20Gayo%20Road',
    },
  },
  {
    id: 'lukisan-conquest-palembang',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/conquestPalembang.jpg',
    lebar: 2.2,
    ruang: 'aula',
    position: [-5, -23.9], // dinding belakang aula, kiri pintu ruang pusaka
    facing: 0,
    nama: 'Conquest of Palembang, Sumatra in Indonesia, by Lieutenant-General De Kock, June 24, 1821',
    seniman: 'Louis Meijer',
    asal: 'Palembang, Sumatra Selatan',
    periode: '1857',
    deskripsi:
      'Inggris berusaha mempertahankan pengaruhnya di Sumatra dengan mendukung perlawanan Kesultanan Palembang terhadap Belanda. Pada 1821, ekspedisi militer di bawah pimpinan Jenderal H.M. de Kock (1779–1845) berhasil merebut keraton sang sultan. Sultan beserta keluarganya ditawan, harta mereka disita dan dibagi sebagai rampasan perang, dan beberapa tahun kemudian kesultanan itu dibubarkan. Louis Meijer (1809–1866) dipesan oleh keluarga De Kock untuk melukis peristiwa ini tiga puluh enam tahun kemudian, berdasarkan sketsa P. le Comte, perwira angkatan laut yang ikut dalam penaklukan Palembang.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Conquest%20of%20Palembang%2C%20Sumatra%20in%20Indonesia%2C%20by%20Lieutenant-General%20De%20Kock%2C%20June%2024%2C%201821'],
    kreditGambar: {
      judul: 'Conquest of Palembang, Sumatra in Indonesia, by Lieutenant-General De Kock, June 24, 1821',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Conquest%20of%20Palembang%2C%20Sumatra%20in%20Indonesia%2C%20by%20Lieutenant-General%20De%20Kock%2C%20June%2024%2C%201821',
    },
  },
  {
    id: 'lukisan-personificatie-voc',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/personificationVOC.jpg',
    lebar: 1.0,
    ruang: 'aula',
    position: [5, -23.9], // dinding belakang aula, kanan pintu ruang pusaka
    facing: 0,
    nama: 'Personification of the VOC Receiving Gifts',
    seniman: 'Jan Caspar Philips',
    asal: 'Asia Tenggara (gambaran Belanda)',
    periode: '1730',
    deskripsi:
      'Gambaran lanskap Asia dengan sosok VOC yang dipersonifikasikan di latar depan, bermahkota dan memegang tongkat kerajaan. Ia menerima persembahan dari penduduk setempat. Di kanan depan, dua putti (malaikat kecil) berada di dekat peta sebagian Asia Tenggara. Judulnya tertulis dalam bahasa Belanda di dalam bingkai.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Personification%20of%20the%20VOC%20Receiving%20Gifts'],
    kreditGambar: {
      judul: 'Personification of the VOC Receiving Gifts',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Personification%20of%20the%20VOC%20Receiving%20Gifts',
    },
  },
  {
    id: 'lukisan-vrijlating-sjahrir',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/vrijlating.jpg',
    lebar: 1.5,
    ruang: 'aula',
    position: [10.0, -21], // dinding timur aula, dekat ruang pusaka
    facing: -Math.PI / 2,
    nama: 'Vrijlating Sutan Sjahrir',
    seniman: 'Associated Press',
    asal: 'Jakarta (Bandara Kemayoran)',
    periode: '18 Januari 1949',
    bahan: 'Foto pers',
    deskripsi:
      'Sutan Sjahrir, mantan perdana menteri Indonesia, dibebaskan dari pengasingannya di Sumatra dan tiba di Bandara Kemayoran untuk berunding dengan Drees. Ia dijemput oleh P. Koets, kepala kabinet Beel.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Vrijlating%20Sutan%20Sjahrir'],
    kreditGambar: {
      judul: 'Vrijlating Sutan Sjahrir',
      pembuat: 'Rijksmuseum',
      lisensi: 'Hak cipta mungkin masih berlaku (cek di Rijksmuseum)',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Vrijlating%20Sutan%20Sjahrir',
    },
  },
  {
    id: 'lukisan-postzegel',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/postzegel.jpg',
    lebar: 1.0,
    ruang: 'aula',
    position: [10.0, -18], // dinding timur aula, tengah
    facing: -Math.PI / 2,
    nama: 'Postzegel Republik Indonesia',
    seniman: 'Staatsdruckerei Wien',
    asal: 'Republik Indonesia',
    periode: '1949',
    bahan: 'Perangko',
    deskripsi:
      'Perangko Republik Indonesia tahun 1949 yang dicetak oleh Staatsdruckerei, percetakan negara di Wina.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Postzegel%20Republik%20Indonesia'],
    kreditGambar: {
      judul: 'Postzegel Republik Indonesia',
      pembuat: 'Rijksmuseum',
      lisensi: 'Domain publik',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Postzegel%20Republik%20Indonesia',
    },
  },
  {
    id: 'lukisan-militairen',
    build: 'painting',
    display: 'frame',
    sekunder: true,
    gambar: 'assets/paintings/militairen.jpg',
    lebar: 1.1,
    ruang: 'aula',
    position: [10.0, -15], // dinding timur aula, dekat pintu taman
    facing: -Math.PI / 2,
    nama: 'Militairen bewaken een weg te Indonesië',
    seniman: 'Vincent Samuel Mentzel',
    asal: 'Indonesia',
    periode: '± 1982–1992',
    bahan: 'Foto',
    deskripsi:
      'Para tentara menjaga sebuah jalan di Indonesia.',
    sumber: ['https://www.rijksmuseum.nl/en/collection/search?query=Militairen%20bewaken%20een%20weg%20te%20Indonesi%C3%AB'],
    kreditGambar: {
      judul: 'Militairen bewaken een weg te Indonesië',
      pembuat: 'Rijksmuseum',
      lisensi: 'Hak cipta mungkin masih berlaku (cek di Rijksmuseum)',
      url: 'https://www.rijksmuseum.nl/en/collection/search?query=Militairen%20bewaken%20een%20weg%20te%20Indonesi%C3%AB',
    },
  },
];
