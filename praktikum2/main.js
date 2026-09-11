const canvas = document.querySelector("#webglCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  document.querySelector("#statusBadge").textContent = "WebGL2 TIDAK TERSEDIA";
  throw new Error("Browser tidak mendukung WebGL2.");
}

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec3 a_color;
out vec3 v_color;
uniform vec2 u_offset;

void main() {
  gl_Position = vec4(a_position + u_offset, 0.0, 1.0);
  v_color = a_color;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;

void main() {
  outColor = vec4(v_color, 1.0);
}`;

const state = {
  paused: false,
  selectedPrimitive: "triangle",
  drawMode: gl.TRIANGLES,
  drawModeName: "TRIANGLES",
  speed: 0.35,
  mouseNdc: { x: 0, y: 0 },
  keys: {},
  heroOffset: { x: 0, y: 0 },
  spawned: [],
  movingObjects: [
    { x: -0.65, y: 0.56, vx: 0.32, vy: 0.21, color: [1, 0.35, 0.35] },
    { x: 0.32, y: -0.48, vx: -0.28, vy: 0.25, color: [0.35, 0.85, 1] },
    { x: 0.68, y: 0.52, vx: -0.22, vy: -0.3, color: [0.55, 1, 0.45] },
  ],
  colors: {
    red: [1, 0.15, 0.12],
    green: [0.1, 0.95, 0.45],
    blue: [0.25, 0.55, 1],
    cyan: [0.1, 0.95, 1],
  },
  heroColor: [0.1, 0.95, 1],
  patternVisible: true,
};

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram() {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(
    program,
    compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource),
  );
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  return program;
}

const program = createProgram();
const positionLocation = gl.getAttribLocation(program, "a_position");
const colorLocation = gl.getAttribLocation(program, "a_color");
const offsetLocation = gl.getUniformLocation(program, "u_offset");

const primitiveData = {
  triangle: {
    positions: [0, -0.16, 0, 0.18, -0.16, 0, 0, 0.2],
    colors: [1, 0.2, 0.2, 0.2, 1, 0.35, 0.2, 0.45, 1],
    count: 3,
    defaultMode: gl.TRIANGLES,
  },
  rectangle: {
    positions: [
      -0.22, -0.15, 0.22, -0.15, -0.22, 0.15, -0.22, 0.15, 0.22, -0.15, 0.22,
      0.15,
    ],
    colors: [
      0.15, 0.85, 1, 0.2, 0.45, 1, 0.1, 1, 0.55, 0.1, 0.95, 0.75, 0.25, 0.5, 1,
      0.35, 0.8, 1,
    ],
    count: 6,
    defaultMode: gl.TRIANGLES,
  },
  line: {
    positions: [-0.3, -0.15, -0.12, 0.15, 0, -0.05, 0.12, 0.15, 0.3, -0.15],
    colors: [1, 0.3, 0.3, 1, 0.75, 0.25, 0.3, 1, 0.4, 0.2, 0.5, 1, 0.2, 0.9, 1],
    count: 5,
    defaultMode: gl.LINE_STRIP,
  },
  points: createProceduralPoints(),
};

function createProceduralPoints() {
  const positions = [];
  const colors = [];
  const columns = 11;
  const rows = 7;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      positions.push(-0.8 + column * 0.16, -0.48 + row * 0.16);
      colors.push(0.1 + column / columns, 0.4 + row / rows, 1);
    }
  }

  return {
    positions,
    colors,
    count: positions.length / 2,
    defaultMode: gl.POINTS,
  };
}

function createBuffer(data, usage = gl.STATIC_DRAW) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), usage);
  return buffer;
}

const positionBuffer = gl.createBuffer();
const colorBuffer = gl.createBuffer();

function updateBuffer(data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
}

function setAttributes(colors) {
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
}

function drawPrimitive(
  primitive,
  offset,
  mode = state.drawMode,
  colorOverride = null,
) {
  const positions = [];
  for (let index = 0; index < primitive.positions.length; index += 2) {
    positions.push(
      primitive.positions[index] + offset.x,
      primitive.positions[index + 1] + offset.y,
    );
  }

  updateBuffer(positions);
  const colors = colorOverride
    ? Array.from({ length: primitive.count }, () => colorOverride).flat()
    : primitive.colors;
  setAttributes(colors);
  gl.uniform2f(offsetLocation, 0, 0);
  gl.drawArrays(mode, 0, primitive.count);
}

function updateKeyboard(deltaTime) {
  const amount = state.speed * deltaTime;

  if (state.keys.ArrowLeft || state.keys.a) state.heroOffset.x -= amount;
  if (state.keys.ArrowRight || state.keys.d) state.heroOffset.x += amount;
  if (state.keys.ArrowUp || state.keys.w) state.heroOffset.y += amount;
  if (state.keys.ArrowDown || state.keys.s) state.heroOffset.y -= amount;

  state.heroOffset.x = clamp(state.heroOffset.x, -0.75, 0.75);
  state.heroOffset.y = clamp(state.heroOffset.y, -0.75, 0.75);
}

function updateMovingObjects(deltaTime) {
  state.movingObjects.forEach((object) => {
    object.x += object.vx * deltaTime;
    object.y += object.vy * deltaTime;

    if (object.x < -0.85 || object.x > 0.85) object.vx *= -1;
    if (object.y < -0.75 || object.y > 0.75) object.vy *= -1;
  });
}

function drawScene() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.015, 0.045, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  const selected = primitiveData[state.selectedPrimitive];
  drawPrimitive(selected, state.heroOffset, state.drawMode);

  state.movingObjects.forEach((object) => {
    drawPrimitive(primitiveData.triangle, object, gl.TRIANGLES, object.color);
  });

  state.spawned.forEach((object) => {
    drawPrimitive(primitiveData.triangle, object, gl.TRIANGLES, object.color);
  });

  if (state.patternVisible) {
    drawPrimitive(primitiveData.points, { x: 0, y: 0 }, gl.POINTS);
  }

  updateHud();
}

function updateHud() {
  document.querySelector("#primitiveCount").textContent = String(
    1 + state.movingObjects.length + state.spawned.length,
  );
  document.querySelector("#drawModeValue").textContent = state.drawModeName;
  document.querySelector("#mouseValue").textContent =
    `(${state.mouseNdc.x.toFixed(2)}, ${state.mouseNdc.y.toFixed(2)})`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function randomColor() {
  return [Math.random(), Math.random(), Math.random()];
}

function setHeroColor(colorName) {
  state.heroColor =
    colorName === "random" ? randomColor() : state.colors[colorName];
  primitiveData.triangle.colors = [
    ...state.heroColor,
    state.heroColor[0] * 0.5,
    state.heroColor[1] * 0.7,
    Math.min(1, state.heroColor[2] + 0.25),
    Math.min(1, state.heroColor[0] + 0.2),
    Math.min(1, state.heroColor[1] + 0.1),
    1,
  ];
}

function setDrawMode(value) {
  const modes = {
    triangles: [gl.TRIANGLES, "TRIANGLES"],
    line: [gl.LINE_STRIP, "LINE_STRIP"],
    points: [gl.POINTS, "POINTS"],
  };
  [state.drawMode, state.drawModeName] = modes[value];
}

function reset() {
  state.heroOffset = { x: 0, y: 0 };
  state.spawned.length = 0;
  state.movingObjects[0].x = -0.65;
  state.movingObjects[0].y = 0.56;
  state.movingObjects[1].x = 0.32;
  state.movingObjects[1].y = -0.48;
  state.movingObjects[2].x = 0.68;
  state.movingObjects[2].y = 0.52;
}

function updateMouse(event) {
  const rect = canvas.getBoundingClientRect();
  const pixelX = event.clientX - rect.left;
  const pixelY = event.clientY - rect.top;
  state.mouseNdc.x = (pixelX / rect.width) * 2 - 1;
  state.mouseNdc.y = 1 - (pixelY / rect.height) * 2;
}

let lastTime = 0;
let frameCount = 0;
let fpsTime = 0;

function render(time) {
  const deltaTime = Math.min((time - lastTime) * 0.001, 0.05);
  lastTime = time;

  if (!state.paused) {
    updateKeyboard(deltaTime);
    updateMovingObjects(deltaTime);
    drawScene();
  }

  frameCount += 1;
  fpsTime += deltaTime;
  if (fpsTime >= 0.5) {
    document.querySelector("#fpsValue").textContent = String(
      Math.round(frameCount / fpsTime),
    );
    frameCount = 0;
    fpsTime = 0;
  }

  requestAnimationFrame(render);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)
  )
    event.preventDefault();
  state.keys[key] = true;

  if (event.repeat) return;
  if (key === "r") reset();
  if (key === "p") togglePause();
  if (key === "c") setHeroColor("random");
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  state.keys[key] = false;
});

canvas.addEventListener("mousemove", updateMouse);
canvas.addEventListener("click", (event) => {
  updateMouse(event);
  state.spawned.push({
    x: state.mouseNdc.x,
    y: state.mouseNdc.y,
    color: randomColor(),
  });
});

function togglePause() {
  state.paused = !state.paused;
  document.querySelector("#pauseButton").textContent = state.paused
    ? "Resume (P)"
    : "Pause (P)";
  document.querySelector("#statusBadge").textContent = state.paused
    ? "PAUSED · WEBGL2"
    : "RUNNING · WEBGL2";
}

document
  .querySelector("#primitiveSelect")
  .addEventListener("change", (event) => {
    state.selectedPrimitive = event.target.value;
  });
document
  .querySelector("#drawModeSelect")
  .addEventListener("change", (event) => setDrawMode(event.target.value));
document.querySelector("#speedControl").addEventListener("input", (event) => {
  state.speed = Number(event.target.value);
  document.querySelector("#speedValue").textContent = state.speed.toFixed(2);
});
document.querySelector("#patternToggle").addEventListener("change", (event) => {
  state.patternVisible = event.target.checked;
});
document.querySelector("#pauseButton").addEventListener("click", togglePause);
document.querySelector("#resetButton").addEventListener("click", reset);
document
  .querySelector("#clearSpawnedButton")
  .addEventListener("click", () => (state.spawned.length = 0));
document.querySelectorAll("[data-color]").forEach((button) => {
  button.addEventListener("click", () => setHeroColor(button.dataset.color));
});

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
drawScene();
requestAnimationFrame(render);
