import * as THREE from 'three';
import { createBuilding } from './scene/building.js';
import { FRONT_Z, ROOMS } from './scene/layout.js';
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
import { Banner } from './ui/banner.js';
import { Progress } from './game/progress.js';
import { RoomTracker } from './game/roomTracker.js';
import { ARTIFACTS } from './data/artifacts.js';
import { createExhibits } from './scene/exhibits.js';
import { Hover } from './game/hover.js';
import { InspectMode, EXPLORE_S } from './game/inspect.js';
import { InspectPanel } from './ui/inspectPanel.js';
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

// ---------- Koleksi: pedestal + artefak (data di data/artifacts.js) ----------
// Tidak ikut mergeStatic: model harus bisa di-raycast & disorot satu per satu.
const exhibits = createExhibits(ARTIFACTS);
scene.add(exhibits.group);

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
for (const g of [building.group, aula.group, courtyard.group, facade.group, booth.group, garden.group, door.group, exhibits.group]) {
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
  colliders: [...building.colliders, ...aula.colliders, ...courtyard.colliders, ...facade.colliders, ...booth.colliders, ...garden.colliders, ...door.colliders, ...exhibits.colliders], // dinding, saka, kios, papan, lampu, pintu, & pedestal tidak bisa ditembus
});

// ---------- Dialog petugas loket ----------
const dialog = new Dialog();
const CASHIER = 'Petugas Loket';

// ---------- Progress, quest, & pelacak ruangan ----------
const roomTracker = new RoomTracker(ROOMS); // ruang = entri ROOMS yang punya `info`
const progress = new Progress({ roomCount: roomTracker.all.length, artifactCount: exhibits.items.length });
const banner = new Banner();

// Setiap kali quest aktif berganti, beri tahu lewat toast singkat
progress.onChange(({ active, activeChanged }) => {
  if (activeChanged && active) dialog.toast(`Quest baru: ${active.label}`, 4000);
});

function onRoomEntered(info) {
  if (progress.visitRoom(info.id)) {
    // Pertama kali: banner penjelasan + achievement (hanya sekali per ruang)
    banner.showRoom(info);
    banner.achievement(info.achievement, `Ruang ditemukan ${progress.visited.size}/${progress.roomCount}`);
    if (progress.visited.size === progress.roomCount) {
      dialog.toast('Semua ruang sudah dijelajahi — koleksi segera hadir', 5000);
    }
  } else {
    banner.showLabel(info.title);
  }
}

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

  if (!progress.hasTicket) {
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
  door.open();
  dialog.open({
    name: CASHIER,
    pages: [{ text: 'Terima kasih! Ini tiketnya. Pintunya sudah saya buka, selamat menjelajah!' }],
    onClose: () => {
      resumeControls();
      progress.buyTicket(); // quest berikutnya ("Masuki museum") diumumkan lewat toast
    },
  });
}

window.addEventListener('keydown', (e) => {
  // e.defaultPrevented = tombol sudah dipakai dialog (mis. E untuk menutup), jangan dibuka lagi
  if (e.code !== 'KeyE' || e.repeat || e.defaultPrevented || dialog.isOpen || pauseMenu.isOpen || inspect.isActive) return;
  if (booth.isPlayerNear(camera.position)) talkToCashier();
  else if (hover.current) startInspect(hover.current);
});

// ---------- Menu jeda (Esc) ----------
const pauseMenu = new PauseMenu({
  getStatus: () => ({
    quests: progress.quests,
    rooms: roomTracker.all.map((r) => ({ title: r.title, visited: progress.visited.has(r.id) })),
  }),
  onResume: resumeControls,
  // Cara paling sederhana & pasti bersih: muat ulang halaman (semua state kembali awal)
  onRestart: () => location.reload(),
});

// Prioritas Esc: dialog terbuka → dialog yang menutup (ditangani Dialog, ditandai defaultPrevented);
// mode inspect → kembali berjalan; menu terbuka → lanjut; selain itu → buka menu jeda.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || e.repeat || e.defaultPrevented || dialog.isOpen) return;
  e.preventDefault();
  if (inspect.isActive) {
    inspect.exit();
  } else if (pauseMenu.isOpen) {
    pauseMenu.close();
  } else {
    pauseControls();
    dialog.hidePrompt();
    pauseMenu.open();
  }
});

