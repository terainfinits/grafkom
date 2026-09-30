import { Mat4, degToRad, normalMatrixFromMat4 } from "./math3d.js";

// ---------------------------------------------------------------
// 1. WebGL2 context
// ---------------------------------------------------------------
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  throw new Error("WebGL2 tidak tersedia.");
}

gl.enable(gl.DEPTH_TEST);

// ---------------------------------------------------------------
// 2. Geometry: position, normal, UV
// ---------------------------------------------------------------
const positions = new Float32Array([
  // Front
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
  -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  // Back
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5,
  0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  // Left
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
  // Right
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
  0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  // Top
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  // Bottom
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,
  -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
]);

function createFlatNormals() {
  const faceNormals = [
    [0, 0, 1],   // Front
    [0, 0, -1],  // Back
    [-1, 0, 0],  // Left
    [1, 0, 0],   // Right
    [0, 1, 0],   // Top
    [0, -1, 0],  // Bottom
  ];
  const data = [];
  for (const n of faceNormals) {
    for (let i = 0; i < 6; i++) data.push(...n);
  }
  return new Float32Array(data);
}

function createSmoothNormals(pos) {
  const normals = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1];
    const z = pos[i + 2];
    const length = Math.hypot(x, y, z);
    normals[i] = x / length;
    normals[i + 1] = y / length;
    normals[i + 2] = z / length;
  }
  return normals;
}

function createCubeUVs() {
  const faceUV = [
    0, 0, 1, 0, 1, 1,
    0, 0, 1, 1, 0, 1,
  ];
  const uv = [];
  for (let face = 0; face < 6; face++) uv.push(...faceUV);
  return new Float32Array(uv);
}

const flatNormals = createFlatNormals();
const smoothNormals = createSmoothNormals(positions);
const texCoords = createCubeUVs();

// ---------------------------------------------------------------
// 3. Shaders
// ---------------------------------------------------------------
const vertexShaderSource = `#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;
uniform float u_uvScale;

out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_texCoord;

void main() {
  vec4 worldPosition = u_model * vec4(a_position, 1.0);

  v_worldPosition = worldPosition.xyz;
  v_normal = u_normalMatrix * a_normal;
  v_texCoord = a_texCoord * u_uvScale;

  gl_Position = u_projection * u_view * worldPosition;
}
`;

