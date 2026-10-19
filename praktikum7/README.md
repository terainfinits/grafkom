# Praktikum 07 — Interactive 3D Web Prototype (The Archive)

## Identitas

| Nama | NRP |
| --- | --- |
| Nyoman Surya Hutama Andyartha | 5025241093 |
| Willy Dava Nugraha | 5025241090 |

---

# Deskripsi

Aplikasi web 3D interaktif tingkat lanjut berbasis **Three.js** (`0.180.0`) dengan konsep visual bertema *"The Archive"*. Praktikum ini memperluas materi dasar Three.js (dari Praktikum 06) ke ranah rendering modern: **pemuatan model 3D eksternal (GLTF/GLB) beserta hierarki skeletal dan animasi (`AnimationMixer`)**, **pencahayaan berbasis citra (Image-Based Lighting / IBL via HDR & PMREM)**, **material PBR lanjutan (`MeshPhysicalMaterial` dengan transmisi kaca)**, **hierarki scene graph bertingkat (Sistem Tata Surya & Parent-Child Glass Group)**, **post-processing (`EffectComposer`, `UnrealBloomPass`)**, serta **interaksi picking objek (`Raycaster`) yang komprehensif**.

Aplikasi menyediakan antarmuka panel kontrol lengkap (Model, Kamera, Orbit Controls, Pencahayaan, Environment HDR, Material PBR, Bloom/Post-FX, dan Animasi) serta dukungan drag-and-drop file `.glb` kustom secara instan di browser.

---

## Tujuan Pembelajaran

- Memahami alur pemuatan dan penanganan aset 3D eksternal format **GLTF / GLB** menggunakan `GLTFLoader`.
- Menguasai pemutaran, blending (`fadeIn`/`fadeOut`), dan pengaturan kecepatan animasi menggunakan **`AnimationMixer`** dan **`AnimationClip`**.
- Memahami konsep **Scene Graph & Transform Hierarchy** bertingkat (independensi transformasi lokal vs dunia, seperti orbit Bumi mengitari Matahari dan Bulan mengitari Bumi).
- Mengimplementasikan pencahayaan berbasis lingkungan (**IBL / Environment Map**) dari file format **HDR equirectangular** melalui `HDRLoader` dan `PMREMGenerator`.
- Memahami material PBR tingkat lanjut, khususnya parameter `roughness`, `metalness`, dan sifat optik kaca (`MeshPhysicalMaterial` dengan `transmission`, `thickness`, dan `ior`).
- Mengimplementasikan pipeline **Post-Processing** menggunakan `EffectComposer`, `RenderPass`, `UnrealBloomPass`, dan `OutputPass`.
- Menerapkan interaksi raycasting presisi (hover & click selection) dengan penanda visual (emissive highlight dan scale feedback), serta menampilkan inspeksi transformasi objek pada HUD/Inspector.

---

## 1. Struktur File

| File / Folder | Isi & Peran |
|---|---|
| `index.html` | Struktur antarmuka: viewport 3D, HUD metrik performa (FPS, Triangles, Objects), Inspector transform, panel kontrol modular, dan import map Three.js |
| `style.css` | Tata letak responsif dan desain tema *The Archive* (palet warna ink, paper, brass, dark slate) |
| `main.js` | Logika utama: scene, kamera, renderer, hierarki scene graph, loaders (GLTF & HDR), post-processing bloom, raycasting, event listener, dan animation loop |
| `Duck.glb` | Model GLB default (Duck) |
| `assets/models/` | Koleksi model GLTF sampel: `Fox.glb` (3 animasi), `CesiumMan.glb` (walk cycle), dan `DamagedHelmet.glb` (PBR detail) |
| `assets/` | Peta lingkungan HDR 1K: `studio_small_09_1k.hdr` dan `ladybrand_heritage_house_1k.hdr` |
| `CREDITS.md` | Sumber dan atribusi lisensi aset (Khronos Group, Poly Haven, Three.js) |
| `README.md` | Dokumentasi teknis praktikum |

Three.js dimuat via CDN menggunakan **Import Map**:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/"
    }
  }
</script>
<script type="module" src="./main.js"></script>
```

> **Penting**: Karena menggunakan ES Module dan melakukan pemuatan aset eksternal (HDR, GLB), halaman **harus dibuka melalui server HTTP lokal** (bukan protokol `file://`).

---

## 2. Pemuatan Model GLTF / GLB & Animasi

