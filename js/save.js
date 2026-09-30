'use strict';

// Αποθήκευση στον browser (localStorage). Αν ο browser δεν το επιτρέπει
// (π.χ. ιδιωτική περιήγηση), το παιχνίδι δουλεύει κανονικά χωρίς αποθήκευση.

// Μία μόνο θέση αποθήκευσης: η κατάσταση τη στιγμή που άναψε ο τελευταίος βωμός.
// { chapter: 0..4, jars, strings, obol, paid, melody, taken: [id αντικειμένων],
//   seen: τα κελιά που έχει δει ο παίκτης (Level.seenString) }
const Save = {
  KEY: 'descent-save',

  // Η κατάσταση ενός καινούργιου παιχνιδιού (chapter -1 = πριν τον πρώτο βωμό).
  fresh() {
    return { chapter: -1, jars: 0, strings: 0, obol: false, paid: false, melody: 0, taken: [], seen: '' };
  },

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY));
      if (d && Number.isInteger(d.chapter) && d.chapter >= 0 && d.chapter < CHAPTERS.length) {
        const int = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
        return {
          chapter: d.chapter,
          jars: int(d.jars),
          strings: Math.min(3, int(d.strings)),
          obol: d.obol === true,
          paid: d.paid === true,
          melody: int(d.melody),
          taken: Array.isArray(d.taken) ? d.taken.filter(Number.isInteger) : [],
          seen: typeof d.seen === 'string' && /^[0-9a-f]*$/.test(d.seen) ? d.seen : '',
        };
      }
    } catch (_) { /* χωρίς αποθήκευση */ }
    return null;
  },

  exists() {
    return this.load() !== null;
  },

  write(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (_) { /* - */ }
  },

  clear() {
    try { localStorage.removeItem(this.KEY); } catch (_) { /* - */ }
  },
};

// Ρυθμίσεις: ήχος και δόνηση.
const Settings = {
  KEY: 'descent-settings',
  sound: true,
  vibration: true,

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY));
      if (d) {
        this.sound = d.sound !== false;
        this.vibration = d.vibration !== false;
      }
    } catch (_) { /* - */ }
  },

  store() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ sound: this.sound, vibration: this.vibration }));
    } catch (_) { /* - */ }
  },
};
