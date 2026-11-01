# Praktikum 9 – 3D Modeling Sci-Fi Crate dengan Blender

## Identitas

| Nama | NRP |
| --- | --- |
| Nyoman Surya Hutama Andyartha | 5025241093 |
| Willy Dava Nugraha | 5025241090 |

---


# Deskripsi

Praktikum Grafika Komputer: membuat aset 3D **Sci-Fi Crate (kotak sci-fi)** menggunakan Blender, mulai dari primitif kubus sampai menjadi aset akhir dengan panel, bingkai, handle, dan efek cahaya (emission).

---

## Hasil Akhir

![Hasil akhir](.\screenshots\final.png)

Sci-fi crate dengan badan panel berwarna oranye kemerahan, bingkai gelap, garis tepi bercahaya (cyan/emission), dan handle hitam di bagian atas.

---

---

## Tujuan Praktikum

1. Memahami antarmuka dasar Blender (viewport, toolbar, panel properti).
2. Memahami perbedaan **Object Mode** dan **Edit Mode**.
3. Menggunakan tool modeling dasar: **Scale, Inset, Extrude, Loop Cut**.
4. Menggunakan **Modifier** untuk memperhalus/merapikan bentuk model.
5. Memberi material (warna dan emission) pada model 3D.

---

## Langkah Pengerjaan

### 1. Objek Awal (Initial)

Mulai dari scene kosong dengan **Cube** default (`Add > Mesh > Cube`). Masuk ke **Edit Mode** (`Tab`) dan gunakan mode seleksi *Face*.

![Initial](.\screenshots\initial.png)

### 2. Mengatur Primitif (Primitive)

Kubus diubah menjadi bentuk balok dengan mengatur skala hingga dimensi akhir pada panel **Item (N)**:

| Axis | Dimensi |
|------|---------|
| X | 4 m |
| Y | 3 m |
| Z | 2.4 m |

> Tips: setelah di-scale, tekan `Ctrl + A` → **Scale** (Apply) agar skala objek kembali 1.000.

![Primitive](.\screenshots\primitive.png)

### 3. Inset & Extrude

Membuat detail panel dan cekungan pada sisi kotak:

1. Pilih face yang ingin diberi detail (mode Face, `3`).
2. **Inset Faces** – tekan `I`, geser mouse untuk menentukan tebal bingkai.
3. **Extrude** – tekan `E` dengan nilai negatif (ke dalam) untuk membuat panel cekung.
4. Ulangi untuk sisi atas dan sisi samping.

![Inset dan Extrude](.\screenshots\inset-extrude.png)

### 4. Loop Cut

Menambahkan potongan sisi (edge loop) untuk membagi permukaan menjadi beberapa panel dan memberi dukungan geometri pada tepi.

1. `Ctrl + R` lalu arahkan mouse ke sisi yang ingin dipotong.
2. Scroll mouse untuk menambah jumlah potongan.
3. Klik untuk konfirmasi, klik kanan untuk membatalkan pergeseran.

![Loop Cut](.\screenshots\loop_cut.png)

### 5. Modifier

Kembali ke **Object Mode** dan tambahkan modifier pada tab **Modifiers** (ikon kunci inggris) untuk menghaluskan sudut dan tepi model sehingga terlihat lebih realistis.

![Modifier](.\screenshots\modifier.png)

### 6. Material dan Hasil Akhir

- Panel badan diberi material warna oranye kemerahan.
- Bingkai dan handle diberi material gelap/hitam.
- Garis tepi diberi material **Emission** berwarna cyan sehingga tampak bercahaya.
- Handle ditambahkan di bagian atas sebagai detail akhir.

![Final](.\screenshots\final.png)

---

## Shortcut yang Digunakan

| Shortcut | Fungsi |
|----------|--------|
| `Tab` | Pindah Object Mode ↔ Edit Mode |
| `1` / `2` / `3` | Mode seleksi Vertex / Edge / Face |
| `G`, `R`, `S` | Move, Rotate, Scale |
| `E` | Extrude |
| `I` | Inset Faces |
| `Ctrl + R` | Loop Cut |
| `Ctrl + A` | Apply transform |
| `N` | Buka/tutup panel Item |
| `Numpad .` | Fokus ke objek terpilih |

---

## Cara Membuka Project

1. Install **Blender 5.2** atau versi yang lebih baru.
2. Buka Blender, pilih `File > Open`, lalu pilih `praktikum9-scifi-crate.blend`.
3. Ubah viewport ke **Material Preview** (ikon bola di kanan atas viewport) untuk melihat warna dan efek cahaya.

---

## Kesimpulan

Dengan memanfaatkan tool dasar seperti scale, inset, extrude, loop cut, dan modifier, sebuah kubus sederhana dapat dikembangkan menjadi aset 3D sci-fi crate yang detail. Proses modeling dilakukan secara bertahap (non-destruktif bila memakai modifier) sehingga mudah diubah dan dikembangkan lebih lanjut.