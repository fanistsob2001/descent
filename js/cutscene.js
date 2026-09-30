'use strict';

// Cutscenes (STORY.md, ενότητα 7): μαύρη οθόνη, οι γραμμές εμφανίζονται μία-μία
// με απαλό ήχο. Άγγιγμα / κλικ / Space / Enter = επόμενη γραμμή, κουμπί Skip.
const CUT_MIN_GAP = 0.45;   // δευτ. — ώστε ένα διπλό άγγιγμα να μην πηδάει γραμμές

const Cutscene = {
  el: null,
  linesEl: null,
  lines: [],
  shown: 0,
  onEnd: null,
  lastAdvance: 0,
  active: false,

  init() {
    this.el = document.getElementById('cutscene');
    this.linesEl = document.getElementById('cut-lines');
    this.el.addEventListener('pointerup', (e) => {
      if (e.target.closest('#cut-skip')) return;
      e.preventDefault();
      this.advance();
    });
    document.getElementById('cut-skip').addEventListener('click', (e) => {
      e.preventDefault();
      this.finish();
    });
  },

  // style: '' | 'good' | 'bad' (λίγο διαφορετικό φόντο για τα τέλη)
  // art: 'intro' | 'middle' | 'good' | 'bad' — η μικρή "ζωγραφιά αγγείου" από πάνω
  // who: ποιος λέει κάθε γραμμή (π.χ. STORY.middleWho) — βλ. js/voice.js.
  play(lines, style, onEnd, art, who) {
    this.lines = lines;
    this.who = who || [];
    this.shown = 0;
    this.onEnd = onEnd;
    this.active = true;
    this.lastAdvance = 0;
    this.linesEl.textContent = '';
    this.el.className = 'overlay cutscene ' + (style || '');
    this.drawArt(art);
    this.showNext();
  },

  // Μια σκηνή σαν ζωφόρος αγγείου: μορφές σε σιλουέτα πάνω από έναν μαίανδρο.
  drawArt(art) {
    const cv = document.getElementById('cut-art');
    // Pixel art: ζωγραφίζεται σε μισή ανάλυση και το CSS τη μεγαλώνει με καθαρά
    // τετράγωνα pixels (image-rendering: pixelated).
    const w = 300, h = 118, k = 0.5;
    cv.width = w * k;
    cv.height = h * k;
    const c = cv.getContext('2d');
    c.setTransform(k, 0, 0, k, 0, 0);
    c.clearRect(0, 0, w, h);
    const ground = h - 18, s = 84;
    if (art === 'intro') {
      // Ο Ορφέας με τη λύρα, και το φίδι στο χορτάρι.
      Pottery.orpheus(c, w / 2 - 10, ground, s, 1, true);
      c.strokeStyle = Pottery.rgba(POT.terra, 1);
      c.lineWidth = 2.2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(w / 2 + 40, ground - 3);
      for (let i = 1; i <= 8; i++) c.lineTo(w / 2 + 40 + i * 6, ground - 3 - Math.sin(i * 1.3) * 4);
      c.stroke();
    } else if (art === 'middle') {
      // Ο Ορφέας παίζει μπροστά στον Άδη και την Περσεφόνη.
      Pottery.orpheus(c, 70, ground, s, 1, true);
      Pottery.seated(c, 190, ground, s, 1, -1, POT.terra, true);
      Pottery.seated(c, 250, ground, s, 1, -1, POT.cream, false);
    } else if (art === 'good') {
      // Βγαίνουν στο φως: εκείνος μπροστά, εκείνη πίσω του. Ο ήλιος δεξιά.
      const sun = c.createRadialGradient(w - 62, 56, 4, w - 62, 56, 52);
      sun.addColorStop(0, Pottery.rgba(POT.cream, 0.9));
      sun.addColorStop(1, Pottery.rgba(POT.light, 0));
      c.fillStyle = sun;
      c.fillRect(0, 0, w, h);
      Pottery.woman(c, 110, ground, s, 1, 1);
      Pottery.orpheus(c, 170, ground, s, 1, true);
    } else if (art === 'bad') {
      // Γύρισε: την κοιτάζει, κι εκείνη σβήνει στο σκοτάδι.
      Pottery.woman(c, 115, ground, s, 0.28, 1);
      Pottery.orpheus(c, 180, ground, s, 1, true, -1);
    }
    Pottery.meander(c, 20, h - 14, w - 40, 12, POT.terra, 0.9, 1.3);
  },

  showNext() {
    const p = document.createElement('p');
    p.textContent = this.lines[this.shown];
    this.linesEl.appendChild(p);
    // Οι προηγούμενες γραμμές σβήνουν λίγο, ώστε να ξεχωρίζει η καινούργια.
    for (const old of this.linesEl.children) if (old !== p) old.classList.add('old');
    requestAnimationFrame(() => p.classList.add('in'));
    this.shown++;
    this.el.classList.toggle('last', this.shown >= this.lines.length);
    // Η προηγούμενη φωνή σταματάει αν πατήσεις "επόμενη" πριν τελειώσει.
    Voice.stop();
    Voice.say(this.lines[this.shown - 1], this.who[this.shown - 1] || 'narrator');
  },

  advance() {
    if (!this.active) return;
    const now = performance.now() / 1000;
    if (now - this.lastAdvance < CUT_MIN_GAP) return;
    this.lastAdvance = now;
    if (this.shown < this.lines.length) this.showNext();
    else this.finish();
  },

  finish() {
    if (!this.active) return;
    Voice.stop();
    this.active = false;
    this.el.classList.add('hidden');
    const cb = this.onEnd;
    this.onEnd = null;
    if (cb) cb();
  },
};
