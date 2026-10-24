import * as THREE from 'three';

/*
 * Keris prosedural (luk 13) + warangka, dimodelkan dari foto referensi.
 *
 *   Bagian keris (tegak di +Y, pangkal bilah di y = 0):
 *     bilah   : luk 13, penampang bertulang tengah (bukan lempengan datar), pamor tekstur prosedural
 *     ganja   : pangkal bilah yang asimetris, ekornya runcing ke kanan-bawah
 *     selut   : kepala hulu dari perak bertatah permata
 *     hulu    : gagang kayu melengkung ke kiri dengan ujung membulat & ukiran ikal
 *
 *   Bagian warangka (sarung, tegak di +Y, sambungan kepala–gandar di y = 0):
 *     kepala  : bentuk bulan sabit, kait melingkar di kiri & tanduk panjang meruncing di kanan
 *     pendok  : selongsong emas meruncing berukir sulur-suluran (repoussé)
 *
 * Banyak titik diukur langsung dari foto: fungsi px() mengubah koordinat piksel foto
 * (480 × 815) menjadi meter. Skala: panjang bilah 620 px = 0,38 m.
 *
 * createKeris() mengembalikan Group yang sudah ditata rebah di atas pedestal
 * (titik (0,0,0) = permukaan pedestal), sama seperti versi sebelumnya.
 */

const PX = 0.38 / 620;     // meter per piksel foto
const BLADE_L = 0.38;      // panjang bilah
const LUK = 13;            // jumlah lekuk (selalu ganjil)

// Koordinat foto → meter, relatif terhadap titik asal (ox, oy) di foto. Sumbu Y foto terbalik.
const px = (x, y, ox, oy) => new THREE.Vector2((x - ox) * PX, (oy - y) * PX);
const BLADE_ORIGIN = [110, 625]; // pangkal bilah (tengah) di foto
const SHEATH_ORIGIN = [248, 262]; // sambungan kepala warangka & pendok di foto

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function createKeris() {
  const keris = createKerisModel();
  const warangka = createWarangkaModel();
  const display = new THREE.Group();

  // Keris direbahkan: sumbu panjang (+Y) → +X (hulu di kiri), sisi lebar bilah menghadap ke atas,
  // dimiringkan 0,35 rad ke pengunjung (+Z) supaya pamornya terlihat dari depan.
  const tilt = 0.35;
  const kerisLying = lie(keris, -Math.PI / 2, tilt);
  kerisLying.position.set(-0.135, 0.036, -0.075); // −0.135: menengahkan panjang total (hulu + bilah)
  display.add(kerisLying);

  // Dua penyangga kayu di bawah bilah
  const standMat = new THREE.MeshStandardMaterial({ color: 0x3e2414, roughness: 0.5 });
  for (const x of [0.06, 0.26]) {
    const h = 0.031;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.05), standMat);
    s.position.set(x - 0.135, h / 2, -0.075);
    display.add(s);
  }

  // Warangka rebah di depan keris, kepala di kiri
  const warangkaLying = lie(warangka, Math.PI / 2, 0.18);
  warangkaLying.position.set(-0.07, 0, 0.1);
  display.add(warangkaLying);
  // naikkan sampai titik terendahnya tepat menyentuh pedestal
  warangkaLying.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(warangkaLying);
  warangkaLying.position.y -= box.min.y;

  return display;
}

// Keris tegak (+Y). Diekspor terpisah supaya bisa dipakai untuk pajangan tegak (ploncon).
export function createKerisModel() {
  const mats = getMaterials();
  const keris = new THREE.Group();
  keris.name = 'keris';

  keris.add(named(new THREE.Mesh(createBladeGeometry(), mats.blade), 'bilah'));
  keris.add(named(new THREE.Mesh(createGanjaGeometry(), mats.ganja), 'ganja'));

  // Mendak: cincin kecil berbutir di antara ganja & selut
  const mendak = new THREE.Mesh(new THREE.TorusGeometry(0.0062, 0.0014, 8, 28), mats.silver);
  mendak.rotation.x = Math.PI / 2;
  mendak.position.y = -0.0090;
  keris.add(named(mendak, 'mendak'));

  keris.add(createSelut(mats));
  keris.add(createHulu(mats));
  return keris;
}

