/*
File Purpose: Main entry point for the 3D Interactive Museum Tour application. Configures the WebGL renderer, scene graph, first-person walk controls, interactive UI overlays, dynamic lighting pool, artifact inspect mode, quest progression, and core animation loop.

Connected Files:
- ./scene/building.js, ./scene/aula.js, ./scene/courtyard.js, ./scene/facade.js, ./scene/ticketBooth.js, ./scene/entranceDoor.js, ./scene/exhibits.js, ./scene/outdoor.js, ./scene/garden.js: Modules creating physical 3D scene elements.
- ./scene/layout.js: Holds spatial layout definitions (ROOMS data and FRONT_Z origin coordinate).
- ./controls/walkControls.js: First-person navigation and collision detection system.
- ./ui/dialog.js, ./ui/pauseMenu.js, ./ui/completionScreen.js, ./ui/perfOverlay.js, ./ui/devPanel.js, ./ui/banner.js, ./ui/inspectPanel.js, ./ui/mapQuiz.js: Visual UI components for dialogues, pause menu, completion screen, stats overlay, room banners, and inspection drawers.
- ./game/progress.js, ./game/roomTracker.js, ./game/hover.js, ./game/inspect.js: Game loop logic, quest progression, spatial room detection, raycast target highlighting, and artifact examination modes.
- ./scene/models.js: Loads external GLB models (GLTFLoader + MeshoptDecoder) and normalizes their scale.
- ./scene/optimize.js: Provides mesh merging helpers (`mergeStatic`) to reduce WebGL draw calls.
- ./scene/vfx/fireflies.js: Firefly particle VFX (THREE.Points) in the courtyard and front yard.
- ./scene/vfx/ripples.js: Lotus pond water VFX (scrolling normal map + expanding ripple rings).
- ./scene/vfx/petals.js: Falling flower petal VFX (InstancedMesh) shown when the completion screen opens.
- ./scene/secretStone.js, ./ui/secretViewer.js: Easter egg — garden stone that lights up after every quest is done, showing the project assignment.
- ./scene/lightPool.js: Dynamic point light management system cycling closest active light sources.
- ./audio/music.js, ./data/music.js: Background music playlist (fade-in on door open, ducking during inspect/quiz).
- ./audio/sfx.js, ./audio/footsteps.js: Sound effects (Web Audio): dialog blip, ticket coin, surface-aware footsteps.
- ./data/artifacts.js: Structured array containing museum exhibit metadata.
*/

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
import { CompletionScreen } from './ui/completionScreen.js';
import { PerfOverlay } from './ui/perfOverlay.js';
import { DevPanel } from './ui/devPanel.js';
import { Music } from './audio/music.js';
import { Sfx } from './audio/sfx.js';
import { Footsteps } from './audio/footsteps.js';
import { Banner } from './ui/banner.js';
import { Progress } from './game/progress.js';
import { RoomTracker } from './game/roomTracker.js';
import { ARTIFACTS } from './data/artifacts.js';
import { createExhibits } from './scene/exhibits.js';
import { loadModels } from './scene/models.js';
import { loadPaintingTextures } from './scene/paintings.js';
import { Hover } from './game/hover.js';
import { InspectMode, EXPLORE_S } from './game/inspect.js';
import { InspectPanel } from './ui/inspectPanel.js';
import { MapQuiz, MAX_SCORE } from './ui/mapQuiz.js';
import { mergeStatic } from './scene/optimize.js';
import { createLightPool } from './scene/lightPool.js';
import { createFireflies } from './scene/vfx/fireflies.js';
import { createRipples } from './scene/vfx/ripples.js';
import { createSecretStone } from './scene/secretStone.js';
import { SecretViewer } from './ui/secretViewer.js';
import { createPetals } from './scene/vfx/petals.js';

// ---------- Renderer (WebGL Renderer initialization & Shadow Map configuration) ----------
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

// ---------- Scene (root creation) ----------
const scene = new THREE.Scene(); // langit & fog diatur di createOutdoor()

// ---------- Camera ----------
const EYE_HEIGHT = 1.6; // tinggi mata dalam meter
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300); // far diperbesar untuk area luar
// Mulai di halaman, di jalan paving, menghadap gedung (−Z, arah default kamera)
const START_DISTANCE = 13; // jarak dari dinding depan, supaya seluruh fasad & loket terlihat
camera.position.set(0, EYE_HEIGHT, FRONT_Z + START_DISTANCE);

