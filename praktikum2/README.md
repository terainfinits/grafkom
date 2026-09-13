# WebGL2 Playground

## Identitas

| Nama | NRP |
| --- | --- |
| Nyoman Surya Hutama Andyartha | 5025241093 |
| Willy Dava Nugraha | 5025241090 |

## Deskripsi

WebGL2 Playground adalah aplikasi grafika komputer berbasis web yang dibuat menggunakan HTML, CSS, JavaScript, WebGL2, dan GLSL ES 3.00.

Program ini dibuat untuk mempelajari konsep dasar pemrograman grafika menggunakan WebGL2, khususnya penggunaan primitive, shader, attribute, uniform, varying, Vertex Array Object (VAO), interleaved buffer, animasi, serta interaksi menggunakan keyboard dan mouse.

Project ini tidak menggunakan library grafika eksternal dan tidak menggunakan MVP Matrix. Seluruh proses rendering dilakukan langsung menggunakan WebGL2 API.

## Tujuan

Project ini dibuat sebagai implementasi materi Grafika Komputer pada:

**EF234504 — Grafika Komputer, Pertemuan 2**

Beberapa konsep utama yang diterapkan:

* WebGL2 Rendering Context
* Vertex Shader
* Fragment Shader
* GLSL ES 3.00
* Attribute
* Uniform
* Varying
* Vertex Array Object
* Vertex Buffer Object
* Interleaved Buffer
* WebGL Primitive
* Animasi menggunakan `requestAnimationFrame`
* Input keyboard
* Input mouse
* Normalized Device Coordinates
* Manipulasi warna dan brightness

## Teknologi

Project menggunakan:

* HTML5
* CSS3
* JavaScript ES Module
* WebGL2
* GLSL ES 3.00

Tidak terdapat framework atau library tambahan seperti Three.js.

## Struktur Project

```text
webgl2-playground/
│
├── index.html
├── style.css
├── main.js
└── README.md
```

### `index.html`

Berisi:

* Struktur antarmuka aplikasi
* Control Panel
* Canvas WebGL2
* HUD informasi
* Vertex Shader
* Fragment Shader
* Pemanggilan `main.js`

### `style.css`

Mengatur tampilan aplikasi seperti:

* Layout control panel dan canvas
* Header
* Button
* Slider
* Dropdown
* HUD
* Responsive layout
* Tampilan keyboard shortcut

### `main.js`

Berisi seluruh logika WebGL2 seperti:

* Membuat WebGL2 context
* Kompilasi shader
* Linking shader program
* Membuat VAO dan buffer
* Mengatur attribute
* Mengatur uniform
* Membuat data vertex
* Menggambar primitive
* Input keyboard
* Input mouse
* Animasi
* Render loop
* HUD

## WebGL2 Context

Canvas WebGL diambil dari DOM kemudian context WebGL2 dibuat menggunakan:

```javascript
const canvas = document.querySelector("#webglCanvas");
const gl = canvas.getContext("webgl2");
```

Program juga melakukan pengecekan apakah browser mendukung WebGL2.

Jika WebGL2 tidak tersedia, program menampilkan status bahwa WebGL2 tidak didukung dan menghentikan eksekusi.

## Shader

Project menggunakan dua jenis shader:

1. Vertex Shader
2. Fragment Shader

Shader menggunakan:

```glsl
#version 300 es
```

yang merupakan versi GLSL ES yang digunakan pada WebGL2.

## Vertex Shader

Vertex Shader bertugas menentukan posisi setiap vertex dan mengirimkan warna menuju Fragment Shader.

Attribute yang digunakan:

```glsl
in vec2 a_position;
in vec3 a_color;
```

`a_position` menyimpan koordinat vertex.

`a_color` menyimpan warna RGB pada masing-masing vertex.

Uniform yang digunakan:

```glsl
uniform float u_time;
uniform vec2 u_offset;
uniform float u_pointSize;
uniform float u_waveAmount;
```

Fungsi dari masing-masing uniform:

* `u_time` digunakan untuk animasi berdasarkan waktu.
* `u_offset` digunakan untuk menggeser posisi hero shape.
* `u_pointSize` menentukan ukuran primitive `POINTS`.
* `u_waveAmount` mengatur besar efek gelombang.

Efek gelombang dibuat menggunakan:

```glsl
float wave = sin(u_time + a_position.x * 8.0) * u_waveAmount;
```

Posisi akhir vertex dikirim melalui:

```glsl
gl_Position = vec4(animatedPosition, 0.0, 1.0);
```

Sedangkan ukuran point ditentukan menggunakan:

```glsl
gl_PointSize = u_pointSize;
```

Warna vertex dikirim ke Fragment Shader melalui:

```glsl
out vec3 v_color;
```

## Fragment Shader

