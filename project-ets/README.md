# Project ETS - Interactive Museum

## Identitas

| Nama | NRP |
| --- | --- |
| Nyoman Surya Hutama Andyartha | 5025241093 |
| Willy Dava Nugraha | 5025241090 |


## Museum Interaktif 3D — Jelajah Budaya Nusantara

Proyek aplikasi web 3D interaktif berbasis **Three.js** untuk tugas praktikum Grafika Komputer (ETS). Proyek ini mensimulasikan kunjungan museum virtual bertema kebudayaan dan kekayaan nusantara dengan sudut pandang orang pertama (*First-Person View*), sistem pencahayaan dinamis, efek visual (VFX), mode inspeksi artefak interaktif, serta mini-game edukasi peta Indonesia (*GeoGuessr-style*).

---

## Fitur Utama

### 1. Eksplorasi First-Person Realistis
- **Walk Controls**: Kontrol navigasi berjalan halus (WASD), lari (*Shift*), melompat (*Spasi* dengan simulasi gravitasi), serta kontrol rotasi pandangan mouse (*pitch* & *yaw*).
- **Collision Detection & Bounding Boxes**: Deteksi tabrakan fisik dengan dinding bangunan, kusen pintu, batas halaman, dan dudukan artefak sehingga pemain tidak menembus objek.
- **Surface-Aware Footstep Audio**: Efek suara langkah kaki yang responsif dan berubah bergantung pada material permukaan lantai (paving batu, kayu jati, tegel, rumput).

### 2. Arsitektur & Lingkungan Bergaya Nusantara
- **Tata Letak Ruangan Tradisional**:
  - **Area Luar & Loket Tiket**: Gerbang masuk, loket karcis, jalan setapak paving, halaman rumput luas, dan taman kamboja.
  - **Fasad & Serambi**: Atap limasan kayu, saka/tiang serambi, dan pintu masuk interaktif.
  - **Lobi Utama**: Titik awal penyambutan yang memamerkan model megah Kapal Pinisi.
  - **Selasar Barat & Timur**: Lorong berpenerangan hangat dengan jendela menghadap taman tengah serta deretan galeri lukisan bersejarah.
  - **Ruang Wastra**: Galeri tekstil tradisional nusantara.
  - **Ruang Pertunjukan**: Galeri instrumen musik tradisional berbagai daerah.
  - **Taman Tengah (Courtyard Terbuka)**: Area tengah beratap langit terbuka dengan kolam bunga teratai, pohon kamboja, dan bangku taman.
  - **Aula Utama**: Ruangan termegah dengan konstruksi **4 Soko Guru** dan plafon **Tumpang Sari** bertingkat, menjadi tempat pameran Peta Kepulauan Indonesia.
  - **Ruang Pusaka**: Ruang khidmat dengan pencahayaan temaram untuk koleksi senjata adat dan pusaka sakral.

### 3. Koleksi Pameran & Artefak Terintegrasi