// Instantiate and add 3D scene elements to scene graph
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
// File GLB (mis. pinisi) dimuat dulu — masih di balik layar loading.
const [models, textures] = await Promise.all([loadModels(ARTIFACTS), loadPaintingTextures(ARTIFACTS)]);
const exhibits = createExhibits(ARTIFACTS, { models, textures });
// Koleksi utama = yang dihitung ke progres; koleksi pendukung (`sekunder: true`, mis. lukisan)
// tetap bisa diperiksa tetapi tidak menjadi syarat selesai
const mainItems = exhibits.items.filter((i) => !i.data.sekunder);
scene.add(exhibits.group);

// ---------- Area luar (langit, tanah, matahari) ----------
const outdoor = createOutdoor(scene);
scene.add(outdoor.group);

// ---------- Taman depan (papan nama & lampu taman) ----------
const garden = createGarden();
scene.add(garden.group);

// ---------- VFX: kunang-kunang di taman tengah & halaman depan ----------
// Tidak ikut mergeStatic & bayangan (partikel bergerak, tidak memberi bayangan).
const fireflies = createFireflies();
scene.add(fireflies.group);

// ---------- VFX: riak air kolam teratai di taman tengah ----------
const ripples = createRipples(courtyard.water);
scene.add(ripples.group);

// ---------- Easter egg: prasasti di taman (menyala setelah semua quest selesai) ----------
const secretStone = createSecretStone();
scene.add(secretStone.group);

// ---------- VFX: kelopak bunga berguguran saat layar selesai ----------
const petals = createPetals();
scene.add(petals.group);

// ---------- Optimasi: gabungkan mesh statis ----------
// Ratusan kotak kecil (dinding, lis, hiasan, atap, tiang, ...) digabung menjadi satu mesh
// per material → draw call turun drastis. Loket & pintu tidak ikut karena ada yang bergerak.
for (const g of [building.group, aula.group, courtyard.group, facade.group, garden.group]) mergeStatic(g);

// Semua mesh gedung, fasad, loket, taman, & pintu ikut memberi dan menerima bayangan matahari.
// Atap ikut memberi bayangan, jadi cahaya matahari hanya masuk lewat pintu.
for (const g of [building.group, aula.group, courtyard.group, facade.group, booth.group, garden.group, door.group, exhibits.group, secretStone.group]) {
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
  colliders: [...building.colliders, ...aula.colliders, ...courtyard.colliders, ...facade.colliders, ...booth.colliders, ...garden.colliders, ...door.colliders, ...exhibits.colliders, ...secretStone.colliders], // dinding, saka, kios, papan, lampu, pintu, & pedestal tidak bisa ditembus
});

// ---------- Dialog petugas loket ----------
const dialog = new Dialog();

// ---------- Musik latar (mulai saat pintu terbuka) ----------
const music = new Music();

// ---------- Efek suara: dimuat di balik layar loading ----------
const sfx = new Sfx();
await sfx.load();
dialog.onPage = () => sfx.play('blip', { volume: 0.5, rate: 0.95 + Math.random() * 0.1 });
const footsteps = new Footsteps(sfx, controls);
const CASHIER = 'Mas Bima · Petugas Loket';

// ---------- Progress, quest, & pelacak ruangan ----------
const roomTracker = new RoomTracker(ROOMS); // ruang = entri ROOMS yang punya `info`
// Kuis tebak asal (opsional): koleksi yang ditandai `kuis: true` di data/artifacts.js
const QUIZ_COUNT = ARTIFACTS.filter((a) => a.kuis).length;
const progress = new Progress({
  roomCount: roomTracker.all.length, artifactCount: mainItems.length,
  quizCount: QUIZ_COUNT, quizAvailable: QUIZ_COUNT > 0,
  secondaryCount: exhibits.items.length - mainItems.length, // lukisan: progres opsional
});
const banner = new Banner();

// Setiap kali quest aktif berganti, beri tahu lewat toast singkat.
// Saat semua syarat terpenuhi, layar selesai tidak langsung dibuka (pemain mungkin masih
// di mode inspect / achievement masih tampil) — cukup ditandai, lalu dibuka di loop.
let completionPending = false;
let completionDelay = 0;
progress.onChange(({ active, activeChanged, justCompleted, justFoundAllSecondary, justUnlockedSecret }) => {
  if (activeChanged && active) dialog.toast(`Quest baru: ${active.label}`, 4000);
  if (justCompleted) completionPending = true;
  if (justFoundAllSecondary) onAllPaintingsFound();
  if (justUnlockedSecret) onSecretUnlocked();
});

