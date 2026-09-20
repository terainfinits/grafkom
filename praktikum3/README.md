# Praktikum 03 — Interactive Transformation Playground

## Identitas

| Nama | NRP |
| --- | --- |
| Nyoman Surya Hutama Andyartha | 5025241093 |
| Willy Dava Nugraha | 5025241090 |

# Deskripsi

Visualisasi transformasi 2D (translasi, rotasi, skala) menggunakan **WebGL2** dan **matriks model 3×3**. Satu bentuk segitiga dipakai ulang untuk semua objek di layar — yang berubah hanya matriks yang dikirim ke vertex shader.

---

## 1. Struktur File

| File | Isi |
|---|---|
| `index.html` | Kerangka halaman: kanvas, panel info, tombol, slider, keymap |
| `style.css` | Tampilan (tema gelap + kartu kertas, font Fraunces & IBM Plex Mono) |
| `matrix3.js` | Pustaka matriks 3×3: identitas, perkalian, translate, rotate, scale, TRS, RTS |
| `main.js` | Setup WebGL2, shader, geometri, state, input, dan loop render |

Urutan `<script>` penting: `matrix3.js` dimuat **sebelum** `main.js` karena `main.js` memakai fungsi-fungsinya.

---

## 2. Konsep Dasar

### Koordinat Homogen

Titik 2D ditulis sebagai vektor 3 komponen `(x, y, 1)`. Komponen ketiga bernilai `1` supaya **translasi bisa ditulis sebagai perkalian matriks** (dengan matriks 2×2 biasa, translasi tidak bisa dinyatakan sebagai perkalian).

Karena itu data segitiga di `main.js` ditulis dengan tiga angka per titik:

```js
const TRIANGLE = new Float32Array([
  -0.16, -0.13, 1,
   0.16, -0.13, 1,
   0.00,  0.18, 1,
]);
```

### Local Space vs World Space

Koordinat di atas adalah **local space** dan **tidak pernah diubah** sepanjang program. Objek berpindah/berputar/membesar semata-mata karena matriks model yang berbeda. Inilah alasan satu VAO segitiga bisa menghasilkan Object A, Object B, child, dan satelit orbit sekaligus.

### Shader

```glsl
in vec3 a_position;
uniform mat3 u_matrix;
void main() {
  gl_Position = vec4(u_matrix * a_position, 1.0);
}
```

Setiap vertex dikalikan matriks model di GPU. Fragment shader hanya mewarnai dengan `u_color` (warna seragam per objek).

---

## 3. Isi `matrix3.js`

Semua matriks disimpan **column-major** (urutan yang diminta WebGL), jadi array `[a,b,c, d,e,f, g,h,i]` berarti:

```
| a  d  g |
| b  e  h |
| c  f  i |
```

### Matriks dasar

| Fungsi | Hasil | Keterangan |
|---|---|---|
| `mat3Identity()` | matriks identitas | titik awal komposisi, tidak mengubah apa pun |
| `mat3Translate(x, y)` | geser | nilai `x, y` berada di kolom ketiga |
| `mat3Scale(sx, sy)` | perbesar/perkecil | mendukung non-uniform (`sx ≠ sy`) |
| `mat3Rotate(deg)` | putar terhadap sumbu Z | derajat diubah ke radian, berlawanan arah jarum jam |

### `mat3Multiply(a, b)`

Perkalian `a × b`: setiap elemen hasil adalah **baris `a`** dikalikan **kolom `b`**. Perlu diingat perkalian matriks **tidak komutatif** — `A × B ≠ B × A`. Sifat inilah yang jadi inti praktikum ini.

### `mat3TRS(o)` — urutan A

```
M = T × R × S
```

Dibaca dari kanan ke kiri (arah kerjanya terhadap vertex): objek **diskalakan dulu**, lalu **diputar**, baru **dipindahkan**. Karena rotasi dan skala terjadi selagi objek masih di origin lokalnya, objek berputar di **pivot-nya sendiri**. Ini perilaku yang biasa diharapkan.

### `mat3RTS(o)` — urutan B

```
M = R × T × S
```

Objek diskalakan, **dipindahkan dulu**, baru diputar. Karena rotasi dikerjakan setelah objek menjauh dari origin, objek jadi **mengorbit titik (0,0) dunia**. Angka `x`, `y`, `rotation`, `scale` yang dimasukkan sama persis, tapi hasil di layar berbeda jauh — inilah demonstrasi bahwa **urutan transformasi menentukan hasil**.

Tekan tombol **T** untuk menukar kedua urutan ini secara langsung.

> Catatan: `mat3TR()` juga tersedia (translate lalu rotate tanpa skala), tetapi pada versi ini orbit dirangkai manual di `main.js`, sehingga fungsi tersebut belum terpakai.

---

## 4. Isi `main.js`

### Inisialisasi

