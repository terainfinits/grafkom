import * as THREE from 'three';
import { createBuilding } from './scene/building.js';
import { FRONT_Z } from './scene/layout.js';
import { WalkControls } from './controls/walkControls.js';
import { createTicketBooth } from './scene/ticketBooth.js';
import { createOutdoor, YARD } from './scene/outdoor.js';
import { createFacade } from './scene/facade.js';
import { createGarden } from './scene/garden.js';
import { createEntranceDoor } from './scene/entranceDoor.js';
import { createAula } from './scene/aula.js';
import { createCourtyard } from './scene/courtyard.js';
import { Dialog } from './ui/dialog.js';
import { PauseMenu } from './ui/pauseMenu.js';
import { PerfOverlay } from './ui/perfOverlay.js';
import { mergeStatic } from './scene/optimize.js';
import { createLightPool } from './scene/lightPool.js';

// ---------- Renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15; // sedikit lebih terang, warna golden hour tetap hangat
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // tepi bayangan lebih halus
// Matahari & gedung tidak bergerak, jadi peta bayangan cukup digambar sekali (lalu hanya
// saat ada yang bergerak, mis. pintu). Ini menghapus satu pass render penuh di setiap frame.
renderer.shadowMap.autoUpdate = false;

// ---------- Scene ----------
const scene = new THREE.Scene(); // langit & fog diatur di createOutdoor()

// ---------- Camera ----------
const EYE_HEIGHT = 1.6; // tinggi mata dalam meter
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300); // far diperbesar untuk area luar
// Mulai di halaman, di jalan paving, menghadap gedung (−Z, arah default kamera)
const START_DISTANCE = 13; // jarak dari dinding depan, supaya seluruh fasad & loket terlihat
camera.position.set(0, EYE_HEIGHT, FRONT_Z + START_DISTANCE);

// ---------- Ruangan ----------
const building = createBuilding(); // denah diatur di scene/layout.js
scene.add(building.group);

// ---------- Aula: soko guru & tumpang sari ----------
const aula = createAula();
scene.add(aula.group);

// ---------- Taman tengah: kolam, kamboja, bangku ----------
const courtyard = createCourtyard();
scene.add(courtyard.group);

// ---------- Fasad (atap limasan, serambi, saka) ----------
const facade = createFacade();
scene.add(facade.group);

// ---------- Loket (di luar, samping pintu) ----------
const booth = createTicketBooth();
scene.add(booth.group);

// ---------- Pintu masuk (kupu tarung, terbuka setelah beli tiket) ----------
const door = createEntranceDoor();
scene.add(door.group);

// ---------- Area luar (langit, tanah, matahari) ----------
const outdoor = createOutdoor(scene);
scene.add(outdoor.group);

// ---------- Taman depan (papan nama & lampu taman) ----------
const garden = createGarden();
scene.add(garden.group);

// ---------- Optimasi: gabungkan mesh statis ----------
// Ratusan kotak kecil (dinding, lis, hiasan, atap, tiang, ...) digabung menjadi satu mesh
// per material → draw call turun drastis. Loket & pintu tidak ikut karena ada yang bergerak.
for (const g of [building.group, aula.group, courtyard.group, facade.group, garden.group]) mergeStatic(g);

// Semua mesh gedung, fasad, loket, taman, & pintu ikut memberi dan menerima bayangan matahari.
// Atap ikut memberi bayangan, jadi cahaya matahari hanya masuk lewat pintu.
for (const g of [building.group, aula.group, courtyard.group, facade.group, booth.group, garden.group, door.group]) {
  g.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = obj.receiveShadow = true;
  });
}

// ---------- Kontrol jalan ----------
const YARD_MARGIN = 0.5; // jarak minimal ke tepi halaman
const controls = new WalkControls(camera, canvas, {
  speed: 3,
  eyeHeight: EYE_HEIGHT,
  bounds: {
    // Dinding sudah punya collider sendiri, jadi bounds cukup membatasi halaman luar
    minX: YARD.minX + YARD_MARGIN,
    maxX: YARD.maxX - YARD_MARGIN,
    minZ: YARD.minZ + YARD_MARGIN,
    maxZ: YARD.maxZ - YARD_MARGIN,
  },
  colliders: [...building.colliders, ...aula.colliders, ...courtyard.colliders, ...facade.colliders, ...booth.colliders, ...garden.colliders, ...door.colliders], // dinding, saka, kios, papan, lampu, & pintu tidak bisa ditembus
});

// ---------- Dialog petugas loket ----------
const dialog = new Dialog();
const CASHIER = 'Petugas Loket';
let hasTicket = false;

// Halaman panduan — dipakai saat pertama kali & saat pemain minta diulang
const GUIDE_PAGES = [
  { text: 'Selamat datang di <strong>Museum Interaktif 3D</strong>! Sebelum masuk, saya jelaskan dulu cara berkeliling, ya.' },
  { text: 'Tekan <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> untuk berjalan, tahan <kbd>Shift</kbd> untuk berlari, dan <kbd>Spasi</kbd> untuk melompat.' },
  { text: 'Untuk melihat sekeliling, <strong>tahan klik kiri</strong> lalu geser mouse.' },
  { text: 'Di dalam ada banyak artifact yang bisa kamu dekati dan periksa. Coba jelajahi semuanya, ya!' },
  { text: 'Kalau lupa kontrolnya, tekan <kbd>Esc</kbd> kapan saja untuk membuka <strong>menu jeda</strong>.' },
];