| Kategori | Koleksi / Artefak | Asal & Keterangan |
| :--- | :--- | :--- |
| **Pusaka & Senjata Tradisional** | **Keris** | Jawa (Bilah berpamor, warisan mahakarya UNESCO) |
| | **Mandau** | Kalimantan (Suku Dayak, parang berukir kumpang rotan) |
| | **Bara Sangihe** | Kepulauan Sangihe, Sulawesi Utara (Ujung bilah bercabang) |
| | **Salawaku** | Maluku (Perisai kayu bertatah keping kerang) *(Fitur Kuis Peta)* |
| | **Busur & Panah** | Papua (Senjata kayu gelagah dan bambu tradisi berburu/perang) |
| **Wastra & Tekstil Tradisional** | **Ulos Batak** | Sumatera Utara (Kain sakral tradisi mangulosi) |
| | **Kain Cual** | Bangka Belitung (Tenun benang emas pengaruh Melayu-Tionghoa) |
| | **Songket** | Palembang, Minangkabau, Riau, Lombok (Kain tenun mewah berkilau) |
| | **Sasirangan** | Kalimantan Selatan / Banjar (Teknik jelujur rintang warna) *(Fitur Kuis Peta)* |
| | **Tenun Ikat Sumba** | NTT (Pewarna alami mengkudu/indigo bermotif fauna) |
| **Alat Musik Tradisional** | **Sasando** | Rote Ndao, NTT (Alat musik petik beresonator daun lontar) *(Fitur Kuis Peta)* |
| | **Tehyan** | Betawi, DKI Jakarta (Gesek dawai dua beresonator batok kelapa) |
| | **Tifa** | Maluku & Papua (Gendang kayu membran kulit hewan) |
| | **Talempong** | Minangkabau, Sumatera Barat (Gong kecil logam di atas rancak) |
| | **Serune Kalee** | Aceh (Alat musik tiup kayu berujung corong dan cincin kuningan) |
| **Model 3D Unggulan (GLTF/GLB)** | **Kapal Pinisi** | Tana Beru, Bulukumba, Sulsel (Perahu layar bertiang dua, warisan UNESCO) |
| | **Peta Kepulauan Indonesia** | Topografi 3D kepulauan nusantara dari Sabang sampai Merauke |
| **Galeri Lukisan Bersejarah** | *Penangkapan Diponegoro* (Raden Saleh), *Indonesië Vrij* (Bung Hatta), dan lukisan era Hindia Belanda lainnya | Lukisan berbingkai kanvas di dinding selasar dan lobi |

### 4. Mode Inspeksi Artefak 3D (*Inspect Mode*)
- Transisi kamera halus (*ease-in-out tweening*) mendekati artefak yang dipilih.
- Kontrol rotasi 360° dan perbesaran/zoom (*OrbitControls*) untuk mengamati detail tekstur dan geometri objek.
- Panel informasi komprehensif: menampilkan nama objek, daerah asal, periode sejarah, bahan, deskripsi mendalam, serta sumber literatur edukatif.
- Aturan waktu mengamati minimal 3 detik untuk mencatat pemahaman artefak ke dalam sistem progres.

### 5. Mini-Game Kuis Tebak Asal Peta (*GeoGuessr Indonesia*)
- Muncul pada artefak tertentu saat pertama kali diperiksa (seperti *Sasando*, *Sasirangan*, *Salawaku*).
- Menampilkan kanvas peta vektor kepulauan Indonesia interaktif dengan sistem koordinat bumi (Equirectangular).
- Pemain menebak asal daerah artefak dengan meletakkan pin penanda.
- Perhitungan jarak menggunakan formula geodesi **Haversine** dan pemberian skor dinamis eksponensial (maksimal 5.000 poin).

### 6. Quest Progression, Achievements, & Easter Egg
- **Sistem Quest Real-Time**: Alur perjalanan mulai dari membeli tiket di loket, membuka pintu depan, menjelajahi seluruh 8 ruangan, hingga menuntaskan semua inspeksi artefak.
- **Layar Penyelesaian (Completion Screen)**: Menampilkan statistik waktu jelajah, persentase koleksi, skor rata-rata kuis peta, dan taburan efek partikel kelopak bunga berguguran.
- **Batu Rahasia (Easter Egg Secret Stone)**: Monumen tersembunyi di taman yang akan menyala aktif setelah seluruh misi dan lukisan selesai dijelajahi.

### 7. Grafika Komputer Lanjut & Optimasi Performa
- **Pencahayaan & Bayangan**: *Directional Light* (simulasi matahari sore/golden hour), *Ambient Light*, *Light Pool Management* dinamis untuk lampu ruangan, serta *PCF Soft Shadow Map*.
- **Efek Visual (VFX)**:
  - Partikel kunang-kunang (*Firefly Particles*) beterbangan di taman malam hari.
  - Animasi air kolam teratai bergelombang (*scrolling normal maps* & *expanding water ripples*).
  - Partikel kelopak bunga jatuh (*InstancedMesh Petals*).