### GLTFLoader & Penyesuaian Otomatis
Pemuatan model 3D dilakukan secara asinkron menggunakan `GLTFLoader`:
- **Auto-Fit Normalization (`fitImportedModel`)**: Menghitung bounding box objek via `THREE.Box3` untuk menyamakan skala model ke ukuran seragam (target size ~1.8 unit) dan memusatkan posisi tepat di atas lantai secara dinamis tanpa perlu hardcode koordinat tiap model yang berbeda.
- **Validasi Vertex Normal**: Model tertentu (misalnya `Fox.glb`) tidak menyertakan data atribut normal permukaan. Kode secara otomatis mendeteksi dan mengeksekusi `geometry.computeVertexNormals()` serta menonaktifkan `flatShading` untuk mencegah nilai `NaN` pada kalkulasi shader pencahayaan yang dapat merusak pass bloom (layar hitam).
- **Custom Upload & Drag-and-Drop**: Pengguna dapat mengunggah file `.glb` lokal atau langsung men-drag file ke area viewport. File dibaca menggunakan `URL.createObjectURL(file)`.

### Sistem Animasi (`AnimationMixer`)
- Objek `THREE.AnimationMixer` dihubungkan ke root hierarki model GLB.
- Animasi dimainkan menggunakan `mixer.clipAction(clip)`.
- Peralihan antar aksi (clip 1, 2, 3) menggunakan transisi halus `fadeOut(0.2)` dan `fadeIn(0.2)`.
- Model tanpa animasi bawaan (seperti Duck atau model custom statis) secara dinamis diberikan **Fallback Animations** (Idle, Walk, Run berbasis rotasi keyframe track procedural).
- Kecepatan playback dapat diatur secara real-time lewat slider `animSpeedControl` via `mixer.timeScale`.

---

## 3. Hierarki Scene Graph (Sistem Bertingkat)

Scene graph mengorganisasikan transformasi ruang dalam struktur pohon induk-anak (*Parent-Child Relationship*), di mana transformasi lokal anak dipengaruhi oleh matriks transformasi induknya di ruang dunia (*world space*):

### A. Parent-Child Glass Group
- Terdiri dari kubus induk berbahan kaca transparan (`MeshPhysicalMaterial`) dan bola anak bercahaya (`MeshStandardMaterial` dengan emissive).
- Ketika group induk berotasi pada sumbu Y, bola anak ikut berputar mengelilingi pusat induk sambil tetap mempertahankan posisi offset lokalnya `(1, 0.9, 0)`.

### B. Mini Solar System (Sun - Earth - Moon)
Memperagakan relasi transformasi hierarki multi-tingkat:
```
solarSystem (Group)
  ├── sun (Mesh - Emissive & PointLight)
  └── earthOrbit (Group - rotasi orbit bumi)
        ├── earth (Mesh - rotasi rotasi diri bumi)
        └── moonOrbit (Group - rotasi orbit bulan mengitari bumi)
              └── moon (Mesh)
```
- **Matahari (Sun)**: Pusat sistem dengan material emissive + `PointLight`.
- **Orbit Bumi (earthOrbit)**: Berotasi terhadap Matahari; membawa Bumi dan seluruh sistem bulan.
- **Bulan (Moon)**: Menjadi child dari `moonOrbit` yang diposisikan relatif terhadap posisi lokal Bumi. Saat Bumi bergerak mengitari Matahari, Bulan otomatis terbawa mengelilingi Bumi tanpa perhitungan trigonometri manual yang rumit di ruang dunia.

---

## 4. Material PBR & Environment Map (HDR)

### Galeri PBR & MeshPhysicalMaterial
- **PBR Matrix Gallery**: Koleksi matriks bola interaktif yang memvariasikan nilai `roughness` (0.1, 0.5, 0.9) dan `metalness` (0, 0.5, 1.0) untuk mendemonstrasikan spektrum respons pencahayaan standar PBR. Nilai ini juga dapat diatur global melalui slider panel kontrol.
- **Silver Mirror Sphere**: Sampel bola krom khusus (`metalness = 1.0`, `roughness = 0.08`) untuk menguji kejernihan pantulan lingkungan.
- **Material Kaca Fisik**: Kubus induk memanfaatkan `MeshPhysicalMaterial` dengan `transmission: 0.95`, `thickness: 1.4`, dan `ior: 1.45` untuk mensimulasikan refraksi kaca optik realistis.

