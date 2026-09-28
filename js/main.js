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

// Πόσο κρατάει η "στιγμή" του θανάτου (jump scare + κόκκινο σβήσιμο)
// πριν βγει η οθόνη Game Over (δευτ.).
const DEATH_DELAY = 1.7;

// Ένταση του ambient βουητού ανά κατάσταση.
const AMBIENT = { play: 1, paused: 0.4, menu: 0.6, dead: 0.25, cleared: 0.5, end: 0.5 };

// ---- Στοιχεία σελίδας ----
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });
const screens = {
  menu: $('menu'), pause: $('pause'), gameover: $('gameover'), cleared: $('cleared'), end: $('end'),
};
const hudEl = $('hud');
const lureBtn = $('btn-lure');

// ---- Κατάσταση ----
let cssW = 0, cssH = 0, dpr = 1, scale = 1;
// 'menu' | 'play' | 'paused' | 'dead' | 'cleared' | 'end'
let state = 'menu';
let levelIndex = 0;
let gameTime = 0;
let lastFrame = 0;
let runStart = 0;        // πότε ξεκίνησε η τωρινή προσπάθεια
let endTime = 0;         // πότε πέθανε / τελείωσε το επίπεδο
let monsters = [];
let killer = null;       // το τέρας που έπιασε τον παίκτη
let showMap = false;     // βοήθεια για δοκιμές: πλήκτρο M

// fx, fy = προς τα πού "κοιτάει" (τελευταία κατεύθυνση κίνησης) — εκεί πετιέται το δόλωμα.
const player = { x: 0, y: 0, r: PLAYER_RADIUS, stepDist: 0, foot: 1, fx: 0, fy: 1 };
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

// ---- Παίκτης ----
function updatePlayer(dt) {
  const mx = Input.moveX, my = Input.moveY;
  const amount = Math.hypot(mx, my);
  if (amount < 0.01) return;

  const speed = Input.running
    ? RUN_SPEED
    : SNEAK_SPEED * Math.min(1, amount / RUN_THRESHOLD);
  const ux = mx / amount, uy = my / amount;
  player.fx = ux;
  player.fy = uy;

  const ox = player.x, oy = player.y;
  player.x += ux * speed * dt;
  Level.pushOutOfWalls(player);
  player.y += uy * speed * dt;
  Level.pushOutOfWalls(player);

  Hints.notify('move', dt);
  if (!Input.running) {
    Hints.notify('sneak', dt);
    return;
  }

  // Βήματα: μόνο το γρήγορο περπάτημα κάνει θόρυβο.
  player.stepDist += Math.hypot(player.x - ox, player.y - oy);
  if (player.stepDist >= STEP_LENGTH) {
    player.stepDist -= STEP_LENGTH;
    player.foot = -player.foot;
    const side = 3 * player.foot;
    Echoes.emit(player.x - uy * side, player.y + ux * side,
      STEP_WAVE.radius, STEP_WAVE.strength, 'step');
    Sound.step();
  }
}

function emitCall(held) {
  if (state !== 'play') return;
  const c = Math.min(1, held / MAX_CHARGE);
  Echoes.emit(player.x, player.y,
    CALL_WAVE.minR + (CALL_WAVE.maxR - CALL_WAVE.minR) * c,
    CALL_WAVE.minS + (CALL_WAVE.maxS - CALL_WAVE.minS) * c,
    'call');
  Sound.ping(c);
  Hints.notify('call');
}

function throwLure() {
  if (state !== 'play') return;
  if (Lures.throw(player.x, player.y, player.fx, player.fy, gameTime)) {
    Sound.lureThrow();
    Hints.notify('lure');
    updateHud();
  }
}

// ---- Σχεδίαση ----
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'menu') return;

  // Jump scare: το πρόσωπο καλύπτει τα πάντα για λίγο.
  if (state === 'dead' && gameTime - endTime < SCARE_TIME) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Scare.draw(ctx, cssW, cssH, gameTime - endTime);
    return;
  }

  const halfW = cssW / 2 / scale, halfH = cssH / 2 / scale;
  const view = {
    x0: camera.x - halfW, x1: camera.x + halfW,
    y0: camera.y - halfH, y1: camera.y + halfH,
  };

  const [shakeX, shakeY] = state === 'play' ? Dread.shake() : [0, 0];
  const s = scale * dpr;
  ctx.setTransform(s, 0, 0, s,
    (cssW / 2 - camera.x * scale + shakeX) * dpr,
    (cssH / 2 - camera.y * scale + shakeY) * dpr);

  if (showMap) drawDebugMap();

  Echoes.draw(ctx, gameTime, view, scale);
  ExitDoor.draw(ctx, gameTime);
  Lures.draw(ctx, gameTime);

  for (const m of monsters) {
    if (state === 'dead' && m === killer) {
      // Το τέρας φαίνεται ολόκληρο εκεί που σε έπιασε.
      m.draw(ctx, gameTime, Math.max(0.25, 1 - deathFade() * 0.6));
    } else {
      m.draw(ctx, gameTime);
    }
  }
  drawPlayer();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state === 'play' || state === 'paused') Dread.drawVignette(ctx, cssW, cssH, gameTime);
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