// Warangka tegak (+Y): kepala di atas, pendok ke bawah.
export function createWarangkaModel() {
  const mats = getMaterials();
  const warangka = new THREE.Group();
  warangka.name = 'warangka';
  warangka.add(named(new THREE.Mesh(createSheathHeadGeometry(), mats.sheathWood), 'kepala warangka'));

  // Pendok: lathe meruncing, dipipihkan (penampang lonjong seperti bilah di dalamnya)
  const pendok = new THREE.Mesh(createPendokGeometry(), mats.pendok);
  pendok.scale.z = 0.62;
  pendok.rotation.y = Math.PI; // sambungan tekstur (seam) ke belakang
  pendok.position.x = 0.002;
  warangka.add(named(pendok, 'pendok'));

  // Bibir atas pendok
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0218, 0.0016, 8, 40), mats.gold);
  rim.rotation.x = Math.PI / 2;
  rim.scale.y = 0.62; // setelah rotasi x, sumbu Y lokal torus = arah Z dunia
  rim.position.set(0.002, -0.0005, 0);
  warangka.add(named(rim, 'bibir pendok'));
  return warangka;
}

// ---------------------------------------------------------------------------
// Bilah
// ---------------------------------------------------------------------------

// Lebar bilah (m) terhadap t = posisi sepanjang bilah (0 = pangkal, 1 = ujung), diukur dari foto
const BLADE_WIDTH = [[0, 0.062], [0.1, 0.053], [0.17, 0.044], [0.28, 0.035], [0.44, 0.030],
  [0.6, 0.028], [0.77, 0.024], [0.88, 0.019], [0.95, 0.012], [0.985, 0.005], [1, 0]];
// Tebal tulang tengah (m)
const BLADE_THICK = [[0, 0.0065], [0.15, 0.0048], [0.5, 0.0036], [0.85, 0.0026], [1, 0.0008]];

const LUK_START = 0.16; // bagian bawah (sor-soran) lebar & lurus, luk mulai di sini
const LUK_END = 0.985;

function bladeCenter(t) {
  const lean = -0.009 * t; // di foto ujung bilah sedikit condong ke kiri
  if (t < LUK_START) return lean;
  const s = (t - LUK_START) / (LUK_END - LUK_START);
  const ramp = THREE.MathUtils.smoothstep(t, LUK_START, LUK_START + 0.07);
  const amp = 0.0050 * ramp * (1 - 0.3 * s);
  return lean + Math.sin(Math.min(s, 1) * Math.PI * LUK) * amp;
}

// Greneng: gerigi kecil di sisi kiri (belakang) pangkal bilah
function greneng(t) {
  if (t < 0.012 || t > 0.075) return 0;
  const k = (t - 0.012) / 0.021;      // 3 gigi
  const f = k - Math.floor(k);
  return 0.0022 * (f < 0.5 ? f * 2 : (1 - f) * 2);
}

