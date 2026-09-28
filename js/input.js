'use strict';

// Ακτίνα του εικονικού joystick σε CSS pixels.
const JOY_RADIUS = 55;
const JOY_DEADZONE = 0.12;
// Μέγιστος χρόνος φόρτισης του κύματος (δευτ.).
const MAX_CHARGE = 1.5;

const Input = {
  keys: {},
  moveX: 0,
  moveY: 0,

  // Εικονικό joystick (αριστερό μισό οθόνης). Εμφανίζεται εκεί που ακουμπάς.
  joy: { id: null, ox: 0, oy: 0, x: 0, y: 0 },

  // Φόρτιση κύματος (δεξί μισό οθόνης ή Space).
  charging: false,
  chargeStart: 0,
  chargeSource: null,   // 'key' ή pointerId
  onRelease: null,      // callback(heldSeconds)

  // Η ώρα του παιχνιδιού έρχεται από το main loop ώστε η φόρτιση να μετράει σωστά.
  now: () => 0,

  init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) this.startCharge('key');
      }
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.endCharge('key');
    });
    window.addEventListener('blur', () => {
      this.keys = {};
      this.joy.id = null;
      this.cancelCharge();
    });

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.clientX < window.innerWidth / 2) {
        if (this.joy.id !== null) return;
        this.joy.id = e.pointerId;
        this.joy.ox = this.joy.x = e.clientX;
        this.joy.oy = this.joy.y = e.clientY;
      } else {
        this.startCharge(e.pointerId);
      }
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* δεν πειράζει */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joy.id) {
        this.joy.x = e.clientX;
        this.joy.y = e.clientY;
      }
    });
    const up = (e) => {
      if (e.pointerId === this.joy.id) this.joy.id = null;
      if (e.type === 'pointercancel' && this.chargeSource === e.pointerId) this.cancelCharge();
      else this.endCharge(e.pointerId);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  },

  startCharge(source) {
    if (this.charging) return;
    this.charging = true;
    this.chargeSource = source;
    this.chargeStart = this.now();
  },

  endCharge(source) {
    if (!this.charging || this.chargeSource !== source) return;
    const held = Math.min(MAX_CHARGE, this.now() - this.chargeStart);
    this.charging = false;
    this.chargeSource = null;
    if (this.onRelease) this.onRelease(held);
  },

  cancelCharge() {
    this.charging = false;
    this.chargeSource = null;
  },

  // 0..1: πόσο έχει φορτίσει το κύμα αυτή τη στιγμή.
  chargeAmount() {
    if (!this.charging) return 0;
    return Math.min(1, (this.now() - this.chargeStart) / MAX_CHARGE);
  },

  // Υπολογίζει moveX/moveY (μήκος 0..1) από joystick ή πληκτρολόγιο.
  update() {
    let mx = 0, my = 0;

    if (this.joy.id !== null) {
      const dx = (this.joy.x - this.joy.ox) / JOY_RADIUS;
      const dy = (this.joy.y - this.joy.oy) / JOY_RADIUS;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        // Το κέντρο "ακολουθεί" το δάχτυλο αν ξεφύγει πολύ.
        this.joy.ox = this.joy.x - (dx / len) * JOY_RADIUS;
        this.joy.oy = this.joy.y - (dy / len) * JOY_RADIUS;
      }
      const m = Math.min(1, len);
      if (m > JOY_DEADZONE) {
        const strength = (m - JOY_DEADZONE) / (1 - JOY_DEADZONE);
        mx = (dx / len) * strength;
        my = (dy / len) * strength;
      }
    }

    const k = this.keys;
    const kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const ky = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
    if (kx || ky) {
      const l = Math.hypot(kx, ky);
      mx = kx / l;
      my = ky / l;
    }

    this.moveX = mx;
    this.moveY = my;
  },
};
