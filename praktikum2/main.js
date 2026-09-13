// =====================================================================
// 0. DOM & CONTEXT SETUP
// =====================================================================

const canvas = document.querySelector("#webglCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  document.querySelector("#statusBadge").textContent = "WEBGL2 TIDAK TERSEDIA";
  throw new Error("Browser tidak mendukung WebGL2.");
}

const ui = {
  primitiveSelect: document.querySelector("#primitiveSelect"),
  drawModeSelect: document.querySelector("#drawModeSelect"),
  speedControl: document.querySelector("#speedControl"),
  speedValue: document.querySelector("#speedValue"),
  brightnessSlider: document.querySelector("#brightnessSlider"),
  brightnessValue: document.querySelector("#brightnessValue"),
  toggleTriangles: document.querySelector("#toggleTriangles"),
  togglePoints: document.querySelector("#togglePoints"),
  toggleLines: document.querySelector("#toggleLines"),
  pauseButton: document.querySelector("#pauseButton"),
  resetButton: document.querySelector("#resetButton"),
  clearSpawnedButton: document.querySelector("#clearSpawnedButton"),
  colorButtons: document.querySelectorAll("[data-color]"),
  statusBadge: document.querySelector("#statusBadge"),
  fpsValue: document.querySelector("#fpsValue"),
  primitiveCount: document.querySelector("#primitiveCount"),
  drawModeValue: document.querySelector("#drawModeValue"),
  mouseValue: document.querySelector("#mouseValue"),
};

// =====================================================================
// 1. STATE
// =====================================================================

const state = {
  paused: false,
  speed: Number(ui.speedControl.value),
  brightness: Number(ui.brightnessSlider.value),
  time: 0,
  startTime: performance.now(),
  pauseTime: 0,

  keys: {},
  mouseNdc: { x: 0, y: 0 },

  heroOffset: { x: 0, y: 0 },
  heroPrimitive: "triangle",
  heroDrawMode: "triangles",
  heroColor: [0.1, 0.95, 1],

  showTriangles: true,
  showPoints: true,
  showLines: true,

  spawned: [],

  movingObjects: [
    // Object pertama sengaja murni horizontal (requirement animasi).
    { x: -0.65, y: 0.56, vx: 0.35, vy: 0.0, size: 0.05, color: [1, 0.35, 0.35] },
    { x: 0.32, y: -0.48, vx: -0.28, vy: 0.25, size: 0.05, color: [0.35, 0.85, 1] },
    { x: 0.68, y: 0.52, vx: -0.22, vy: -0.3, size: 0.05, color: [0.55, 1, 0.45] },
  ],

  colors: {
    red: [1, 0.15, 0.12],
    green: [0.1, 0.95, 0.45],
    blue: [0.25, 0.55, 1],
    cyan: [0.1, 0.95, 1],
  },
};

// =====================================================================
// 2. SHADER LOADING, COMPILATION, PROGRAM LINKING
// =====================================================================

function getShaderSource(id) {
  const shaderScript = document.getElementById(id);

  if (!shaderScript) {
    throw new Error(`Shader dengan id '${id}' tidak ditemukan.`);
  }

  return shaderScript.textContent.trim();
}

function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader gagal dikompilasi:\n${info}`);
  }

  return shader;
}

function createProgram(vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program gagal di-link:\n${info}`);
  }

  return program;
}

const vertexShader = createShader(gl.VERTEX_SHADER, getShaderSource("vertex-shader"));
const fragmentShader = createShader(gl.FRAGMENT_SHADER, getShaderSource("fragment-shader"));
const program = createProgram(vertexShader, fragmentShader);

gl.useProgram(program);

// =====================================================================
// 3. GEOMETRY — VAO + INTERLEAVED BUFFER (x, y, r, g, b)
// =====================================================================

const aPositionLocation = gl.getAttribLocation(program, "a_position");
const aColorLocation = gl.getAttribLocation(program, "a_color");