function createBladeGeometry() {
  const NS = 320; // segmen sepanjang bilah (luk butuh banyak segmen agar halus)
  const NU = 12;  // segmen melintang (dari mata kiri ke mata kanan)
  const positions = [], uvs = [], indices = [];

  // Dua permukaan (depan +Z, belakang −Z). Tebal di mata bilah = 0, jadi kedua permukaan
  // bertemu tepat di tepi → bilah tertutup tanpa perlu dinding samping.
  for (const side of [1, -1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= NS; i++) {
      const t = i / NS;
      const cx = bladeCenter(t);
      const w = sample(BLADE_WIDTH, t);
      // sedikit asimetris: sisi kanan (gandik) lebih lebar di pangkal
      const left = cx - w * 0.48 + greneng(t);
      const right = cx + w * 0.52;
      const thick = sample(BLADE_THICK, t);
      for (let j = 0; j <= NU; j++) {
        const u = j / NU;
        // penampang: tulang tengah (ada-ada) tebal, menipis tajam ke mata bilah
        const prof = 1 - Math.pow(Math.abs(2 * u - 1), 1.7);
        positions.push(THREE.MathUtils.lerp(left, right, u), t * BLADE_L, side * prof * thick / 2);
        uvs.push(u, t);
      }
    }
    for (let i = 0; i < NS; i++) {
      for (let j = 0; j < NU; j++) {
        const a = base + i * (NU + 1) + j, b = a + 1, c = a + NU + 1, d = c + 1;
        if (side > 0) indices.push(a, b, d, a, d, c);
        else indices.push(a, d, b, a, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Ganja: memanjang melintang di pangkal bilah, kepala membulat di kiri, ekor runcing ke kanan-bawah
function createGanjaGeometry() {
  const [ox, oy] = BLADE_ORIGIN;
  const s = new THREE.Shape();
  const p = (x, y) => px(x, y, ox, oy);
  s.moveTo(...p(57, 624).toArray());
  s.lineTo(...p(158, 624).toArray());
  s.splineThru([p(170, 631), p(179, 641), p(187, 652)]); // ekor runcing (buntut cecak)
  s.splineThru([p(165, 648), p(130, 643), p(95, 639)]);
  s.splineThru([p(66, 636), p(55, 631), p(57, 624)]);    // kepala membulat (gulu meled)
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 1, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 10,
  });
  geo.translate(0, 0, -0.5);
  // Tebal ganja 1 cm di tengah, menipis ke ekor
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const thick = 0.0085 * (x > 0.03 ? THREE.MathUtils.lerp(1, 0.3, Math.min(1, (x - 0.03) / 0.017)) : 1);
    pos.setZ(i, pos.getZ(i) / 1.6 * thick);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------------------
// Selut & hulu
// ---------------------------------------------------------------------------

// Selut berbentuk bola (R = 1,5 cm), dipotong datar di atas (menempel ganja), lalu leher
// pendek di bawah tempat hulu masuk
const SELUT_PROFILE = (() => {
  const R = 0.015, yc = -0.025, pts = [[0, -0.0100]];
  for (let y = -0.0115; y >= -0.0380; y -= 0.0013) pts.push([Math.sqrt(R * R - (y - yc) ** 2), y]);
  pts.push([0.0092, -0.0398], [0.0102, -0.0425], [0.0102, -0.0478]);
  return pts;
})();

function createSelut(mats) {
  const group = new THREE.Group();
  group.name = 'selut';
  const body = new THREE.Mesh(
    // LatheGeometry: titik harus urut dari bawah ke atas, kalau tidak mukanya menghadap ke dalam
    // (tertembus pandang karena backface culling)
    new THREE.LatheGeometry(SELUT_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 32),
    mats.silver
  );
  group.add(body);

  // Permata: beberapa cincin batu gelap berselang dengan berlian kecil, dan butiran perak di tepi.
  const dark = [], white = [], beads = [];
  const rings = [];
  for (let y = -0.0130; y > -0.0370; y -= 0.0021) rings.push(y);
  rings.forEach((y, k) => {
    const r = radiusOnProfile(SELUT_PROFILE, y) + 0.0002;
    const n = Math.round((2 * Math.PI * r) / 0.0022);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (k % 2) * (Math.PI / n);
      const pos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      const isWhite = (i + k) % 5 === 0;
      (isWhite ? white : dark).push({ pos, a, size: isWhite ? 0.0007 : 0.00095 });
    }
  });
  for (const y of [-0.0112, -0.0425]) {
    const r = radiusOnProfile(SELUT_PROFILE, y) + 0.0004;
    const n = Math.round((2 * Math.PI * r) / 0.0017);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      beads.push({ pos: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), a, size: 0.0008 });
    }
  }
  group.add(instancedDots(dark, mats.gemDark, 0.55));
  group.add(instancedDots(white, mats.gemWhite, 0.7));
  group.add(instancedDots(beads, mats.silver, 1));
  return group;
}

// Sekumpulan bola kecil di permukaan benda putar; dipipihkan ke arah normal (flatten < 1)
function instancedDots(list, material, flatten) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), material, list.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  list.forEach(({ pos, a, size }, i) => {
    q.setFromAxisAngle(up, -a); // sumbu X lokal bola menghadap keluar
    sc.set(size * flatten, size, size);
    m.compose(pos, q, sc);
    mesh.setMatrixAt(i, m);
  });
  return mesh;
}

