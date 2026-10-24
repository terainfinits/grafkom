/**
 * WalkControls — kontrol first-person sederhana.
 *  - WASD / panah  : jalan maju, mundur, geser kiri/kanan (relatif arah pandang)
 *  - Shift         : lari
 *  - Tahan klik kiri + geser mouse : menoleh (kiri/kanan = yaw, atas/bawah = pitch)
 *
 * Kursor tetap terlihat (tidak memakai PointerLock), sehingga nanti
 * bisa dipakai untuk hover & klik artifact dengan raycaster.
 */
export class WalkControls {
  constructor(camera, domElement, {
    speed = 3,             // meter per detik
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
    this.camera = camera;
    this.dom = domElement;
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

    // State lompat
    this.velocityY = 0;          // kecepatan vertikal saat ini
    this.onGround = true;        // apakah sedang menapak lantai
    this.jumpRequested = false;  // diisi saat Spasi ditekan, dipakai di update()

    this.enabled = true; // nanti dimatikan saat mode inspect

    // Orientasi disimpan sebagai yaw (putar kiri-kanan, sumbu Y) & pitch (sumbu X).
    // Urutan 'YXZ' membuat yaw diterapkan dulu, sehingga kamera tidak "miring".
    this.yaw = camera.rotation.y;
    this.pitch = 0;
    this.camera.rotation.order = 'YXZ';

    this.keys = new Set();
    this.dragging = false;

    // bind handler supaya bisa di-remove di dispose()
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = () => this.keys.clear();
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur); // cegah tombol "nyangkut" saat pindah tab
    this.dom.addEventListener('pointerdown', this._onPointerDown);
    this.dom.addEventListener('pointermove', this._onPointerMove);
    this.dom.addEventListener('pointerup', this._onPointerUp);
    this.dom.addEventListener('pointercancel', this._onPointerUp);
  }

  // ---------- Input keyboard ----------
  _onKeyDown(e) {
    if (!this.enabled || e.defaultPrevented) return; // abaikan tombol yang sudah dipakai UI (mis. dialog)
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); // jangan scroll halaman
    if (e.code === 'Space' && !e.repeat) this.jumpRequested = true; // menahan Spasi tidak memicu lompat berulang
    this.keys.add(e.code);
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  // ---------- Input mouse (drag untuk menoleh) ----------
  _onPointerDown(e) {
    if (!this.enabled || e.button !== 0) return;
    this.dragging = true;
    this.dom.setPointerCapture(e.pointerId);
    this.dom.classList.add('is-dragging');
  }

  _onPointerMove(e) {
    if (!this.enabled || !this.dragging) return;
    // geser ke kanan → yaw berkurang → kamera menoleh ke kanan
    this.yaw -= e.movementX * this.lookSensitivity;
    this.pitch -= e.movementY * this.lookSensitivity;
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
  }

  _onPointerUp(e) {
    this.dragging = false;
    if (this.dom.hasPointerCapture(e.pointerId)) this.dom.releasePointerCapture(e.pointerId);
    this.dom.classList.remove('is-dragging');
  }

  _pressed(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  // ---------- Dipanggil tiap frame ----------
  update(dt) {
    if (!this.enabled) return;

    // 1) Terapkan orientasi
    this.camera.rotation.set(this.pitch, this.yaw, 0);

    // 2) Baca input gerak (-1, 0, 1)
    const forward = (this._pressed('KeyW', 'ArrowUp') ? 1 : 0) - (this._pressed('KeyS', 'ArrowDown') ? 1 : 0);
    const strafe  = (this._pressed('KeyD', 'ArrowRight') ? 1 : 0) - (this._pressed('KeyA', 'ArrowLeft') ? 1 : 0);
    const pos = this.camera.position;

    // 3) Gerak horizontal — hanya jika ada input
    //    (tidak lagi pakai "return" lebih awal, karena lompat tetap harus dihitung walau diam)
    if (forward !== 0 || strafe !== 0) {
      // Arah maju & kanan di bidang XZ (hanya pakai yaw, jadi menunduk tidak membuat "terbang")
      // Kamera default melihat ke -Z.
      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      let dx = forward * -sin + strafe * cos;
      let dz = forward * -cos + strafe * -sin;

      // normalisasi supaya jalan diagonal tidak lebih cepat
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;

      const run = this._pressed('ShiftLeft', 'ShiftRight') ? this.runMultiplier : 1;
      const step = this.speed * run * dt;

      // Gerak per sumbu: kalau X menabrak, Z tetap boleh jalan (dan sebaliknya),
      // sehingga pemain "menyusur" penghalang alih-alih berhenti total.
      const nextX = pos.x + dx * step;
      if (!this._collides(nextX, pos.z)) pos.x = nextX;

      const nextZ = pos.z + dz * step;
      if (!this._collides(pos.x, nextZ)) pos.z = nextZ;
    }

    // 4) Gerak vertikal — lompat & gravitasi
    if (this.jumpRequested && this.onGround) {
      this.velocityY = this.jumpSpeed;
      this.onGround = false;
    }
    this.jumpRequested = false; // Spasi saat masih di udara diabaikan (tidak ada double jump)

    this.velocityY -= this.gravity * dt; // gravitasi mengurangi kecepatan ke atas tiap frame
    pos.y += this.velocityY * dt;

    if (pos.y <= this.eyeHeight) {       // menyentuh lantai
      pos.y = this.eyeHeight;
      this.velocityY = 0;
      this.onGround = true;
    }

    // 5) Batasi agar tidak menembus dinding
    if (this.bounds) {
      const b = this.bounds;
      pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x));
      pos.z = Math.max(b.minZ, Math.min(b.maxZ, pos.z));
    }
  }

  // Apakah titik (x, z) menabrak salah satu collider aktif?
  // Setiap kotak diperbesar sebesar radius pemain.
  _collides(x, z) {
    const r = this.radius;
    return this.colliders.some((c) =>
      c.enabled !== false &&
      x > c.minX - r && x < c.maxX + r &&
      z > c.minZ - r && z < c.maxZ + r
    );
  }

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