// Import library utama Three.js dan kontrol kamera orbit (putar/zoom/geser dengan mouse)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Shortcut kecil untuk document.querySelector agar penulisan lebih singkat
const $ = (selector) => document.querySelector(selector);
// Elemen HTML tempat canvas WebGL akan dimasukkan
const container = $("#sceneContainer");

// ---------------- Scene, camera, renderer ----------------
// Scene = "dunia" 3D yang menampung semua objek, lampu, dan kamera
const scene = new THREE.Scene();
// Warna latar belakang scene
scene.background = new THREE.Color("#1b1f2a");
// Fog (kabut): objek makin jauh makin menyatu dengan warna latar (jarak 8 sampai 22)
const fog = new THREE.Fog("#1b1f2a", 8, 22); // dipasang saat toggle Fog aktif

// Posisi awal kamera (juga dipakai saat reset dan tampilan "iso")
const INITIAL_POSITION = new THREE.Vector3(4.8, 3.6, 6.5);
// Kamera perspektif: objek jauh tampak lebih kecil (FOV 50°, near 0.1, far 100)
const cameraPerspective = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
cameraPerspective.position.copy(INITIAL_POSITION);
// Kamera ortografis: tanpa efek perspektif, ukuran objek tetap sama berapa pun jaraknya
const cameraOrthographic = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
cameraOrthographic.position.copy(INITIAL_POSITION);
// Kamera yang sedang dipakai untuk merender (awalnya perspektif)
let activeCamera = cameraPerspective;

// Renderer: bertugas menggambar scene ke elemen <canvas>
const renderer = new THREE.WebGLRenderer({ antialias: true });
// Batasi pixel ratio maksimal 2 agar performa tetap baik di layar resolusi tinggi
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// Aktifkan bayangan dengan tipe PCF Soft (tepi bayangan lebih halus)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Gunakan ruang warna sRGB agar warna tampil akurat di layar
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Tempelkan canvas renderer ke halaman
container.appendChild(renderer.domElement);

// Clock untuk menghitung selisih waktu antar frame (delta time)
const clock = new THREE.Clock();
// Menyimpan tombol keyboard yang sedang ditekan (true/false)
const keys = {};
// State global aplikasi
const state = {
  animation: true, // animasi berjalan atau pause
  lightOrbit: false, // lampu bergerak mengelilingi scene atau tidak
  gallery: true, // galeri material terlihat atau tidak
  segment: 24, // jumlah segmen geometri (kehalusan bentuk)
  lightIntensity: 1.2, // intensitas directional light awal
  time: 0, // waktu animasi yang terakumulasi
  speed: 1, // pengali kecepatan animasi
};

// ---------------- OrbitControls ----------------
// Titik yang menjadi pusat pandangan kamera
const cameraTarget = new THREE.Vector3(0, 0.8, 0);
// Instance OrbitControls (dibuat ulang saat kamera berganti)
let controls;
// Nilai default pengaturan orbit
const orbitDefaults = {
  enabled: true,
  enableDamping: true, // gerakan kamera meluncur halus (inersia)
  enablePan: true, // izinkan geser kamera
  dampingFactor: 0.05,
  rotateSpeed: 1,
  zoomSpeed: 1,
};
// Salinan pengaturan yang bisa diubah user lewat UI
const orbitSettings = { ...orbitDefaults };

