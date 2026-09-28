'use strict';

// Οδηγίες στην οθόνη (tutorial). Δείχνει τα hints του επιπέδου ένα-ένα.
const HINT_MIN_TIME = 2;     // κάθε οδηγία μένει τουλάχιστον τόσο (δευτ.)
const HINT_GAP = 0.8;        // κενό ανάμεσα σε δύο οδηγίες
// Πόση ώρα πρέπει να κρατήσει μια "συνεχής" ενέργεια για να μετρήσει.
const HINT_HOLD = { move: 0.8, sneak: 1.2 };

const Hints = {
  el: null,
  touch: true,
  list: [],
  idx: -1,
  showing: false,
  shownAt: 0,
  nextAt: 0,
  progress: 0,
  done: false,

  init(el) {
    this.el = el;
    this.touch = matchMedia('(pointer: coarse)').matches;
  },

  start(list, now) {
    this.list = list || [];
    this.idx = -1;
    this.showing = false;
    this.nextAt = now + HINT_GAP;
    this.el.classList.remove('visible');
  },

  stop() {
    this.list = [];
    this.showing = false;
    this.el.classList.remove('visible');
  },

  // Ο παίκτης έκανε κάτι ('move', 'call', 'sneak', 'lure'). dt για τις συνεχείς ενέργειες.
  notify(event, dt = 0) {
    if (!this.showing) return;
    const h = this.list[this.idx];
    if (h.until !== event) return;
    if (HINT_HOLD[event]) {
      this.progress += dt;
      if (this.progress >= HINT_HOLD[event]) this.done = true;
    } else {
      this.done = true;
    }
  },

  update(now) {
    if (this.showing) {
      const h = this.list[this.idx];
      const elapsed = now - this.shownAt;
      const finished = (this.done && elapsed >= HINT_MIN_TIME) || (h.time && elapsed >= h.time);
      if (finished) {
        this.showing = false;
        this.nextAt = now + HINT_GAP;
        this.el.classList.remove('visible');
      }
    } else if (this.idx + 1 < this.list.length && now >= this.nextAt) {
      this.idx++;
      const h = this.list[this.idx];
      this.el.textContent = this.touch ? h.touch : (h.keys || h.touch);
      this.el.classList.add('visible');
      this.showing = true;
      this.shownAt = now;
      this.progress = 0;
      this.done = false;
    }
  },
};
