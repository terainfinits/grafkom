import * as THREE from 'three';
import { createKeris } from './artifacts/keris.js';
import { createMandau } from './artifacts/mandau.js';
import { createBaraSangihe } from './artifacts/baraSangihe.js';
import { createSalawaku } from './artifacts/salawaku.js';
import { createBusurPanah } from './artifacts/busurPanah.js';
import { createUlos } from './artifacts/ulos.js';
import { createCual } from './artifacts/cual.js';

/*
 * Pajangan koleksi: untuk setiap entri di data/artifacts.js dibuat tempat pajang,
 * model artefak, plakat nama, lampu sorot kecil, collider, & hitbox untuk hover.
 *
 * Jenis tempat pajang (data.display):
 *   'pedestal' (default) : pedestal kayu setinggi 1 m, untuk benda kecil (keris, mandau, ...)
 *   'stand'              : dudukan rendah, untuk benda panjang yang berdiri tegak (mis. tombak)
 *   'wall'               : panel di dinding, untuk benda yang dipajang vertikal (busur & panah, salawaku)
 *   'floor'              : tanpa alas, benda berdiri di lantai dengan kakinya sendiri (kain di
 *                          gawangan); plakat nama di tiang kecil di depannya
 *
 * Pembuat model cukup membuat bendanya di sekitar titik (0, 0, 0); posisinya di atas
 * pajangan diatur otomatis dari kotak pembatasnya (Box3), dan ukuran pedestal/panel
 * menyesuaikan besar benda. Jadi artefak baru tidak perlu menghitung posisi sendiri.
 *
 * Grup ini SENGAJA tidak ikut mergeStatic (optimize.js), karena modelnya harus bisa
 * di-raycast (hover/klik) & disorot satu per satu.
 */

// Nama `build` di data → fungsi pembuat model. Artefak baru tinggal didaftarkan di sini.
const BUILDERS = {
  keris: createKeris,
  mandau: createMandau,
  baraSangihe: createBaraSangihe,
  salawaku: createSalawaku,
  busurPanah: createBusurPanah,
  ulos: createUlos,
  cual: createCual,
};

// Sudut & jarak kamera saat inspect, per jenis pajangan
const VIEW = {
  pedestal: { elevation: 40, distance: 1.6 }, // dari atas-depan, seperti melihat ke vitrine
  stand: { elevation: 12, distance: 1.25 },
  wall: { elevation: 6, distance: 1.25 },
  floor: { elevation: 8, distance: 1.25 },
};

export function createExhibits(artifacts) {
  const group = new THREE.Group();
  group.name = 'koleksi';
  const colliders = [];
  const items = [];

  const mats = {
    wood: new THREE.MeshStandardMaterial({ color: 0x3e2716, roughness: 0.55 }),
    prada: new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.7, roughness: 0.35 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x5a1e14, roughness: 0.9 }), // beludru merah tua
  };

  for (const data of artifacts) {
    const build = BUILDERS[data.build];
    if (!build) {
      console.warn(`Pembuat model "${data.build}" belum terdaftar — ${data.id} dilewati`);
      continue;
    }
    const type = data.display ?? 'pedestal';
    const [x, z] = data.position;
    const stand = new THREE.Group();
    stand.position.set(x, 0, z);
    stand.rotation.y = data.facing ?? 0;
    group.add(stand);

    // Ukur model dulu (dalam ruang lokalnya) untuk menentukan ukuran & posisi pajangan
    const model = build();
    const local = new THREE.Box3().setFromObject(model);
    const size = local.getSize(new THREE.Vector3());
    const center = local.getCenter(new THREE.Vector3());

    const display = DISPLAYS[type](stand, mats, size);
    // Geser model: alasnya di permukaan pajangan, tengahnya di tengah pajangan
    model.position.set(-center.x, display.baseY - local.min.y, display.frontZ !== undefined ? display.frontZ - local.min.z : -center.z);
    if (type === 'wall') model.position.y = display.centerY - center.y;
    model.userData.artifactId = data.id;
    stand.add(model);

    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.08), createPlaqueMaterial(data.nama));
    plaque.position.copy(display.plaque);
    if (display.plaqueTilt) plaque.rotation.x = -display.plaqueTilt; // plakat miring seperti di mimbar baca
    stand.add(plaque);

    // Lampu sorot kecil (ikut light pool, jadi hanya menyala saat pemain dekat)
    const spot = new THREE.PointLight(0xffe2b8, 3, 4, 2);
    spot.position.copy(display.light);
    stand.add(spot);

    stand.updateMatrixWorld(true);
    const foot = new THREE.Box3().setFromObject(display.footprint);
    colliders.push({ minX: foot.min.x, maxX: foot.max.x, minZ: foot.min.z, maxZ: foot.max.z, enabled: true });

    // Titik fokus & radius untuk mode inspect, arah pandang = muka pajangan
    const bounds = new THREE.Box3().setFromObject(model);
    const focus = bounds.getCenter(new THREE.Vector3());
    const worldSize = bounds.getSize(new THREE.Vector3());
    const radius = worldSize.length() / 2;
    const viewDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), stand.rotation.y);

    // Hitbox tak terlihat seukuran artefak (+3 cm). Artefak seperti keris sangat tipis,
    // jadi tanpa ini kursor harus tepat mengenai bilah untuk bisa menyorot/mengklik.
    // material.visible = false → tidak digambar (juga tidak di peta bayangan), tapi tetap kena raycast.
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(worldSize.x + 0.06, worldSize.y + 0.06, worldSize.z + 0.06),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.copy(focus);
    model.attach(hitbox); // attach: posisi dunia dipertahankan, jadi anak dari model

    items.push({ data, model, focus, radius, viewDir, view: VIEW[type] });
  }

  return { group, colliders, items };
}

