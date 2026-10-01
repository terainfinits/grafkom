const $ = (id) => document.getElementById(id);
const canvas = $("webglCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  $("statusBadge").textContent = "WebGL2 TIDAK TERSEDIA";
  throw new Error("Browser tidak mendukung WebGL2.");
}

/* ------------------------------------------------------------------
   Shaders
------------------------------------------------------------------ */
const vertexShaderSource = `#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;
uniform float u_uvScale;
out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_uv;

void main() {
  vec4 worldPosition = u_model * vec4(a_position, 1.0);
  gl_Position = u_projection * u_view * worldPosition;
  v_worldPosition = worldPosition.xyz;
  v_normal = u_normalMatrix * a_normal;
  v_uv = a_uv * u_uvScale;
}`;

// Phong: R = reflect(-L, N), spec = pow(max(dot(R, V), 0), shininess)
const fragmentShaderSource = `#version 300 es
precision highp float;
in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_uv;
uniform vec3 u_lightPosition;
uniform vec3 u_cameraPosition;
uniform vec3 u_lightColor;
uniform float u_ambientStrength;
uniform float u_shininess;
uniform sampler2D u_texture;
uniform bool u_useTexture;
uniform bool u_useAmbient;
uniform bool u_useDiffuse;
uniform bool u_useSpecular;
out vec4 outColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPosition - v_worldPosition);
  vec3 V = normalize(u_cameraPosition - v_worldPosition);
  vec3 R = reflect(-L, N);

  float diff = max(dot(N, L), 0.0);
  float spec = 0.0;
  if (diff > 0.0) {
    spec = pow(max(dot(R, V), 0.0), u_shininess);
  }

  vec3 baseColor = u_useTexture ? texture(u_texture, v_uv).rgb : vec3(0.35, 0.78, 1.0);
  vec3 ambient  = u_useAmbient  ? u_ambientStrength * u_lightColor * baseColor : vec3(0.0);
  vec3 diffuse  = u_useDiffuse  ? diff * u_lightColor * baseColor : vec3(0.0);
  vec3 specular = u_useSpecular ? spec * u_lightColor : vec3(0.0);
  outColor = vec4(ambient + diffuse + specular, 1.0);
}`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function createProgram() {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program));
  return program;
}

const program = createProgram();
const positionLocation = gl.getAttribLocation(program, "a_position");
const normalLocation = gl.getAttribLocation(program, "a_normal");
const uvLocation = gl.getAttribLocation(program, "a_uv");
const uniformNames = {
  model: "u_model",
  view: "u_view",
  projection: "u_projection",
  normalMatrix: "u_normalMatrix",
  lightPosition: "u_lightPosition",
  cameraPosition: "u_cameraPosition",
  lightColor: "u_lightColor",
  ambient: "u_ambientStrength",
  shininess: "u_shininess",
  texture: "u_texture",
  uvScale: "u_uvScale",
  useTexture: "u_useTexture",
  useAmbient: "u_useAmbient",
  useDiffuse: "u_useDiffuse",
  useSpecular: "u_useSpecular",
};
const locations = {};
for (const [key, name] of Object.entries(uniformNames))
  locations[key] = gl.getUniformLocation(program, name);

/* ------------------------------------------------------------------
   Vector / matrix helpers
------------------------------------------------------------------ */
function subtract(a, b) { return a.map((v, i) => v - b[i]); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function normalize(v) {
  const len = Math.hypot(...v) || 1;
  return v.map((x) => x / len);
}

function identity() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
function multiply(a, b) {
  const r = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let row = 0; row < 4; row++)
      r[c * 4 + row] =
        a[row] * b[c * 4] +
        a[4 + row] * b[c * 4 + 1] +
        a[8 + row] * b[c * 4 + 2] +
        a[12 + row] * b[c * 4 + 3];
  return r;
}
function translation(x, y, z) {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
}
function scale(x, y, z) {
  return new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
}
function rotationX(deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
}
function rotationY(deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
}
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan((fov * Math.PI) / 360), range = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * range, -1,
    0, 0, near * far * 2 * range, 0,
  ]);
}
function lookAt(eye, target, up) {
  const backward = normalize(subtract(eye, target));
  const right = normalize(cross(up, backward));
  const upC = cross(backward, right);
  return new Float32Array([
    right[0], upC[0], backward[0], 0,
    right[1], upC[1], backward[1], 0,
    right[2], upC[2], backward[2], 0,
    -dot(right, eye), -dot(upC, eye), -dot(backward, eye), 1,
  ]);
}