### Image-Based Lighting (IBL) via HDR & PMREM
- Lingkungan 360° dimuat dari file HDR format equirectangular (`studio_small_09_1k.hdr` dan `ladybrand_heritage_house_1k.hdr`) menggunakan `HDRLoader`.
- `THREE.PMREMGenerator` memproses tekstur HDR menjadi *Pre-filtered Mipmapped Radiance Environment Map* yang dioptimalkan untuk refleksi diffuse dan specular PBR.
- Disediakan juga opsi fallback **Panorama Procedural** yang digambar langsung ke HTML Canvas jika koneksi aset HDR terputus.
- **Independensi Panorama & Refleksi**: Background visual (panorama 360) dan refleksi material (environment lighting) dapat dihidupkan/dimatikan secara independen melalui tombol `P` dan `E`.

---

## 5. Post-Processing Pipeline (Bloom FX)

Pewarnaan dan efek visual diolah melalui pipeline `EffectComposer`:

```
WebGLRenderer ──> RenderPass ──> UnrealBloomPass ──> OutputPass ──> Layar
```

1. **`RenderPass`**: Menangkap hasil render scene dan kamera aktif.
2. **`UnrealBloomPass`**: Menghasilkan efek pendar cahaya (*glow*) pada objek dengan nilai emissive tinggi (seperti Matahari dan bola child) tanpa mempengaruhi material non-emissive. Slider memungkinkan pengaturan `bloom strength`, `bloom radius`, dan `emissive intensity`.
3. **`OutputPass`**: Memastikan konversi ruang warna (*color space*) sRGB dan tone mapping (`ACESFilmicToneMapping`) diterapkan dengan benar pada tahap akhir komposisi.
4. **`preserveDrawingBuffer: true`**: Dikonfigurasi pada renderer agar pembacaan buffer canvas pada fitur screenshot PNG tidak menghasilkan layar hitam.

---

## 6. Kamera, Kontrol, dan Picking Objek

### Dual Camera & Preset Tampilan
- Mendukung peralihan instan antara **PerspectiveCamera** (FOV 20°–100°) dan **OrthographicCamera** dengan sinkronisasi posisi, rotasi, target orbit, serta koreksi aspect ratio saat jendela di-resize.
- **Preset Sudut Pandang**: Tombol *Front*, *Side*, *Top*, dan *Iso* memindahkan kamera menggunakan transisi interpolasi halus (*smooth tween lerp*) dengan fungsi easing kubik.

### Raycasting & Object Inspector
- `THREE.Raycaster` melacak koordinat kursor mouse dalam format *Normalized Device Coordinates* (NDC: −1 hingga +1).
- **Hover Feedback**: Objek yang disorot mouse akan membesar halus (skala 1.06×) dan memancarkan pendar emissive sementara.
- **Click Selection & Inspector**: Mengklik objek akan memilihnya (skala 1.12×) dan memperbarui panel **INSPECTOR** secara real-time dengan rincian:
  - Posisi lokal & dunia (`Vector3`)
  - Rotasi Euler (`x, y, z`)
  - Skala (`scale`)
  - Tipe material yang digunakan
- **Drag Thresholding**: Algoritma mendeteksi pergeseran piksel kursor (> 5px) saat drag OrbitControls untuk membatalkan seleksi yang tidak disengaja.

---

## 7. Panel Kontrol & Fitur HUD

Antarmuka panel kontrol kanan menyediakan kustomisasi real-time yang lengkap:

| Modul | Pengaturan & Kontrol |
|---|---|
| **01 · Model** | Dropdown pemilihan model (`Duck`, `Fox`, `CesiumMan`, `DamagedHelmet`), status node/animasi, input upload file `.glb`, dan area drag-and-drop |
| **02 · Camera** | Pemilihan mode Perspective / Orthographic, slider Field of View (FOV) |
| **03 · Orbit** | Checkbox enabled, damping, pan, auto-rotate; slider kecepatan auto-rotate, damping factor, rotate speed, zoom speed |
| **04 · Lighting** | Slider Exposure (Tone Mapping), Key Light Intensity, Color Picker Key Light, checkbox Cast Shadow |
| **05 · Environment** | Dropdown pilihan HDR (Studio, Ladybrand, Procedural), toggle Panorama (`P`), toggle Refleksi (`E`) |
| **06 · Material** | Toggle Wireframe (`W`), Grid Helper (`G`), Axes Helper; slider interaktif Roughness dan Metalness galeri |
| **07 · Post-FX** | Slider Emissive Intensity, Bloom Strength, Bloom Radius; toggle Bloom ON/OFF |
| **08 · Animation** | Slider kecepatan orbit Solar System, slider kecepatan pemutaran clip animasi, toggle Solar Play/Pause (`S`), tombol pemilih Clip 1, 2, 3 |
| **HUD & Inspector** | Metrik real-time: FPS, Jumlah Objek, Jumlah Segitiga (Triangles via traversal geometry), status Environment & Clip aktif, nama objek hover/selected, dan Inspector koordinat transform |