// Terapkan pengaturan orbit ke objek controls
function applyOrbitSettings() {
  Object.assign(controls, orbitSettings);
  // Slider damping hanya aktif jika damping dinyalakan
  $("#cameraDampingFactor").disabled = !orbitSettings.enableDamping;
}
// Kembalikan pengaturan orbit ke default dan sinkronkan tampilan input di UI
function resetOrbitSettings() {
  Object.assign(orbitSettings, orbitDefaults);
  for (const [key, value] of Object.entries(orbitSettings)) {
    const input = document.querySelector(`[data-orbit-setting="${key}"]`);
    // Checkbox memakai .checked, slider memakai .value + label angka
    if (typeof value === "boolean") input.checked = value;
    else {
      input.value = value;
      $(`#${input.id}Value`).textContent = value.toFixed(2);
    }
  }
}
// Pasang listener ke setiap input pengaturan orbit
document.querySelectorAll("[data-orbit-setting]").forEach((input) => {
  input.addEventListener("input", () => {
    // Simpan nilai baru (boolean untuk checkbox, angka untuk slider)
    orbitSettings[input.dataset.orbitSetting] =
      input.type === "checkbox" ? input.checked : Number(input.value);
    // Perbarui label angka di samping slider
    if (input.type !== "checkbox")
      $(`#${input.id}Value`).textContent = Number(input.value).toFixed(2);
    applyOrbitSettings();
  });
});
// Buat (ulang) OrbitControls untuk kamera aktif dengan target tertentu
function configureControls(target = cameraTarget) {
  // Buang controls lama agar event listener-nya tidak menumpuk
  controls?.dispose();
  controls = new OrbitControls(activeCamera, renderer.domElement);
  controls.target.copy(target);
  applyOrbitSettings();
  controls.update();
}
configureControls();

// ---------------- Cube utama (material bisa diganti) ----------------
// Kumpulan material yang bisa dipakai bergantian oleh cube utama
const cubeMaterials = {
  standard: new THREE.MeshStandardMaterial({ color: "#4df3ff", roughness: 0.28, metalness: 0.25 }),
  basic: new THREE.MeshBasicMaterial({ color: "#4df3ff" }),
  normal: new THREE.MeshNormalMaterial(),
  lambert: new THREE.MeshLambertMaterial({ color: "#4df3ff" }),
  phong: new THREE.MeshPhongMaterial({ color: "#4df3ff", shininess: 80 }),
};
// Nama tampilan tiap material untuk HUD
const materialNames = {
  standard: "Standard",
  basic: "Basic",
  normal: "Normal",
  lambert: "Lambert",
  phong: "Phong",
};
// Cube utama yang bisa digerakkan dengan keyboard
const mainCube = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), cubeMaterials.standard);
mainCube.position.set(-1.4, 1, 0);
// Cube ini menghasilkan bayangan
mainCube.castShadow = true;
// Nama yang ditampilkan saat objek dipilih
mainCube.userData.name = "Cube utama";
scene.add(mainCube);

// Ganti material cube utama dan perbarui dropdown + info HUD
function setCubeMaterial(name) {
  mainCube.material = cubeMaterials[name];
  $("#materialSelect").value = name;
  $("#materialInfo").textContent = materialNames[name];
}

// ---------------- Ground & objek ----------------
// Lantai berupa bidang 14x14
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14),
  new THREE.MeshLambertMaterial({ color: "#262b38" }),
);
// Plane secara default berdiri tegak, putar -90° agar menjadi datar
ground.rotation.x = -Math.PI / 2;
// Lantai menerima bayangan dari objek lain
ground.receiveShadow = true;
scene.add(ground);

// Helper untuk membuat mesh, mengatur posisi/bayangan/nama, lalu menambahkannya ke scene
function makeMesh(geometry, material, x, y, z, name) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.userData.name = name;
  scene.add(mesh);
  return mesh;
}
// Jumlah segmen awal untuk geometri melengkung
const seg = state.segment;
// Bola berwarna merah muda
const sphere = makeMesh(
  new THREE.SphereGeometry(0.72, seg, seg),
  new THREE.MeshPhongMaterial({ color: "#ff6584", shininess: 70 }),
  0.5, 0.85, 0, "Sphere",
);
// Challenge A: Cone, Cylinder, Torus (+ TorusKnot)
const cone = makeMesh(
  new THREE.ConeGeometry(0.65, 1.5, seg),
  new THREE.MeshStandardMaterial({ color: "#ffd166", roughness: 0.42, metalness: 0.08 }),
  1.9, 0.75, -0.2, "Cone",
);
const cylinder = makeMesh(
  new THREE.CylinderGeometry(0.5, 0.5, 1.4, seg),
  new THREE.MeshLambertMaterial({ color: "#95e06c" }),
  -3.4, 0.7, 1.4, "Cylinder",
);
const torus = makeMesh(
  new THREE.TorusGeometry(0.5, 0.2, 16, seg * 2),
  new THREE.MeshPhongMaterial({ color: "#c77dff", shininess: 90 }),
  3.4, 0.9, 1.6, "Torus",
);
// Miringkan torus 60° agar tampak lebih menarik
torus.rotation.x = Math.PI / 3;
const torusKnot = makeMesh(
  new THREE.TorusKnotGeometry(0.55, 0.18, 64, 12),
  new THREE.MeshNormalMaterial(),
  2.1, 1.1, -2, "Torus Knot",
);