// Normal Matrix = inverse-transpose dari bagian linear 3x3 Model Matrix.
// Untuk kolom c0,c1,c2: hasil = [c1×c2, c2×c0, c0×c1] / det
function normalMatrixFromMat4(m) {
  const c0 = [m[0], m[1], m[2]];
  const c1 = [m[4], m[5], m[6]];
  const c2 = [m[8], m[9], m[10]];
  const n0 = cross(c1, c2);
  const n1 = cross(c2, c0);
  const n2 = cross(c0, c1);
  const det = dot(c0, n0);
  if (Math.abs(det) < 1e-6) return new Float32Array([1,0,0, 0,1,0, 0,0,1]);
  const inv = 1 / det;
  return new Float32Array([
    n0[0] * inv, n0[1] * inv, n0[2] * inv,
    n1[0] * inv, n1[1] * inv, n1[2] * inv,
    n2[0] * inv, n2[1] * inv, n2[2] * inv,
  ]);
}

/* ------------------------------------------------------------------
   Geometry (UV dinormalisasi 0..1; perbesar dengan UV Scale)
------------------------------------------------------------------ */
function cubeData() {
  const faces = [
    { corners: [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]], normal: [0,0,1] },
    { corners: [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]], normal: [0,0,-1] },
    { corners: [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]], normal: [0,1,0] },
    { corners: [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]], normal: [0,-1,0] },
    { corners: [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]], normal: [1,0,0] },
    { corners: [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]], normal: [-1,0,0] },
  ];
  const indices = [0, 1, 2, 0, 2, 3];
  const uv = [[0,0],[1,0],[1,1],[0,1]];
  const positions = [], normals = [], uvs = [];
  faces.forEach((face) =>
    indices.forEach((i) => {
      positions.push(...face.corners[i].map((v) => v * 0.75));
      normals.push(...face.normal);
      uvs.push(...uv[i]);
    }),
  );
  return { positions, normals, uvs };
}

// Parametric surfaces: sphere, torus, torus knot
function curvedData(shape) {
  const tau = Math.PI * 2;

  function knotCenter(t) {
    const radius = 0.68 + 0.24 * Math.cos(3 * t);
    return [radius * Math.cos(2 * t), radius * Math.sin(2 * t), 0.24 * Math.sin(3 * t)];
  }

  function surface(u, v) {
    const t = u * tau, angle = v * tau;
    if (shape === "sphere") {
      const lat = v * Math.PI;
      const normal = [Math.sin(lat) * Math.cos(t), Math.cos(lat), Math.sin(lat) * Math.sin(t)];
      return { position: normal.map((x) => x * 1.05), normal };
    }
    if (shape === "torus") {
      const normal = [Math.cos(t) * Math.cos(angle), Math.sin(t) * Math.cos(angle), Math.sin(angle)];
      return {
        position: [
          (0.78 + 0.3 * Math.cos(angle)) * Math.cos(t),
          (0.78 + 0.3 * Math.cos(angle)) * Math.sin(t),
          0.3 * Math.sin(angle),
        ],
        normal,
      };
    }
    const center = knotCenter(t);
    const tangent = normalize(subtract(knotCenter(t + 0.0001), knotCenter(t - 0.0001)));
    const side = normalize(cross(tangent, [0, 0, 1]));
    const up = normalize(cross(side, tangent));
    const normal = side.map((x, i) => x * Math.cos(angle) + up[i] * Math.sin(angle));
    return { position: center.map((x, i) => x + 0.15 * normal[i]), normal };
  }

  const positions = [], normals = [], smoothNormals = [], uvs = [];
  const columns = shape === "torusKnot" ? 160 : 64;
  const rows = 32;

  function vertex(u, v) {
    const sample = surface(u, v);
    if (shape === "torusKnot") {
      const du = subtract(surface(u + 0.00001, v).position, surface(u - 0.00001, v).position);
      const dv = subtract(surface(u, v + 0.00001).position, surface(u, v - 0.00001).position);
      let normal = normalize(cross(du, dv));
      if (dot(normal, sample.normal) < 0) normal = normal.map((x) => -x);
      sample.normal = normal;
    }
    return { ...sample, uv: [u, v] };
  }

  const grid = Array.from({ length: columns + 1 }, (_, x) =>
    Array.from({ length: rows + 1 }, (_, y) => vertex(x / columns, y / rows)),
  );

  function triangle(a, b, c) {
    let face = cross(subtract(b.position, a.position), subtract(c.position, a.position));
    if (Math.hypot(...face) < 1e-10) return;
    if (dot(face, a.normal) < 0) {
      [b, c] = [c, b];
      face = face.map((x) => -x);
    }
    face = normalize(face);
    for (const p of [a, b, c]) {
      positions.push(...p.position);
      normals.push(...face);
      smoothNormals.push(...p.normal);
      uvs.push(...p.uv);
    }
  }

  for (let x = 0; x < columns; x++) {
    for (let y = 0; y < rows; y++) {
      triangle(grid[x][y], grid[x + 1][y], grid[x + 1][y + 1]);
      triangle(grid[x][y], grid[x + 1][y + 1], grid[x][y + 1]);
    }
  }
  return { positions, normals, smoothNormals, uvs };
}

