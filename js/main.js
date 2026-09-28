'use strict';

// ---- Ρυθμίσεις παίκτη / ήχων ----
const PLAYER_RADIUS = 7;
const RUN_SPEED = 115;             // γρήγορο περπάτημα, μονάδες κόσμου / δευτ.
const SNEAK_SPEED = 50;            // αργό, αθόρυβο περπάτημα
const STEP_LENGTH = 32;            // απόσταση ανάμεσα σε δύο βήματα

const STEP_WAVE = { radius: 65, strength: 0.22 };                   // αχνά βήματα (μόνο όταν τρέχεις)
const CALL_WAVE = { minR: 110, maxR: 560, minS: 0.5, maxS: 1.0 };   // το "κύμα" του παίκτη

// Πόσος κόσμος χωράει στην οθόνη (τουλάχιστον τόσο πλάτος / ύψος).
const VIEW_MIN_W = 440;
const VIEW_MIN_H = 700;

// Πόσο κρατάει η "στιγμή" του θανάτου πριν βγει η οθόνη Game Over (δευτ.).
const DEATH_DELAY = 1;

// ---- Κατάσταση ----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const titleEl = document.getElementById('title');
const gameOverEl = document.getElementById('gameover');
const winEl = document.getElementById('win');
const winTimeEl = document.getElementById('win-time');

let cssW = 0, cssH = 0, dpr = 1, scale = 1;
let state = 'title';     // 'title' | 'play' | 'dead' | 'won'
let gameTime = 0;
let lastFrame = 0;
let runStart = 0;        // πότε ξεκίνησε η τωρινή προσπάθεια
let endTime = 0;         // πότε πέθανε / νίκησε
let showMap = false;     // βοήθεια για δοκιμές: πλήκτρο M

const player = { x: 0, y: 0, r: PLAYER_RADIUS, stepDist: 0, foot: 1 };
const camera = { x: 0, y: 0 };

// ---- Μέγεθος οθόνης ----
function resize() {
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  scale = Math.min(cssW / VIEW_MIN_W, cssH / VIEW_MIN_H);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---- Κίνηση & σύγκρουση με τοίχους ----
function resolveWalls(p) {
  const r = p.r;
  const minTx = Math.floor((p.x - r) / TILE), maxTx = Math.floor((p.x + r) / TILE);
  const minTy = Math.floor((p.y - r) / TILE), maxTy = Math.floor((p.y + r) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!Level.isWall(tx, ty)) continue;
      const cx = Math.max(tx * TILE, Math.min(p.x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(p.y, ty * TILE + TILE));
      const dx = p.x - cx, dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x += (dx / d) * (r - d);
        p.y += (dy / d) * (r - d);
      } else {
        // Το κέντρο μπήκε μέσα στον τοίχο: βγάλ' το από την κοντινότερη πλευρά.
        const left = p.x - tx * TILE, right = tx * TILE + TILE - p.x;
        const top = p.y - ty * TILE, bottom = ty * TILE + TILE - p.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) p.x = tx * TILE - r;
        else if (m === right) p.x = tx * TILE + TILE + r;
        else if (m === top) p.y = ty * TILE - r;
        else p.y = ty * TILE + TILE + r;
      }
    }
  }
}

function updatePlayer(dt) {
  const mx = Input.moveX, my = Input.moveY;
  const amount = Math.hypot(mx, my);
  if (amount < 0.01) return;

  const speed = Input.running
    ? RUN_SPEED
    : SNEAK_SPEED * Math.min(1, amount / RUN_THRESHOLD);
  const ux = mx / amount, uy = my / amount;

  const ox = player.x, oy = player.y;
  player.x += ux * speed * dt;
  resolveWalls(player);
  player.y += uy * speed * dt;
  resolveWalls(player);

  // Βήματα: μόνο το γρήγορο περπάτημα κάνει θόρυβο.
  if (!Input.running) return;
  player.stepDist += Math.hypot(player.x - ox, player.y - oy);
  if (player.stepDist >= STEP_LENGTH) {
    player.stepDist -= STEP_LENGTH;
    player.foot = -player.foot;
    const side = 3 * player.foot;
    Echoes.emit(player.x - uy * side, player.y + ux * side,
      STEP_WAVE.radius, STEP_WAVE.strength, 'step');
  }
}

