/* ================================================
   main.js — WebGL2 cube camera playground
   Requires math3d.js to be loaded first.
   ================================================ */

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

function bindAttributes() {
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.enableVertexAttribArray(colorLocation);
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
}

function drawCube(model, view, projection) {
  gl.uniformMatrix4fv(modelLocation, false, model);
  gl.uniformMatrix4fv(viewLocation, false, view);
  gl.uniformMatrix4fv(projectionLocation, false, projection);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

/* three cubes at different depths (challenge) */
function drawPass(x, width, projection) {
  gl.viewport(x, 0, width, canvas.height);
  const view = lookAt(state.camera.position, state.camera.target, state.camera.up);
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

function renderScene() {
  resizeCanvasToDisplaySize();
  gl.enable(gl.SCISSOR_TEST);
  gl.useProgram(program);
  bindAttributes();

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

function updateCamera(deltaTime) {
  const speed = 2.0 * deltaTime;
  if (state.keys.ArrowLeft) state.camera.position[0] -= speed;
  if (state.keys.ArrowRight) state.camera.position[0] += speed;
  if (state.keys.ArrowUp) state.camera.position[1] += speed;
  if (state.keys.ArrowDown) state.camera.position[1] -= speed;
  if (state.keys.w) state.camera.position[2] -= speed;
  if (state.keys.s) state.camera.position[2] += speed;

  /* orbit camera (challenge) */
  if (state.orbit) {
    const radius = 5;
    state.camera.position[0] = Math.sin(state.time * 0.45) * radius;
    state.camera.position[2] = Math.cos(state.time * 0.45) * radius;
  }
}

function updateHud() {
  document.querySelector("#projectionInfo").textContent = state.split ? "Split P / O" : state.projection;
  document.querySelector("#cameraInfo").textContent =
    `(${state.camera.position.map((value) => value.toFixed(2)).join(", ")})`;
  document.querySelector("#fovInfo").textContent = `${state.fov.toFixed(0)}°`;
  document.querySelector("#clipInfo").textContent = `${state.near.toFixed(2)} / ${state.far.toFixed(2)}`;
  document.querySelector("#depthInfo").textContent = state.depth ? "Enabled" : "Disabled";
  document.querySelector("#cameraModeInfo").textContent = state.orbit ? "Orbit" : "Manual";
  document.querySelector("#statusBadge").textContent = `${state.depth ? "DEPTH ON" : "DEPTH OFF"} · WEBGL2`;
  document.querySelector("#orbitButton").setAttribute("aria-pressed", String(state.orbit));
  document.querySelector("#splitButton").setAttribute("aria-pressed", String(state.split));
  document.querySelector("#depthButton").setAttribute("aria-pressed", String(state.depth));
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

/* ---------- keyboard: Arrow=X/Y, W/S=Z, P=proyeksi, [ ]=FOV, N=near/far, D=depth, R=reset ---------- */

window.addEventListener("keydown", (event) => {
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
  if (key === "n") nextClipPreset();
  if (key === "[") setFov(-5);
  if (key === "]") setFov(5);
  if (key === "r") resetScene();
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  state.keys[key] = false;
});

window.addEventListener("resize", resizeCanvasToDisplaySize);

/* ---------- render loop ---------- */

let lastTime = 0;
function render(time) {
  const deltaTime = Math.min((time - lastTime) * 0.001, 0.05);
  lastTime = time;
  state.time += deltaTime;
  updateCamera(deltaTime);
  renderScene();
  requestAnimationFrame(render);
}

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LESS);
bindControls();
resizeCanvasToDisplaySize();
renderScene();
requestAnimationFrame(render);