function createBuffer(data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buffer;
}

function bindAttribute(location, buffer, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

const meshes = new Map();
function getMesh(shape) {
  if (meshes.has(shape)) return meshes.get(shape);
  const g = shape === "cube" ? cubeData() : curvedData(shape);
  // Smooth normal cube/fallback: arah dari pusat ke vertex
  const smooth =
    g.smoothNormals ||
    g.positions.reduce((out, _, i) => {
      if (i % 3 === 0) out.push(...normalize(g.positions.slice(i, i + 3)));
      return out;
    }, []);
  const mesh = {
    position: createBuffer(g.positions),
    flat: createBuffer(g.normals),
    smooth: createBuffer(smooth),
    uv: createBuffer(g.uvs),
    count: g.positions.length / 3,
  };
  meshes.set(shape, mesh);
  return mesh;
}

/* ------------------------------------------------------------------
   State
------------------------------------------------------------------ */
const DEFAULTS = {
  ambient: 0.18,
  shininess: 32,
  uvScale: 1,
  light: [2, 2, 3],
};

const state = {
  camera: { position: [0, 1.3, 5], target: [0, 0, 0], up: [0, 1, 0] },
  light: [...DEFAULTS.light],
  ambient: DEFAULTS.ambient,
  shininess: DEFAULTS.shininess,
  uvScale: DEFAULTS.uvScale,
  shape: "cube",
  flat: true,
  texture: true,
  textureSource: "checker",
  filter: "linear",
  wrap: "repeat",
  lightOrbit: false,
  cameraOrbit: false,
  depth: true,
  keys: {},
  scale: [1, 1, 1],
  components: { ambient: true, diffuse: true, specular: true },
  time: 0,
  cubeRotation: true,
  cubeTime: 0,
};

const FILTERS = ["linear", "nearest", "mipmap", "nearestMipmap"];
const FILTER_LABEL = {
  linear: "LINEAR",
  nearest: "NEAREST",
  mipmap: "LINEAR_MIPMAP_LINEAR",
  nearestMipmap: "NEAREST_MIPMAP_NEAREST",
};
const WRAPS = ["repeat", "clamp", "mirror"];
const WRAP_LABEL = {
  repeat: "REPEAT",
  clamp: "CLAMP_TO_EDGE",
  mirror: "MIRRORED_REPEAT",
};

/* ------------------------------------------------------------------
   Textures
------------------------------------------------------------------ */
function createCheckerTexture() {
  const size = 128;
  const checker = document.createElement("canvas");
  checker.width = size;
  checker.height = size;
  const ctx = checker.getContext("2d");
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#245a9f" : "#4df3ff";
      ctx.fillRect(x * 16, y * 16, 16, 16);
    }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, checker);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

const checkerTexture = createCheckerTexture();

// Placeholder 1x1 sampai image selesai dimuat
const imageTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, imageTexture);
gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
  new Uint8Array([40, 90, 150, 255]),
);
gl.generateMipmap(gl.TEXTURE_2D);

const image = new Image();
image.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, imageTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D);
  updateTextureState();
};
image.src = "./texture.svg";

