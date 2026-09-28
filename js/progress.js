'use strict';

// Αποθήκευση προόδου στον browser (localStorage). Αν ο browser δεν το επιτρέπει
// (π.χ. ιδιωτική περιήγηση), το παιχνίδι δουλεύει κανονικά χωρίς αποθήκευση.
const Progress = {
  KEY: 'silent-escape-progress',
  unlocked: 1,   // το μεγαλύτερο ξεκλείδωτο επίπεδο (1 = μόνο το πρώτο)

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(this.KEY));
      if (data && Number.isInteger(data.unlocked)) {
        this.unlocked = Math.max(1, Math.min(LEVELS.length, data.unlocked));
      }
    } catch (_) { /* χωρίς αποθήκευση */ }
  },

  unlock(level) {
    if (level <= this.unlocked) return;
    this.unlocked = Math.min(LEVELS.length, level);
    try {
      localStorage.setItem(this.KEY, JSON.stringify({ unlocked: this.unlocked }));
    } catch (_) { /* χωρίς αποθήκευση */ }
  },
};