// Challenge B: Material gallery — geometry sama, material berbeda
// Group menampung beberapa cube kecil sehingga bisa disembunyikan sekaligus
const gallery = new THREE.Group();
const galleryMaterials = [
  new THREE.MeshBasicMaterial({ color: "#74b9ff" }),
  new THREE.MeshNormalMaterial(),
  new THREE.MeshLambertMaterial({ color: "#55efc4" }),
  new THREE.MeshPhongMaterial({ color: "#a78bfa", shininess: 90 }),
];
const galleryNames = ["Basic", "Normal", "Lambert", "Phong"];
// Buat satu cube per material, disusun berjajar ke samping
galleryMaterials.forEach((material, index) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), material);
  mesh.position.set(-3.3 + index * 0.85, 0.35, -2.4);
  mesh.castShadow = true;
  mesh.userData.name = `Gallery · ${galleryNames[index]}`;
  gallery.add(mesh);
});
scene.add(gallery);

// ---------------- Bintang (Points) ----------------
// Jumlah bintang dan array posisi (x, y, z per bintang)
const starCount = 500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  // Koordinat bola acak: radius 14-24, sudut theta (horizontal) dan phi (vertikal)
  const r = 14 + Math.random() * 10;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 0.9 + 0.05); // belahan atas
  // Konversi koordinat bola ke koordinat kartesius
  starPositions.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)], i * 3);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
// Points merender tiap vertex sebagai titik; fog dimatikan agar bintang tetap terlihat
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: "#bfe9ff", size: 0.09, sizeAttenuation: true, fog: false }),
);
scene.add(stars);

// ---------------- Grid & axes ----------------
// Group panduan visual: grid lantai dan sumbu XYZ
const guides = new THREE.Group();
const grid = new THREE.GridHelper(14, 14, "#c39a4f", "#3a4051");
// Naikkan sedikit agar tidak berebut kedalaman dengan lantai (z-fighting)
grid.position.y = 0.01;
guides.add(grid, new THREE.AxesHelper(2.5));
// Awalnya disembunyikan
guides.visible = false;
scene.add(guides);

// ---------------- Lights ----------------
// Ambient light: cahaya merata dari segala arah agar sisi gelap tidak hitam pekat
scene.add(new THREE.AmbientLight("#9ecbff", 0.35));

// Directional light: cahaya paralel seperti matahari, juga menghasilkan bayangan
const directionalLight = new THREE.DirectionalLight("#ffffff", state.lightIntensity);
directionalLight.position.set(3, 6, 4);
directionalLight.castShadow = true;
// Resolusi shadow map (makin besar makin tajam tapi lebih berat)
directionalLight.shadow.mapSize.set(1024, 1024);
// Area yang dicakup kamera bayangan
Object.assign(directionalLight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.1, far: 20 });
// Target lampu perlu ditambahkan ke scene agar posisinya ikut terupdate
scene.add(directionalLight, directionalLight.target);

// Point light: cahaya memancar ke segala arah dari satu titik (seperti bohlam), jangkauan 12
const pointLight = new THREE.PointLight("#4df3ff", 1.1, 12);
pointLight.position.set(-2, 3, 2);
pointLight.castShadow = true;
scene.add(pointLight);

// Bola kecil penanda posisi directional light
const lightMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 12, 8),
  new THREE.MeshBasicMaterial({ color: "#fff1a8" }),
);
scene.add(lightMarker);