function applyTextureParams(tex) {
  gl.bindTexture(gl.TEXTURE_2D, tex);

  const minMap = {
    linear: gl.LINEAR,
    nearest: gl.NEAREST,
    mipmap: gl.LINEAR_MIPMAP_LINEAR,
    nearestMipmap: gl.NEAREST_MIPMAP_NEAREST,
  };
  const magNearest = state.filter === "nearest" || state.filter === "nearestMipmap";
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minMap[state.filter]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magNearest ? gl.NEAREST : gl.LINEAR);

  const wrapMap = {
    repeat: gl.REPEAT,
    clamp: gl.CLAMP_TO_EDGE,
    mirror: gl.MIRRORED_REPEAT,
  };
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMap[state.wrap]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMap[state.wrap]);
}

function updateTextureState() {
  applyTextureParams(checkerTexture);
  applyTextureParams(imageTexture);
}

/* ------------------------------------------------------------------
   Draw
------------------------------------------------------------------ */
function modelMatrix() {
  return multiply(
    translation(0, 0, 0),
    multiply(
      rotationY(state.cubeTime * 35),
      multiply(rotationX(state.cubeTime * 22), scale(...state.scale)),
    ),
  );
}

function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.015, 0.045, 0.09, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);

  if (state.depth) gl.enable(gl.DEPTH_TEST);
  else gl.disable(gl.DEPTH_TEST);

  const mesh = getMesh(state.shape);
  bindAttribute(positionLocation, mesh.position, 3);
  bindAttribute(normalLocation, state.flat ? mesh.flat : mesh.smooth, 3);
  bindAttribute(uvLocation, mesh.uv, 2);

  const model = modelMatrix();
  const view = lookAt(state.camera.position, state.camera.target, state.camera.up);
  const projection = perspective(60, canvas.width / canvas.height, 0.1, 30);

  gl.uniformMatrix4fv(locations.model, false, model);
  gl.uniformMatrix4fv(locations.view, false, view);
  gl.uniformMatrix4fv(locations.projection, false, projection);
  gl.uniformMatrix3fv(locations.normalMatrix, false, normalMatrixFromMat4(model));

  gl.uniform3fv(locations.lightPosition, state.light);
  gl.uniform3fv(locations.cameraPosition, state.camera.position);
  gl.uniform3f(locations.lightColor, 1, 1, 1);
  gl.uniform1f(locations.ambient, state.ambient);
  gl.uniform1f(locations.shininess, state.shininess);
  gl.uniform1f(locations.uvScale, state.uvScale);
  gl.uniform1i(locations.useTexture, state.texture);
  gl.uniform1i(locations.useAmbient, state.components.ambient);
  gl.uniform1i(locations.useDiffuse, state.components.diffuse);
  gl.uniform1i(locations.useSpecular, state.components.specular);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(
    gl.TEXTURE_2D,
    state.textureSource === "image" ? imageTexture : checkerTexture,
  );
  gl.uniform1i(locations.texture, 0);

  gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  syncControls();
}

/* ------------------------------------------------------------------
   Update (state-based input)
------------------------------------------------------------------ */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function updateInput(dt) {
  const k = state.keys;
  const speed = 1.8 * dt;

  // Light
  if (k.ArrowLeft) state.light[0] -= speed;
  if (k.ArrowRight) state.light[0] += speed;
  if (k.ArrowUp) state.light[1] += speed;
  if (k.ArrowDown) state.light[1] -= speed;
  if (k.w) state.light[2] -= speed;
  if (k.s) state.light[2] += speed;

  // Camera
  if (k.q) state.camera.position[0] -= speed;
  if (k.e) state.camera.position[0] += speed;

  // Ambient, shininess, UV scale
  if (k.a) state.ambient += 0.3 * dt;
  if (k.z) state.ambient -= 0.3 * dt;
  state.ambient = clamp(state.ambient, 0, 1);

  if (k["-"] || k._) state.shininess -= 50 * dt;
  if (k["+"] || k["="]) state.shininess += 50 * dt;
  state.shininess = clamp(state.shininess, 2, 128);

  if (k["["]) state.uvScale -= 1.5 * dt;
  if (k["]"]) state.uvScale += 1.5 * dt;
  state.uvScale = clamp(state.uvScale, 0.25, 5);

  // Orbits
  if (state.lightOrbit) {
    state.light[0] = Math.sin(state.time) * 3;
    state.light[2] = Math.cos(state.time) * 3;
  }
  if (state.cameraOrbit) {
    state.camera.position[0] = Math.sin(state.time * 0.45) * 5;
    state.camera.position[2] = Math.cos(state.time * 0.45) * 5;
  }

  state.light[0] = clamp(state.light[0], -4, 4);
  state.light[1] = clamp(state.light[1], -4, 5);
  state.light[2] = clamp(state.light[2], -5, 5);
}

