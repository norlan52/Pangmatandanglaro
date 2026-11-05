// ===== 1. MGA SETTING NA PWEDE MONG PALITAN =====
const DINO_IMAGE = "images/dino.png";           // friend #1
const CACTUS_IMAGE = "images/cactus.png";       // friend #2
const BIRD_IMAGE = "images/bird.png";           // friend #3
const JUMPSCARE_IMAGE = "images/jumpscare.png"; // friend #4
const JUMPSCARE_SOUND = "audio/jumpscare.mp3";
const BACKGROUND_MUSIC = "audio/music.mp3";
const GAME_OVER_TEXT = "Too bad!";              // palitan ng kahit anong text

// ===== 2. KUNIN ANG MGA ELEMENT SA HTML =====
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");

// ===== 3. FUNCTION PANG-LOAD NG IMAGE =====
function loadImage(path) {
  const image = new Image();
  image.src = path;
  image.onerror = function () {
    console.warn("Hindi mahanap ang image: " + path);
  };
  return image;
}

// ===== 4. I-LOAD ANG MGA IMAGE =====
const dinoImage = loadImage(DINO_IMAGE);
const cactusImage = loadImage(CACTUS_IMAGE);
const birdImage = loadImage(BIRD_IMAGE);
const jumpscareImage = loadImage(JUMPSCARE_IMAGE);

// ===== 5. I-SETUP ANG AUDIO =====
const backgroundMusic = new Audio(BACKGROUND_MUSIC);
backgroundMusic.loop = true;      // paulit-ulit ang music
backgroundMusic.volume = 0.5;

const jumpscareSound = new Audio(JUMPSCARE_SOUND);
jumpscareSound.loop = false;      // isang beses lang tutunog
jumpscareSound.volume = 1.0;

// ===== 6. SETTING NG GAME (pwede mong baguhin) =====
const GROUND_Y = 250;            // taas ng lupa mula sa tuktok ng canvas
const DINO_X = 80;               // layo ng dino mula sa kaliwa
const DINO_WIDTH = 100;
const DINO_HEIGHT = 100;
const SCORE_PER_SECOND = 10;     // 200 points = 20 segundo (gawing 50 kung nagte-test ka)
const JUMPSCARE_SCORE = 200;
const JUMPSCARE_DURATION = 3000; // gaano katagal ang jumpscare (milliseconds)
const SHAKE_STRENGTH = 15;       // gaano kalakas manginig ang image

// Hearts at tama
const MAX_LIVES = 3;             // ilang hearts sa simula
const HITBOX_PADDING = 25;       // mas malaki = mas madaling makalusot (pixels sa bawat gilid)
const HIT_FLASH_SECONDS = 0.4;   // gaano katagal ang pulang flash kapag natamaan

// Mga setting ng cactus
const CACTUS_WIDTH = 90;
const CACTUS_HEIGHT = 100;
const CACTUS_SPEED = 280;        // pixels kada segundo (mas maliit = mas madali)
const CACTUS_START_X = 850;      // simula ng cactus (labas ng canvas sa kanan)
const GRAVITY = 2000;
const JUMP_POWER = 1100;

// Mga setting ng ibon
const BIRD_WIDTH = 80;
const BIRD_HEIGHT = 70;
const BIRD_Y = 60;               // taas ng lipad (mas maliit = mas mataas)
const BIRD_SPEED = 220;          // pixels kada segundo
const BIRD_START_X = 850;        // simula ng ibon (labas ng canvas sa kanan)
const BIRD_MIN_DELAY = 1;        // pinakamaikling hintay bago lumabas ulit (segundo)
const BIRD_MAX_DELAY = 3;        // pinakamahabang hintay (segundo)

// ===== 7. ESTADO NG GAME (mga nagbabagong value) =====
let score = 0;
let lives = MAX_LIVES;
let hitFlashLeft = 0;            // segundong natitira sa pulang flash
let isGameRunning = false;
let isGameOver = false;
let isJumpscareActive = false;   // true habang nagjajumpscare
let jumpscareStartTime = 0;
let hasGameStarted = false;      // para hindi mag-start ang game habang nasa Start screen pa
let lastTimestamp = 0;

