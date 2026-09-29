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

    // Σε στυλ αγγείου: μορφή από πηλό με χαραγμένες μαύρες λεπτομέρειες.
    const x = this.x, y = this.y + leave * TILE * 0.8;
    const terra = Pottery.rgba(POT.terra, a), light = Pottery.rgba(POT.light, a);

    // Βάρκα: μαύρο κύτος με περίγραμμα πηλού και ένα "μάτι" στην πλώρη,
    // όπως στα πλοία που ζωγράφιζαν στα αγγεία.
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 1);
    ctx.quadraticCurveTo(x, y + 13, x + 16, y + 3);
    ctx.lineTo(x + 20, y - 2);
    ctx.lineTo(x + 14, y + 2);
    ctx.quadraticCurveTo(x, y + 6, x - 18, y + 1);
    ctx.fillStyle = Pottery.rgba(POT.black, a);
    ctx.fill();
    ctx.strokeStyle = terra;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x + 12, y + 4, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Ο Χάροντας: ψηλή σκυμμένη μορφή με κουκούλα.
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 4);
    ctx.lineTo(x - 4, y - 8);
    ctx.quadraticCurveTo(x - 2, y - 15, x + 3, y - 13);
    ctx.lineTo(x + 2, y - 9);
    ctx.lineTo(x + 5, y + 4);
    ctx.closePath();
    ctx.fillStyle = terra;
    ctx.fill();
    Pottery.incise(ctx, [x - 3, y - 7, x - 2, y + 3], 20);
    Pottery.incise(ctx, [x + 1, y - 6, x + 2, y + 3], 20);

    // Κοντάρι.
    ctx.strokeStyle = light;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 9, y - 16);
    ctx.lineTo(x + 6, y + 9);
    ctx.stroke();

    // Το απλωμένο χέρι, όσο περιμένει πληρωμή.
    if (!this.paid) {
      ctx.strokeStyle = terra;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 6);
      ctx.lineTo(x - 10, y - 8);
      ctx.stroke();
    }
  },
};
