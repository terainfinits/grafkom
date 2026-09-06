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
// DRAW
// --------------------------------------------------

function drawRectangle() {
    beginSpotlight("rectangle");

    ctx.fillStyle = rectangle.color;

    ctx.fillRect(
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height
    );

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

    ctx.beginPath();

    ctx.moveTo(300, 80);
    ctx.lineTo(500, 180);

    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = spotlightKey === "line" ? 8 : 5;

    ctx.stroke();

    endSpotlight();
}

function drawCircle() {
    beginSpotlight("circle");

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

    if (spotlightKey === "circle") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    endSpotlight();
}

function drawTriangle() {
    beginSpotlight("triangle");

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

    endSpotlight();
}

function drawMovingBall() {
    beginSpotlight("movingBall");

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

    if (spotlightKey === "movingBall") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    endSpotlight();
}

function drawPlayer() {
    beginSpotlight("player");

    ctx.fillStyle = player.color;

    ctx.fillRect(
        player.x,
        player.y,
        player.width,
        player.height
    );

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
    // Jangan lupa tambahkan ini
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