Fragment Shader bertugas menentukan warna akhir pixel.

Shader menerima warna dari Vertex Shader:

```glsl
in vec3 v_color;
```

Kemudian terdapat uniform:

```glsl
uniform float u_brightness;
```

yang digunakan untuk mengatur tingkat brightness.

Warna akhir dihitung dengan:

```glsl
vec3 finalColor = v_color * u_brightness;
```

Kemudian dikirim ke framebuffer melalui:

```glsl
outColor = vec4(finalColor, 1.0);
```

## Attribute, Uniform, dan Varying

### Attribute

Attribute merupakan data yang berbeda untuk setiap vertex.

Project menggunakan:

```glsl
a_position
a_color
```

### Uniform

Uniform adalah data yang nilainya sama untuk seluruh vertex atau fragment dalam satu draw call.

Project menggunakan:

```text
u_time
u_offset
u_pointSize
u_waveAmount
u_brightness
```

### Varying

Pada GLSL ES 3.00, data dari Vertex Shader ke Fragment Shader dikirim menggunakan pasangan `out` dan `in`.

Vertex Shader:

```glsl
out vec3 v_color;
```

Fragment Shader:

```glsl
in vec3 v_color;
```

WebGL akan melakukan interpolasi warna antarvertex secara otomatis.

## VAO dan Interleaved Buffer

Project menggunakan Vertex Array Object atau VAO untuk menyimpan konfigurasi attribute.

Data vertex disimpan menggunakan format:

```text
x, y, r, g, b
```

Artinya setiap vertex memiliki lima nilai.

Contoh:

```text
x     y     r     g     b
-0.5  0.5   1.0   0.0   0.0
```

Dua nilai pertama merupakan posisi.

Tiga nilai berikutnya merupakan warna RGB.

Stride buffer dihitung sebagai:

```javascript
const STRIDE = 5 * Float32Array.BYTES_PER_ELEMENT;
```

Position menggunakan dua komponen:

```javascript
gl.vertexAttribPointer(
  aPositionLocation,
  2,
  gl.FLOAT,
  false,
  STRIDE,
  POSITION_OFFSET
);
```

Color menggunakan tiga komponen:

```javascript
gl.vertexAttribPointer(
  aColorLocation,
  3,
  gl.FLOAT,
  false,
  STRIDE,
  COLOR_OFFSET
);
```

Penggunaan satu buffer untuk menyimpan posisi dan warna disebut sebagai interleaved buffer.

Implementasi VAO dan interleaved buffer dapat dilihat pada konfigurasi `a_position`, `a_color`, stride lima `Float32`, dan penggunaan satu vertex buffer bersama.

## Primitive WebGL

Project mendemonstrasikan tujuh primitive mode utama WebGL.

### POINTS

Menggambar setiap vertex sebagai sebuah titik.

```javascript
gl.POINTS
```

### LINES

Setiap dua vertex membentuk satu garis terpisah.

```javascript
gl.LINES
```

### LINE_STRIP

Membentuk garis yang saling terhubung.

```javascript
gl.LINE_STRIP
```

### LINE_LOOP

Mirip dengan `LINE_STRIP`, tetapi vertex terakhir otomatis dihubungkan kembali ke vertex pertama.

```javascript
gl.LINE_LOOP
```

### TRIANGLES

Setiap tiga vertex membentuk satu segitiga.

```javascript
gl.TRIANGLES
```

### TRIANGLE_STRIP

Membentuk beberapa segitiga menggunakan vertex yang saling berbagi.

```javascript
gl.TRIANGLE_STRIP
```

### TRIANGLE_FAN

Membentuk beberapa segitiga dengan satu vertex sebagai pusat.

```javascript
gl.TRIANGLE_FAN
```

Program memiliki data showcase untuk triangle, points, lines, line strip, line loop, triangle strip, dan triangle fan.

## Hero Shape

Hero Shape merupakan objek utama yang dapat dikontrol oleh pengguna.

Jenis objek dapat dipilih melalui menu:

```text
Triangle
Rectangle
Line
Points
```

Geometry hero dibuat melalui fungsi:

```javascript
buildHeroVertices()
```

Hero juga dapat menggunakan beberapa draw mode:

```text
TRIANGLES
LINE_STRIP
POINTS
```

## Procedural Grid

Ketika Hero Shape dipilih menjadi `Points`, program membuat kumpulan titik secara procedural.

Grid terdiri dari:

```javascript
const columns = 11;
const rows = 7;
```

Posisi vertex dibuat menggunakan perulangan sehingga tidak perlu menuliskan seluruh vertex secara manual.

Dengan 11 kolom dan 7 baris, grid menghasilkan:

```text
11 × 7 = 77 titik
```

Implementasi grid procedural berada pada fungsi `generateProceduralGrid()`.