// Easter egg: semua quest selesai → prasasti di taman menyala & bisa diperiksa. Petunjuknya
// ditunda supaya tidak bertumpuk dengan achievement / layar selesai yang muncul bersamaan.
function onSecretUnlocked() {
  secretStone.active = true;
  setTimeout(() => dialog.toast('Ada sesuatu yang mulai bercahaya di taman…', 6000), 9000);
}

// Semua lukisan (koleksi pendukung) sudah dilihat → achievement saja. Tidak memengaruhi
// status selesai (yang ditentukan koleksi utama).
function onAllPaintingsFound() {
  // Ditunda: kartu "Lukisan ditemukan" untuk lukisan terakhir tampil lebih dulu (± 4 detik)
  setTimeout(() => banner.achievement('Kurator Sejati', 'Semua lukisan sudah kamu temukan'), 4200);
}

function onRoomEntered(info) {
  if (progress.visitRoom(info.id)) {
    // Pertama kali: banner penjelasan + achievement (hanya sekali per ruang)
    banner.showRoom(info);
    banner.achievement(info.achievement, `Ruang ditemukan ${progress.visited.size}/${progress.roomCount}`);
    // Hanya kalau koleksi belum lengkap; kalau sudah lengkap, layar selesai yang muncul
    if (progress.visited.size === progress.roomCount && !progress.allDone) {
      dialog.toast('Semua ruang sudah dijelajahi — tinggal periksa koleksi yang tersisa', 5000);
    }
  } else {
    banner.showLabel(info.title);
  }
}

// Halaman panduan — dipakai saat pertama kali & saat pemain minta diulang
const GUIDE_PAGES = [
  { text: 'Selamat sore, selamat datang di <strong>Museum Interaktif 3D</strong>! Saya Bima, petugas loket hari ini. Sebelum masuk, saya jelaskan sebentar, ya.' },
  { text: 'Untuk berkeliling: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> berjalan, tahan <kbd>Shift</kbd> berlari, <kbd>Spasi</kbd> melompat. <strong>Tahan klik kiri</strong> lalu geser mouse untuk melihat sekeliling.' },
  { text: 'Ada <strong>delapan ruang</strong> yang bisa ditemukan, mulai dari kain tradisional, alat musik, sampai senjata pusaka. Ruang Pusaka ada di bagian paling dalam, di balik Aula.' },
  { text: 'Koleksi yang bisa diperiksa akan <strong>bercahaya</strong> saat kursormu mengarah ke sana. Tekan <kbd>E</kbd> atau klik, lalu amati beberapa detik sampai koleksinya tercatat.' },
  { text: 'Beberapa koleksi punya <strong>kuis tebak asal</strong>: tebak daerah asalnya di peta sambil mengamati bendanya. Tidak wajib, tapi skornya lumayan untuk dipamerkan.' },
  { text: 'Kunjunganmu selesai setelah <strong>semua ruang dijelajahi</strong> dan <strong>semua koleksi diperiksa</strong>. Mau lihat progres atau lupa kontrolnya? Tekan <kbd>Esc</kbd> kapan saja.' },
];

function pauseControls() {
  controls.enabled = false;
  controls.dragging = false;
  controls.keys.clear(); // supaya tidak ada tombol "nyangkut" saat dialog dibuka
}

function resumeControls() {
  controls.enabled = true;
}

// Handles conversation flow with ticket booth NPC
function talkToCashier() {
  pauseControls();

  if (!progress.hasTicket) {
    dialog.open({
      name: CASHIER,
      pages: [
        ...GUIDE_PAGES,
        {
          text: 'Tiket masuknya <strong>Rp10.000</strong> per orang. Mau beli sekarang?',
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
        text: 'Tiketmu sudah ada. Silakan masuk lewat pintu di bawah papan <strong>Pintu Masuk</strong>, ya. Selamat menikmati!',
        actions: [
          { label: 'Tutup', onClick: () => dialog.close() },
          { label: 'Ulangi panduan', onClick: () => dialog.open({ name: CASHIER, pages: GUIDE_PAGES, onClose: resumeControls }) },
        ],
      }],
      onClose: resumeControls,
    });
  }
}