// 0..1: πόσο έχει προχωρήσει το κόκκινο σβήσιμο μετά το jump scare.
function deathFade() {
  return Math.max(0, Math.min(1, (gameTime - endTime - SCARE_TIME) / (DEATH_DELAY - SCARE_TIME)));
}

function drawDeathFlash() {
  const t = deathFade();
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
  for (const m of monsters) {
    ctx.fillStyle = m.guard ? 'rgba(255,140,60,0.6)' : 'rgba(255,60,60,0.6)';
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
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
    for (const m of monsters) m.update(dt, gameTime);
    Lures.update(dt, gameTime);
    Echoes.update(dt, gameTime);
    Hints.update(gameTime);

    killer = monsters.find((m) => m.touches(player)) || null;
    if (killer) die();
    else if (ExitDoor.reached(player)) levelCleared();

    // Η κάμερα ακολουθεί τον παίκτη απαλά.
    const follow = 1 - Math.pow(0.001, dt);
    camera.x += (player.x - camera.x) * follow;
    camera.y += (player.y - camera.y) * follow;
  } else if (state === 'dead') {
    gameTime += dt;
    Echoes.update(dt, gameTime);
    if (gameTime - endTime >= DEATH_DELAY && screens.gameover.classList.contains('hidden')) {
      showScreen('gameover');
      Sound.gameOver();
    }
  }

  // Γρύλισμα, καρδιοχτύπι, βινιετάρισμα: μόνο όσο παίζεις.
  Sound.listenerX = player.x;
  Sound.listenerY = player.y;
  Dread.update(dt, gameTime, player, monsters, state === 'play');

  draw();
  requestAnimationFrame(frame);
}

// ---- Οθόνες ----
function showScreen(name) {
  for (const key in screens) screens[key].classList.toggle('hidden', key !== name);
  hudEl.classList.toggle('hidden', state !== 'play' && state !== 'paused');
  if (name === 'menu') buildLevelButtons();
}

function buildLevelButtons() {
  const box = $('level-buttons');
  box.textContent = '';
  for (let i = 0; i < LEVELS.length; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(i + 1);
    const locked = i + 1 > Progress.unlocked;
    b.disabled = locked;
    b.setAttribute('aria-label', locked ? `Level ${i + 1} (locked)` : `Level ${i + 1}`);
    if (i + 1 === Progress.unlocked) b.classList.add('current');
    b.addEventListener('click', () => { blurButtons(); startLevel(i); });
    box.appendChild(b);
  }
}

function updateHud() {
  const total = LEVELS[levelIndex].lures;
  lureBtn.classList.toggle('invisible', total === 0);   // κρατάει τη θέση του, για να μένει κεντραρισμένο το label
  lureBtn.classList.toggle('empty', Lures.left === 0);
  $('lure-count').textContent = String(Lures.left);
  $('level-label').textContent = `Level ${levelIndex + 1}`;
}

function showLevelIntro() {
  const el = $('level-intro');
  $('intro-number').textContent = `Level ${levelIndex + 1}`;
  $('intro-name').textContent = LEVELS[levelIndex].name;
  el.classList.remove('show');
  void el.offsetWidth;   // ξαναξεκινάει το CSS animation
  el.classList.add('show');
}

