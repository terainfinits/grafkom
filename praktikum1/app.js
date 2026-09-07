/*
Praktikum Grafika Komputer - Pertemuan 1
Graphics Playground

Nama 1 : Willy Dava Nugraha
NRP 1 : 5025241090
Nama 2 : Nyoman Surya Hutama Andyartha
NRP 2 : 5025241093
Kelas: B

Challenge:
- Challenge B: Follow Mouse
- Challenge Tambahan 34.1: Click to Create Circle
- Challenge Tambahan 34.2: Trail Mode
- Challenge Tambahan 34.3: Multiple Moving Objects

Catatan:
Challenge A, C, D, dan E sebenarnya sudah otomatis diterapkan 
    ketika mengikuti alur panduan praktikum di materi
*/

const canvas = document.getElementById("graphicsCanvas");
const ctx = canvas.getContext("2d");

// --------------------------------------------------
// DATA
// --------------------------------------------------

const rectangle = {
    x: 80,
    y: 80,
    width: 160,
    height: 100,
    color: "#3498db"
};

const movingBall = {
    x: 350,
    y: 300,
    radius: 25,
    speedX: 2,
    speedY: 2,
    color: "#9b59b6"
};

// Challenge Tambahan 34.3: Multiple Moving Objects
// Menambahkan data objek yang bergerak
const movingObjects = [
    {
        x: 350,
        y: 150,
        radius: 20,
        speedX: 2,
        speedY: 1.5,
        color: "#9b59b6"
    },
    {
        x: 500,
        y: 250,
        radius: 30,
        speedX: -1.5,
        speedY: 2,
        color: "#e67e22"
    },
    {
        x: 650,
        y: 150,
        radius: 15,
        speedX: 1,
        speedY: -2,
        color: "#2ecc71"
    }
];

const player = {
    x: 600,
    y: 350,
    width: 50,
    height: 50,
    speed: 5,
    color: "#e67e22"
};

const mouse = {
    x: 0,
    y: 0
};

// Challenge B: Follow Mouse
// Menambahkan data lingkaran di sekitar mouse
const mouseCircle = {
    x: 0,
    y: 0,
    radius: 15,
    color: "#e74c3c"
}

// Challenge Tambahan 34.1: Click to Create Circle
// Menambahkan array circles
const circles = [];

// Challenge Tambahan 34.2: Trail Mode
// Menambahkan variabel trailMode
let trailMode = false;

const keys = {};

const colors = [
    "#9b59b6",
    "#e74c3c",
    "#2ecc71",
    "#f1c40f",
    "#3498db"
];

let colorIndex = 0;

// Fitur Tambahan: Pause
// Menyimpan status jeda animasi
let isPaused = false;

// Fitur Tambahan: Movement Mode Toggle
// Mode gerak player: "state" (mulus, selama tombol ditahan)
// atau "event" (kaku, sekali loncat tiap tombol ditekan)
let movementMode = "state";

// Fitur Tambahan: Style Mode
// Toggle tampilan objek: "primitive" (bentuk dasar apa adanya)
// atau "game" (versi bergaya game, murni visual, tanpa logika tambahan)
let visualMode = "primitive";

// Fitur Tambahan: Reset
// Menyimpan kondisi awal semua objek supaya bisa dikembalikan lagi
const initialState = {
    player: { ...player },
    movingBall: { ...movingBall },
    movingObjects: movingObjects.map((object) => ({ ...object })),
    mouse: { ...mouse },
    mouseCircle: { ...mouseCircle },
    colorIndex: colorIndex
};

// Live state panel (sidebar)
const statMouse = document.getElementById("stat-mouse");
const statKeys = document.getElementById("stat-keys");
const statPlayer = document.getElementById("stat-player");
const statEvents = document.getElementById("stat-events");
let eventCount = 0;

function updateStatePanel() {
    statMouse.textContent =
        `(${Math.round(mouse.x)}, ${Math.round(mouse.y)})`;

    const pressedKeys = Object.keys(keys).filter((k) => keys[k]);
    statKeys.textContent = pressedKeys.length ? pressedKeys.join(", ") : "—";

    statPlayer.textContent =
        `(${Math.round(player.x)}, ${Math.round(player.y)})`;

    statEvents.textContent = eventCount;
}