function createHulu(mats) {
  const group = new THREE.Group();
  group.name = 'hulu';
  const [ox, oy] = BLADE_ORIGIN;
  const p3 = (x, y) => { const v = px(x, y, ox, oy); return new THREE.Vector3(v.x, v.y, 0); };

  // Jalur gagang diukur dari foto: turun dari selut, lalu melengkung ke kiri
  const curve = new THREE.CatmullRomCurve3([
    p3(108, 700), p3(106, 722), p3(100, 745), p3(88, 765), p3(70, 779), p3(52, 786), p3(40, 789),
  ]);
  const radius = (t) => sample([[0, 0.0098], [0.1, 0.0135], [0.35, 0.0165], [0.65, 0.0152], [1, 0.0146]], t);
  group.add(new THREE.Mesh(sweepGeometry(curve, radius, { tubular: 64, radial: 24, squash: 0.82 }), mats.huluWood));

  // Ujung membulat
  const end = curve.getPointAt(1);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.0162, 24, 16), mats.huluWood);
  knob.scale.set(1, 0.95, 0.82);
  knob.position.copy(end).add(new THREE.Vector3(-0.006, -0.001, 0));
  group.add(knob);

  // Ukiran ikal di muka ujung hulu (seperti di foto: lingkaran ukiran di ujung kiri-bawah)
  const curl = new THREE.Mesh(new THREE.TorusGeometry(0.0072, 0.0019, 8, 28, Math.PI * 1.55), mats.huluWoodDark);
  curl.position.copy(knob.position).add(new THREE.Vector3(-0.003, -0.0005, 0.0112));
  curl.rotation.z = 0.6;
  group.add(curl);
  const curl2 = curl.clone();
  curl2.position.z = knob.position.z - 0.0112;
  group.add(curl2);

  // "Paruh" kecil di bagian bawah ujung (tonjolan ukiran)
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.012, 14), mats.huluWood);
  beak.position.copy(knob.position).add(new THREE.Vector3(0.007, -0.012, 0));
  beak.rotation.z = -2.4;
  beak.scale.z = 0.8;
  group.add(beak);
  return group;
}

// ---------------------------------------------------------------------------
// Warangka
// ---------------------------------------------------------------------------

function createSheathHeadGeometry() {
  const [ox, oy] = SHEATH_ORIGIN;
  const p = (x, y) => px(x, y, ox, oy);
  const s = new THREE.Shape();
  s.moveTo(...p(213, 262).toArray());
  // perut kiri naik ke kait, memutari kait, lalu tepi atas sampai ujung tanduk
  s.splineThru([
    p(214, 240), p(211, 218), p(196, 204), p(172, 188), p(153, 166), p(141, 142), p(137, 120),
    p(140, 104), p(150, 95), p(163, 94), p(173, 101), p(176, 111), // puncak kait
    p(168, 117), p(161, 114), p(156, 117), p(155, 127), p(160, 138), // sisi dalam kait
    p(176, 146), p(210, 152), p(255, 150), p(300, 141), p(345, 124), p(388, 99),
    p(426, 68), p(452, 40), p(471, 14), // ujung tanduk
  ]);
  // tepi bawah tanduk turun ke tonjolan tengah, lalu ke sambungan pendok
  s.splineThru([
    p(466, 38), p(452, 72), p(428, 108), p(396, 140), p(360, 166), p(330, 190), p(306, 208),
    p(292, 222), p(285, 240), p(283, 262),
  ]);
  s.lineTo(...p(213, 262).toArray());

  // Bentuk "bantal": muka depan & belakang bertemu di tepi (tebal 0) dengan profil lingkaran,
  // jadi tepinya membulat seperti kayu yang dibubut. Tebal di tengah mengikuti tabel per kolom
  // foto (tebal di dekat pendok, menipis ke kait & tanduk) + satu tonjolan bulat di depan.
  const outline = s.getSpacedPoints(170);
  if (outline[0].distanceTo(outline[outline.length - 1]) < 1e-9) outline.pop();
  const verts = outline.map((v) => v.clone());
  let tris = THREE.ShapeUtils.triangulateShape(outline, []);
  tris = refineTriangles(verts, tris, 0.0055);

  // Segmen tepi (tanpa garis bawah tempat pendok masuk, yang harus tetap tebal)
  const isJoin = (v) => Math.abs(v.y) < 1e-7;
  const segs = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    if (!(isJoin(a) && isJoin(b))) segs.push([a, b]);
  }
  const ROUND = 0.007; // jari-jari pembulatan tepi
  const bump = p(293, 168);
  const halfThick = verts.map((v) => {
    const d = distanceToSegments(v, segs);
    const fx = v.x / PX + ox; // kembali ke koordinat piksel foto
    let thick = sampleSmooth([[130, 0.011], [175, 0.015], [215, 0.026], [248, 0.031], [300, 0.032],
      [360, 0.021], [420, 0.011], [475, 0.004]], fx);
    thick += 0.010 * Math.exp(-v.distanceToSquared(bump) / (0.022 ** 2)); // tonjolan bulat di depan
    const k = d >= ROUND ? 1 : Math.sqrt(1 - (1 - d / ROUND) ** 2);
    return (thick / 2) * k;
  });

  const n = verts.length;
  // Muka depan (indeks 0..n-1) & belakang (n..2n-1). Titik tepi (tebal 0) dipakai bersama.
  const positions = [];
  for (let i = 0; i < n; i++) positions.push(verts[i].x, verts[i].y, halfThick[i]);
  for (let i = 0; i < n; i++) positions.push(verts[i].x, verts[i].y, -halfThick[i]);
  const back = (i) => (halfThick[i] < 1e-9 ? i : i + n);
  const indices = [];
  for (const [a, b, c] of tris) {
    const ccw = (verts[b].x - verts[a].x) * (verts[c].y - verts[a].y) - (verts[c].x - verts[a].x) * (verts[b].y - verts[a].y) > 0;
    const [A, B, C] = ccw ? [a, b, c] : [a, c, b];
    indices.push(A, B, C, back(A), back(C), back(B));
  }
  // Dinding bawah (sambungan pendok): hubungkan titik depan & belakang di garis y = 0
  const join = [];
  for (let i = 0; i < n; i++) if (isJoin(verts[i])) join.push(i);
  join.sort((a, b) => verts[a].x - verts[b].x);
  for (let i = 0; i < join.length - 1; i++) {
    const a = join[i], b = join[i + 1];
    indices.push(a, b + n, b, a, a + n, b + n);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const uv = [];
  for (let i = 0; i < positions.length; i += 3) uv.push(positions[i], positions[i + 1]); // proyeksi datar
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Memecah segitiga sampai semua sisinya ≤ maxLen. Sisi panjang ditandai secara global lalu tiap
// segitiga dibelah sesuai jumlah sisinya yang ditandai (red-green refinement), sehingga dua
// segitiga yang berbagi sisi selalu dibelah di titik yang sama → tidak ada celah/T-junction.
function refineTriangles(verts, tris, maxLen) {
  const key = (a, b) => (a < b ? a * 1e6 + b : b * 1e6 + a);
  for (let iter = 0; iter < 14; iter++) {
    const mid = new Map();
    for (const [a, b, c] of tris) {
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const k = key(p, q);
        if (!mid.has(k) && verts[p].distanceTo(verts[q]) > maxLen) {
          verts.push(verts[p].clone().lerp(verts[q], 0.5));
          mid.set(k, verts.length - 1);
        }
      }
    }
    if (mid.size === 0) break;
    const out = [];
    for (const [a, b, c] of tris) {
      const ab = mid.get(key(a, b)), bc = mid.get(key(b, c)), ca = mid.get(key(c, a));
      const has = (ab !== undefined ? 1 : 0) + (bc !== undefined ? 2 : 0) + (ca !== undefined ? 4 : 0);
      switch (has) {
        case 0: out.push([a, b, c]); break;
        case 1: out.push([a, ab, c], [ab, b, c]); break;
        case 2: out.push([a, b, bc], [a, bc, c]); break;
        case 4: out.push([a, b, ca], [ca, b, c]); break;
        case 3: out.push([b, bc, ab], [a, ab, bc], [a, bc, c]); break;
        case 5: out.push([a, ab, ca], [ab, b, c], [ab, c, ca]); break;
        case 6: out.push([c, ca, bc], [a, b, bc], [a, bc, ca]); break;
        case 7: out.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); break;
      }
    }
    tris = out;
  }
  return tris;
}

