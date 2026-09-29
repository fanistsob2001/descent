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
// πριν ο παίκτης ξαναβγεί στον τελευταίο βωμό (δευτ.).
const DEATH_DELAY = 1.7;

// Οδηγίες χειρισμού (όχι κείμενα της ιστορίας): πώς πετάς αγγείο / παίζεις τη Μελωδία.
const JAR_HINTS = [
  { touch: 'Tap the jar button at the top right to throw it where you are heading.',
    keys: 'Press E to throw the jar where you are heading.', until: 'jar', time: 10 },
];
const MELODY_HINTS = [
  { touch: 'Tap the lyre button to play.', keys: 'Press Q to play the lyre.', until: 'melody', time: 10 },
];

// Ένταση του ambient βουητού ανά κατάσταση.
const AMBIENT = { play: 1, paused: 0.4, menu: 0.6, dead: 0.25, end: 0.5 };

// ---- Στοιχεία σελίδας ----
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d', { alpha: false });
const screens = {
  menu: $('menu'), settings: $('settings'), pause: $('pause'), end: $('end'),
};
const hudEl = $('hud');
const jarBtn = $('btn-jar');
const melodyBtn = $('btn-melody');

// ---- Κατάσταση ----
let cssW = 0, cssH = 0, dpr = 1, scale = 1;
// 'menu' | 'play' | 'paused' | 'dead' | 'end'
let state = 'menu';
let chapter = -1;        // ο τελευταίος βωμός που άναψε (-1 = κανένας ακόμα)
let strings = 0;         // χορδές της λύρας (0..3)
let hasObol = false;     // έχει οβολό (για τον Χάροντα)
let jarsFound = false;   // έχει βρει ήδη αγγείο (για να φανεί η οδηγία ρίψης μόνο μία φορά)
let hudRegion = -1;      // σε ποιο κεφάλαιο δείχνει τώρα το HUD
let gameTime = 0;
let lastFrame = 0;
let endTime = 0;         // πότε πέθανε
let monsters = [];
let killer = null;       // η σκιά που έπιασε τον παίκτη
let showMap = false;     // βοήθεια για δοκιμές: πλήκτρο M

// fx, fy = προς τα πού "κοιτάει" (τελευταία κατεύθυνση κίνησης) — εκεί πετιέται το αγγείο.
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

function throwJar() {
  if (state !== 'play') return;
  if (Jars.throw(player.x, player.y, player.fx, player.fy)) {
    Sound.jarThrow();
    Hints.notify('jar');
    updateHud();
  }
}

function playMelody() {
  if (state !== 'play' || strings < 3) return;
  if (Melody.play(player, monsters, gameTime) >= 0) {
    Hints.notify('melody');
    updateHud();
  }
}

// Ο παίκτης μάζεψε ένα αντικείμενο.
function pickUp(it) {
  if (it.kind === 'jar') {
    Jars.left++;
    Sound.jarPickup();
    Notice.show('A libation jar. The dead hunger for offerings. Throw it, and they will come.', gameTime, 6);
    if (!jarsFound) Hints.push(JAR_HINTS);
    jarsFound = true;
  } else if (it.kind === 'obol') {
    hasObol = true;
    Sound.coin();
  } else if (it.kind === 'string') {
    strings = Math.min(3, strings + 1);
    Sound.stringFound(strings);
    if (strings < 3) {
      Notice.show(`You found a string (${strings}/3).`, gameTime, 4);
    } else {
      Notice.show('Your lyre is whole again. When you play, the shades remember they were once alive.', gameTime, 7);
      Melody.uses = MELODY_USES;
      Hints.push(MELODY_HINTS);
    }
  }
  updateHud();
}

