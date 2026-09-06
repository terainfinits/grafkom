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

const keys = {};

const colors = [
    "#9b59b6",
    "#e74c3c",
    "#2ecc71",
    "#f1c40f",
    "#3498db"
];

let colorIndex = 0;

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

// --------------------------------------------------
// DRAW
// --------------------------------------------------

function drawRectangle() {
    ctx.fillStyle = rectangle.color;

    ctx.fillRect(
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height
    );
}

function drawLine() {
    ctx.beginPath();

    ctx.moveTo(300, 80);
    ctx.lineTo(500, 180);

    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 5;

    ctx.stroke();
}

function drawCircle() {
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

function drawTriangle() {
    ctx.beginPath();

    ctx.moveTo(150, 300);
    ctx.lineTo(80, 430);
    ctx.lineTo(220, 430);

    ctx.closePath();

    ctx.fillStyle = "#f39c12";
    ctx.fill();

    ctx.strokeStyle = "#8a5705";
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawMovingBall() {
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

function drawPlayer() {
    ctx.fillStyle = player.color;

    ctx.fillRect(
        player.x,
        player.y,
        player.width,
        player.height
    );
}

function drawMouseCoordinate() {
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

// Challenge Tambahan 34.1: Click to Create Circle
// Membuat fungsi untuk menggambar circle ketika ada click
function drawCreatedCircles() {
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
    }
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

    player.x = Math.max(
        0,
        Math.min(canvas.width - player.width, player.x)
    );

    player.y = Math.max(
        0,
        Math.min(canvas.height - player.height, player.y)
    );
}

// --------------------------------------------------
// INPUT
// --------------------------------------------------

canvas.addEventListener("mousemove", function(event) {
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
    clearCanvas();

    updateMovingBall();
    updatePlayer();

    drawRectangle();
    drawLine();
    drawCircle();
    drawTriangle();
    drawMovingBall();
    drawPlayer();

    // Challenge B: Follow Mouse
    // Memanggil fungsi gambar
    drawMouseCircle();

    // Challenge Tambahan 34.1: Click to Create Circle
    // Memanggil fungsi 
    drawCreatedCircles();
    
    drawMouseCoordinate();

    requestAnimationFrame(animate);
}

animate();