1. Ambil konteks `webgl2` (jika gagal, status di halaman berubah jadi pesan error).
2. Kompilasi vertex + fragment shader, link jadi `program`.
3. Ambil lokasi `a_position`, `u_matrix`, `u_color`.
4. `createVAO()` membuat Vertex Array Object untuk segitiga dan untuk garis sumbu.

### State

```js
const objectA = { x, y, rotation, scaleX, scaleY };
let paused, orderTRS, orbitOn, seconds, lastTime;
```

`clampObjectA()` membatasi posisi (±0.85 / ±0.78) dan skala (0.2–2.5) agar objek tidak keluar layar atau hilang.

### Loop animasi

```js
function frame(t) {
  const dt = Math.min((t - lastTime) * 0.001, 0.05);
  ...
}
```

Gerakan dihitung dengan **delta time**, bukan per-frame. Artinya kecepatan objek sama di monitor 60 Hz maupun 144 Hz. `Math.min(..., 0.05)` mencegah lompatan besar saat tab sempat tidak aktif.

Input keyboard memakai pola **state-based**: `keydown` menandai `keys[k] = true`, `keyup` mengembalikannya ke `false`, dan pergerakan dihitung tiap frame selama tombol ditahan. Ini membuat gerakan halus, berbeda dengan menggerakkan objek langsung di dalam event `keydown`.

### Empat demonstrasi di `draw()`

1. **Object A** (kuning kuningan) — dikendalikan keyboard/mouse, memakai `mat3TRS` atau `mat3RTS` sesuai mode.
2. **Object B** (merah bata) — animasi otomatis: berputar terus (`seconds * 70` derajat) dan berdenyut dengan `Math.sin(seconds * 2)`.
3. **Child object** (hijau) — contoh **parent-child transformation**:
   ```js
   modelChild = modelA × translate(0.28, 0) × scale(0.42, 0.42)
   ```
   Karena dikalikan dengan matriks A, child otomatis ikut bergerak, berputar, dan berskala mengikuti induknya.
4. **Orbit** (tombol O) — objek pusat diam, satelit mengelilinginya lewat komposisi:
   ```js
   translate(pusat) × rotate(sudut) × translate(radius) × scale(satelit)
   ```

### Mouse

Klik di kanvas mengubah koordinat piksel menjadi **Normalized Device Coordinates** (−1 … 1):

```js
x = (px / lebar) * 2 - 1;
y = 1 - (py / tinggi) * 2;   // sumbu Y dibalik karena piksel dihitung dari atas
```

### Panel Info

Tiap frame, panel memperbarui posisi, rotasi, skala, urutan transformasi, dan isi matriks model. Karena array disimpan column-major, baris pertama matriks dibaca dari indeks `[0], [3], [6]`.

---

## 5. Kontrol

| Tombol | Fungsi |
|---|---|
| `↑ ↓ ← →` / `W A S D` | translasi Object A |
| `Q` / `E` | rotasi berlawanan / searah jarum jam |
| `+` / `−` | skala uniform |
| `Z` / `X` | perkecil / perbesar sumbu X saja |
| `C` / `V` | perkecil / perbesar sumbu Y saja |
| `1` `2` `3` | preset transformasi |
| `T` | tukar urutan T×R×S ↔ R×T×S |
| `O` | tampilkan / sembunyikan orbit |
| `P` | jeda / lanjutkan |
| `R` | reset ke kondisi awal |

Slider mengatur kecepatan gerak, rotasi, dan skala. Checkbox menyalakan sumbu X/Y, penanda pivot, child object, dan Object B.

---

## 6. Cara Menjalankan

Cukup buka `index.html` di browser modern yang mendukung WebGL2 (Chrome, Edge, Firefox). Tidak perlu server karena semua aset dimuat lewat tag `<script>` biasa, bukan ES module.

Jika ingin lewat server lokal:

```bash
python -m http.server 8000
# lalu buka http://localhost:8000
```

---

## 7. Hal yang Bisa Dikembangkan

- **Koreksi aspek rasio**: kanvas 720×560 tidak persegi, sehingga segitiga sedikit gepeng dan konversi klik mouse belum memperhitungkan rasio. Bisa diperbaiki dengan matriks proyeksi tambahan.
- Hierarki parent-child lebih dalam (cucu, cicit).
- Skala terhadap pivot khusus: `translate(pivot) × scale(s) × translate(−pivot)`.
- Warna per-vertex agar arah rotasi lebih mudah diamati.

---

## 8. Kesimpulan

Praktikum ini menunjukkan tiga hal utama:

1. Semua transformasi 2D dapat dinyatakan sebagai satu **matriks 3×3** berkat koordinat homogen.
2. Transformasi digabungkan dengan **perkalian matriks**, dan karena perkalian matriks tidak komutatif, **urutannya mengubah hasil** (`T×R×S` vs `R×T×S`).
3. Geometri objek cukup disimpan sekali di local space; **matriks model** yang menentukan di mana dan bagaimana objek itu tampil, termasuk untuk hubungan parent-child dan gerak orbit.
