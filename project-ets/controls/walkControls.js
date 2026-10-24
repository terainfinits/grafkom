/**
File Purpose: Mengelola sistem kontrol pergerakan sudut pandang orang pertama (first-person walk controls), rotasi kamera mouse (pitch/yaw), lompatan berbasis gravitasi, serta deteksi benturan (collision detection) dengan batas halaman dan collider objek 3D.

Connected Files:
- ../main.js: Menginisialisasi kelas WalkControls, mengirimkan referensi kamera, kanvas WebGL, serta memperbarui state pergerakan pada setiap frame render (loop).
- ../scene/outdoor.js: Mengirimkan data batas koordinat area luar (YARD bounds) untuk membatasi pergerakan pemain di area luar gedung.
- ../scene/building.js, ../scene/aula.js, ../scene/courtyard.js, ../scene/facade.js, ../scene/ticketBooth.js, ../scene/garden.js, ../scene/entranceDoor.js, ../scene/exhibits.js: Menyediakan array collider bounding box untuk mencegah pemain menembus dinding dan objek fisik.

 * WalkControls — kontrol first-person sederhana.
 *  - WASD / panah  : jalan maju, mundur, geser kiri/kanan (relatif arah pandang)
 *  - Shift         : lari
 *  - Tahan klik kiri + geser mouse : menoleh (kiri/kanan = yaw, atas/bawah = pitch)
 *
 * Kursor tetap terlihat (tidak memakai PointerLock), sehingga nanti
 * bisa dipakai untuk hover & klik artifact dengan raycaster.
 */
