'use strict';

// ---- Ρυθμίσεις παίκτη / ήχων ----
const PLAYER_RADIUS = 7;
const RUN_SPEED = 115;             // γρήγορο περπάτημα, μονάδες κόσμου / δευτ.
const SNEAK_SPEED = 50;            // αργό, αθόρυβο περπάτημα
const STEP_LENGTH = 32;            // απόσταση ανάμεσα σε δύο βήματα

const STEP_WAVE = { radius: 65, strength: 0.22 };                   // αχνά βήματα (μόνο όταν τρέχεις)
const CALL_WAVE = { minR: 110, maxR: 560, minS: 0.5, maxS: 1.0 };   // το "κύμα" του παίκτη

// Πόσος κόσμος χωράει στην οθόνη (τουλάχιστον τόσο πλάτος / ύψος σε κατακόρυφη θέση·
// σε οριζόντια οι δύο τιμές αλλάζουν θέση, ώστε οι μορφές να έχουν το ίδιο μέγεθος).
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
const AMBIENT = { play: 1, paused: 0.4, menu: 0.6, dead: 0.25, cutscene: 0.35, end: 0.5 };

// ---- Στοιχεία σελίδας ----
const $ = (id) => document.getElementById(id);
const canvas = $('game');
let ctx = canvas.getContext('2d', { alpha: false });
const screens = {
  menu: $('menu'), settings: $('settings'), pause: $('pause'),
  endGood: $('end-good'), endBad: $('end-bad'),
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
const player = {
  x: 0, y: 0, r: PLAYER_RADIUS, stepDist: 0, foot: 1, fx: 0, fy: 1,
  dir: 1,          // προς ποια πλευρά κοιτάει η μορφή (1 = δεξιά)
  walkPhase: 0,    // φάση του βηματισμού (ακτίνια)
  walkSpeed: 0,    // 0..1, εξομαλυμένη ταχύτητα για την κίνηση των ποδιών
};
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
  const landscape = cssW > cssH;
  scale = landscape
    ? Math.min(cssW / VIEW_MIN_H, cssH / VIEW_MIN_W)
    : Math.min(cssW / VIEW_MIN_W, cssH / VIEW_MIN_H);
  document.body.classList.toggle('landscape', landscape);
  Pixel.resize(cssW, cssH);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

// ---- Παίκτης ----
function updatePlayer(dt) {
  const mx = Input.moveX, my = Input.moveY;
  const amount = Math.hypot(mx, my);
  // Η κίνηση των ποδιών ακολουθεί ομαλά το αν περπατάς (και πόσο γρήγορα).
  const target = amount < 0.01 ? 0 : (Input.running ? 1 : 0.55);
  player.walkSpeed += (target - player.walkSpeed) * Math.min(1, dt * 10);
  if (amount < 0.01) return;

  const speed = Input.running
    ? RUN_SPEED
    : SNEAK_SPEED * Math.min(1, amount / RUN_THRESHOLD);
  const ux = mx / amount, uy = my / amount;
  player.fx = ux;
  player.fy = uy;
  if (Math.abs(ux) > 0.15) player.dir = ux < 0 ? -1 : 1;

  const ox = player.x, oy = player.y;
  player.x += ux * speed * dt;
  Level.pushOutOfWalls(player);
  player.y += uy * speed * dt;
  Level.pushOutOfWalls(player);
  player.walkPhase += Math.hypot(player.x - ox, player.y - oy) * 0.11;

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

// Κύμα που ακυρώθηκε με σύρσιμο: απαλός ήχος "ξεφουσκώματος" και το δαχτυλίδι μαζεύεται.
const cancelFx = { t: -1e6, r: 0 };
function cancelCall(amount) {
  if (state !== 'play') return;
  cancelFx.t = gameTime;
  cancelFx.r = player.r + 4 + amount * 16;
  Sound.cancel();
}

function emitCall(held) {
  if (state !== 'play') return;
  const c = Math.min(1, held / MAX_CHARGE);
  Echoes.emit(player.x, player.y,
    CALL_WAVE.minR + (CALL_WAVE.maxR - CALL_WAVE.minR) * c,
    CALL_WAVE.minS + (CALL_WAVE.maxS - CALL_WAVE.minS) * c,
    'call');
  Sound.voice(c, strings >= 3);
  Hints.notify('call');
  if (c >= LOOK_BACK_CHARGE && lookBackRuleActive()) lookBack();
}

// Στο V, όσο φορτίζεις πέρα από το όριο: ήχος έντασης που ανεβαίνει και παλμοί δόνησης.
let warnOn = false, nextWarnPulse = 0;
function updateLookBackWarning() {
  const warn = state === 'play' && Input.charging && Input.chargeAmount() >= LOOK_BACK_CHARGE && lookBackRuleActive();
  if (warn && !warnOn) {
    Sound.tension(true);
    vibrate([60, 40, 60]);
    nextWarnPulse = gameTime + 0.45;
  } else if (!warn && warnOn) {
    Sound.tension(false);
  }
  if (warn && gameTime >= nextWarnPulse) {
    vibrate(35);
    nextWarnPulse = gameTime + 0.45;
  }
  warnOn = warn;
}

// Μια σκιά μόλις άκουσε κάτι: ψιθυρίζει (STORY.md, ενότητα 10) — αν είναι αρκετά
// κοντά για να την ακούσεις, και όχι συνέχεια (κάθε σκιά το πολύ κάθε 9 δευτ.,
// και καμία αν μιλάει ήδη άλλη).
let lastShadeVoice = -1e6;
function shadeSpeaks(m) {
  if (state !== 'play') return;
  if (Math.hypot(m.x - player.x, m.y - player.y) > 460) return;
  if (gameTime - (m.spokeAt || -1e6) < 9 || gameTime - lastShadeVoice < 3.5) return;
  m.spokeAt = lastShadeVoice = gameTime;
  const line = STORY.shadeLines[Math.floor(Math.random() * STORY.shadeLines.length)];
  const d = Voice.say(line, 'shade', { x: m.x, y: m.y });
  if (!Notice.busy(gameTime)) Notice.show(line, gameTime, d + 1, null, 'shade');
}

// Ο κανόνας "μην κοιτάξεις πίσω" ισχύει όσο η Ευρυδίκη ακολουθεί, μέσα στο κεφάλαιο V.
function lookBackRuleActive() {
  return Eurydice.following() && playerRegion() === CHAPTERS.length - 1;
}

function playerRegion() {
  return Level.regionAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
}

// Κοίταξες πίσω: ψίθυρος, και τα βήματά της σταματούν για πάντα.
function lookBack() {
  Eurydice.lose();
  const d = Voice.say(STORY.whisper, 'eurydice', { x: Eurydice.x, y: Eurydice.y, fade: true });
  Notice.show(STORY.whisper, gameTime, Math.max(2.5, d + 0.6), { text: STORY.footstepsStop, time: 6 });
  Notice.el.classList.add('whisper');
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
    Notice.show(STORY.jar, gameTime, 6);
    if (!jarsFound) Hints.push(JAR_HINTS);
    jarsFound = true;
  } else if (it.kind === 'obol') {
    hasObol = true;
    Sound.coin();
  } else if (it.kind === 'string') {
    strings = Math.min(3, strings + 1);
    Sound.stringFound(strings);
    if (strings < 3) {
      Notice.show(STORY.string(strings), gameTime, 4);
    } else {
      Notice.show(STORY.lyreWhole, gameTime, 7);
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
    const d = Voice.say(STORY.charonEmpty, 'charon', { x: Charon.x, y: Charon.y });
    Notice.show(STORY.charonEmpty, gameTime, Math.max(5, d + 1), null, 'charon');
  } else if (r === 'paid') {
    hasObol = false;
    const d = Voice.say(STORY.charonPaid, 'charon', { x: Charon.x, y: Charon.y, delay: 0.5 });
    Notice.show(STORY.charonPaid, gameTime, Math.max(6, d + 1.5), null, 'charon');
    Sound.charonPaid();
  }
}

// ---- Σχεδίαση ----
// Όλα ζωγραφίζονται σε pixel art στον μικρό καμβά (js/pixel.js) και μετά μεγαλώνουν.
// Μόνο ό,τι πρέπει να διαβάζεται (τα λόγια των ψυχών) και το joystick ζωγραφίζονται
// σε πλήρη ανάλυση από πάνω.
let pxScale = 1;   // art pixels ανά μονάδα κόσμου

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pc = Pixel.begin();
  const W = Pixel.w, H = Pixel.h;

  if (state === 'menu') {
    Fx.drawMenu(pc, W, H, performance.now() / 1000);
    Pixel.present(ctx, dpr);
    return;
  }
  if (state === 'cutscene') return;

  // Jump scare: το πρόσωπο καλύπτει τα πάντα για λίγο, και η οθόνη τινάζεται.
  if (state === 'dead' && gameTime - endTime < SCARE_TIME) {
    Scare.draw(pc, W, H, gameTime - endTime);
    const k = 1 - (gameTime - endTime) / SCARE_TIME;
    Pixel.present(ctx, dpr, (Math.random() - 0.5) * 6 * k, (Math.random() - 0.5) * 6 * k);
    return;
  }

  pxScale = scale / Pixel.px;
  const halfW = W / 2 / pxScale, halfH = H / 2 / pxScale;
  const view = {
    x0: camera.x - halfW, x1: camera.x + halfW,
    y0: camera.y - halfH, y1: camera.y + halfH,
  };

  // Τρέμουλο: από τον τρόμο όσο παίζεις, και ένα τίναγμα που σβήνει μετά τον θάνατο.
  let [shakeX, shakeY] = state === 'play' ? Dread.shake() : [0, 0];
  if (state === 'dead') {
    const k = Math.max(0, 1 - (gameTime - endTime - SCARE_TIME) / (DEATH_DELAY - SCARE_TIME));
    shakeX = (Math.random() - 0.5) * 10 * k;
    shakeY = (Math.random() - 0.5) * 10 * k;
  }
  // Η κάμερα "κουμπώνει" σε ακέραια art pixels, ώστε τα pixels να μη "κολυμπάνε".
  const camX = Math.round(W / 2 - camera.x * pxScale);
  const camY = Math.round(H / 2 - camera.y * pxScale);
  pc.setTransform(pxScale, 0, 0, pxScale, camX, camY);

  const saved = ctx;
  ctx = pc;   // οι βοηθητικές συναρτήσεις (drawPlayer κ.λπ.) ζωγραφίζουν στο ctx
  if (showMap) drawDebugMap();

  Echoes.draw(pc, gameTime, view, pxScale);
  Altars.draw(pc, gameTime, view);
  ExitDoor.draw(pc, gameTime);
  Items.draw(pc, gameTime, view);
  Eggs.draw(pc, gameTime, view);
  Charon.draw(pc, gameTime);
  Jars.draw(pc, gameTime);
  Melody.draw(pc, gameTime);
  Fx.drawMotes(pc, gameTime);

  for (const m of monsters) {
    if (state === 'dead' && m === killer) {
      // Το τέρας φαίνεται ολόκληρο εκεί που σε έπιασε.
      m.draw(pc, gameTime, Math.max(0.25, 1 - deathFade() * 0.6));
    } else {
      m.draw(pc, gameTime);
    }
  }
  drawPlayer();

  pc.setTransform(1, 0, 0, 1, 0, 0);
  if (state === 'play' || state === 'paused') Dread.drawVignette(pc, W, H, gameTime);
  // Λεπτός μαίανδρος πάνω και κάτω, σαν το στεφάνι ενός αγγείου.
  Pottery.meander(pc, 0, 0, W, 7, POT.terra, 0.35, 1);
  Pottery.meander(pc, 0, H - 7, W, 7, POT.terra, 0.35, 1);
  if (state === 'dead') drawDeathFlash(W, H);
  ctx = saved;

  Pixel.present(ctx, dpr, shakeX, shakeY);

  // Από πάνω, σε πλήρη ανάλυση: τα λόγια των ψυχών (για να διαβάζονται) και το joystick.
  const k = Pixel.px * dpr;
  ctx.setTransform(pxScale * k, 0, 0, pxScale * k, (camX + shakeX) * k, (camY + shakeY) * k);
  Souls.draw(ctx, gameTime, view);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state === 'play') drawJoystick();
}

