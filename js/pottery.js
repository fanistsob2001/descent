'use strict';

// Το στυλ των αρχαίων ελληνικών αγγείων (STORY.md, ενότητα 6): μαύρο φόντο,
// γραμμές και μορφές στο χρώμα του πηλού (terracotta), μαίανδροι για διακόσμηση.
// Οι μορφές είναι απλές σιλουέτες με "χαραγμένες" μαύρες λεπτομέρειες, όπως
// χάραζαν οι αγγειογράφοι τις λεπτομέρειες πάνω στις μορφές.
const POT = {
  terra: '206,108,56',      // το κύριο χρώμα του πηλού
  light: '236,156,98',      // φωτεινός πηλός (πυρήνας των γραμμών)
  cream: '242,218,184',     // "πρόσθετο λευκό" — γυναίκες, αντικείμενα, ψυχές
  red: '150,38,26',         // "πρόσθετο κόκκινο" — οι σκιές
  black: '10,6,4',          // το μαύρο γάνωμα
};

const Pottery = {
  rgba(color, a) {
    return `rgba(${color},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  },

  // Μαίανδρος (ελληνικό κλειδί) σε λωρίδα ύψους h, από το x ως το x + w.
  // Μια συνεχής γραμμή βάσης με "σπείρες" που υψώνονται από πάνω της.
  meander(ctx, x, y, w, h, color, alpha, lineWidth) {
    const u = h;                      // πλάτος ενός μοτίβου
    ctx.save();
    ctx.strokeStyle = this.rgba(color, alpha);
    ctx.lineWidth = lineWidth || Math.max(1, h / 9);
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'square';
    ctx.beginPath();
    const b = y + h * 0.92, t = y + h * 0.08;
    ctx.moveTo(x, b);
    ctx.lineTo(x + w, b);
    ctx.moveTo(x, t);
    ctx.lineTo(x + w, t);
    for (let ux = x; ux + u <= x + w + 0.01; ux += u) {
      const k = u / 16;
      ctx.moveTo(ux + 13 * k, b);
      ctx.lineTo(ux + 13 * k, y + 3 * k);
      ctx.lineTo(ux + 4 * k, y + 3 * k);
      ctx.lineTo(ux + 4 * k, y + 11 * k);
      ctx.lineTo(ux + 9 * k, y + 11 * k);
      ctx.lineTo(ux + 9 * k, y + 7 * k);
    }
    ctx.stroke();
    ctx.restore();
  },

  // Χαραγμένη λεπτομέρεια: μαύρη γραμμή πάνω στη μορφή.
  incise(ctx, pts, s) {
    ctx.strokeStyle = this.rgba(POT.black, 0.9);
    ctx.lineWidth = Math.max(0.8, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  },

  // Πηλός "ψημένος" στη φωτιά: φωτεινότερος από τη μία πλευρά, σκουρότερος από την άλλη.
  clay(ctx, x0, y0, x1, y1, alpha, base) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, this.rgba(POT.light, alpha));
    g.addColorStop(0.5, this.rgba(base || POT.terra, alpha));
    g.addColorStop(1, this.rgba('116,52,26', alpha));
    return g;
  },

  // Ο Ορφέας με τη λύρα του, κοιτάζει δεξιά (dir = -1: αριστερά). (x, y) = τα πόδια, s = ύψος.
  // withLyre: η λύρα στα χέρια του (φωτίζει όταν είναι ολόκληρη).
  // anim (προαιρετικό) = { phase, speed, t }: περπάτημα — phase σε ακτίνια, speed 0..1, t σε δευτ.
  orpheus(ctx, x, y, s, alpha, withLyre, dir = 1, anim) {
    const ph = anim ? anim.phase : 0, sp = anim ? anim.speed : 0, tm = anim ? anim.t : 0;
    const sw = Math.sin(ph) * sp;
    const bob = Math.abs(Math.cos(ph)) * 0.03 * s * sp;
    const hipY = -0.42 * s, shY = -0.78 * s;
    ctx.save();
    ctx.translate(x, y - bob);
    ctx.scale(dir, 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Μανδύας (χλαμύδα) στην πλάτη: "πρόσθετο κόκκινο", κυματίζει με τον αέρα και το βήμα.
    const flow = 0.04 * s * Math.sin(tm * 3 + ph) + 0.1 * s * sp;
    ctx.fillStyle = this.rgba(POT.red, alpha * 0.92);
    ctx.beginPath();
    ctx.moveTo(-0.01 * s, shY);
    ctx.quadraticCurveTo(-0.17 * s - flow, -0.62 * s, -0.26 * s - flow * 1.7, -0.3 * s + Math.sin(tm * 4 + ph) * 0.025 * s);
    ctx.lineTo(-0.11 * s - flow * 0.6, -0.24 * s);
    ctx.quadraticCurveTo(-0.03 * s, -0.5 * s, 0.05 * s, shY + 0.02 * s);
    ctx.closePath();
    ctx.fill();
    if (alpha > 0.3) this.incise(ctx, [-0.06 * s, -0.66 * s, -0.16 * s - flow, -0.32 * s], s);

    // Πόδια: το πίσω πιο σκούρο. Σηκώνονται λίγο στο βήμα.
    const leg = (swing, lift, shade) => {
      ctx.strokeStyle = this.rgba(shade ? '150,76,40' : POT.terra, alpha);
      ctx.lineWidth = 0.075 * s;
      ctx.beginPath();
      ctx.moveTo(0.01 * s, hipY);
      ctx.lineTo(0.01 * s + swing * 0.17 * s, -0.02 * s - lift * 0.06 * s);
      ctx.stroke();
      // Σανδάλι.
      ctx.strokeStyle = this.rgba(POT.black, alpha * 0.9);
      ctx.lineWidth = 0.03 * s;
      ctx.beginPath();
      const fx = 0.01 * s + swing * 0.17 * s, fy = -0.02 * s - lift * 0.06 * s;
      ctx.moveTo(fx - 0.03 * s, fy + 0.02 * s);
      ctx.lineTo(fx + 0.07 * s, fy + 0.02 * s);
      ctx.stroke();
    };
    leg(-sw, Math.max(0, -Math.cos(ph)) * sp, true);

    // Πίσω χέρι, ταλαντεύεται αντίθετα από το πόδι.
    ctx.strokeStyle = this.rgba('150,76,40', alpha);
    ctx.lineWidth = 0.06 * s;
    ctx.beginPath();
    ctx.moveTo(-0.01 * s, shY + 0.05 * s);
    ctx.lineTo(-0.05 * s + sw * 0.1 * s, -0.56 * s);
    ctx.stroke();

    // Χιτώνας με πτυχές και ζώνη, το τελείωμα ταλαντεύεται.
    const hem = Math.sin(ph * 2) * 0.014 * s * sp;
    ctx.fillStyle = this.clay(ctx, -0.13 * s, 0, 0.15 * s, 0, alpha);
    ctx.beginPath();
    ctx.moveTo(-0.09 * s, shY);
    ctx.lineTo(0.11 * s, shY);
    ctx.lineTo(0.085 * s, -0.5 * s);
    ctx.lineTo(0.155 * s + hem, -0.29 * s);
    ctx.lineTo(-0.135 * s - hem, -0.29 * s);
    ctx.lineTo(-0.07 * s, -0.5 * s);
    ctx.closePath();
    ctx.fill();
    if (alpha > 0.3) {
      ctx.strokeStyle = this.rgba(POT.black, 0.9);
      ctx.lineWidth = Math.max(0.8, s * 0.028);
      ctx.beginPath();
      ctx.moveTo(-0.075 * s, -0.5 * s);
      ctx.lineTo(0.088 * s, -0.5 * s);   // ζώνη
      ctx.stroke();
      this.incise(ctx, [-0.03 * s, -0.5 * s, -0.06 * s - hem, -0.31 * s], s);
      this.incise(ctx, [0.03 * s, -0.5 * s, 0.05 * s + hem, -0.31 * s], s);
      this.incise(ctx, [-0.12 * s - hem, -0.32 * s, 0.14 * s + hem, -0.32 * s], s);   // τελείωμα
      this.incise(ctx, [-0.05 * s, -0.75 * s, -0.04 * s, -0.55 * s], s);
    }

    leg(sw, Math.max(0, Math.cos(ph)) * sp, false);

    // Μπροστινό χέρι που κρατάει τη λύρα.
    ctx.strokeStyle = this.rgba(POT.terra, alpha);
    ctx.lineWidth = 0.065 * s;
    ctx.beginPath();
    ctx.moveTo(0.07 * s, shY + 0.05 * s);
    ctx.lineTo(0.13 * s, -0.62 * s);
    ctx.lineTo(0.2 * s, -0.58 * s);
    ctx.stroke();
    if (withLyre) {
      // Φωτεινή λάμψη: η λύρα είναι ξανά ολόκληρη.
      const glow = ctx.createRadialGradient(0.27 * s, -0.6 * s, 0, 0.27 * s, -0.6 * s, 0.32 * s);
      glow.addColorStop(0, this.rgba(POT.cream, alpha * (0.28 + 0.08 * Math.sin(tm * 2.4))));
      glow.addColorStop(1, this.rgba(POT.cream, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0.27 * s, -0.6 * s, 0.32 * s, 0, Math.PI * 2);
      ctx.fill();
      this.lyre(ctx, 0.27 * s, -0.62 * s, s * 0.36, alpha);
    }

    // Κεφάλι: πρόσωπο από πηλό, μαύρα μαλλιά με μπούκλες, γένια, μάτι.
    const hx = 0.035 * s, hy = -0.885 * s, hr = 0.078 * s;
    ctx.fillStyle = this.clay(ctx, hx - hr, hy, hx + hr, hy, alpha);
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();     // μύτη
    ctx.moveTo(hx + hr * 0.85, hy - hr * 0.15);
    ctx.lineTo(hx + hr * 1.3, hy + hr * 0.25);
    ctx.lineTo(hx + hr * 0.8, hy + hr * 0.3);
    ctx.fill();
    ctx.fillStyle = this.rgba(POT.black, alpha);
    ctx.beginPath();     // κάλυμμα μαλλιών
    ctx.arc(hx, hy, hr * 1.06, Math.PI * 0.72, Math.PI * 1.88);
    ctx.lineTo(hx + hr * 0.25, hy - hr * 0.1);
    ctx.closePath();
    ctx.fill();
    for (const [cx, cy] of [[-0.9, 0.35], [-0.75, 0.75], [-0.35, 1.0]]) {
      ctx.beginPath();
      ctx.arc(hx + hr * cx, hy + hr * cy, hr * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();     // γένια
    ctx.moveTo(hx + hr * 0.45, hy + hr * 0.55);
    ctx.lineTo(hx + hr * 1.05, hy + hr * 0.55);
    ctx.lineTo(hx + hr * 0.7, hy + hr * 1.5);
    ctx.closePath();
    ctx.fill();
    if (alpha > 0.3) {
      ctx.fillStyle = this.rgba(POT.cream, alpha);
      ctx.beginPath();
      ctx.arc(hx + hr * 0.5, hy - hr * 0.1, Math.max(0.5, hr * 0.13), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // Λύρα (κέλυς): σώμα, δύο βραχίονες, ζυγός, χορδές. (x, y) = κέντρο, s = ύψος.
  lyre(ctx, x, y, s, alpha) {
    ctx.strokeStyle = this.rgba(POT.light, alpha);
    ctx.lineWidth = Math.max(0.8, s * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 0.3 * s, y - 0.45 * s);
    ctx.quadraticCurveTo(x - 0.4 * s, y + 0.25 * s, x, y + 0.45 * s);
    ctx.quadraticCurveTo(x + 0.4 * s, y + 0.25 * s, x + 0.3 * s, y - 0.45 * s);
    ctx.moveTo(x - 0.34 * s, y - 0.38 * s);
    ctx.lineTo(x + 0.34 * s, y - 0.38 * s);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.5, s * 0.025);
    ctx.beginPath();
    for (const dx of [-0.1, 0, 0.1]) {
      ctx.moveTo(x + dx * s, y - 0.38 * s);
      ctx.lineTo(x + dx * s, y + 0.35 * s);
    }
    ctx.stroke();
  },

  // Σκιά: σκυφτή, με απλωμένα χέρια, ημιδιαφανές "ρούχο" που ξεφτίζει προς τα κάτω
  // και κινείται σαν καπνός, και ένα κούφιο μάτι που λάμπει.
  // seed = μικρές διαφορές κάθε φορά, t = χρόνος για την κίνηση των ξεφτιών.
  shade(ctx, x, y, s, alpha, seed = 0, t = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    const j = (i) => Math.sin(seed + i * 2.3 + t * 1.6) * 0.022 * s;

    // Η κόκκινη ομίχλη γύρω της.
    const halo = ctx.createRadialGradient(0.05 * s, -0.5 * s, 0, 0.05 * s, -0.5 * s, 0.85 * s);
    halo.addColorStop(0, this.rgba(POT.red, alpha * 0.28));
    halo.addColorStop(1, this.rgba(POT.red, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-0.85 * s, -1.4 * s, 1.7 * s, 1.7 * s);

    // Σώμα: διαφάνεια που αυξάνεται προς τα κάτω.
    const g = ctx.createLinearGradient(0, -1.0 * s, 0, 0.08 * s);
    g.addColorStop(0, this.rgba('190,52,36', alpha));
    g.addColorStop(0.6, this.rgba('120,30,22', alpha * 0.95));
    g.addColorStop(1, this.rgba('80,16,12', 0));
    ctx.beginPath();
    ctx.moveTo(-0.22 * s, 0.02 * s);
    for (let i = 0; i <= 6; i++) {
      const wave = Math.sin(t * 2.4 + i * 1.3 + seed) * 0.05 * s;
      ctx.lineTo(-0.22 * s + i * 0.072 * s + wave * 0.4, ((i % 2 ? -0.11 : 0.03) * s) + wave);
    }
    ctx.lineTo(0.19 * s, -0.5 * s + j(7));
    ctx.lineTo(0.44 * s, -0.55 * s + j(8));      // βραχίονας που απλώνεται
    ctx.lineTo(0.5 * s, -0.51 * s);
    ctx.lineTo(0.42 * s, -0.63 * s + j(9));
    ctx.lineTo(0.14 * s, -0.67 * s);
    ctx.lineTo(0.2 * s, -0.79 * s + j(10));      // κεφάλι σκυμμένο
    ctx.quadraticCurveTo(0.12 * s, -1.02 * s, -0.04 * s, -0.91 * s);
    ctx.quadraticCurveTo(-0.17 * s, -0.8 * s, -0.12 * s, -0.66 * s);
    ctx.lineTo(-0.25 * s, -0.4 * s + j(11));
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = this.rgba(POT.light, alpha * 0.85);
    ctx.lineWidth = Math.max(0.8, s * 0.03);
    ctx.stroke();

    // Μακριά δάχτυλα με νύχια στο απλωμένο χέρι.
    ctx.strokeStyle = this.rgba(POT.light, alpha * 0.9);
    ctx.lineWidth = Math.max(0.7, s * 0.022);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [dx, dy] of [[0.13, -0.05], [0.16, 0.02], [0.13, 0.09]]) {
      const fx = 0.48 * s, fy = -0.55 * s + Math.sin(t * 3 + dy * 40 + seed) * 0.012 * s;
      ctx.moveTo(fx, fy + dy * 0.2 * s);
      ctx.quadraticCurveTo(fx + dx * 0.6 * s, fy + dy * 0.6 * s, fx + dx * s, fy + dy * s + 0.02 * s);
    }
    ctx.stroke();

    // Χαραγμένα πλευρά.
    this.incise(ctx, [-0.09 * s, -0.56 * s, 0.11 * s, -0.42 * s], s);
    this.incise(ctx, [-0.11 * s, -0.42 * s, 0.09 * s, -0.27 * s], s);

    // Το κούφιο μάτι: μια λάμψη που αναβοσβήνει.
    const flick = 0.75 + 0.25 * Math.sin(t * 9 + seed * 3);
    const eg = ctx.createRadialGradient(0.1 * s, -0.85 * s, 0, 0.1 * s, -0.85 * s, 0.11 * s);
    eg.addColorStop(0, this.rgba(POT.cream, alpha * flick));
    eg.addColorStop(0.35, this.rgba('255,80,50', alpha * flick * 0.8));
    eg.addColorStop(1, this.rgba('255,60,40', 0));
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(0.1 * s, -0.85 * s, 0.11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // Όρθια γυναικεία μορφή (Ευρυδίκη, Περσεφόνη, ψυχή που "θυμάται"): σε "πρόσθετο
  // λευκό", με μακρύ πέπλο που πέφτει στην πλάτη. dir: 1 = κοιτάζει δεξιά.
  woman(ctx, x, y, s, alpha, dir = 1, color = POT.cream) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const g = ctx.createLinearGradient(-0.2 * s, 0, 0.15 * s, 0);
    g.addColorStop(0, this.rgba(color, alpha));
    g.addColorStop(1, this.rgba('190,168,140', alpha));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0.02 * s, -0.87 * s, 0.08 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    // Πέπλος από το κεφάλι ως κάτω, και το ρούχο.
    ctx.moveTo(-0.05 * s, -0.94 * s);
    ctx.quadraticCurveTo(-0.16 * s, -0.7 * s, -0.2 * s, 0);
    ctx.lineTo(0.15 * s, 0);
    ctx.lineTo(0.09 * s, -0.76 * s);
    ctx.lineTo(0.04 * s, -0.8 * s);
    ctx.closePath();
    ctx.fill();
    if (alpha > 0.3) {
      this.incise(ctx, [-0.1 * s, -0.7 * s, -0.14 * s, -0.02 * s], s);
      this.incise(ctx, [0.0 * s, -0.55 * s, 0.03 * s, -0.02 * s], s);
      this.incise(ctx, [-0.12 * s, -0.42 * s, 0.1 * s, -0.42 * s], s);
    }
    ctx.restore();
  },

  // Τρίποδας με λεκάνη φωτιάς (βωμός). (x, y) = το έδαφος στη μέση, s = ύψος.
  brazier(ctx, x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.rgba(POT.terra, alpha);
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();     // τρία πόδια
    ctx.moveTo(-0.34 * s, 0); ctx.lineTo(-0.16 * s, -0.5 * s);
    ctx.moveTo(0.34 * s, 0); ctx.lineTo(0.16 * s, -0.5 * s);
    ctx.moveTo(0, 0); ctx.lineTo(0, -0.5 * s);
    ctx.stroke();
    // Λεκάνη με ζώνη μαιάνδρου.
    ctx.fillStyle = this.clay(ctx, -0.5 * s, 0, 0.5 * s, 0, alpha);
    ctx.beginPath();
    ctx.moveTo(-0.5 * s, -0.62 * s);
    ctx.quadraticCurveTo(-0.44 * s, -0.4 * s, 0, -0.36 * s);
    ctx.quadraticCurveTo(0.44 * s, -0.4 * s, 0.5 * s, -0.62 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = this.rgba(POT.black, alpha * 0.9);
    ctx.lineWidth = Math.max(0.8, s * 0.03);
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(i * 0.11 * s - 0.03 * s, -0.5 * s);
      ctx.lineTo(i * 0.11 * s - 0.03 * s, -0.56 * s);
      ctx.lineTo(i * 0.11 * s + 0.03 * s, -0.56 * s);
    }
    ctx.stroke();
    ctx.strokeStyle = this.rgba(POT.light, alpha);
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath();     // χείλος
    ctx.moveTo(-0.54 * s, -0.63 * s);
    ctx.lineTo(0.54 * s, -0.63 * s);
    ctx.stroke();
    ctx.restore();
  },

  // "Ψήσιμο" του πηλού πάνω σε έναν δίσκο (cx, cy, R): φως από πάνω αριστερά, σκοτεινές
  // άκρες, κόκκοι, ρωγμές. Για το γοργόνειο του jump scare.
  fire(ctx, cx, cy, R, seed) {
    const rnd = (i) => Math.abs(Math.sin(seed * 91.7 + i * 12.9898) * 43758.5453) % 1;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R * 1.05);
    g.addColorStop(0, 'rgba(255,214,160,0.26)');
    g.addColorStop(0.45, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // Κόκκοι στην επιφάνεια.
    for (let i = 0; i < 420; i++) {
      const a = rnd(i) * Math.PI * 2, d = Math.sqrt(rnd(i + 900)) * R;
      ctx.fillStyle = rnd(i + 1800) > 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,200,150,0.16)';
      const sz = R * (0.003 + rnd(i + 2700) * 0.006);
      ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, sz, sz);
    }
    // Ρωγμές από την άκρη προς το κέντρο.
    ctx.strokeStyle = 'rgba(12,5,3,0.85)';
    ctx.lineWidth = Math.max(1, R * 0.008);
    ctx.lineJoin = 'round';
    for (let c = 0; c < 6; c++) {
      let ang = rnd(c + 50) * Math.PI * 2, d = R * 1.02;
      let px = cx + Math.cos(ang) * d, py = cy + Math.sin(ang) * d;
      ctx.beginPath();
      ctx.moveTo(px, py);
      const steps = 5 + Math.floor(rnd(c + 70) * 5);
      for (let k = 0; k < steps; k++) {
        ang += (rnd(c * 20 + k + 100) - 0.5) * 0.9;
        d -= R * (0.08 + rnd(c * 20 + k + 300) * 0.09);
        px = cx + Math.cos(ang) * d;
        py = cy + Math.sin(ang) * d;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  },


  // Καθιστή μορφή σε θρόνο (Άδης με σκήπτρο / Περσεφόνη). dir: προς τα πού κοιτάζει.
  seated(ctx, x, y, s, alpha, dir, color, scepter) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const fill = this.rgba(color, alpha);
    // Θρόνος (κλισμός).
    ctx.strokeStyle = this.rgba(POT.terra, alpha);
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath();
    ctx.moveTo(-0.22 * s, -0.95 * s);
    ctx.quadraticCurveTo(-0.2 * s, -0.5 * s, -0.16 * s, -0.42 * s);
    ctx.lineTo(0.14 * s, -0.42 * s);
    ctx.moveTo(-0.16 * s, -0.42 * s);
    ctx.lineTo(-0.2 * s, 0);
    ctx.moveTo(0.12 * s, -0.42 * s);
    ctx.lineTo(0.16 * s, 0);
    ctx.stroke();
    // Σώμα: κορμός, μηροί, κνήμες.
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(-0.02 * s, -0.95 * s, 0.075 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.12 * s, -0.86 * s);
    ctx.lineTo(0.05 * s, -0.86 * s);
    ctx.lineTo(0.06 * s, -0.5 * s);
    ctx.lineTo(0.22 * s, -0.5 * s);
    ctx.lineTo(0.24 * s, 0);
    ctx.lineTo(0.12 * s, 0);
    ctx.lineTo(0.1 * s, -0.36 * s);
    ctx.lineTo(-0.14 * s, -0.38 * s);
    ctx.closePath();
    ctx.fill();
    if (scepter) {
      ctx.strokeStyle = this.rgba(POT.light, alpha);
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(0.17 * s, -1.15 * s);
      ctx.lineTo(0.17 * s, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.17 * s, -1.17 * s, 0.035 * s, 0, Math.PI * 2);
      ctx.fillStyle = this.rgba(POT.light, alpha);
      ctx.fill();
    }
    ctx.restore();
  },

  // Ο Κέρβερος ξαπλωμένος, κοιτάζει δεξιά: σώμα, μπροστινά πόδια απλωμένα, τρία
  // κεφάλια το ένα πάνω από το άλλο, ουρά-φίδι. (x, y) = το έδαφος στη μέση, L = μήκος.
  // barking[i] = true όταν το κεφάλι i γαβγίζει (0 = μπροστινό/χαμηλό, 2 = πίσω/ψηλό):
  // τότε ανοίγει το στόμα και το μάτι του. breath = 0..1, πολύ ήπια ανάσα στον ύπνο.
  cerberus(ctx, x, y, L, alpha, barking, breath) {
    const fill = this.rgba(POT.terra, alpha);
    const b = 1 + 0.03 * breath;
    ctx.save();
    ctx.translate(x, y);

    // Ουρά-φίδι που κουλουριάζεται πίσω.
    ctx.strokeStyle = fill;
    ctx.lineWidth = L * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.36 * L, -0.14 * L);
    ctx.quadraticCurveTo(-0.55 * L, -0.12 * L, -0.5 * L, -0.28 * L);
    ctx.quadraticCurveTo(-0.45 * L, -0.4 * L, -0.56 * L, -0.42 * L);
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-0.55 * L, -0.45 * L);
    ctx.lineTo(-0.63 * L, -0.42 * L);
    ctx.lineTo(-0.55 * L, -0.39 * L);
    ctx.fill();

    // Σώμα και πίσω πόδι.
    ctx.beginPath();
    ctx.ellipse(-0.1 * L, -0.15 * L * b, 0.3 * L, 0.14 * L * b, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-0.3 * L, -0.08 * L, 0.12 * L, 0.08 * L, 0, 0, Math.PI * 2);
    ctx.fill();
    // Μπροστινά πόδια απλωμένα μπροστά, με τα κεφάλια ακουμπισμένα πάνω τους.
    ctx.beginPath();
    ctx.moveTo(0.05 * L, -0.07 * L);
    ctx.lineTo(0.46 * L, -0.05 * L);
    ctx.quadraticCurveTo(0.5 * L, -0.02 * L, 0.46 * L, 0);
    ctx.lineTo(0.05 * L, 0);
    ctx.closePath();
    ctx.fill();
    // Χαραγμένα πλευρά και κολάρο.
    if (alpha > 0.3) {
      for (const k of [-0.2, -0.1, 0]) {
        this.incise(ctx, [k * L - 0.03 * L, -0.24 * L, k * L + 0.02 * L, -0.08 * L], L * 0.5);
      }
      this.incise(ctx, [0.36 * L, -0.03 * L, 0.36 * L, 0], L * 0.4);
      this.incise(ctx, [0.42 * L, -0.03 * L, 0.42 * L, 0], L * 0.4);
    }

    // Τα τρία κεφάλια: από το πίσω (ψηλό) προς το μπροστινό (χαμηλό).
    const heads = [
      { hx: 0.33, hy: -0.11 },   // 0: μπροστινό, χαμηλό
      { hx: 0.27, hy: -0.23 },   // 1: μεσαίο
      { hx: 0.19, hy: -0.35 },   // 2: πίσω, ψηλό
    ];
    for (let i = 2; i >= 0; i--) {
      const barkNow = barking && barking[i];
      const hx = heads[i].hx * L, hy = (heads[i].hy - (barkNow ? 0.03 : 0)) * L;
      ctx.fillStyle = fill;
      // Λαιμός από τους ώμους ως το κεφάλι.
      ctx.beginPath();
      ctx.moveTo(0.05 * L, -0.22 * L);
      ctx.lineTo(hx - 0.02 * L, hy - 0.05 * L);
      ctx.lineTo(hx + 0.01 * L, hy + 0.05 * L);
      ctx.lineTo(0.12 * L, -0.08 * L);
      ctx.closePath();
      ctx.fill();
      // Κρανίο, αυτί, μουσούδα.
      ctx.beginPath();
      ctx.ellipse(hx, hy, 0.085 * L, 0.062 * L, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 0.05 * L, hy - 0.04 * L);
      ctx.lineTo(hx - 0.075 * L, hy - 0.13 * L);
      ctx.lineTo(hx + 0.005 * L, hy - 0.055 * L);
      ctx.fill();
      ctx.beginPath();
      if (barkNow) {
        // Ανοιχτό στόμα: πάνω σαγόνι σηκωμένο, κάτω σαγόνι κατεβασμένο.
        ctx.moveTo(hx + 0.04 * L, hy - 0.03 * L);
        ctx.lineTo(hx + 0.17 * L, hy - 0.05 * L);
        ctx.lineTo(hx + 0.16 * L, hy - 0.01 * L);
        ctx.lineTo(hx + 0.05 * L, hy + 0.005 * L);
        ctx.lineTo(hx + 0.14 * L, hy + 0.05 * L);
        ctx.lineTo(hx + 0.12 * L, hy + 0.075 * L);
        ctx.lineTo(hx + 0.03 * L, hy + 0.05 * L);
      } else {
        ctx.moveTo(hx + 0.04 * L, hy - 0.03 * L);
        ctx.lineTo(hx + 0.16 * L, hy - 0.005 * L);
        ctx.lineTo(hx + 0.155 * L, hy + 0.03 * L);
        ctx.lineTo(hx + 0.04 * L, hy + 0.045 * L);
      }
      ctx.closePath();
      ctx.fill();
      // Μάτι: κλειστό (χαραγμένο τόξο) όταν κοιμάται, ανοιχτό όταν γαβγίζει.
      if (barkNow) {
        ctx.fillStyle = this.rgba(POT.cream, alpha);
        ctx.beginPath();
        ctx.arc(hx + 0.025 * L, hy - 0.015 * L, 0.012 * L, 0, Math.PI * 2);
        ctx.fill();
      } else if (alpha > 0.3) {
        ctx.strokeStyle = this.rgba(POT.black, 0.9);
        ctx.lineWidth = Math.max(0.8, L * 0.008);
        ctx.beginPath();
        ctx.arc(hx + 0.025 * L, hy - 0.02 * L, 0.014 * L, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
      // Περίγραμμα, ώστε τα κεφάλια να ξεχωρίζουν μεταξύ τους.
      ctx.strokeStyle = this.rgba(POT.black, 0.85);
      ctx.lineWidth = Math.max(0.8, L * 0.008);
      ctx.beginPath();
      ctx.ellipse(hx, hy, 0.085 * L, 0.062 * L, 0, Math.PI * 0.6, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Γοργόνειο: μετωπικό πρόσωπο-τέρας, όπως στον πάτο των αρχαίων κυλίκων —
  // εδώ είναι το πρόσωπο μιας σκιάς για το jump scare. Μαύρη μορφή πάνω σε
  // κύκλο από πηλό, με χαραγμένες λεπτομέρειες. (cx, cy) κέντρο, R ακτίνα.
  gorgoneion(ctx, cx, cy, R, seed) {
    ctx.save();
    ctx.translate(cx, cy);
    // Ο δίσκος από πηλό, με διπλό περίγραμμα και μαίανδρο γύρω γύρω.
    ctx.fillStyle = this.rgba(POT.terra, 1);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.rgba(POT.black, 1);
    ctx.lineWidth = R * 0.02;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.97, 0, Math.PI * 2);
    ctx.arc(0, 0, R * 0.84, 0, Math.PI * 2);
    ctx.stroke();
    const n = 28;
    for (let i = 0; i < n; i++) {
      // Μικρά "κλειδιά" του μαιάνδρου κατά μήκος του δακτυλίου.
      ctx.save();
      ctx.rotate((i / n) * Math.PI * 2);
      ctx.beginPath();
      const r0 = R * 0.86, r1 = R * 0.95, a = R * 0.06;
      ctx.moveTo(-a, -r0);
      ctx.lineTo(-a, -r1);
      ctx.lineTo(a, -r1);
      ctx.lineTo(a, -r0 - (r1 - r0) * 0.4);
      ctx.lineTo(0, -r0 - (r1 - r0) * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    const S = R * 0.8;
    // Φίδια για μαλλιά.
    ctx.strokeStyle = this.rgba(POT.black, 1);
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.05;
    for (let i = 0; i < 9; i++) {
      const ang = Math.PI * (1.08 + (i / 8) * 0.84);
      const bx = Math.cos(ang) * S * 0.55, by = Math.sin(ang) * S * 0.6 - S * 0.05;
      const ex = Math.cos(ang) * S * 0.95, ey = Math.sin(ang) * S * 0.95;
      const w = Math.sin(seed + i) * S * 0.08;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + ex) / 2 + w, (by + ey) / 2 - w, ex, ey);
      ctx.stroke();
      ctx.fillStyle = this.rgba(POT.black, 1);
      ctx.beginPath();
      ctx.arc(ex, ey, S * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }

    // Το πρόσωπο: πλατύ, μαύρο.
    ctx.fillStyle = this.rgba(POT.black, 1);
    ctx.beginPath();
    ctx.ellipse(0, S * 0.02, S * 0.56, S * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();

    // Χαραγμένα φρύδια και ρυτίδες (σε χρώμα πηλού).
    ctx.strokeStyle = this.rgba(POT.terra, 1);
    ctx.lineWidth = S * 0.022;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * S * 0.04, -S * 0.3);
      ctx.quadraticCurveTo(sx * S * 0.2, -S * 0.42, sx * S * 0.42, -S * 0.3);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-S * 0.1, -S * 0.45);
    ctx.lineTo(S * 0.1, -S * 0.45);
    ctx.stroke();

    // Τεράστια στρογγυλά μάτια: λευκό με κόκκινη κόρη που "καίει".
    for (const sx of [-1, 1]) {
      const ex = sx * S * 0.22, ey = -S * 0.15;
      ctx.fillStyle = this.rgba(POT.cream, 1);
      ctx.beginPath();
      ctx.arc(ex, ey, S * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.rgba(POT.black, 1);
      ctx.lineWidth = S * 0.02;
      ctx.stroke();
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, S * 0.08);
      g.addColorStop(0, 'rgba(255,70,40,1)');
      g.addColorStop(1, this.rgba(POT.red, 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, ey, S * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }

    // Μύτη (χαραγμένη).
    ctx.strokeStyle = this.rgba(POT.terra, 1);
    ctx.lineWidth = S * 0.022;
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.05);
    ctx.lineTo(-S * 0.06, S * 0.12);
    ctx.lineTo(S * 0.06, S * 0.12);
    ctx.stroke();

    // Στόμα: πλατύ χαμόγελο, χαυλιόδοντες, γλώσσα έξω (πρόσθετο κόκκινο).
    const my = S * 0.3;
    ctx.fillStyle = this.rgba(POT.red, 1);
    ctx.beginPath();
    ctx.moveTo(-S * 0.1, my);
    ctx.quadraticCurveTo(0, my + S * 0.42, S * 0.1, my);
    ctx.fill();
    ctx.strokeStyle = this.rgba(POT.terra, 1);
    ctx.lineWidth = S * 0.025;
    ctx.beginPath();
    ctx.moveTo(-S * 0.36, my - S * 0.04);
    ctx.quadraticCurveTo(0, my + S * 0.12, S * 0.36, my - S * 0.04);
    ctx.stroke();
    ctx.fillStyle = this.rgba(POT.cream, 1);
    for (const sx of [-1, 1]) {
      // Χαυλιόδοντες προς τα πάνω και προς τα κάτω.
      ctx.beginPath();
      ctx.moveTo(sx * S * 0.2, my + S * 0.02);
      ctx.lineTo(sx * S * 0.26, my - S * 0.02);
      ctx.lineTo(sx * S * 0.24, my + S * 0.2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx * S * 0.12, my + S * 0.05);
      ctx.lineTo(sx * S * 0.17, my + S * 0.04);
      ctx.lineTo(sx * S * 0.15, my - S * 0.12);
      ctx.fill();
    }
    ctx.restore();
  },
};