const uTimeLocation = gl.getUniformLocation(program, "u_time");
const uOffsetLocation = gl.getUniformLocation(program, "u_offset");
const uPointSizeLocation = gl.getUniformLocation(program, "u_pointSize");
const uWaveAmountLocation = gl.getUniformLocation(program, "u_waveAmount");
const uBrightnessLocation = gl.getUniformLocation(program, "u_brightness");

const vao = gl.createVertexArray();
const vertexBuffer = gl.createBuffer();
const STRIDE = 5 * Float32Array.BYTES_PER_ELEMENT;
const POSITION_OFFSET = 0;
const COLOR_OFFSET = 2 * Float32Array.BYTES_PER_ELEMENT;

gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(0), gl.DYNAMIC_DRAW);

gl.enableVertexAttribArray(aPositionLocation);
gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, STRIDE, POSITION_OFFSET);

gl.enableVertexAttribArray(aColorLocation);
gl.vertexAttribPointer(aColorLocation, 3, gl.FLOAT, false, STRIDE, COLOR_OFFSET);

gl.bindVertexArray(null);

// Satu buffer dipakai ulang untuk setiap draw call (interleaved,
// di-upload ulang tiap kali geometrinya berbeda).
function drawInterleaved(vertices, mode, count, uniforms) {
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  setCommonUniforms(uniforms);
  gl.drawArrays(mode, 0, count);
}

function setCommonUniforms({
  offset = { x: 0, y: 0 },
  localBrightness = 1,
  pointSize = 1,
  waveAmount = 0,
} = {}) {
  gl.uniform1f(uTimeLocation, state.time);
  gl.uniform2f(uOffsetLocation, offset.x, offset.y);
  gl.uniform1f(uPointSizeLocation, pointSize);
  gl.uniform1f(uWaveAmountLocation, waveAmount);
  gl.uniform1f(uBrightnessLocation, localBrightness * state.brightness);
}

// =====================================================================
// 4. PRIMITIVE DATA — SHOWCASE (7 primitive mode, statis)
// =====================================================================
// Format setiap vertex: x, y, r, g, b

const showcase = {
  triangles: [
    {
      vertices: new Float32Array([
        -0.92, -0.65, 1.0, 0.2, 0.2,
        -0.55, -0.65, 1.0, 0.2, 0.2,
        -0.74, -0.2, 1.0, 0.2, 0.2,
      ]),
      brightness: 0.7,
    },
    {
      vertices: new Float32Array([
        -0.22, -0.65, 0.2, 1.0, 0.35,
        0.22, -0.65, 0.2, 1.0, 0.35,
        0.0, -0.2, 0.2, 1.0, 0.35,
      ]),
      brightness: 1.0,
    },
    {
      vertices: new Float32Array([
        0.55, -0.65, 0.25, 0.48, 1.0,
        0.92, -0.65, 0.25, 0.48, 1.0,
        0.74, -0.2, 0.25, 0.48, 1.0,
      ]),
      brightness: 1.3,
    },
  ],

  points: [
    { vertices: new Float32Array([-0.62, 0.18, 1.0, 0.72, 0.25]), size: 10 },
    { vertices: new Float32Array([0.0, 0.18, 0.35, 1.0, 1.0]), size: 24 },
    { vertices: new Float32Array([0.62, 0.18, 1.0, 0.3, 1.0]), size: 40 },
  ],

  lines: [
    new Float32Array([
      -0.86, 0.5, 1.0, 1.0, 0.25,
      -0.28, 0.5, 1.0, 1.0, 0.25,
    ]),
    new Float32Array([
      0.28, 0.5, 0.25, 1.0, 1.0,
      0.86, 0.5, 0.25, 1.0, 1.0,
    ]),
  ],

  lineStrip: new Float32Array([
    -0.86, 0.72, 0.75, 0.85, 1.0,
    -0.58, 0.86, 0.75, 0.85, 1.0,
    -0.3, 0.72, 0.75, 0.85, 1.0,
    -0.02, 0.86, 0.75, 0.85, 1.0,
  ]),

  lineLoop: new Float32Array([
    0.18, 0.68, 0.95, 0.7, 1.0,
    0.42, 0.68, 0.95, 0.7, 1.0,
    0.42, 0.88, 0.95, 0.7, 1.0,
    0.18, 0.88, 0.95, 0.7, 1.0,
  ]),

  triangleStrip: new Float32Array([
    -0.92, -0.02, 0.2, 0.9, 0.8,
    -0.62, -0.02, 0.2, 0.9, 0.8,
    -0.92, 0.12, 0.2, 0.9, 0.8,
    -0.62, 0.12, 0.2, 0.9, 0.8,
  ]),

  triangleFan: new Float32Array([
    0.7, 0.04, 1.0, 0.82, 0.28,
    0.56, -0.1, 1.0, 0.52, 0.22,
    0.84, -0.1, 1.0, 0.52, 0.22,
    0.9, 0.14, 1.0, 0.52, 0.22,
    0.5, 0.14, 1.0, 0.52, 0.22,
  ]),
};