function blurButtons() {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

// ---- Ροή παιχνιδιού ----
function goFullscreen() {
  if (!matchMedia('(pointer: coarse)').matches) return;   // στο PC όχι
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

function setState(s) {
  state = s;
  Sound.setAmbient(AMBIENT[s]);
}

// Ξεκινάει (ή ξαναξεκινάει) το επίπεδο i (0 = πρώτο).
function startLevel(i) {
  Sound.unlock();   // πρέπει να γίνει μέσα στο πάτημα του κουμπιού (iPhone)
  goFullscreen();
  levelIndex = i;
  const lv = LEVELS[i];

  Level.load(lv.map);
  Echoes.init();
  monsters = Level.monsters.map((m) => new Monster(m.x, m.y, m.guard));
  killer = null;
  ExitDoor.reset();
  Lures.reset(lv.lures);
  Echoes.listeners = [...monsters, ExitDoor];

  player.x = camera.x = Level.start.x;
  player.y = camera.y = Level.start.y;
  player.stepDist = 0;
  // Αρχική κατεύθυνση: προς τον πρώτο ανοιχτό διάδρομο.
  const stx = Math.floor(player.x / TILE), sty = Math.floor(player.y / TILE);
  const open = [[1, 0], [0, 1], [-1, 0], [0, -1]].find(([dx, dy]) => !Level.isWall(stx + dx, sty + dy));
  [player.fx, player.fy] = open || [0, 1];

  stopInput();
  Dread.reset();
  setState('play');
  runStart = gameTime;
  showScreen(null);
  updateHud();
  showLevelIntro();
  Hints.start(lv.hints, gameTime);

  // Μια πρώτη ανάσα: ένα μέτριο κύμα για να δεις πού βρίσκεσαι.
  Echoes.emit(player.x, player.y, 220, 0.6, 'call');
  Sound.ping(0.3);
}

function die() {
  setState('dead');
  endTime = gameTime;
  stopInput();
  Hints.stop();
  showScreen(null);
  Scare.prepare();
  Sound.scare();
  vibrate([250, 60, 500]);
}

function levelCleared() {
  endTime = gameTime;
  stopInput();
  Hints.stop();
  Progress.unlock(levelIndex + 2);
  Sound.win();

  if (levelIndex + 1 >= LEVELS.length) {
    setState('end');
    showScreen('end');
    return;
  }
  setState('cleared');
  const secs = Math.floor(endTime - runStart);
  $('cleared-title').textContent = `Level ${levelIndex + 1} cleared`;
  $('cleared-time').textContent = `Time ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  showScreen('cleared');
}

function pauseGame() {
  if (state !== 'play') return;
  setState('paused');
  stopInput();
  showScreen('pause');
}

function resumeGame() {
  if (state !== 'paused') return;
  setState('play');
  showScreen(null);
}

function goToMenu() {
  setState('menu');
  stopInput();
  Hints.stop();
  showScreen('menu');
}

function updateMuteLabel() {
  $('btn-mute').textContent = Sound.muted ? 'Sound: off' : 'Sound: on';
}

function doAction(action) {
  Sound.unlock();
  blurButtons();
  if (action === 'play') startLevel(Progress.unlocked - 1);
  else if (action === 'resume') resumeGame();
  else if (action === 'restart') startLevel(levelIndex);
  else if (action === 'next') startLevel(levelIndex + 1);
  else if (action === 'menu') goToMenu();
  else if (action === 'mute') { Sound.setMuted(!Sound.muted); updateMuteLabel(); }
}

// Η ορατή οθόνη (αν υπάρχει) και το κύριο κουμπί της.
function visibleScreen() {
  for (const key in screens) {
    if (!screens[key].classList.contains('hidden')) return screens[key];
  }
  return null;
}

// ---- Έναρξη ----
function init() {
  Progress.load();
  Sound.loadSettings();
  updateMuteLabel();
  Hints.init($('hint'));

  Input.now = () => gameTime;
  Input.onRelease = emitCall;
  Input.init(canvas);

  for (const btn of document.querySelectorAll('[data-action]')) {
    btn.addEventListener('click', (e) => { e.preventDefault(); doAction(btn.dataset.action); });
  }
  $('btn-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); pauseGame(); });
  lureBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); throwLure(); });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      // Enter = το κύριο κουμπί της οθόνης που φαίνεται.
      e.preventDefault();
      const scr = visibleScreen();
      const primary = scr && scr.querySelector('.primary');
      if (primary) doAction(primary.dataset.action);
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      if (state === 'play') pauseGame();
      else if (state === 'paused') resumeGame();
    } else if (e.code === 'KeyE' && !e.repeat) {
      throwLure();
    } else if (e.code === 'KeyM') {
      showMap = !showMap;
    }
  });

  // Αν η σελίδα κρυφτεί (π.χ. έρχεται κλήση), το παιχνίδι μπαίνει σε παύση
  // και ο ήχος σταματάει.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
    Sound.setBackground(document.hidden);
  });

  // Κλείδωμα zoom / scroll / μενού στα κινητά.
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  resize();
  showScreen('menu');
  requestAnimationFrame(frame);
}

init();
