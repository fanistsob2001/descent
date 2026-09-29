'use strict';

// Πόσο κρατάει το φως ενός τοίχου: ανά κομμάτι, στο Level.segFade (1.5 δευτ., 0.5 στη Λήθη).
// Ταχύτητα διάδοσης του κύματος (μονάδες κόσμου / δευτ.).
const WAVE_SPEED = 430;
// Επίπεδα διαφάνειας για ομαδοποιημένη σχεδίαση (λιγότερα stroke = πιο γρήγορα).
const ALPHA_BUCKETS = 14;

const Echoes = {
  waves: [],
  now: 0,             // η ώρα του παιχνιδιού στο τελευταίο update
  litTime: null,      // πότε φωτίστηκε τελευταία φορά κάθε κομμάτι τοίχου
  litStrength: null,  // πόσο δυνατά φωτίστηκε
  // Αντικείμενα που "ακούνε": { x, y, onHear(wave, dist, los) }.
  // Το onHear καλείται μία φορά ανά κύμα, τη στιγμή που το δαχτυλίδι τα φτάνει
  // (αν είναι εντός ακτίνας). los = αν υπάρχει οπτική επαφή με την πηγή του ήχου.
  listeners: [],
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
  // kind: 'step' | 'call'.
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

    const wave = { x, y, radius, strength, kind, r: 0, hits, ptr: 0, reached: new Set() };
    this.waves.push(wave);
    return wave;
  },

  // Πόσο δυνατό είναι το κύμα σε απόσταση d από την πηγή του (0..1).
  strengthAt(wave, d) {
    return wave.strength * Math.pow(Math.max(0, 1 - d / wave.radius), 0.7);
  },

  update(dt, now) {
    this.now = now;
    for (let w = this.waves.length - 1; w >= 0; w--) {
      const wave = this.waves[w];
      wave.r += WAVE_SPEED * dt;

      while (wave.ptr < wave.hits.length && wave.hits[wave.ptr].d <= wave.r) {
        const h = wave.hits[wave.ptr++];
        const s = this.strengthAt(wave, h.d);
        // Ανανεώνουμε μόνο αν το νέο φως είναι πιο δυνατό από όσο έχει μείνει.
        const age = now - this.litTime[h.i];
        const fade = Level.segFade[h.i];
        const current = age < fade ? this.litStrength[h.i] * (1 - age / fade) : 0;
        if (s > current) {
          this.litTime[h.i] = now;
          this.litStrength[h.i] = s;
        }
      }

      for (const l of this.listeners) {
        if (wave.reached.has(l)) continue;
        const d = Math.hypot(l.x - wave.x, l.y - wave.y);
        if (d > wave.radius) { wave.reached.add(l); continue; }
        if (d > wave.r) continue;
        wave.reached.add(l);
        l.onHear(wave, d, Level.lineOfSight(wave.x, wave.y, l.x, l.y));
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
      const fade = Level.segFade[i];
      if (age >= fade) continue;
      const x1 = L.segX1[i], y1 = L.segY1[i];
      if (x1 < view.x0 - TILE || x1 > view.x1 + TILE ||
          y1 < view.y0 - TILE || y1 > view.y1 + TILE) continue;
      const f = 1 - age / fade;
      const a = this.litStrength[i] * f * Math.sqrt(f);
      if (a < 0.015) continue;
      const b = Math.min(ALPHA_BUCKETS - 1, Math.floor(a * ALPHA_BUCKETS));
      buckets[b].push(i);
    }

    ctx.lineCap = 'butt';
    // Δύο περάσματα: φαρδιά αχνή λάμψη και λεπτός φωτεινός πυρήνας.
    const passes = [
      { width: 7 / scale, color: POT.terra, mul: 0.22 },
      { width: 1.8 / scale, color: POT.light, mul: 1 },
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
      ctx.strokeStyle = `rgba(${POT.terra},${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
};