function distanceToSegments(p, segs) {
  let best = Infinity;
  for (const [a, b] of segs) {
    const abx = b.x - a.x, aby = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby || 1)));
    const dx = p.x - (a.x + abx * t), dy = p.y - (a.y + aby * t);
    best = Math.min(best, dx * dx + dy * dy);
  }
  return Math.sqrt(best);
}

function createPendokGeometry() {
  // Profil lathe dengan titik berjarak rata (supaya UV tekstur tidak meregang)
  const L = 0.322, rTop = 0.0215, rBot = 0.0138;
  const pts = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // mulai 6 mm di dalam kepala warangka supaya sambungannya rapat
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(rTop, rBot, Math.pow(t, 1.1)), 0.006 - t * (L + 0.006)));
  }
  // ujung bawah membulat
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * rBot, -L - Math.sin(a) * rBot * 0.9));
  }
  // dibalik (bawah → atas) supaya muka menghadap keluar; lihat catatan di createSelut()
  return new THREE.LatheGeometry(pts.reverse(), 48);
}

// ---------------------------------------------------------------------------
// Material & tekstur (dibuat sekali lalu dipakai ulang)
// ---------------------------------------------------------------------------

let cachedMaterials = null;

function getMaterials() {
  if (cachedMaterials) return cachedMaterials;

  const pamor = createPamorTextures();
  const ganjaColor = pamor.color.clone();
  const ganjaRough = pamor.rough.clone();
  // UV ganja = koordinat bentuk (meter) → diulang supaya kerapatan pamornya sama dengan bilah
  for (const t of [ganjaColor, ganjaRough]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 0.04, 1 / 0.38);
  }

  const pendok = createPendokTextures();
  const huluWood = createWoodTexture({ base: [124, 60, 32], dark: [72, 32, 15], scale: 2, seed: 7 });
  const sheathWood = createWoodTexture({ base: [128, 64, 34], dark: [80, 37, 17], scale: 2, seed: 3 });
  huluWood.repeat.set(2, 3);
  sheathWood.repeat.set(5, 5);

  cachedMaterials = {
    blade: new THREE.MeshStandardMaterial({
      map: pamor.color, roughnessMap: pamor.rough, bumpMap: pamor.color, bumpScale: 0.12,
      metalness: 0.45, roughness: 1,
    }),
    ganja: new THREE.MeshStandardMaterial({
      map: ganjaColor, roughnessMap: ganjaRough, metalness: 0.45, roughness: 1,
    }),
    silver: new THREE.MeshStandardMaterial({ color: 0xa9a49a, metalness: 0.9, roughness: 0.34 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9ad55, metalness: 0.85, roughness: 0.3 }),
    gemDark: new THREE.MeshStandardMaterial({ color: 0x17161c, metalness: 0.2, roughness: 0.08 }),
    gemWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2a2a2a, metalness: 0.1, roughness: 0.04 }),
    huluWood: new THREE.MeshPhysicalMaterial({ map: huluWood, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    huluWoodDark: new THREE.MeshPhysicalMaterial({ color: 0x4a2412, roughness: 0.5, clearcoat: 0.4 }),
    sheathWood: new THREE.MeshPhysicalMaterial({ map: sheathWood, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
    pendok: new THREE.MeshStandardMaterial({
      map: pendok.color, bumpMap: pendok.bump, bumpScale: 2, roughnessMap: pendok.rough,
      metalness: 0.85, roughness: 1,
    }),
  };
  return cachedMaterials;
}

// Pamor: garis kontur keperakan yang berliku (seperti "beras wutah") di atas besi hitam.
// Tekstur memanjang (u = melintang bilah, v = sepanjang bilah), jadi pamor ikut meliuk bersama luk.
function createPamorTextures() {
  const W = 256, H = 2048;
  const noise = createNoise(11);
  const color = new Uint8ClampedArray(W * H * 4);
  const rough = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      let X = u * 6, Y = v * 30;
      // domain warping: kontur jadi berliku dan tidak teratur seperti tempaan lipat.
      // Semua noise periodik (6 × 30) supaya tekstur bisa diulang tanpa sambungan (dipakai di ganja).
      const wx = noise.fbm(X, Y, 3, 6, 30), wy = noise.fbm(X + 2.5, Y + 5.5, 3, 6, 30);
      const n = noise.fbm(X + wx * 1.6, Y + wy * 2.4, 2, 6, 30); // 2 oktaf → kontur panjang, tidak putus-putus
      const bands = n * 9;
      const f = bands - Math.floor(bands);
      const line = 1 - THREE.MathUtils.smoothstep(Math.min(f, 1 - f), 0.035, 0.12); // garis
      const patch = THREE.MathUtils.smoothstep(n, 0.72, 0.76) * 0.2;              // bercak terang
      const k = Math.min(1, line + patch);
      const dark = 18 + noise.fbm(X * 3, Y * 3, 2, 18, 90) * 18;
      const g = dark + (222 - dark) * k;
      const i = (y * W + x) * 4;
      color[i] = g; color[i + 1] = g; color[i + 2] = g * 0.98; color[i + 3] = 255;
      const r = 175 - 105 * k; // pamor lebih licin dari besi
      rough[i] = r; rough[i + 1] = r; rough[i + 2] = r; rough[i + 3] = 255;
    }
  }
  return { color: dataCanvasTexture(color, W, H, true), rough: dataCanvasTexture(rough, W, H, false) };
}

