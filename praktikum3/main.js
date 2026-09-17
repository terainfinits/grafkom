const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
const statusEl = document.getElementById("status");

if (!gl) {
  statusEl.textContent = "WebGL2 tidak tersedia di browser ini";
  throw new Error("WebGL2 unavailable");
}

/* ---------- shaders ---------- */

const VERTEX_SRC = `#version 300 es
in vec3 a_position;
uniform mat3 u_matrix;
void main() {
  gl_Position = vec4(u_matrix * a_position, 1.0);
}`;

const FRAGMENT_SRC = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compileShader(gl.VERTEX_SHADER, VERTEX_SRC));
gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const a_position = gl.getAttribLocation(program, "a_position");
const u_matrix = gl.getUniformLocation(program, "u_matrix");
const u_color = gl.getUniformLocation(program, "u_color");

/* ---------- geometry (local coordinates, tidak pernah diubah) ---------- */

// Segitiga kecil, dipakai ulang untuk Object A, Object B, dan child.
const TRIANGLE = new Float32Array([
  -0.16, -0.13, 1,
   0.16, -0.13, 1,
   0.00,  0.18, 1,
]);

// Dua garis: sumbu X dan sumbu Y, melalui origin.
const AXES = new Float32Array([
  -1, 0, 1,   1, 0, 1,
   0, -1, 1,  0, 1, 1,
]);

function createVAO(data) {
  const vaoObj = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vaoObj);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vaoObj;
}

const triangleVAO = createVAO(TRIANGLE);
const axesVAO = createVAO(AXES);

/* ---------- state ---------- */