// ---------- Jenis tempat pajang ----------
// Masing-masing menambahkan mesh ke `stand` dan mengembalikan titik-titik penempatan
// (dalam koordinat lokal stand; muka pajangan menghadap +Z).

const DISPLAYS = {
  pedestal(stand, mats, size) {
    const w = Math.max(0.75, size.x + 0.16), d = Math.max(0.45, size.z + 0.16), h = 1.0;
    addBox(stand, mats.wood, w, h, d, 0, h / 2, 0);
    addBox(stand, mats.prada, w + 0.04, 0.03, d + 0.04, 0, h + 0.015, 0);   // lis atas
    const footprint = addBox(stand, mats.wood, w + 0.08, 0.08, d + 0.08, 0, 0.04, 0); // kaki
    addBox(stand, mats.cloth, w - 0.06, 0.01, d - 0.06, 0, h + 0.035, 0);   // alas kain
    return {
      baseY: h + 0.04, footprint,
      plaque: new THREE.Vector3(0, h - 0.12, d / 2 + 0.002),
      light: new THREE.Vector3(0, 2.4, 0.3),
    };
  },

  stand(stand, mats, size) {
    const w = Math.max(0.5, size.x + 0.2), d = Math.max(0.5, size.z + 0.2), h = 0.14;
    const footprint = addBox(stand, mats.wood, w, h, d, 0, h / 2, 0);
    addBox(stand, mats.prada, w + 0.03, 0.025, d + 0.03, 0, h, 0);         // lis atas
    // Selongsong kayu tempat benda ditancapkan
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 16), mats.wood);
    sleeve.position.y = h + 0.08;
    stand.add(sleeve);
    return {
      baseY: h + 0.01, footprint,
      plaque: new THREE.Vector3(0, h / 2, d / 2 + 0.002),
      light: new THREE.Vector3(0, 3.0, 0.7),
    };
  },

  wall(stand, mats, size) {
    const w = Math.max(0.9, size.x + 0.3), h = size.y + 0.3, t = 0.04, bottom = 0.45;
    const centerY = bottom + h / 2;
    addBox(stand, mats.wood, w, h, t, 0, centerY, t / 2);                    // papan
    addBox(stand, mats.prada, w + 0.04, 0.03, t + 0.01, 0, bottom + h, t / 2); // lis atas
    addBox(stand, mats.prada, w + 0.04, 0.03, t + 0.01, 0, bottom, t / 2);     // lis bawah
    // Collider tak terlihat: zona 0,35 m di depan panel supaya pemain tidak menembus benda
    const footprint = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.35), new THREE.MeshBasicMaterial({ visible: false }));
    footprint.position.set(0, 0.05, 0.175);
    stand.add(footprint);
    return {
      baseY: 0, centerY, frontZ: t + 0.015, footprint,
      // Plakat di muka papan, pada ruang kosong 15 cm di bawah benda. (Kalau ditempel di
      // dinding bawah panel, plakat tertutup lambrisering yang menonjol dari dinding.)
      plaque: new THREE.Vector3(0, bottom + 0.075, t + 0.002),
      light: new THREE.Vector3(0, 2.8, 1.0),
    };
  },
};

DISPLAYS.floor = (stand, mats, size) => {
  // Tiang plakat kecil setinggi pinggang di depan-samping kanan benda (bukan di tengah,
  // supaya tidak menutupi benda saat dilihat dari depan)
  const postX = size.x / 2 + 0.2, postZ = size.z / 2 + 0.2, postH = 0.85;
  addBox(stand, mats.wood, 0.06, postH, 0.06, postX, postH / 2, postZ);
  addBox(stand, mats.wood, 0.4, 0.03, 0.14, postX, postH, postZ);          // papan sandaran plakat
  // Collider tak terlihat yang mencakup benda & tiang plakat
  const x0 = -size.x / 2 - 0.1, x1 = postX + 0.25, z0 = -size.z / 2 - 0.1, z1 = postZ + 0.1;
  const footprint = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  footprint.position.set((x0 + x1) / 2, 0.05, (z0 + z1) / 2);
  stand.add(footprint);
  return {
    baseY: 0, footprint,
    plaque: new THREE.Vector3(postX, postH + 0.03, postZ), plaqueTilt: 0.9,
    light: new THREE.Vector3(0, 3.0, 1.0),
  };
};

function addBox(parent, material, w, h, d, x, y, z) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  box.position.set(x, y, z);
  parent.add(box);
  return box;
}

// Plakat nama kuningan di muka pajangan
function createPlaqueMaterial(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 120;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b48a46';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#6a4a1e';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = '#2e1e0c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Kecilkan font sampai nama muat di plakat
  let size = 56;
  do {
    ctx.font = `600 ${size}px Georgia, serif`;
    size -= 2;
  } while (ctx.measureText(text.toUpperCase()).width > c.width - 40 && size > 20);
  ctx.fillText(text.toUpperCase(), c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, metalness: 0.5, roughness: 0.4 });
}
