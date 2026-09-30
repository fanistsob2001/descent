'use strict';

// Μηνύματα χαμένων ψυχών (STORY.md, ενότητα 8): κρυμμένα στον χάρτη, φαίνονται
// μόνο όταν τα ακουμπήσει κύμα — σαν χαραγμένα λόγια που αναδύονται στο σκοτάδι.
const SOUL_HOLD = 5;          // πόσα δευτ. μένει καθαρό μετά το κύμα
const SOUL_FADE = 1.5;        // και μετά σβήνει σε τόσο
const SOUL_FONT = 14;         // μέγεθος γραμμάτων σε μονάδες κόσμου (~12px σε κινητό)
const SOUL_WIDTH = 210;       // πλάτος γραμμής πριν αλλάξει σειρά

const Souls = {
  list: [],   // { n, x, y, lines, revealTime, onHear }

  reset() {
    this.list = Level.souls.map((s) => ({
      n: s.n, x: s.x, y: s.y, lines: null, revealTime: -1e6,
      spokeAt: -1e6,
      onHear(wave, d, los) {
        if (!los || wave.kind === 'step') return;   // τα βήματα είναι πολύ αχνά για να τα φέρουν
        this.revealTime = Echoes.now;
        // Ψιθυρίζει τα λόγια της (όχι ξανά μέσα σε 12 δευτ.).
        if (Echoes.now - this.spokeAt > 12) {
          this.spokeAt = Echoes.now;
          Voice.say(STORY.souls[this.n - 1], 'soul', { x: this.x, y: this.y, delay: 0.3 });
        }
      },
    }));
  },

  alpha(s, now) {
    const age = now - s.revealTime;
    if (age < 0 || age > SOUL_HOLD + SOUL_FADE) return 0;
    const fadeIn = Math.min(1, age / 0.6);
    const fadeOut = age < SOUL_HOLD ? 1 : 1 - (age - SOUL_HOLD) / SOUL_FADE;
    return fadeIn * fadeOut;
  },

  // Χωρίζει το κείμενο σε γραμμές που χωράνε στο SOUL_WIDTH.
  wrap(ctx, text) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (line && ctx.measureText(test).width > SOUL_WIDTH) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  },

  draw(ctx, now, view) {
    ctx.font = `italic ${SOUL_FONT}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of this.list) {
      if (s.x < view.x0 - SOUL_WIDTH || s.x > view.x1 + SOUL_WIDTH ||
          s.y < view.y0 - TILE * 2 || s.y > view.y1 + TILE * 2) continue;
      const a = this.alpha(s, now);
      if (a < 0.01) continue;
      if (!s.lines) s.lines = this.wrap(ctx, STORY.souls[s.n - 1]);

      const lh = SOUL_FONT * 1.35;
      const top = s.y - ((s.lines.length - 1) * lh) / 2;
      // Σκοτεινό "φόντο" ώστε να διαβάζεται πάνω από τους φωτισμένους τοίχους.
      ctx.fillStyle = `rgba(0,0,0,${(a * 0.7).toFixed(3)})`;
      ctx.fillRect(s.x - SOUL_WIDTH / 2 - 6, top - lh / 2 - 4, SOUL_WIDTH + 12, s.lines.length * lh + 8);
      ctx.fillStyle = `rgba(${POT.cream},${(a * 0.85).toFixed(3)})`;
      s.lines.forEach((l, i) => ctx.fillText(l, s.x, top + i * lh));
    }
  },
};