// ---------- Koleksi: hover & inspect ----------
const hover = new Hover(camera, canvas, exhibits.items);
const inspectPanel = new InspectPanel({ onBack: () => inspect.exit() });
const inspect = new InspectMode(camera, canvas, {
  // Geser pusat pandangan sebesar setengah lebar panel (+ jaraknya ke tepi layar)
  getViewShift: () => (inspectPanel.el.offsetWidth + 16) / 2,
  onExit: () => {
    inspectPanel.hide();
    inspectLight.intensity = 0;
    resumeControls();
  },
  onExplored: (item) => {
    inspectPanel.setProgress(1, true);
    if (progress.inspectArtifact(item.data.id)) {
      banner.achievement('Koleksi diperiksa', `${item.data.nama} · ${progress.inspected.size}/${progress.artifactCount}`);
    }
  },
});

function startInspect(item) {
  pauseControls();
  dialog.hidePrompt();
  banner.hideRoom(); // banner ruang berada di tengah atas & bisa menutupi artefak
  hover.clear();
  inspectPanel.show(item.data, progress.inspected.has(item.data.id));
  // Lampu khusus inspect, di depan-atas artefak (ruang pusaka sengaja redup)
  inspectLight.position.copy(item.focus).addScaledVector(item.viewDir, 1).add(new THREE.Vector3(0, 1, 0));
  inspectLight.intensity = 4;
  inspect.enter(item);
}

// Klik (bukan seret untuk menoleh) pada artefak yang sedang disorot → periksa
let pointerDownAt = null;
canvas.addEventListener('pointerdown', (e) => { pointerDownAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  const start = pointerDownAt;
  pointerDownAt = null;
  if (!start || !hover.current || inspect.isActive || !controls.enabled) return;
  if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 5) startInspect(hover.current);
});

// ---------- Light pool ----------
// 23 PointLight (ruangan, lampu gantung aula, kios, lampu taman) → hanya 8 terdekat yang menyala.
// Dibuat setelah semua modul scene selesai menambahkan lampunya.
const lightPool = createLightPool(scene, { size: 8 });
lightPool.update(camera.position);

// Lampu inspect dibuat SETELAH pool (tidak ikut dipindah-pindah pool). Selalu ada di scene
// dengan intensitas 0, supaya jumlah lampu tetap & shader tidak dikompilasi ulang saat inspect.
const inspectLight = new THREE.PointLight(0xfff0dd, 0, 5, 2);
scene.add(inspectLight);

// ---------- Loop ----------
const clock = new THREE.Clock();
const perf = new PerfOverlay(renderer); // tombol ` untuk menampilkan angka performa

function loop() {
  const dt = Math.min(clock.getDelta(), 0.1); // dibatasi supaya tidak "teleport" saat tab kembali aktif
  controls.update(dt);
  booth.update(dt, camera.position);
  if (door.update(dt)) renderer.shadowMap.needsUpdate = true; // bayangan pintu ikut bergerak

  inspect.update(dt);
  if (inspect.state === 'inspecting' && !progress.inspected.has(inspect.item.data.id)) {
    inspectPanel.setProgress(inspect.viewTime / EXPLORE_S, false);
  }

  // Sorot artefak hanya saat berjalan bebas (bukan saat dialog, menu, atau inspect)
  hover.enabled = controls.enabled && !dialog.isOpen && !pauseMenu.isOpen && !inspect.isActive;
  const hovered = hover.update();

  // Prompt "E": bicara dengan petugas, atau periksa artefak yang disorot
  if (!dialog.isOpen && !pauseMenu.isOpen && !inspect.isActive) {
    if (booth.isPlayerNear(camera.position)) dialog.showPrompt('Bicara dengan petugas loket');
    else if (hovered) dialog.showPrompt(`Periksa ${hovered.data.nama} (atau klik)`);
    else dialog.hidePrompt();
  }

  const entered = roomTracker.update(dt, camera.position);
  if (entered) onRoomEntered(entered);

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
dialog.toast(`Quest: ${progress.activeQuest.label}`, 5000); // quest pertama: beli tiket