'use strict';

// Jump scare: το πρόσωπο της σκιάς που σε έπιασε, σε pixel art — το ίδιο τέρας με τα
// sprites του παιχνιδιού (κάρβουνο, περίγραμμα πηλού, λευκά μάτια που λάμπουν), από πολύ
// κοντά. Ορμάει από το σκοτάδι, το στόμα ανοίγει, χέρια με νύχια σε αρπάζουν από κάτω,
// η εικόνα "σπάει" σαν χαλασμένο σήμα και στο τέλος τα μάτια φλέγονται.
// Ζωγραφίζεται στον μικρό καμβά του Pixel (σε art pixels), όπως όλος ο κόσμος.
const SCARE_TIME = 0.65;    // συνολική διάρκεια (δευτ.)
const SCARE_LUNGE = 0.3;    // ώσπου να γεμίσει την οθόνη το πρόσωπο

// Το πρόσωπο, από μπροστά. Γράφεται μόνο το αριστερό μισό· το δεξί είναι καθρέφτης.
// k/K = κάρβουνο, p = λάμψη γύρω από τα μάτια, E = λευκά μάτια, R/r = το στόμα, P = δόντια.
const SCARE_HEAD = [
  '..........kkkkk',
  '.......kkkkkkkk',
  '.....kkkkkkkkkk',
  '....Kkkkkkkkkkk',
  '...Kkkkkkkkkkkk',
  '...KkkkkkkkkkKk',
  '..KkkKKKKKKkkKk',
  '..KkKKKKKKKKkkk',
  '..KKKKpEEpKKkkk',
  '..KKKpEEEEpKkkk',
  '..KKKpEEEEpKkkk',
  '..KkKKpEEpKKkkk',
  '..KkKKKKKKKKkkk',
  '...KkkKKKKkkkkk',
  '...KKkkKkkkkKkk',
  '...KKkkKkkkkKkk',
  '....KkkKkkkkkkk',
];
// Το στόμα σε τρία καρέ: κλειστό, μισάνοιχτο, ορθάνοιχτο με κοφτερά δόντια (8 γραμμές).
const SCARE_MOUTH = [
  ['....Kkkkkkkkkkk', '....Kkkkkkkkkkk', '....KkkkkkkkKKK', '....KkKKKKKKkkk',
   '....Kkkkkkkkkkk', '.....Kkkkkkkkkk', '.....Kkkkkkkkkk', '.....kkkkkkkkkk'],
  ['....Kkkkkkkkkkk', '....Kkkkkkkkkkk', '....KkKRRRRRRRR', '....KKPRPRPRPRP',
   '....KKPRPRPRPRP', '.....KRRRRRRRRR', '.....Kkkkkkkkkk', '.....kkkkkkkkkk'],
  ['....KkKRRRRRRRR', '....KKPRPRPRPRP', '....KKRPRRRPRRR', '....KKRrrrrrrrr',
   '....KKRrrrrrrrr', '....KKRRPRRRPRR', '....KKPRPRPRPRP', '.....KKRRRRRRRR'],
];
const SCARE_CHIN = [
  '.....kkkkkkkkkk',
  '......kkkkkkkkk',
  '........kkkkkkk',
  '..........kkkkk',
];
// Χέρι σκιάς με νύχια, που ανεβαίνει από κάτω (το δεξί είναι καθρέφτης του).
const SCARE_HAND = [
  '.PP..PP..PP.....',
  '.kk..kk..kk.....',
  '.kk..kk..kk..PP.',
  '.kk..kk..kk..kk.',
  '.kkk.kkk.kkk.kk.',
  '..kk..kk..kk.kk.',
  '..kkkkkkkkkkkkk.',
  '..kkkkkkkkkkkkk.',
  '..kkkkkkkkkkkk..',
  '...kkkkkkkkkkk..',
  '...kkkkkkkkkk...',
  '....kkkkkkkk....',
  '....kkkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
];
// Κέντρα των ματιών στο πρόσωπο (σε pixels του sprite, με το περίγραμμα).
const SCARE_EYES = [[8.5, 10.5], [22.5, 10.5]];

