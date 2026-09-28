'use strict';

// ---- Ρυθμίσεις παίκτη / ήχων ----
const PLAYER_RADIUS = 7;
const PLAYER_SPEED = 110;          // μονάδες κόσμου / δευτ.
const STEP_LENGTH = 30;            // απόσταση ανάμεσα σε δύο βήματα

const STEP_WAVE = { minR: 30, maxR: 65, minS: 0.08, maxS: 0.22 };   // αχνά βήματα
const CALL_WAVE = { minR: 110, maxR: 560, minS: 0.5, maxS: 1.0 };   // το "κύμα" του παίκτη

// Πόσος κόσμος χωράει στην οθόνη (τουλάχιστον τόσο πλάτος / ύψος).
const VIEW_MIN_W = 440;
const VIEW_MIN_H = 700;

// ---- Κατάσταση ----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const titleEl = document.getElementById('title');

let cssW = 0, cssH = 0, dpr = 1, scale = 1;
let state = 'title';
let gameTime = 0;
let lastFrame = 0;
let showMap = false;   // βοήθεια για δοκιμές: πλήκτρο M

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

  const ox = player.x, oy = player.y;
  player.x += mx * PLAYER_SPEED * dt;
  resolveWalls(player);
  player.y += my * PLAYER_SPEED * dt;
  resolveWalls(player);

  // Βήματα: όσο πιο αργά περπατάς, τόσο πιο αθόρυβα.
  const moved = Math.hypot(player.x - ox, player.y - oy);
  player.stepDist += moved;
  if (player.stepDist >= STEP_LENGTH) {
    player.stepDist -= STEP_LENGTH;
    player.foot = -player.foot;
    const len = Math.hypot(mx, my);
    const side = 3 * player.foot;
    const fx = player.x - (my / len) * side;
    const fy = player.y + (mx / len) * side;
    const k = Math.min(1, amount);
    Echoes.emit(fx, fy,
      STEP_WAVE.minR + (STEP_WAVE.maxR - STEP_WAVE.minR) * k,
      STEP_WAVE.minS + (STEP_WAVE.maxS - STEP_WAVE.minS) * k,
      'step');
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

  if (state !== 'play') return;

  const halfW = cssW / 2 / scale, halfH = cssH / 2 / scale;
  const view = {
    x0: camera.x - halfW, x1: camera.x + halfW,
    y0: camera.y - halfH, y1: camera.y + halfH,
  };

  const s = scale * dpr;
  ctx.setTransform(s, 0, 0, s, (cssW / 2 - camera.x * scale) * dpr, (cssH / 2 - camera.y * scale) * dpr);

  if (showMap) drawDebugMap();

  Echoes.draw(ctx, gameTime, view, scale);
  drawPlayer();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawJoystick();
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

  let dx = j.x - j.ox, dy = j.y - j.oy;
  const len = Math.hypot(dx, dy);
  if (len > JOY_RADIUS) { dx *= JOY_RADIUS / len; dy *= JOY_RADIUS / len; }
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(j.ox + dx, j.oy + dy, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawDebugMap() {
  ctx.fillStyle = 'rgba(255,60,60,0.12)';
  for (let ty = 0; ty < Level.rows; ty++) {
    for (let tx = 0; tx < Level.cols; tx++) {
      if (Level.isWall(tx, ty)) ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
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
    Echoes.update(dt, gameTime);

    // Η κάμερα ακολουθεί τον παίκτη απαλά.
    const follow = 1 - Math.pow(0.001, dt);
    camera.x += (player.x - camera.x) * follow;
    camera.y += (player.y - camera.y) * follow;
  }

  draw();
  requestAnimationFrame(frame);
}

// ---- Έναρξη ----
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

function startGame() {
  if (state === 'play') return;
  // Σε κινητό ζητάμε full screen. Στον υπολογιστή όχι, για να μένουν τα devtools άνετα.
  if (matchMedia('(pointer: coarse)').matches) goFullscreen();
  titleEl.classList.add('hidden');
  Input.cancelCharge();   // το Space που ξεκίνησε το παιχνίδι να μη βγάλει κύμα
  state = 'play';
  // Μια πρώτη ανάσα: ένα μέτριο κύμα για να δεις πού βρίσκεσαι.
  Echoes.emit(player.x, player.y, 220, 0.6, 'call');
}

function init() {
  Level.load(LEVEL_1);
  Echoes.init();
  player.x = camera.x = Level.start.x;
  player.y = camera.y = Level.start.y;

  Input.now = () => gameTime;
  Input.onRelease = emitCall;
  Input.init(canvas);

  titleEl.addEventListener('pointerup', (e) => { e.preventDefault(); startGame(); });
  window.addEventListener('keydown', (e) => {
    if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) startGame();
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