export class WalkControls {
  /*Menginisialisasi WalkControls dengan variabel kamera, DOM kanvas, serta konfigurasi pergerakan dan collider */
  constructor(camera, domElement, {
    speed = 3,               // meter per detik
    runMultiplier = 1.8,
    lookSensitivity = 0.003, // radian per pixel geser mouse
    maxPitch = Math.PI / 3,  // batas menunduk/mendongak (60°)
    eyeHeight = 1.6,
    bounds = null,           // { minX, maxX, minZ, maxZ }
    jumpSpeed = 4.5,         // kecepatan awal lompat (m/s) → tinggi lompat ± 0,7 m
    gravity = 14,            // percepatan jatuh (m/s²), sedikit lebih kuat dari 9,8 agar terasa "game"
    colliders = [],          // daftar penghalang { minX, maxX, minZ, maxZ, enabled }
    radius = 0.3,            // "lebar badan" pemain, supaya tidak menempel ke objek
  } = {}) {
    // Menyimpan objek kamera Three.js dan elemen DOM kanvas
    this.camera = camera;
    this.dom = domElement;
    // Menyimpan variabel konfigurasi kecepatan gerak, sensitivitas rotasi, dan atribut fisik pemain
    this.speed = speed;
    this.runMultiplier = runMultiplier;
    this.lookSensitivity = lookSensitivity;
    this.maxPitch = maxPitch;
    this.eyeHeight = eyeHeight;
    this.bounds = bounds;
    this.jumpSpeed = jumpSpeed;
    this.gravity = gravity;
    this.colliders = colliders;
    this.radius = radius;

    // State lompat / State vertikal untuk kalkulasi gravitasi dan mekanik lompatan
    this.velocityY = 0;          // kecepatan vertikal saat ini
    this.onGround = true;        // apakah sedang menapak lantai
    this.jumpRequested = false;  // diisi saat Spasi ditekan, dipakai di update()

    // Flag status aktifnya kontrol pergerakan pemain
    this.enabled = true; // nanti dimatikan saat mode inspect

    // Menyimpan sudut rotasi yaw (Y) dan pitch (X) dengan urutan rotasi YXZ agar kamera tidak miring
    // Orientasi disimpan sebagai yaw (putar kiri-kanan, sumbu Y) & pitch (sumbu X).
    // Urutan 'YXZ' membuat yaw diterapkan dulu, sehingga kamera tidak "miring".
    this.yaw = camera.rotation.y;
    this.pitch = 0;
    this.camera.rotation.order = 'YXZ';

    // Menyimpan tombol keyboard yang sedang ditekan dan status drag mouse
    this.keys = new Set();
    this.dragging = false;

    // bind handler supaya bisa di-remove di dispose()
    // Memikat (bind) fungsi event handler agar context 'this' tetap terjaga saat dipasang pada event listener
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = () => this.keys.clear();
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    // Memasang event listener keyboard dan pointer pada window dan elemen DOM
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur); // cegah tombol "nyangkut" saat pindah tab
    this.dom.addEventListener('pointerdown', this._onPointerDown);
    this.dom.addEventListener('pointermove', this._onPointerMove);
    this.dom.addEventListener('pointerup', this._onPointerUp);
    this.dom.addEventListener('pointercancel', this._onPointerUp);
  }

  // ---------- Input keyboard ----------
  // Handler tombol keyboard ditekan
  _onKeyDown(e) {
    // Percabangan untuk mengabaikan input jika kontrol nonaktif atau event sudah ditangani elemen lain
    if (!this.enabled || e.defaultPrevented) return; // abaikan tombol yang sudah dipakai UI (mis. dialog)
    // Mencegah efek scroll default browser saat menekan tombol panah atau spasi
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); // jangan scroll halaman
    // Memeriksa input tombol spasi untuk memicu permintaan lompat tanpa pengulangan (repeat)
    if (e.code === 'Space' && !e.repeat) this.jumpRequested = true; // menahan Spasi tidak memicu lompat berulang
    // Menambahkan kode tombol yang ditekan ke dalam Set penampung input aktif
    this.keys.add(e.code);
  }
  // Handler saat tombol keyboard dilepas, menghapus tombol dari penampung
  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  // ---------- Input mouse (drag untuk menoleh) ----------
  // Handler saat tombol mouse/pointer ditekan untuk memulai rotasi kamera (drag)
  _onPointerDown(e) {
    // Percabangan mengecek apakah kontrol aktif dan tombol yang ditekan adalah klik kiri (button 0)
    if (!this.enabled || e.button !== 0) return;
    this.dragging = true;
    this.dom.setPointerCapture(e.pointerId);
    this.dom.classList.add('is-dragging');
  }
  // Handler pergerakan pointer untuk memperbarui sudut rotasi pandangan (yaw dan pitch)
  _onPointerMove(e) {
    // Percabangan mengabaikan gerakan pointer jika kontrol nonaktif atau mouse tidak sedang didrag
    if (!this.enabled || !this.dragging) return;
    // geser ke kanan → yaw berkurang → kamera menoleh ke kanan
    // Mengkalkulasi perubahan sudut rotasi pandangan berdasarkan pergerakan mouse dan sensitivitas
    this.yaw -= e.movementX * this.lookSensitivity;
    this.pitch -= e.movementY * this.lookSensitivity;
    // membatasi sudut pitch agar tidak melebihi batas atas/bawah (maxPitch)
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
  }
  // Handler saat tombol pointer dilepas untuk menghentikan status drag
  _onPointerUp(e) {
    this.dragging = false;
    // Percabangan melepaskan pointer capture jika sebelumnya aktif pada elemen DOM
    if (this.dom.hasPointerCapture(e.pointerId)) this.dom.releasePointerCapture(e.pointerId);
    this.dom.classList.remove('is-dragging');
  }
  // Fungsi pembantu untuk mengecek apakah salah satu dari kode tombol yang diberikan sedang ditekan
  _pressed(...codes) {  
    return codes.some((c) => this.keys.has(c));
  }

  // ---------- Dipanggil tiap frame ----------
  // Memperbarui rotasi, posisi pergerakan horizontal, lompatan vertikal, serta deteksi kolisi di tiap frame
  update(dt) {
    // Percabangan menghentikan pembaruan jika kontrol sedang dinonaktifkan
    if (!this.enabled) return;

    // 1) Terapkan orientasi; Mengatur rotasi kamera sesuai dengan sudut pitch dan yaw terkini
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    // 2) Baca input gerak (-1, 0, 1); Mengkalkulasi nilai vektor pergerakan maju/mundur dan kiri/kanan berdasarkan input tombol aktif
    const forward = (this._pressed('KeyW', 'ArrowUp') ? 1 : 0) - (this._pressed('KeyS', 'ArrowDown') ? 1 : 0);
    const strafe  = (this._pressed('KeyD', 'ArrowRight') ? 1 : 0) - (this._pressed('KeyA', 'ArrowLeft') ? 1 : 0);
    const pos = this.camera.position;

    // 3) Gerak horizontal — hanya jika ada input; Percabangan utama mengeksekusi kalkulasi pergerakan bidang XZ jika ada input tombol pergerakan
    //    (tidak lagi pakai "return" lebih awal, karena lompat tetap harus dihitung walau diam)
    if (forward !== 0 || strafe !== 0) {
      // Arah maju & kanan di bidang XZ (hanya pakai yaw, jadi menunduk tidak membuat "terbang"); 
      // Kamera default melihat ke -Z.; Mengkalkulasi proyeksi pergerakan pada sumbu XZ relatif terhadap sudut pandang yaw
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      let dx = forward * -sin + strafe * cos;
      let dz = forward * -cos + strafe * -sin;

      // normalisasi supaya jalan diagonal tidak lebih cepat; Menormalisasi panjang vektor pergerakan agar kecepatan jalan diagonal tetap konsisten
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      // Menghitung pengganda kecepatan jika tombol Shift ditekan (lari) serta besaran pergeseran posisi (step)
      const run = this._pressed('ShiftLeft', 'ShiftRight') ? this.runMultiplier : 1;
      const step = this.speed * run * dt;

      // Gerak per sumbu: kalau X menabrak, Z tetap boleh jalan (dan sebaliknya),
      // sehingga pemain "menyusur" penghalang alih-alih berhenti total. ; 
      // Mengecek dan menerapkan pergerakan sumbu X secara terpisah; jika tidak membentur, posisi X diperbarui
      const nextX = pos.x + dx * step;
      if (!this._collides(nextX, pos.z)) pos.x = nextX;
      // Mengecek dan menerapkan pergerakan sumbu Z secara terpisah; jika tidak membentur, posisi Z diperbarui
      const nextZ = pos.z + dz * step;
      if (!this._collides(pos.x, nextZ)) pos.z = nextZ;
    }

    // 4) Gerak vertikal — lompat & gravitasi
    // Percabangan menangani lompatan jika ada permintaan lompat dan pemain sedang menapak tanah  
    if (this.jumpRequested && this.onGround) {
      this.velocityY = this.jumpSpeed;
      this.onGround = false;
    }
    // Spasi saat masih di udara diabaikan (tidak ada double jump)
    this.jumpRequested = false; // Spasi saat masih di udara diabaikan (tidak ada double jump)
    // Mengaplikasikan percepatan gravitasi terhadap kecepatan vertikal dan memperbarui posisi Y
    this.velocityY -= this.gravity * dt; // gravitasi mengurangi kecepatan ke atas tiap frame
    pos.y += this.velocityY * dt;
    // Percabangan mengecek pendaratan; menghentikan kejatuhan saat menyentuh atau berada di bawah tinggi mata
    if (pos.y <= this.eyeHeight) {       // menyentuh lantai
      pos.y = this.eyeHeight;
      this.velocityY = 0;
      this.onGround = true;
    }

    // 5) Batasi agar tidak menembus dinding; Percabangan membatasi koordinat posisi pemain agar berada di dalam batas (bounds) area luar yang ditentukan
    if (this.bounds) {
      const b = this.bounds;
      pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x));
      pos.z = Math.max(b.minZ, Math.min(b.maxZ, pos.z));
    }
  }

  // Apakah titik (x, z) menabrak salah satu collider aktif?
  // Setiap kotak diperbesar sebesar radius pemain.; Memeriksa benturan koordinat (x, z) terhadap seluruh objek collider aktif berdasar radius tubuh pemain
  _collides(x, z) {
    const r = this.radius;
    // Loop pemeriksaan kondisi AABB (Axis-Aligned Bounding Box) dengan toleransi radius pemain
    return this.colliders.some((c) =>
      c.enabled !== false &&
      x > c.minX - r && x < c.maxX + r &&
      z > c.minZ - r && z < c.maxZ + r
    );
  }
  // Membersihkan seluruh event listener saat kontrol dihentikan atau dihancurkan
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.dom.removeEventListener('pointerdown', this._onPointerDown);
    this.dom.removeEventListener('pointermove', this._onPointerMove);
    this.dom.removeEventListener('pointerup', this._onPointerUp);
    this.dom.removeEventListener('pointercancel', this._onPointerUp);
  }
}