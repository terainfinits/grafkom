import * as THREE from 'three';

/*
 * Bantuan bersama untuk pembuat model senjata.
 * Konvensi: senjata dibuat tegak di sepanjang +Y (gagang di bawah y = 0, bilah di atas),
 * dengan sisi lebar bilah di bidang XY & ketebalan di sumbu Z.
 */

// Bentuk 2D (daftar [x, y], atau THREE.Shape yang berisi kurva) → ExtrudeGeometry
// setebal `depth`, dipusatkan di sumbu Z
export function extrude(points, depth, { bevel = 0.0015, segments = 1, curveSegments = 6 } = {}) {
  const shape = points instanceof THREE.Shape
    ? points
    : new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: segments, curveSegments,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

/*
 * Merebahkan benda tegak (+Y) di atas alas: sumbu panjang menjadi +X (gagang di kiri),
 * sisi lebar menghadap ke atas, lalu dimiringkan `tilt` radian ke arah pengunjung (+Z)
 * supaya permukaannya terlihat dari depan pajangan.
 */
export function lieFlat(object, tilt = 0.3) {
  const inner = new THREE.Group();
  object.rotation.z = -Math.PI / 2;
  inner.add(object);
  const outer = new THREE.Group();
  outer.rotation.x = -Math.PI / 2 + tilt;
  outer.add(inner);
  return outer;
}

// Penyangga kayu kecil di bawah senjata yang direbahkan
export function addSupports(parent, material, xs, z, height = 0.05) {
  for (const x of xs) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, height, 0.06), material);
    s.position.set(x, height / 2, z);
    parent.add(s);
  }
}

export const materials = () => ({
  iron: new THREE.MeshStandardMaterial({ color: 0x77787a, metalness: 0.85, roughness: 0.38 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.9, roughness: 0.3 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x3e2414, roughness: 0.45 }),
  woodStand: new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.5 }),
});
