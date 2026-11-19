// ================= EXAMPLE: "The Straw Hat" (13 s). Replace this file for a new animation. =================
// A straw hat left on a fence post on a hilltop. The wind rises, the hat rocks, lets go and is carried into a huge summer sky.
// Pattern: paint each shot's background once into a plate (prep), then draw the moving parts on top every frame.
// Acting runs "on twos" (on2: 12 drawings a second) with held key poses; cameras run on ones so moves stay smooth.
const CUE = B.cues;
const EX = {
  sky: [[0, '#5f8fbc'], [260, '#9cbfd8'], [520, '#e6dcc2'], [640, '#f2e2c4']],
  cloud: { sh: '#98a9c2', mid: '#dde1e4', lit: '#fbf3e4', hi: '#ffffff', base: '#8c9db6' },
  far: '#93a7bb', mid: '#7f9a5c', near: '#6b8946', nearDk: '#4e6a34',
  leaves: ['#26401f', '#3f5f2e', '#62843f', '#9bb866'],
  grass: ['#5e7f3a', '#7a9a48', '#93ad58', '#4c6a30'],
  straw: '#e9c878', strawSh: '#c29650', strawDp: '#9c7238', strawLt: '#fbe6ae', band: '#4a77a0', bandSh: '#2c4f72',
  wood: '#8a6a4c', woodSh: '#5e4632', woodLt: '#b8977a',
};
const LIGHT = { lx: -0.55, ly: -0.83 }; // sun high on the left

// ---------- wind: a gentle breeze, then one strong gust. Every moving thing reads this one function. ----------
function windAt(t) {
  const breeze = 0.18 + 0.1 * seg(t, CUE['first-breeze'], CUE['first-breeze'] + 1.5) + 0.06 * n1(t * 0.7, 3);
  const gust = Math.sin(Math.PI * seg(t, CUE.gust - 0.3, CUE['sky-tumble'] + 1.5)) * 0.75;
  return breeze + gust;
}

// ---------- the hat (original design): wide straw brim, low round crown, faded blue ribbon with two tails ----------
// local units: brim radius 100. v = how much of the brim top we see (0.12 edge-on .. 0.6 from above).
function strawHat(g, x, y, s, o = {}) {
  const rot = o.rot ?? 0, v = o.v ?? 0.28, m = mat(x, y, rot, s / 100), T = p => xf(p, m);
  const LW = 2.4 * s / 100, t = o.t ?? 0, wind = o.wind ?? 0.3;
  const ell = (cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 40) => { const q = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; q.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return q; };
  const brimRy = 100 * v, crownW = 46, crownH = 44 * (1 - v * 0.5);
  // ribbon tails first (they sit behind the crown), waving with the wind
  for (let k = 0; k < 2; k++) {
    const root = [crownW * 0.75, -crownH * 0.25], dir = lerp(0.35, -0.2, clamp(wind)) + k * 0.25, len = 70 + k * 12, c = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, wave = Math.sin(u * 5 - t * 9 - k * 1.3) * 10 * u * (0.4 + wind);
      c.push([root[0] + Math.cos(dir) * len * u - Math.sin(dir) * wave, root[1] + Math.sin(dir) * len * u + Math.cos(dir) * wave + u * u * 14 * (1 - wind)]);
    }
    cels(g, T(rib(c, 11, 0.05, 0.25)), { base: k ? EX.bandSh : EX.band, line: P.ink, lw: LW * 0.8, L: LIGHT, seed: 30 + k });
  }
  // back half of the brim, then the crown, then the front half of the brim over it
  const brim = ell(0, 0, 100, brimRy, 0, TAU, 56);
  cels(g, T(rough(brim, 1.2, 4, 6)), {
    base: EX.straw, sh: EX.strawSh, sw: 7, rim: EX.strawLt, rw: 4, L: LIGHT, line: P.ink, lw: LW, seed: 11,
    shade: [{ pts: T(ell(10, brimRy * 0.25, crownW * 1.25, brimRy * 0.55)), col: EX.strawDp, a: 0.55 }], // the crown's cast shadow on the brim
    after: gg => { for (let i = 1; i <= 3; i++) seam(gg, T(ell(0, 0, 100 - i * 13, brimRy * (1 - i * 0.13), Math.PI * 0.05, Math.PI * 0.95, 20)), 1.2 * s / 100, EX.strawDp, 40 + i, 0.5); },
  });
  const crown = [...ell(0, 0, crownW, crownW * v * 0.9, 0, Math.PI, 20), ...ell(0, -crownH * 0.2, crownW, crownH, Math.PI, TAU, 24)];
  cels(g, T(crown), {
    base: EX.straw, sh: EX.strawSh, sw: 9, rim: EX.strawLt, rw: 5, L: LIGHT, line: P.ink, lw: LW, seed: 12,
    after: gg => {
      const band = [...ell(0, -crownH * 0.05, crownW + 1, crownW * v * 0.9 + 2, 0, Math.PI, 16), ...ell(0, -crownH * 0.32, crownW + 1, crownW * v * 0.9, Math.PI, 0, 16).reverse()];
      path(gg, T(band)); gg.fillStyle = css(EX.band); gg.fill();
      path(gg, T(offsetPts(band, 10, 0))); gg.fillStyle = css(EX.bandSh, 0.6); gg.fill();
      for (let i = 0; i < 4; i++) seam(gg, T(ell(0, -crownH * 0.2, crownW * (0.9 - i * 0.18), crownH * (0.9 - i * 0.12), Math.PI * 1.15, Math.PI * 1.85, 12)), 1.1 * s / 100, EX.strawDp, 50 + i, 0.45);
    },
  });
}