function emitCall(held) {
  if (state !== 'play') return;
  const c = Math.min(1, held / MAX_CHARGE);
  Echoes.emit(player.x, player.y,
    CALL_WAVE.minR + (CALL_WAVE.maxR - CALL_WAVE.minR) * c,
    CALL_WAVE.minS + (CALL_WAVE.maxS - CALL_WAVE.minS) * c,
    'call');
}

// ---- Σχεδίαση ----
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'title') return;

  const halfW = cssW / 2 / scale, halfH = cssH / 2 / scale;
  const view = {
    x0: camera.x - halfW, x1: camera.x + halfW,
    y0: camera.y - halfH, y1: camera.y + halfH,
  };

  const s = scale * dpr;
  ctx.setTransform(s, 0, 0, s, (cssW / 2 - camera.x * scale) * dpr, (cssH / 2 - camera.y * scale) * dpr);

  if (showMap) drawDebugMap();

  Echoes.draw(ctx, gameTime, view, scale);
  ExitDoor.draw(ctx, gameTime);

  if (state === 'dead') {
    // Το τέρας φαίνεται ολόκληρο εκεί που σε έπιασε.
    const t = (gameTime - endTime) / DEATH_DELAY;
    Monster.draw(ctx, gameTime, Math.max(0.25, 1 - t * 0.6));
  } else {
    Monster.draw(ctx, gameTime);
  }
  drawPlayer();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state === 'play') drawJoystick();
  if (state === 'dead') drawDeathFlash();
}

