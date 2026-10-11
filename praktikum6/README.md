# Praktikum 6 — Three.js Mini 3D Scene

Anggota Group 3:
| Nama | NRP |
| --- | --- |
| Nyoman Surya Hutama Andyartha | 5025241093 |
| Willy Dava Nugraha | 5025241090 |

## Deskripsi Scene

Scene 3D interaktif berisi cube utama, sphere, cone, cylinder, torus, torus knot, ground, dan
material gallery. Objek dianimasikan dengan `THREE.Clock` + delta time, diterangi AmbientLight,
DirectionalLight, dan PointLight, serta menghasilkan shadow di atas ground. Kamera dinavigasi
dengan OrbitControls dan dapat berpindah antara Perspective dan Orthographic.

## File

| File | Isi |
|---|---|
| `index.html` | Struktur halaman, import map Three.js, panel kontrol, HUD |
| `main.js` | Scene, camera, renderer, geometry, material, light, shadow, input, animation loop |
| `style.css` | Layout responsif dan styling panel |
| `README.md` | Dokumentasi |

## Cara Menjalankan

Buka `index.html` melalui server HTTP lokal (mis. **Live Server** VS Code, atau `npx serve .`).
Jangan membuka lewat `file://` karena memakai ES module. Koneksi internet dibutuhkan karena
Three.js `0.185.1` dimuat dari jsDelivr melalui import map.

Jika memakai Vite: `npm install three`, lalu hapus import map dan pindahkan file ke `src/`.

## Daftar Geometry

`BoxGeometry` (cube utama, gallery), `SphereGeometry`, `PlaneGeometry` (ground), `ConeGeometry`,
`CylinderGeometry`, `TorusGeometry`, `TorusKnotGeometry`.

## Daftar Material

`MeshBasicMaterial`, `MeshNormalMaterial`, `MeshLambertMaterial`, `MeshPhongMaterial`,
`MeshStandardMaterial`. Hanya Basic dan Normal yang tidak membutuhkan light.

## Daftar Light

- `AmbientLight` — pencahayaan dasar tanpa arah
- `DirectionalLight` — sumber utama, `castShadow`, intensitas dapat diatur
- `PointLight` — cahaya cyan ke segala arah, `castShadow`

## Konfigurasi Shadow

Rantai yang harus lengkap: `renderer.shadowMap.enabled = true` → `light.castShadow = true` →
`mesh.castShadow = true` → `ground.receiveShadow = true`. Shadow camera DirectionalLight
`±7`, `near 0.1`, `far 20`. Ukuran shadow map default 1024 dan bisa diganti 512/1024/2048.

## Animasi

Rotasi cube/cone/cylinder/torus/torus knot/gallery, sphere naik-turun dengan `Math.sin`,
semuanya `kecepatan × delta` (delta dibatasi 0.05 detik). Loop memakai `requestAnimationFrame`.

## Challenge yang Dikerjakan (A–H)

| Challenge | Implementasi |
|---|---|
| **A** Tambah Geometry | Cone, Cylinder, Torus, TorusKnot — masing-masing punya material, transform, dan posisi tidak bertabrakan |
| **B** Material Gallery | 4 cube sama (Basic, Normal, Lambert, Phong) berjajar; tombol `H` untuk show/hide. Material cube utama juga bisa diganti lewat dropdown atau `M` |
| **C** OrthographicCamera | Tombol `P` (juga `C`/dropdown) berpindah Perspective ↔ Orthographic; posisi dan target dipertahankan; projection ikut resize |
| **D** Light Animation | `L` menggerakkan DirectionalLight melingkar (`cos`/`sin`) dengan marker dan helper arah |
| **E** Shadow Quality | Dropdown 512/1024/2048; map lama di-dispose agar dibuat ulang |
| **F** Scene Information | HUD: posisi kamera, jumlah object, triangle & draw call (`renderer.info`), FPS, material aktif, intensitas light, status animasi |
| **G** Toggle Animation | `Space` (juga `G`) pause/resume, sekali per key press (`event.repeat` diabaikan) |
| **H** Continuous Control | Arrow/WASD memindahkan cube, `Q`/`E` memutar cube, memakai delta time dan state `keys` |

## Kontrol

| Input | Fungsi |
|---|---|
| Drag kiri / scroll / drag kanan | Orbit / zoom / pan |
| Arrow, WASD | Gerakkan cube utama |
| Q / E | Putar cube utama |
| P (atau C) | Perspective ↔ Orthographic |
| Space (atau G) | Pause / resume |
| L | Light orbit |
| H | Material gallery |
| M | Ganti material cube utama |
| R | Reset scene, kamera, dan parameter OrbitControls |

Panel kanan juga menyediakan FOV, light intensity, shadow quality, geometry segments, light helpers,
dan parameter OrbitControls (enable, pan, damping, damping factor, rotate speed, zoom speed).

## Catatan Debugging

- `Failed to resolve import "three"` → import map belum ada, atau file dibuka via `file://`.
- Object hitam → material Lambert/Phong/Standard butuh light; bandingkan dengan Basic.
- Ground tidak tampak → `PlaneGeometry` default di bidang XY, harus `rotation.x = -π/2`.
- Shadow hilang → periksa seluruh rantai shadow dan batas shadow camera.
- Gambar terdistorsi saat resize → camera aspect dan `updateProjectionMatrix()` harus diperbarui.
- Space ikut menekan tombol yang fokus → tombol di-`blur()` setelah klik dan `preventDefault` pada keydown.
- `camera.lookAt()` tidak dipanggil tiap frame karena arah pandang dikelola `controls.target`.

## Checklist

- [x] Scene, background, PerspectiveCamera, WebGLRenderer (antialias, pixel ratio dibatasi)
- [x] Box, Sphere, Plane + geometry tambahan, minimal dua material
- [x] Position, rotation, scale
- [x] AmbientLight, DirectionalLight, shadow (>2 caster, ground receiver)
- [x] Animation loop, `requestAnimationFrame`, delta time
- [x] Responsive renderer, `updateProjectionMatrix()`
- [x] HUD scene information
- [x] Challenge A–H