// Executes ticket purchase action, opens entrance door, and updates quest progression state
function buyTicket() {
  sfx.play('coin', { volume: 0.7 });
  door.open();
  music.start(); // musik masuk pelan bersamaan dengan pintu terbuka
  dialog.open({
    name: CASHIER,
    pages: [{ text: 'Terima kasih! Ini tiketnya. Pintunya sudah saya bukakan. Selamat menjelajah, semoga betah!' }],
    onClose: () => {
      resumeControls();
      progress.buyTicket(); // quest berikutnya ("Masuki museum") diumumkan lewat toast
    },
  });
}

// Interaction Hotkey 'E' listener
window.addEventListener('keydown', (e) => {
  // e.defaultPrevented = tombol sudah dipakai dialog (mis. E untuk menutup), jangan dibuka lagi
  if (e.code !== 'KeyE' || e.repeat || e.defaultPrevented || dialog.isOpen || pauseMenu.isOpen || completion.isOpen || secret.isOpen || quiz.isOpen || inspect.isActive) return;
  if (booth.isPlayerNear(camera.position)) talkToCashier();
  else if (secretStone.active && secretStone.isPlayerNear(camera.position)) openSecret();
  else if (hover.current) startInspect(hover.current);
});

// ---------- Menu jeda (Esc) / Pause Menu system & 'Escape' hotkey binding ----------
const pauseMenu = new PauseMenu({
  music,
  sfx,
  getStatus: () => ({
    quests: progress.quests,
    rooms: roomTracker.all.map((r) => ({ title: r.title, visited: progress.visited.has(r.id) })),
  }),
  onResume: resumeControls,
  // Cara paling sederhana & pasti bersih: muat ulang halaman (semua state kembali awal)
  onRestart: () => location.reload(),
});

// ---------- Layar selesai ----------
// ---------- Easter egg: layar "asal-usul" ----------
const secret = new SecretViewer({ onClose: resumeControls });
let secretSeen = false;
function openSecret() {
  pauseControls();
  dialog.hidePrompt();
  hover.clear();
  secret.open();
  sfx.play('easter-egg', { volume: 0.8 });
  if (!secretSeen) {
    secretSeen = true;
    banner.achievement('Pencari Asal-usul', 'Kamu menemukan alasan museum ini ada');
  }
}

const completion = new CompletionScreen({
  onContinue: resumeControls, // museum tetap bisa dijelajahi setelah selesai
  onRestart: () => location.reload(), // sama seperti "Mulai ulang" di menu jeda
});

// Prioritas Esc: dialog terbuka → dialog yang menutup (ditangani Dialog, ditandai defaultPrevented);
// mode inspect → kembali berjalan; layar selesai → lanjut menjelajah; menu terbuka → lanjut;
// selain itu → buka menu jeda.
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape' || e.repeat || e.defaultPrevented || dialog.isOpen) return;
  e.preventDefault();
  if (secret.isOpen) {
    secret.close();
  } else if (quiz.isOpen) {
    quiz.close(); // batal: kamera kembali, kuis muncul lagi saat koleksi diperiksa lagi
    inspect.exit();
  } else if (inspect.isActive) {
    inspect.exit();
  } else if (completion.isOpen) {
    completion.close();
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
  getViewShift: () => ((quiz.isOpen ? quiz.el : inspectPanel.el).offsetWidth + 16) / 2,
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

// Enters detailed inspection camera mode and positions focused inspection light source
// ---------- Kuis tebak asal ----------
const quiz = new MapQuiz({ onAnswer: () => sfx.play('quiz-answer', { volume: 0.7 }) }); // bunyi apa pun hasilnya

// Panel kuis menggantikan panel info selama menebak; kamera sudah di mode inspect, jadi
// artefak bisa diputar sambil menebak. Waktu mengamati (progres koleksi) dijeda sampai
// panel info dibuka sesudah menebak.
function startQuiz(item) {
  quiz.open(item.data, (score) => {
    progress.answerQuiz(item.data.id, score);
    banner.achievement('Kuis dijawab', `${item.data.nama} · skor ${score.toLocaleString('id-ID')}`);
    inspectPanel.show(item.data, progress.inspected.has(item.data.id));
    inspect.timing = true;
  });
}

function startInspect(item) {
  pauseControls();
  dialog.hidePrompt();
  banner.hideRoom(); // banner ruang berada di tengah atas & bisa menutupi artefak
  hover.clear();
  // Koleksi berkuis yang belum dijawab: panel kuis dulu, panel info sesudahnya
  const needsQuiz = item.data.kuis && !progress.quizzesDone.has(item.data.id);
  inspect.timing = !needsQuiz && !item.data.sekunder; // koleksi pendukung: tanpa aturan 3 detik
  if (needsQuiz) startQuiz(item);
  else inspectPanel.show(item.data, progress.inspected.has(item.data.id));
  // Koleksi pendukung langsung tercatat begitu diperiksa (tanpa aturan 3 detik)
  if (item.data.sekunder && progress.viewSecondary(item.data.id)) {
    banner.achievement('Lukisan ditemukan', `${item.data.nama} · ${progress.secondarySeen.size}/${progress.secondaryCount}`);
  }
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
  if (!start || !hover.current || inspect.isActive || completion.isOpen || secret.isOpen || quiz.isOpen || !controls.enabled) return;
  if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 5) startInspect(hover.current);
});