// Pendok emas berukir sulur: motif timbul terang dengan latar gelap bertitik (repoussé).
function createPendokTextures() {
  const W = 512, H = 2048;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return c;
  };
  const colorC = make(), bumpC = make(), roughC = make();
  drawFloral(colorC.getContext('2d'), W, H, {
    bg: '#7a561a', stipple: ['#4e3410', '#a07628'], raised: '#f6d77c', raisedHi: '#fff8d8', outline: '#4a300c',
  });
  drawFloral(bumpC.getContext('2d'), W, H, {
    bg: '#3a3a3a', stipple: ['#202020', '#555555'], raised: '#e6e6e6', raisedHi: '#ffffff', outline: '#101010',
  });
  drawFloral(roughC.getContext('2d'), W, H, {
    bg: '#a0a0a0', stipple: ['#b4b4b4', '#909090'], raised: '#4a4a4a', raisedHi: '#3a3a3a', outline: '#a8a8a8',
  });
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  return { color: tex(colorC, true), bump: tex(bumpC, false), rough: tex(roughC, false) };
}

// Gambar motif sulur-suluran. Dipanggil 3× dengan palet berbeda (warna, bump, roughness);
// random-nya ber-seed, jadi ketiga gambar persis sama bentuknya.
function drawFloral(ctx, W, H, pal) {
  const rng = mulberry32(42);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 26000; i++) { // latar ditumbuk titik-titik
    ctx.fillStyle = pal.stipple[i & 1];
    ctx.fillRect(rng() * W, rng() * H, 1.6, 1.6);
  }

  const shapes = []; // kumpulkan dulu, lalu gambar 3× bergeser (−W, 0, +W) supaya menyambung di seam
  // daun-daun kecil acak sebagai pengisi, supaya ukiran rapat seperti di foto
  for (let i = 0; i < 950; i++) {
    shapes.push({ kind: 'leaf', x: rng() * W, y: rng() * H, angle: rng() * Math.PI * 2, len: 20 + rng() * 22 });
  }
  const stems = 4;
  for (let s = 0; s < stems; s++) {
    const x0 = (s + 0.5) * (W / stems);
    // batang utama meliuk dari bawah ke atas
    const stem = [];
    for (let y = -40; y <= H + 40; y += 8) {
      stem.push([x0 + Math.sin(y / 140 + s * 2.1) * 34, y]);
    }
    shapes.push({ kind: 'stroke', pts: stem, width: 11 });
    // cabang ikal bergantian kiri & kanan
    let side = s % 2 ? 1 : -1;
    for (let y = 20 + s * 25; y < H; y += 60 + rng() * 30) {
      const at = stem[Math.min(stem.length - 1, Math.round((y + 40) / 8))];
      const scroll = spiral(at[0], at[1], side > 0 ? -0.6 : Math.PI + 0.6, side, 40 + rng() * 40, rng);
      shapes.push({ kind: 'stroke', pts: scroll.pts, width: 8 });
      for (const leaf of scroll.leaves) shapes.push({ kind: 'leaf', ...leaf });
      if (rng() < 0.55) shapes.push({ kind: 'flower', x: scroll.end[0], y: scroll.end[1], r: 12 + rng() * 6 });
      side = -side;
    }
  }

  for (const dx of [-W, 0, W]) {
    for (const sh of shapes) {
      if (sh.kind === 'stroke') {
        const path = () => {
          ctx.beginPath();
          sh.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y)));
        };
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        path(); ctx.strokeStyle = pal.outline; ctx.lineWidth = sh.width + 4; ctx.stroke();
        path(); ctx.strokeStyle = pal.raised; ctx.lineWidth = sh.width; ctx.stroke();
        path(); ctx.strokeStyle = pal.raisedHi; ctx.lineWidth = sh.width * 0.3; ctx.stroke();
      } else if (sh.kind === 'leaf') {
        drawLeaf(ctx, sh.x + dx, sh.y, sh.angle, sh.len, sh.len * 0.42, pal);
      } else {
        drawFlower(ctx, sh.x + dx, sh.y, sh.r, pal);
      }
    }
  }
}

