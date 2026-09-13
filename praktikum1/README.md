# Graphics Playground — Primitif Grafika Komputer

Praktikum **Grafika Komputer – Pertemuan 1** yang mengimplementasikan berbagai **primitif grafika komputer** menggunakan **HTML5 Canvas, CSS, dan JavaScript**.

Program ini menampilkan beberapa bentuk dasar seperti **persegi panjang, garis, lingkaran, dan segitiga**, serta dilengkapi dengan objek bergerak dan interaksi pengguna melalui mouse dan keyboard.

---

## Identitas

| Nama | NRP |
| --- | --- |
| Nyoman Surya Hutama Andyartha | 5025241093 |
| Willy Dava Nugraha | 5025241090 |

---

## Tujuan Praktikum

Praktikum ini bertujuan untuk memahami penggunaan **HTML5 Canvas** dalam menggambar dan mengatur objek grafika komputer secara programatis.

Konsep yang diterapkan meliputi:

* Menggambar primitif grafika menggunakan Canvas 2D.
* Mengatur posisi, ukuran, warna, dan bentuk objek.
* Membuat animasi menggunakan `requestAnimationFrame()`.
* Menggunakan koordinat `x` dan `y` pada Canvas.
* Menerapkan interaksi mouse.
* Menerapkan interaksi keyboard.
* Membuat objek bergerak dan memantul pada batas Canvas.
* Mengelola state atau kondisi objek menggunakan JavaScript.

---

## Teknologi yang Digunakan

* **HTML5** — struktur halaman dan elemen Canvas.
* **CSS3** — mengatur tampilan antarmuka.
* **JavaScript** — menggambar objek, animasi, interaksi, dan pengelolaan state.
* **HTML5 Canvas 2D API** — digunakan sebagai media untuk menggambar objek grafika.

---

## Struktur Project

Struktur file utama:

```text
project/
├── index.html
├── app.js
├── style.css
└── README.md
```

### `index.html`

Berfungsi sebagai struktur halaman dan menyediakan elemen:

```html
<canvas id="graphicsCanvas" width="800" height="500"></canvas>
```

Canvas memiliki ukuran **800 × 500 piksel** dan menjadi area utama untuk menampilkan seluruh objek grafika.

HTML juga menyediakan tombol kontrol seperti:

* Trail Mode
* Pause
* Movement Mode
* Reset
* Clear Circles
* Style Mode
* Player Speed

---

### `style.css`

Digunakan untuk mengatur tampilan antarmuka aplikasi, antara lain:

* Warna halaman.
* Layout Canvas dan panel.
* Tombol kontrol.
* Legend objek.
* State panel.
* Tampilan responsif.
* Efek hover pada objek legend.

CSS juga menggunakan font **Fraunces** dan **IBM Plex Mono** dari Google Fonts.

---

### `app.js`

Merupakan bagian utama program yang menangani:

* Data objek.
* Fungsi menggambar.
* Animasi.
* Input mouse.
* Input keyboard.
* Pergerakan objek.
* Trail Mode.
* Pause.
* Reset.
* Multiple Moving Objects.
* Click to Create Circle.
* Style Mode.

---

# Primitif Grafika Komputer

Program menggunakan beberapa bentuk dasar sebagai objek grafika.

## 1. Rectangle

Rectangle merupakan bentuk persegi panjang yang dibuat menggunakan:

```javascript
ctx.fillRect(
    rectangle.x,
    rectangle.y,
    rectangle.width,
    rectangle.height
);
```

Data awal rectangle:

```javascript
const rectangle = {
    x: 80,
    y: 80,
    width: 160,
    height: 100,
    color: "#3498db"
};
```

Rectangle memiliki:

* Posisi: `(80, 80)`
* Lebar: `160`
* Tinggi: `100`
* Warna: `#3498db`

Pada **Style: Game**, rectangle ditampilkan secara visual sebagai sebuah **rumah**.

---

## 2. Line

Garis dibuat menggunakan `beginPath()`, `moveTo()`, dan `lineTo()`.

