function multiply(a, b) {
  const result = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      result[c * 4 + r] =
        a[r] * b[c * 4] +
        a[4 + r] * b[c * 4 + 1] +
        a[8 + r] * b[c * 4 + 2] +
        a[12 + r] * b[c * 4 + 3];
    }
  }
  return result;
}

function identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function translation(x, y, z) {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
}

function rotationX(degrees) {
  const angle = (degrees * Math.PI) / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

function rotationY(degrees) {
  const angle = (degrees * Math.PI) / 180;
  const c = Math.cos(angle), s = Math.sin(angle);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

function perspective(fovDegrees, aspect, near, far) {
  const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
  const range = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * range, -1,
    0, 0, near * far * 2 * range, 0,
  ]);
}

function orthographic(size, aspect, near, far) {
  const halfWidth = size * aspect;
  const rangeX = 1 / halfWidth;
  const rangeY = 1 / size;
  const rangeZ = 1 / (near - far);
  return new Float32Array([
    rangeX, 0, 0, 0,
    0, rangeY, 0, 0,
    0, 0, 2 * rangeZ, 0,
    0, 0, (near + far) * rangeZ, 1,
  ]);
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

/* FIX: lookAt could produce a degenerate basis in two cases:
   1) eye and target sit on the same vertical line as `up` (cross(up, backward)
      collapses to the zero vector) — reachable via ArrowUp/Down + W/S.
   2) eye === target (backward collapses to the zero vector) — reachable by
      driving the camera through the origin with W/S.
   Both used to silently produce a broken view matrix (cube vanishes with no
   error). We now fall back to an alternate up vector for case 1, and the
   caller (enforceMinCameraDistance in main.js) prevents case 2 by clamping
   the camera-to-target distance before lookAt is ever called. */
function lookAt(eye, target, up) {
  const backward = normalize(subtract(eye, target));
  let right = cross(up, backward);
  if (Math.hypot(...right) < 1e-6) {
    const fallbackUp = Math.abs(backward[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    right = cross(fallbackUp, backward);
  }
  right = normalize(right);
  const correctedUp = cross(backward, right);
  return new Float32Array([
    right[0], correctedUp[0], backward[0], 0,
    right[1], correctedUp[1], backward[1], 0,
    right[2], correctedUp[2], backward[2], 0,
    -dot(right, eye), -dot(correctedUp, eye), -dot(backward, eye), 1,
  ]);
}