## Interaksi Keyboard

Hero Shape dapat digerakkan menggunakan keyboard.

### Arrow Keys

```text
Arrow Left  : bergerak ke kiri
Arrow Right : bergerak ke kanan
Arrow Up    : bergerak ke atas
Arrow Down  : bergerak ke bawah
```

### W A S D

Alternatif kontrol pergerakan:

```text
W : atas
A : kiri
S : bawah
D : kanan
```

### R

Reset posisi hero dan scene.

```text
R
```

### Space

Pause atau resume animasi.

```text
Space
```

### P

Alternatif untuk pause atau resume.

```text
P
```

### C

Mengubah warna Hero Shape menjadi warna acak.

```text
C
```

Keyboard diproses melalui event `keydown` dan `keyup`.

## Interaksi Mouse

Posisi mouse pada canvas dikonversi dari koordinat pixel menjadi Normalized Device Coordinates atau NDC.

Rentang koordinat NDC adalah:

```text
X = -1 sampai 1
Y = -1 sampai 1
```

Konversi dilakukan dengan:

```javascript
state.mouseNdc.x = (pixelX / rect.width) * 2 - 1;
state.mouseNdc.y = 1 - (pixelY / rect.height) * 2;
```

Ketika canvas diklik:

1. Hero Shape berpindah mendekati posisi mouse.
2. Triangle baru dibuat pada posisi klik.
3. Triangle mendapatkan warna secara acak.

Implementasi interaksi mouse dan konversi NDC terdapat pada event canvas dan fungsi `updateMouseNdc()`.

## Animasi

Animasi utama dijalankan menggunakan:

```javascript
requestAnimationFrame(render);
```

Setiap frame program menghitung `deltaTime`.

```javascript
const deltaTime =
  Math.min((now - lastFrameTime) * 0.001, 0.05);
```

Delta time membuat pergerakan objek lebih konsisten dan tidak bergantung secara langsung pada FPS.

## Moving Objects

Program memiliki beberapa triangle yang bergerak otomatis.

Setiap objek memiliki data:

```text
x
y
vx
vy
size
color
```

`vx` adalah kecepatan horizontal.

`vy` adalah kecepatan vertikal.

Jika objek menyentuh batas canvas, arah kecepatannya dibalik:

```javascript
if (object.x < -bound || object.x > bound) {
  object.vx *= -1;
}
```

Konsep yang sama diterapkan pada koordinat Y sehingga objek memantul di dalam area render.

## Speed Control

Slider Speed digunakan untuk mengubah kecepatan animasi dan pergerakan Hero Shape.

Nilai awal:

```text
0.35
```

Rentang:

```text
0 sampai 1.5
```

Semakin besar nilai slider, semakin cepat pergerakan objek.

## Brightness Control

Brightness Slider digunakan untuk mengubah intensitas seluruh warna pada scene.

Rentang:

```text
0 sampai 2
```

Nilai awal:

```text
1.00
```

Brightness dikirim ke Fragment Shader melalui:

```glsl
uniform float u_brightness;
```

## Hero Color

Warna Hero Shape dapat diubah menggunakan tombol:

```text
Red
Green
Blue
Cyan
Random
```

Warna disimpan sebagai RGB dengan rentang:

```text
0.0 sampai 1.0
```

Contoh:

```javascript
red: [1, 0.15, 0.12]
green: [0.1, 0.95, 0.45]
blue: [0.25, 0.55, 1]
cyan: [0.1, 0.95, 1]
```

## Primitive Toggle

Beberapa kategori primitive dapat ditampilkan atau disembunyikan menggunakan checkbox:

```text
Show Triangles
Show Points
Show Lines
```

Hero Shape tetap ditampilkan meskipun kategori primitive tertentu dimatikan.

Hal tersebut memungkinkan Hero Shape tetap digunakan untuk eksperimen draw mode.

## Spawn Triangle

Setiap klik pada canvas menghasilkan triangle baru.

Data triangle disimpan ke dalam:

```javascript
state.spawned
```

Triangle dibuat menggunakan fungsi:

```javascript
buildTriangleAt()
```

Setiap triangle memiliki warna acak yang dibuat menggunakan:

```javascript
Math.random()
```

Spawned triangle dapat dihapus menggunakan tombol:

```text
Clear Spawned
```

## Pause dan Resume

Animasi dapat dihentikan melalui:

```text
Space
P
Pause Button
```

Ketika animasi dihentikan, status berubah menjadi:

```text
PAUSED · WEBGL2
```

Ketika dijalankan kembali:

```text
RUNNING · WEBGL2
```

Program juga melakukan penyesuaian terhadap waktu pause agar animasi tidak meloncat setelah dilanjutkan.

## Reset

