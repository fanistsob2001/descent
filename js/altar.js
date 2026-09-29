'use strict';

// Βωμοί (checkpoints): ένας στην αρχή κάθε κεφαλαίου, με σβηστή φλόγα.
// Αν τον φτάσεις, η φλόγα ανάβει και η πρόοδος αποθηκεύεται.
// Ο σβηστός βωμός φαίνεται μόνο όταν τον ακουμπήσει κύμα· ο αναμμένος
// καίει πάντα — η μόνη μόνιμη φωτιά μέσα στο σκοτάδι.
const ALTAR_REACH = TILE * 0.55;
const ALTAR_REVEAL_TIME = 2;

const Altars = {
  list: [],   // { x, y, lit, revealTime, revealStrength, litAt }

  // litUpTo: οι βωμοί με δείκτη <= litUpTo είναι ήδη αναμμένοι (από το save).
  reset(litUpTo) {
    this.list = Level.altars.map((a, i) => ({
      x: a.x, y: a.y, lit: i <= litUpTo,
      revealTime: -1e6, revealStrength: 0, litAt: -1e6,
      // Για το Echoes.listeners: κάθε βωμός "βλέπει" τα κύματα.
      onHear(wave, d, los) {
        if (!los) return;
        const s = Echoes.strengthAt(wave, d);
        const left = this.revealStrength * Math.max(0, 1 - (Echoes.now - this.revealTime) / ALTAR_REVEAL_TIME);
        if (s < left) return;   // ήδη φωτεινότερος από αυτό το κύμα
        this.revealTime = Echoes.now;
        this.revealStrength = s;
      },
    }));
  },

  // Επιστρέφει τον δείκτη του βωμού που μόλις άναψε, ή -1.
  check(p, now) {
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      if (a.lit) continue;
      if (Math.hypot(p.x - a.x, p.y - a.y) < ALTAR_REACH) {
        a.lit = true;
        a.litAt = now;
        return i;
      }
    }
    return -1;
  },

  draw(ctx, now, view) {
    for (const a of this.list) {
      if (a.x < view.x0 - TILE * 3 || a.x > view.x1 + TILE * 3 ||
          a.y < view.y0 - TILE * 3 || a.y > view.y1 + TILE * 3) continue;

      let stone = 0;
      const age = now - a.revealTime;
      if (age < ALTAR_REVEAL_TIME) stone = Math.min(1, 0.3 + a.revealStrength) * (1 - age / ALTAR_REVEAL_TIME);

      if (a.lit) {
        // Φως γύρω από τη φλόγα, με ελαφρύ τρεμόπαιγμα.
        const flicker = 0.85 + 0.15 * Math.sin(now * 13 + a.x) * Math.sin(now * 7.3 + a.y);
        const burst = Math.max(0, 1 - (now - a.litAt) / 1.2);   // λάμψη τη στιγμή που ανάβει
        const r = TILE * (1.6 + burst * 2.5) * flicker;
        const g = ctx.createRadialGradient(a.x, a.y - 6, 0, a.x, a.y - 6, r);
        g.addColorStop(0, `rgba(255,170,80,${(0.35 + 0.4 * burst).toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(a.x, a.y - 6, r, 0, Math.PI * 2);
        ctx.fill();
        stone = Math.max(stone, 0.55);
      }

      if (stone > 0.01) {
        // Η πέτρα του βωμού: ένα μικρό βάθρο με "κύπελλο" για τη φλόγα.
        ctx.strokeStyle = `rgba(${POT.terra},${stone.toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(a.x - 9, a.y - 2, 18, 10);
        ctx.beginPath();
        ctx.moveTo(a.x - 12, a.y - 2);
        ctx.lineTo(a.x + 12, a.y - 2);
        ctx.moveTo(a.x - 6, a.y - 2);
        ctx.lineTo(a.x - 8, a.y - 6);
        ctx.lineTo(a.x + 8, a.y - 6);
        ctx.lineTo(a.x + 6, a.y - 2);
        ctx.stroke();
      }

      if (a.lit) {
        // Η ίδια η φλόγα.
        const t = now * 9 + a.x;
        const h = 9 + 2 * Math.sin(t);
        ctx.fillStyle = 'rgba(255,190,90,0.95)';
        ctx.beginPath();
        ctx.moveTo(a.x - 4, a.y - 6);
        ctx.quadraticCurveTo(a.x - 5 + Math.sin(t * 0.7), a.y - 6 - h * 0.6, a.x + Math.sin(t * 1.3) * 1.5, a.y - 6 - h);
        ctx.quadraticCurveTo(a.x + 5, a.y - 6 - h * 0.5, a.x + 4, a.y - 6);
        ctx.closePath();
        ctx.fill();
      }
    }
  },
};