const cactus = {
  x: CACTUS_START_X,
  y: GROUND_Y - CACTUS_HEIGHT,
  velocityY: 0,
  isOnGround: true
};

const bird = {
  x: BIRD_START_X,
  y: BIRD_Y,
  delayLeft: 2                   // segundong hihintayin bago lumabas
};

// ===== 8. FUNCTION PANG-CHECK KUNG MAAARI NANG IGUHIT ANG IMAGE =====
function isImageReady(image) {
  return image.complete && image.naturalWidth > 0;
}

// ===== 9. PANG-GUHIT =====
function drawBackground() {
  ctx.fillStyle = "#87ceeb";                                   // langit
  ctx.fillRect(0, 0, canvas.width, GROUND_Y);

  ctx.fillStyle = "#8b7355";                                   // lupa
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

  ctx.fillStyle = "#555555";                                   // guhit sa gilid ng lupa
  ctx.fillRect(0, GROUND_Y, canvas.width, 3);
}

function drawDino() {
  const dinoY = GROUND_Y - DINO_HEIGHT;

  if (isImageReady(dinoImage)) {
    ctx.drawImage(dinoImage, DINO_X, dinoY, DINO_WIDTH, DINO_HEIGHT);
  } else {
    ctx.fillStyle = "green";                                   // placeholder
    ctx.fillRect(DINO_X, dinoY, DINO_WIDTH, DINO_HEIGHT);
  }
}

function drawCactus() {
  if (isImageReady(cactusImage)) {
    ctx.drawImage(cactusImage, cactus.x, cactus.y, CACTUS_WIDTH, CACTUS_HEIGHT);
  } else {
    ctx.fillStyle = "red";                                     // placeholder
    ctx.fillRect(cactus.x, cactus.y, CACTUS_WIDTH, CACTUS_HEIGHT);
  }
}

function drawBird() {
  if (!isBirdVisible()) {
    return; // naghihintay pa, hindi pa lalabas
  }

  if (isImageReady(birdImage)) {
    ctx.drawImage(birdImage, bird.x, bird.y, BIRD_WIDTH, BIRD_HEIGHT);
  } else {
    ctx.fillStyle = "orange";                                  // placeholder
    ctx.fillRect(bird.x, bird.y, BIRD_WIDTH, BIRD_HEIGHT);
  }
}

function drawScore() {
  ctx.fillStyle = "#222222";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Score: " + Math.floor(score), canvas.width - 20, 40);
}

// Hearts sa kaliwang itaas: pula = meron pa, abo = nawala na
function drawLives() {
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "left";

  for (let i = 0; i < MAX_LIVES; i++) {
    ctx.fillStyle = i < lives ? "#e63946" : "#999999";
    ctx.fillText("\u2665", 20 + i * 42, 45);
  }
}

