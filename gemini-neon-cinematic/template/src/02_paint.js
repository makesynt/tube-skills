// ---------- painted background tools (gouache / watercolor on paper) ----------
// a single brush dab: tapered, slightly bent, edges uneven
function dab(g, x, y, len, wid, ang, col, a, r) {
  const k = 9, top = [], bot = [], bend = (r() - 0.5) * 0.35 * wid, c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 0; i <= k; i++) {
    const u = i / k, px = (u - 0.5) * len, py = bend * 4 * u * (1 - u);
    const w = wid * Math.pow(Math.sin(Math.PI * (0.04 + u * 0.92)), 0.45) * 0.5;
    top.push([px, py - w * (0.8 + 0.4 * r())]); bot.push([px, py + w * (0.8 + 0.4 * r())]);
  }
  g.beginPath();
  const all = top.concat(bot.reverse());
  for (let i = 0; i < all.length; i++) { const p = all[i], X = x + p[0] * c - p[1] * s, Y = y + p[0] * s + p[1] * c; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }
  g.closePath(); g.fillStyle = css(col, a); g.fill();
}
// dry brush: separate bristle marks that skip over the paper tooth
function bristle(g, x, y, len, wid, ang, col, a, r, nb = 7) {
  const c = Math.cos(ang), s = Math.sin(ang);
  g.lineCap = 'round';
  for (let b = 0; b < nb; b++) {
    const off = (b / (nb - 1) - 0.5) * wid, st = r() * 0.25 * len, en = len * (0.7 + 0.3 * r());
    g.strokeStyle = css(col, a * (0.35 + 0.65 * r())); g.lineWidth = wid / nb * (0.8 + r());
    g.beginPath();
    let on = false;
    for (let u = st; u <= en; u += len / 14) {
      const px = u - len / 2, py = off + (r() - 0.5) * wid * 0.08, X = x + px * c - py * s, Y = y + px * s + py * c;
      if (r() < 0.12) { on = false; continue; }
      on ? g.lineTo(X, Y) : g.moveTo(X, Y); on = true;
    }
    g.stroke();
  }
}
// fill a region with opaque base paint, then work texture into it with dabs, clipped to the region
function paintRegion(g, pts, base, r, o = {}) {
  g.save(); path(g, pts); g.fillStyle = css(base); g.fill(); g.clip();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const sz = o.size ?? 40, n = Math.min(o.max ?? 4000, Math.floor((x1 - x0) * (y1 - y0) / (sz * sz) * (o.dens ?? 1.2)));
  const cols = o.cols || [base], ang = o.ang ?? 0, av = o.angVar ?? 0.25;
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
    const col = o.colAt ? o.colAt(x, y, r) : jit(cols[Math.floor(r() * cols.length)], r, o.var ?? 10);
    const L = sz * (0.8 + r() * (o.stretch ?? 2.2));
    (o.dry && r() < o.dry ? bristle : dab)(g, x, y, L, sz * (0.35 + r() * 0.5), ang + (r() - 0.5) * av, col, (o.a ?? 0.28) * (0.5 + r()), r);
  }
  if (o.after) o.after(g);
  g.restore();
  if (o.edge) { // pigment pooling at the edge
    ink(g, densify(pts.concat([pts[0]]), false, 8), o.edge, { col: o.edgeCol || mixc(base, '#000000', 0.35), a: o.edgeA ?? 0.35, t0: 0, t1: 0, min: 0.5, jit: 0.5, seed: 11 });
  }
}
// graded sky built from horizontal brush strokes over a base wash (reads as painted, not airbrushed)
function paintSky(g, w, h, stops, r, o = {}) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [y, c] of stops) gr.addColorStop(clamp(y / h), css(c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const n = o.n ?? Math.floor(w * h / 900);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, col = jit(stopsAt(stops, y + (r() - 0.5) * (o.mixY ?? 60)), r, o.var ?? 9);
    dab(g, x, y, 90 + r() * 360, 10 + r() * 30, (r() - 0.5) * 0.05 + (o.ang ?? 0), col, 0.16 + r() * 0.22, r);
  }
}
// long low dawn cloud: plum body, warm under-lit belly, a few lit dry-brush streaks
function stratus(g, cx, cy, len, th, body, lit, r, o = {}) {
  const n = Math.floor(len / 9);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, x = cx + u * len / 2, env = Math.pow(1 - u * u, 0.7), y = cy + gauss(r) * th * 0.35 * env;
    dab(g, x, y, 40 + r() * 140 * env, th * (0.25 + 0.5 * env * r()), (r() - 0.5) * 0.06, jit(body, r, 10), 0.35 + 0.4 * r(), r);
  }
  for (let i = 0; i < n * 0.55; i++) {
    const u = r() * 2 - 1, x = cx + u * len / 2 * 0.95, env = Math.pow(1 - u * u, 0.7), y = cy + th * (0.12 + 0.18 * env) + gauss(r) * th * 0.08;
    const lcol = jit(lit, r, 14);
    (r() < 0.5 ? bristle : dab)(g, x, y, 30 + r() * 120 * env, th * (0.08 + 0.14 * r()), (r() - 0.5) * 0.04, lcol, (o.litA ?? 0.55) * (0.4 + 0.6 * r()), r, 5);
  }
}
// paper: low-frequency mottling + fibres + tooth. Used as an overlay on painted plates.
let PAPER = null;
function paper() {
  if (PAPER) return PAPER;
  const w = 960, h = 540, c = mk(w, h), g = c.getContext('2d'), id = g.createImageData(w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = 128 + 26 * fbm(x / 90, y / 90, 3, 3) + 12 * n2(x / 9, y / 9, 8) + 14 * (hash(x + y * w, 2) - 0.5);
    const k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  const r = RNG(77);
  g.lineCap = 'round';
  for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, a = r() * TAU, l = 4 + r() * 16; g.strokeStyle = `rgba(${r() < 0.5 ? 90 : 170},${r() < 0.5 ? 90 : 170},${r() < 0.5 ? 90 : 170},0.25)`; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  PAPER = c; return c;
}
function paperOver(g, w, h, a = 0.35, op = 'overlay') {
  // apply the paper only where the plate already has paint (transparent plates stay transparent)
  const c = g.canvas, tmp = mk(c.width, c.height), tg = tmp.getContext('2d');
  tg.drawImage(c, 0, 0); tg.globalCompositeOperation = op; tg.globalAlpha = a; tg.drawImage(paper(), 0, 0, c.width, c.height);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.drawImage(tmp, 0, 0); g.restore();
}
// screen-space film tooth: fixed (never animated), so paused frames and playback look the same
let TOOTH = null;
function tooth() {
  if (TOOTH) return TOOTH;
  const c = mk(512, 512), g = c.getContext('2d'), id = g.createImageData(512, 512), d = id.data;
  for (let i = 0; i < 512 * 512; i++) { const v = 128 + 40 * (hash(i, 41) - 0.5) + 18 * n2((i % 512) / 3, Math.floor(i / 512) / 3, 5); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0); TOOTH = c; return c;
}
// light shafts: a fan of streaky painted wedges, rendered once, then composited with "screen" at low strength
function rayFan(R, nRays, seed, warm = P.sun) {
  const c = mk(R * 2, R * 2), g = c.getContext('2d'), r = RNG(seed);
  g.translate(R, R);
  for (let i = 0; i < nRays; i++) {
    const a0 = r() * TAU, wdt = 0.02 + r() * 0.07, len = R * (0.55 + r() * 0.45);
    const grd = g.createLinearGradient(0, 0, Math.cos(a0) * len, Math.sin(a0) * len);
    grd.addColorStop(0, css(warm, 0.0)); grd.addColorStop(0.08, css(warm, 0.55)); grd.addColorStop(0.6, css(warm, 0.22)); grd.addColorStop(1, css(warm, 0));
    g.beginPath(); g.moveTo(0, 0);
    g.lineTo(Math.cos(a0 - wdt) * len, Math.sin(a0 - wdt) * len); g.lineTo(Math.cos(a0 + wdt) * len, Math.sin(a0 + wdt) * len); g.closePath();
    g.fillStyle = grd; g.globalAlpha = 0.35 + r() * 0.5; g.fill();
    // streaks inside the shaft so it isn't a smooth airbrushed wedge
    g.globalAlpha = 1;
    for (let k = 0; k < 6; k++) { const aa = a0 + (r() - 0.5) * wdt * 1.6, l2 = len * (0.4 + r() * 0.6); bristle(g, Math.cos(aa) * l2 * 0.5, Math.sin(aa) * l2 * 0.5, l2, len * wdt * 0.5, aa, warm, 0.12, r, 4); }
  }
  return c;
}
// distant dust motes drifting in the light: deterministic positions from time
function motes(g, t, n, seed, box, col, a, sz = 2.2) {
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, seed), h2 = hash(i, seed + 1), h3 = hash(i, seed + 2);
    const x = box[0] + ((h1 * box[2] + t * (8 + h3 * 14) + 30 * n1(t * 0.2 + i, seed)) % box[2] + box[2]) % box[2];
    const y = box[1] + ((h2 * box[3] - t * (3 + h3 * 6) + 20 * n1(t * 0.17 + i * 3, seed + 9)) % box[3] + box[3]) % box[3];
    const s = sz * (0.5 + h3);
    g.fillStyle = css(col, a * (0.4 + 0.6 * h2)); g.beginPath(); g.ellipse(x, y, s, s * 0.8, h1 * 3, 0, TAU); g.fill();
  }
}