// ---------- props ----------
function post(g, x, y, h, w, seed) { // weathered fence post: leans a little, split top, grain lines
  const r = RNG(seed), lean = (r() - 0.5) * 0.06 * h;
  const pts = [[x - w / 2, y], [x - w / 2 + lean, y - h], [x - w * 0.1 + lean, y - h - w * 0.12], [x + w / 2 + lean, y - h + w * 0.05], [x + w / 2, y]];
  cels(g, rough(pts, w * 0.03, seed, 5), {
    base: EX.wood, sh: EX.woodSh, sw: w * 0.3, L: LIGHT, line: P.ink, lw: Math.max(1.4, w * 0.07), seed,
    after: gg => { for (let i = 0; i < 4; i++) { const xx = x - w * 0.3 + i * w * 0.18; seam(gg, [[xx, y - 4], [xx + lean * 0.5 + (r() - 0.5) * 3, y - h * 0.5], [xx + lean, y - h + 6]], Math.max(0.8, w * 0.03), EX.woodSh, seed + i, 0.6); } },
  });
  return [x + lean, y - h - w * 0.04]; // where something sits on top
}
function rail(g, a, b, w, seed) { // sagging wire between posts
  ink(g, catmull([a, [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5) + Math.abs(b[0] - a[0]) * 0.04], b], false, 8), w, { col: EX.woodSh, t0: 0, t1: 0, min: 0.6, seed, a: 0.85 });
}
// foreground grass, drawn every frame so it bends with the wind (on twos, from fixed seeded blades)
function makeBlades(seed, n, x0, x1, yAt, hgt, depth = 40) {
  const r = RNG(seed), out = [];
  for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()); out.push({ x, y: yAt(x) + r() * depth, h: hgt * (0.5 + r()), lean: (r() - 0.4) * 0.3, col: css(jit(EX.grass[Math.floor(r() * EX.grass.length)], r, 14)), ph: r() * 6, w: Math.max(1.4, hgt * (0.05 + 0.03 * r())) }); }
  return out.sort((a, b) => a.y - b.y);
}
function drawBlades(g, bl, t) {
  const tt = on2(t), w = windAt(tt);
  for (const b of bl) {
    const bend = b.h * (b.lean + w * (0.55 + 0.25 * n1(tt * 1.3 + b.ph, 7)) + 0.05 * Math.sin(tt * 3 + b.ph));
    ink(g, catmull([[b.x, b.y], [b.x + bend * 0.25, b.y - b.h * 0.55], [b.x + bend, b.y - b.h * (1 - 0.25 * Math.abs(w))]], false, 3), b.w, { col: b.col, t0: 0, t1: 0.9, min: 0.15, seed: b.ph * 10 });
  }
}
// leaves torn off by the wind: each follows its own seeded path, tumbling (a leaf is drawn as a small cel with a vein)
function driftLeaves(g, t, n, seed, box, s = 10) {
  const tt = on2(t);
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, seed), h2 = hash(i, seed + 1), h3 = hash(i, seed + 2);
    const life = 3 + h3 * 2, start = h1 * 6, u = (tt - start) / life; if (u < 0 || u > 1) continue;
    const w = windAt(tt), x = box[0] + h2 * box[2] * 0.4 + u * box[2] * (0.6 + w * 0.5), y = box[1] + h3 * box[3] * 0.5 + Math.sin(u * 7 + i) * 30 - u * box[3] * w * 0.4 + u * u * 80;
    const rot = tt * (2 + h2 * 3) + i, flip = Math.cos(tt * (3 + h1 * 4) + i);
    const leaf = xf([[-s, 0], [-s * 0.3, -s * 0.45], [s, 0], [-s * 0.3, s * 0.45]], mat(x, y, rot, 1, Math.max(0.15, Math.abs(flip))));
    cels(g, catmull(leaf, true, 3), { base: flip > 0 ? EX.leaves[2] : EX.leaves[1], line: P.ink, lw: 1.1, seed: i, L: LIGHT });
  }
}