function drawPlayer() {
  const c = Input.chargeAmount();

  // Φόρτιση: ένα μικρό δαχτυλίδι που μεγαλώνει και "τρέμει" όσο κρατάς.
  if (Input.charging) {
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * (8 + c * 16));
    const rr = player.r + 4 + c * 16;
    ctx.lineWidth = 1.5 / scale;
    ctx.strokeStyle = `rgba(170,200,255,${(0.15 + 0.35 * c * pulse).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(player.x, player.y, rr, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(150,180,255,0.07)';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(230,240,255,${(0.75 + 0.25 * c).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawJoystick() {
  const j = Input.joy;
  if (j.id === null) return;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(j.ox, j.oy, JOY_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Εσωτερικός κύκλος: μέσα του περπατάς αθόρυβα, έξω του τρέχεις.
  const runR = JOY_RADIUS * (JOY_DEADZONE + RUN_THRESHOLD * (1 - JOY_DEADZONE));
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(j.ox, j.oy, runR, 0, Math.PI * 2);
  ctx.stroke();

  let dx = j.x - j.ox, dy = j.y - j.oy;
  const len = Math.hypot(dx, dy);
  if (len > JOY_RADIUS) { dx *= JOY_RADIUS / len; dy *= JOY_RADIUS / len; }
  ctx.fillStyle = Input.running ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(j.ox + dx, j.oy + dy, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawDeathFlash() {
  const t = Math.min(1, (gameTime - endTime) / DEATH_DELAY);
  const a = 0.55 * (1 - t) + 0.2;
  const g = ctx.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.15,
    cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.75);
  g.addColorStop(0, 'rgba(120,0,0,0)');
  g.addColorStop(1, `rgba(120,0,0,${a.toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawDebugMap() {
  ctx.fillStyle = 'rgba(255,60,60,0.12)';
  for (let ty = 0; ty < Level.rows; ty++) {
    for (let tx = 0; tx < Level.cols; tx++) {
      if (Level.isWall(tx, ty)) ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  ctx.fillStyle = 'rgba(255,214,150,0.4)';
  ctx.fillRect(Level.exit.tx * TILE, Level.exit.ty * TILE, TILE, TILE);
  ctx.fillStyle = 'rgba(255,60,60,0.6)';
  ctx.beginPath();
  ctx.arc(Monster.x, Monster.y, Monster.r, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Βρόχος ----
function frame(t) {
  const now = t / 1000;
  const dt = Math.min(0.05, Math.max(0, now - (lastFrame || now)));
  lastFrame = now;

  if (state === 'play') {
    gameTime += dt;
    Input.update();
    updatePlayer(dt);
    Monster.update(dt, gameTime);
    Echoes.update(dt, gameTime);

    if (Monster.touches(player)) die();
    else if (ExitDoor.reached(player)) win();

    // Η κάμερα ακολουθεί τον παίκτη απαλά.
    const follow = 1 - Math.pow(0.001, dt);
    camera.x += (player.x - camera.x) * follow;
    camera.y += (player.y - camera.y) * follow;
  } else if (state === 'dead' || state === 'won') {
    gameTime += dt;
    Echoes.update(dt, gameTime);
    if (state === 'dead' && gameTime - endTime >= DEATH_DELAY) {
      gameOverEl.classList.remove('hidden');
    }
  }

  draw();
  requestAnimationFrame(frame);
}

// ---- Έναρξη / τέλος ----
function goFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || document.fullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.then) {
      p.then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('portrait').catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (_) { /* π.χ. iPhone: δεν υποστηρίζεται, συνεχίζουμε κανονικά */ }
}

function stopInput() {
  Input.cancelCharge();
  Input.joy.id = null;
}

function die() {
  state = 'dead';
  endTime = gameTime;
  stopInput();
}

function win() {
  state = 'won';
  endTime = gameTime;
  stopInput();
  const secs = Math.floor(endTime - runStart);
  winTimeEl.textContent = `Χρόνος: ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  winEl.classList.remove('hidden');
}

// Ξεκινάει (ή ξαναξεκινάει) το επίπεδο από την αρχή.
function startGame() {
  if (state === 'play') return;
  // Σε κινητό ζητάμε full screen. Στον υπολογιστή όχι, για να μένουν τα devtools άνετα.
  if (matchMedia('(pointer: coarse)').matches) goFullscreen();
  titleEl.classList.add('hidden');
  gameOverEl.classList.add('hidden');
  winEl.classList.add('hidden');
  stopInput();   // το Space/Enter που ξεκίνησε το παιχνίδι να μη βγάλει κύμα

  Echoes.init();
  player.x = camera.x = Level.start.x;
  player.y = camera.y = Level.start.y;
  player.stepDist = 0;
  Monster.reset(Level.monsterStart.x, Level.monsterStart.y);
  ExitDoor.reset();

  state = 'play';
  runStart = gameTime;
  // Μια πρώτη ανάσα: ένα μέτριο κύμα για να δεις πού βρίσκεσαι.
  Echoes.emit(player.x, player.y, 220, 0.6, 'call');
}

// Είναι ανοιχτή κάποια οθόνη που περιμένει "ξεκίνα";
function menuOpen() {
  return state === 'title' || state === 'won' ||
    (state === 'dead' && !gameOverEl.classList.contains('hidden'));
}

function init() {
  Level.load(LEVEL_1);
  Echoes.init();
  Echoes.listeners.push(Monster, ExitDoor);

  Input.now = () => gameTime;
  Input.onRelease = emitCall;
  Input.init(canvas);

  titleEl.addEventListener('pointerup', (e) => { e.preventDefault(); startGame(); });
  for (const btn of document.querySelectorAll('.again')) {
    btn.addEventListener('click', (e) => { e.preventDefault(); startGame(); });
  }
  window.addEventListener('keydown', (e) => {
    if (menuOpen() && (e.code === 'Enter' || e.code === 'Space')) startGame();
    if (e.code === 'KeyM') showMap = !showMap;
  });

  // Κλείδωμα zoom / scroll / μενού στα κινητά.
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  resize();
  requestAnimationFrame(frame);
}

init();
