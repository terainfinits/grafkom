import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * InspectMode — memeriksa satu artefak dari dekat.
 *
 * Alur:  idle → entering (kamera bergerak halus ke artefak) → inspecting (OrbitControls:
 *        seret untuk memutar, scroll untuk zoom) → leaving (kamera kembali) → idle
 *
 * Pergerakan kamera memakai interpolasi: posisi di-lerp, orientasi di-slerp (quaternion),
 * dengan kurva ease-in-out supaya mulai & berhenti dengan lembut.
 *
 * OrbitControls HANYA aktif selama mode ini; saat berjalan, kamera dikendalikan WalkControls.
 *
 * Panel info menutupi sisi kanan layar, jadi pusat pandangan kamera digeser ke kiri dengan
 * camera.setViewOffset (proyeksi digeser, bukan kameranya) — artefak tetap di tengah area
 * yang terlihat. Geseran ini ikut di-tween supaya tidak melompat.
 * Waktu mengamati dihitung — setelah EXPLORE_S detik, onExplored dipanggil (sekali per kunjungan).
 */
const TWEEN_S = 0.8;
export const EXPLORE_S = 3;

export class InspectMode {
  // getViewShift: fungsi yang mengembalikan berapa piksel pusat pandangan digeser ke kiri
  constructor(camera, domElement, { onEnter, onExit, onExplored, getViewShift = () => 0 } = {}) {
    this.camera = camera;
    this.callbacks = { onEnter, onExit, onExplored };
    this.getViewShift = getViewShift;

    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enabled = false;
    this.orbit.enablePan = false;
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.1;
    this.orbit.minPolarAngle = THREE.MathUtils.degToRad(10);  // jangan sampai tepat dari atas
    this.orbit.maxPolarAngle = THREE.MathUtils.degToRad(100); // jangan menembus lantai/pedestal

    this.state = 'idle';
    this.item = null;
    this.viewTime = 0;
    this.timing = true; // false = waktu mengamati tidak dihitung (diatur main.js, mis. selama kuis)
    this._explored = false;
    this._t = 0;
    this._from = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this._to = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this._saved = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this._lookMatrix = new THREE.Matrix4();
    this._targetPos = new THREE.Vector3();
    this._targetQuat = new THREE.Quaternion();
  }

  get isActive() {
    return this.state !== 'idle';
  }

  enter(item) {
    if (this.state !== 'idle') return;
    this.item = item;
    this.viewTime = 0;
    this._explored = false;
    this._saved.pos.copy(this.camera.position);
    this._saved.quat.copy(this.camera.quaternion);

    // Jarak supaya seluruh artefak masuk layar: radius / sin(setengah FOV), plus sedikit ruang
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    // Sudut & jarak tergantung jenis pajangan (lihat VIEW di scene/exhibits.js):
    // pedestal dilihat dari atas-depan, benda tegak & panel dinding dari hampir sejajar
    const elevation = THREE.MathUtils.degToRad(item.view.elevation);
    const dist = (item.radius / Math.sin(halfFov)) * item.view.distance;
    const offset = item.viewDir.clone().multiplyScalar(Math.cos(elevation) * dist);
    offset.y += Math.sin(elevation) * dist;
    this._targetPos.copy(item.focus).add(offset);

    // Orientasi akhir kamera: menghadap artefak. Matrix4.lookAt memakai konvensi KAMERA
    // (melihat ke arah −Z). Jangan pakai Object3D.lookAt pada objek biasa: objek biasa
    // menghadapkan +Z ke target, sehingga kamera justru ber-tween membelakangi artefak lalu
    // "melompat" balik saat OrbitControls mengambil alih.
    this._lookMatrix.lookAt(this._targetPos, item.focus, this.camera.up);
    this._targetQuat.setFromRotationMatrix(this._lookMatrix);

    this._startTween(this._targetPos, this._targetQuat, 'entering');
    this.callbacks.onEnter?.(item);
  }

  exit() {
    if (this.state !== 'inspecting' && this.state !== 'entering') return;
    this.orbit.enabled = false;
    this._startTween(this._saved.pos, this._saved.quat, 'leaving');
  }

  update(dt) {
    if (this.state === 'entering' || this.state === 'leaving') {
      this._t = Math.min(1, this._t + dt / TWEEN_S);
      const e = this._t * this._t * (3 - 2 * this._t); // smoothstep: ease-in-out
      this.camera.position.lerpVectors(this._from.pos, this._to.pos, e);
      if (this.state === 'entering') {
        // Saat mendekat, arah "menghadap artefak" dihitung ulang dari posisi kamera saat ini,
        // supaya pandangan tidak bergoyang walau posisi & rotasi diinterpolasi terpisah
        this._lookMatrix.lookAt(this.camera.position, this.item.focus, this.camera.up);
        this._targetQuat.setFromRotationMatrix(this._lookMatrix);
        this.camera.quaternion.slerpQuaternions(this._from.quat, this._targetQuat, e);
      } else {
        this.camera.quaternion.slerpQuaternions(this._from.quat, this._to.quat, e);
      }
      this._applyViewShift(this.state === 'entering' ? e : 1 - e);
      if (this._t < 1) return;

      if (this.state === 'entering') {
        this.state = 'inspecting';
        const r = this.item.radius;
        this.orbit.target.copy(this.item.focus);
        this.orbit.minDistance = r * 1.1;
        this.orbit.maxDistance = r * 3.5;
        this.orbit.enabled = true;
        this.orbit.update();
      } else {
        this.state = 'idle';
        this.camera.clearViewOffset();
        const item = this.item;
        this.item = null;
        this.callbacks.onExit?.(item);
      }
      return;
    }

    if (this.state === 'inspecting') {
      this._applyViewShift(1); // dipanggil tiap frame supaya tetap benar setelah jendela di-resize
      this.orbit.update();
      if (this.timing) this.viewTime += dt;
      if (!this._explored && this.viewTime >= EXPLORE_S) {
        this._explored = true;
        this.callbacks.onExplored?.(this.item);
      }
    }
  }

  _applyViewShift(amount) {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.setViewOffset(w, h, this.getViewShift() * amount, 0, w, h);
  }

  _startTween(pos, quat, state) {
    this._from.pos.copy(this.camera.position);
    this._from.quat.copy(this.camera.quaternion);
    this._to.pos.copy(pos);
    this._to.quat.copy(quat);
    this._t = 0;
    this.state = state;
  }
}
