import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/*
 * Model GLB/GLTF dari luar (bukan prosedural).
 *
 *   const models = await loadModels(ARTIFACTS); // dimuat di balik layar loading (main.js)
 *   const model = createGltfModel(data, models); // dipakai exhibits.js untuk build: 'gltf'
 *
 * Alurnya:
 *  1. loadModels  — memuat setiap file `model` di data artefak SATU kali (GLTFLoader).
 *     File sudah dikompres meshopt (gltf-transform), jadi perlu MeshoptDecoder.
 *  2. prepare     — model dari Sketchfab/SketchUp biasanya tersusun dari ratusan mesh kecil
 *     (pinisi: 834 mesh = 834 draw call). Mesh digabung per material, sama seperti
 *     mergeStatic di optimize.js, sehingga tinggal belasan draw call.
 *  3. createGltfModel — skala dinormalisasi dengan Box3: sisi mendatar terpanjang dibuat
 *     sepanjang `modelSize` meter, apa pun satuan aslinya (SketchUp memakai inci).
 *     Mesh hasil gabungan diberi nama sesuai materialnya, jadi bisa dibuang lewat `modelHide`.
 */

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export async function loadModels(artifacts) {
  const paths = [...new Set(artifacts.filter((a) => a.model).map((a) => a.model))];
  const models = new Map();
  await Promise.all(paths.map(async (path) => {
    const gltf = await loader.loadAsync(path);
    models.set(path, prepare(gltf.scene));
  }));
  return models;
}

export function createGltfModel(data, models) {
  const source = models.get(data.model);
  const model = source.clone(); // geometri & material dipakai bersama, hanya grupnya yang baru
  // Bagian bawaan model yang tidak diinginkan (mis. piringan air transparan di bawah
  // pinisi) dibuang SEBELUM diukur, supaya tidak ikut memperbesar kotak pembatas
  for (const name of data.modelHide ?? []) model.getObjectByName(name)?.removeFromParent();

  // Putar dulu (sumbu panjang benda bisa saja tidak searah X), baru diukur
  model.rotation.y = data.modelYaw ?? 0;
  model.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.scale.setScalar(data.modelSize / Math.max(size.x, size.z));

  // Dibungkus grup supaya exhibits.js bebas mengatur posisi tanpa menimpa rotasi/skala di atas
  const wrapper = new THREE.Group();
  wrapper.name = data.id;
  wrapper.add(model);
  return wrapper;
}

// Gabungkan semua mesh segitiga per material menjadi satu mesh. Garis tepi bawaan SketchUp
// (LineSegments) dibuang: hanya setebal 1 piksel, tidak terkena cahaya, dan berkedip dari jauh.
function prepare(scene) {
  scene.updateMatrixWorld(true);
  const buckets = new Map(); // material → geometri (sudah dalam ruang dunia model)

  scene.traverse((obj) => {
    if (!obj.isMesh) return;
    const g = new THREE.BufferGeometry();
    // KHR_mesh_quantization: posisi & normal disimpan sebagai bilangan bulat 8/16-bit.
    // Diubah ke Float32 dulu, karena applyMatrix4 & mergeGeometries butuh atribut seragam.
    const src = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry;
    for (const name of ['position', 'normal', 'uv']) {
      if (src.attributes[name]) g.setAttribute(name, toFloat(src.attributes[name]));
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(obj.matrixWorld);

    const key = obj.material;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(g);
  });

  const root = new THREE.Group();
  for (const [material, geos] of buckets) {
    // Sebagian kecil mesh punya uv, sebagian tidak → samakan dulu supaya bisa digabung
    if (geos.some((g) => g.attributes.uv) && !geos.every((g) => g.attributes.uv)) {
      for (const g of geos) if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = material.name;
    root.add(mesh);
  }
  return root;
}

// Salin atribut ke Float32Array; getX/getY/... sudah mengembalikan nilai asli (denormalisasi)
function toFloat(attr) {
  const out = new Float32Array(attr.count * attr.itemSize);
  for (let i = 0; i < attr.count; i++) {
    for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c);
  }
  return new THREE.BufferAttribute(out, attr.itemSize);
}
