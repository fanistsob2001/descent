'use strict';

// Δόλωμα (ηχείο): πετιέται, σταματάει στους τοίχους και μετά από λίγο
// βγάζει δυνατά κύματα που τραβάνε τα τέρατα.
const LURE_RADIUS = 4;
const LURE_SPEED = 300;          // αρχική ταχύτητα ρίψης
const LURE_FRICTION = 360;       // επιβράδυνση → ταξιδεύει ~3 κελιά
const LURE_DELAY = 1;            // δευτ. μέχρι το πρώτο κύμα
const LURE_PULSES = 3;
const LURE_PULSE_GAP = 0.4;      // δευτ. ανάμεσα στα κύματα
const LURE_WAVE = { radius: 420, strength: 0.9 };
const LURE_LINGER = 1.2;         // πόσο μένει ορατό μετά το τελευταίο κύμα

const Lures = {
  items: [],
  left: 0,

  reset(count) {
    this.items = [];
    this.left = count;
  },

  // Πέταγμα από (x, y) προς την κατεύθυνση (dx, dy) (μοναδιαίο διάνυσμα).
  throw(x, y, dx, dy, now) {
    if (this.left <= 0) return false;
    this.left--;
    this.items.push({
      x, y, r: LURE_RADIUS,
      vx: dx * LURE_SPEED, vy: dy * LURE_SPEED,
      born: now, pulses: 0, lastPulse: -1e6,
    });
    return true;
  },

  update(dt, now) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];

      const speed = Math.hypot(it.vx, it.vy);
      if (speed > 0) {
        // Μικρά βήματα ώστε να μην περνάει μέσα από τοίχους.
        const steps = Math.ceil((speed * dt) / (LURE_RADIUS * 0.8));
        for (let s = 0; s < steps; s++) {
          it.x += (it.vx * dt) / steps;
          it.y += (it.vy * dt) / steps;
          if (Level.pushOutOfWalls(it)) { it.vx = 0; it.vy = 0; break; }
        }
        const k = Math.max(0, speed - LURE_FRICTION * dt) / speed;
        it.vx *= k;
        it.vy *= k;
      }

      const age = now - it.born;
      while (it.pulses < LURE_PULSES && age >= LURE_DELAY + it.pulses * LURE_PULSE_GAP) {
        Echoes.emit(it.x, it.y, LURE_WAVE.radius, LURE_WAVE.strength, 'lure');
        it.pulses++;
        it.lastPulse = now;
      }

      if (it.pulses >= LURE_PULSES && now - it.lastPulse > LURE_LINGER) {
        this.items.splice(i, 1);
      }
    }
  },

  draw(ctx, now) {
    for (const it of this.items) {
      const flash = Math.max(0, 1 - (now - it.lastPulse) / 0.4);
      let a = 0.3 + 0.7 * flash;
      if (it.pulses >= LURE_PULSES) a *= Math.max(0, 1 - (now - it.lastPulse) / LURE_LINGER);
      if (a < 0.01) continue;

      ctx.fillStyle = `rgba(200,225,255,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(it.x, it.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Μικρό "τικ τακ" πριν αρχίσει να φωνάζει.
      if (it.pulses === 0) {
        const tick = 0.5 + 0.5 * Math.sin((now - it.born) * 18);
        ctx.strokeStyle = `rgba(200,225,255,${(0.12 + 0.2 * tick).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(it.x, it.y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  },
};
