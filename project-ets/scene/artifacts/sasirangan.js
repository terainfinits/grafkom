import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createSasiranganTextures } from '../textiles/sasiranganPattern.js';

/*
 * Dua lembar Sasirangan terlipat bertumpuk di atas peti kayu rendah:
 *   bawah — varian 'merah' (gigi haruan & kambang), terlipat rapi
 *   atas  — varian 'marun' (hiris gagatas, gigi haruan, kulat karikit), lembar teratasnya
 *           dibuka & menjuntai melewati tepi depan peti
 *
 *   Tampak samping (depan = +Z, ke kanan):
 *
 *              ══════════════╮   ← lembar marun teratas, menjuntai di depan
 *              ▭▭▭▭▭▭▭▭▭▭▭▭▭ │   ← lipatan marun
 *              ▭▭▭▭▭▭▭▭▭▭▭▭▭ │   ← lipatan merah
 *        ┌──────────────────┐│
 *        │       peti       ││
 *        └──────────────────┘
 *
 * Lipatan = kotak bersudut membulat (RoundedBoxGeometry) yang teksturnya diulang sesuai
 * ukuran. Lembar yang menjuntai = geometri buatan sendiri (rebah → melengkung → menjuntai)
 * dengan UV dalam meter, seperti kain songket.
 */
const CHEST = { w: 0.95, d: 0.6, h: 0.55 };
const FOLD = { w: 0.62, d: 0.42 };        // ukuran lipatan marun (atas)
const FOLD_MERAH = { w: 0.8, d: 0.46 };   // lipatan merah (bawah) lebih lebar → tepinya menyembul
const MARUN_X = 0.06;                     // marun digeser ke kanan supaya sisi kiri merah terlihat
const STACK_Z = CHEST.d / 2 - FOLD.d / 2; // tumpukan rata dengan tepi depan peti
const HANG = 0.3;                          // panjang lembar marun yang menjuntai
const BEND_R = 0.02;

export function createSasirangan() {
  const g = new THREE.Group();
  g.add(createChest());

  const merah = createSasiranganTextures({ variant: 'merah' });
  const marun = createSasiranganTextures({ variant: 'marun' });

  // Lipatan bertumpuk: merah (bawah, lebih lebar) lalu marun di atasnya
  let y = CHEST.h;
  for (const [t, size, x, thick] of [[merah, FOLD_MERAH, 0, 0.035], [marun, FOLD, MARUN_X, 0.022]]) {
    const block = new THREE.Mesh(
      new RoundedBoxGeometry(size.w, thick, size.d, 2, 0.006),
      clothMaterial(t, size.w, size.d)
    );
    block.position.set(x, y + thick / 2, CHEST.d / 2 - size.d / 2);
    g.add(block);
    y += thick;
  }

  // Lembar marun teratas: rebah di atas tumpukan, lalu menjuntai di depan peti
  const drape = new THREE.Mesh(createDrapeGeometry(y + 0.002), clothMaterial(marun, 1, 1, true));
  drape.position.x = MARUN_X;
  g.add(drape);
  return g;
}

// Material kain; perW/perD = ukuran bidang (meter) yang dipetakan ke UV 0..1.
// metersUV = true → geometri sudah ber-UV meter, cukup repeat = 1 / ukuran tile.
function clothMaterial(t, perW, perD, metersUV = false) {
  const maps = [t.color, t.bump, t.rough].map((m) => m.clone());
  for (const m of maps) {
    if (metersUV) m.repeat.set(1 / t.tileSize.width, 1 / t.tileSize.height);
    else m.repeat.set(perW / t.tileSize.width, perD / t.tileSize.height);
  }
  const [color, bump, rough] = maps;
  return new THREE.MeshStandardMaterial({
    map: color, bumpMap: bump, bumpScale: 0.6, roughnessMap: rough, roughness: 1, side: THREE.DoubleSide,
  });
}

// Lembar: rebah dari belakang tumpukan ke tepi depan, melengkung, lalu menjuntai
function createDrapeGeometry(topY) {
  const zBack = STACK_Z - FOLD.d / 2 + 0.01, zEdge = STACK_Z + FOLD.d / 2;
  const top = zEdge - zBack, bend = (Math.PI / 2) * BEND_R;
  const L = top + bend + HANG;
  const nx = 40, ns = 60;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= ns; j++) {
    const s = (L * j) / ns;
    for (let i = 0; i <= nx; i++) {
      const x = -FOLD.w / 2 + (FOLD.w * i) / nx;
      let py, pz;
      if (s < top) {
        py = topY; pz = zBack + s;
      } else if (s < top + bend) {
        const a = (s - top) / BEND_R;
        py = topY - BEND_R + BEND_R * Math.cos(a); pz = zEdge + BEND_R * Math.sin(a);
      } else {
        const drop = s - top - bend;
        // lipatan lembut yang makin dalam ke bawah
        const depth = 0.012 * Math.min(1, drop / 0.2);
        py = topY - BEND_R - drop;
        pz = zEdge + BEND_R + depth * (0.5 + 0.5 * Math.sin((x / 0.15) * Math.PI * 2));
      }
      pos.push(x, py, pz);
      uv.push(x + FOLD.w / 2, L - s); // meter; pita motif mendatar melintang kain
    }
  }
  for (let j = 0; j < ns; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, d, b, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Peti kayu rendah dengan panel depan berbingkai & lis prada
function createChest() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.5 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x2e1a0e, roughness: 0.6 });
  const prada = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.7, roughness: 0.35 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(CHEST.w, CHEST.h - 0.06, CHEST.d), wood);
  body.position.y = 0.06 + (CHEST.h - 0.06) / 2;
  g.add(body);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(CHEST.w + 0.04, 0.06, CHEST.d + 0.04), woodDark);
  plinth.position.y = 0.03;
  g.add(plinth);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(CHEST.w + 0.03, 0.025, CHEST.d + 0.03), woodDark);
  lid.position.y = CHEST.h - 0.0125;
  g.add(lid);
  // Dua panel ceruk di muka depan, dibingkai garis prada (terlihat di sela kain yang menjuntai)
  for (const sx of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.01), woodDark);
    panel.position.set(sx * 0.22, 0.27, CHEST.d / 2 + 0.003);
    g.add(panel);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.004), prada);
    trim.position.set(sx * 0.22, 0.27, CHEST.d / 2 + 0.0005);
    g.add(trim);
  }
  return g;
}