// =====================================================================
// 5. PRIMITIVE DATA — HERO (interaktif, digerakkan via u_offset)
// =====================================================================

function buildHeroVertices(name, color) {
  const [r, g, b] = color;

  if (name === "triangle") {
    return {
      vertices: new Float32Array([
        0, 0.18, r, g, b,
        -0.16, -0.12, r * 0.5, g * 0.7, Math.min(1, b + 0.25),
        0.16, -0.12, Math.min(1, r + 0.2), Math.min(1, g + 0.1), 1,
      ]),
      count: 3,
      mode: gl.TRIANGLES,
    };
  }

  if (name === "rectangle") {
    return {
      vertices: new Float32Array([
        -0.2, -0.14, r, g, b,
        0.2, -0.14, r * 0.6, g, b,
        -0.2, 0.14, r, g * 0.6, b,
        -0.2, 0.14, r, g * 0.6, b,
        0.2, -0.14, r * 0.6, g, b,
        0.2, 0.14, r, g, b * 0.6,
      ]),
      count: 6,
      mode: gl.TRIANGLES,
    };
  }

  if (name === "line") {
    return {
      vertices: new Float32Array([
        -0.3, -0.1, r, g, b,
        -0.1, 0.14, r, g, b,
        0.1, -0.08, r, g, b,
        0.3, 0.12, r, g, b,
      ]),
      count: 4,
      mode: gl.LINE_STRIP,
    };
  }

  // "points" -> procedural grid, lihat generateProceduralGrid()
  const grid = generateProceduralGrid(color);
  return { vertices: grid.vertices, count: grid.count, mode: gl.POINTS };
}

function generateProceduralGrid(color) {
  const vertices = [];
  const columns = 11;
  const rows = 7;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = -0.8 + column * 0.16;
      const y = -0.32 + row * 0.1;
      vertices.push(
        x,
        y,
        0.1 + column / columns,
        0.4 + row / rows,
        color[2]
      );
    }
  }

  return {
    vertices: new Float32Array(vertices),
    count: vertices.length / 5,
  };
}

const DRAW_MODE_MAP = {
  triangles: gl.TRIANGLES,
  line: gl.LINE_STRIP,
  points: gl.POINTS,
};

const DRAW_MODE_NAME = {
  triangles: "TRIANGLES",
  line: "LINE_STRIP",
  points: "POINTS",
};

// =====================================================================
// 6. HELPER — BUILD MOVING / SPAWNED TRIANGLE (posisi di-bake ke vertex)
// =====================================================================

function buildTriangleAt(cx, cy, size, color) {
  const [r, g, b] = color;
  return new Float32Array([
    cx, cy + size, r, g, b,
    cx - size, cy - size, r, g, b,
    cx + size, cy - size, r, g, b,
  ]);
}