const DEFAULT_A = { x: -0.38, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
const objectA = { ...DEFAULT_A };
const keys = {};

let paused = false;
let orderTRS = true; // true = T×R×S, false = R×T×S
let orbitOn = false;
let seconds = 0;
let lastTime = 0;

function clampObjectA() {
  objectA.x = Math.max(-0.85, Math.min(0.85, objectA.x));
  objectA.y = Math.max(-0.78, Math.min(0.78, objectA.y));
  objectA.scaleX = Math.max(0.2, Math.min(2.5, objectA.scaleX));
  objectA.scaleY = Math.max(0.2, Math.min(2.5, objectA.scaleY));
}

function resetTransform() {
  Object.assign(objectA, DEFAULT_A);
  orderTRS = true;
  orbitOn = false;
}

function applyPreset(n) {
  if (n === 1) Object.assign(objectA, { x: -0.4, y: 0.2, rotation: 0, scaleX: 1, scaleY: 1 });
  if (n === 2) Object.assign(objectA, { x: 0, y: 0, rotation: 45, scaleX: 1.5, scaleY: 1.5 });
  if (n === 3) Object.assign(objectA, { x: 0.3, y: -0.2, rotation: 90, scaleX: 1.8, scaleY: 0.6 });
  clampObjectA();
}

/* ---------- kontrol keyboard: state-based + deltaTime ---------- */

function updateObjectA(dt) {
  const moveSpeedVal = Number(moveSpeed.value);
  const rotSpeedVal = Number(rotationSpeed.value);
  const scaleSpeedVal = Number(scaleSpeed.value);

  if (keys.arrowleft || keys.a) objectA.x -= moveSpeedVal * dt;
  if (keys.arrowright || keys.d) objectA.x += moveSpeedVal * dt;
  if (keys.arrowup || keys.w) objectA.y += moveSpeedVal * dt;
  if (keys.arrowdown || keys.s) objectA.y -= moveSpeedVal * dt;

  if (keys.q) objectA.rotation -= rotSpeedVal * dt;
  if (keys.e) objectA.rotation += rotSpeedVal * dt;

  if (keys["+"] || keys["="]) {
    objectA.scaleX += scaleSpeedVal * dt;
    objectA.scaleY += scaleSpeedVal * dt;
  }
  if (keys["-"] || keys["_"]) {
    objectA.scaleX -= scaleSpeedVal * dt;
    objectA.scaleY -= scaleSpeedVal * dt;
  }

  if (keys.z) objectA.scaleX -= scaleSpeedVal * dt;
  if (keys.x) objectA.scaleX += scaleSpeedVal * dt;
  if (keys.c) objectA.scaleY -= scaleSpeedVal * dt;
  if (keys.v) objectA.scaleY += scaleSpeedVal * dt;

  clampObjectA();
}

/* ---------- render ---------- */

function drawTriangle(matrix, color) {
  gl.uniformMatrix3fv(u_matrix, false, matrix);
  gl.uniform4fv(u_color, color);
  gl.bindVertexArray(triangleVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.043, 0.063, 0.102, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (showAxes.checked) {
    gl.uniformMatrix3fv(u_matrix, false, mat3Identity());
    gl.uniform4fv(u_color, [0.51, 0.6, 0.71, 1]);
    gl.bindVertexArray(axesVAO);
    gl.drawArrays(gl.LINES, 0, 4);
  }

  const modelA = orderTRS ? mat3TRS(objectA) : mat3RTS(objectA);

  // Object A — dikontrol keyboard / mouse
  drawTriangle(modelA, [0.72, 0.6, 0.31, 1]); // brass

  if (showPivot.checked) {
    drawTriangle(mat3Multiply(modelA, mat3Scale(0.18, 0.18)), [0.9, 0.86, 0.78, 1]);
  }

  // Object B — animasi otomatis (rotasi + scaling berdenyut)
  if (autoB.checked) {
    const pulse = 1 + Math.sin(seconds * 2) * 0.25;
    const modelB = mat3TRS({
      x: 0.42,
      y: 0.12,
      rotation: seconds * 70,
      scaleX: pulse,
      scaleY: pulse,
    });
    drawTriangle(modelB, [0.7, 0.29, 0.18, 1]); // rust
  }

  // Child object — parent-child transformation, mewarisi model matrix A
  if (showChild.checked) {
    const modelChild = mat3Multiply(modelA, mat3Multiply(mat3Translate(0.28, 0), mat3Scale(0.42, 0.42)));
    drawTriangle(modelChild, [0.58, 0.68, 0.52, 1]);
  }

  // Orbit sederhana lewat komposisi matriks: pusat orbit adalah object
  // nyata yang digambar, satelit mengelilinginya lewat
  // translate(pusat) × rotate(sudut) × translate(radius) × scale(satelit).
  if (orbitOn) {
    const ORBIT_CENTER_X = 0.46;
    const ORBIT_CENTER_Y = 0;
    const ORBIT_RADIUS = 0.3;

    const modelCenter = mat3Multiply(
      mat3Translate(ORBIT_CENTER_X, ORBIT_CENTER_Y),
      mat3Scale(0.55, 0.55),
    );
    drawTriangle(modelCenter, [0.9, 0.86, 0.78, 1]); // object pusat (diam)

    const modelSatellite = mat3Multiply(
      mat3Translate(ORBIT_CENTER_X, ORBIT_CENTER_Y),
      mat3Multiply(
        mat3Rotate(seconds * 70),
        mat3Multiply(mat3Translate(ORBIT_RADIUS, 0), mat3Scale(0.45, 0.45)),
      ),
    );
    drawTriangle(modelSatellite, [0.55, 0.75, 0.66, 1]); // satelit yang mengorbit
  }

  matrixText.textContent =
    "[" + [modelA[0], modelA[3], modelA[6]].map((v) => v.toFixed(2)).join(" ") + "]  " +
    "[" + [modelA[1], modelA[4], modelA[7]].map((v) => v.toFixed(2)).join(" ") + "]  " +
    "[" + [modelA[2], modelA[5], modelA[8]].map((v) => v.toFixed(2)).join(" ") + "]";

  positionInfo.textContent = "(" + objectA.x.toFixed(2) + ", " + objectA.y.toFixed(2) + ")";
  rotationInfo.textContent = objectA.rotation.toFixed(1) + "°";
  scaleInfo.textContent = "(" + objectA.scaleX.toFixed(2) + ", " + objectA.scaleY.toFixed(2) + ")";
  orderInfo.textContent = orderTRS ? "T × R × S (pivot di objek)" : "R × T × S (orbit sekitar origin)";
}

function frame(t) {
  const dt = Math.min((t - lastTime) * 0.001, 0.05);
  lastTime = t;
  if (!paused) {
    seconds += dt;
    updateObjectA(dt);
    draw();
  }
  dtInfo.textContent = dt.toFixed(3) + " s";
  requestAnimationFrame(frame);
}

/* ---------- input handlers ---------- */

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "+", "-"].includes(e.key)) {
    e.preventDefault();
  }
  keys[k] = true;
  if (e.repeat) return;

  if (k === "r") resetTransform();
  if (k === "p") togglePause();
  if (k === "t") orderTRS = !orderTRS;
  if (k === "o") orbitOn = !orbitOn;
  if (["1", "2", "3"].includes(k)) applyPreset(Number(k));
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  objectA.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  objectA.y = 1 - ((e.clientY - rect.top) / rect.height) * 2;
  clampObjectA();
});

function togglePause() {
  paused = !paused;
  statusEl.textContent = paused ? "PAUSED · WebGL2" : "RUNNING · WebGL2";
  pauseBtn.textContent = paused ? "Lanjutkan (P)" : "Jeda (P)";
}

pauseBtn.onclick = togglePause;
resetBtn.onclick = resetTransform;
orderBtn.onclick = () => (orderTRS = !orderTRS);
orbitBtn.onclick = () => (orbitOn = !orbitOn);

moveSpeed.oninput = () => (moveValue.textContent = moveSpeed.value);
rotationSpeed.oninput = () => (rotationValue.textContent = rotationSpeed.value + "°/s");
scaleSpeed.oninput = () => (scaleValue.textContent = Number(scaleSpeed.value).toFixed(2));

requestAnimationFrame(frame);