/* ------------------------------------------------------------------
   HUD + sinkronisasi UI <-> state
------------------------------------------------------------------ */
function setValue(id, value) {
  const el = $(id);
  if (el && String(el.value) !== String(value)) el.value = value;
}
function setChecked(id, value) {
  const el = $(id);
  if (el && el.checked !== value) el.checked = value;
}
function setText(id, text) {
  const el = $(id);
  if (el && el.textContent !== text) el.textContent = text;
}

function isNonUniform() {
  const [x, y, z] = state.scale;
  return !(x === y && y === z);
}

function syncControls() {
  // Slider / select / checkbox mengikuti state (keyboard, orbit, reset)
  setValue("shapeSelect", state.shape);
  setValue("ambientControl", state.ambient.toFixed(2));
  setValue("shininessControl", Math.round(state.shininess));
  setValue("uvScaleControl", state.uvScale.toFixed(2));
  setValue("lightXControl", state.light[0].toFixed(1));
  setValue("lightYControl", state.light[1].toFixed(1));
  setValue("lightZControl", state.light[2].toFixed(1));
  setValue("scaleXControl", state.scale[0]);
  setValue("scaleYControl", state.scale[1]);
  setValue("scaleZControl", state.scale[2]);
  setValue("textureSource", state.textureSource);
  setValue("filterSelect", state.filter);
  setValue("wrapSelect", state.wrap);
  setChecked("ambientToggle", state.components.ambient);
  setChecked("diffuseToggle", state.components.diffuse);
  setChecked("specularToggle", state.components.specular);

  setText("ambientValue", state.ambient.toFixed(2));
  setText("shininessValue", String(Math.round(state.shininess)));
  setText("uvValue", state.uvScale.toFixed(2));

  // HUD
  setText("shadingInfo", state.flat ? "FLAT" : "SMOOTH");
  setText("lightInfo", `(${state.light.map((v) => v.toFixed(2)).join(", ")})`);
  setText("textureInfo", state.texture ? state.textureSource.toUpperCase() : "OFF");
  setText("filterInfo", FILTER_LABEL[state.filter]);
  setText("wrapInfo", WRAP_LABEL[state.wrap]);
  setText("cameraInfo", state.cameraOrbit ? "ORBIT ON" : "ORBIT OFF");
  setText("uvInfo", state.uvScale.toFixed(2));
  setText("shininessInfo", state.shininess.toFixed(1));
  setText("ambientInfo", state.ambient.toFixed(2));
  setText(
    "componentInfo",
    [
      state.components.ambient ? "A" : "-",
      state.components.diffuse ? "D" : "-",
      state.components.specular ? "S" : "-",
    ].join(" "),
  );
  setText("scaleInfo", isNonUniform() ? "NON-UNIFORM" : "UNIFORM");
  setText("depthInfo", state.depth ? "ON" : "OFF");
  setText(
    "cubeRotationButton",
    state.cubeRotation ? "Stop Object Rotation (P)" : "Resume Object Rotation (P)",
  );

  const anyLight = Object.values(state.components).some(Boolean);
  setText("statusBadge", `RUNNING · LIGHTING ${anyLight ? "ON" : "OFF"}`);
}

/* ------------------------------------------------------------------
   Actions (dipakai keyboard dan tombol)
------------------------------------------------------------------ */
function cycle(list, current) {
  return list[(list.indexOf(current) + 1) % list.length];
}