- **Optimasi Geometri**: Menggunakan penggabungan mesh statis (`mergeStatic`) untuk meminimalisasi *WebGL draw calls*, kompresi model 3D (`MeshoptDecoder`), dan panel pemantau FPS/performa (*PerfOverlay*).
- **Tata Suara Lengkap**: Musik latar gamelan/tradisional dinamis yang otomatis meredup (*audio ducking*) saat membaca panel informasi atau bermain kuis.

---

## Kontrol Permainan

| Tombol / Aksi | Fungsi |
| :--- | :--- |
| **W, A, S, D** atau **Tombol Panah** | Bergerak Maju, Kiri, Mundur, dan Kanan |
| **Shift (Tahan)** | Berlari lebih cepat |
| **Spasi** | Melompat |
| **Tahan Klik Kiri + Geser Mouse** | Mengarahkan pandangan / Menoleh (Pitch & Yaw) |
| **Arahkan Kursor (Hover)** | Menyorot objek/artefak interaktif dengan efek glow/reticle |
| **Klik Kiri pada Artefak / Loket** | Berinteraksi (Beli tiket, buka pintu, masuk mode inspeksi) |
| **Scroll Mouse (Mode Inspect)** | Memperbesar / Memperkecil tampilan artefak (Zoom In/Out) |
| **Klik & Seret (Mode Inspect)** | Memutar artefak 360° |
| **Esc** / **Tombol Tutup** | Keluar dari mode inspeksi artefak / Membuka Menu Pause |
| **Tab / P** | Membuka Menu Pause & Pengaturan |
| **F3** | Mengaktifkan/menonaktifkan panel overlay performa (FPS, Draw Calls, Triangles) |

---

## Struktur Direktori

```text
├── assets/
│   ├── audio/              # File audio BGM dan SFX
│   ├── models/             # File model 3D format GLB (indonesia.glb, pinisi.glb)
│   ├── paintings/          # Tekstur kanvas lukisan bersejarah Resolusi Tinggi
│   └── easter-egg/         # Dokumen/aset khusus easter egg taman
├── audio/
│   ├── footsteps.js        # Logika SFX langkah kaki berdasarkan jenis material
│   ├── music.js            # Sistem playlist BGM, crossfade, dan volume ducking
│   └── sfx.js              # Synthesizer efek suara interaksi UI (Web Audio API)
├── controls/
│   └── walkControls.js     # First-person camera navigation, jumping, & collision
├── data/
│   ├── artifacts.js        # Database koleksi artefak, deskripsi, koordinat, dan kuis
│   ├── mapIndonesia.js     # Data koordinat poligon vektor pulau & batas peta Indonesia
│   └── music.js            # Metadata track musik latar
├── game/
│   ├── hover.js            # Sistem raycaster pointer untuk deteksi objek terdekat
│   ├── inspect.js          # State machine & kamera OrbitControls saat inspeksi artefak
│   ├── progress.js         # State tracking quest, tiket, koleksi, dan achievements
│   └── roomTracker.js      # Deteksi posisi pemain berbasis poligon ruangan
├── scene/
│   ├── artifacts/          # Generator prosedural 3D artefak (keris, mandau, sasando, dsb.)
│   ├── textiles/           # Model 3D gantungan dan kain wastra
│   ├── vfx/                # Efek visual partikel (fireflies, ripples, petals)
│   ├── aula.js             # Konstruksi aula soko guru & atap tumpang sari
│   ├── building.js         # Generator dinding, lantai, plafon, dan collider ruangan
│   ├── courtyard.js        # Kolam teratai, panggung pelataran, bangku taman
│   ├── exhibits.js         # Pengatur tata letak pajangan, pedestal, dan galeri dinding
│   ├── layout.js           # Definisi denah ruangan 2D/3D (Rooms & Walls)
│   ├── lightPool.js        # Manajer pencahayaan titik dinamis
│   ├── models.js           # GLTF Loader dengan MeshoptDecoder
│   └── outdoor.js          # Langit sore, tanah rumput, dan lanskap luar
├── ui/
│   ├── banner.js           # Banner nama ruangan yang muncul saat melangkah masuk
│   ├── dialog.js           # Kotak dialog percakapan dengan petugas loket
│   ├── inspectPanel.js     # Panel drawer informasi sejarah & budaya artefak
│   ├── mapQuiz.js          # Komponen UI mini-game tebak peta Indonesia
│   ├── pauseMenu.js        # Menu jeda, panduan kontrol, dan audio settings
│   └── perfOverlay.js      # Pemantau FPS dan statistik rendering Three.js
├── index.html              # Entry point HTML & import map Three.js (ES Module)
├── main.js                 # Core engine loop, scene initialization, & state integration
├── style.css               # Desain antarmuka responsif, tipografi, & glassmorphism
└── README.md               # Dokumentasi proyek
```