const fragmentShaderSource = `#version 300 es

precision highp float;

in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_texCoord;

uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform vec3 u_cameraPosition;

uniform float u_ambientStrength;
uniform float u_shininess;

// Challenge F: toggle komponen (1.0 = ON, 0.0 = OFF)
uniform float u_useAmbient;
uniform float u_useDiffuse;
uniform float u_useSpecular;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  vec3 N = normalize(v_normal);
  vec3 L = normalize(u_lightPosition - v_worldPosition);
  vec3 V = normalize(u_cameraPosition - v_worldPosition);

  float diff = max(dot(N, L), 0.0);

  vec3 R = reflect(-L, N);

  float spec = 0.0;
  if (diff > 0.0) {
    spec = pow(max(dot(R, V), 0.0), u_shininess);
  }

  vec3 texColor = texture(u_texture, v_texCoord).rgb;

  vec3 ambient  = u_useAmbient  * u_ambientStrength * texColor;
  vec3 diffuse  = u_useDiffuse  * diff * u_lightColor * texColor;
  vec3 specular = u_useSpecular * spec * u_lightColor;

  vec3 finalColor = ambient + diffuse + specular;

  outColor = vec4(finalColor, 1.0);
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile error:\n" + info);
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Program link error:\n" + info);
  }
  return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

gl.useProgram(program);

// ---------------------------------------------------------------
// 4. Attribute & uniform locations
// ---------------------------------------------------------------
const positionLocation = gl.getAttribLocation(program, "a_position");
const normalLocation = gl.getAttribLocation(program, "a_normal");
const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

const u = (name) => gl.getUniformLocation(program, name);

const modelLocation = u("u_model");
const viewLocation = u("u_view");
const projectionLocation = u("u_projection");
const normalMatrixLocation = u("u_normalMatrix");
const lightPositionLocation = u("u_lightPosition");
const lightColorLocation = u("u_lightColor");
const cameraPositionLocation = u("u_cameraPosition");
const ambientLocation = u("u_ambientStrength");
const shininessLocation = u("u_shininess");
const textureLocation = u("u_texture");
const uvScaleLocation = u("u_uvScale");
const useAmbientLocation = u("u_useAmbient");
const useDiffuseLocation = u("u_useDiffuse");
const useSpecularLocation = u("u_useSpecular");

// ---------------------------------------------------------------
// 5. Buffers
// ---------------------------------------------------------------
function createArrayBuffer(data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function setupAttribute(buffer, location, size) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

const positionBuffer = createArrayBuffer(positions);
const flatNormalBuffer = createArrayBuffer(flatNormals);
const smoothNormalBuffer = createArrayBuffer(smoothNormals);
const texCoordBuffer = createArrayBuffer(texCoords);

setupAttribute(positionBuffer, positionLocation, 3);
setupAttribute(texCoordBuffer, texCoordLocation, 2);

// ---------------------------------------------------------------
// 6. Texture (checkerboard programatik)
// ---------------------------------------------------------------
function createCheckerTexture() {
  const size = 64;
  const source = document.createElement("canvas");
  source.width = size;
  source.height = size;

  const ctx = source.getContext("2d");
  const cells = 8;
  const cellSize = size / cells;

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? "#f8fafc" : "#0ea5e9";
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.generateMipmap(gl.TEXTURE_2D);
  return tex;
}

const texture = createCheckerTexture();

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.uniform1i(textureLocation, 0);

// ---------------------------------------------------------------
// 7. State: filtering & wrapping
// ---------------------------------------------------------------
let filterMode = "LINEAR";

function applyFiltering() {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const f = filterMode === "NEAREST" ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
}

const wrapModes = ["REPEAT", "CLAMP_TO_EDGE", "MIRRORED_REPEAT"];
let wrapIndex = 0;

function applyWrapping() {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const modeName = wrapModes[wrapIndex];

  let mode = gl.REPEAT;
  if (modeName === "CLAMP_TO_EDGE") mode = gl.CLAMP_TO_EDGE;
  if (modeName === "MIRRORED_REPEAT") mode = gl.MIRRORED_REPEAT;

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mode);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mode);
}

// ---------------------------------------------------------------
// 8. State scene
// ---------------------------------------------------------------
const cube = {
  rotationX: 20,
  rotationY: 30,
  scaleX: 1.0,
  scaleY: 1.0,
  scaleZ: 1.0,
};

const camera = {
  position: [0.0, 1.4, 4.0],
  target: [0.0, 0.0, 0.0],
  up: [0.0, 1.0, 0.0],
};

const light = {
  position: [2.0, 2.0, 2.0],
  color: [1.0, 1.0, 1.0],
};

const DEFAULT_AMBIENT = 0.18;
const DEFAULT_SHININESS = 32.0;

let ambientStrength = DEFAULT_AMBIENT;
let shininess = DEFAULT_SHININESS;
let uvScale = 1.0;
let shadingMode = "FLAT";

// Challenge F: komponen lighting
const components = { ambient: true, diffuse: true, specular: true };

// Challenge E: light orbit
let lightOrbit = false;
let orbitAngle = 0;
const orbitRadius = 3.0;

// Challenge D: non-uniform scale
let nonUniform = false;

// ---------------------------------------------------------------
// 9. Matrix
// ---------------------------------------------------------------
function createModelMatrix() {
  const rx = Mat4.rotationX(degToRad(cube.rotationX));
  const ry = Mat4.rotationY(degToRad(cube.rotationY));
  const s = Mat4.scaling(cube.scaleX, cube.scaleY, cube.scaleZ);

  let model = Mat4.identity();
  model = Mat4.multiply(model, s);
  model = Mat4.multiply(model, rx);
  model = Mat4.multiply(model, ry);
  return model;
}

// ---------------------------------------------------------------
// 10. Input
// ---------------------------------------------------------------
const keys = {};

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }

  if (event.repeat) return;

  switch (key) {
    case "f":
      shadingMode = shadingMode === "FLAT" ? "SMOOTH" : "FLAT";
      break;
    case "t":
      filterMode = filterMode === "LINEAR" ? "NEAREST" : "LINEAR";
      applyFiltering();
      break;
    case "g":
      wrapIndex = (wrapIndex + 1) % wrapModes.length;
      applyWrapping();
      break;
    case "1":
      components.ambient = !components.ambient;
      break;
    case "2":
      components.diffuse = !components.diffuse;
      break;
    case "3":
      components.specular = !components.specular;
      break;
    case "n":
      nonUniform = !nonUniform;
      setScaleMode();
      break;
    case "o":
      lightOrbit = !lightOrbit;
      break;
    case "r":
      resetScene();
      break;
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

function setScaleMode() {
  if (nonUniform) {
    cube.scaleX = 1.8;
    cube.scaleY = 0.6;
    cube.scaleZ = 1.0;
  } else {
    cube.scaleX = 1.0;
    cube.scaleY = 1.0;
    cube.scaleZ = 1.0;
  }
}

function resetScene() {
  light.position[0] = 2.0;
  light.position[1] = 2.0;
  light.position[2] = 2.0;

  shininess = DEFAULT_SHININESS;
  ambientStrength = DEFAULT_AMBIENT;
  uvScale = 1.0;
  shadingMode = "FLAT";
  filterMode = "LINEAR";
  wrapIndex = 0;

  components.ambient = true;
  components.diffuse = true;
  components.specular = true;

  lightOrbit = false;
  nonUniform = false;
  setScaleMode();

  applyFiltering();
  applyWrapping();
}

// ---------------------------------------------------------------
// 11. Update
// ---------------------------------------------------------------
const lightSpeed = 2.0;
const uvScaleSpeed = 1.5;
const shininessSpeed = 50.0;
const ambientSpeed = 0.3;

function updateCube(dt) {
  cube.rotationX += 20.0 * dt;
  cube.rotationY += 35.0 * dt;
}

function updateLight(dt) {
  if (lightOrbit) {
    orbitAngle += 1.0 * dt;
    light.position[0] = Math.cos(orbitAngle) * orbitRadius;
    light.position[2] = Math.sin(orbitAngle) * orbitRadius;
    return;
  }

  if (keys["arrowleft"]) light.position[0] -= lightSpeed * dt;
  if (keys["arrowright"]) light.position[0] += lightSpeed * dt;
  if (keys["arrowup"]) light.position[1] += lightSpeed * dt;
  if (keys["arrowdown"]) light.position[1] -= lightSpeed * dt;
  if (keys["w"]) light.position[2] -= lightSpeed * dt;
  if (keys["s"]) light.position[2] += lightSpeed * dt;
}

function updateUVScale(dt) {
  if (keys["["]) uvScale -= uvScaleSpeed * dt;
  if (keys["]"]) uvScale += uvScaleSpeed * dt;
  uvScale = Math.max(0.25, Math.min(5.0, uvScale));
}

function updateShininess(dt) {
  if (keys["-"] || keys["_"]) shininess -= shininessSpeed * dt;
  if (keys["+"] || keys["="]) shininess += shininessSpeed * dt;
  shininess = Math.max(2.0, Math.min(128.0, shininess));
}

function updateAmbient(dt) {
  if (keys["a"]) ambientStrength += ambientSpeed * dt;
  if (keys["z"]) ambientStrength -= ambientSpeed * dt;
  ambientStrength = Math.max(0.0, Math.min(1.0, ambientStrength));
}

// ---------------------------------------------------------------
// 12. Draw
// ---------------------------------------------------------------
function drawScene() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.025, 0.04, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);

  setupAttribute(positionBuffer, positionLocation, 3);
  setupAttribute(texCoordBuffer, texCoordLocation, 2);

  const activeNormalBuffer =
    shadingMode === "FLAT" ? flatNormalBuffer : smoothNormalBuffer;
  setupAttribute(activeNormalBuffer, normalLocation, 3);

  const model = createModelMatrix();
  const view = Mat4.lookAt(camera.position, camera.target, camera.up);
  const projection = Mat4.perspective(
    degToRad(60),
    canvas.width / canvas.height,
    0.1,
    100.0
  );
  const normalMatrix = normalMatrixFromMat4(model);

  gl.uniformMatrix4fv(modelLocation, false, model);
  gl.uniformMatrix4fv(viewLocation, false, view);
  gl.uniformMatrix4fv(projectionLocation, false, projection);
  gl.uniformMatrix3fv(normalMatrixLocation, false, normalMatrix);

  gl.uniform3fv(lightPositionLocation, light.position);
  gl.uniform3fv(lightColorLocation, light.color);
  gl.uniform3fv(cameraPositionLocation, camera.position);

  gl.uniform1f(ambientLocation, ambientStrength);
  gl.uniform1f(shininessLocation, shininess);
  gl.uniform1f(uvScaleLocation, uvScale);

  gl.uniform1f(useAmbientLocation, components.ambient ? 1.0 : 0.0);
  gl.uniform1f(useDiffuseLocation, components.diffuse ? 1.0 : 0.0);
  gl.uniform1f(useSpecularLocation, components.specular ? 1.0 : 0.0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(textureLocation, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// ---------------------------------------------------------------
// 13. HUD
// ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const shadingInfo = $("shadingInfo");
const filterInfo = $("filterInfo");
const wrapInfo = $("wrapInfo");
const uvInfo = $("uvInfo");
const shininessInfo = $("shininessInfo");
const ambientInfo = $("ambientInfo");
const componentInfo = $("componentInfo");
const scaleInfo = $("scaleInfo");
const lightInfo = $("lightInfo");

function updateHUD() {
  shadingInfo.textContent = shadingMode;
  filterInfo.textContent = filterMode;
  wrapInfo.textContent = wrapModes[wrapIndex];
  uvInfo.textContent = uvScale.toFixed(2);
  shininessInfo.textContent = shininess.toFixed(1);
  ambientInfo.textContent = ambientStrength.toFixed(2);

  componentInfo.textContent =
    `A:${components.ambient ? "ON" : "OFF"} ` +
    `D:${components.diffuse ? "ON" : "OFF"} ` +
    `S:${components.specular ? "ON" : "OFF"}`;

  scaleInfo.textContent = nonUniform ? "Non-Uniform" : "Uniform";

  lightInfo.textContent =
    `(${light.position[0].toFixed(2)}, ` +
    `${light.position[1].toFixed(2)}, ` +
    `${light.position[2].toFixed(2)})` +
    (lightOrbit ? " [ORBIT]" : "");
}

// ---------------------------------------------------------------
// 14. Render loop
// ---------------------------------------------------------------
let lastTime = 0;

function render(time) {
  let dt = (time - lastTime) * 0.001;
  lastTime = time;
  dt = Math.min(dt, 0.05);

  updateCube(dt);
  updateLight(dt);
  updateUVScale(dt);
  updateShininess(dt);
  updateAmbient(dt);

  drawScene();
  updateHUD();

  requestAnimationFrame(render);
}

applyFiltering();
applyWrapping();

requestAnimationFrame(render);