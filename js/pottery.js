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

  // Ο Ορφέας με τη λύρα του, όρθιος, κοιτάζει δεξιά. (x, y) = τα πόδια, s = ύψος.
  // withLyre: σπασμένη λύρα = false (δεν κρατάει τίποτα).
  orpheus(ctx, x, y, s, alpha, withLyre, dir = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const fill = this.rgba(POT.terra, alpha);
    ctx.fillStyle = fill;
    // Κεφάλι με γένια.
    ctx.beginPath();
    ctx.arc(0.02 * s, -0.88 * s, 0.085 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.05 * s, -0.84 * s);
    ctx.lineTo(0.11 * s, -0.8 * s);
    ctx.lineTo(0.03 * s, -0.77 * s);
    ctx.fill();
    // Μακρύς χιτώνας.
    ctx.beginPath();
    ctx.moveTo(-0.09 * s, -0.78 * s);
    ctx.lineTo(0.1 * s, -0.78 * s);
    ctx.lineTo(0.17 * s, 0);
    ctx.lineTo(-0.17 * s, 0);
    ctx.closePath();
    ctx.fill();
    if (alpha > 0.3) {
      this.incise(ctx, [-0.03 * s, -0.6 * s, -0.07 * s, -0.02 * s], s);
      this.incise(ctx, [0.04 * s, -0.6 * s, 0.07 * s, -0.02 * s], s);
      this.incise(ctx, [-0.08 * s, -0.5 * s, 0.09 * s, -0.5 * s], s);
    }
    // Χέρι μπροστά.
    ctx.strokeStyle = fill;
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0.06 * s, -0.72 * s);
    ctx.lineTo(0.2 * s, -0.55 * s);
    ctx.stroke();
    if (withLyre) this.lyre(ctx, 0.26 * s, -0.56 * s, s * 0.34, alpha);
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

  // Σκιά: σκυφτή, τα χέρια απλωμένα μπροστά, κουρελιασμένο ρούχο, κούφιο μάτι.
  // Χρώμα "πρόσθετο κόκκινο" με περίγραμμα πηλού. seed = μικρές διαφορές κάθε φορά.
  shade(ctx, x, y, s, alpha, seed = 0) {
    ctx.save();
    ctx.translate(x, y);
    const j = (i) => Math.sin(seed + i * 2.3) * 0.03 * s;   // "τρέμουλο" περιγράμματος
    ctx.beginPath();
    ctx.moveTo(-0.2 * s, 0);
    // Κουρελιασμένο κάτω μέρος (ζιγκ-ζαγκ).
    for (let i = 0; i <= 6; i++) ctx.lineTo(-0.2 * s + i * 0.07 * s, (i % 2 ? -0.08 : 0) * s + j(i));
    ctx.lineTo(0.18 * s, -0.5 * s + j(7));
    // Απλωμένα χέρια με μακριά δάχτυλα.
    ctx.lineTo(0.42 * s, -0.55 * s + j(8));
    ctx.lineTo(0.5 * s, -0.5 * s);
    ctx.lineTo(0.4 * s, -0.62 * s + j(9));
    ctx.lineTo(0.14 * s, -0.66 * s);
    // Σκυμμένο κεφάλι μπροστά.
    ctx.lineTo(0.2 * s, -0.78 * s + j(10));
    ctx.quadraticCurveTo(0.12 * s, -1.0 * s, -0.04 * s, -0.9 * s);
    ctx.quadraticCurveTo(-0.16 * s, -0.8 * s, -0.12 * s, -0.66 * s);
    ctx.lineTo(-0.24 * s, -0.4 * s + j(11));
    ctx.closePath();
    ctx.fillStyle = this.rgba(POT.red, alpha);
    ctx.fill();
    ctx.strokeStyle = this.rgba(POT.light, alpha * 0.9);
    ctx.lineWidth = Math.max(0.8, s * 0.035);
    ctx.stroke();
    // Κούφιο μάτι και ένα χαραγμένο πλευρό.
    ctx.fillStyle = this.rgba(POT.cream, alpha);
    ctx.beginPath();
    ctx.arc(0.1 * s, -0.84 * s, Math.max(0.8, 0.035 * s), 0, Math.PI * 2);
    ctx.fill();
    this.incise(ctx, [-0.08 * s, -0.55 * s, 0.1 * s, -0.4 * s], s);
    this.incise(ctx, [-0.1 * s, -0.4 * s, 0.08 * s, -0.25 * s], s);
    ctx.restore();
  },

  // Όρθια γυναικεία μορφή (Ευρυδίκη, Περσεφόνη, ψυχή που "θυμάται"): σε "πρόσθετο
  // λευκό", με μακρύ πέπλο που πέφτει στην πλάτη. dir: 1 = κοιτάζει δεξιά.
  woman(ctx, x, y, s, alpha, dir = 1, color = POT.cream) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = this.rgba(color, alpha);
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
