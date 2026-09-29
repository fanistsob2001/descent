'use strict';

// Αποθήκευση στον browser (localStorage). Αν ο browser δεν το επιτρέπει
// (π.χ. ιδιωτική περιήγηση), το παιχνίδι δουλεύει κανονικά χωρίς αποθήκευση.

// Μία μόνο θέση αποθήκευσης: η κατάσταση τη στιγμή που άναψε ο τελευταίος βωμός.
// { chapter: 0..4, lures }
const Save = {
  KEY: 'descent-save',

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY));
      if (d && Number.isInteger(d.chapter) && d.chapter >= 0 && d.chapter < CHAPTERS.length) {
        return { chapter: d.chapter, lures: Number.isInteger(d.lures) ? d.lures : 0 };
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