const actions = {
  flat() { state.flat = !state.flat; },
  texture() { state.texture = !state.texture; },
  lightOrbit() { state.lightOrbit = !state.lightOrbit; },
  cameraOrbit() { state.cameraOrbit = !state.cameraOrbit; },
  rotation() { state.cubeRotation = !state.cubeRotation; },
  depth() { state.depth = !state.depth; },
  filter() { state.filter = cycle(FILTERS, state.filter); updateTextureState(); },
  wrap() { state.wrap = cycle(WRAPS, state.wrap); updateTextureState(); },
  nonUniform() { state.scale = isNonUniform() ? [1, 1, 1] : [1.8, 0.6, 1.0]; },
  toggleAmbient() { state.components.ambient = !state.components.ambient; },
  toggleDiffuse() { state.components.diffuse = !state.components.diffuse; },
  toggleSpecular() { state.components.specular = !state.components.specular; },
  reset() {
    Object.assign(state, {
      ambient: DEFAULTS.ambient,
      shininess: DEFAULTS.shininess,
      uvScale: DEFAULTS.uvScale,
      light: [...DEFAULTS.light],
      shape: "cube",
      flat: true,
      texture: true,
      textureSource: "checker",
      filter: "linear",
      wrap: "repeat",
      lightOrbit: false,
      cameraOrbit: false,
      depth: true,
      scale: [1, 1, 1],
      components: { ambient: true, diffuse: true, specular: true },
      time: 0,
      cubeRotation: true,
      cubeTime: 0,
    });
    state.camera.position = [0, 1.3, 5];
    state.camera.target = [0, 0, 0];
    updateTextureState();
  },
};

const keyActions = {
  f: "flat",
  t: "texture",
  l: "lightOrbit",
  p: "rotation",
  d: "depth",
  h: "filter",
  g: "wrap",
  n: "nonUniform",
  r: "reset",
  1: "toggleAmbient",
  2: "toggleDiffuse",
  3: "toggleSpecular",
};

function bindControls() {
  const onClick = (id, action) => ($(id).onclick = actions[action]);
  onClick("flatButton", "flat");
  onClick("textureButton", "texture");
  onClick("lightOrbitButton", "lightOrbit");
  onClick("cameraOrbitButton", "cameraOrbit");
  onClick("cubeRotationButton", "rotation");
  onClick("nonUniformButton", "nonUniform");
  onClick("filterButton", "filter");
  onClick("wrapButton", "wrap");
  onClick("depthButton", "depth");
  onClick("resetButton", "reset");

  $("shapeSelect").onchange = (e) => {
    state.shape = e.target.value;
    // Curved surface mulai dari smooth; F tetap bisa membandingkan face normal.
    state.flat = state.shape === "cube";
  };
  $("ambientControl").oninput = (e) => (state.ambient = Number(e.target.value));
  $("shininessControl").oninput = (e) => (state.shininess = Number(e.target.value));
  $("uvScaleControl").oninput = (e) => (state.uvScale = Number(e.target.value));

  ["X", "Y", "Z"].forEach((axis, i) => {
    $(`light${axis}Control`).oninput = (e) => (state.light[i] = Number(e.target.value));
    $(`scale${axis}Control`).oninput = (e) => (state.scale[i] = Number(e.target.value));
  });

  $("textureSource").onchange = (e) => (state.textureSource = e.target.value);
  $("filterSelect").onchange = (e) => {
    state.filter = e.target.value;
    updateTextureState();
  };
  $("wrapSelect").onchange = (e) => {
    state.wrap = e.target.value;
    updateTextureState();
  };

  ["ambient", "diffuse", "specular"].forEach((name) => {
    $(`${name}Toggle`).onchange = (e) => (state.components[name] = e.target.checked);
  });
}

function normalizeKey(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

window.addEventListener("keydown", (event) => {
  const key = normalizeKey(event);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
    event.preventDefault();
  state.keys[key] = true;
  if (event.repeat) return;
  const action = keyActions[key];
  if (action) actions[action]();
});

window.addEventListener("keyup", (event) => {
  state.keys[normalizeKey(event)] = false;
});

/* ------------------------------------------------------------------
   Loop
------------------------------------------------------------------ */
let lastTime = 0;
function render(time) {
  const dt = Math.min((time - lastTime) * 0.001, 0.05);
  lastTime = time;
  state.time += dt;
  if (state.cubeRotation) state.cubeTime += dt;
  updateInput(dt);
  draw();
  requestAnimationFrame(render);
}

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LESS);
bindControls();
updateTextureState();
draw();
requestAnimationFrame(render);