// Legend hover -> spotlight objek terkait di canvas
let spotlightKey = null;

function beginSpotlight(key) {
    if (!spotlightKey) return;
    ctx.globalAlpha = spotlightKey === key ? 1 : 0.15;
}

function endSpotlight() {
    ctx.globalAlpha = 1;
}

// --------------------------------------------------
// CANVAS
// --------------------------------------------------

function clearCanvas() {
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Fitur Tambahan: Style Mode
    // Kalau lagi di mode game, gambar dulu suasana latar (langit + tanah)
    // sebelum objek-objek lain digambar di atasnya. Ini murni visual,
    // tidak menyentuh data/posisi objek manapun.
    if (visualMode === "game") {
        drawGameBackground();
    }
}

// Fitur Tambahan: Style Mode
// Latar bergaya game: langit gradasi, matahari, awan, bukit jauh, dan rumput.
function drawGameBackground() {
    const w = canvas.width;
    const h = canvas.height;
    const groundY = h - 60;

    // Langit gradasi
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, "#4aa3d9");
    sky.addColorStop(1, "#bfe8f5");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    // Matahari
    ctx.beginPath();
    ctx.arc(60, 55, 32, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe066";
    ctx.fill();
    ctx.strokeStyle = "#f5c518";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Awan
    function drawCloud(cx, cy, scale) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(cx, cy, 16 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 18 * scale, cy - 8 * scale, 20 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 38 * scale, cy, 16 * scale, 0, Math.PI * 2);
        ctx.arc(cx + 18 * scale, cy + 6 * scale, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCloud(430, 60, 1);
    drawCloud(230, 40, 0.7);
    drawCloud(600, 200, 0.8);

    // Bukit jauh
    ctx.fillStyle = "#8fd19e";
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.quadraticCurveTo(120, groundY - 70, 260, groundY);
    ctx.quadraticCurveTo(400, groundY - 90, 560, groundY);
    ctx.quadraticCurveTo(700, groundY - 60, w, groundY);
    ctx.lineTo(w, groundY);
    ctx.lineTo(0, groundY);
    ctx.closePath();
    ctx.fill();

    // Tanah / rumput
    ctx.fillStyle = "#5cb85c";
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = "#4a934a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Rumput kecil-kecil biar hidup
    ctx.strokeStyle = "#3f7d3f";
    ctx.lineWidth = 2;
    for (let gx = 5; gx < w; gx += 14) {
        const gy = groundY + 4 + ((gx * 7) % 6);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx - 3, gy - 8);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + 3, gy - 8);
        ctx.stroke();
    }
}

// Challenge Tambahan 34.2: Trail Mode
// Membuat fungsi menggambar jejak
function drawTrail() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

// --------------------------------------------------
// STYLE MODE: GAME-LOOK HELPERS
// --------------------------------------------------
// Fitur Tambahan: Style Mode
// Fungsi-fungsi di bawah cuma versi "kulit" visual dari objek yang sama.
// Tidak ada logika baru (posisi, gerak, tabrakan tetap sama persis),
// cuma cara gambarnya diganti supaya terkesan seperti aset game.

