'use strict';

// Jump scare (STORY.md, ενότητα 6): το πρόσωπο μιας σκιάς σε στυλ αγγείου —
// ένα γοργόνειο, όπως στον πάτο των αρχαίων κυλίκων (Pottery.gorgoneion).
// Πετάγεται για λίγο πάνω από όλη την οθόνη όταν σε πιάσει μια σκιά.
const SCARE_TIME = 0.65;   // πόσο κρατάει το πρόσωπο (δευτ.)

const Scare = {
  seed: 0,

  // Λίγο διαφορετικό κάθε φορά (τα φίδια στα μαλλιά κινούνται αλλιώς).
  prepare() {
    this.seed = Math.random() * 100;
  },

  // t = δευτ. από τη στιγμή του θανάτου. Σχεδιάζει σε συντεταγμένες οθόνης.
  draw(ctx, w, h, t) {
    if (t > SCARE_TIME) return;

    // Πρώτα ένα στιγμιαίο φλας στο χρώμα του πηλού.
    if (t < 0.05) {
      ctx.fillStyle = Pottery.rgba(POT.terra, 1);
      ctx.fillRect(0, 0, w, h);
      return;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // "Τρεμόπαιγμα" σαν χαλασμένη εικόνα.
    if ((t > 0.28 && t < 0.31) || (t > 0.5 && t < 0.52)) return;

    // Ορμάει προς τα εσένα: από μικρό σε τεράστιο, με ένα μικρό τίναγμα.
    const grow = 1 - Math.pow(1 - Math.min(1, t / 0.4), 3);
    const R = Math.min(w, h) * (0.3 + 0.35 * grow);
    const shake = R * 0.03;
    const cx = w / 2 + (Math.random() - 0.5) * shake;
    const cy = h * 0.48 + (Math.random() - 0.5) * shake;

    // Κόκκινη λάμψη πίσω από τον δίσκο.
    const halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.6);
    halo.addColorStop(0, Pottery.rgba(POT.red, 0.6));
    halo.addColorStop(1, Pottery.rgba(POT.red, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    Pottery.gorgoneion(ctx, cx, cy, R, this.seed + t * 6);

    // Ζώνες μαιάνδρου πάνω και κάτω, σαν το στεφάνι του αγγείου.
    const band = Math.max(14, w * 0.05);
    Pottery.meander(ctx, 0, h * 0.06, w, band, POT.terra, 0.9);
    Pottery.meander(ctx, 0, h * 0.94 - band, w, band, POT.terra, 0.9);

    // Γρατζουνιές "παρεμβολής" πάνω από όλα.
    ctx.fillStyle = Pottery.rgba(POT.light, 0.08);
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * w * 0.3, 1 + Math.random() * 2);
    }
  },
};