function drawPlayer() {
  const c = Input.chargeAmount();

  // Φόρτιση: ένα δαχτυλίδι που μεγαλώνει και "τρέμει" όσο κρατάς.
  if (Input.charging) {
    const pulse = 0.5 + 0.5 * Math.sin(gameTime * (8 + c * 16));
    const rr = player.r + 4 + c * 16;
    const rule = lookBackRuleActive();
    const warn = c >= LOOK_BACK_CHARGE && rule;
    // Όσο σέρνεις το δάχτυλο για ακύρωση, το δαχτυλίδι ξεθωριάζει και γίνεται διακεκομμένο.
    const drag = Input.chargeDrag;
    const fadeDrag = 1 - drag * 0.75;
    if (drag > 0.2) ctx.setLineDash([2 / pxScale, 2 / pxScale]);
    // Κανονικά στο χρώμα του πηλού· κόκκινο (έντονο, παλλόμενο) όταν στο V θα σήμαινε "κοιτάζω πίσω".
    const color = warn ? '255,40,30' : POT.light;
    ctx.lineWidth = (warn ? 2 + 1 * pulse : 1) / pxScale;
    ctx.strokeStyle = `rgba(${color},${(((warn ? 0.6 : 0.2) + 0.35 * c * pulse) * fadeDrag).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(player.x, player.y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (warn) {
      // Κόκκινη λάμψη γύρω του: προειδοποίηση.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(player.x, player.y, rr * 0.5, player.x, player.y, rr * 2.2);
      g.addColorStop(0, `rgba(255,40,30,${(0.18 * pulse * fadeDrag).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,40,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(player.x, player.y, rr * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (rule) {
      // Στο V: μια αχνή γραμμή δείχνει ως πού μπορείς να φορτίσεις χωρίς να κοιτάξεις πίσω.
      ctx.strokeStyle = `rgba(255,60,40,${(0.35 * fadeDrag).toFixed(3)})`;
      ctx.lineWidth = 1 / pxScale;
      ctx.setLineDash([2 / pxScale, 3 / pxScale]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 4 + LOOK_BACK_CHARGE * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Ακυρωμένο κύμα: το δαχτυλίδι μαζεύεται και σβήνει (δεν βγήκε κανένας ήχος).
  const ct = (gameTime - cancelFx.t) / 0.35;
  if (ct >= 0 && ct < 1) {
    ctx.strokeStyle = `rgba(${POT.light},${(0.5 * (1 - ct)).toFixed(3)})`;
    ctx.lineWidth = 1 / pxScale;
    ctx.beginPath();
    ctx.arc(player.x, player.y, Math.max(1, cancelFx.r * (1 - ct)), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Απαλή λάμψη γύρω του και σκιά κάτω από τα πόδια.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.r * 3.4);
  halo.addColorStop(0, `rgba(${POT.terra},${(0.13 + 0.12 * c).toFixed(3)})`);
  halo.addColorStop(1, `rgba(${POT.terra},0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r * 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ο Ορφέας ως μορφή αγγείου που περπατάει. Η λύρα φαίνεται στα χέρια του
  // όταν ξαναγίνει ολόκληρη.
  const h = player.r * 5;   // ~15 art pixels ύψος: διαβάζεται καθαρά
  Pottery.orpheus(ctx, player.x, player.y + h * 0.5, h, 0.88 + 0.12 * c, strings >= 3, player.dir,
    { phase: player.walkPhase, speed: player.walkSpeed, t: gameTime });
}

function drawJoystick() {
  const j = Input.joy;
  if (j.id === null) return;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `rgba(${POT.terra},0.3)`;
  ctx.beginPath();
  ctx.arc(j.ox, j.oy, JOY_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Εσωτερικός κύκλος: μέσα του περπατάς αθόρυβα, έξω του τρέχεις.
  const runR = JOY_RADIUS * (JOY_DEADZONE + RUN_THRESHOLD * (1 - JOY_DEADZONE));
  ctx.strokeStyle = `rgba(${POT.terra},0.15)`;
  ctx.beginPath();
  ctx.arc(j.ox, j.oy, runR, 0, Math.PI * 2);
  ctx.stroke();

  let dx = j.x - j.ox, dy = j.y - j.oy;
  const len = Math.hypot(dx, dy);
  if (len > JOY_RADIUS) { dx *= JOY_RADIUS / len; dy *= JOY_RADIUS / len; }
  ctx.fillStyle = Input.running ? `rgba(${POT.terra},0.45)` : `rgba(${POT.terra},0.2)`;
  ctx.beginPath();
  ctx.arc(j.ox + dx, j.oy + dy, 20, 0, Math.PI * 2);
  ctx.fill();
}

// 0..1: πόσο έχει προχωρήσει το κόκκινο σβήσιμο μετά το jump scare.
function deathFade() {
  return Math.max(0, Math.min(1, (gameTime - endTime - SCARE_TIME) / (DEATH_DELAY - SCARE_TIME)));
}

function drawDeathFlash(w = cssW, h = cssH) {
  const t = deathFade();
  const a = 0.55 * (1 - t) + 0.2;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15,
    w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(120,0,0,0)');
  g.addColorStop(1, `rgba(120,0,0,${a.toFixed(3)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
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
    Eggs.update(dt, gameTime);
    Fx.update(dt, camera, cssW / 2 / scale, cssH / 2 / scale);
    Echoes.update(dt, gameTime);
    Hints.update(gameTime);
    updateLookBackWarning();
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
    Eurydice.update(player);
    if (Eurydice.wantsToSpeak(gameTime) && lookBackRuleActive() && !Notice.busy(gameTime)) {
      const d = Voice.say(STORY.eurydiceFollow, 'eurydice', { x: Eurydice.x, y: Eurydice.y });
      Notice.show(STORY.eurydiceFollow, gameTime, d + 1.2, null, 'whisper');
    }

    // Τέλος του κεφαλαίου IV: μόλις περάσεις στο V, παίζει η μεσαία cutscene.
    if (state === 'play' && region === CHAPTERS.length - 1 && Eurydice.state === 'none') playMiddle();

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
      p.catch(() => {});
    }
  } catch (_) { /* π.χ. iPhone: δεν υποστηρίζεται, συνεχίζουμε κανονικά */ }
}

function stopInput() {
  Input.cancelCharge();
  Input.joy.id = null;
}

function setState(s) {
  state = s;
  if (s !== 'play' && warnOn) { warnOn = false; Sound.tension(false); }
  Sound.setAmbient(AMBIENT[s]);
}

// Τα μηνύματα που βγαίνουν όταν ανάβει ο βωμός ενός κεφαλαίου (STORY.md, ενότητα 2).
function chapterMessages(i) {
  const ch = CHAPTERS[i];
  return [
    { touch: STORY.checkpoint, time: 3.5 },
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
  for (const m of monsters) m.onSense = shadeSpeaks;
  killer = null;
  ExitDoor.reset();
  Altars.reset(chapter);
  Items.reset(saved.taken);
  Charon.reset(saved.paid);
  Jars.reset(saved.jars);
  Melody.reset(saved.melody);
  Notice.clear();
  Souls.reset();
  Eggs.reset();
  // Αν ξαναβγαίνεις στον βωμό του V, εκείνη σε ακολουθεί ήδη.
  Eurydice.reset(chapter >= CHAPTERS.length - 1 ? 'following' : 'none', chapter >= 0 ? Level.altars[chapter] : Level.start);
  Echoes.listeners = [...monsters, ExitDoor, Charon, ...Altars.list, ...Items.list, ...Souls.list, ...Eggs.listeners()];

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
  Sound.voice(0.3, strings >= 3);
}

// Παίζει μια cutscene (με τη ζωγραφιά art από πάνω) και μετά καλεί το then.
function playCutscene(lines, style, art, then, who) {
  setState('cutscene');
  stopInput();
  Hints.stop();
  Notice.clear();
  showScreen(null);
  Cutscene.play(lines, style, then, art, who);
}

function newGame() {
  Save.clear();
  goFullscreen();
  playCutscene(STORY.intro, '', 'intro', () => spawn(Save.fresh()), STORY.introWho);
}

// Τέλος του κεφαλαίου IV: ο Άδης δίνει την Ευρυδίκη. Μετά συνεχίζεις από εκεί
// που ήσουν (στην είσοδο του V), και εκείνη σε ακολουθεί.
function playMiddle() {
  playCutscene(STORY.middle, '', 'middle', () => {
    Eurydice.reset('following', player);
    Dread.reset();
    setState('play');
    showScreen(null);
    updateHud();
  }, STORY.middleWho);
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

// Η έξοδος στο φως: καλό τέλος αν η Ευρυδίκη ακόμα σε ακολουθεί, αλλιώς κακό.
function reachedExit() {
  const good = Eurydice.following();
  if (good) Sound.win(); else Sound.gameOver();
  const kind = good ? 'good' : 'bad';
  playCutscene(good ? STORY.good : STORY.bad, kind, kind, () => {
    setState('end');
    showScreen(good ? 'endGood' : 'endBad');
  });
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
  else if (action === 'continue' || action === 'retry') continueGame();
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
  Cutscene.init();

  Level.loadWorld(CHAPTERS);
  player.x = camera.x = Level.start.x;
  player.y = camera.y = Level.start.y;

  Input.now = () => gameTime;
  Input.onRelease = emitCall;
  Input.onCancel = cancelCall;
  Input.init(canvas);

  for (const btn of document.querySelectorAll('[data-action]')) {
    btn.addEventListener('click', (e) => { e.preventDefault(); doAction(btn.dataset.action); });
  }
  $('btn-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); pauseGame(); });
  jarBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); throwJar(); });
  melodyBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); playMelody(); });

  window.addEventListener('keydown', (e) => {
    if (state === 'cutscene') {
      // Space / Enter = επόμενη γραμμή, Esc = Skip.
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) Cutscene.advance(); }
      else if (e.code === 'Escape') Cutscene.finish();
      return;
    }
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

  Pixel.init();
  resize();
  showScreen('menu');
  requestAnimationFrame(frame);
}

init();