function randomColor() {
  return [Math.random(), Math.random(), Math.random()];
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

// =====================================================================
// 7. INPUT — KEYBOARD & MOUSE
// =====================================================================

function setupInput() {
  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
      event.preventDefault();
    }

    state.keys[key] = true;

    if (event.repeat) return;

    if (key === "r") resetScene();
    if (key === " " || key === "p") togglePause();
    if (key === "c") setHeroColor("random");
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    state.keys[key] = false;
  });

  canvas.addEventListener("mousemove", updateMouseNdc);

  canvas.addEventListener("click", (event) => {
    updateMouseNdc(event);

    // Challenge B: klik menggeser hero offset berdasarkan posisi mouse (NDC).
    state.heroOffset.x = clamp(state.mouseNdc.x * 0.5, -0.6, 0.6);
    state.heroOffset.y = clamp(state.mouseNdc.y * 0.5, -0.6, 0.6);

    // Fitur lama tetap ada: spawn triangle baru di posisi klik.
    state.spawned.push({
      x: state.mouseNdc.x,
      y: state.mouseNdc.y,
      color: randomColor(),
    });
  });

  ui.primitiveSelect.addEventListener("change", (event) => {
    state.heroPrimitive = event.target.value;
  });

  ui.drawModeSelect.addEventListener("change", (event) => {
    state.heroDrawMode = event.target.value;
  });

  ui.speedControl.addEventListener("input", (event) => {
    state.speed = Number(event.target.value);
    ui.speedValue.textContent = state.speed.toFixed(2);
  });

  ui.brightnessSlider.addEventListener("input", (event) => {
    state.brightness = Number(event.target.value);
    ui.brightnessValue.textContent = state.brightness.toFixed(2);
  });

  ui.toggleTriangles.addEventListener("change", (event) => {
    state.showTriangles = event.target.checked;
  });
  ui.togglePoints.addEventListener("change", (event) => {
    state.showPoints = event.target.checked;
  });
  ui.toggleLines.addEventListener("change", (event) => {
    state.showLines = event.target.checked;
  });

  ui.pauseButton.addEventListener("click", togglePause);
  ui.resetButton.addEventListener("click", resetScene);
  ui.clearSpawnedButton.addEventListener("click", () => {
    state.spawned.length = 0;
  });

  ui.colorButtons.forEach((button) => {
    button.addEventListener("click", () => setHeroColor(button.dataset.color));
  });
}

function updateMouseNdc(event) {
  const rect = canvas.getBoundingClientRect();
  const pixelX = event.clientX - rect.left;
  const pixelY = event.clientY - rect.top;
  state.mouseNdc.x = (pixelX / rect.width) * 2 - 1;
  state.mouseNdc.y = 1 - (pixelY / rect.height) * 2;
}

function setHeroColor(colorName) {
  state.heroColor = colorName === "random" ? randomColor() : state.colors[colorName];
}

function togglePause() {
  state.paused = !state.paused;
  ui.pauseButton.textContent = state.paused ? "Resume (Space)" : "Pause (Space)";
  ui.statusBadge.textContent = state.paused ? "PAUSED · WEBGL2" : "RUNNING · WEBGL2";

  if (state.paused) {
    state.pauseTime = performance.now();
  } else {
    const pausedDuration = performance.now() - state.pauseTime;
    state.startTime += pausedDuration;
  }
}

function resetScene() {
  state.heroOffset = { x: 0, y: 0 };
  state.spawned.length = 0;
  state.movingObjects[0].x = -0.65;
  state.movingObjects[0].y = 0.56;
  state.movingObjects[1].x = 0.32;
  state.movingObjects[1].y = -0.48;
  state.movingObjects[2].x = 0.68;
  state.movingObjects[2].y = 0.52;
}

// =====================================================================
// 8. UPDATE — KEYBOARD MOVEMENT & MOVING OBJECTS
// =====================================================================

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

    const bound = 0.85;
    if (object.x < -bound || object.x > bound) object.vx *= -1;
    if (object.y < -bound || object.y > bound) object.vy *= -1;

    object.x = clamp(object.x, -bound, bound);
    object.y = clamp(object.y, -bound, bound);
  });
}

// =====================================================================
// 9. DRAW FUNCTIONS
// =====================================================================

function drawShowcaseTriangles() {
  showcase.triangles.forEach((triangle) => {
    drawInterleaved(triangle.vertices, gl.TRIANGLES, 3, {
      localBrightness: triangle.brightness,
    });
  });

  drawInterleaved(showcase.triangleStrip, gl.TRIANGLE_STRIP, 4, {
    localBrightness: 1,
    waveAmount: 0.015,
  });

  drawInterleaved(showcase.triangleFan, gl.TRIANGLE_FAN, 5, {
    localBrightness: 1,
    waveAmount: 0.015,
  });
}

