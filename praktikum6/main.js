import * as THREE from "three"; // ada di import file html
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // ada di import file html

const $ = (selector) => document.querySelector(selector); // custom nyari html elemnen pakai css selector 
const container = $("#sceneContainer"); // baris di atas dipakai disini

// ---------------- Scene, camera, renderer ----------------
const scene = new THREE.Scene(); // scene = root container all 3D objects, lights, cameras
scene.background = new THREE.Color("#07111f"); // set scene bg

const INITIAL_POSITION = new THREE.Vector3(4.8, 3.6, 6.5); // starting camera location
// parameter: derajat fov vertikal, aspect ratio, near clipping plane, far clipping plane (hanya render antara near-far) 
const cameraPerspective = new THREE.PerspectiveCamera(50, 1, 0.1, 100); 
cameraPerspective.position.copy(INITIAL_POSITION); // kamera skrg di INITIAL_POSITION
// parameter: left viewing bound, right vb, top vb, bottom vb, near plane, far plane
const cameraOrthographic = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
cameraOrthographic.position.copy(INITIAL_POSITION); // camera ortografik juga di INITIAL_POSITION
let activeCamera = cameraPerspective; // variabel diubah nanti antara perspective atau orthographics

const renderer = new THREE.WebGLRenderer({ antialias: true }); // antialias true -> smooths jagged edges
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // rendering resolution high-DPI screen, devicePixelRatio 2 biar g berat gpu
renderer.shadowMap.enabled = true; // enable shadow rendering
renderer.shadowMap.type = THREE.PCFSoftShadowMap; //produces softer shadow edges than basic shadow mapping.
renderer.outputColorSpace = THREE.SRGBColorSpace; //output colors in the sRGB color space, more accurate color appearance in browsers.
container.appendChild(renderer.domElement); // Adds the renderer’s <canvas> element into the #sceneContainer HTML element.

const clock = new THREE.Clock(); //Creates a clock used to measure elapsed time, commonly for frame-rate-independent animation.
const keys = {}; //Creates an empty object likely used to track which keyboard keys are pressed, for example keys["w"] = true
const state = { 
  animation: true, //animation is currently enabled.
  lightOrbit: false, // a light is not currently orbiting.
  gallery: true, //a gallery feature is enabled.
  segment: 24, // likely controls geometry detail, such as the number of segments in a sphere or curve.
  lightIntensity: 1.2, //brightness level for a light.
  time: 0, //accumulated animation time.
};

// ---------------- OrbitControls ----------------
const cameraTarget = new THREE.Vector3(0, 0.8, 0);
let controls;
const orbitDefaults = {
  enabled: true,
  enableDamping: true,
  enablePan: true,
  dampingFactor: 0.05,
  rotateSpeed: 1,
  zoomSpeed: 1,
};
const orbitSettings = { ...orbitDefaults };

function applyOrbitSettings() {
  Object.assign(controls, orbitSettings);
  $("#cameraDampingFactor").disabled = !orbitSettings.enableDamping;
}
function resetOrbitSettings() {
  Object.assign(orbitSettings, orbitDefaults);
  for (const [key, value] of Object.entries(orbitSettings)) {
    const input = document.querySelector(`[data-orbit-setting="${key}"]`);
    if (typeof value === "boolean") input.checked = value;
    else {
      input.value = value;
      $(`#${input.id}Value`).textContent = value.toFixed(2);
    }
  }
}
document.querySelectorAll("[data-orbit-setting]").forEach((input) => {
  input.addEventListener("input", () => {
    orbitSettings[input.dataset.orbitSetting] =
      input.type === "checkbox" ? input.checked : Number(input.value);
    if (input.type !== "checkbox")
      $(`#${input.id}Value`).textContent = Number(input.value).toFixed(2);
    applyOrbitSettings();
  });
});
function configureControls(target = cameraTarget) {
  controls?.dispose();
  controls = new OrbitControls(activeCamera, renderer.domElement);
  controls.target.copy(target);
  applyOrbitSettings();
  controls.update();
}
configureControls();

