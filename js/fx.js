'use strict';

// Ατμόσφαιρα: σκόνη στον αέρα που φαίνεται μόνο εκεί που φτάνει φως (ήχου ή φλόγας),
// και το animated φόντο του μενού.
const MOTE_COUNT = 90;

const Fx = {
  motes: [],
  ready: false,

  // Τα σωματίδια ζουν γύρω από την κάμερα και "τυλίγονται" όταν βγουν από το πλαίσιο.
  update(dt, cam, halfW, halfH) {
    const mw = halfW + 40, mh = halfH + 40;
    if (!this.ready) {
      for (let i = 0; i < MOTE_COUNT; i++) {
        this.motes.push({
          x: cam.x + (Math.random() * 2 - 1) * mw, y: cam.y + (Math.random() * 2 - 1) * mh,
          vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 3.5,
          ph: Math.random() * 6.28, sz: 0.8 + Math.random() * 1.1,
        });
      }
      this.ready = true;
    }
    for (const m of this.motes) {
      m.ph += dt * 0.9;
      m.x += (m.vx + Math.sin(m.ph) * 2.2) * dt;
      m.y += m.vy * dt;
      if (m.x < cam.x - mw) m.x += mw * 2; else if (m.x > cam.x + mw) m.x -= mw * 2;
      if (m.y < cam.y - mh) m.y += mh * 2; else if (m.y > cam.y + mh) m.y -= mh * 2;
    }
  },

  // Πόσο φως πέφτει σε ένα σημείο: από τα κύματα και από τους αναμμένους βωμούς.
  light(x, y) {
    let l = Echoes.lightAt(x, y);
    for (const a of Altars.list) {
      if (!a.lit) continue;
      const d = Math.hypot(x - a.x, y - a.y);
      if (d < 130) l += (1 - d / 130) * 0.8;
    }
    return l;
  },

  drawMotes(ctx, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const l = this.light(m.x, m.y);
      if (l < 0.03) continue;
      const tw = 0.6 + 0.4 * Math.sin(now * 3 + m.ph * 4);
      ctx.fillStyle = `rgba(${POT.light},${Math.min(0.85, l * 0.9 * tw).toFixed(3)})`;
      ctx.fillRect(m.x, m.y, m.sz * 1.8, m.sz * 1.8);   // ~1 art pixel
    }
    ctx.restore();
  },

  // Φόντο του μενού: ένας δίσκος από πηλό (σαν πάτος κύλικας) με τον Ορφέα και μια
  // σκιά που απλώνει το χέρι, και σπίθες που ανεβαίνουν. Αχνό, για να διαβάζονται τα κείμενα.
  drawMenu(ctx, w, h, t) {
    // Ένα έμβλημα πάνω από τον τίτλο (εκεί υπάρχει ελεύθερος χώρος), σαν το τόνδο στον πάτο μιας κύλικας.
    // Σε οριζόντια οθόνη πηγαίνει αριστερά, δίπλα στο μενού (που μετακινείται δεξιά με CSS).
    const wide = w > h;
    const R = wide ? Math.min(h * 0.34, w * 0.17) : Math.min(w * 0.24, h * 0.1);
    const cx = wide ? w * 0.24 : w / 2;
    const cy = wide ? h / 2 : Math.max(R + 12, h * 0.125);
    ctx.save();
    ctx.globalAlpha = 0.8;
    // Ο δίσκος.
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = Pottery.clay(ctx, cx - R, cy - R, cx + R, cy + R, 1);
    ctx.fill();
    ctx.strokeStyle = Pottery.rgba(POT.black, 1);
    ctx.lineWidth = R * 0.02;
    for (const k of [0.97, 0.86]) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 36; i++) {          // "κλειδιά" του μαιάνδρου γύρω γύρω
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i / 36) * Math.PI * 2);
      const r0 = R * 0.875, r1 = R * 0.955, a = R * 0.045;
      ctx.beginPath();
      ctx.moveTo(-a, -r0); ctx.lineTo(-a, -r1); ctx.lineTo(a, -r1);
      ctx.lineTo(a, -r0 - (r1 - r0) * 0.4); ctx.lineTo(0, -r0 - (r1 - r0) * 0.4);
      ctx.stroke();
      ctx.restore();
    }
    // Οι μορφές, κομμένες μέσα στον δίσκο.
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.84, 0, Math.PI * 2);
    ctx.clip();
    const ground = cy + R * 0.52, s = R * 1.0;
    Pottery.orpheus(ctx, cx - R * 0.42, ground, s, 1, true, 1, { phase: 0, speed: 0, t });
    ctx.save();               // η σκιά κοιτάζει προς τον Ορφέα
    ctx.translate(cx + R * 0.5, ground);
    ctx.scale(-1, 1);
    Pottery.shade(ctx, 0, 0, s * 0.95, 1, 2.2, t);
    ctx.restore();
    Pottery.meander(ctx, cx - R * 0.84, ground + R * 0.04, R * 1.68, R * 0.12, POT.black, 0.9, R * 0.014);
    ctx.restore();

    // Σπίθες που ανεβαίνουν.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const life = (t * 0.12 + i * 0.137) % 1;
      const x = (i * 97.3 + Math.sin(t * 0.7 + i) * 18) % w;
      const y = h * (1.05 - life * 1.15);
      ctx.fillStyle = `rgba(${POT.light},${(Math.sin(life * Math.PI) * 0.5).toFixed(3)})`;
      ctx.fillRect(x < 0 ? x + w : x, y, 1.6, 1.6);
    }
    ctx.restore();
  },
};
