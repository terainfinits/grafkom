const canvas = document.querySelector("#webglCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  document.querySelector("#statusBadge").textContent = "WebGL2 TIDAK TERSEDIA";
  throw new Error("Browser tidak mendukung WebGL2.");
}

const vertexShaderSource = `#version 300 es
in vec3 a_position;
in vec3 a_color;
out vec3 v_color;
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
void main() {
  gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
  v_color = a_color;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;
void main() { outColor = vec4(v_color, 1.0); }`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram() {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

const program = createProgram();
const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");
const modelLocation = gl.getUniformLocation(program, "u_model");
const viewLocation = gl.getUniformLocation(program, "u_view");
const projectionLocation = gl.getUniformLocation(program, "u_projection");

/* ---------- cube geometry: 36 vertices, one color per face ---------- */

const faceColors = [
  [0.1, 0.9, 1], [1, 0.25, 0.3], [0.3, 1, 0.45],
  [1, 0.75, 0.15], [0.65, 0.35, 1], [1, 0.45, 0.7],
];

const cubePositions = [];
const cubeColors = [];
const faces = [
  [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
  [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
  [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]],
  [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]],
  [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]],
  [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]],
];
const faceTriangles = [0, 1, 2, 0, 2, 3];
faces.forEach((face, faceIndex) => {
  faceTriangles.forEach((vertexIndex) => {
    cubePositions.push(...face[vertexIndex].map((value) => value * 0.55));
    cubeColors.push(...faceColors[faceIndex]);
  });
});

function createBuffer(data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buffer;
}

const positionBuffer = createBuffer(cubePositions);
const colorBuffer = createBuffer(cubeColors);
const vertexCount = cubePositions.length / 3;

/* ---------- floor grid geometry (feature: spatial reference plane) ---------- */

function createGridLines(size = 6, step = 1, y = -0.62) {
  const positions = [];
  const colors = [];
  const lineColor = [0.32, 0.4, 0.5];
  for (let i = -size; i <= size; i += step) {
    positions.push(-size, y, i, size, y, i);
    colors.push(...lineColor, ...lineColor);
    positions.push(i, y, -size, i, y, size);
    colors.push(...lineColor, ...lineColor);
  }
  return { positions, colors };
}

const gridData = createGridLines();
const gridPositionBuffer = createBuffer(gridData.positions);
const gridColorBuffer = createBuffer(gridData.colors);
const gridVertexCount = gridData.positions.length / 3;

/* ---------- app state ---------- */

const state = {
  camera: { position: [0, 1.2, 5], target: [0, 0, 0], up: [0, 1, 0] },
  fov: 60,
  near: 0.1,
  far: 30,
  projection: "perspective",
  depth: true,
  orbit: false,
  split: false,
  paused: false,
  showGrid: true,
  showDebug: false,
  keys: {},
  time: 0,
  clipIndex: 0,
  fovIndex: 1,
};

const clipPresets = [
  { near: 0.1, far: 30 },
  { near: 0.5, far: 8 },
  { near: 1.5, far: 4 },
];
const fovPresets = [35, 60, 90];

function modelMatrix(position, rotation) {
  return multiply(
    translation(...position),
    multiply(rotationY(rotation[1]), rotationX(rotation[0])),
  );
}

/* separate bind functions per buffer set, since grid and cube geometry
   now share the same attribute locations but live in different buffers */
function bindCubeAttributes() {
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.enableVertexAttribArray(colorLocation);
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
}

function bindGridAttributes() {
  gl.bindBuffer(gl.ARRAY_BUFFER, gridPositionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, gridColorBuffer);
  gl.enableVertexAttribArray(colorLocation);
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
}