// ---------- Light pool ----------
// Semua PointLight (ruangan, lampu gantung aula, kios, lampu taman, sorot koleksi) → hanya 8 terdekat yang menyala.
// Dibuat setelah semua modul scene selesai menambahkan lampunya.
const lightPool = createLightPool(scene, { size: 8 });
lightPool.update(camera.position);

// Lampu inspect dibuat SETELAH pool (tidak ikut dipindah-pindah pool). Selalu ada di scene
// dengan intensitas 0, supaya jumlah lampu tetap & shader tidak dikompilasi ulang saat inspect.
const inspectLight = new THREE.PointLight(0xfff0dd, 0, 5, 2);
scene.add(inspectLight);

// ---------- Loop (Main Application Engine Loop) ----------
const clock = new THREE.Clock();
const COMPLETION_DELAY_S = 1.5; // jeda sebelum layar selesai muncul
const perf = new PerfOverlay(renderer); // tombol ` untuk menampilkan angka performa

// ---------- Mode developer (ikut tombol `) ----------
// Lompat ke akhir permainan untuk menguji layar selesai. Pintu ikut dibuka supaya
// pemain tetap bisa masuk walau tiket "dibeli" lewat jalan pintas.
//   'all'      : semua selesai — ruang, koleksi utama, kuis (skor penuh), & lukisan
//   'main'     : semua ruang & koleksi utama kecuali satu (pinisi di lobi) → uji layar selesai
//   'painting' : semua lukisan kecuali satu (Diponegoro di lobi) → uji achievement lukisan;
//                koleksi utama tidak disentuh, jadi game belum selesai
const secondaryItems = exhibits.items.filter((i) => i.data.sekunder);
function devSkip(mode) {
  const left = mode === 'main' ? mainItems.at(-1) : mode === 'painting' ? secondaryItems[0] : null;
  if (!progress.hasTicket) { door.open(); music.start(); }
  const wasFinished = progress.finishedAt !== null;
  const ids = (items) => items.map((i) => i.data.id).filter((id) => id !== left?.data.id);
  progress.devComplete(mode === 'painting'
    ? { secondary: ids(secondaryItems) }
    : {
        rooms: roomTracker.all.map((r) => r.id),
        artifacts: ids(mainItems),
        quizzes: mode === 'all' ? ARTIFACTS.filter((a) => a.kuis).map((a) => [a.id, MAX_SCORE]) : [],
        secondary: mode === 'all' ? ids(secondaryItems) : [],
      });
  if (left) {
    const room = roomTracker.all.find((r) => r.id === left.data.ruang);
    dialog.toast(`Developer mode: tinggal periksa ${left.data.nama}${room ? ` di ${room.title}` : ''}`, 5000);
  } else if (wasFinished) {
    dialog.toast('Developer mode: kunjungan sudah selesai. Pakai Mulai ulang untuk menguji lagi', 5000);
  }
}
new DevPanel({
  onCompleteAll: () => devSkip('all'),
  onLeaveOne: () => devSkip('main'),
  onLeaveOnePainting: () => devSkip('painting'),
  music,
});

