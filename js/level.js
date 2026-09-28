'use strict';

// Μέγεθος ενός κελιού του λαβυρίνθου σε μονάδες κόσμου.
const TILE = 40;

// Βήμα δειγματοληψίας των τοίχων: κάθε πλευρά τοίχου σπάει σε μικρά κομμάτια
// που φωτίζονται ανεξάρτητα όταν τα ακουμπάει το κύμα.
const WALL_SAMPLE_STEP = 5;

// Χειροποίητος λαβύρινθος.  # = τοίχος   . = διάδρομος   S = αφετηρία
const LEVEL_1 = [
  '###################',
  '#S....#.........#.#',
  '#.###.#.#######.#.#',
  '#.#...#.#.....#...#',
  '#.#.###.#.###.#####',
  '#.#.....#.#.......#',
  '#.#######.#.#####.#',
  '#.........#.#...#.#',
  '#####.#####.#.#.#.#',
  '#...#.#.....#.#...#',
  '#.#.#.#.#####.#####',
  '#.#...#.....#.....#',
  '#.#########.#####.#',
  '#.#.......#.......#',
  '#.#.#.#.#.#######.#',
  '#.........#.....#.#',
  '#.#.#.#.#.#.###.#.#',
  '#.#.......#...#...#',
  '#.#########.#.#####',
  '#...........#.....#',
  '###.#########.###.#',
  '#...#.........#...#',
  '#.###.#######.#.###',
  '#.#...#.....#.#...#',
  '#.#.###.###.#.###.#',
  '#.#.#...#...#...#.#',
  '#.#.#.###.#####.#.#',
  '#...#...#.......#.#',
  '#.#####.#########.#',
  '#.#.............#.#',
  '#.#.###########.#.#',
  '#.......#.........#',
  '###################',
];

const Level = {
  cols: 0,
  rows: 0,
  grid: null,          // Uint8Array, 1 = τοίχος
  start: { x: 0, y: 0 },

  // Κομμάτια τοίχων (segments) που μπορούν να φωτιστούν.
  segCount: 0,
  segX1: null, segY1: null, segX2: null, segY2: null,
  // Σημείο ελέγχου κάθε κομματιού: λίγο έξω από τον τοίχο, μέσα στον διάδρομο,
  // ώστε ο έλεγχος οπτικής επαφής να μην "χτυπάει" τον ίδιο τον τοίχο.
  testX: null, testY: null,

  load(map) {
    this.rows = map.length;
    this.cols = map[0].length;
    this.grid = new Uint8Array(this.cols * this.rows);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const c = map[y][x] || '#';
        this.grid[y * this.cols + x] = c === '#' ? 1 : 0;
        if (c === 'S') {
          this.start.x = (x + 0.5) * TILE;
          this.start.y = (y + 0.5) * TILE;
        }
      }
    }

    this.buildSegments();
  },

  isWall(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return this.grid[ty * this.cols + tx] === 1;
  },

  // Φτιάχνει κομμάτια μόνο στις πλευρές τοίχων που βλέπουν σε διάδρομο.
  buildSegments() {
    const segs = [];
    const per = Math.round(TILE / WALL_SAMPLE_STEP);
    const len = TILE / per;
    const nudge = 1;

    // [dx, dy γείτονα], αρχή και κατεύθυνση της πλευράς, κάθετη προς τα έξω
    const sides = [
      { nx: 0, ny: -1, ox: 0, oy: 0, ax: 1, ay: 0 },       // πάνω
      { nx: 0, ny: 1, ox: 0, oy: TILE, ax: 1, ay: 0 },     // κάτω
      { nx: -1, ny: 0, ox: 0, oy: 0, ax: 0, ay: 1 },       // αριστερά
      { nx: 1, ny: 0, ox: TILE, oy: 0, ax: 0, ay: 1 },     // δεξιά
    ];

    for (let ty = 0; ty < this.rows; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        if (!this.isWall(tx, ty)) continue;
        for (const s of sides) {
          const ntx = tx + s.nx, nty = ty + s.ny;
          if (ntx < 0 || nty < 0 || ntx >= this.cols || nty >= this.rows) continue;
          if (this.isWall(ntx, nty)) continue;
          const bx = tx * TILE + s.ox, by = ty * TILE + s.oy;
          for (let k = 0; k < per; k++) {
            const x1 = bx + s.ax * len * k, y1 = by + s.ay * len * k;
            const x2 = x1 + s.ax * len, y2 = y1 + s.ay * len;
            segs.push(x1, y1, x2, y2,
              (x1 + x2) / 2 + s.nx * nudge, (y1 + y2) / 2 + s.ny * nudge);
          }
        }
      }
    }

    const n = segs.length / 6;
    this.segCount = n;
    this.segX1 = new Float32Array(n); this.segY1 = new Float32Array(n);
    this.segX2 = new Float32Array(n); this.segY2 = new Float32Array(n);
    this.testX = new Float32Array(n); this.testY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.segX1[i] = segs[i * 6];     this.segY1[i] = segs[i * 6 + 1];
      this.segX2[i] = segs[i * 6 + 2]; this.segY2[i] = segs[i * 6 + 3];
      this.testX[i] = segs[i * 6 + 4]; this.testY[i] = segs[i * 6 + 5];
    }
  },

  // Οπτική επαφή ανάμεσα σε δύο σημεία (διάσχιση πλέγματος, Amanatides–Woo).
  lineOfSight(x0, y0, x1, y1) {
    let tx = Math.floor(x0 / TILE), ty = Math.floor(y0 / TILE);
    const ex = Math.floor(x1 / TILE), ey = Math.floor(y1 / TILE);
    const dx = x1 - x0, dy = y1 - y0;
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(TILE / dy) : Infinity;
    let tMaxX = dx !== 0
      ? (stepX > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx)
      : Infinity;
    let tMaxY = dy !== 0
      ? (stepY > 0 ? (ty + 1) * TILE - y0 : y0 - ty * TILE) / Math.abs(dy)
      : Infinity;

    let guard = 0;
    while (tx !== ex || ty !== ey) {
      if (tMaxX < tMaxY) { tMaxX += tDeltaX; tx += stepX; }
      else { tMaxY += tDeltaY; ty += stepY; }
      if (this.isWall(tx, ty)) return false;
      if (++guard > 256) return false;
    }
    return true;
  },
};
