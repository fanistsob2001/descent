'use strict';

// Πόσο κρατάει το φως ενός τοίχου μετά το πέρασμα του κύματος (δευτ.).
const ECHO_FADE = 1.5;
// Ταχύτητα διάδοσης του κύματος (μονάδες κόσμου / δευτ.).
const WAVE_SPEED = 430;
// Επίπεδα διαφάνειας για ομαδοποιημένη σχεδίαση (λιγότερα stroke = πιο γρήγορα).
const ALPHA_BUCKETS = 14;

const Echoes = {
  waves: [],
  litTime: null,      // πότε φωτίστηκε τελευταία φορά κάθε κομμάτι τοίχου
  litStrength: null,  // πόσο δυνατά φωτίστηκε
  listeners: [],      // συναρτήσεις που "ακούνε" κάθε νέο ήχο (π.χ. τέρατα αργότερα)
  _buckets: null,

  init() {
    const n = Level.segCount;
    this.waves = [];
    this.litTime = new Float32Array(n).fill(-1e6);
    this.litStrength = new Float32Array(n);
    this._buckets = [];
    for (let b = 0; b < ALPHA_BUCKETS; b++) this._buckets.push([]);
  },

  // Νέος ήχος στο (x, y). radius = πόσο μακριά φτάνει, strength = 0..1.
  // kind: 'step' | 'call' (για μελλοντική χρήση από τέρατα).
  emit(x, y, radius, strength, kind) {
    const L = Level;
    const r2 = radius * radius;
    const hits = [];
    for (let i = 0; i < L.segCount; i++) {
      const dx = L.testX[i] - x, dy = L.testY[i] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      if (!L.lineOfSight(x, y, L.testX[i], L.testY[i])) continue;
      hits.push({ i, d: Math.sqrt(d2) });
    }
    hits.sort((a, b) => a.d - b.d);

    const wave = { x, y, radius, strength, kind, r: 0, hits, ptr: 0 };
    this.waves.push(wave);
    for (const fn of this.listeners) fn(wave);
    return wave;
  },

  update(dt, now) {
    for (let w = this.waves.length - 1; w >= 0; w--) {
      const wave = this.waves[w];
      wave.r += WAVE_SPEED * dt;

      while (wave.ptr < wave.hits.length && wave.hits[wave.ptr].d <= wave.r) {
        const h = wave.hits[wave.ptr++];
        const t = h.d / wave.radius;
        const s = wave.strength * Math.pow(1 - t, 0.7);
        // Ανανεώνουμε μόνο αν το νέο φως είναι πιο δυνατό από όσο έχει μείνει.
        const age = now - this.litTime[h.i];
        const current = age < ECHO_FADE ? this.litStrength[h.i] * (1 - age / ECHO_FADE) : 0;
        if (s > current) {
          this.litTime[h.i] = now;
          this.litStrength[h.i] = s;
        }
      }

      if (wave.r >= wave.radius) this.waves.splice(w, 1);
    }
  },

  // view = ορατό ορθογώνιο σε συντεταγμένες κόσμου, scale = CSS pixels ανά μονάδα κόσμου.
  draw(ctx, now, view, scale) {
    const L = Level;
    const buckets = this._buckets;
    for (const b of buckets) b.length = 0;

    for (let i = 0; i < L.segCount; i++) {
      const age = now - this.litTime[i];
      if (age >= ECHO_FADE) continue;
      const x1 = L.segX1[i], y1 = L.segY1[i];
      if (x1 < view.x0 - TILE || x1 > view.x1 + TILE ||
          y1 < view.y0 - TILE || y1 > view.y1 + TILE) continue;
      const f = 1 - age / ECHO_FADE;
      const a = this.litStrength[i] * f * Math.sqrt(f);
      if (a < 0.015) continue;
      const b = Math.min(ALPHA_BUCKETS - 1, Math.floor(a * ALPHA_BUCKETS));
      buckets[b].push(i);
    }

    ctx.lineCap = 'butt';
    // Δύο περάσματα: φαρδιά αχνή λάμψη και λεπτός φωτεινός πυρήνας.
    const passes = [
      { width: 7 / scale, color: '120,170,255', mul: 0.18 },
      { width: 1.8 / scale, color: '215,232,255', mul: 1 },
    ];
    for (const p of passes) {
      ctx.lineWidth = p.width;
      for (let b = 0; b < ALPHA_BUCKETS; b++) {
        const list = buckets[b];
        if (list.length === 0) continue;
        const alpha = ((b + 0.5) / ALPHA_BUCKETS) * p.mul;
        ctx.strokeStyle = `rgba(${p.color},${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (const i of list) {
          ctx.moveTo(L.segX1[i], L.segY1[i]);
          ctx.lineTo(L.segX2[i], L.segY2[i]);
        }
        ctx.stroke();
      }
    }

    // Τα ίδια τα δαχτυλίδια: πολύ αχνά, για να "νιώθεις" τον ήχο να απλώνεται.
    ctx.lineWidth = 1.2 / scale;
    for (const w of this.waves) {
      const t = w.r / w.radius;
      const a = w.strength * (w.kind === 'step' ? 0.1 : 0.22) * (1 - t);
      if (a < 0.005) continue;
      ctx.strokeStyle = `rgba(170,200,255,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
};