// ---------------- Light helpers ----------------
// Helper visual untuk memperlihatkan posisi dan arah lampu
const lightHelpers = new THREE.Group();
const directionalHelper = new THREE.DirectionalLightHelper(directionalLight, 0.6, "#ffe066");
const pointHelper = new THREE.PointLightHelper(pointLight, 0.25, "#4df3ff");
// Panah yang menunjukkan arah sinar directional light
const directionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), directionalLight.position, 1, "#ffe066");
lightHelpers.add(directionalHelper, pointHelper, directionArrow);
scene.add(lightHelpers);

// Vector sementara yang dipakai ulang agar tidak membuat objek baru tiap frame
const lightDirection = new THREE.Vector3();
const lightOrigin = new THREE.Vector3();
const lightTarget = new THREE.Vector3();

// Sinkronkan marker, panah arah, dan helper dengan posisi lampu saat ini
function updateLightHelpers() {
  lightMarker.position.copy(directionalLight.position);
  // Pastikan matriks dunia lampu dan targetnya sudah terbaru
  directionalLight.updateWorldMatrix(true, false);
  directionalLight.target.updateWorldMatrix(true, false);
  directionalLight.getWorldPosition(lightOrigin);
  directionalLight.target.getWorldPosition(lightTarget);
  // Arah = target - posisi lampu
  lightDirection.subVectors(lightTarget, lightOrigin);
  const length = lightDirection.length();
  // Sembunyikan panah jika panjangnya nol (menghindari normalisasi vektor nol)
  directionArrow.visible = length > 0;
  if (length > 0) {
    directionArrow.position.copy(lightOrigin);
    directionArrow.setDirection(lightDirection.normalize());
    directionArrow.setLength(length, 0.4, 0.2);
  }
  directionalHelper.update();
  pointHelper.update();
}

// ---------------- Picking (Raycaster) ----------------
// Daftar objek yang bisa dipilih dengan klik
const selectables = [mainCube, sphere, cone, cylinder, torus, torusKnot, ...gallery.children];
// Raycaster menembakkan sinar dari kamera lewat posisi mouse untuk mendeteksi objek
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
// Kotak outline yang menandai objek terpilih
const selectionBox = new THREE.BoxHelper(mainCube, "#c39a4f");
selectionBox.visible = false;
scene.add(selectionBox);
// Objek yang sedang dipilih (null jika tidak ada)
let selected = null;
const tmpVec = new THREE.Vector3();

// Cari objek di bawah pointer mouse
function pick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  // Ubah koordinat mouse ke NDC (-1 sampai 1); sumbu Y dibalik
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, activeCamera);
  // Abaikan objek yang berada di group tersembunyi (mis. gallery)
  const candidates = selectables.filter((o) => o.parent.visible);
  // Ambil objek terdekat yang terkena sinar
  return raycaster.intersectObjects(candidates, false)[0]?.object ?? null;
}
// Pilih objek (atau batalkan pilihan jika null) dan perbarui outline
function select(object) {
  selected = object;
  selectionBox.visible = !!object;
  if (object) selectionBox.setFromObject(object);
}
// Simpan posisi pointer saat ditekan untuk membedakan klik dan drag
let downPos = null;
renderer.domElement.addEventListener("pointerdown", (e) => (downPos = { x: e.clientX, y: e.clientY }));
renderer.domElement.addEventListener("pointerup", (e) => {
  // hanya klik (bukan drag orbit)
  if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) < 5) select(pick(e));
});
// Klik ganda: pilih objek dan jadikan pusat orbit kamera
renderer.domElement.addEventListener("dblclick", (e) => {
  const object = pick(e);
  if (!object) return;
  select(object);
  object.getWorldPosition(tmpVec);
  controls.target.copy(tmpVec); // fokus orbit ke objek
  controls.update();
});

// ---------------- Responsive ----------------
// Perbarui proyeksi kedua kamera sesuai rasio aspek container
function updateCameraProjection() {
  const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
  cameraPerspective.aspect = aspect;
  cameraPerspective.updateProjectionMatrix();
  // Kamera ortografis: tinggi tetap, lebar mengikuti aspek
  const size = 4.8;
  cameraOrthographic.left = -size * aspect;
  cameraOrthographic.right = size * aspect;
  cameraOrthographic.top = size;
  cameraOrthographic.bottom = -size;
  cameraOrthographic.updateProjectionMatrix();
}
// Sesuaikan ukuran renderer saat ukuran jendela berubah
function resize() {
  // false = jangan ubah style CSS canvas, hanya resolusi internalnya
  renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1), false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  updateCameraProjection();
}