Reset dapat dilakukan dengan:

```text
R
```

atau tombol:

```text
Reset (R)
```

Reset akan:

* Mengembalikan posisi Hero Shape ke tengah.
* Menghapus spawned triangle.
* Mengembalikan posisi moving objects ke posisi awal.

## HUD

Di bagian bawah canvas terdapat HUD yang menampilkan informasi realtime.

### FPS

Menampilkan perkiraan frame per second.

```text
FPS
```

### Primitives

Menampilkan jumlah primitive atau objek yang sedang dikelola scene.

```text
Primitives
```

### Draw Mode

Menampilkan draw mode Hero Shape.

Contoh:

```text
TRIANGLES
LINE_STRIP
POINTS
```

### Mouse NDC

Menampilkan posisi mouse dalam koordinat NDC.

Contoh:

```text
(0.24, -0.37)
```

HUD diperbarui melalui fungsi `updateHud()`.

## Render Pipeline

Secara sederhana alur rendering pada project ini adalah:

```text
JavaScript
   |
   v
Vertex Data
   |
   v
Vertex Buffer Object
   |
   v
Vertex Array Object
   |
   v
Vertex Shader
   |
   v
Primitive Assembly
   |
   v
Rasterization
   |
   v
Fragment Shader
   |
   v
Framebuffer
   |
   v
Canvas
```

JavaScript mengirim data vertex menuju GPU.

Vertex Shader memproses posisi vertex.

WebGL kemudian membentuk primitive berdasarkan draw mode.

Primitive dirasterisasi menjadi fragment.

Fragment Shader menentukan warna akhir.

Hasil rendering ditampilkan pada canvas.

## Render Loop

Render loop utama memiliki alur:

```text
render()
   |
   +-- hitung deltaTime
   |
   +-- updateKeyboard()
   |
   +-- updateMovingObjects()
   |
   +-- update time
   |
   +-- drawScene()
   |
   +-- hitung FPS
   |
   +-- updateHud()
   |
   +-- requestAnimationFrame()
```

Implementasi render loop menggunakan `requestAnimationFrame()` dan memperbarui keyboard, moving object, waktu, scene, FPS, dan HUD secara berulang.

## Draw Scene

Fungsi utama untuk menggambar scene adalah:

```javascript
drawScene();
```

Pada fungsi tersebut WebGL melakukan:

```javascript
gl.viewport(...)
gl.clearColor(...)
gl.clear(...)
gl.useProgram(...)
```

Kemudian menggambar:

```text
Showcase Triangle
Moving Triangle
Spawned Triangle
Points
Lines
Hero Shape
```

## Cara Menjalankan

Clone atau download project kemudian jalankan menggunakan web server lokal.

Contoh dengan Visual Studio Code:

1. Buka folder project.
2. Install extension Live Server.
3. Klik kanan `index.html`.
4. Pilih `Open with Live Server`.

Project kemudian dapat dibuka melalui browser.

Contoh:

```text
http://127.0.0.1:5500/
```

Disarankan menggunakan browser modern seperti:

```text
Google Chrome
Microsoft Edge
Mozilla Firefox
```

yang mendukung WebGL2.

## Catatan

Project ini sengaja menggunakan WebGL2 secara langsung tanpa framework agar konsep dasar pipeline grafika dapat dipelajari dengan lebih jelas.

Project juga belum menggunakan transformation matrix seperti:

```text
Model Matrix
View Matrix
Projection Matrix
```

Pergerakan Hero Shape dilakukan menggunakan uniform:

```glsl
u_offset
```

Sehingga fokus utama project adalah pemahaman fundamental WebGL2 sebelum masuk ke transformasi berbasis matrix.

## Kesimpulan

Melalui project ini dapat dipelajari beberapa konsep penting dalam WebGL2, yaitu:

* Cara membuat WebGL2 context.
* Cara membuat dan melakukan kompilasi shader.
* Cara menghubungkan Vertex Shader dan Fragment Shader.
* Cara menggunakan attribute dan uniform.
* Cara mengirim warna dari Vertex Shader menuju Fragment Shader.
* Cara menggunakan Vertex Array Object.
* Cara menggunakan interleaved vertex buffer.
* Cara menggambar berbagai primitive WebGL.
* Cara membuat animasi menggunakan `requestAnimationFrame`.
* Cara mengontrol objek melalui keyboard.
* Cara menggunakan mouse dan koordinat NDC.
* Cara membuat geometry secara procedural.
* Cara mengatur warna dan brightness menggunakan shader.
* Cara membuat aplikasi WebGL2 yang interaktif tanpa library eksternal.

Project ini dapat digunakan sebagai dasar untuk mempelajari materi WebGL2 berikutnya seperti transformation matrix, texture, camera, 3D object, lighting, dan projection.