function drawShowcasePoints() {
  showcase.points.forEach((point) => {
    drawInterleaved(point.vertices, gl.POINTS, 1, {
      localBrightness: 1,
      pointSize: point.size,
    });
  });
}

function drawShowcaseLines() {
  showcase.lines.forEach((line) => {
    drawInterleaved(line, gl.LINES, 2, { localBrightness: 1 });
  });

  drawInterleaved(showcase.lineStrip, gl.LINE_STRIP, 4, {
    localBrightness: 1,
    waveAmount: 0.02,
  });

  drawInterleaved(showcase.lineLoop, gl.LINE_LOOP, 4, {
    localBrightness: 1,
    waveAmount: 0.01,
  });
}

function drawHero() {
  const hero = buildHeroVertices(state.heroPrimitive, state.heroColor);
  const mode = DRAW_MODE_MAP[state.heroDrawMode] ?? hero.mode;

  drawInterleaved(hero.vertices, hero.mode === gl.POINTS ? gl.POINTS : mode, hero.count, {
    offset: state.heroOffset,
    localBrightness: 1.1,
    pointSize: 6,
    waveAmount: 0,
  });
}

function drawMovingObjects() {
  state.movingObjects.forEach((object) => {
    const vertices = buildTriangleAt(object.x, object.y, object.size, object.color);
    drawInterleaved(vertices, gl.TRIANGLES, 3, { localBrightness: 1 });
  });
}

function drawSpawned() {
  state.spawned.forEach((object) => {
    const vertices = buildTriangleAt(object.x, object.y, 0.045, object.color);
    drawInterleaved(vertices, gl.TRIANGLES, 3, { localBrightness: 1 });
  });
}

function drawScene() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.015, 0.045, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  if (state.showTriangles) {
    drawShowcaseTriangles();
    drawMovingObjects();
    drawSpawned();
  }

  if (state.showPoints) {
    drawShowcasePoints();
  }

  if (state.showLines) {
    drawShowcaseLines();
  }

  // Hero shape selalu digambar terpisah dari toggle kategori supaya
  // tetap bisa dieksplorasi lewat primitive selector.
  drawHero();

  gl.bindVertexArray(null);
}

// =====================================================================
// 10. HUD
// =====================================================================

function updateHud() {
  const totalPrimitives =
    showcase.triangles.length +
    2 + // triangle strip + triangle fan
    showcase.points.length +
    showcase.lines.length +
    2 + // line strip + line loop
    state.movingObjects.length +
    state.spawned.length +
    1; // hero

  ui.primitiveCount.textContent = String(totalPrimitives);
  ui.drawModeValue.textContent = DRAW_MODE_NAME[state.heroDrawMode];
  ui.mouseValue.textContent = `(${state.mouseNdc.x.toFixed(2)}, ${state.mouseNdc.y.toFixed(2)})`;
}

// =====================================================================
// 11. RENDER LOOP
// =====================================================================

let lastFrameTime = 0;
let frameCount = 0;
let fpsAccumulator = 0;

function render(now) {
  const deltaTime = Math.min((now - lastFrameTime) * 0.001, 0.05);
  lastFrameTime = now;

  if (!state.paused) {
    updateKeyboard(deltaTime);
    updateMovingObjects(deltaTime);
    state.time = (now - state.startTime) * 0.001 * Math.max(state.speed, 0.05);
    drawScene();
  }

  frameCount += 1;
  fpsAccumulator += deltaTime;
  if (fpsAccumulator >= 0.5) {
    ui.fpsValue.textContent = String(Math.round(frameCount / fpsAccumulator));
    frameCount = 0;
    fpsAccumulator = 0;
  }

  updateHud();
  requestAnimationFrame(render);
}

// =====================================================================
// 12. INIT
// =====================================================================

setupInput();
drawScene();
updateHud();
requestAnimationFrame(render);