// Pulang flash sandali kapag natamaan
function drawHitFlash() {
  if (hitFlashLeft > 0) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawGameOver() {
  // Madilim na takip sa buong canvas
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";

  ctx.font = "bold 48px Arial";
  ctx.fillText(GAME_OVER_TEXT, canvas.width / 2, 130);

  ctx.font = "24px Arial";
  ctx.fillText("Score: " + Math.floor(score), canvas.width / 2, 175);

  ctx.font = "bold 22px Arial";
  ctx.fillText("Tap o pindutin ang Space para mag-retry", canvas.width / 2, 225);
}

// Jumpscare: itim na background, malaking image na nanginginig at lumalaki
function drawJumpscare(timestamp) {
  const elapsed = timestamp - jumpscareStartTime;
  const progress = Math.min(elapsed / JUMPSCARE_DURATION, 1); // 0 hanggang 1

  // Itim na takip sa buong canvas
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (isImageReady(jumpscareImage)) {
    // Sasakop sa buong canvas, tapos lalaki pa ng hanggang 30%
    const baseScale = Math.max(
      canvas.width / jumpscareImage.naturalWidth,
      canvas.height / jumpscareImage.naturalHeight
    );
    const scale = baseScale * (1 + 0.3 * progress);
    const drawWidth = jumpscareImage.naturalWidth * scale;
    const drawHeight = jumpscareImage.naturalHeight * scale;

    // Random na galaw para manginig
    const shakeX = (Math.random() - 0.5) * 2 * SHAKE_STRENGTH;
    const shakeY = (Math.random() - 0.5) * 2 * SHAKE_STRENGTH;

    // Nasa gitna ng canvas
    const drawX = (canvas.width - drawWidth) / 2 + shakeX;
    const drawY = (canvas.height - drawHeight) / 2 + shakeY;

    ctx.drawImage(jumpscareImage, drawX, drawY, drawWidth, drawHeight);
  } else {
    // Kapag wala ang image, may text na pamalit
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 80px Arial";
    ctx.textAlign = "center";
    ctx.fillText("BOO!", canvas.width / 2, canvas.height / 2 + 25);
  }

  // Pulang flash na pumipitik-pitik
  if (Math.floor(elapsed / 100) % 2 === 0) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ===== 10. MGA ACTION NG CACTUS AT IBON =====
function jumpCactus() {
  if (cactus.isOnGround && isGameRunning && !isJumpscareActive) {
    cactus.velocityY = -JUMP_POWER; // negatibo = pataas
    cactus.isOnGround = false;
  }
}

// Tinitingnan kung tumama ang cactus sa dino.
// Pinaliit ang kahon (HITBOX_PADDING) para mas madaling makalusot.
function isCollidingWithDino() {
  const dinoY = GROUND_Y - DINO_HEIGHT;
  const pad = HITBOX_PADDING;
  return (
    cactus.x + pad < DINO_X + DINO_WIDTH - pad &&
    cactus.x + CACTUS_WIDTH - pad > DINO_X + pad &&
    cactus.y + pad < dinoY + DINO_HEIGHT - pad &&
    cactus.y + CACTUS_HEIGHT - pad > dinoY + pad
  );
}

function resetCactus() {
  cactus.x = CACTUS_START_X;
  cactus.y = GROUND_Y - CACTUS_HEIGHT;
  cactus.velocityY = 0;
  cactus.isOnGround = true;
}

// Lumalabas lang ang ibon kapag tapos na ang hintay niya
function isBirdVisible() {
  return bird.delayLeft <= 0;
}

// Random na hintay sa pagitan ng min at max
function getRandomBirdDelay() {
  return BIRD_MIN_DELAY + Math.random() * (BIRD_MAX_DELAY - BIRD_MIN_DELAY);
}

function resetBird() {
  bird.x = BIRD_START_X;
  bird.y = BIRD_Y;
  bird.delayLeft = getRandomBirdDelay();
}

// ===== 11. JUMPSCARE =====
function startJumpscare(timestamp) {
  isJumpscareActive = true;
  jumpscareStartTime = timestamp;

  jumpscareSound.currentTime = 0;
  jumpscareSound.play().catch(function (error) {
    console.warn("Hindi ma-play ang jumpscare sound:", error.message);
  });

  console.log("JUMPSCARE!");
}

// ===== 12. UPDATE (ang mga nagbabago kada frame) =====
function update(deltaSeconds, timestamp) {
  // Habang nagjajumpscare, walang gumagalaw sa laro. Hinihintay lang matapos.
  if (isJumpscareActive) {
    if (timestamp - jumpscareStartTime >= JUMPSCARE_DURATION) {
      isJumpscareActive = false;
      isGameRunning = false;
      isGameOver = true;
    }
    return;
  }

  score += SCORE_PER_SECOND * deltaSeconds;

  // Bumababa ang pulang flash
  if (hitFlashLeft > 0) {
    hitFlashLeft -= deltaSeconds;
  }

  // Galaw pakaliwa ng cactus
  cactus.x -= CACTUS_SPEED * deltaSeconds;

  // Talon at grabidad
  cactus.velocityY += GRAVITY * deltaSeconds;
  cactus.y += cactus.velocityY * deltaSeconds;

  // Kapag bumaba na sa lupa, tumigil
  const groundLevel = GROUND_Y - CACTUS_HEIGHT;
  if (cactus.y >= groundLevel) {
    cactus.y = groundLevel;
    cactus.velocityY = 0;
    cactus.isOnGround = true;
  }

  // Kapag lumampas na sa kaliwa, bumalik sa kanan
  if (cactus.x + CACTUS_WIDTH < 0) {
    cactus.x = CACTUS_START_X;
  }

  // Galaw ng ibon (pang-display lang, hindi nakakamatay)
  if (bird.delayLeft > 0) {
    bird.delayLeft -= deltaSeconds;        // naghihintay pa
  } else {
    bird.x -= BIRD_SPEED * deltaSeconds;   // lumilipad pakaliwa
    if (bird.x + BIRD_WIDTH < 0) {
      resetBird();                         // lumampas na, maghihintay ulit bago lumabas
    }
  }

  // Tumama sa dino = mawawalan ng 1 heart
  if (isCollidingWithDino()) {
    lives -= 1;
    hitFlashLeft = HIT_FLASH_SECONDS;
    console.log("Tinamaan! Natitirang hearts: " + lives);

    if (lives <= 0) {
      isGameRunning = false;
      isGameOver = true;
      console.log("Game Over! Score: " + Math.floor(score));
      return;
    }

    resetCactus(); // babalik ang cactus sa kanan para hindi paulit-ulit na tumama
  }

  // Umabot sa 200 = JUMPSCARE
  if (score >= JUMPSCARE_SCORE) {
    score = JUMPSCARE_SCORE;
    startJumpscare(timestamp);
  }
}

// ===== 13. GAME LOOP =====
function gameLoop(timestamp) {
  const deltaSeconds = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  update(deltaSeconds, timestamp);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isJumpscareActive) {
    drawJumpscare(timestamp);
  } else {
    drawBackground();
    drawDino();
    drawCactus();
    drawBird();
    drawScore();
    drawLives();
    drawHitFlash();

    if (isGameOver) {
      drawGameOver();
    }
  }

  if (isGameRunning) {
    requestAnimationFrame(gameLoop);
  }
}

// ===== 14. SIMULAN ANG GAME =====
function startGame() {
  score = 0;
  lives = MAX_LIVES;
  hitFlashLeft = 0;
  isGameOver = false;
  isJumpscareActive = false;
  resetCactus();
  resetBird();

  isGameRunning = true;
  lastTimestamp = performance.now();
  requestAnimationFrame(gameLoop);
}

// ===== 15. START BUTTON =====
startButton.addEventListener("click", function () {
  startScreen.classList.add("hidden");
  hasGameStarted = true;

  // Isang beses lang magsisimula ang music dito. Hindi na ito titigil o magre-restart.
  backgroundMusic.play().catch(function (error) {
    console.warn("Hindi ma-play ang music:", error.message);
  });

  startGame();
});

// ===== 16. CONTROLS (keyboard at tap) =====
// - habang nagjajumpscare: walang gagawin
// - kung tumatakbo ang game: talon
// - kung tapos na ang game: retry
function handleAction() {
  if (!hasGameStarted || isJumpscareActive) {
    return;
  }

  if (isGameRunning) {
    jumpCactus();
  } else {
    startGame();
  }
}

// Keyboard (computer)
document.addEventListener("keydown", function (event) {
  if (event.code === "Space") {
    event.preventDefault(); // pigilan ang pag-scroll ng page
    handleAction();
  }
});

// Tap o click sa canvas (phone at mouse)
canvas.addEventListener("pointerdown", function (event) {
  event.preventDefault();
  handleAction();
});

// Iguhit ang unang itsura ng game habang nasa Start screen pa lang
drawBackground();
drawDino();
drawCactus();
drawScore();
drawLives();