// Ikal (spiral) yang makin melengkung ke ujung, dengan daun di sepanjangnya
function spiral(x, y, angle, dir, length, rng) {
  const pts = [[x, y]];
  const leaves = [];
  let a = angle, k = 0.006, travelled = 0;
  while (travelled < length + 90) {
    a += dir * k * 4;
    k *= 1.045;
    x += Math.cos(a) * 4;
    y += Math.sin(a) * 4;
    travelled += 4;
    pts.push([x, y]);
    if (travelled % 16 === 0 && travelled < length + 40) {
      const out = a + dir * (Math.PI / 2.4) * (leaves.length % 2 ? 1 : -1);
      leaves.push({ x, y, angle: out, len: 28 + rng() * 18 });
    }
    if (k > 0.2) break;
  }
  return { pts, leaves, end: [x, y] };
}

function drawLeaf(ctx, x, y, angle, len, wid, pal) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
  ctx.fillStyle = pal.raised;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = pal.outline;
  ctx.stroke();
  ctx.beginPath(); // urat daun
  ctx.moveTo(len * 0.1, 0);
  ctx.lineTo(len * 0.85, 0);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function drawFlower(ctx, x, y, r, pal) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.32, a, 0, Math.PI * 2);
    ctx.fillStyle = pal.raised;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = pal.outline;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = pal.raisedHi;
  ctx.fill();
  ctx.stroke();
}

