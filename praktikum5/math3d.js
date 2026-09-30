// Helper matrix 4x4 column-major (kompatibel dengan WebGL)

export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

export const Mat4 = {
  identity() {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  },

  rotationX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ]);
  },

  rotationY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return new Float32Array([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ]);
  },

  scaling(x, y, z) {
    return new Float32Array([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1,
    ]);
  },

  // result = a * b
  multiply(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + row] * b[col * 4 + k];
        }
        out[col * 4 + row] = sum;
      }
    }
    return out;
  },

  lookAt(eye, target, up) {
    let zx = eye[0] - target[0];
    let zy = eye[1] - target[1];
    let zz = eye[2] - target[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    // x = up × z
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;

    // y = z × x
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1,
    ]);
  },

  perspective(fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY / 2);
    const nf = 1.0 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  },
};

// Normal Matrix = inverse-transpose dari bagian linear (3x3) Model Matrix.
// Untuk matrix 3x3 dengan kolom c0,c1,c2:
//   inverse-transpose = [c1×c2, c2×c0, c0×c1] / det
export function normalMatrixFromMat4(m) {
  const c0 = [m[0], m[1], m[2]];
  const c1 = [m[4], m[5], m[6]];
  const c2 = [m[8], m[9], m[10]];

  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];

  const n0 = cross(c1, c2);
  const n1 = cross(c2, c0);
  const n2 = cross(c0, c1);

  const det = c0[0] * n0[0] + c0[1] * n0[1] + c0[2] * n0[2];

  if (Math.abs(det) < 1e-6) {
    return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }

  const inv = 1.0 / det;
  return new Float32Array([
    n0[0] * inv, n0[1] * inv, n0[2] * inv,
    n1[0] * inv, n1[1] * inv, n1[2] * inv,
    n2[0] * inv, n2[1] * inv, n2[2] * inv,
  ]);
}