```javascript
ctx.beginPath();
ctx.moveTo(300, 80);
ctx.lineTo(500, 180);
ctx.stroke();
```

Garis menggunakan warna:

```text
#e74c3c
```

Pada **Style: Game**, garis ditampilkan sebagai garis bergaya **laser/hazard**.

---

## 3. Circle

Lingkaran dibuat menggunakan fungsi `arc()`.

```javascript
ctx.beginPath();

ctx.arc(
    650,
    120,
    60,
    0,
    Math.PI * 2
);

ctx.fillStyle = "#2ecc71";
ctx.fill();
```

Parameter utama `arc()`:

```text
arc(x, y, radius, startAngle, endAngle)
```

Circle memiliki:

* Pusat: `(650, 120)`
* Radius: `60`
* Warna: `#2ecc71`

Pada **Style: Game**, circle ditampilkan sebagai **balon udara**.

---

## 4. Triangle

Segitiga dibuat menggunakan tiga titik:

```javascript
ctx.beginPath();

ctx.moveTo(150, 300);
ctx.lineTo(80, 430);
ctx.lineTo(220, 430);

ctx.closePath();
ctx.fill();
ctx.stroke();
```

Tiga titik segitiga adalah:

```text
(150, 300)
(80, 430)
(220, 430)
```

Pada **Style: Game**, segitiga ditampilkan secara visual sebagai **pohon cemara**.

---

# Objek Dinamis

Selain primitif statis, program juga memiliki beberapa objek dinamis.

## Bouncing Ball

Bola bergerak secara otomatis menggunakan:

```javascript
movingBall.x += movingBall.speedX;
movingBall.y += movingBall.speedY;
```

Ketika mencapai batas Canvas, arah geraknya dibalik:

```javascript
movingBall.speedX *= -1;
```

atau:

```javascript
movingBall.speedY *= -1;
```

Dengan demikian bola akan terus **memantul pada dinding Canvas**.

---

## Multiple Moving Objects

Program memiliki **3 objek bergerak** yang masing-masing mempunyai:

* Posisi `x` dan `y`.
* Radius.
* Kecepatan horizontal.
* Kecepatan vertikal.
* Warna.

Contohnya:

```javascript
const movingObjects = [
    {
        x: 350,
        y: 150,
        radius: 20,
        speedX: 2,
        speedY: 1.5,
        color: "#9b59b6"
    },
    ...
];
```

Setiap objek bergerak secara independen dan akan memantul ketika menyentuh batas Canvas.

---

# Interaksi Mouse

## Follow Mouse

Terdapat sebuah lingkaran yang mengikuti posisi mouse.

Posisi mouse dihitung berdasarkan koordinat Canvas:

```javascript
mouse.x =
    (event.clientX - rect.left) *
    (canvas.width / rect.width);

mouse.y =
    (event.clientY - rect.top) *
    (canvas.height / rect.height);
```

Kemudian posisi `mouseCircle` disamakan dengan posisi mouse:

```javascript
mouseCircle.x = mouse.x;
mouseCircle.y = mouse.y;
```

Hasilnya, lingkaran akan selalu mengikuti pointer di dalam Canvas.

---

## Click to Create Circle

Setiap kali Canvas diklik, program membuat lingkaran baru pada posisi mouse:

```javascript
circles.push({
    x: mouse.x,
    y: mouse.y,
    radius: 15,
    color: colors[colorIndex]
});
```

Dengan demikian pengguna dapat membuat banyak lingkaran hanya dengan melakukan klik pada Canvas.

Tombol **Clear Circles** digunakan untuk menghapus seluruh lingkaran yang telah dibuat.

---

# Interaksi Keyboard

Player dapat dikendalikan menggunakan:

### Arrow Keys

```text
↑  → Bergerak ke atas
↓  → Bergerak ke bawah
←  → Bergerak ke kiri
→  → Bergerak ke kanan
```

Program juga mendukung kontrol:

```text
W → Atas
A → Kiri
S → Bawah
D → Kanan
```

Posisi player dibatasi agar tidak keluar dari area Canvas.

---

# Movement Mode

