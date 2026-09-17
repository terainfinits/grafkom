/** Matriks identitas 3×3 */
function mat3Identity() {
  return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
}

/** Perkalian matriks a × b (keduanya 3×3, column-major) */
function mat3Multiply(a, b) {
  const r = new Float32Array(9);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      r[col * 3 + row] =
        a[row] * b[col * 3] +
        a[3 + row] * b[col * 3 + 1] +
        a[6 + row] * b[col * 3 + 2];
    }
  }
  return r;
}

/** Matriks translasi (x, y) */
function mat3Translate(x, y) {
  return new Float32Array([1, 0, 0, 0, 1, 0, x, y, 1]);
}

/** Matriks skala (bisa non-uniform: sx ≠ sy) */
function mat3Scale(sx, sy) {
  return new Float32Array([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
}

/** Matriks rotasi, derajat berlawanan arah jarum jam terhadap sumbu Z */
function mat3Rotate(degrees) {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
}

/**
 * Urutan A — "T × R × S"
 * Skala & rotasi diterapkan di local space objek terlebih dahulu,
 * baru dipindahkan ke posisi akhir. Objek berputar/berskala di
 * sekitar titik pivot-nya sendiri (perilaku "normal").
 */
function mat3TRS(o) {
  let m = mat3Identity();
  m = mat3Multiply(m, mat3Translate(o.x, o.y));
  m = mat3Multiply(m, mat3Rotate(o.rotation));
  m = mat3Multiply(m, mat3Scale(o.scaleX, o.scaleY));
  return m;
}

/**
 * Urutan B — "R × T × S"
 * Objek diskalakan dahulu, lalu dipindahkan, baru diputar terhadap
 * ORIGIN dunia. Akibatnya posisi objek ikut berputar mengelilingi
 * (0,0) — hasil visualnya jelas berbeda dari T × R × S meski
 * angka x, y, rotation, scale yang dimasukkan sama persis.
 */
function mat3RTS(o) {
  let m = mat3Identity();
  m = mat3Multiply(m, mat3Rotate(o.rotation));
  m = mat3Multiply(m, mat3Translate(o.x, o.y));
  m = mat3Multiply(m, mat3Scale(o.scaleX, o.scaleY));
  return m;
}

/** Translate lalu rotate saja, dipakai untuk orbit sederhana (tanpa skala) */
function mat3TR(x, y, degrees) {
  return mat3Multiply(mat3Translate(x, y), mat3Rotate(degrees));
}