// Rectangle -> Rumah
function drawHouseSkin(x, y, w, h) {
    // Dinding
    ctx.fillStyle = "#e8c088";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Atap (segitiga di atas dinding)
    const roofOverhang = 14;
    const roofHeight = h * 0.55;

    ctx.beginPath();
    ctx.moveTo(x - roofOverhang, y);
    ctx.lineTo(x + w / 2, y - roofHeight);
    ctx.lineTo(x + w + roofOverhang, y);
    ctx.closePath();
    ctx.fillStyle = "#b3492f";
    ctx.fill();
    ctx.strokeStyle = "#7a2f1c";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cerobong asap
    const chimneyW = w * 0.12;
    const chimneyH = h * 0.35;
    const chimneyX = x + w * 0.68;
    const chimneyY = y - roofHeight * 0.55 - chimneyH * 0.3;

    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(chimneyX, chimneyY, chimneyW, chimneyH);
    ctx.strokeStyle = "#5c3a1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(chimneyX, chimneyY, chimneyW, chimneyH);

    // Sedikit asap
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(chimneyX + chimneyW / 2, chimneyY - 8, 5, 0, Math.PI * 2);
    ctx.arc(chimneyX + chimneyW / 2 + 6, chimneyY - 18, 6, 0, Math.PI * 2);
    ctx.arc(chimneyX + chimneyW / 2 + 2, chimneyY - 30, 7, 0, Math.PI * 2);
    ctx.fill();

    // Pintu
    const doorW = w * 0.22;
    const doorH = h * 0.55;
    const doorX = x + w / 2 - doorW / 2;
    const doorY = y + h - doorH;

    ctx.fillStyle = "#6e451f";
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.strokeStyle = "#4a2c12";
    ctx.lineWidth = 2;
    ctx.strokeRect(doorX, doorY, doorW, doorH);

    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(doorX + doorW - 6, doorY + doorH / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Jendela kiri & kanan
    const winSize = w * 0.16;
    const winY = y + h * 0.2;

    for (const winX of [x + w * 0.14, x + w * 0.7]) {
        ctx.fillStyle = "#bdeaff";
        ctx.fillRect(winX, winY, winSize, winSize);
        ctx.strokeStyle = "#8a5a2b";
        ctx.lineWidth = 2;
        ctx.strokeRect(winX, winY, winSize, winSize);

        ctx.beginPath();
        ctx.moveTo(winX + winSize / 2, winY);
        ctx.lineTo(winX + winSize / 2, winY + winSize);
        ctx.moveTo(winX, winY + winSize / 2);
        ctx.lineTo(winX + winSize, winY + winSize / 2);
        ctx.stroke();
    }
}

// Line -> Garis bahaya / laser (hazard strip)
function drawHazardSkin(x1, y1, x2, y2) {
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 6;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Circle -> Balon udara
function drawBalloonSkin(x, y, r) {
    // Badan balon (sedikit lebih tinggi dari lebar, biar terasa "balon")
    const balloonRy = r * 1.15;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, r, balloonRy, 0, 0, Math.PI * 2);
    ctx.clip();

    // Stripes vertikal berselang-seling
    const stripeColors = ["#e74c3c", "#f1c40f", "#e74c3c", "#f1c40f", "#e74c3c"];
    const stripeWidth = (r * 2) / stripeColors.length;

    stripeColors.forEach(function(color, i) {
        ctx.fillStyle = color;
        ctx.fillRect(
            x - r + i * stripeWidth,
            y - balloonRy,
            stripeWidth,
            balloonRy * 2
        );
    });
    ctx.restore();

    ctx.strokeStyle = "#a5300f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, r, balloonRy, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Kerutan bawah balon (leher menuju keranjang)
    const neckY = y + balloonRy;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.35, neckY - 6);
    ctx.lineTo(x - r * 0.18, neckY + 6);
    ctx.lineTo(x + r * 0.18, neckY + 6);
    ctx.lineTo(x + r * 0.35, neckY - 6);
    ctx.closePath();
    ctx.fillStyle = "#a5300f";
    ctx.fill();

    // Keranjang
    const basketW = r * 0.75;
    const basketH = r * 0.5;
    const basketX = x - basketW / 2;
    const basketY = neckY + 16;

    // Tali penghubung
    ctx.strokeStyle = "#6b4423";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, neckY);
    ctx.lineTo(basketX, basketY);
    ctx.moveTo(x + r * 0.3, neckY);
    ctx.lineTo(basketX + basketW, basketY);
    ctx.stroke();

    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(basketX, basketY, basketW, basketH);
    ctx.strokeStyle = "#5c3a1a";
    ctx.lineWidth = 2;
    ctx.strokeRect(basketX, basketY, basketW, basketH);

    // Anyaman keranjang
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
        const lx = basketX + (basketW / 3) * i;
        ctx.moveTo(lx, basketY);
        ctx.lineTo(lx, basketY + basketH);
    }
    ctx.strokeStyle = "#5c3a1a";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// Triangle -> Pohon cemara
