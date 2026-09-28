'use strict';

// Jump scare: ένα πρόσωπο σχεδιασμένο εξ ολοκλήρου με κώδικα, που "πετάγεται"
// για λίγο πάνω από όλη την οθόνη όταν σε πιάσει το τέρας.
const SCARE_TIME = 0.65;   // πόσο κρατάει το πρόσωπο (δευτ.)

const Scare = {
  cracks: [],

  // Νέες "ρωγμές" κάθε φορά, ώστε να μη μοιάζει ποτέ ακριβώς ίδιο.
  prepare() {
    this.cracks = [];
    for (let i = 0; i < 9; i++) {
      const pts = [];
      let x = (Math.random() - 0.5) * 0.6, y = (Math.random() - 0.5) * 0.8;
      const ang = Math.random() * Math.PI * 2;
      for (let k = 0; k < 5; k++) {
        pts.push([x, y]);
        x += Math.cos(ang + (Math.random() - 0.5) * 1.4) * 0.06;
        y += Math.sin(ang + (Math.random() - 0.5) * 1.4) * 0.06;
      }
      this.cracks.push(pts);
    }
  },

  // t = δευτ. από τη στιγμή του θανάτου. Σχεδιάζει σε συντεταγμένες οθόνης.
  draw(ctx, w, h, t) {
    if (t > SCARE_TIME) return;

    // Πρώτα ένα στιγμιαίο κόκκινο φλας.
    if (t < 0.05) {
      ctx.fillStyle = '#b00000';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // "Τρεμόπαιγμα" σαν χαλασμένη οθόνη.
    if ((t > 0.28 && t < 0.31) || (t > 0.5 && t < 0.52)) return;

    const zoom = 0.82 + 0.4 * (1 - Math.pow(1 - Math.min(1, t / 0.45), 3));
    const S = Math.min(w, h * 0.72) * zoom;
    const cx = w / 2 + (Math.random() - 0.5) * S * 0.03;
    const cy = h * 0.47 + (Math.random() - 0.5) * S * 0.03;

    ctx.save();
    ctx.translate(cx, cy);

    // Κόκκινη λάμψη πίσω από το κεφάλι.
    const halo = ctx.createRadialGradient(0, 0, S * 0.2, 0, 0, S * 0.8);
    halo.addColorStop(0, 'rgba(120,0,0,0.55)');
    halo.addColorStop(1, 'rgba(120,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-w, -h, w * 2, h * 2);

    // Κεφάλι: μακρόστενο, χλωμό, σκοτεινό στις άκρες.
    const skin = ctx.createRadialGradient(0, -S * 0.12, S * 0.05, 0, 0, S * 0.55);
    skin.addColorStop(0, '#d9d0c1');
    skin.addColorStop(0.55, '#8a7d70');
    skin.addColorStop(1, '#140d0b');
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.34, S * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Βυθισμένα μάγουλα.
    ctx.fillStyle = 'rgba(30,18,14,0.55)';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * S * 0.19, S * 0.12, S * 0.07, S * 0.15, sx * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ρωγμές / φλέβες.
    ctx.strokeStyle = 'rgba(40,10,10,0.7)';
    ctx.lineWidth = Math.max(1, S * 0.004);
    for (const pts of this.cracks) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x * S, y * S); else ctx.lineTo(x * S, y * S);
      });
      ctx.stroke();
    }

    // Βαθιές σκιές γύρω από τα μάτια.
    for (const sx of [-1, 1]) {
      const ex = sx * S * 0.135, ey = -S * 0.1;
      const sh = ctx.createRadialGradient(ex, ey, S * 0.05, ex, ey, S * 0.19);
      sh.addColorStop(0, 'rgba(15,5,5,0.9)');
      sh.addColorStop(1, 'rgba(15,5,5,0)');
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.arc(ex, ey, S * 0.19, 0, Math.PI * 2);
      ctx.fill();
    }

    // Μάτια: μαύρες κοιλότητες με μικρές κόκκινες κόρες και "δάκρυα" αίματος.
    for (const sx of [-1, 1]) {
      const ex = sx * S * 0.135, ey = -S * 0.1;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(ex, ey, S * 0.085, S * 0.125, sx * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(120,0,0,0.8)';
      ctx.lineWidth = S * 0.008;
      ctx.beginPath();
      ctx.moveTo(ex + sx * S * 0.01, ey + S * 0.1);
      ctx.lineTo(ex + sx * S * 0.02, ey + S * 0.26);
      ctx.stroke();

      const pupil = ctx.createRadialGradient(ex, ey + S * 0.01, 0, ex, ey + S * 0.01, S * 0.04);
      pupil.addColorStop(0, 'rgba(255,60,40,1)');
      pupil.addColorStop(0.35, 'rgba(255,0,0,0.8)');
      pupil.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = pupil;
      ctx.beginPath();
      ctx.arc(ex, ey + S * 0.01, S * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }

    // Μύτη: δύο σχισμές.
    ctx.fillStyle = '#1a0f0c';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * S * 0.025, S * 0.07, S * 0.012, S * 0.03, sx * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Στόμα: τεράστιο, ορθάνοιχτο, με ακανόνιστα δόντια.
    const mw = S * 0.15, mh = S * 0.2, my = S * 0.32;
    ctx.fillStyle = '#050000';
    ctx.beginPath();
    ctx.ellipse(0, my, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d6ccb4';
    const teeth = 7;
    for (const row of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const u = (i + 0.5) / teeth * 2 - 1;                 // -1..1 κατά μήκος του στόματος
        const edgeY = my + row * mh * Math.sqrt(Math.max(0, 1 - u * u)) * 0.92;
        const tw = (mw * 2) / teeth * 0.45;
        const len = mh * (0.28 + 0.22 * Math.abs(Math.sin(i * 2.3 + row)));
        const x = u * mw * 0.9;
        ctx.moveTo(x - tw, edgeY);
        ctx.lineTo(x + tw, edgeY);
        ctx.lineTo(x + tw * 0.2, edgeY - row * len);
        ctx.closePath();
      }
      ctx.fill();
    }

    ctx.restore();

    // Θόρυβος "παρεμβολής" πάνω από όλα.
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 40; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * w * 0.3, 1 + Math.random() * 2);
    }
  },
};
