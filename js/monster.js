'use strict';

const MONSTER_RADIUS = 10;
// Ταχύτητες ανά κατάσταση. Το κυνήγι είναι λίγο πιο αργό από το τρέξιμο του παίκτη.
const MONSTER_SPEED = { wander: 40, hunt: 95, search: 55 };
// Πόσο ψάχνει γύρω από τον τελευταίο ήχο πριν ξαναρχίσει να περιφέρεται (δευτ.).
const MONSTER_SEARCH_TIME = 5;
// Ήχος πίσω από τοίχο ακούγεται πιο πνιχτά: μόνο έως αυτό το ποσοστό της ακτίνας.
const MONSTER_MUFFLED_RANGE = 0.6;
// Πόσο φαίνεται η κόκκινη λάμψη όταν το ακουμπήσει κύμα (δευτ.).
const MONSTER_REVEAL_TIME = 1.5;
// Ο φρουρός περιφέρεται μόνο τόσα κελιά γύρω από τη θέση του.
const GUARD_RANGE = 4;

class Monster {
  // guard = true: όταν δεν κυνηγάει, γυρίζει και φυλάει κοντά στο σημείο εκκίνησης.
  // region = το κεφάλαιο της σκιάς: δεν βγαίνει ποτέ από αυτό.
  constructor(x, y, guard, region) {
    this.x = x;
    this.y = y;
    this.r = MONSTER_RADIUS;
    this.guard = guard;
    this.region = region;
    this.homeTx = Math.floor(x / TILE);
    this.homeTy = Math.floor(y / TILE);
    this.state = 'wander';     // 'wander' | 'hunt' | 'search'
    this.path = [];            // λίστα από [tx, ty] προς επίσκεψη
    this.soundX = 0;           // πού άκουσε τον τελευταίο ήχο
    this.soundY = 0;
    this.searchUntil = 0;

    // Η λάμψη δείχνει πού ήταν το τέρας τη στιγμή που το βρήκε το κύμα,
    // όχι πού είναι τώρα.
    this.revealX = 0;
    this.revealY = 0;
    this.revealTime = -1e6;
    this.revealStrength = 0;
    this.revealSeed = 0;

    // Η Μελωδία την παγώνει: δεν κινείται, δεν ακούει, δεν σκοτώνει.
    this.frozenUntil = -1e6;
  }

  freeze(until) {
    this.frozenUntil = Math.max(this.frozenUntil, until);
  }

  isFrozen() {
    return Echoes.now < this.frozenUntil;
  }

  // Καλείται από το Echoes όταν ένα κύμα φτάσει το τέρας.
  onHear(wave, d, los) {
    const now = Echoes.now;
    if (this.isFrozen()) return;
    if (los) {
      const s = Math.min(1, 0.3 + Echoes.strengthAt(wave, d) * 1.2);
      if (s > this.revealAlpha(now)) {
        this.revealX = this.x;
        this.revealY = this.y;
        this.revealTime = now;
        this.revealStrength = s;
        this.revealSeed = Math.random() * 1000;
      }
    }

    const range = los ? wave.radius : wave.radius * MONSTER_MUFFLED_RANGE;
    if (d > range) return;
    // Ήχοι από άλλο κεφάλαιο δεν την τραβάνε έξω από το δικό της.
    if (Level.regionAt(Math.floor(wave.x / TILE), Math.floor(wave.y / TILE)) !== this.region) return;

    this.state = 'hunt';
    this.soundX = wave.x;
    this.soundY = wave.y;
    this.goTo(Math.floor(wave.x / TILE), Math.floor(wave.y / TILE));
  }

  revealAlpha(now) {
    const age = now - this.revealTime;
    if (age >= MONSTER_REVEAL_TIME) return 0;
    return this.revealStrength * (1 - age / MONSTER_REVEAL_TIME);
  }

  goTo(tx, ty) {
    const cx = Math.floor(this.x / TILE), cy = Math.floor(this.y / TILE);
    // Πρώτα στο κέντρο του τωρινού κελιού, ώστε να μην κόβει γωνίες τοίχων.
    this.path = [[cx, cy], ...Level.findPath(cx, cy, tx, ty)];
  }