// Menggunakan bounding box segitiga asli (apex + base) supaya posisi/ukuran
// tetap mengikuti data yang sama, cuma cara gambarnya jadi pohon berlapis.
function drawTreeSkin(x1, y1, x2, y2, x3, y3) {
    const apexX = x1;
    const apexY = y1;
    const baseY = Math.max(y2, y3);
    const baseLeftX = Math.min(x2, x3);
    const baseRightX = Math.max(x2, x3);
    const halfWidth = (baseRightX - baseLeftX) / 2;

    // Batang pohon
    const trunkW = halfWidth * 0.28;
    const trunkH = (baseY - apexY) * 0.18;

    ctx.fillStyle = "#6b4423";
    ctx.fillRect(apexX - trunkW / 2, baseY, trunkW, trunkH);
    ctx.strokeStyle = "#4a2e18";
    ctx.lineWidth = 2;
    ctx.strokeRect(apexX - trunkW / 2, baseY, trunkW, trunkH);

    // Daun 3 lapis (dari bawah ke atas, makin kecil & makin terang)
    const layers = [
        { widthScale: 1.0, topScale: 0.55, color: "#1b5e3a" },
        { widthScale: 0.72, topScale: 0.55, color: "#2d7a4b" },
        { widthScale: 0.46, topScale: 0.6, color: "#3d9660" }
    ];

    const totalHeight = baseY - apexY;
    const layerStep = totalHeight * 0.32;

    layers.forEach(function(layer, index) {
        const layerBaseY = baseY - index * layerStep * 0.62;
        const layerApexY = layerBaseY - totalHeight * layer.topScale;
        const layerHalfWidth = halfWidth * layer.widthScale;

        ctx.beginPath();
        ctx.moveTo(apexX, layerApexY);
        ctx.lineTo(apexX - layerHalfWidth, layerBaseY);
        ctx.lineTo(apexX + layerHalfWidth, layerBaseY);
        ctx.closePath();

        ctx.fillStyle = layer.color;
        ctx.fill();
        ctx.strokeStyle = "#123d26";
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// Bola / objek bergerak -> Musuh (blob dengan mata)
function drawEnemySkin(x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const eyeOffsetX = r * 0.4;
    const eyeOffsetY = -r * 0.15;
    const eyeR = Math.max(2, r * 0.22);

    for (const sign of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + sign * eyeOffsetX, y + eyeOffsetY, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + sign * eyeOffsetX, y + eyeOffsetY, eyeR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "#222222";
        ctx.fill();
    }
}

// Player -> Karakter kecil bergaya game
function drawCharacterSkin(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + h * 0.25, w, h * 0.75);

    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.25, w * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const eyeR = w * 0.08;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + w * 0.35, y + h * 0.22, eyeR, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.22, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#222222";
    ctx.beginPath();
    ctx.arc(x + w * 0.35, y + h * 0.22, eyeR * 0.5, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.22, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// Circle kecil (mouseCircle / created circles) -> Permata
function drawGemSkin(x, y, r, color) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// --------------------------------------------------
// DRAW
// --------------------------------------------------

function drawRectangle() {
    beginSpotlight("rectangle");

    if (visualMode === "game") {
        drawHouseSkin(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    } else {
        ctx.fillStyle = rectangle.color;

        ctx.fillRect(
            rectangle.x,
            rectangle.y,
            rectangle.width,
            rectangle.height
        );
    }

    if (spotlightKey === "rectangle") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(
            rectangle.x,
            rectangle.y,
            rectangle.width,
            rectangle.height
        );
    }

    endSpotlight();
}

function drawLine() {
    beginSpotlight("line");

    if (visualMode === "game") {
        drawHazardSkin(300, 80, 500, 180);
    } else {
        ctx.beginPath();

        ctx.moveTo(300, 80);
        ctx.lineTo(500, 180);

        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = spotlightKey === "line" ? 8 : 5;

        ctx.stroke();
    }

    endSpotlight();
}

function drawCircle() {
    beginSpotlight("circle");

    if (visualMode === "game") {
        drawBalloonSkin(650, 120, 60);
    } else {
        ctx.beginPath();

        ctx.arc(
            650,
            120,
            60,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#2ecc71";
        ctx.fill();
    }

    if (spotlightKey === "circle") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    endSpotlight();
}

function drawTriangle() {
    beginSpotlight("triangle");

    if (visualMode === "game") {
        drawTreeSkin(150, 300, 80, 430, 220, 430);
    } else {
        ctx.beginPath();

        ctx.moveTo(150, 300);
        ctx.lineTo(80, 430);
        ctx.lineTo(220, 430);

        ctx.closePath();

        ctx.fillStyle = "#f39c12";
        ctx.fill();

        ctx.strokeStyle = spotlightKey === "triangle" ? "#ffffff" : "#8a5705";
        ctx.lineWidth = spotlightKey === "triangle" ? 5 : 3;
        ctx.stroke();
    }

    endSpotlight();
}

function drawMovingBall() {
    beginSpotlight("movingBall");

    if (visualMode === "game") {
        drawEnemySkin(movingBall.x, movingBall.y, movingBall.radius, movingBall.color);
    } else {
        ctx.beginPath();

        ctx.arc(
            movingBall.x,
            movingBall.y,
            movingBall.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = movingBall.color;
        ctx.fill();
    }

    if (spotlightKey === "movingBall") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    endSpotlight();
}

function drawPlayer() {
    beginSpotlight("player");

    if (visualMode === "game") {
        drawCharacterSkin(player.x, player.y, player.width, player.height, player.color);
    } else {
        ctx.fillStyle = player.color;

        ctx.fillRect(
            player.x,
            player.y,
            player.width,
            player.height
        );
    }

    if (spotlightKey === "player") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(
            player.x,
            player.y,
            player.width,
            player.height
        );
    }

    endSpotlight();
}

function drawMouseCoordinate() {
    ctx.clearRect(10, 15, 250, 25);

    ctx.fillStyle = "#222";
    ctx.font = "16px Arial";

    ctx.fillText(
        `Mouse: (${Math.round(mouse.x)}, ${Math.round(mouse.y)})`,
        20,
        30
    );
}

// Challenge B: Follow Mouse
// Membuat fungsi untuk menggambar lingkaran
function drawMouseCircle() {
    beginSpotlight("mouseCircle");

    if (visualMode === "game") {
        drawGemSkin(mouseCircle.x, mouseCircle.y, mouseCircle.radius, mouseCircle.color);
    } else {
        ctx.beginPath();

        ctx.arc(
            mouseCircle.x,
            mouseCircle.y,
            mouseCircle.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = mouseCircle.color;
        ctx.fill();
    }

    if (spotlightKey === "mouseCircle") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    endSpotlight();
}

// Challenge Tambahan 34.1: Click to Create Circle
// Membuat fungsi untuk menggambar circle ketika ada click
function drawCreatedCircles() {
    beginSpotlight("createdCircles");

    for (const circle of circles) {
        if (visualMode === "game") {
            drawGemSkin(circle.x, circle.y, circle.radius, circle.color);
        } else {
            ctx.beginPath();

            ctx.arc(
                circle.x,
                circle.y,
                circle.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = circle.color;
            ctx.fill();
        }

        if (spotlightKey === "createdCircles") {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    endSpotlight();
}

// Challenge Tambahan 34.3: Multiple Moving Objects
// Menambahkan fungsi menggambar
function drawMovingObjects() {
    beginSpotlight("movingObjects");

    for (const object of movingObjects) {
        if (visualMode === "game") {
            drawEnemySkin(object.x, object.y, object.radius, object.color);
        } else {
            ctx.beginPath();
            ctx.arc(
                object.x,
                object.y,
                object.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = object.color;
            ctx.fill();
        }

        if (spotlightKey === "movingObjects") {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    endSpotlight();
}

// --------------------------------------------------
// UPDATE
// --------------------------------------------------

function updateMovingBall() {
    movingBall.x += movingBall.speedX;
    movingBall.y += movingBall.speedY;

    if (
        movingBall.x + movingBall.radius >= canvas.width ||
        movingBall.x - movingBall.radius <= 0
    ) {
        movingBall.speedX *= -1;
    }

    if (
        movingBall.y + movingBall.radius >= canvas.height ||
        movingBall.y - movingBall.radius <= 0
    ) {
        movingBall.speedY *= -1;
    }
}

function updatePlayer() {
    // Fitur Tambahan: Movement Mode Toggle
    // Gerakan halus per-frame ini hanya berlaku di mode state-based
    if (movementMode === "state") {
        if (keys["ArrowLeft"]) {
            player.x -= player.speed;
        }

        if (keys["ArrowRight"]) {
            player.x += player.speed;
        }

        if (keys["ArrowUp"]) {
            player.y -= player.speed;
        }

        if (keys["ArrowDown"]) {
            player.y += player.speed;
        }

        // Fitur Tambahan: WASD Movement
        // Kontrol player alternatif selain arrow keys
        if (keys["a"] || keys["A"]) {
            player.x -= player.speed;
        }

        if (keys["d"] || keys["D"]) {
            player.x += player.speed;
        }

        if (keys["w"] || keys["W"]) {
            player.y -= player.speed;
        }

        if (keys["s"] || keys["S"]) {
            player.y += player.speed;
        }
    }

    player.x = Math.max(
        0,
        Math.min(canvas.width - player.width, player.x)
    );

    player.y = Math.max(
        0,
        Math.min(canvas.height - player.height, player.y)
    );
}

// Challenge Tambahan 34.3: Multiple Moving Objects
// Menambahkan fungsi update
function updateMovingObjects() {
    for (const object of movingObjects) {
        object.x += object.speedX;
        object.y += object.speedY;

        // Pantulan kiri dan kanan
        if (
            object.x + object.radius >= canvas.width ||
            object.x - object.radius <= 0
        ) {
            object.speedX *= -1;
        }

        // Pantulan atas dan bawah
        if (
            object.y + object.radius >= canvas.height ||
            object.y - object.radius <= 0
        ) {
            object.speedY *= -1;
        }
    }
}

// --------------------------------------------------
// INPUT
// --------------------------------------------------

// Challenge Tambahan 34.2: Trail Mode 
// Logika tombol aktivasi Trail Mode
const trailButton = document.getElementById("trailButton");

trailButton.addEventListener("click", function() {
    trailMode = !trailMode;

    trailButton.textContent =
        trailMode
            ? "Trail Mode: ON"
            : "Trail Mode: OFF";
});

// Fitur Tambahan: Pause
// Logika tombol untuk menghentikan/melanjutkan animasi
const pauseButton = document.getElementById("pauseButton");

pauseButton.addEventListener("click", function() {
    isPaused = !isPaused;

    pauseButton.textContent = isPaused ? "Resume" : "Pause";
});

// Fitur Tambahan: Movement Mode Toggle
// Logika tombol untuk berpindah antara mode state-based dan event-based
const movementModeButton = document.getElementById("movementModeButton");

movementModeButton.addEventListener("click", function() {
    movementMode = movementMode === "state" ? "event" : "state";

    movementModeButton.textContent =
        movementMode === "state"
            ? "Movement: State-based"
            : "Movement: Event-based";
});

// Fitur Tambahan: Reset
// Logika tombol untuk mengembalikan semua objek ke kondisi awal
const resetButton = document.getElementById("resetButton");

resetButton.addEventListener("click", function() {
    Object.assign(player, initialState.player);
    Object.assign(movingBall, initialState.movingBall);

    movingObjects.forEach(function(object, index) {
        Object.assign(object, initialState.movingObjects[index]);
    });

    Object.assign(mouse, initialState.mouse);
    Object.assign(mouseCircle, initialState.mouseCircle);

    circles.length = 0;

    colorIndex = initialState.colorIndex;
    movingBall.color = colors[colorIndex];

    trailMode = false;
    trailButton.textContent = "Trail Mode: OFF";

    isPaused = false;
    pauseButton.textContent = "Pause";

    movementMode = "state";
    movementModeButton.textContent = "Movement: State-based";

    visualMode = "primitive";
    styleModeButton.textContent = "Style: Primitive";

    eventCount = 0;

    for (const key in keys) {
        keys[key] = false;
    }

    speedRange.value = initialState.player.speed;
    speedValue.textContent = initialState.player.speed;
});

// Fitur Tambahan: Clear Circles
// Logika tombol untuk menghapus semua lingkaran hasil klik
const clearCirclesButton = document.getElementById("clearCirclesButton");

clearCirclesButton.addEventListener("click", function() {
    circles.length = 0;
});

// Fitur Tambahan: Player Speed
// Logika slider untuk mengubah kecepatan player secara bebas
const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");

speedRange.addEventListener("input", function() {
    player.speed = Number(speedRange.value);
    speedValue.textContent = speedRange.value;
});

// Fitur Tambahan: Style Mode
// Logika tombol untuk berpindah tampilan primitive <-> game
// Murni ganti cara gambar (skin), tidak mengubah data/posisi/logika apa pun
const styleModeButton = document.getElementById("styleModeButton");

styleModeButton.addEventListener("click", function() {
    visualMode = visualMode === "primitive" ? "game" : "primitive";

    styleModeButton.textContent =
        visualMode === "primitive"
            ? "Style: Primitive"
            : "Style: Game";
});

const legendItems = document.querySelectorAll(".legend-item");

legendItems.forEach(function(item) {
    item.addEventListener("mouseenter", function() {
        spotlightKey = item.dataset.key;
    });

    item.addEventListener("mouseleave", function() {
        spotlightKey = null;
    });
});

canvas.addEventListener("mousemove", function(event) {
    eventCount++;

    const rect = canvas.getBoundingClientRect();

    mouse.x =
        (event.clientX - rect.left) *
        (canvas.width / rect.width);

    mouse.y =
        (event.clientY - rect.top) *
        (canvas.height / rect.height);

    // Challenge B: Follow Mouse
    // Update posisi lingkaran saat mouse bergerak
    mouseCircle.x = mouse.x;
    mouseCircle.y = mouse.y;
});

canvas.addEventListener("click", function() {
    eventCount++;

    colorIndex = (colorIndex + 1) % colors.length;
    movingBall.color = colors[colorIndex];

    // Challenge Tambahan 34.1: Click to Create Circle
    // Tambahkan event buat circle ketika click terjadi
    circles.push({
        x: mouse.x,
        y: mouse.y,
        radius: 15,
        color: colors[colorIndex]
    });
});

window.addEventListener("keydown", function(event) {
    eventCount++;

    const controlledKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown"
    ];

    if (controlledKeys.includes(event.key)) {
        event.preventDefault();
    }

    // State-based:
    // simpan status tombol untuk translasi kontinu.
    keys[event.key] = true;

    // Fitur Tambahan: Movement Mode Toggle
    // Event-based: player loncat sekali tiap tombol ditekan (bukan ditahan)
    if (movementMode === "event" && !event.repeat) {
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
            player.x -= player.speed;
        }

        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
            player.x += player.speed;
        }

        if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
            player.y -= player.speed;
        }

        if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
            player.y += player.speed;
        }
    }

    // Event-based:
    // contoh aksi diskrit sekali tekan.
    if (
        event.key.toLowerCase() === "r" &&
        !event.repeat
    ) {
        player.x = 600;
        player.y = 350;
    }
});

window.addEventListener("keyup", function(event) {
    keys[event.key] = false;
});

// --------------------------------------------------
// ANIMATION LOOP
// --------------------------------------------------

function animate() {
    // Challenge Tambahan 34.2: Trail Mode
    // Mengganti kapan fungsi clearCanvas() dipanggil
    if(trailMode){
        drawTrail();
    }
    else{
        clearCanvas();
    }

    // Fitur Tambahan: Pause
    // Hanya update posisi objek kalau animasi tidak sedang dijeda
    if (!isPaused) {
        updateMovingBall();
        updatePlayer();

        // Challenge Tambahan 34.3: Multiple Moving Objects
        // Memanggil fungsi
        updateMovingObjects();
    }

    drawRectangle();
    drawLine();
    drawCircle();
    drawTriangle();
    drawMovingBall();
    drawPlayer();
    
    // Challenge B: Follow Mouse
    // Memanggil fungsi gambar
    drawMouseCircle();

    // Challenge Tambahan 34.3: Multiple Moving Objects
    // Memanggil fungsi gambar
    drawMovingObjects();

    // Challenge Tambahan 34.1: Click to Create Circle
    // Memanggil fungsi 
    drawCreatedCircles();

    drawMouseCoordinate();

    updateStatePanel();

    requestAnimationFrame(animate);
}

animate();