function pauseControls() {
  controls.enabled = false;
  controls.dragging = false;
  controls.keys.clear(); // supaya tidak ada tombol "nyangkut" saat dialog dibuka
}

function resumeControls() {
  controls.enabled = true;
}

function talkToCashier() {
  pauseControls();

  if (!hasTicket) {
    dialog.open({
      name: CASHIER,
      pages: [
        ...GUIDE_PAGES,
        {
          text: 'Tiket masuk museum <strong>Rp10.000</strong>. Mau beli sekarang?',
          actions: [
            { label: 'Beli tiket', onClick: buyTicket },
            { label: 'Nanti dulu', onClick: () => dialog.close() },
          ],
        },
      ],
      onClose: resumeControls,
    });
  } else {
    dialog.open({
      name: CASHIER,
      pages: [{
        text: 'Kamu sudah punya tiket. Silakan masuk lewat pintu di bawah papan <strong>Pintu Masuk</strong>, ya!',
        actions: [
          { label: 'Tutup', onClick: () => dialog.close() },
          { label: 'Ulangi panduan', onClick: () => dialog.open({ name: CASHIER, pages: GUIDE_PAGES, onClose: resumeControls }) },
        ],
      }],
      onClose: resumeControls,
    });
  }
}

function buyTicket() {
  hasTicket = true;
  door.open();
  dialog.open({
    name: CASHIER,
    pages: [{ text: 'Terima kasih! Ini tiketnya. Pintunya sudah saya buka, selamat menjelajah!' }],
    onClose: () => {
      resumeControls();
      dialog.toast('Tiket didapat — silakan masuk lewat pintu');
    },
  });
}

window.addEventListener('keydown', (e) => {
  // e.defaultPrevented = tombol sudah dipakai dialog (mis. E untuk menutup), jangan dibuka lagi
  if (e.code !== 'KeyE' || e.repeat || e.defaultPrevented || dialog.isOpen || pauseMenu.isOpen) return;
  if (booth.isPlayerNear(camera.position)) talkToCashier();
});

// ---------- Menu jeda (Esc) ----------
const pauseMenu = new PauseMenu({
  getStatus: () => ({ hasTicket, explored: 0, total: 0 }), // artifact belum ada → total 0
  onResume: resumeControls,
  // Cara paling sederhana & pasti bersih: muat ulang halaman (semua state kembali awal)
  onRestart: () => location.reload(),
});

// Prioritas Esc: dialog terbuka → dialog yang menutup (ditangani Dialog, ditandai defaultPrevented);
// menu terbuka → lanjut; selain itu → buka menu jeda.
// (Nanti: saat mode inspect, Esc = kembali dari inspect.)
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || e.repeat || e.defaultPrevented || dialog.isOpen) return;
  e.preventDefault();
  if (pauseMenu.isOpen) {
    pauseMenu.close();
  } else {
    pauseControls();
    dialog.hidePrompt();
    pauseMenu.open();
  }
});

// ---------- Light pool ----------
// 23 PointLight (ruangan, lampu gantung aula, kios, lampu taman) → hanya 8 terdekat yang menyala.
// Dibuat setelah semua modul scene selesai menambahkan lampunya.
const lightPool = createLightPool(scene, { size: 8 });
lightPool.update(camera.position);

// ---------- Loop ----------
const clock = new THREE.Clock();
const perf = new PerfOverlay(renderer); // tombol ` untuk menampilkan angka performa

function loop() {
  const dt = Math.min(clock.getDelta(), 0.1); // dibatasi supaya tidak "teleport" saat tab kembali aktif
  controls.update(dt);
  booth.update(dt, camera.position);
  if (door.update(dt)) renderer.shadowMap.needsUpdate = true; // bayangan pintu ikut bergerak

  // tampilkan "E – Bicara" hanya saat dekat loket, dan tidak ada dialog / menu yang terbuka
  if (!dialog.isOpen && !pauseMenu.isOpen) {
    if (booth.isPlayerNear(camera.position)) dialog.showPrompt('Bicara dengan petugas loket');
    else dialog.hidePrompt();
  }

  lightPool.update(camera.position);
  renderer.render(scene, camera);
  perf.update(dt);
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Mulai ----------
// Shader dikompilasi dulu (di balik layar loading) sebelum loop berjalan. Tanpa ini,
// kompilasi terjadi di frame pertama & saat pertama kali melihat material baru → tersendat.
controls.enabled = false;
await renderer.compileAsync(scene, camera);
renderer.shadowMap.needsUpdate = true; // gambar peta bayangan statis sekali
clock.getDelta();                      // buang selisih waktu selama loading
renderer.setAnimationLoop(loop);
controls.enabled = true;

const loading = document.getElementById('loading');
loading.classList.add('is-done');
loading.addEventListener('transitionend', () => loading.remove());
