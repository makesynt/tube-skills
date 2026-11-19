// painting kit: foliage clumps, trees, clouds, grass, haze, camera, and plates (paintings rendered once and cached)
function leafDab(g, x, y, s, ang, col, a, r) { dab(g, x, y, s * (1.3 + 0.6 * r()), s * (0.8 + 0.4 * r()), ang, col, a, r); }
function scallop(x, y, R, seed, n = 14, sq = 0.88) {
  const pts = [], N = Math.max(48, n * 8), ph = hash(seed, 1) * 6;
  for (let k = 0; k < N; k++) {
    const th = k / N * TAU, bump = Math.pow(Math.abs(Math.sin(n * th / 2 + ph + 0.25 * n1(th * 2, seed))), 0.55);
    const rr = R * (0.86 + 0.14 * bump) * (1 + 0.07 * n1(th * 1.6, seed + 9));
    pts.push([x + Math.cos(th) * rr, y + Math.sin(th) * rr * sq]);
  }
  return pts;
}
function clump(g, x, y, R, C, r, o = {}) {
  const sd = Math.floor(r() * 1e4), sil = scallop(x, y, R, sd, R > 40 ? 11 : 8);
  path(g, sil); g.fillStyle = css(C(0)); g.fill();
  g.save(); path(g, sil); g.clip();
  path(g, scallop(x - R * 0.12, y - R * 0.16, R * 0.95, sd + 1, 10)); g.fillStyle = css(C(1)); g.fill();
  path(g, scallop(x - R * 0.34, y - R * 0.4, R * 0.78, sd + 2, 9)); g.fillStyle = css(C(2)); g.fill();
  if (R > 8) {
    const ds = Math.max(2, R * (o.dab ?? 0.085));
    // leaf marks breaking the tone boundaries
    for (let i = 0; i < R * 0.9 * (o.dens ?? 1); i++) { const th = r() * TAU, rr = R * (0.55 + 0.4 * r()); const px = x - R * 0.12 + Math.cos(th) * rr, py = y - R * 0.16 + Math.sin(th) * rr * 0.88; leafDab(g, px, py, ds, r() * TAU, jit(C(r() < 0.5 ? 1 : 0), r, 10), 0.9, r); }
    for (let i = 0; i < R * 0.6 * (o.dens ?? 1); i++) { const th = -2.2 + (r() - 0.5) * 2.6, rr = R * (0.5 + 0.35 * r()); leafDab(g, x - R * 0.34 + Math.cos(th) * rr * 0.9, y - R * 0.4 + Math.sin(th) * rr * 0.8, ds, r() * TAU, jit(C(r() < 0.6 ? 2 : 1), r, 12), 0.9, r); }
    for (let i = 0; i < R * 0.25; i++) { const th = -2.2 + (r() - 0.5) * 1.6, rr = R * (0.55 + 0.3 * r()); leafDab(g, x - R * 0.3 + Math.cos(th) * rr, y - R * 0.35 + Math.sin(th) * rr * 0.85, ds * 0.8, r() * TAU, jit(C(3), r, 10), 0.95, r); }
    if (o.sky && R > 30) for (let i = 0; i < 2; i++) { const px = x + (r() - 0.3) * R * 0.8, py = y + (r() - 0.2) * R * 0.6; for (let k = 0; k < 3; k++) leafDab(g, px + (r() - 0.5) * ds * 2.2, py + (r() - 0.5) * ds * 2.2, ds * 0.7, r() * TAU, o.sky, 1, r); }
  }
  g.restore();
  if (R > 8) { const ds = Math.max(2, R * (o.dab ?? 0.085)); for (let i = 0; i < R * 0.35; i++) { const th = r() * TAU, rr = R * (0.95 + 0.12 * r()); leafDab(g, x + Math.cos(th) * rr, y + Math.sin(th) * rr * 0.88, ds * 0.8, r() * TAU, jit(C(Math.sin(th) < -0.2 && Math.cos(th) < 0.3 ? 2 : 1), r, 12), 1, r); } }
  if (o.line) inkLoop(g, sil, Math.max(0.8, R * 0.018), { col: o.line, a: 0.45, seed: sd });
}
function crown(g, cx, cy, rx, ry, pal, r, o = {}) {
  const haze = o.haze, hz = o.hazeAmt ?? 0;
  const C = k => haze ? mixv(pal[k], haze, hz) : hx(pal[k]);
  const n = o.lumps ?? 9, cl = [];
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * (o.spread ?? 0.6);
    cl.push([cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry, Math.min(rx, ry) * (0.3 + 0.28 * r()) * (o.big ?? 1)]);
  }
  if (o.extra) cl.push(...o.extra);
  cl.sort((a, b) => a[1] - b[1]);
  for (const [x, y, R] of cl) clump(g, x, y, R, C, r, { sky: o.sky, dens: o.dens, line: o.line, dab: o.dabK });
}
function trunk(g, x, y, h, w, r, o = {}) {
  const bark = o.bark || '#5a3a2a', barkDk = o.barkDk || '#2e1e18', barkLt = o.barkLt || '#a07a5a';
  const lean = o.lean ?? 0.05, ends = [];
  const limbs = [];
  const spine = [[x, y], [x + lean * h * 0.3, y - h * 0.35], [x + lean * h * 0.5 + (r() - 0.5) * w * 0.4, y - h * 0.62], [x + lean * h * 0.7, y - h * 0.8]];
  limbs.push({ c: catmull(spine, false, 6), w0: w, w1: w * 0.4 });
  const nb = o.limbs ?? 5;
  for (let i = 0; i < nb; i++) {
    const u = 0.56 + 0.3 * (i / (nb - 1 || 1)) + (r() - 0.5) * 0.05, side = i % 2 ? 1 : -1;
    const p0 = [lerp(spine[1][0], spine[3][0], u), y - h * u];
    const len = h * (0.26 + 0.16 * r()) * (1 - u * 0.4), ang = -Math.PI / 2 + side * (0.45 + 0.35 * r());
    const p2 = [p0[0] + Math.cos(ang) * len, p0[1] + Math.sin(ang) * len], p1 = [lerp(p0[0], p2[0], 0.5) + side * len * 0.08, lerp(p0[1], p2[1], 0.5) + len * 0.1];
    limbs.push({ c: catmull([p0, p1, p2], false, 6), w0: w * (0.45 - 0.15 * u), w1: w * 0.08 });
    ends.push(p2);
  }
  ends.push(spine[3]);
  for (const L of limbs) {
    const shape = rib(L.c, 1, 0, 1, s => lerp(L.w0, L.w1, s) / 1);
    path(g, shape); g.fillStyle = css(bark); g.fill();
    g.save(); path(g, shape); g.clip();
    path(g, offsetPts(shape, w * 0.28, 0)); g.fillStyle = css(barkDk, 0.55); g.fill(); // shade side (right)
    for (let i = 0; i < 26; i++) { const k = Math.floor(r() * (L.c.length - 2)), p = L.c[k], q = L.c[k + 1]; bristle(g, p[0] + (r() - 0.5) * L.w0 * 0.6, p[1], 10 + r() * 30, 3 + r() * 4, Math.atan2(q[1] - p[1], q[0] - p[0]), r() < 0.5 ? barkLt : barkDk, 0.35, r, 3); }
    g.restore();
    inkLoop(g, shape, Math.max(1.4, w * 0.05), { col: '#22140e', seed: 5 + limbs.indexOf(L), lx: -0.8, ly: -0.4 });
  }
  // roots flare
  if (o.roots !== false) for (const sd of [-1, 1]) { const rt = [[x + sd * w * 0.2, y - h * 0.06], [x + sd * w * 0.55, y - 4], [x + sd * w * 0.9, y + 2]]; const shp = rib(catmull(rt, false, 4), 1, 0, 1, s => lerp(w * 0.5, 2, s)); path(g, shp); g.fillStyle = css(sd > 0 ? barkDk : bark); g.fill(); }
  return ends;
}
function tree(g, x, y, h, w, pal, r, o = {}) {
  const ends = trunk(g, x, y, h, w, r, o);
  const cr = o.crownR ?? h * 0.42;
  const extra = ends.map(p => [p[0] + (r() - 0.5) * cr * 0.2, p[1] - cr * 0.05, cr * (0.32 + 0.12 * r()) * (o.big ?? 1)]);
  crown(g, x + (o.lean ?? 0.05) * h * 0.6, y - h * (o.crownY ?? 0.8), cr * 1.25, cr * 0.7, pal, r, { lumps: o.lumps ?? 8, big: o.big, spread: o.spread, extra, sky: o.sky, haze: o.haze, hazeAmt: o.hazeAmt, dens: o.dens, line: o.line });
  if (o.twigs) {}
  return ends;
}
function cumulus(g, cx, cy, w, h, pal, r, o = {}) {
  const bumps = [], n = o.n ?? (5 + Math.floor(r() * 4)), base = cy + h * 0.2;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n * 2 - 1, env = Math.pow(1 - u * u, 0.6);
    bumps.push([cx + u * w * 0.46 + (r() - 0.5) * w * 0.05, cy - env * h * (0.3 + 0.3 * r()), (0.14 + 0.12 * r() + 0.14 * env) * w * 0.6]);
  }
  for (let i = 0; i < (o.extra ?? 3); i++) bumps.push([cx + (r() - 0.5) * w * 0.45, cy - h * (0.5 + 0.35 * r()), w * (0.09 + 0.07 * r())]);
  for (let i = 0; i < (o.front ?? 3); i++) bumps.push([cx + (r() - 0.5) * w * 0.7, base - w * 0.06, w * (0.07 + 0.05 * r())]);
  bumps.sort((a, b) => a[1] - b[1]);
  const lx = o.lx ?? -0.55, ly = o.ly ?? -0.85, all = new Path2D();
  g.save(); g.beginPath(); g.rect(cx - w, cy - h * 3, w * 2, base - (cy - h * 3)); g.clip();
  for (const [x, y, rr] of bumps) {
    const sd = Math.floor(x * 7 + y);
    const sil = scallop(x, y, rr, sd, 9, 0.9);
    all.moveTo(sil[0][0], sil[0][1]); for (const q of sil) all.lineTo(q[0], q[1]); all.closePath();
    path(g, sil); g.fillStyle = css(pal.sh); g.fill();
    g.save(); path(g, sil); g.clip();
    path(g, scallop(x + lx * rr * 0.3, y + ly * rr * 0.3, rr * 0.96, sd + 1, 8, 0.9)); g.fillStyle = css(pal.mid); g.fill();
    path(g, scallop(x + lx * rr * 0.55, y + ly * rr * 0.55, rr * 0.82, sd + 2, 7, 0.9)); g.fillStyle = css(pal.lit); g.fill();
    for (let k = 0; k < 10; k++) { const a = Math.atan2(ly, lx) + (r() - 0.5) * 2.2, d = rr * (0.6 + 0.3 * r()); dab(g, x + lx * rr * 0.2 + Math.cos(a) * d, y + ly * rr * 0.2 + Math.sin(a) * d * 0.9, rr * (0.25 + 0.3 * r()), rr * (0.06 + 0.07 * r()), a + Math.PI / 2, jit(r() < 0.5 ? pal.lit : pal.hi, r, 6), 0.4 + 0.3 * r(), r); }
    for (let k = 0; k < 6; k++) { const a = Math.atan2(-ly, -lx) + (r() - 0.5) * 1.6, d = rr * (0.7 + 0.25 * r()); dab(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, rr * (0.3 + 0.3 * r()), rr * 0.07, a + Math.PI / 2, jit(pal.base || pal.sh, r, 6), 0.35, r); }
    g.restore();
  }
  // flat, cool underside
  g.clip(all);
  for (let k = 0; k < 26; k++) dab(g, cx + (r() - 0.5) * w * 0.85, base - r() * h * 0.18, w * (0.08 + 0.12 * r()), h * 0.05 + 3, (r() - 0.5) * 0.03, jit(pal.base || pal.sh, r, 5), 0.5, r);
  g.restore();
}
function blades(g, x0, x1, yAt, n, r, cols, hgt, o = {}) {
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = yAt(x) + r() * (o.depth ?? 30), hh = hgt * (0.5 + r()), bend = (r() - 0.3) * hh * 0.5;
    ink(g, catmull([[x, y], [x + bend * 0.3, y - hh * 0.55], [x + bend, y - hh]], false, 3), Math.max(1.2, hgt * 0.07), { col: css(jit(cols[Math.floor(r() * cols.length)], r, 14)), a: o.a ?? 0.9, t0: 0.0, t1: 0.9, min: 0.15, seed: i });
  }
}
function hazeBand(g, x0, x1, y, h, col, a, r) { for (let i = 0; i < 80; i++) bristle(g, lerp(x0, x1, r()), y + (r() - 0.5) * h, 200 + r() * 400, h * (0.3 + 0.4 * r()), (r() - 0.5) * 0.04, col, a * (0.4 + 0.6 * r()), r, 6); }
function cam(g, cx, cy, z) { g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-cx, -cy); }
function plateDraw(g, pl) { g.drawImage(pl.c, pl.ox, pl.oy, pl.c.width / pl.S, pl.c.height / pl.S); }
function makePlate(x0, y0, w, h, S, fn) { const c = mk(w * S, h * S), g = c.getContext('2d'); g.scale(S, S); g.translate(-x0, -y0); fn(g); return { c, ox: x0, oy: y0, S }; }
