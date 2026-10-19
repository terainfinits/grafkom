# Interactive 3D Web Prototype

Prototype web 3D interaktif berbasis three.js (r180) dengan tampilan bergaya "The Archive".

## Struktur folder

```
web3d-prototype/
├── index.html      ← halaman + panel kontrol (semua ID yang dipakai main.js)
├── style.css       ← tema The Archive (ink / paper / brass)
├── main.js         ← logika scene three.js
├── Duck.glb        ← model GLB (dipanggil "./Duck.glb" dari main.js)
└── assets/
    ├── studio_small_09_1k.hdr
    └── ladybrand_heritage_house_1k.hdr
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
| Kamera | Perspective / Orthographic, Field of View |
| Orbit Controls | enabled, damping, pan, damping factor, rotate speed, zoom speed |
| Environment | Pilihan HDR (Studio / Ladybrand / Procedural), toggle panorama & refleksi |
| Material PBR | Roughness & metalness galeri bola |
| Bloom | Emissive intensity, bloom strength, bloom radius, toggle bloom |
| Animasi | Kecepatan orbit tata surya, play/pause, clip animasi bebek 1–3 |

Shortcut keyboard: `P` panorama · `E` refleksi · `S` solar · `R` reset · `1` `2` `3` clip.
Klik objek di scene untuk memilihnya dan melihat posisi/rotasi/skala/material di panel Inspector.