---

## Cara Menjalankan Proyek

Aplikasi ini dibangun menggunakan modul JavaScript murni (**ES Modules**) yang mengambil Three.js langsung melalui CDN `importmap`, sehingga **tidak membutuhkan instalasi npm atau bundler khusus**. Namun, browser mewajibkan protokol HTTP/HTTPS (bukan `file:///`) untuk memuat aset tekstur dan modul 3D.

### Opsi 1: Menggunakan VS Code Live Server (Paling Praktis)
1. Buka folder proyek ini di **Visual Studio Code**.
2. Pasang ekstensi **Live Server** (oleh Ritwick Dey) jika belum terpasang.
3. Klik kanan pada file [`index.html`](file:///c:/Users/danto/Downloads/its-kuliah/its-kuliah-smt5/grafkom_computer-graphics_pak-darlis/nodrive-github-grafkom/project-ets/index.html) lalu pilih **"Open with Live Server"**.
4. Browser akan terbuka secara otomatis di alamat `http://127.0.0.1:5500`.

### Opsi 2: Menggunakan Python HTTP Server
Jika Anda memiliki Python yang terpasang di komputer:
```bash
# Jalankan perintah ini di dalam direktori proyek
python -m http.server 8000
```
Buka peramban web dan akses: `http://localhost:8000`.

### Opsi 3: Menggunakan Node.js `npx serve`
```bash
npx serve .
```

---

## Teknologi yang Digunakan
- **HTML5 & Vanilla CSS3**: Struktur tata letak, styling responsif modern dengan efek glassmorphism, dan transisi UI yang halus.
- **JavaScript (ES6+ Modules)**: Logika game terstruktur berbasis modul tanpa kompilasi bundler.
- **Three.js (r170)**: Library WebGL rendering untuk memproses scene 3D, material PBR (MeshStandardMaterial/MeshPhysicalMaterial), pencahayaan bayangan, serta kamera perspektif.
- **Three.js Addons**: `OrbitControls`, `GLTFLoader`, `MeshoptDecoder`, `BufferGeometryUtils`.
- **Web Audio API**: Pemutaran musik latar, crossfade volume, serta sintesis efek suara interaktif.

---

## Kredit & Lisensi Aset
- **Kapal Pinisi 3D Model**: Dibuat oleh *pakeotak* di Sketchfab ([Lisensi CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
- **Peta Indonesia 3D Model**: Dibuat oleh *Bijahika* di Sketchfab ([Lisensi CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
- **Lukisan Bersejarah**: Berasal dari domain publik dan repositori terbuka Wikimedia Commons & Rijksmuseum.
- **Informasi & Sejarah Budaya**: Dirangkum dari referensi edukasi Wikipedia Indonesia, Kemendikbudristek, dan dokumentasi Warisan Budaya Takbenda UNESCO.