// ---------- S1: the hillside, wide. A lone tree, a line of fence posts along the crest, the hat on the last post. ----------
const crest1 = x => 700 - 70 * Math.exp(-Math.pow((x - 560) / 520, 2)) + 0.00002 * Math.pow(x - 900, 2);
shot('hillside-wide', 0, 4.5, () => {
  const r = RNG(101);
  const back = makePlate(-60, -60, 2040, 1200, 1.4, g => {
    g.save(); g.translate(-60, -60); paintSky(g, 2040, 760, EX.sky, r, { n: 1500, var: 6 }); g.restore();
    cumulus(g, 1320, 300, 760, 170, EX.cloud, r, { n: 7, front: 0 });
    cumulus(g, 380, 220, 420, 90, EX.cloud, r, { n: 5 });
    const far = [[-60, 640]]; for (let x = -60; x <= 1980; x += 20) far.push([x, 600 - 40 * Math.max(0, Math.sin(x / 300)) * (0.6 + 0.4 * fbm(x / 140, 2, 5, 2))]); far.push([1980, 760], [-60, 760]);
    paintRegion(g, far, EX.far, r, { size: 14, dens: 2, stretch: 3, a: 0.3, cols: [EX.far, '#a5b6c6', '#8899ad'] });
    hazeBand(g, -60, 1980, 640, 40, '#e8e2d2', 0.25, r);
    const hill = [[-60, 1140]]; for (let x = -60; x <= 1980; x += 16) hill.push([x, crest1(x)]); hill.push([1980, 1140]);
    paintRegion(g, hill, EX.mid, r, { size: 16, dens: 2.2, stretch: 2.4, a: 0.3, colAt: (x, y, rr) => jit(stopsAt([[640, '#93ad62'], [820, EX.mid], [1080, EX.near]], y), rr, 12) });
    blades(g, -60, 1980, crest1, 900, r, EX.grass, 16, { depth: 300, a: 0.7 });
    tree(g, 560, crest1(560) + 6, 360, 30, EX.leaves, r, { crownR: 150, lumps: 9, line: P.ink });
    paperOver(g, 2040, 1200, 0.3);
  });
  const posts = [];
  const props = makePlate(-60, -60, 2040, 1200, 1.4, g => {
    let prev = null;
    for (let i = 0; i < 6; i++) {
      const x = 880 + i * 112, y = crest1(x) + 30, top = post(g, x, y, 70 - i * 2, 13, 200 + i);
      if (prev) rail(g, [prev[0], prev[1] + 10], [top[0], top[1] + 10], 2, i);
      prev = top; posts.push(top);
    }
  });
  return { back, props, posts, blades: makeBlades(5, 260, -60, 1980, x => 980, 70, 120) };
}, (g, local, t, S) => {
  const z = lerp(1.0, 1.06, E.io2(local / 4.5));           // slow push toward the hat
  g.save(); cam(g, lerp(960, 1080, E.io2(local / 4.5)), 540, z);
  plateDraw(g, S.back); plateDraw(g, S.props);
  const top = S.posts[S.posts.length - 1], w = windAt(on2(t));
  strawHat(g, top[0], top[1] - 4, 30, { v: 0.3, t: on2(t), wind: w, rot: 0.02 * Math.sin(on2(t) * 2) * w });
  driftLeaves(g, t, 5, 21, [400, 420, 1500, 200], 7);
  g.restore();
  drawBlades(g, S.blades, t);                                // nearest grass stays locked to the lens
});

