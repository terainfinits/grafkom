import * as THREE from 'three';
import { createRoom, ROOM } from './scene/room.js';
import { WalkControls } from './controls/walkControls.js';

// ---------- Renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111318);

// ---------- Camera ----------
const EYE_HEIGHT = 1.6; // tinggi mata dalam meter
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, EYE_HEIGHT, ROOM.depth / 2 - 1.5); // mulai dekat pintu, menghadap ke dalam

// ---------- Ruangan ----------
scene.add(createRoom());

// ---------- Kontrol jalan ----------
const WALL_MARGIN = 0.5; // jarak minimal ke dinding
const controls = new WalkControls(camera, canvas, {
  speed: 3,
  eyeHeight: EYE_HEIGHT,
  bounds: {
    minX: -ROOM.width / 2 + WALL_MARGIN,
    maxX: ROOM.width / 2 - WALL_MARGIN,
    minZ: -ROOM.depth / 2 + WALL_MARGIN,
    maxZ: ROOM.depth / 2 - WALL_MARGIN,
  },
});

// ---------- Loop ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1); // dibatasi supaya tidak "teleport" saat tab kembali aktif
  controls.update(dt);
  renderer.render(scene, camera);
});

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});