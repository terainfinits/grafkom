import * as THREE from 'three';

/*
 * VFX kelopak bunga: saat layar selesai muncul, kelopak (merah muda, putih, & kuning pucat
 * seperti kamboja di taman) berguguran di sekitar pemain sebagai perayaan yang lembut.
 *
 * Semua kelopak = SATU InstancedMesh (1 draw call). Tiap kelopak punya:
 *  - posisi: jatuh pelan (bukan terjun bebas, seperti tertahan udara) + bergoyang ke samping
 *  - rotasi: berputar-putar (tumble) dengan sumbu & laju acak, khas daun/kelopak jatuh
 *  - warna sendiri lewat instanceColor
 * Kelopak yang mencapai lantai disembunyikan (skala 0); selama burst masih berlangsung,
 * kelopak baru terus dimunculkan dari atas.
 *
 * Mesh sudah ada di scene sejak awal (semua kelopak berskala 0), supaya shadernya ikut
 * dikompilasi di balik layar loading → tidak tersendat saat pertama kali muncul.
 *
 * Pemakaian:
 *   const petals = createPetals();
 *   scene.add(petals.group);
 *   petals.burst(camera.position); // saat layar selesai dibuka
 *   petals.update(dt);             // di loop
 */

const COUNT = 180;
const BURST_S = 7;              // lama kelopak terus berjatuhan (detik)
const SPREAD = 3;               // radius sebaran di sekitar pemain (m)
const SPAWN_Y = [0.7, 1.9];     // tinggi muncul di atas mata (tetap di bawah langit-langit 3,5 m)
const FALL = [0.35, 0.6];       // kecepatan jatuh (m/detik)
// Warna cukup pekat supaya tetap terlihat di depan dinding krem
const COLORS = [0xe8769c, 0xf29ab8, 0xfff3e6, 0xffd36b].map((c) => new THREE.Color(c));
const PETAL_SCALE = 1.6; // ukuran kelopak ± 11 × 6 cm

export function createPetals() {
  const group = new THREE.Group();
  group.name = 'kelopak bunga';

  const mesh = new THREE.InstancedMesh(createPetalGeometry(), new THREE.MeshStandardMaterial({
    roughness: 0.6,
    side: THREE.DoubleSide, // kelopak tipis terlihat dari kedua sisi saat berputar
  }), COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  group.add(mesh);

  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const petals = Array.from({ length: COUNT }, (_, i) => {
    mesh.setMatrixAt(i, hidden);
    mesh.setColorAt(i, COLORS[i % COLORS.length]);
    return {
      active: false,
      pos: new THREE.Vector3(),
      fall: 0, swayPhase: 0, swayAmp: 0,
      axis: new THREE.Vector3(), angle: 0, spin: 0,
    };
  });

  const center = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3(PETAL_SCALE, PETAL_SCALE, PETAL_SCALE);
  const matrix = new THREE.Matrix4();
  let burstLeft = 0;
  let spawnAcc = 0;
  let time = 0;

  function spawn(p) {
    const r = SPREAD * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
    p.pos.set(center.x + Math.cos(a) * r, center.y + rand(...SPAWN_Y), center.z + Math.sin(a) * r);
    p.fall = rand(...FALL);
    p.swayPhase = Math.random() * Math.PI * 2;
    p.swayAmp = rand(0.2, 0.5);
    p.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    p.angle = Math.random() * Math.PI * 2;
    p.spin = rand(1.5, 3.5);
    p.active = true;
  }

  // Mulai hujan kelopak di sekitar `position` (biasanya posisi kamera)
  function burst(position) {
    center.copy(position);
    burstLeft = BURST_S;
    // Langsung isi sebagian supaya efeknya terlihat sejak detik pertama
    for (const p of petals.slice(0, COUNT / 3)) {
      spawn(p);
      p.pos.y -= Math.random() * 1.5; // tersebar di beberapa ketinggian, tidak berbaris
    }
  }

  function update(dt) {
    time += dt;
    if (burstLeft > 0) {
      burstLeft -= dt;
      // Laju kemunculan merata sepanjang burst
      spawnAcc += dt * (COUNT / BURST_S) * 0.8;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        const free = petals.find((p) => !p.active);
        if (free) spawn(free);
      }
    }

    petals.forEach((p, i) => {
      if (!p.active) return;
      p.pos.y -= p.fall * dt;
      if (p.pos.y < 0.03) { // sampai lantai → hilang
        p.active = false;
        mesh.setMatrixAt(i, hidden);
        return;
      }
      // Goyang ke samping (sinus) — seperti kelopak yang melayang-layang saat jatuh
      const sway = Math.sin(time * 1.2 + p.swayPhase) * p.swayAmp * dt;
      p.pos.x += sway;
      p.pos.z += Math.cos(time * 0.9 + p.swayPhase) * p.swayAmp * dt;
      p.angle += p.spin * dt;
      quat.setFromAxisAngle(p.axis, p.angle);
      matrix.compose(p.pos, quat, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; // 180 matriks: murah, cukup diunggah ulang tiap frame
  }

  update(0);
  mesh.instanceColor.needsUpdate = true;
  return { group, burst, update };
}

// Kelopak: bentuk tetes memanjang (± 7 × 4 cm), sedikit melengkung supaya tidak tampak
// seperti kertas datar saat berputar
function createPetalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.035);
  shape.quadraticCurveTo(0.03, -0.01, 0.018, 0.025);
  shape.quadraticCurveTo(0, 0.04, -0.018, 0.025);
  shape.quadraticCurveTo(-0.03, -0.01, 0, -0.035);
  const geo = new THREE.ShapeGeometry(shape, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, x * x * 12); // lengkung: tepi kiri-kanan sedikit terangkat
  }
  geo.computeVertexNormals();
  return geo;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}
