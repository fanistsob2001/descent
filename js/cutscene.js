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
  play(lines, style, onEnd) {
    this.lines = lines;
    this.shown = 0;
    this.onEnd = onEnd;
    this.active = true;
    this.lastAdvance = 0;
    this.linesEl.textContent = '';
    this.el.className = 'overlay cutscene ' + (style || '');
    this.showNext();
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
    Sound.cutLine(this.shown - 1);
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
    this.active = false;
    this.el.classList.add('hidden');
    const cb = this.onEnd;
    this.onEnd = null;
    if (cb) cb();
  },
};