// ---------------- Cube utama (material bisa diganti) ----------------
const cubeMaterials = {
  standard: new THREE.MeshStandardMaterial({ color: "#4df3ff", roughness: 0.28, metalness: 0.25 }),
  basic: new THREE.MeshBasicMaterial({ color: "#4df3ff" }),
  normal: new THREE.MeshNormalMaterial(),
  lambert: new THREE.MeshLambertMaterial({ color: "#4df3ff" }),
  phong: new THREE.MeshPhongMaterial({ color: "#4df3ff", shininess: 80 }),
};
const materialNames = {
  standard: "Standard",
  basic: "Basic",
  normal: "Normal",
  lambert: "Lambert",
  phong: "Phong",
};
const mainCube = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25), cubeMaterials.standard);
mainCube.position.set(-1.4, 1, 0);
mainCube.castShadow = true;
scene.add(mainCube);

function setCubeMaterial(name) {
  mainCube.material = cubeMaterials[name];
  $("#materialSelect").value = name;
  $("#materialInfo").textContent = materialNames[name];
}

// ---------------- Ground & objek ----------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14),
  new THREE.MeshLambertMaterial({ color: "#102a40" }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function makeMesh(geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}
const seg = state.segment;
const sphere = makeMesh(
  new THREE.SphereGeometry(0.72, seg, seg),
  new THREE.MeshPhongMaterial({ color: "#ff6584", shininess: 70 }),
  0.5, 0.85, 0,
);
// Challenge A: Cone, Cylinder, Torus (+ TorusKnot)
const cone = makeMesh(
  new THREE.ConeGeometry(0.65, 1.5, seg),
  new THREE.MeshStandardMaterial({ color: "#ffd166", roughness: 0.42, metalness: 0.08 }),
  1.9, 0.75, -0.2,
);
const cylinder = makeMesh(
  new THREE.CylinderGeometry(0.5, 0.5, 1.4, seg),
  new THREE.MeshLambertMaterial({ color: "#95e06c" }),
  -3.4, 0.7, 1.4,
);
const torus = makeMesh(
  new THREE.TorusGeometry(0.5, 0.2, 16, seg * 2),
  new THREE.MeshPhongMaterial({ color: "#c77dff", shininess: 90 }),
  3.4, 0.9, 1.6,
);
torus.rotation.x = Math.PI / 3;
const torusKnot = makeMesh(
  new THREE.TorusKnotGeometry(0.55, 0.18, 64, 12),
  new THREE.MeshNormalMaterial(),
  2.1, 1.1, -2,
);

// Challenge B: Material gallery — geometry sama, material berbeda
const gallery = new THREE.Group();
const galleryMaterials = [
  new THREE.MeshBasicMaterial({ color: "#74b9ff" }),
  new THREE.MeshNormalMaterial(),
  new THREE.MeshLambertMaterial({ color: "#55efc4" }),
  new THREE.MeshPhongMaterial({ color: "#a78bfa", shininess: 90 }),
];
galleryMaterials.forEach((material, index) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), material);
  mesh.position.set(-3.3 + index * 0.85, 0.35, -2.4);
  mesh.castShadow = true;
  gallery.add(mesh);
});
scene.add(gallery);

// ---------------- Lights ----------------
scene.add(new THREE.AmbientLight("#9ecbff", 0.35));

const directionalLight = new THREE.DirectionalLight("#ffffff", state.lightIntensity);
directionalLight.position.set(3, 6, 4);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
Object.assign(directionalLight.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.1, far: 20 });
scene.add(directionalLight, directionalLight.target);

const pointLight = new THREE.PointLight("#4df3ff", 1.1, 12);
pointLight.position.set(-2, 3, 2);
pointLight.castShadow = true;
scene.add(pointLight);

const lightMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 12, 8),
  new THREE.MeshBasicMaterial({ color: "#fff1a8" }),
);
scene.add(lightMarker);

// ---------------- Light helpers ----------------
const lightHelpers = new THREE.Group();
const directionalHelper = new THREE.DirectionalLightHelper(directionalLight, 0.6, "#ffe066");
const pointHelper = new THREE.PointLightHelper(pointLight, 0.25, "#4df3ff");
const directionArrow = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), directionalLight.position, 1, "#ffe066");
lightHelpers.add(directionalHelper, pointHelper, directionArrow);
scene.add(lightHelpers);

