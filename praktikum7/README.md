# Interactive 3D Web Prototype

Prototype web 3D interaktif berbasis three.js (r180) dengan tampilan bergaya "The Archive".

## Struktur folder

```
web3d-prototype/
├── index.html      ← halaman + panel kontrol (semua ID yang dipakai main.js)
├── style.css       ← tema The Archive (ink / paper / brass)
├── main.js         ← logika scene three.js
├── Duck.glb        ← model GLB default (dipanggil "./Duck.glb" dari main.js)
├── CREDITS.md      ← sumber & lisensi aset
└── assets/
    ├── studio_small_09_1k.hdr
    ├── ladybrand_heritage_house_1k.hdr
    └── models/
        ├── Fox.glb            (3 animasi: Survey, Walk, Run)
        ├── CesiumMan.glb      (1 animasi walk cycle)
        └── DamagedHelmet.glb  (material PBR detail, statis)
```

## Cara menjalankan

File ini memakai ES module, jadi **harus dibuka lewat local server**, bukan dengan klik ganda (`file://` akan memblokir pemuatan model & HDR).

- **VS Code:** pasang ekstensi *Live Server* → klik kanan `index.html` → *Open with Live Server*.
- **Python:** `cd web3d-prototype` lalu `python -m http.server 8000`, buka http://localhost:8000
- **Node:** `npx serve .`

Perlu koneksi internet karena three.js dan font dimuat dari CDN.

## Fitur yang bisa diatur

| Panel | Kontrol |
|---|---|
| Model GLB | Ganti model (Duck / Fox / CesiumMan / DamagedHelmet), upload atau drag & drop file .glb sendiri |
| Kamera | Perspective / Orthographic, Field of View |
| Orbit Controls | enabled, damping, pan, auto-rotate (+ speed), damping factor, rotate speed, zoom speed |
| Pencahayaan | Exposure (tone mapping), intensitas & warna key light, toggle shadow |
| Environment | Pilihan HDR (Studio / Ladybrand / Procedural), toggle panorama & refleksi |
| Material PBR | Roughness & metalness galeri bola, toggle wireframe / grid / axes helper |
| Bloom | Emissive intensity, bloom strength, bloom radius, toggle bloom |
| Animasi | Kecepatan orbit tata surya, play/pause, kecepatan playback clip, tombol clip 1–3 (nama clip mengikuti model) |
| Viewport | Preset kamera Front / Side / Top / Iso (transisi halus), screenshot PNG, HUD jumlah segitiga |

Shortcut keyboard: `P` panorama · `E` refleksi · `S` solar · `G` grid · `W` wireframe · `C` screenshot · `R` reset · `1` `2` `3` clip.
Klik objek di scene untuk memilihnya dan melihat posisi/rotasi/skala/material di panel Inspector.

## Catatan teknis

- Model tanpa data normal (misalnya Fox.glb) otomatis dihitung normalnya saat dimuat. Tanpa langkah ini, mode wireframe menghasilkan NaN pada lighting dan bloom menghitamkan seluruh layar.
- Renderer memakai `preserveDrawingBuffer: true` agar tombol screenshot menghasilkan gambar, bukan kanvas hitam.
- Upload hanya menerima `.glb`, karena file `.gltf` biasanya bergantung pada file `.bin` dan tekstur terpisah.
