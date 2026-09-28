'use strict';

// Πόσο φαίνεται η πόρτα αφού την ακουμπήσει κύμα (δευτ.) και πόσο φωτεινή γίνεται.
const EXIT_REVEAL_TIME = 2;
const EXIT_MAX_ALPHA = 0.55;

const ExitDoor = {
  x: 0,
  y: 0,
  revealTime: -1e6,
  revealStrength: 0,

  reset() {
    this.x = Level.exit.x;
    this.y = Level.exit.y;
    this.revealTime = -1e6;
  },

  // Καλείται από το Echoes: η πόρτα φαίνεται μόνο αν τη "βλέπει" το κύμα.
  onHear(wave, d, los) {
    if (!los) return;
    const now = Echoes.now;
    const s = Echoes.strengthAt(wave, d);
    if (s > this.alpha(now) / EXIT_MAX_ALPHA) {
      this.revealTime = now;
      this.revealStrength = s;
    }
  },

  alpha(now) {
    const age = now - this.revealTime;
    if (age >= EXIT_REVEAL_TIME) return 0;
    return EXIT_MAX_ALPHA * Math.min(1, this.revealStrength * 1.5) * (1 - age / EXIT_REVEAL_TIME);
  },

  reached(p) {
    return Math.hypot(p.x - this.x, p.y - this.y) < TILE * 0.45;
  },

  draw(ctx, now) {
    const a = this.alpha(now);
    if (a < 0.01) return;

    // Η πόρτα μπαίνει στην πλευρά του κελιού που είναι απέναντι από τον διάδρομο.
    const { tx, ty } = Level.exit;
    let ox = 0, oy = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!Level.isWall(tx + dx, ty + dy)) { ox = -dx; oy = -dy; break; }
    }
    const depth = 7;
    const cx = this.x + ox * (TILE / 2 - depth / 2);
    const cy = this.y + oy * (TILE / 2 - depth / 2);
    const w = ox !== 0 ? depth : TILE;
    const h = ox !== 0 ? TILE : depth;

    ctx.fillStyle = `rgba(255,214,150,${(a * 0.35).toFixed(3)})`;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = `rgba(255,222,170,${a.toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

    // Λίγο φως που "περνάει" από την πόρτα προς τα μέσα.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE * 0.8);
    glow.addColorStop(0, `rgba(255,200,130,${(a * 0.25).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE * 0.8, 0, Math.PI * 2);
    ctx.fill();
  },
};