function loop() {
  const dt = Math.min(clock.getDelta(), 0.1); // dibatasi supaya tidak "teleport" saat tab kembali aktif
  controls.update(dt);
  footsteps.update(dt, camera.position);
  booth.update(dt, camera.position);
  fireflies.update(dt);
  secretStone.update(dt);
  ripples.update(dt);
  petals.update(dt);
  if (door.update(dt)) renderer.shadowMap.needsUpdate = true; // bayangan pintu ikut bergerak

  inspect.update(dt);
  if (inspect.state === 'inspecting' && !progress.inspected.has(inspect.item.data.id)) {
    inspectPanel.setProgress(inspect.viewTime / EXPLORE_S, false);
  }

  // Sorot artefak hanya saat berjalan bebas (bukan saat dialog, menu, atau inspect)
  // Musik diredam selama memeriksa koleksi, kuis, layar selesai, & layar easter egg
  music.ducked = inspect.isActive || quiz.isOpen || completion.isOpen || secret.isOpen; // layar selesai & easter egg: bunyinya terdengar jelas
  music.update(dt);

  hover.enabled = controls.enabled && !dialog.isOpen && !pauseMenu.isOpen && !completion.isOpen && !secret.isOpen && !quiz.isOpen && !inspect.isActive;
  const hovered = hover.update();

  // Prompt "E": bicara dengan petugas, atau periksa artefak yang disorot
  if (!dialog.isOpen && !pauseMenu.isOpen && !completion.isOpen && !secret.isOpen && !quiz.isOpen && !inspect.isActive) {
    if (booth.isPlayerNear(camera.position)) dialog.showPrompt('Bicara dengan petugas loket');
    else if (secretStone.active && secretStone.isPlayerNear(camera.position)) dialog.showPrompt('Periksa prasasti yang bercahaya');
    else if (hovered) dialog.showPrompt(hovered.data.kuis && !progress.quizzesDone.has(hovered.data.id)
      ? `Kuis: tebak asal ${hovered.data.nama} (atau klik)`
      : `Periksa ${hovered.data.nama} (atau klik)`);
    else dialog.hidePrompt();
  }

  // Pelacak ruang hanya saat berjalan: di mode inspect kamera bisa mengorbit menembus dinding
  // ke ruang sebelah — itu bukan "mengunjungi" ruang tersebut
  if (!inspect.isActive) {
    const entered = roomTracker.update(dt, camera.position);
    if (entered) onRoomEntered(entered);
  }

  // Layar selesai dibuka setelah pemain kembali berjalan bebas, dengan jeda singkat
  // supaya achievement koleksi/ruang terakhir sempat terbaca lebih dulu.
  if (completionPending && controls.enabled && !dialog.isOpen && !pauseMenu.isOpen && !secret.isOpen && !quiz.isOpen && !inspect.isActive) {
    completionDelay += dt;
    if (completionDelay >= COMPLETION_DELAY_S) {
      completionPending = false;
      pauseControls();
      dialog.hidePrompt();
      hover.clear();
      petals.burst(camera.position); // perayaan: kelopak berguguran di sekitar pemain
      sfx.play('completion', { volume: 0.8 });
      completion.open({
        rooms: [progress.visited.size, progress.roomCount],
        artifacts: [progress.inspected.size, progress.artifactCount],
        elapsedMs: progress.elapsedMs,
        quiz: progress.quizzesDone.size ? [progress.quizScore, progress.quizCount * MAX_SCORE] : null,
      });
    }
  }

  lightPool.update(camera.position);
  renderer.render(scene, camera);
  perf.update(dt);
}

// ---------- Resize (Window Resizing Handler) ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Mulai ----------
// Shader dikompilasi dulu (di balik layar loading) sebelum loop berjalan. Tanpa ini,
// kompilasi terjadi di frame pertama & saat pertama kali melihat material baru → tersendat.
// Asynchronous Application Bootstrap & Shader Pre-compilation
controls.enabled = false;
await renderer.compileAsync(scene, camera); // Warm up WebGL shader programs behind the loading screen to eliminate runtime frame stutter
renderer.shadowMap.needsUpdate = true; // gambar peta bayangan statis sekali
clock.getDelta();                      // buang selisih waktu selama loading
renderer.setAnimationLoop(loop);
controls.enabled = true;

const loading = document.getElementById('loading');
loading.classList.add('is-done');
loading.addEventListener('transitionend', () => loading.remove());
progress.start(); // lama kunjungan dihitung sejak museum siap dijelajahi
dialog.toast(`Quest: ${progress.activeQuest.label}`, 5000); // quest pertama: beli tiket