// ---------- S2: the post, medium. The gust: hat rocks back (anticipation), forward, back, then lets go. ----------
shot('the-post', 4.5, 9, () => {
  const r = RNG(202);
  const back = makePlate(-60, -360, 2040, 1500, 1.3, g => { // taller than the frame: the camera tilts up later
    g.save(); g.translate(-60, -360); paintSky(g, 2040, 1500, [[0, '#4f80b2'], [800, '#a6c4da'], [1200, '#e2dcc6'], [1500, '#efe0c4']], r, { n: 1900, var: 6 }); g.restore();
    cumulus(g, 760, 560, 1100, 260, EX.cloud, r, { n: 8, front: 0 });
    const hill = [[-60, 1140]]; for (let x = -60; x <= 1980; x += 16) hill.push([x, 880 + 40 * Math.sin(x / 500) + 10 * fbm(x / 80, 1, 3, 2)]); hill.push([1980, 1140]);
    paintRegion(g, hill, EX.near, r, { size: 18, dens: 2, stretch: 2.4, a: 0.3, cols: [EX.near, EX.mid, EX.nearDk] });
    tree(g, 240, 900, 520, 40, EX.leaves.map(c => mixv(c, '#c8d4dc', 0.35)), r, { crownR: 210, lumps: 9 }); // softer: it's behind the subject
    paperOver(g, 2040, 1500, 0.3);
  });
  let top;
  const fg = makePlate(-60, -60, 2040, 1200, 1.3, g => { top = post(g, 1180, 1120, 400, 70, 501); rail(g, [-60, 820], [top[0] - 30, top[1] + 60], 6, 3); });
  return { back, fg, top, blades: makeBlades(9, 220, -60, 1980, x => 1000, 130, 100) };
}, (g, local, t, S) => {
  const tt = on2(t), w = windAt(tt), [px, py] = S.top;
  // camera: a slow drift, then it tilts up to follow the hat out of frame
  const camY = lerp(540, 380, E.io3(seg(t, CUE.lift, CUE.gone + 0.3)));
  g.save(); cam(g, lerp(960, 1000, local / 4.5), camY, 1);
  plateDraw(g, S.back); plateDraw(g, S.fg);
  // key poses (rotation in radians, lift in px). Strong holds between, short snaps: weight, not floaty tweening.
  const rot = kf(tt, [[CUE.gust - 0.2, 0], [CUE.gust + 0.15, -0.16, E.out3], [CUE.rock, 0.1, E.io2], [CUE.rock + 0.35, -0.22, E.io2], [CUE.lift - 0.15, -0.3, E.in2], [CUE.lift + 0.5, 0.9, E.out3], [CUE.gone + 0.4, 2.4, E.out2]]);
  const lift = kf(tt, [[CUE.lift - 0.15, 0], [CUE.lift - 0.05, 6, E.out2], [CUE.lift + 0.6, 380, E.out3], [CUE.gone + 0.4, 900, E.in2]]);
  const dx = kf(tt, [[CUE.lift - 0.1, 0], [CUE.gone + 0.4, 520, E.io2]]);
  const sq = 1 - 0.08 * Math.sin(Math.PI * seg(tt, CUE.lift - 0.2, CUE.lift + 0.1)); // tiny squash as it pushes off
  const hx = px + dx + (rot < 0 ? rot * 40 : 0), hy = py - 18 - lift;
  if (lift < 2) { g.fillStyle = css('#000000', 0.25); g.beginPath(); g.ellipse(px, py + 2, 70, 9, 0, 0, TAU); g.fill(); } // contact shadow on the post top
  g.save(); g.translate(hx, hy); g.scale(1 / sq, sq); g.translate(-hx, -hy);
  strawHat(g, hx, hy, 120, { v: lerp(0.3, 0.55, seg(tt, CUE.lift, CUE.gone)), rot, t: tt, wind: w });
  g.restore();
  driftLeaves(g, t, 8, 33, [-200, 300, 2200, 500], 12);
  g.restore();
  drawBlades(g, S.blades, t);
}, { in: { type: 'dissolve', dur: 0.5 } });

// ---------- S3: into the sky, wide. The hat is tiny now, tumbling past a towering cloud. ----------
shot('into-the-sky', 9, 13, () => {
  const r = RNG(303);
  const back = makePlate(-60, -400, 2040, 1600, 1.2, g => {
    g.save(); g.translate(-60, -400); paintSky(g, 2040, 1600, [[0, '#3f6fa6'], [600, '#6f9cc6'], [1200, '#b9d0de'], [1600, '#eadfc6']], r, { n: 2200, var: 6 }); g.restore();
    cumulus(g, 1100, 820, 1500, 600, EX.cloud, r, { n: 9, extra: 5, front: 0 });
    cumulus(g, 200, 380, 500, 120, EX.cloud, r, { n: 5 });
    const hill = [[-60, 1200]]; for (let x = -60; x <= 1980; x += 16) hill.push([x, 1070 + 20 * Math.sin(x / 260)]); hill.push([1980, 1200]);
    paintRegion(g, hill, EX.mid, r, { size: 14, dens: 2, a: 0.3, cols: [EX.mid, EX.near] });
    paperOver(g, 2040, 1600, 0.28);
  });
  return { back };
}, (g, local, t, S) => {
  const tt = on2(t), w = windAt(tt);
  g.save(); cam(g, 960, lerp(540, 300, E.io2(local / 4)), 1);             // tilt up with the hat
  plateDraw(g, S.back);
  const u = seg(tt, 9, 13), x = lerp(-80, 1500, E.io2(u)) + 60 * Math.sin(u * 5), y = lerp(860, 120, E.out2(u)) + 40 * Math.sin(u * 9);
  strawHat(g, x, y, 58, { v: 0.3 + 0.25 * Math.sin(tt * 2.2), rot: tt * 2.6, t: tt, wind: w });
  driftLeaves(g, t + 3, 10, 44, [-200, 400, 2200, 600], 6);
  g.restore();
}, { in: { type: 'dissolve', dur: 0.6 } });