function drawCube(model, view, projection) {
  gl.uniformMatrix4fv(modelLocation, false, model);
  gl.uniformMatrix4fv(viewLocation, false, view);
  gl.uniformMatrix4fv(projectionLocation, false, projection);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

function drawGrid(view, projection) {
  gl.uniformMatrix4fv(modelLocation, false, identity());
  gl.uniformMatrix4fv(viewLocation, false, view);
  gl.uniformMatrix4fv(projectionLocation, false, projection);
  gl.drawArrays(gl.LINES, 0, gridVertexCount);
}

/* three cubes at different depths (challenge) */
function drawPass(x, width, projection) {
  gl.viewport(x, 0, width, canvas.height);
  const view = lookAt(state.camera.position, state.camera.target, state.camera.up);

  if (state.showGrid) {
    bindGridAttributes();
    drawGrid(view, projection);
  }

  bindCubeAttributes();
  drawCube(modelMatrix([0, 0, 0], [state.time * 34, state.time * 52]), view, projection);
  drawCube(modelMatrix([-1.45, 0.15, -1.6], [state.time * 20, state.time * 30]), view, projection);
  drawCube(modelMatrix([1.35, -0.2, -3.4], [state.time * 48, state.time * 18]), view, projection);
}

function projectionMatrix(aspect, mode) {
  return mode === "perspective"
    ? perspective(state.fov, aspect, state.near, state.far)
    : orthographic(2.8, aspect, state.near, state.far);
}

/* keep the drawing buffer's pixel size in sync with its CSS size,
   so the aspect ratio stays correct when the canvas is resized */
function resizeCanvasToDisplaySize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

/* FIX: lookAt() can degenerate when the camera sits exactly on top of (or
   at) its target. Clamp the distance before it ever reaches lookAt, instead
   of trying to patch the symptom inside the math helper. */
function enforceMinCameraDistance() {
  const MIN_DISTANCE = 0.3;
  const offset = subtract(state.camera.position, state.camera.target);
  const distance = Math.hypot(...offset);
  if (distance < MIN_DISTANCE) {
    const direction = distance > 1e-6 ? offset.map((value) => value / distance) : [0, 0, 1];
    state.camera.position = state.camera.target.map((value, index) => value + direction[index] * MIN_DISTANCE);
  }
}

function renderScene() {
  resizeCanvasToDisplaySize();
  enforceMinCameraDistance();
  gl.enable(gl.SCISSOR_TEST);
  gl.useProgram(program);

  if (state.depth) gl.enable(gl.DEPTH_TEST);
  else gl.disable(gl.DEPTH_TEST);

  if (state.split) {
    /* split view: perspective on the left, orthographic on the right (challenge) */
    const half = Math.floor(canvas.width / 2);
    gl.scissor(0, 0, half, canvas.height);
    gl.clearColor(0.025, 0.07, 0.12, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawPass(0, half, projectionMatrix(half / canvas.height, "perspective"));

    gl.scissor(half, 0, canvas.width - half, canvas.height);
    gl.clearColor(0.04, 0.025, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawPass(half, canvas.width - half, projectionMatrix((canvas.width - half) / canvas.height, "orthographic"));
  } else {
    gl.scissor(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.015, 0.045, 0.09, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawPass(0, canvas.width, projectionMatrix(canvas.width / canvas.height, state.projection));
  }

  gl.disable(gl.SCISSOR_TEST);
  updateHud();
}

/* FIX: automatic orbit mode wrote state.camera.position[0]/[2] every frame,
   silently overriding the ArrowLeft/Right and W/S handling just above it.
   The keys looked unresponsive. Manual X/Z input is now skipped entirely
   while orbit is active, and Y (height) stays controllable either way. */
function updateCamera(deltaTime) {
  const speed = 2.0 * deltaTime;
  if (!state.orbit) {
    if (state.keys.ArrowLeft) state.camera.position[0] -= speed;
    if (state.keys.ArrowRight) state.camera.position[0] += speed;
    if (state.keys.w) state.camera.position[2] -= speed;
    if (state.keys.s) state.camera.position[2] += speed;
  }
  if (state.keys.ArrowUp) state.camera.position[1] += speed;
  if (state.keys.ArrowDown) state.camera.position[1] -= speed;

  if (state.orbit) {
    const radius = 5;
    state.camera.position[0] = Math.sin(state.time * 0.45) * radius;
    state.camera.position[2] = Math.cos(state.time * 0.45) * radius;
  }
}

function formatMatrix(m) {
  let out = "";
  for (let r = 0; r < 4; r++) {
    const row = [m[r], m[4 + r], m[8 + r], m[12 + r]].map((v) => v.toFixed(2).padStart(7));
    out += row.join(" ") + "\n";
  }
  return out;
}

function updateHud() {
  document.querySelector("#projectionInfo").textContent = state.split ? "Split P / O" : state.projection;
  document.querySelector("#cameraInfo").textContent =
    `(${state.camera.position.map((value) => value.toFixed(2)).join(", ")})`;
  document.querySelector("#fovInfo").textContent = `${state.fov.toFixed(0)}°`;
  document.querySelector("#clipInfo").textContent = `${state.near.toFixed(2)} / ${state.far.toFixed(2)}`;
  document.querySelector("#depthInfo").textContent = state.depth ? "Enabled" : "Disabled";
  document.querySelector("#cameraModeInfo").textContent = state.orbit ? "Orbit (X/Z terkunci)" : "Manual";
  document.querySelector("#animInfo").textContent = state.paused ? "Paused" : "Running";
  document.querySelector("#statusBadge").textContent =
    `${state.paused ? "PAUSED · " : ""}${state.depth ? "DEPTH ON" : "DEPTH OFF"} · WEBGL2`;
  document.querySelector("#orbitButton").setAttribute("aria-pressed", String(state.orbit));
  document.querySelector("#splitButton").setAttribute("aria-pressed", String(state.split));
  document.querySelector("#depthButton").setAttribute("aria-pressed", String(state.depth));
  document.querySelector("#gridButton").setAttribute("aria-pressed", String(state.showGrid));
  document.querySelector("#debugButton").setAttribute("aria-pressed", String(state.showDebug));

  const debugPanel = document.querySelector("#debugPanel");
  if (state.showDebug) {
    const aspect = canvas.width / canvas.height;
    const view = lookAt(state.camera.position, state.camera.target, state.camera.up);
    const projection = projectionMatrix(aspect, state.projection);
    debugPanel.hidden = false;
    debugPanel.textContent = `VIEW\n${formatMatrix(view)}\nPROJECTION\n${formatMatrix(projection)}`;
  } else {
    debugPanel.hidden = true;
  }
}

function resetScene() {
  state.camera.position = [0, 1.2, 5];
  state.camera.target = [0, 0, 0];
  state.fov = 60;
  state.near = 0.1;
  state.far = 30;
  state.projection = "perspective";
  state.depth = true;
  state.orbit = false;
  state.split = false;
  state.paused = false;
  state.clipIndex = 0;
  state.fovIndex = 1;

  document.querySelector("#fovControl").value = 60;
  document.querySelector("#fovValue").textContent = "60°";
  document.querySelector("#heightControl").value = 1.2;
  document.querySelector("#heightValue").textContent = "1.20";
  document.querySelector("#targetXControl").value = 0;
  document.querySelector("#targetXValue").textContent = "0.00";
  document.querySelector("#targetYControl").value = 0;
  document.querySelector("#targetYValue").textContent = "0.00";
}

function nextClipPreset() {
  state.clipIndex = (state.clipIndex + 1) % clipPresets.length;
  Object.assign(state, clipPresets[state.clipIndex]);
}

/* FOV presets 35° / 60° / 90° (challenge) */
function nextFovPreset() {
  state.fovIndex = (state.fovIndex + 1) % fovPresets.length;
  state.fov = fovPresets[state.fovIndex];
  document.querySelector("#fovControl").value = state.fov;
  document.querySelector("#fovValue").textContent = `${state.fov}°`;
}

function setFov(delta) {
  state.fov = Math.min(120, Math.max(20, state.fov + delta));
  document.querySelector("#fovControl").value = state.fov;
  document.querySelector("#fovValue").textContent = `${state.fov.toFixed(0)}°`;
}

function bindControls() {
  document.querySelector("#projectionButton").addEventListener("click", () => {
    state.projection = state.projection === "perspective" ? "orthographic" : "perspective";
  });
  document.querySelector("#orbitButton").addEventListener("click", () => {
    state.orbit = !state.orbit;
  });
  document.querySelector("#splitButton").addEventListener("click", () => {
    state.split = !state.split;
  });
  document.querySelector("#depthButton").addEventListener("click", () => {
    state.depth = !state.depth;
  });
  document.querySelector("#gridButton").addEventListener("click", () => {
    state.showGrid = !state.showGrid;
  });
  document.querySelector("#debugButton").addEventListener("click", () => {
    state.showDebug = !state.showDebug;
  });
  document.querySelector("#clipButton").addEventListener("click", nextClipPreset);
  document.querySelector("#fovPresetButton").addEventListener("click", nextFovPreset);
  document.querySelector("#resetButton").addEventListener("click", resetScene);

  document.querySelector("#fovControl").addEventListener("input", (event) => {
    state.fov = Number(event.target.value);
    document.querySelector("#fovValue").textContent = `${state.fov}°`;
  });
  document.querySelector("#heightControl").addEventListener("input", (event) => {
    state.camera.position[1] = Number(event.target.value);
    document.querySelector("#heightValue").textContent = Number(event.target.value).toFixed(2);
  });
  document.querySelector("#targetXControl").addEventListener("input", (event) => {
    state.camera.target[0] = Number(event.target.value);
    document.querySelector("#targetXValue").textContent = Number(event.target.value).toFixed(2);
  });
  document.querySelector("#targetYControl").addEventListener("input", (event) => {
    state.camera.target[1] = Number(event.target.value);
    document.querySelector("#targetYValue").textContent = Number(event.target.value).toFixed(2);
  });
}

/* ---------- feature: mouse/touch drag to orbit the camera manually ---------- */

function computeSpherical(position, target) {
  const offset = subtract(position, target);
  const radius = Math.hypot(...offset) || 1;
  const pitch = Math.asin(Math.max(-1, Math.min(1, offset[1] / radius)));
  const yaw = Math.atan2(offset[0], offset[2]);
  return { radius, yaw, pitch };
}

function bindPointerOrbit() {
  const drag = { active: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0, radius: 5 };
  const SENSITIVITY = 0.008;
  const MAX_PITCH = 1.3; // ~75°, avoids flipping over the poles

  function startDrag(event) {
    drag.active = true;
    state.orbit = false; // manual drag takes priority over the automatic orbit toggle
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    const spherical = computeSpherical(state.camera.position, state.camera.target);
    drag.radius = spherical.radius;
    drag.yaw = spherical.yaw;
    drag.pitch = spherical.pitch;
    canvas.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!drag.active) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.yaw -= dx * SENSITIVITY;
    drag.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, drag.pitch - dy * SENSITIVITY));
    state.camera.position = [
      state.camera.target[0] + drag.radius * Math.cos(drag.pitch) * Math.sin(drag.yaw),
      state.camera.target[1] + drag.radius * Math.sin(drag.pitch),
      state.camera.target[2] + drag.radius * Math.cos(drag.pitch) * Math.cos(drag.yaw),
    ];
  }

  function endDrag(event) {
    drag.active = false;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }

  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
}

/* ---------- keyboard: Arrow=X/Y, W/S=Z, P=proyeksi, [ ]=FOV, N=near/far,
   D=depth, G=grid, M=debug matrix, Space=pause, R=reset ---------- */

/* FIX: arrow keys were captured globally even while a slider had focus,
   so native range-input keyboard behavior (which also uses arrow keys) was
   silently overridden. Any key event that originates from a form control
   now falls through to the browser's default handling instead. */
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (["[", "]"].includes(key)) event.preventDefault();

  state.keys[key] = true;
  if (event.repeat) return;

  if (key === "p") state.projection = state.projection === "perspective" ? "orthographic" : "perspective";
  if (key === "b") state.orbit = !state.orbit;
  if (key === "x") state.split = !state.split;
  if (key === "d") state.depth = !state.depth;
  if (key === "g") state.showGrid = !state.showGrid;
  if (key === "m") state.showDebug = !state.showDebug;
  if (key === "n") nextClipPreset();
  if (key === "[") setFov(-5);
  if (key === "]") setFov(5);
  if (key === "r") resetScene();
  if (key === " ") state.paused = !state.paused; // was dead code before: preventDefault fired but nothing read " "
});

window.addEventListener("keyup", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  state.keys[key] = false;
});

window.addEventListener("resize", resizeCanvasToDisplaySize);

/* ---------- render loop ---------- */

let lastTime = 0;
function render(time) {
  const deltaTime = Math.min((time - lastTime) * 0.001, 0.05);
  lastTime = time;
  if (!state.paused) state.time += deltaTime;
  updateCamera(deltaTime);
  renderScene();
  requestAnimationFrame(render);
}

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LESS);
bindControls();
bindPointerOrbit();
resizeCanvasToDisplaySize();
renderScene();
requestAnimationFrame(render);