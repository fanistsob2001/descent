'use strict';

// Όλοι οι ήχοι φτιάχνονται με κώδικα (Web Audio API) — κανένα αρχείο ήχου.
//
// Αλυσίδα:  ήχοι → sfx ─┬───────────────→ master → compressor → ηχεία
//                        ├→ echo (delay με feedback) ↗
//                        └→ reverb (convolver)       ↗
//           ambient ─────────────────────────────────↗
//
// Το AudioContext δημιουργείται στο πρώτο πάτημα κουμπιού (unlock), γιατί οι
// browsers — ειδικά το iPhone — δεν αφήνουν ήχο πριν αγγίξει ο χρήστης κάτι.
// Η ρύθμιση ήχος on/off αποθηκεύεται στο Settings (js/save.js).

const Sound = {
  ctx: null,
  muted: false,
  master: null,
  sfx: null,
  echoSend: null,
  reverbSend: null,
  ambient: null,
  noiseBuffer: null,
  growls: [],        // μία "φωνή" ανά τέρας
  listenerX: 0,      // θέση του παίκτη, για panning / απόσταση
  listenerY: 0,

  loadSettings() {
    this.muted = !Settings.sound;
  },

  // Καλείται μέσα σε click / keydown handler.
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      // iPhone: να παίζει ήχος και με τον διακόπτη σίγασης (όπου υποστηρίζεται).
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { /* - */ }
      this.ctx = new AC();
      this.build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // Ένας "κενός" ήχος μέσα στο άγγιγμα ξεκλειδώνει τον ήχο στα παλιότερα iPhone.
    const b = this.ctx.createBufferSource();
    b.buffer = this.ctx.createBuffer(1, 1, 22050);
    b.connect(this.ctx.destination);
    b.start(0);
  },

  build() {
    const ac = this.ctx;

    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ac.destination);

    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(comp);

    this.sfx = ac.createGain();
    this.sfx.connect(this.master);

    // Ηχώ: delay με feedback και φίλτρο, ώστε κάθε επανάληψη να είναι πιο "θολή".
    this.echoSend = ac.createGain();
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.27;
    const fb = ac.createGain();
    fb.gain.value = 0.42;
    const damp = ac.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2000;
    this.echoSend.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(this.master);

    // Reverb από "τεχνητή" απόκριση χώρου: θόρυβος που σβήνει εκθετικά.
    this.reverbSend = ac.createGain();
    const conv = ac.createConvolver();
    conv.buffer = this.makeImpulse(2.8, 3);
    const revOut = ac.createGain();
    revOut.gain.value = 0.6;
    this.reverbSend.connect(conv);
    conv.connect(revOut);
    revOut.connect(this.master);

    this.noiseBuffer = this.makeNoise(2);
    this.buildAmbient();
  },

  makeNoise(seconds) {
    const ac = this.ctx;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  makeImpulse(seconds, decay) {
    const ac = this.ctx;
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  },

  noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = loop;
    if (loop) src.loopStart = Math.random();
    return src;
  },

  panner(pan) {
    if (!this.ctx.createStereoPanner) return null;   // πολύ παλιοί browsers: χωρίς panning
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    return p;
  },

  // Περιβάλλουσα έντασης: γρήγορη άνοδος, εκθετικό σβήσιμο.
  envelope(gainParam, t, peak, attack, decay) {
    gainParam.setValueAtTime(0.0001, t);
    gainParam.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gainParam.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  },

  ready() {
    return this.ctx && this.ctx.state === 'running';
  },

  setMuted(m) {
    this.muted = m;
    Settings.sound = !m;
    Settings.store();
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
  },

  // Όταν η σελίδα κρύβεται, σταματάμε τον ήχο (π.χ. στο κινητό στο background).
  setBackground(hidden) {
    if (!this.ctx) return;
    if (hidden) this.ctx.suspend();
    else this.ctx.resume();
  },

  // ---- Συνεχές ambient βουητό ----
  buildAmbient() {
    const ac = this.ctx;
    this.ambient = ac.createGain();
    this.ambient.gain.value = 0;
    this.ambient.connect(this.master);

    // Χαμηλός "θόρυβος σπηλιάς" με φίλτρο που ανοιγοκλείνει πολύ αργά.
    const noise = this.noiseSource(true);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 160;
    lp.Q.value = 0.7;
    const noiseGain = ac.createGain();
    noiseGain.gain.value = 0.5;
    noise.connect(lp);
    lp.connect(noiseGain);
    noiseGain.connect(this.ambient);

    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 70;
    lfo.connect(lfoDepth);
    lfoDepth.connect(lp.frequency);

    // Δύο χαμηλοί τόνοι, λίγο "φάλτσοι" μεταξύ τους, για ανησυχητικό βουητό.
    for (const [freq, type, g] of [[36.7, 'sine', 0.35], [55.4, 'triangle', 0.1], [73.9, 'sine', 0.05]]) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const og = ac.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(this.ambient);
      o.start();
    }
    noise.start();
    lfo.start();
  },

  // Ένταση του ambient (0..1), με ομαλή μετάβαση.
  setAmbient(level) {
    if (!this.ambient) return;
    this.ambient.gain.setTargetAtTime(level * 0.22, this.ctx.currentTime, 1.2);
  },

  // ---- Ηχητικά εφέ ----

  // Το κύμα του παίκτη. size 0..1: μεγαλύτερο = βαθύτερο και πιο δυνατό.
  ping(size) {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    const freq = 1500 * Math.pow(330 / 1500, size);
    const peak = 0.12 + 0.3 * size;
    const dur = 0.35 + 1.1 * size;

    const out = ac.createGain();
    out.connect(this.sfx);
    const send = ac.createGain();
    send.gain.value = 0.55;
    out.connect(send);
    send.connect(this.echoSend);
    send.connect(this.reverbSend);

    // Κύριος τόνος + ένας "μεταλλικός" αρμονικός, σαν καμπανάκι σόναρ.
    const partials = [[1, 1], [2.76, 0.3], [0.25, size * 0.8]];
    for (const [mul, amp] of partials) {
      if (amp < 0.01) continue;
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * mul * 1.04, t);
      o.frequency.exponentialRampToValueAtTime(freq * mul, t + 0.08);
      const g = ac.createGain();
      this.envelope(g.gain, t, peak * amp, 0.005, dur * (mul > 1 ? 0.5 : 1));
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  },

  // Βήμα: πολύ σύντομος φιλτραρισμένος θόρυβος.
  step() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    const src = this.noiseSource();
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420 + Math.random() * 380;
    const g = ac.createGain();
    this.envelope(g.gain, t, 0.09 + Math.random() * 0.03, 0.004, 0.07);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.sfx);
    src.start(t, Math.random() * 1.5);
    src.stop(t + 0.12);
  },

  // Πέταγμα αγγείου: σύντομο "φσστ".
  jarThrow() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    const src = this.noiseSource();
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(2500, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.2);
    const g = ac.createGain();
    this.envelope(g.gain, t, 0.12, 0.02, 0.2);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfx);
    src.start(t, Math.random());
    src.stop(t + 0.3);
  },

  // Ένας ήχος από τη θέση (x, y) του κόσμου: ένταση και panning ανάλογα με
  // το πού είναι σε σχέση με τον παίκτη. Επιστρέφει τον κόμβο εξόδου.
  spatial(x, y, baseVol, falloff) {
    const dx = x - this.listenerX, dy = y - this.listenerY;
    const g = this.ctx.createGain();
    g.gain.value = baseVol * Math.max(0.15, 1 - Math.hypot(dx, dy) / falloff);
    const pan = this.panner(dx / 300);
    if (pan) { g.connect(pan); pan.connect(this.sfx); pan.connect(this.echoSend); }
    else { g.connect(this.sfx); g.connect(this.echoSend); }
    return g;
  },

  // Αγγείο σπονδής που σπάει: χτύπος + θόρυβος + κεραμικά "τσιν".
  shatter(x, y) {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    const out = this.spatial(x, y, 1, 750);

    const thud = ac.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(140, t);
    thud.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    const tg = ac.createGain();
    this.envelope(tg.gain, t, 0.5, 0.003, 0.18);
    thud.connect(tg);
    tg.connect(out);
    thud.start(t);
    thud.stop(t + 0.25);

    const noise = this.noiseSource();
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const ng = ac.createGain();
    this.envelope(ng.gain, t, 0.45, 0.002, 0.35);
    noise.connect(hp);
    hp.connect(ng);
    ng.connect(out);
    noise.start(t, Math.random());
    noise.stop(t + 0.45);

    for (let i = 0; i < 7; i++) {
      const tt = t + 0.01 + Math.random() * 0.28;
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = 2200 + Math.random() * 3500;
      const g = ac.createGain();
      this.envelope(g.gain, tt, 0.06 + Math.random() * 0.06, 0.002, 0.06 + Math.random() * 0.1);
      o.connect(g);
      g.connect(out);
      o.start(tt);
      o.stop(tt + 0.25);
    }
  },

  // Μεταλλικό "κλινκ" νομίσματος (δύο φάλτσοι υψηλοί τόνοι).
  coin() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    for (const [dt, f] of [[0, 2637], [0.09, 3520]]) {
      for (const mul of [1, 2.71]) {
        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mul;
        const g = ac.createGain();
        this.envelope(g.gain, t + dt, mul > 1 ? 0.03 : 0.1, 0.002, 0.5);
        o.connect(g);
        g.connect(this.sfx);
        g.connect(this.reverbSend);
        o.start(t + dt);
        o.stop(t + dt + 0.6);
      }
    }
  },

  // Μαζεύεις αγγείο: σύντομο κεραμικό "τοκ".
  jarPickup() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(480, t + 0.1);
    const g = ac.createGain();
    this.envelope(g.gain, t, 0.15, 0.003, 0.14);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    o.stop(t + 0.2);
  },

  // Νότα "λύρας" με τον αλγόριθμο Karplus-Strong: θόρυβος μέσα σε μια γραμμή
  // καθυστέρησης που μαλακώνει κάθε φορά — ακούγεται σαν χορδή που τσιμπιέται.
  pluckBuffers: {},
  pluckBuffer(freq) {
    const key = Math.round(freq);
    if (this.pluckBuffers[key]) return this.pluckBuffers[key];
    const ac = this.ctx, sr = ac.sampleRate;
    const len = Math.floor(sr * 2.2);
    const buf = ac.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const period = Math.max(2, Math.round(sr / freq));
    const line = new Float32Array(period);
    for (let i = 0; i < period; i++) line[i] = Math.random() * 2 - 1;
    let p = 0;
    for (let i = 0; i < len; i++) {
      const next = (p + 1) % period;
      const v = line[p];
      line[p] = 0.996 * 0.5 * (v + line[next]);
      d[i] = v;
      p = next;
    }
    this.pluckBuffers[key] = buf;
    return buf;
  },

  pluck(freq, when, vol) {
    const ac = this.ctx;
    const src = ac.createBufferSource();
    src.buffer = this.pluckBuffer(freq);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3500;
    const g = ac.createGain();
    g.gain.value = vol;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.sfx);
    g.connect(this.reverbSend);
    src.start(when);
  },

  // Βρήκες χορδή: μία νότα λύρας (n = ποια χορδή, 1..3 — κάθε φορά πιο ψηλά).
  stringFound(n) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const notes = [293.66, 349.23, 440];
    this.pluck(notes[Math.max(0, Math.min(2, n - 1))], t, 0.5);
    if (n >= 3) {
      // Η λύρα ξανά ολόκληρη: και οι τρεις χορδές μαζί.
      notes.forEach((f, i) => this.pluck(f, t + 0.35 + i * 0.12, 0.35));
    }
  },

  // Η Μελωδία: ένα αργό arpeggio λύρας (Ρε δώριος) με πολύ reverb.
  melody() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const seq = [293.66, 349.23, 440, 523.25, 440, 392, 349.23, 293.66];
    seq.forEach((f, i) => this.pluck(f, t + i * 0.16, 0.45));
    this.pluck(146.83, t, 0.3);
  },

  // Τα βήματα της Ευρυδίκης: πιο απαλά και πιο "ελαφριά" από του παίκτη,
  // από τη θέση της (πίσω σου) — χωρίς ηχώ, για να μένουν κοντινά και προσωπικά.
  softStep(x, y) {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    const dx = x - this.listenerX;
    const src = this.noiseSource();
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 300;
    bp.Q.value = 0.9;
    const g = ac.createGain();
    this.envelope(g.gain, t, 0.05 + Math.random() * 0.015, 0.006, 0.09);
    src.connect(bp);
    bp.connect(g);
    const pan = this.panner(dx / 120);
    if (pan) { g.connect(pan); pan.connect(this.sfx); } else g.connect(this.sfx);
    src.start(t, Math.random() * 1.5);
    src.stop(t + 0.14);
  },

  // Ψίθυρος "Or-phe-us...": θόρυβος μέσα από φίλτρα φωνηέντων, με πολύ reverb.
  whisper() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime + 0.1;
    // [πότε, διάρκεια, κεντρική συχνότητα, ένταση] — "Or", "phe", "u", "s"
    const syllables = [[0, 0.32, 650, 0.22], [0.36, 0.2, 2600, 0.16], [0.58, 0.3, 900, 0.2], [0.86, 0.45, 5200, 0.12]];
    for (const [dt, dur, f, vol] of syllables) {
      const src = this.noiseSource();
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = f > 2000 ? 1.5 : 5;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(vol, t + dt + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.sfx);
      g.connect(this.reverbSend);
      src.start(t + dt, Math.random());
      src.stop(t + dt + dur + 0.05);
    }
  },

  // Απαλή νότα λύρας για κάθε γραμμή μιας cutscene (ανεβαίνει σιγά σιγά).
  cutLine(i) {
    if (!this.ready()) return;
    const notes = [146.83, 174.61, 220, 196, 261.63, 220, 293.66, 261.63, 220];
    this.pluck(notes[i % notes.length], this.ctx.currentTime, 0.22);
  },

  // Ο Χάροντας δεν παίρνει τίποτα: χαμηλό, κούφιο μουρμουρητό.
  charonRefuse() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    const noise = this.noiseSource();
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 220;
    bp.Q.value = 3;
    const g = ac.createGain();
    this.envelope(g.gain, t, 0.25, 0.2, 0.9);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.sfx);
    g.connect(this.reverbSend);
    noise.start(t, Math.random());
    noise.stop(t + 1.3);
  },

  // Πληρώνεις τον Χάροντα: νόμισμα στην παλάμη και μετά νερό που κινείται.
  charonPaid() {
    if (!this.ready()) return;
    this.coin();
    const ac = this.ctx, t = ac.currentTime + 0.4;
    const noise = this.noiseSource();
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.linearRampToValueAtTime(900, t + 1.2);
    lp.frequency.linearRampToValueAtTime(250, t + 2.6);
    const g = ac.createGain();
    this.envelope(g.gain, t, 0.3, 0.6, 2);
    noise.connect(lp);
    lp.connect(g);
    g.connect(this.sfx);
    g.connect(this.reverbSend);
    noise.start(t, Math.random());
    noise.stop(t + 2.8);
  },

  // Καρδιοχτύπι: δύο χαμηλά "γδουπ" (lub-dub). vol 0..1.
  heartbeat(vol) {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    for (const [dt, amp] of [[0, 1], [0.17, 0.65]]) {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(68, t + dt);
      o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.14);
      const g = ac.createGain();
      this.envelope(g.gain, t + dt, 0.55 * vol * amp, 0.012, 0.2);
      o.connect(g);
      g.connect(this.sfx);
      o.start(t + dt);
      o.stop(t + dt + 0.3);
    }
  },

  // Νίκη επιπέδου: ανοδικό, "ανακουφιστικό" arpeggio με πολύ reverb.
  win() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    [293.66, 369.99, 440, 587.33].forEach((f, i) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ac.createGain();
      this.envelope(g.gain, t + i * 0.13, 0.13, 0.02, 1.8);
      o.connect(g);
      g.connect(this.sfx);
      g.connect(this.reverbSend);
      o.start(t + i * 0.13);
      o.stop(t + i * 0.13 + 2);
    });
  },

  // Jump scare: στρίγκλισμα + θόρυβος + χαμηλό "μπουμ". Δυνατό.
  scare() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;

    const shaper = ac.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 6);
    }
    shaper.curve = curve;
    const scream = ac.createGain();
    this.envelope(scream.gain, t, 0.5, 0.01, 1.1);
    shaper.connect(scream);
    scream.connect(this.sfx);
    scream.connect(this.reverbSend);
    for (const mul of [1, 1.07, 1.52]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(900 * mul, t);
      o.frequency.exponentialRampToValueAtTime(160 * mul, t + 1);
      o.connect(shaper);
      o.start(t);
      o.stop(t + 1.2);
    }

    const noise = this.noiseSource();
    const ng = ac.createGain();
    this.envelope(ng.gain, t, 0.45, 0.005, 0.6);
    noise.connect(ng);
    ng.connect(this.sfx);
    noise.start(t);
    noise.stop(t + 0.7);

    const boom = ac.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(80, t);
    boom.frequency.exponentialRampToValueAtTime(28, t + 0.8);
    const bg = ac.createGain();
    this.envelope(bg.gain, t, 0.9, 0.005, 0.9);
    boom.connect(bg);
    bg.connect(this.sfx);
    boom.start(t);
    boom.stop(t + 1);
  },

  // Οθόνη Game Over: βαθιά, αργή "καμπάνα".
  gameOver() {
    if (!this.ready()) return;
    const ac = this.ctx, t = ac.currentTime;
    for (const [f, amp] of [[55, 0.4], [110.6, 0.18], [164.3, 0.08]]) {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ac.createGain();
      this.envelope(g.gain, t, amp, 0.02, 3.2);
      o.connect(g);
      g.connect(this.sfx);
      g.connect(this.reverbSend);
      o.start(t);
      o.stop(t + 3.4);
    }
  },

  // ---- Γρύλισμα τεράτων ----
  makeGrowl() {
    const ac = this.ctx;
    const v = {};
    const base = 44 + Math.random() * 10;

    v.out = ac.createGain();
    v.out.gain.value = 0;
    v.pan = this.panner(0);
    if (v.pan) { v.out.connect(v.pan); v.pan.connect(this.sfx); } else v.out.connect(this.sfx);

    // Φίλτρο: ανοιχτό όταν το "βλέπεις", κλειστό (πνιχτό) πίσω από τοίχο.
    v.filter = ac.createBiquadFilter();
    v.filter.type = 'lowpass';
    v.filter.frequency.value = 280;
    v.filter.Q.value = 5;

    // Ακανόνιστη διαμόρφωση έντασης: "ανάσα" του τέρατος.
    v.am = ac.createGain();
    v.am.gain.value = 0.6;
    v.am.connect(v.out);
    v.filter.connect(v.am);

    for (const mul of [1, 1.013, 2.02]) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = base * mul;
      const g = ac.createGain();
      g.gain.value = mul > 2 ? 0.25 : 0.5;
      o.connect(g);
      g.connect(v.filter);
      o.start();
    }
    const breath = this.noiseSource(true);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 380;
    bp.Q.value = 1.4;
    const bg = ac.createGain();
    bg.gain.value = 0.35;
    breath.connect(bp);
    bp.connect(bg);
    bg.connect(v.filter);
    breath.start();

    for (const [freq, depth, target] of [[1.7 + Math.random(), 0.35, v.am.gain], [0.23, 90, v.filter.frequency]]) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = freq;
      const d = ac.createGain();
      d.gain.value = depth;
      lfo.connect(d);
      d.connect(target);
      lfo.start();
    }
    return v;
  },

  // Κάθε frame: ένταση/panning/φίλτρο του γρυλίσματος κάθε τέρατος.
  // voices = [{ x, y, los } ή null για σιωπηλή σκιά] (άδειο = σιωπή)
  updateGrowls(voices) {
    if (!this.ctx) return;
    while (this.growls.length < voices.length) this.growls.push(this.makeGrowl());
    const t = this.ctx.currentTime;
    this.growls.forEach((g, i) => {
      const m = voices[i];
      let vol = 0, pan = 0, cutoff = 280;
      if (m) {
        const dx = m.x - this.listenerX, dy = m.y - this.listenerY;
        const p = Math.max(0, 1 - Math.hypot(dx, dy) / 380);
        vol = p * p * 0.55;
        pan = Math.max(-1, Math.min(1, dx / 220));
        cutoff = m.los ? 300 : 150;
      }
      g.out.gain.setTargetAtTime(vol, t, 0.15);
      g.filter.frequency.setTargetAtTime(cutoff, t, 0.2);
      if (g.pan) g.pan.pan.setTargetAtTime(pan, t, 0.1);
    });
  },
};