const lightDirection = new THREE.Vector3();
const lightOrigin = new THREE.Vector3();
const lightTarget = new THREE.Vector3();

function updateLightHelpers() {
  lightMarker.position.copy(directionalLight.position);
  directionalLight.updateWorldMatrix(true, false);
  directionalLight.target.updateWorldMatrix(true, false);
  directionalLight.getWorldPosition(lightOrigin);
  directionalLight.target.getWorldPosition(lightTarget);
  lightDirection.subVectors(lightTarget, lightOrigin);
  const length = lightDirection.length();
  directionArrow.visible = length > 0;
  if (length > 0) {
    directionArrow.position.copy(lightOrigin);
    directionArrow.setDirection(lightDirection.normalize());
    directionArrow.setLength(length, 0.4, 0.2);
  }
  directionalHelper.update();
  pointHelper.update();
}

// ---------------- Responsive ----------------
function updateCameraProjection() {
  const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
  cameraPerspective.aspect = aspect;
  cameraPerspective.updateProjectionMatrix();
  const size = 4.8;
  cameraOrthographic.left = -size * aspect;
  cameraOrthographic.right = size * aspect;
  cameraOrthographic.top = size;
  cameraOrthographic.bottom = -size;
  cameraOrthographic.updateProjectionMatrix();
}
function resize() {
  renderer.setSize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1), false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  updateCameraProjection();
}

