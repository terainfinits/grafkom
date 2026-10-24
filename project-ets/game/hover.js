import * as THREE from 'three';

/**
 * Hover — mendeteksi artefak yang ditunjuk kursor dengan Raycaster, lalu menyorotnya.
 *
 * Cara kerja raycasting: dari posisi kursor di layar (dikonversi ke koordinat NDC −1…1)
 * ditarik sinar dari kamera ke dalam scene. Benda pertama yang tertembus sinar = yang ditunjuk.
 * Sinar hanya diuji terhadap model artefak (bukan seluruh gedung), jadi murah dijalankan
 * setiap frame, dan dibatasi jarak supaya artefak harus didekati dulu.
 *
 * Sorotan: warna emissive material dinaikkan sedikit (keemasan), lalu dikembalikan
 * ke nilai asli saat kursor pergi.
 */
const MAX_DISTANCE = 3.5;
const HIGHLIGHT = new THREE.Color(0xffc070);
const HIGHLIGHT_INTENSITY = 0.35;

export class Hover {
  constructor(camera, domElement, items) {
    this.camera = camera;
    this.dom = domElement;
    this.items = items;
    this.models = items.map((it) => it.model);
    this.current = null; // item yang sedang disorot
    this.enabled = true;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = MAX_DISTANCE;
    this.pointer = new THREE.Vector2(0, 0);
    this._hasPointer = false;

    domElement.addEventListener('pointermove', (e) => {
      const r = domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this._hasPointer = true;
    });
    domElement.addEventListener('pointerleave', () => { this._hasPointer = false; });
  }

  // Dipanggil setiap frame (pemain bisa berjalan mendekat tanpa menggerakkan mouse)
  update() {
    let hit = null;
    if (this.enabled && this._hasPointer) {
      // Matriks kamera diperbarui dulu: WalkControls baru saja mengubah posisi/rotasinya
      // di frame ini, sedangkan render (yang biasanya memperbaruinya) terjadi setelah ini
      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const [first] = this.raycaster.intersectObjects(this.models, true);
      if (first) hit = this._itemOf(first.object);
    }
    if (hit !== this.current) {
      if (this.current) setHighlight(this.current.model, false);
      if (hit) setHighlight(hit.model, true);
      this.current = hit;
      this.dom.style.cursor = hit ? 'pointer' : '';
    }
    return this.current;
  }

  clear() {
    if (this.current) setHighlight(this.current.model, false);
    this.current = null;
    this.dom.style.cursor = '';
  }

  // Naik ke induk sampai ketemu root model yang punya artifactId
  _itemOf(obj) {
    while (obj && obj.userData.artifactId === undefined) obj = obj.parent;
    return obj ? this.items.find((it) => it.model === obj) : null;
  }
}

function setHighlight(model, on) {
  model.traverse((obj) => {
    if (!obj.isMesh || !obj.material.emissive) return;
    const m = obj.material;
    if (on) {
      m.userData.baseEmissive ??= m.emissive.clone();
      m.userData.baseEmissiveIntensity ??= m.emissiveIntensity;
      m.emissive.copy(HIGHLIGHT);
      m.emissiveIntensity = HIGHLIGHT_INTENSITY;
    } else if (m.userData.baseEmissive) {
      m.emissive.copy(m.userData.baseEmissive);
      m.emissiveIntensity = m.userData.baseEmissiveIntensity;
    }
  });
}
