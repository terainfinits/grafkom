import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createPetaIndonesia() {
  const group = new THREE.Group();

  // Dummy box agar exhibits.js membaca ukuran valid saat startup
  const dummyGeo = new THREE.BoxGeometry(3.5, 0.2, 2.5);
  const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
  const dummyMesh = new THREE.Mesh(dummyGeo, dummyMat);
  group.add(dummyMesh);

  const loader = new GLTFLoader();

  loader.load(
    './assets/models/indonesia.glb',
    (gltf) => {
      group.remove(dummyMesh);
      dummyGeo.dispose();
      dummyMat.dispose();

      const model = gltf.scene;

      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = false; // Optimasi FPS (matikan bayangan poligon tinggi)
          node.receiveShadow = true;

          if (node.material) {
            // 1. ATASI WARNA PUTIH: Aktifkan vertexColors & reset warna dasar ke putih netral
            if (node.geometry && node.geometry.attributes.color) {
              node.material.vertexColors = true;
              if (node.material.color) {
                node.material.color.setHex(0xffffff);
              }
            }

            // 2. CEGAH SILAU: Sesuaikan pantulan cahaya agar tidak silau/washed out terkena lampu aula
            if ('metalness' in node.material) node.material.metalness = 0.0;
            if ('roughness' in node.material) node.material.roughness = 0.5;

            node.material.needsUpdate = true;
          }
        }
      });

      // -------------------------------------------------------------
      // 3. UBAH UKURAN MODEL DI SINI (targetSize)
      // -------------------------------------------------------------
      const tempBox = new THREE.Box3().setFromObject(model);
      const tempSize = tempBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(tempSize.x, tempSize.z);
      
      // Ubah nilai 3.5 ini (misal 3.0 jika ingin lebih kecil, atau 4.0 jika ingin lebih besar)
      const targetSize = 3.5; 
      
      const scaleFactor = maxDim > 0 ? targetSize / maxDim : 1;
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);

      // Ratakan alas model tepat di atas permukaan lantai (Y = 0)
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());

      model.position.x = -center.x;
      model.position.y = -box.min.y;
      model.position.z = -center.z;

      group.add(model);
    },
    undefined,
    (error) => console.error('Gagal memuat Peta Indonesia:', error)
  );

  return group;
}