const Scare = {
  faces: null,    // ένα sprite για κάθε καρέ του στόματος
  hand: null,
  hands: [],      // από πού ανεβαίνουν τα χέρια αυτή τη φορά
  seed: 0,

  build() {
    const mirror = (r) => r + [...r].reverse().join('');
    this.faces = SCARE_MOUTH.map((mouth) =>
      Sprites.build([...SCARE_HEAD, ...mouth, ...SCARE_CHIN].map(mirror), POT.terra));
    this.hand = Sprites.build(SCARE_HAND, POT.terra);
  },

  // Ετοιμάζει ένα λίγο διαφορετικό jump scare κάθε φορά (μία φορά ανά θάνατο).
  prepare() {
    if (!this.faces) this.build();
    this.seed = Math.random() * 100;
    // Δύο ή τρία χέρια: x = θέση στο πλάτος της οθόνης, flip = δεξί χέρι.
    const n = Math.random() < 0.5 ? 2 : 3;
    this.hands = [];
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0;
      this.hands.push({
        x: i === 2 ? 0.4 + Math.random() * 0.2 : left ? 0.14 + Math.random() * 0.12 : 0.74 + Math.random() * 0.12,
        flip: !left,
        delay: 0.14 + Math.random() * 0.1,
        reach: 0.55 + Math.random() * 0.25,
      });
    }
  },

  // t = δευτ. από τη στιγμή του θανάτου. (w, h) = μέγεθος του μικρού καμβά (art pixels).
  draw(ctx, w, h, t) {
    if (t > SCARE_TIME) return;
    if (!this.faces) this.build();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Πρώτα ένα στιγμιαίο κόκκινο φλας.
    if (t < 0.04) {
      ctx.fillStyle = Pottery.rgba(POT.red, 1);
      ctx.fillRect(0, 0, w, h);
      return;
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Ορμάει: από μικρό στο βάθος ως λίγο μεγαλύτερο από την οθόνη.
    const lunge = Math.min(1, (t - 0.04) / (SCARE_LUNGE - 0.04));
    const grow = 1 - Math.pow(1 - lunge, 3);
    const face = this.faces[t < 0.13 ? 0 : t < 0.22 ? 1 : 2];
    const fw = Math.min(w, h * 0.85) * (0.12 + 1.05 * grow);
    const k = fw / face.w;
    const fh = face.h * k;
    const shake = 1 + grow * 3 + (t > 0.45 ? 3 : 0);
    const cx = w / 2 + (Math.random() - 0.5) * shake;
    const cy = h * 0.46 + (Math.random() - 0.5) * shake;
    const x0 = Math.round(cx - fw / 2), y0 = Math.round(cy - fh / 2);

    // Κόκκινη λάμψη πίσω από το κεφάλι.
    const halo = ctx.createRadialGradient(cx, cy, fw * 0.2, cx, cy, fw * 0.9);
    halo.addColorStop(0, Pottery.rgba(POT.red, 0.55));
    halo.addColorStop(1, Pottery.rgba(POT.red, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // Το πρόσωπο. Στις στιγμές της "παρεμβολής" κόβεται σε λωρίδες που γλιστράνε στο πλάι.
    const glitch = (t > 0.19 && t < 0.235) || (t > 0.5 && Math.random() < 0.5);
    if (glitch) {
      const bands = 7;
      for (let b = 0; b < bands; b++) {
        const sy = (face.h / bands) * b, sh = face.h / bands;
        const off = Math.round((Math.random() - 0.5) * fw * 0.18);
        ctx.drawImage(face.c, 0, sy, face.w, sh, x0 + off, y0 + sy * k, fw, sh * k);
      }
    } else {
      ctx.drawImage(face.c, x0, y0, fw, fh);
    }

    // Τα μάτια λάμπουν — και στο τέλος φλέγονται.
    const flare = t > 0.42 ? (t - 0.42) / (SCARE_TIME - 0.42) : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [ex, ey] of SCARE_EYES) {
      const px = x0 + ex * k, py = y0 + ey * k;
      const R = k * (3 + flare * 6) * (0.9 + 0.2 * Math.random());
      const g = ctx.createRadialGradient(px, py, 0, px, py, R);
      g.addColorStop(0, `rgba(255,250,235,${(0.55 + 0.45 * flare).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,250,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - R, py - R, R * 2, R * 2);
    }
    ctx.restore();

    // Χέρια με νύχια που ανεβαίνουν από κάτω και σε αρπάζουν.
    const hk = Math.max(2, Math.round(k * 0.6));
    const hw = this.hand.w * hk, hh = this.hand.h * hk;
    for (const hd of this.hands) {
      const p = Math.max(0, Math.min(1, (t - hd.delay) / 0.14));
      if (p <= 0) continue;
      const rise = 1 - Math.pow(1 - p, 2);
      const hx = Math.round(hd.x * w - hw / 2 + (Math.random() - 0.5) * 2);
      const hy = Math.round(h - hh * hd.reach * rise + (Math.random() - 0.5) * 2);
      ctx.drawImage(hd.flip ? this.hand.f : this.hand.c, hx, hy, hw, hh);
    }

    // Λωρίδες "παρεμβολής" σαν χαλασμένο σήμα, πάνω από όλα.
    ctx.fillStyle = Pottery.rgba(POT.light, 0.12);
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * w * 0.4, 1);
    }
    // Ο λεπτός μαίανδρος πάνω και κάτω, όπως στην οθόνη του παιχνιδιού.
    Pottery.meander(ctx, 0, 0, w, 7, POT.terra, 0.6, 1);
    Pottery.meander(ctx, 0, h - 7, w, 7, POT.terra, 0.6, 1);
  },
};