Program menyediakan dua mode pergerakan player.

## State-based

Mode default:

```text
Movement: State-based
```

Pada mode ini, status tombol keyboard disimpan:

```javascript
keys[event.key] = true;
```

Selama tombol masih ditekan, player terus bergerak pada setiap frame animasi.

---

## Event-based

Mode kedua:

```text
Movement: Event-based
```

Pada mode ini, player bergerak satu kali setiap tombol ditekan.

Perpindahan mode dilakukan melalui tombol:

```text
Movement: State-based
```

yang akan berubah menjadi:

```text
Movement: Event-based
```

---

# Pause

Tombol **Pause** digunakan untuk menghentikan sementara perubahan posisi objek yang bergerak.

Ketika pause aktif:

```javascript
if (!isPaused) {
    updateMovingBall();
    updatePlayer();
    updateMovingObjects();
}
```

Objek tetap digambar, tetapi posisi objek tidak diperbarui.

Tombol akan berubah menjadi:

```text
Resume
```

untuk melanjutkan animasi.

---

# Trail Mode

**Trail Mode** menghasilkan efek jejak pada objek yang bergerak.

Ketika Trail Mode aktif, Canvas tidak langsung dibersihkan menggunakan `clearRect()`. Sebagai gantinya digunakan lapisan transparan:

```javascript
ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
);
```

Karena lapisan tersebut transparan, gambar dari frame sebelumnya masih terlihat sehingga menghasilkan efek **trail/jejak gerakan**.

---

# Style Mode

Program memiliki dua mode tampilan:

```text
Style: Primitive
Style: Game
```

## Primitive

Pada mode ini objek ditampilkan sebagai bentuk dasar:

* Rectangle
* Line
* Circle
* Triangle
* Circle bergerak
* Rectangle player

Mode ini menunjukkan bentuk **primitif grafika komputer secara langsung**.

---

## Game

Pada mode Game, bentuk dasar yang sama diberi tampilan visual yang lebih kompleks.

| Primitif     | Tampilan Game  |
| ------------ | -------------- |
| Rectangle    | Rumah          |
| Line         | Laser / hazard |
| Circle       | Balon udara    |
| Triangle     | Pohon cemara   |
| Moving Ball  | Musuh          |
| Player       | Karakter game  |
| Circle kecil | Permata        |

Perubahan ini hanya mengubah **cara objek digambar**. Posisi dan logika pergerakan objek tetap menggunakan data yang sama.

---

# Animation Loop

Animasi program menggunakan:

```javascript
requestAnimationFrame(animate);
```

Fungsi utama:

```javascript
function animate() {
    ...
    requestAnimationFrame(animate);
}
```

Secara umum proses animasi adalah:

```text
┌─────────────────────┐
│      animate()      │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Bersihkan Canvas    │
│ / Trail Mode        │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Update posisi objek │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Gambar objek        │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Update State Panel   │
└──────────┬──────────┘
           ↓
      requestAnimationFrame
           │
           └──────────────→ animate()
```

Loop tersebut berjalan terus selama halaman aktif.

---

# Live State Panel

Panel **State** menampilkan kondisi program secara real-time.

Informasi yang ditampilkan:

### Mouse

Menampilkan koordinat mouse:

```text
Mouse (x, y)
```

### Keyboard

Menampilkan tombol yang sedang ditekan.

### Player

Menampilkan koordinat player:

```text
Player (x, y)
```

### Events

Menampilkan jumlah event mouse dan keyboard yang telah terjadi.

---

# Spotlight Legend

Ketika pengguna melakukan hover pada salah satu objek di **Legend**, objek yang sesuai akan disorot pada Canvas.

Objek yang sedang dipilih akan memiliki tingkat transparansi normal, sedangkan objek lain dibuat lebih transparan.

Hal ini membantu pengguna mengetahui hubungan antara item pada **Legend** dengan objek yang ditampilkan di Canvas.

---

# Reset

Tombol **Reset** mengembalikan program ke kondisi awal.

Reset mencakup:

* Posisi player.
* Posisi bouncing ball.
* Posisi multiple moving objects.
* Posisi mouse.
* Posisi mouse circle.
* Lingkaran hasil klik.
* Warna objek.
* Trail Mode.
* Pause.
* Movement Mode.
* Style Mode.
* Event counter.
* Kecepatan player.

Tombol `R` juga dapat digunakan untuk mengembalikan posisi player ke:

```text
(600, 350)
```

---

# Daftar Warna Primitif

| Objek         | Warna                              |
| ------------- | ---------------------------------- |
| Rectangle     | `#3498db`                          |
| Line          | `#e74c3c`                          |
| Circle        | `#2ecc71`                          |
| Triangle      | `#f39c12`                          |
| Bouncing Ball | `#9b59b6`                          |
| Player        | `#e67e22`                          |
| Cursor Circle | `#e74c3c`                          |
| Click Circle  | Berganti berdasarkan color palette |

---

# Cara Menjalankan

1. Clone atau download repository.
2. Pastikan file berikut berada dalam folder yang sesuai:

```text
index.html
app.js
style.css
```

3. Buka `index.html` menggunakan browser.
4. Canvas akan menampilkan objek primitif dan animasi.

Tidak diperlukan server khusus untuk menjalankan program dasar ini.

---

# Challenge yang Dikerjakan

Berdasarkan implementasi program, challenge yang diterapkan adalah:

### Challenge B — Follow Mouse

Lingkaran mengikuti posisi pointer mouse pada Canvas.

### Challenge Tambahan 34.1 — Click to Create Circle

Klik pada Canvas untuk membuat lingkaran baru.

### Challenge Tambahan 34.2 — Trail Mode

Menambahkan efek jejak pada objek yang bergerak.

### Challenge Tambahan 34.3 — Multiple Moving Objects

Menambahkan tiga objek bergerak dengan jalur dan kecepatan masing-masing.

Selain itu terdapat beberapa fitur tambahan:

* Pause / Resume.
* Movement State-based / Event-based.
* WASD Control.
* Reset.
* Clear Circles.
* Player Speed Slider.
* Style Primitive / Game.
* Live State Panel.
* Legend Spotlight.

---

# Konsep Grafika Komputer yang Dipelajari

Melalui program ini dapat dipelajari beberapa konsep dasar grafika komputer:

1. **Sistem koordinat 2D**

   * Posisi objek ditentukan dengan koordinat `x` dan `y`.

2. **Primitif grafika**

   * Rectangle.
   * Line.
   * Circle.
   * Triangle.

3. **Raster drawing**

   * Objek digambar ke dalam area Canvas menggunakan Canvas 2D API.

4. **Transformasi posisi**

   * Posisi objek dapat diubah dengan mengubah nilai `x` dan `y`.

5. **Animasi**

   * Perubahan posisi objek dilakukan secara berulang pada setiap frame.

6. **Interaksi**

   * Mouse digunakan untuk mengikuti pointer dan membuat objek.
   * Keyboard digunakan untuk mengontrol player.

7. **Collision dengan batas Canvas**

   * Objek bergerak memantul ketika mencapai batas area.

8. **State management**

   * Kondisi seperti pause, trail mode, movement mode, dan visual mode disimpan dalam variabel JavaScript.

---

# Kesimpulan

**Graphics Playground** merupakan implementasi sederhana grafika komputer berbasis web yang menggunakan **HTML5 Canvas dan JavaScript**.

Program memperlihatkan bagaimana bentuk-bentuk dasar seperti **rectangle, line, circle, dan triangle** dapat dibuat menggunakan Canvas, kemudian dikembangkan menjadi objek yang dapat bergerak dan berinteraksi dengan pengguna.

Selain memahami primitif grafika, praktikum ini juga menerapkan konsep **animasi, koordinat 2D, event handling, keyboard input, mouse input, state management, dan rendering menggunakan `requestAnimationFrame()`**.

Dengan adanya **Style Mode**, bentuk primitif juga dapat dikembangkan menjadi tampilan yang lebih kompleks tanpa mengubah data dan logika dasar objek.