// Ο Χάροντας στην πύλη του κεφαλαίου II.
function checkCharon() {
  const r = Charon.check(player, hasObol, gameTime);
  if (r === 'empty') {
    Notice.show('Charon holds out his hand. Yours is empty.', gameTime, 5);
    Sound.charonRefuse();
  } else if (r === 'paid') {
    hasObol = false;
    Notice.show('The obol clinks into his palm. The boat begins to move.', gameTime, 6);
    Sound.charonPaid();
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
  Altars.draw(ctx, gameTime, view);
  ExitDoor.draw(ctx, gameTime);
  Items.draw(ctx, gameTime, view);
  Charon.draw(ctx, gameTime);
  Jars.draw(ctx, gameTime);
  Melody.draw(ctx, gameTime);

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
    Jars.update(dt, gameTime);
    Echoes.update(dt, gameTime);
    Hints.update(gameTime);
    Notice.update(gameTime);

    killer = monsters.find((m) => m.touches(player)) || null;
    const lit = killer ? -1 : Altars.check(player, gameTime);
    const item = killer ? null : Items.check(player);
    if (killer) die();
    else if (lit >= 0) lightAltar(lit);
    else if (ExitDoor.reached(player)) reachedExit();
    if (item) pickUp(item);
    if (state === 'play') checkCharon();

    const region = Level.regionAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    if (region !== hudRegion) updateHud();

    // Η κάμερα ακολουθεί τον παίκτη απαλά.
    const follow = 1 - Math.pow(0.001, dt);
    camera.x += (player.x - camera.x) * follow;
    camera.y += (player.y - camera.y) * follow;
  } else if (state === 'dead') {
    gameTime += dt;
    Echoes.update(dt, gameTime);
    // Μετά το jump scare: πίσω στον τελευταίο βωμό, με ό,τι είχες εκεί.
    if (gameTime - endTime >= DEATH_DELAY) {
      Sound.gameOver();
      continueGame();
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
  if (name === 'menu') {
    // Continue μόνο αν υπάρχει save· τότε είναι και το κύριο κουμπί (Enter).
    const hasSave = Save.exists();
    $('btn-continue').classList.toggle('hidden', !hasSave);
    $('btn-continue').classList.toggle('primary', hasSave);
    $('btn-new').classList.toggle('primary', !hasSave);
  }
  if (name === 'pause') {
    const ch = CHAPTERS[Math.max(0, chapter)];
    $('pause-chapter').textContent = `${ch.numeral}. ${ch.name}`;
    $('pause-objective').textContent = ch.objective(strings);
  }
}

function updateToggleLabels() {
  for (const b of document.querySelectorAll('.sound-toggle')) {
    b.textContent = Settings.sound ? 'Sound: on' : 'Sound: off';
  }
  for (const b of document.querySelectorAll('.vibration-toggle')) {
    b.textContent = Settings.vibration ? 'Vibration: on' : 'Vibration: off';
  }
}

function updateHud() {
  // Το κουμπί του αγγείου εμφανίζεται μόλις βρεις το πρώτο· της λύρας με την 3η χορδή.
  jarBtn.classList.toggle('hidden', !jarsFound);
  jarBtn.classList.toggle('empty', Jars.left === 0);
  $('jar-count').textContent = String(Jars.left);
  melodyBtn.classList.toggle('hidden', strings < 3);
  melodyBtn.classList.toggle('empty', Melody.uses === 0);
  $('melody-count').textContent = String(Melody.uses);
  const r = Level.regionAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  hudRegion = r;
  $('level-label').textContent = r >= 0 ? CHAPTERS[r].numeral : '';
  // Οι χορδές φαίνονται από το κεφάλαιο II (εκεί βρίσκεται η πρώτη).
  $('strings-label').textContent = Math.max(r, chapter) >= 1 || strings > 0 ? `Strings: ${strings}/3` : '';
}

// Τίτλος κεφαλαίου στη μέση της οθόνης (καλείται από την ουρά μηνυμάτων).
function showChapterTitle(ch) {
  const el = $('level-intro');
  $('intro-number').textContent = ch.numeral;
  $('intro-name').textContent = ch.name;
  $('intro-line').textContent = ch.line;
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

// Τα μηνύματα που βγαίνουν όταν ανάβει ο βωμός ενός κεφαλαίου (STORY.md, ενότητα 2).
function chapterMessages(i) {
  const ch = CHAPTERS[i];
  return [
    { touch: 'The flame is lit. Your progress is saved.', time: 3.5 },
    { title: ch, time: 5 },
    { touch: ch.objective(strings), time: 8 },
    // Η οδηγία κίνησης έχει ήδη φανεί στην αρχή (και για να φτάσει εδώ, ο παίκτης κινήθηκε).
    ...ch.hints.filter((h) => h.until !== 'move'),
  ];
}

// Βάζει τον παίκτη στον κόσμο με την κατάσταση ενός save (βλ. Save.fresh()).
// chapter -1 = καινούργιο παιχνίδι (από την αφετηρία).
function spawn(saved) {
  goFullscreen();
  chapter = saved.chapter;
  strings = saved.strings;
  hasObol = saved.obol;
  jarsFound = saved.jars > 0 || saved.taken.some((id) => Level.items[id] && Level.items[id].kind === 'jar');

  Echoes.init();
  monsters = Level.monsters.map((m) => new Monster(m.x, m.y, m.guard, m.region));
  killer = null;
  ExitDoor.reset();
  Altars.reset(chapter);
  Items.reset(saved.taken);
  Charon.reset(saved.paid);
  Jars.reset(saved.jars);
  Melody.reset(saved.melody);
  Notice.clear();
  Echoes.listeners = [...monsters, ExitDoor, Charon, ...Altars.list, ...Items.list];

  const at = chapter >= 0 ? Level.altars[chapter] : Level.start;
  player.x = camera.x = at.x;
  player.y = camera.y = at.y;
  player.stepDist = 0;
  // Αρχική κατεύθυνση: προς τον πρώτο ανοιχτό διάδρομο (προτιμάει κάτω και δεξιά).
  const stx = Math.floor(player.x / TILE), sty = Math.floor(player.y / TILE);
  const open = [[0, 1], [1, 0], [-1, 0], [0, -1]].find(([dx, dy]) => !Level.isWall(stx + dx, sty + dy));
  [player.fx, player.fy] = open || [0, 1];

  stopInput();
  Dread.reset();
  setState('play');
  showScreen(null);
  updateHud();
  // Καινούργιο παιχνίδι: πρώτα πώς κινείσαι (ο πρώτος βωμός είναι ένα βήμα μακριά).
  // Μετά από θάνατο / Continue: θύμισε τον στόχο του κεφαλαίου.
  Hints.start(chapter >= 0
    ? [{ touch: CHAPTERS[chapter].objective(strings), time: 6 }]
    : CHAPTERS[0].hints.filter((h) => h.until === 'move'), gameTime);

  // Μια πρώτη ανάσα: ένα μέτριο κύμα για να δεις πού βρίσκεσαι.
  Echoes.emit(player.x, player.y, 220, 0.6, 'call');
  Sound.ping(0.3);
}

function newGame() {
  Save.clear();
  spawn(Save.fresh());
}

function continueGame() {
  spawn(Save.load() || Save.fresh());
}

// Ο παίκτης έφτασε στον βωμό του κεφαλαίου i: η Μελωδία ξαναγεμίζει και
// αποθηκεύονται όλα όπως είναι τώρα.
function lightAltar(i) {
  chapter = i;
  if (strings >= 3) Melody.uses = MELODY_USES;
  Save.write({
    chapter: i, jars: Jars.left, strings, obol: hasObol, paid: Charon.paid,
    melody: Melody.uses, taken: Items.takenIds(),
  });
  Sound.win();
  updateHud();
  Hints.start(chapterMessages(i), gameTime);
}

function die() {
  setState('dead');
  endTime = gameTime;
  stopInput();
  Hints.stop();
  Notice.clear();
  showScreen(null);
  Scare.prepare();
  Sound.scare();
  vibrate([250, 60, 500]);
}

// Προσωρινό τέλος — τα δύο κανονικά τέλη έρχονται στο στάδιο 3.
function reachedExit() {
  setState('end');
  stopInput();
  Hints.stop();
  Notice.clear();
  Sound.win();
  showScreen('end');
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
  Notice.clear();
  showScreen('menu');
}

function doAction(action) {
  Sound.unlock();   // πρέπει να γίνει μέσα στο πάτημα του κουμπιού (iPhone)
  blurButtons();
  if (action === 'new') newGame();
  else if (action === 'continue') continueGame();
  else if (action === 'settings') showScreen('settings');
  else if (action === 'back') showScreen('menu');
  else if (action === 'resume') resumeGame();
  else if (action === 'menu') goToMenu();
  else if (action === 'sound') { Sound.setMuted(!Sound.muted); updateToggleLabels(); }
  else if (action === 'vibration') {
    Settings.vibration = !Settings.vibration;
    Settings.store();
    updateToggleLabels();
    vibrate(40);   // μικρό "τσίμπημα" για να νιώσεις ότι άνοιξε
  }
}

// Η ορατή οθόνη (αν υπάρχει).
function visibleScreen() {
  for (const key in screens) {
    if (!screens[key].classList.contains('hidden')) return screens[key];
  }
  return null;
}

// ---- Έναρξη ----
function init() {
  Settings.load();
  Sound.loadSettings();
  updateToggleLabels();
  Hints.init($('hint'));
  Notice.init($('notice'));
  Hints.onTitle = showChapterTitle;

  Level.loadWorld(CHAPTERS);
  player.x = camera.x = Level.start.x;
  player.y = camera.y = Level.start.y;

  Input.now = () => gameTime;
  Input.onRelease = emitCall;
  Input.init(canvas);

  for (const btn of document.querySelectorAll('[data-action]')) {
    btn.addEventListener('click', (e) => { e.preventDefault(); doAction(btn.dataset.action); });
  }
  $('btn-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); pauseGame(); });
  jarBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); throwJar(); });
  melodyBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); playMelody(); });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      // Enter = το κύριο κουμπί της οθόνης που φαίνεται.
      e.preventDefault();
      const scr = visibleScreen();
      const primary = scr && scr.querySelector('.primary:not(.hidden)');
      if (primary) doAction(primary.dataset.action);
    } else if (e.code === 'Escape' || e.code === 'KeyP') {
      if (state === 'play') pauseGame();
      else if (state === 'paused') resumeGame();
    } else if (e.code === 'KeyE' && !e.repeat) {
      throwJar();
    } else if (e.code === 'KeyQ' && !e.repeat) {
      playMelody();
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
