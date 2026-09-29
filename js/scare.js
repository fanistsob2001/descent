'use strict';

// Jump scare (STORY.md, ενότητα 6): το πρόσωπο μιας σκιάς σε στυλ αγγείου — ένα
// γοργόνειο, όπως στον πάτο των αρχαίων κυλίκων. Ορμάει πάνω σου από το σκοτάδι, με
// χέρια σκιών που απλώνονται από τις άκρες, και μετά ο δίσκος σπάει σε κομμάτια
// σαν αγγείο που πέφτει στο πάτωμα.
const SCARE_TIME = 0.65;    // συνολική διάρκεια (δευτ.)
const SCARE_LUNGE = 0.42;   // ώσπου να φτάσει ολόκληρο το πρόσωπο· μετά σπάει
const SCARE_DISC = 512;     // μέγεθος του "ψημένου" δίσκου στο παρασκήνιο (pixels)
const SCARE_R = 250;        // ακτίνα του δίσκου μέσα σε αυτό

const Scare = {
  seed: 0,
  disc: null,       // παρασκήνιο canvas με τον δίσκο ζωγραφισμένο μία φορά
  pieces: [],       // τα θραύσματα του δίσκου
  hands: [],        // τα χέρια που απλώνονται

  // Ετοιμάζει ένα νέο, λίγο διαφορετικό πρόσωπο κάθε φορά (μία φορά ανά θάνατο).
  prepare() {
    this.seed = Math.random() * 100;
    if (!this.disc) {
      this.disc = document.createElement('canvas');
      this.disc.width = this.disc.height = SCARE_DISC;
    }
    const c = this.disc.getContext('2d');
    c.clearRect(0, 0, SCARE_DISC, SCARE_DISC);
    Pottery.gorgoneion(c, SCARE_DISC / 2, SCARE_DISC / 2, SCARE_R, this.seed);
    Pottery.fire(c, SCARE_DISC / 2, SCARE_DISC / 2, SCARE_R, this.seed);

    // Θραύσματα: εσωτερικός δακτύλιος από 5 τριγωνικά κομμάτια και εξωτερικός από 11 τετράπλευρα.
    this.pieces = [];
    const ringPoints = (n) => {
      const a0 = Math.random() * 6.283, out = [];
      for (let i = 0; i < n; i++) out.push(a0 + (i + (Math.random() - 0.5) * 0.5) / n * 6.283);
      return out;
    };
    const P = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
    const ri = 0.42, ro = 1.04;
    const inner = ringPoints(5), outer = ringPoints(11);
    const add = (poly) => {
      const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
      const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
      const len = Math.hypot(cx, cy) || 1;
      this.pieces.push({
        poly, cx, cy,
        vx: cx / len + (Math.random() - 0.5) * 0.5,
        vy: cy / len + (Math.random() - 0.5) * 0.5,
        rot: (Math.random() - 0.5) * 3.2,
        speed: 0.9 + Math.random() * 0.8,
      });
    };
    inner.forEach((a, i) => add([[0, 0], P(ri, a), P(ri, inner[(i + 1) % inner.length] + (i + 1 === inner.length ? 6.283 : 0))]));
    outer.forEach((a, i) => {
      const b = outer[(i + 1) % outer.length] + (i + 1 === outer.length ? 6.283 : 0);
      // Τα όρια του εξωτερικού δακτυλίου δεν ταιριάζουν ακριβώς με του εσωτερικού: είναι
      // σπασμένα με ανώμαλο τρόπο, όπως σπάει ο πηλός.
      add([P(ri * 0.95, a), P(ro, a), P(ro, b), P(ri * 1.02, b)]);
    });

    // Τέσσερα χέρια σκιών από τις άκρες της οθόνης.
    // from = από πού μπαίνουν στην οθόνη (κλάσμα οθόνης), to = πού φτάνουν (σε ακτίνες
    // του προσώπου από το κέντρο του): πάνω από τον δίσκο, σαν να σε αρπάζουν.
    this.hands = [
      { from: [-0.08, 0.86], to: [-0.6, 0.5], size: 1.0, seed: 1.3 },
      { from: [1.08, 0.8], to: [0.62, 0.42], size: 1.05, seed: 2.9 },
      { from: [0.1, 1.08], to: [-0.22, 0.86], size: 0.95, seed: 4.1 },
      { from: [0.95, 1.08], to: [0.3, 0.9], size: 0.9, seed: 5.7 },
    ];
  },

  // Ένα χέρι σκιάς: μακρύς, λεπτός βραχίονας που στενεύει, παλάμη και πέντε μακριά
  // δάχτυλα με νύχια. (bx, by) = η βάση, (hx, hy) = ο καρπός, size = πάχος.
  hand(ctx, bx, by, hx, hy, size, seed, alpha) {
    const ang = Math.atan2(hy - by, hx - bx);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const w0 = size * 0.95, w1 = size * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + nx * w0, by + ny * w0);
    ctx.lineTo(hx + nx * w1, hy + ny * w1);
    ctx.lineTo(hx - nx * w1, hy - ny * w1);
    ctx.lineTo(bx - nx * w0, by - ny * w0);
    ctx.closePath();
    const g = ctx.createLinearGradient(bx, by, hx, hy);
    g.addColorStop(0, 'rgba(40,8,6,0.98)');
    g.addColorStop(1, 'rgba(110,26,20,0.98)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = Pottery.rgba(POT.light, 0.55);
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.stroke();

    // Παλάμη.
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(size * 0.32, 0, size * 0.5, size * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(110,26,20,0.98)';
    ctx.fill();
    ctx.stroke();
    // Δάχτυλα: λυγισμένα, με νύχια στην άκρη.
    for (let i = 0; i < 5; i++) {
      const spread = (i - 2) * 0.42;
      const len = size * (1.1 + (i === 2 ? 0.35 : 0) - Math.abs(i - 2) * 0.12);
      const curl = Math.sin(seed + i * 1.7) * 0.45 + (i - 2) * 0.12;
      const sx = size * 0.72, sy = (i - 2) * size * 0.16;
      const ex = sx + Math.cos(spread) * len, ey = sy + Math.sin(spread) * len;
      ctx.strokeStyle = 'rgba(110,26,20,0.98)';
      ctx.lineWidth = size * 0.17;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo((sx + ex) / 2 + Math.sin(spread + curl) * len * 0.3, (sy + ey) / 2 + curl * len * 0.35, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = Pottery.rgba(POT.cream, 0.9);
      ctx.lineWidth = size * 0.06;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(spread + curl) * size * 0.28, ey + Math.sin(spread + curl) * size * 0.28);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
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
    if (t > 0.21 && t < 0.235) return;

    const lunge = Math.min(1, t / SCARE_LUNGE);
    const grow = 1 - Math.pow(1 - lunge, 3);
    const R = Math.min(w, h) * (0.2 + 0.5 * grow);
    const jit = R * 0.028;
    const cx = w / 2 + (Math.random() - 0.5) * jit;
    const cy = h * 0.47 + (Math.random() - 0.5) * jit;
    const shatter = t > SCARE_LUNGE ? (t - SCARE_LUNGE) / (SCARE_TIME - SCARE_LUNGE) : 0;

    // Κόκκινη λάμψη πίσω από τον δίσκο.
    const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.9);
    halo.addColorStop(0, Pottery.rgba(POT.red, 0.65 * (1 - shatter)));
    halo.addColorStop(1, Pottery.rgba(POT.red, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // Ο δίσκος: ολόκληρος όσο ορμάει, θραύσματα όταν σπάει.
    const k = R / SCARE_R;
    const half = (SCARE_DISC / 2) * k;
    if (shatter === 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(t * 46) * 0.018);
      ctx.drawImage(this.disc, -half, -half, half * 2, half * 2);
      ctx.restore();
    } else {
      const u = shatter;
      for (const pc of this.pieces) {
        const dist = R * 1.7 * pc.speed * u * u;
        const ox = pc.vx * dist, oy = pc.vy * dist + R * 0.9 * u * u;
        ctx.save();
        ctx.translate(cx + ox, cy + oy);
        ctx.translate(pc.cx * R, pc.cy * R);
        ctx.rotate(pc.rot * u);
        ctx.translate(-pc.cx * R, -pc.cy * R);
        ctx.beginPath();
        pc.poly.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0] * R, p[1] * R) : ctx.lineTo(p[0] * R, p[1] * R)));
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = Math.max(0, 1 - u * u);
        ctx.drawImage(this.disc, -half, -half, half * 2, half * 2);
        ctx.restore();
      }
    }

    // Τα χέρια των σκιών, μπροστά από τον δίσκο.
    const handSize = Math.min(w, h) * 0.105;
    for (const hd of this.hands) {
      const p = Math.min(1, grow * 1.05);
      const bx = hd.from[0] * w, by = hd.from[1] * h;
      const tx = cx + hd.to[0] * R, ty = cy + hd.to[1] * R;
      const hx = bx + (tx - bx) * p + (Math.random() - 0.5) * 2.5;
      const hy = by + (ty - by) * p + (Math.random() - 0.5) * 2.5;
      this.hand(ctx, bx, by, hx, hy, handSize * hd.size, hd.seed, 1 - shatter * 0.85);
    }

    // Ζώνες μαιάνδρου πάνω και κάτω, σαν το στεφάνι του αγγείου.
    const band = Math.max(14, w * 0.05);
    Pottery.meander(ctx, 0, h * 0.06, w, band, POT.terra, 0.9 * (1 - shatter));
    Pottery.meander(ctx, 0, h * 0.94 - band, w, band, POT.terra, 0.9 * (1 - shatter));

    // Γρατζουνιές "παρεμβολής" πάνω από όλα.
    ctx.fillStyle = Pottery.rgba(POT.light, 0.09);
    for (let i = 0; i < 34; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * w * 0.3, 1 + Math.random() * 2);
    }
  },
};