// ---------------- HUD (Challenge F) ----------------
let fpsFrames = 0;
let fpsTime = 0;
function updateHud() {
  const p = activeCamera.position;
  $("#cameraInfo").textContent = activeCamera === cameraPerspective ? "Perspective" : "Orthographic";
  $("#cameraPosInfo").textContent = `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
  $("#objectInfo").textContent = String(scene.children.length);
  $("#rendererInfo").textContent = `${renderer.info.render.triangles} (${renderer.info.render.calls} calls)`;
  $("#lightInfo").textContent = directionalLight.intensity.toFixed(2);
  $("#animationInfo").textContent = state.animation ? "Playing" : "Paused";
  $("#statusBadge").textContent = state.animation ? "RUNNING · THREE.JS" : "PAUSED · THREE.JS";
}

// ---------------- Update ----------------
function updateObject(dt) {
  const move = 2.2 * dt;
  if (keys.ArrowLeft || keys.a) mainCube.position.x -= move;
  if (keys.ArrowRight || keys.d) mainCube.position.x += move;
  if (keys.ArrowUp || keys.w) mainCube.position.z -= move;
  if (keys.ArrowDown || keys.s) mainCube.position.z += move;
  if (keys.q) mainCube.rotation.y -= 1.8 * dt;
  if (keys.e) mainCube.rotation.y += 1.8 * dt;
  mainCube.position.x = THREE.MathUtils.clamp(mainCube.position.x, -3.6, 3.6);
  mainCube.position.z = THREE.MathUtils.clamp(mainCube.position.z, -3.2, 2.4);
}

function updateScene(dt) {
  updateObject(dt);
  if (state.lightOrbit) {
    // Challenge D: light bergerak mengelilingi scene
    directionalLight.position.x = Math.cos(state.time) * 4;
    directionalLight.position.z = Math.sin(state.time) * 4;
  }
  sphere.rotation.y += dt * 0.8;
  sphere.position.y = 0.85 + Math.sin(state.time * 1.8) * 0.18;
  cone.rotation.y -= dt * 0.65;
  cylinder.rotation.y += dt * 0.5;
  torus.rotation.z += dt * 0.9;
  torusKnot.rotation.x += dt * 0.8;
  torusKnot.rotation.y += dt * 1.1;
  gallery.children.forEach((mesh, i) => {
    mesh.rotation.y += dt * (0.35 + i * 0.15);
  });
}

function render() {
  updateLightHelpers();
  renderer.render(scene, activeCamera);
  updateHud();
}

function animate() {
  requestAnimationFrame(animate);
  const rawDelta = clock.getDelta();
  const dt = Math.min(rawDelta, 0.05);

  fpsFrames++;
  fpsTime += rawDelta;
  if (fpsTime >= 0.5) {
    $("#fpsInfo").textContent = String(Math.round(fpsFrames / fpsTime));
    fpsFrames = 0;
    fpsTime = 0;
  }

  if (state.animation) {
    state.time += dt;
    updateScene(dt);
  }
  if (controls.enabled) controls.update();
  render();
}

// ---------------- Actions ----------------
// Challenge C: Perspective <-> Orthographic (tombol P)
function toggleCamera() {
  const previous = activeCamera;
  const target = controls.target.clone();
  activeCamera = activeCamera === cameraPerspective ? cameraOrthographic : cameraPerspective;
  activeCamera.position.copy(previous.position);
  configureControls(target);
  $("#cameraSelect").value = activeCamera === cameraPerspective ? "perspective" : "orthographic";
  updateCameraProjection();
}
function toggleGallery() {
  state.gallery = !state.gallery;
  gallery.visible = state.gallery;
}
// Challenge G: pause / resume (Space)
function toggleAnimation() {
  state.animation = !state.animation;
  $("#animationButton").textContent = state.animation ? "Pause (Space)" : "Resume (Space)";
}
function cycleCubeMaterial() {
  const names = Object.keys(cubeMaterials);
  const current = names.find((n) => cubeMaterials[n] === mainCube.material);
  setCubeMaterial(names[(names.indexOf(current) + 1) % names.length]);
}

function reset() {
  lightHelpers.visible = true;
  $("#lightHelperControl").checked = true;
  resetOrbitSettings();
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
  mainCube.position.set(-1.4, 1, 0);
  mainCube.rotation.set(0, 0, 0);
  setCubeMaterial("standard");
  directionalLight.position.set(3, 6, 4);
  directionalLight.intensity = 1.2;
  state.lightOrbit = false;
  state.animation = true;
  $("#lightControl").value = 1.2;
  $("#lightValue").textContent = "1.20";
  $("#animationButton").textContent = "Pause (Space)";
}

function updateSegments(value) {
  const s = Number(value);
  const old = [sphere.geometry, cone.geometry, cylinder.geometry, torus.geometry];
  sphere.geometry = new THREE.SphereGeometry(0.72, s, s);
  cone.geometry = new THREE.ConeGeometry(0.65, 1.5, s);
  cylinder.geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.4, s);
  torus.geometry = new THREE.TorusGeometry(0.5, 0.2, 16, s * 2);
  old.forEach((g) => g.dispose());
  $("#segmentValue").textContent = String(s);
}

// ---------------- UI events ----------------
$("#cameraSelect").addEventListener("change", (e) => {
  if ((e.target.value === "perspective") !== (activeCamera === cameraPerspective)) toggleCamera();
  e.target.blur();
});
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
$("#resetButton").addEventListener("click", reset);
$("#fovControl").addEventListener("input", (e) => {
  cameraPerspective.fov = Number(e.target.value);
  cameraPerspective.updateProjectionMatrix();
  $("#fovValue").textContent = `${e.target.value}°`;
});
$("#lightControl").addEventListener("input", (e) => {
  directionalLight.intensity = Number(e.target.value);
  $("#lightValue").textContent = Number(e.target.value).toFixed(2);
});
$("#segmentControl").addEventListener("input", (e) => updateSegments(e.target.value));
// Challenge E: shadow quality
$("#shadowSelect").addEventListener("change", (e) => {
  const size = Number(e.target.value);
  directionalLight.shadow.mapSize.set(size, size);
  directionalLight.shadow.map?.dispose();
  directionalLight.shadow.map = null;
  e.target.blur();
});

// ---------------- Keyboard ----------------
window.addEventListener("keydown", (event) => {
  if (event.target.tagName === "SELECT") return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
  keys[key] = true; // state-based (Challenge H)
  if (event.repeat) return;
  // event-based: sekali per penekanan
  if (key === "p" || key === "c") toggleCamera();
  if (key === " " || key === "g") toggleAnimation();
  if (key === "l") state.lightOrbit = !state.lightOrbit;
  if (key === "h") toggleGallery();
  if (key === "m") cycleCubeMaterial();
  if (key === "r") reset();
});
window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys[key] = false;
});
window.addEventListener("blur", () => Object.keys(keys).forEach((k) => (keys[k] = false)));
window.addEventListener("resize", resize);

resize();
render();
animate();