// Serat kayu mengilap (kemuning/timoho): garis serat bergelombang + belang gelap-terang
function createWoodTexture({ base, dark, scale, seed }) {
  const S = 256;
  const noise = createNoise(seed);
  const data = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      const n = noise.fbm(u * scale, v * scale * 4, 4, scale, scale * 4);
      const grain = 0.5 + 0.5 * Math.sin((v * 46 + n * 9) * Math.PI); // 46π: periodik di v = 1
      const figure = noise.fbm(u * 2, v * 2, 3, 2, 2);
      const k = Math.min(1, grain * 0.3 + figure * 0.7);
      const i = (y * S + x) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = base[c] + (dark[c] - base[c]) * k;
      data[i + 3] = 255;
    }
  }
  const tex = dataCanvasTexture(data, S, S, true);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

// Rebahkan benda tegak (+Y): rotZ memutar sumbu panjang ke ±X, lalu sisi lebar menghadap atas
// dengan kemiringan `tilt` ke arah pengunjung (+Z)
function lie(object, rotZ, tilt) {
  const inner = new THREE.Group();
  object.rotation.z = rotZ;
  inner.add(object);
  const outer = new THREE.Group();
  outer.rotation.x = -Math.PI / 2 + tilt;
  outer.add(inner);
  return outer;
}

// Tabung yang mengikuti kurva dengan jari-jari berubah & penampang lonjong
function sweepGeometry(curve, radiusAt, { tubular = 48, radial = 20, squash = 1 } = {}) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const P = curve.getPointAt(t);
    const N = frames.normals[i], B = frames.binormals[i];
    const r = radiusAt(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cos = Math.cos(a) * r, sin = Math.sin(a) * r * squash;
      positions.push(P.x + N.x * cos + B.x * sin, P.y + N.y * cos + B.y * sin, P.z + N.z * cos + B.z * sin);
      uvs.push(j / radial, t);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + radial + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1); // urutan ini → muka menghadap keluar
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Interpolasi halus pada tabel [[x, nilai], ...]
function sample(table, x) {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * (t * t * (3 - 2 * t));
    }
  }
  return table[table.length - 1][1];
}

// Seperti sample(), tapi lengkungnya menyambung mulus melewati setiap titik (Catmull-Rom 1D)
function sampleSmooth(table, x) {
  const n = table.length;
  if (x <= table[0][0]) return table[0][1];
  if (x >= table[n - 1][0]) return table[n - 1][1];
  let i = 1;
  while (x > table[i][0]) i++;
  const p0 = table[Math.max(0, i - 2)][1], p1 = table[i - 1][1], p2 = table[i][1], p3 = table[Math.min(n - 1, i + 1)][1];
  const t = (x - table[i - 1][0]) / (table[i][0] - table[i - 1][0]);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function radiusOnProfile(profile, y) {
  // profil tersusun dari y besar ke kecil → balik untuk sample()
  return sample(profile.map(([r, py]) => [-py, r]), -y);
}

function named(object, name) {
  object.name = name;
  return object;
}

function dataCanvasTexture(data, W, H, srgb) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  c.getContext('2d').putImageData(new ImageData(data, W, H), 0, 0);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise 2D + fbm (cukup untuk tekstur prosedural, tanpa library)
function createNoise(seed) {
  const rng = mulberry32(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rng(); }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const wrap = (i, p) => (p ? ((i % p) + p) % p : i);
  const h = (x, y, px, py) => vals[perm[(perm[wrap(x, px) & 255] + wrap(y, py)) & 255]];
  // px, py = periode (bilangan bulat); 0 = tidak periodik
  const noise = (x, y, px, py) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi, px, py), b = h(xi + 1, yi, px, py), c = h(xi, yi + 1, px, py), d = h(xi + 1, yi + 1, px, py);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return {
    fbm(x, y, oct = 4, px = 0, py = 0) {
      let sum = 0, amp = 0.5, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) {
        sum += amp * noise(x * f, y * f, px * f, py * f);
        norm += amp; amp *= 0.5; f *= 2;
      }
      return sum / norm;
    },
  };
}