  pickNextGoal(now) {
    const cx = Math.floor(this.x / TILE), cy = Math.floor(this.y / TILE);

    if (this.state === 'hunt') {
      // Έφτασε εκεί που άκουσε τον ήχο: ψάχνει γύρω γύρω.
      this.state = 'search';
      this.searchUntil = now + MONSTER_SEARCH_TIME;
    }

    if (this.state === 'search') {
      if (now >= this.searchUntil) {
        this.state = 'wander';
      } else {
        const sx = Math.floor(this.soundX / TILE), sy = Math.floor(this.soundY / TILE);
        const [tx, ty] = Level.randomFloorNear(sx, sy, 1, 3, this.region);
        this.goTo(tx, ty);
        return;
      }
    }

    const [tx, ty] = this.guard
      ? Level.randomFloorNear(this.homeTx, this.homeTy, 0, GUARD_RANGE, this.region)
      : Level.randomFloorNear(cx, cy, 4, 12, this.region);
    this.goTo(tx, ty);
  }

  update(dt, now) {
    if (this.path.length === 0) this.pickNextGoal(now);

    if (now < this.frozenUntil) return;
    let step = MONSTER_SPEED[this.state] * dt;
    while (step > 0 && this.path.length > 0) {
      const [tx, ty] = this.path[0];
      const gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE;
      const dx = gx - this.x, dy = gy - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= step) {
        this.x = gx;
        this.y = gy;
        step -= dist;
        this.path.shift();
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        step = 0;
      }
    }
  }

  touches(p) {
    if (this.isFrozen()) return false;
    return Math.hypot(p.x - this.x, p.y - this.y) < p.r + this.r;
  }

  // Κόκκινη λάμψη. Αν δοθεί forceAlpha, σχεδιάζεται στην πραγματική θέση (π.χ. Game Over).
  draw(ctx, now, forceAlpha) {
    if (forceAlpha === undefined && now < this.frozenUntil) {
      this.drawRemembering(ctx, now);
      return;
    }
    let a, x, y, seed;
    if (forceAlpha !== undefined) {
      a = forceAlpha; x = this.x; y = this.y; seed = now * 3;
    } else {
      a = this.revealAlpha(now);
      if (a < 0.01) return;
      x = this.revealX; y = this.revealY; seed = this.revealSeed;
    }

    const glow = ctx.createRadialGradient(x, y, 0, x, y, this.r * 3);
    glow.addColorStop(0, `rgba(${POT.red},${(a * 0.5).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${POT.red},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, this.r * 3, 0, Math.PI * 2);
    ctx.fill();

    // Σιλουέτα σκιάς σε στυλ αγγείου (js/pottery.js), κάθε φορά λίγο διαφορετική.
    // Κοιτάζει προς τον παίκτη, όπως ήταν τη στιγμή που φάνηκε.
    const dir = (typeof player !== 'undefined' && player.x < x) ? -1 : 1;
    ctx.save();
    ctx.translate(x, y + this.r * 1.2);
    ctx.scale(dir, 1);
    Pottery.shade(ctx, 0, 0, this.r * 3.4, a, seed, now);
    ctx.restore();
  }

  // Παγωμένη από τη Μελωδία: φαίνεται ως χλωμή, ήρεμη ανθρώπινη μορφή
  // ("θυμάται ότι κάποτε ζούσε"), που σβήνει καθώς τελειώνει το πάγωμα.
  drawRemembering(ctx, now) {
    const left = this.frozenUntil - now;
    const a = Math.min(1, left / 1.2) * (0.55 + 0.1 * Math.sin(now * 3));
    const x = this.x, y = this.y;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, this.r * 3);
    glow.addColorStop(0, `rgba(${POT.cream},${(a * 0.3).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${POT.cream},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, this.r * 3, 0, Math.PI * 2);
    ctx.fill();
    // Σε "πρόσθετο λευκό", όρθια και ήρεμη — όπως ήταν όσο ζούσε.
    Pottery.woman(ctx, x, y + this.r * 1.1, this.r * 2.4, a);
  }
}