// ---------------- HUD (Challenge F) ----------------
// Penghitung untuk menghitung FPS
let fpsFrames = 0;
let fpsTime = 0;
// Perbarui semua teks informasi di HUD
function updateHud() {
  const p = activeCamera.position;
  $("#cameraInfo").textContent = activeCamera === cameraPerspective ? "Perspective" : "Orthographic";
  $("#cameraPosInfo").textContent = `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
  // Jumlah objek langsung di scene
  $("#objectInfo").textContent = String(scene.children.length);
  // Statistik render: jumlah segitiga dan draw call
  $("#rendererInfo").textContent = `${renderer.info.render.triangles} (${renderer.info.render.calls} calls)`;
  $("#lightInfo").textContent = directionalLight.intensity.toFixed(2);
  $("#animationInfo").textContent = state.animation ? "Playing" : "Paused";
  $("#statusBadge").textContent = state.animation ? "RUNNING · THREE.JS" : "PAUSED · THREE.JS";
  // Tampilkan nama dan posisi objek yang dipilih
  if (selected) {
    selected.getWorldPosition(tmpVec);
    $("#selectedInfo").textContent = `${selected.userData.name} (${tmpVec.x.toFixed(1)}, ${tmpVec.y.toFixed(1)}, ${tmpVec.z.toFixed(1)})`;
  } else $("#selectedInfo").textContent = "—";
}

// ---------------- Update ----------------
// Gerakkan dan putar cube utama berdasarkan tombol yang ditekan
function updateObject(dt) {
  // Jarak per frame = kecepatan x delta time (independen dari FPS)
  const move = 2.2 * dt;
  if (keys.ArrowLeft || keys.a) mainCube.position.x -= move;
  if (keys.ArrowRight || keys.d) mainCube.position.x += move;
  if (keys.ArrowUp || keys.w) mainCube.position.z -= move;
  if (keys.ArrowDown || keys.s) mainCube.position.z += move;
  // Q/E memutar cube pada sumbu Y
  if (keys.q) mainCube.rotation.y -= 1.8 * dt;
  if (keys.e) mainCube.rotation.y += 1.8 * dt;
  // Batasi gerak cube agar tidak keluar dari area lantai
  mainCube.position.x = THREE.MathUtils.clamp(mainCube.position.x, -3.6, 3.6);
  mainCube.position.z = THREE.MathUtils.clamp(mainCube.position.z, -3.2, 2.4);
}

// dt = waktu nyata (input), sdt = waktu x kecepatan animasi
function updateScene(dt, sdt) {
  updateObject(dt);
  if (state.lightOrbit) {
    // Challenge D: light bergerak mengelilingi scene
    directionalLight.position.x = Math.cos(state.time) * 4;
    directionalLight.position.z = Math.sin(state.time) * 4;
  }
  // Sphere berputar dan naik-turun mengikuti gelombang sinus
  sphere.rotation.y += sdt * 0.8;
  sphere.position.y = 0.85 + Math.sin(state.time * 1.8) * 0.18;
  // Objek lain berputar dengan kecepatan dan arah berbeda
  cone.rotation.y -= sdt * 0.65;
  cylinder.rotation.y += sdt * 0.5;
  torus.rotation.z += sdt * 0.9;
  torusKnot.rotation.x += sdt * 0.8;
  torusKnot.rotation.y += sdt * 1.1;
  // Bintang berputar sangat pelan
  stars.rotation.y += sdt * 0.02;
  // Tiap cube di gallery berputar dengan kecepatan sedikit berbeda
  gallery.children.forEach((mesh, i) => {
    mesh.rotation.y += sdt * (0.35 + i * 0.15);
  });
}

// Gambar satu frame: perbarui helper, render scene, lalu perbarui HUD
function render() {
  updateLightHelpers();
  if (selected) selectionBox.update();
  renderer.render(scene, activeCamera);
  updateHud();
}

// Loop utama animasi, dipanggil setiap frame
function animate() {
  requestAnimationFrame(animate);
  const rawDelta = clock.getDelta();
  // Batasi delta maksimal 0.05 detik agar tidak "melompat" setelah tab lama tidak aktif
  const dt = Math.min(rawDelta, 0.05);

  // Hitung FPS dan tampilkan setiap 0.5 detik
  fpsFrames++;
  fpsTime += rawDelta;
  if (fpsTime >= 0.5) {
    $("#fpsInfo").textContent = String(Math.round(fpsFrames / fpsTime));
    fpsFrames = 0;
    fpsTime = 0;
  }

  // Jalankan animasi hanya jika tidak di-pause
  if (state.animation) {
    state.time += dt * state.speed;
    updateScene(dt, dt * state.speed);
  }
  // Update controls (diperlukan untuk damping)
  if (controls.enabled) controls.update();
  render();
}

// ---------------- Actions ----------------
// Challenge C: Perspective <-> Orthographic (tombol P)
function toggleCamera() {
  const previous = activeCamera;
  const target = controls.target.clone();
  // Tukar kamera aktif, pertahankan posisi dan target orbit
  activeCamera = activeCamera === cameraPerspective ? cameraOrthographic : cameraPerspective;
  activeCamera.position.copy(previous.position);
  configureControls(target);
  $("#cameraSelect").value = activeCamera === cameraPerspective ? "perspective" : "orthographic";
  updateCameraProjection();
}
// Tampilkan/sembunyikan gallery material
function toggleGallery() {
  state.gallery = !state.gallery;
  gallery.visible = state.gallery;
  // Jika objek terpilih ada di gallery yang disembunyikan, batalkan pilihan
  if (!state.gallery && selected?.parent === gallery) select(null);
}
// Challenge G: pause / resume (Space)
function toggleAnimation() {
  state.animation = !state.animation;
  $("#animationButton").textContent = state.animation ? "Pause (Space)" : "Resume (Space)";
}
// Ganti material cube utama ke material berikutnya secara berputar
function cycleCubeMaterial() {
  const names = Object.keys(cubeMaterials);
  const current = names.find((n) => cubeMaterials[n] === mainCube.material);
  setCubeMaterial(names[(names.indexOf(current) + 1) % names.length]);
}

// Opsi tampilan baru (setiap setter juga menyinkronkan checkbox)
// Kumpulkan semua material unik yang ada di scene
function allMaterials() {
  const set = new Set(Object.values(cubeMaterials));
  scene.traverse((o) => o.material && set.add(o.material));
  return set;
}
// Aktif/nonaktifkan mode wireframe pada semua material yang mendukungnya
function setWireframe(on) {
  $("#wireframeControl").checked = on;
  allMaterials().forEach((m) => "wireframe" in m && (m.wireframe = on));
}
// Tampilkan/sembunyikan grid dan sumbu
function setGuides(on) {
  $("#gridControl").checked = on;
  guides.visible = on;
}
// Aktif/nonaktifkan fog; needsUpdate memaksa shader material dikompilasi ulang
function setFog(on) {
  $("#fogControl").checked = on;
  scene.fog = on ? fog : null;
  allMaterials().forEach((m) => (m.needsUpdate = true));
}
// Tampilkan/sembunyikan bintang
function setStars(on) {
  $("#starsControl").checked = on;
  stars.visible = on;
}
// Pilihan tone mapping (pengaturan kontras/kecerahan hasil akhir render)
const toneMappings = {
  none: THREE.NoToneMapping,
  aces: THREE.ACESFilmicToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  agx: THREE.AgXToneMapping,
};
function setToneMapping(name) {
  $("#toneSelect").value = name;
  renderer.toneMapping = toneMappings[name];
  allMaterials().forEach((m) => (m.needsUpdate = true));
}
// Atur kecepatan animasi dan perbarui slider + labelnya
function setSpeed(value) {
  state.speed = Number(value);
  $("#speedControl").value = value;
  $("#speedValue").textContent = `${state.speed.toFixed(2)}×`;
}
// Ubah warna cube utama pada semua material yang memiliki properti color
function setCubeColor(color) {
  ["standard", "basic", "lambert", "phong"].forEach((k) => cubeMaterials[k].color.set(color));
  $("#cubeColorControl").value = color;
}
// Atur intensitas point light
function setPointIntensity(value) {
  pointLight.intensity = Number(value);
  $("#pointLightControl").value = value;
  $("#pointLightValue").textContent = Number(value).toFixed(2);
}
// Atur warna point light
function setPointColor(color) {
  pointLight.color.set(color);
  pointHelper.update();
  $("#pointColorControl").value = color;
}
// Posisi kamera preset: isometrik, atas, depan, samping
const views = {
  iso: INITIAL_POSITION,
  top: new THREE.Vector3(0, 10, 0.01),
  front: new THREE.Vector3(0, 2, 9),
  side: new THREE.Vector3(9, 2, 0),
};
// Pindahkan kamera ke salah satu preset dan arahkan kembali ke target awal
function setView(name) {
  activeCamera.position.copy(views[name]);
  controls.target.copy(cameraTarget);
  controls.update();
}
// Simpan tampilan canvas saat ini sebagai file PNG
function takeScreenshot() {
  render(); // render dulu agar buffer canvas terisi
  // Buat link sementara untuk memicu download
  const link = document.createElement("a");
  link.download = `three-scene-${Date.now()}.png`;
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
}

// Kembalikan semua pengaturan dan posisi objek ke kondisi awal
function reset() {
  // Reset helper lampu dan pengaturan orbit
  lightHelpers.visible = true;
  $("#lightHelperControl").checked = true;
  resetOrbitSettings();
  // Reset kamera
  activeCamera = cameraPerspective;
  cameraPerspective.position.copy(INITIAL_POSITION);
  cameraOrthographic.position.copy(INITIAL_POSITION);
  cameraPerspective.fov = 50;
  cameraPerspective.zoom = cameraOrthographic.zoom = 1;
  configureControls();
  updateCameraProjection();
  $("#cameraSelect").value = "perspective";
  $("#fovControl").value = 50;
  $("#fovValue").textContent = "50°";
  // Reset cube utama
  mainCube.position.set(-1.4, 1, 0);
  mainCube.rotation.set(0, 0, 0);
  setCubeMaterial("standard");
  // Reset directional light dan animasi
  directionalLight.position.set(3, 6, 4);
  directionalLight.intensity = 1.2;
  state.lightOrbit = false;
  state.animation = true;
  $("#lightControl").value = 1.2;
  $("#lightValue").textContent = "1.20";
  $("#animationButton").textContent = "Pause (Space)";
  // state tambahan
  setWireframe(false);
  setGuides(false);
  setFog(false);
  setStars(true);
  setToneMapping("none");
  setSpeed(1);
  setCubeColor("#4df3ff");
  setPointIntensity(1.1);
  setPointColor("#4df3ff");
  select(null);
}

// Ubah tingkat kehalusan geometri dengan membuat ulang geometri dengan jumlah segmen baru
function updateSegments(value) {
  const s = Number(value);
  // Simpan geometri lama untuk dibuang setelah diganti (mencegah memory leak)
  const old = [sphere.geometry, cone.geometry, cylinder.geometry, torus.geometry];
  sphere.geometry = new THREE.SphereGeometry(0.72, s, s);
  cone.geometry = new THREE.ConeGeometry(0.65, 1.5, s);
  cylinder.geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.4, s);
  torus.geometry = new THREE.TorusGeometry(0.5, 0.2, 16, s * 2);
  old.forEach((g) => g.dispose());
  $("#segmentValue").textContent = String(s);
}

// ---------------- UI events ----------------
// Dropdown kamera: ganti kamera hanya jika pilihan berbeda dari kamera aktif
$("#cameraSelect").addEventListener("change", (e) => {
  if ((e.target.value === "perspective") !== (activeCamera === cameraPerspective)) toggleCamera();
  e.target.blur();
});
// Dropdown material cube utama
$("#materialSelect").addEventListener("change", (e) => {
  setCubeMaterial(e.target.value);
  e.target.blur();
});
$("#cameraButton").addEventListener("click", toggleCamera);
$("#lightOrbitButton").addEventListener("click", () => (state.lightOrbit = !state.lightOrbit));
$("#lightHelperControl").addEventListener("change", (e) => (lightHelpers.visible = e.target.checked));
$("#galleryButton").addEventListener("click", toggleGallery);
$("#animationButton").addEventListener("click", (e) => {
  toggleAnimation();
  e.currentTarget.blur(); // cegah Space menekan tombol lagi
});
$("#resetButton").addEventListener("click", (e) => {
  reset();
  e.currentTarget.blur();
});
// Slider FOV (field of view) kamera perspektif
$("#fovControl").addEventListener("input", (e) => {
  cameraPerspective.fov = Number(e.target.value);
  cameraPerspective.updateProjectionMatrix();
  $("#fovValue").textContent = `${e.target.value}°`;
});
// Slider intensitas directional light
$("#lightControl").addEventListener("input", (e) => {
  directionalLight.intensity = Number(e.target.value);
  $("#lightValue").textContent = Number(e.target.value).toFixed(2);
});
$("#segmentControl").addEventListener("input", (e) => updateSegments(e.target.value));
// Challenge E: shadow quality
$("#shadowSelect").addEventListener("change", (e) => {
  const size = Number(e.target.value);
  directionalLight.shadow.mapSize.set(size, size);
  // Buang shadow map lama agar dibuat ulang dengan ukuran baru
  directionalLight.shadow.map?.dispose();
  directionalLight.shadow.map = null;
  e.target.blur();
});
// kontrol tambahan
$("#wireframeControl").addEventListener("change", (e) => setWireframe(e.target.checked));
$("#gridControl").addEventListener("change", (e) => setGuides(e.target.checked));
$("#fogControl").addEventListener("change", (e) => setFog(e.target.checked));
$("#starsControl").addEventListener("change", (e) => setStars(e.target.checked));
$("#toneSelect").addEventListener("change", (e) => {
  setToneMapping(e.target.value);
  e.target.blur();
});
$("#speedControl").addEventListener("input", (e) => setSpeed(e.target.value));
$("#cubeColorControl").addEventListener("input", (e) => setCubeColor(e.target.value));
$("#pointLightControl").addEventListener("input", (e) => setPointIntensity(e.target.value));
$("#pointColorControl").addEventListener("input", (e) => setPointColor(e.target.value));
$("#screenshotButton").addEventListener("click", takeScreenshot);
// Tombol preset tampilan kamera (atribut data-view)
document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => setView(b.dataset.view)),
);

// ---------------- Keyboard ----------------
// Saat tombol ditekan
window.addEventListener("keydown", (event) => {
  // Abaikan input keyboard saat fokus di dropdown
  if (event.target.tagName === "SELECT") return;
  // Normalisasi huruf ke lowercase; tombol khusus (ArrowLeft, dll.) dibiarkan
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  // Cegah scroll halaman oleh tombol panah dan Space
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
  keys[key] = true; // state-based (Challenge H)
  // Abaikan auto-repeat saat tombol ditahan
  if (event.repeat) return;
  // event-based: sekali per penekanan
  if (key === "p" || key === "c") toggleCamera();
  if (key === " " || key === "g") toggleAnimation();
  if (key === "l") state.lightOrbit = !state.lightOrbit;
  if (key === "h") toggleGallery();
  if (key === "m") cycleCubeMaterial();
  if (key === "x") setWireframe(!$("#wireframeControl").checked);
  if (key === "i") setGuides(!guides.visible);
  if (key === "f") setFog(!scene.fog);
  if (key === "t") setStars(!stars.visible);
  if (key === "k") takeScreenshot();
  if (key === "r") reset();
});
// Saat tombol dilepas
window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = false;
});
// Saat jendela kehilangan fokus, lepaskan semua tombol agar cube tidak "terus berjalan"
window.addEventListener("blur", () => Object.keys(keys).forEach((k) => (keys[k] = false)));
window.addEventListener("resize", resize);

// Inisialisasi: sesuaikan ukuran, gambar frame pertama, lalu mulai loop animasi
resize();
render();
animate();