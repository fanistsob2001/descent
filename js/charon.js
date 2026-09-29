'use strict';

// Ο Χάροντας στέκεται στη βάρκα του, πάνω στην πύλη του κεφαλαίου II (w στον χάρτη).
// Αν έχεις οβολό, πληρώνεις και η πύλη ανοίγει. Αλλιώς, απλώνει το χέρι.
const CHARON_REACH = TILE * 1.25;
const CHARON_REVEAL_TIME = 2.5;

const Charon = {
  gate: -1,           // δείκτης στο Level.gates
  x: 0,
  y: 0,
  paid: false,
  paidAt: -1e6,
  near: false,        // ήταν ήδη κοντά (για να μη λέει το ίδιο μήνυμα συνέχεια)
  revealTime: -1e6,
  revealStrength: 0,

  reset(paid) {
    this.gate = Level.gates.length > 0 ? 0 : -1;
    if (this.gate < 0) return;
    const g = Level.gates[this.gate];
    this.x = g.x;
    this.y = g.y;
    this.paid = paid;
    this.paidAt = -1e6;
    this.near = false;
    this.revealTime = -1e6;
    Level.setGate(this.gate, paid);
  },

  onHear(wave, d, los) {
    if (!los) return;
    const s = Echoes.strengthAt(wave, d);
    const left = this.revealStrength * Math.max(0, 1 - (Echoes.now - this.revealTime) / CHARON_REVEAL_TIME);
    if (s < left) return;
    this.revealTime = Echoes.now;
    this.revealStrength = s;
  },

  // Επιστρέφει 'empty' (δεν έχεις οβολό), 'paid' (μόλις πλήρωσες) ή null.
  check(p, hasObol, now) {
    if (this.gate < 0 || this.paid) return null;
    const close = Math.hypot(p.x - this.x, p.y - this.y) < CHARON_REACH;
    if (!close) {
      // Ξαναλέει το μήνυμα μόνο αφού απομακρυνθείς αρκετά.
      if (Math.hypot(p.x - this.x, p.y - this.y) > CHARON_REACH * 2) this.near = false;
      return null;
    }
    if (hasObol) {
      this.paid = true;
      this.paidAt = now;
      Level.setGate(this.gate, true);
      return 'paid';
    }
    if (this.near) return null;
    this.near = true;
    return 'empty';
  },

  draw(ctx, now) {
    if (this.gate < 0) return;
    const age = now - this.revealTime;
    let a = age < CHARON_REVEAL_TIME
      ? Math.min(1, 0.35 + this.revealStrength) * (1 - age / CHARON_REVEAL_TIME) : 0;
    // Μετά την πληρωμή, η βάρκα "φεύγει" προς τα κάτω και σβήνει.
    const leave = this.paid ? Math.min(1, (now - this.paidAt) / 2.5) : 0;
    if (this.paid) a = Math.max(a * (1 - leave), (1 - leave) * 0.6);
    if (a < 0.01) return;

    const x = this.x, y = this.y + leave * TILE * 0.8;
    ctx.strokeStyle = `rgba(200,210,230,${a.toFixed(3)})`;
    ctx.fillStyle = `rgba(200,210,230,${(a * 0.25).toFixed(3)})`;
    ctx.lineWidth = 1.4;

    // Βάρκα: μακρόστενη, με μυτερές άκρες.
    ctx.beginPath();
    ctx.moveTo(x - 17, y + 2);
    ctx.quadraticCurveTo(x, y + 12, x + 17, y + 2);
    ctx.quadraticCurveTo(x, y + 6, x - 17, y + 2);
    ctx.stroke();

    // Ο Χάροντας: ψηλή σκυμμένη φιγούρα με κουκούλα, κρατάει κοντάρι.
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 5);
    ctx.lineTo(x - 3, y - 8);
    ctx.quadraticCurveTo(x - 1, y - 14, x + 3, y - 12);
    ctx.lineTo(x + 5, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 9, y - 15);
    ctx.lineTo(x + 6, y + 9);
    ctx.stroke();

    // Το απλωμένο χέρι, όσο περιμένει πληρωμή.
    if (!this.paid) {
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 5);
      ctx.lineTo(x - 9, y - 7);
      ctx.stroke();
    }
  },
};