---

## 8. Kontrol & Pintasan Keyboard

### Navigasi Mouse

| Aksi | Fungsi |
|---|---|
| Drag Kiri | Orbit memutari titik target |
| Scroll Mouse | Zoom in / Zoom out |
| Drag Kanan | Pan menggeser posisi kamera |
| Hover Kursor | Menyorot objek dengan emissive glow dan skala 1.06× |
| Klik Kiri Objek | Memilih objek untuk diinspeksi pada HUD Inspector |

### Pintasan Keyboard

| Tombol | Fungsi |
|---|---|
| `P` | Toggle Panorama background ON / OFF |
| `E` | Toggle Refleksi environment (IBL) ON / OFF |
| `S` | Play / Pause rotasi hierarki Solar System |
| `G` | Toggle tampilan Grid Helper |
| `W` | Toggle mode Wireframe semua mesh |
| `C` | Simpan tangkapan layar (Screenshot PNG) |
| `R` | Reset posisi kamera, orbit, pencahayaan, dan scene ke default |
| `1`, `2`, `3` | Memutar clip animasi ke-1, ke-2, atau ke-3 pada model GLB yang aktif |

---

## 9. Cara Menjalankan

Aplikasi membutuhkan web server lokal karena memuat modul ES dan aset eksternal (GLB, HDR):

1. **Menggunakan VS Code**:
   - Buka folder proyek di VS Code.
   - Pasang ekstensi **Live Server**.
   - Klik kanan pada `praktikum7/index.html` lalu pilih **Open with Live Server**.

2. **Menggunakan Python**:
   ```bash
   # Masuk ke direktori repositori
   python -m http.server 8000
   # Buka http://localhost:8000/praktikum7/ di browser
   ```

3. **Menggunakan Node.js**:
   ```bash
   npx serve .
   # Buka tautan lokal yang ditampilkan (misalnya http://localhost:3000/praktikum7/)
   ```

---

## 10. Catatan Teknis & Debugging

| Gejala Masalah | Penyebab | Solusi & Penanganan di Kode |
|---|---|---|
| Layar menjadi hitam pekat saat bloom aktif | Model (seperti `Fox.glb`) tidak memiliki atribut normal, menghasilkan `NaN` saat perhitungan shading | Dilakukan pemeriksaan otomatis `geometry.computeVertexNormals()` dan `material.flatShading = false` saat pemuatan GLTF. |
| Screenshot menghasilkan kanvas hitam kosong | Buffer WebGL dibersihkan secara default setelah frame digambar | Renderer diinisialisasi dengan konfigurasi `preserveDrawingBuffer: true`. |
| Gagal memuat aset HDR / GLTF | Halaman dibuka langsung melalui protokol `file:///` yang diblokir oleh CORS policy browser | Buka halaman melalui server HTTP lokal (`localhost`). |
| Upload `.gltf` gagal atau tekstur hilang | File `.gltf` standar memisahkan buffer data `.bin` dan gambar tekstur | Input upload difilter khusus untuk format binary bundle tunggal `.glb`. |
| Transisi kamera melompat saat berpindah tipe | Nilai target pandang hilang saat instansiasi kontrol baru | Posisi dan target orbit disalin secara konsisten antara `perspectiveCamera` dan `orthographicCamera`. |

---

## 11. Kesimpulan

Praktikum 07 berhasil mengintegrasikan aspek-aspek utama grafika komputer 3D modern pada web:
1. **Pemuatan Aset Komprehensif**: Menangani siklus hidup model 3D eksternal format GLB, mulai dari normalisasi ukuran (*bounding box fitting*), perbaikan vertex normal, hingga playback skeletal animation multi-clip.
2. **Transformasi Hierarki (Scene Graph)**: Mendemonstrasikan pewarisan matriks transformasi lokal ke dunia nyata melalui visualisasi grup induk-anak dan simulasi orbital tata surya.
3. **Pencahayaan & Material PBR Berbasis Citra**: Mengimplementasikan simulasi material fisik akurat (*roughness*, *metalness*, *refraction transmission*) yang disinari oleh peta lingkungan HDR melalui *PMREM*.
4. **Post-Processing & Interaktivitas**: Menerapkan pipeline bloom visual mutakhir dan sistem raycasting presisi yang memudahkan inspeksi dan manipulasi objek 3D secara interaktif.

---

## 12. Screenshot

![prak7](./assets/ss_prak7.png)
