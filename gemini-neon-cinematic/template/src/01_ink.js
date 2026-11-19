// ---------- tapered ink lines and cel shapes ----------
// An open stroke: width swells from a fine point, wavers a little (seeded, so it never boils), and tapers out.
function ink(g, pts, w, o = {}) {
  const n = pts.length; if (n < 2 || w <= 0) return;
  const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[n - 1] || 1, t0 = o.t0 ?? 0.3, t1 = o.t1 ?? 0.3, mn = o.min ?? 0.12, jv = o.jit ?? 0.22, seed = o.seed ?? 1, jl = o.jl ?? 60;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const s = L[i] / tot;
    const a = t0 > 0 ? Math.min(1, s / t0) : 1, b = t1 > 0 ? Math.min(1, (1 - s) / t1) : 1;
    const pr = Math.sin(Math.min(a, b) * Math.PI / 2);
    let ww = w * (mn + (1 - mn) * pr) * (1 + jv * n1(L[i] / jl, seed)) * 0.5;
    if (o.wf) ww *= o.wf(s);
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n - 1, i + 1)];
    let nx = -(q[1] - p[1]), ny = q[0] - p[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    left.push([pts[i][0] + nx * ww, pts[i][1] + ny * ww]); right.push([pts[i][0] - nx * ww, pts[i][1] - ny * ww]);
  }
  g.beginPath(); g.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath(); g.fillStyle = o.col || P.ink; g.globalAlpha = o.a ?? 1; g.fill(); g.globalAlpha = 1;
}
// A closed outline whose weight swells on the side turned away from the light, like a brush-inked cel.
function inkLoop(g, pts, w, o = {}) {
  const n = pts.length; if (n < 3 || w <= 0) return;
  const sgn = area(pts) > 0 ? 1 : -1, lx = o.lx ?? -0.6, ly = o.ly ?? -0.8, bias = o.bias ?? 0.55, seed = o.seed ?? 3, jv = o.jit ?? 0.25;
  const outer = [], inner = []; let L = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    if (i) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let nx = (q[1] - p[1]) * sgn, ny = -(q[0] - p[0]) * sgn; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; // outward
    const away = -(nx * lx + ny * ly);
    const ww = w * 0.5 * Math.max(0.25, 1 + bias * away) * (1 + jv * n1(L / (o.jl ?? 50), seed));
    outer.push([pts[i][0] + nx * ww * 0.5, pts[i][1] + ny * ww * 0.5]); inner.push([pts[i][0] - nx * ww * 1.5, pts[i][1] - ny * ww * 1.5]);
  }
  g.beginPath(); g.moveTo(outer[0][0], outer[0][1]); for (let i = 1; i < n; i++) g.lineTo(outer[i][0], outer[i][1]); g.closePath();
  g.moveTo(inner[0][0], inner[0][1]); for (let i = n - 1; i >= 0; i--) g.lineTo(inner[i][0], inner[i][1]); g.closePath();
  g.fillStyle = o.col || P.ink; g.globalAlpha = o.a ?? 1; g.fill('evenodd'); g.globalAlpha = 1;
}
// A cel: flat base, a hard-edged rim crescent on the side facing the light, designed shadow shapes, inked outline.
// o: { base, rim, rimW, lx, ly, shade:[{pts,col}], line, lw, seed, after(g) }
function cel(g, pts, o) {
  path(g, pts); g.fillStyle = css(o.base); g.fill();
  if (o.rim || o.shade || o.after) {
    g.save(); path(g, pts); g.clip();
    if (o.rim) {
      const rw = o.rimW ?? 6, lx = o.lx ?? -0.6, ly = o.ly ?? -0.8;
      g.fillStyle = css(o.rim); g.fill();
      path(g, offsetPts(pts, -lx * rw, -ly * rw)); g.fillStyle = css(o.base); g.fill();
    }
    if (o.shade) for (const s of o.shade) { path(g, s.pts); g.fillStyle = css(s.col, s.a ?? 1); g.fill(); }
    if (o.after) o.after(g);
    g.restore();
  }
  if (o.lw !== 0) inkLoop(g, pts, o.lw ?? 3, { col: o.line, lx: o.lx, ly: o.ly, seed: o.seed ?? 3, bias: o.bias, a: o.la });
}
// inner detail line (panel seam, fold): fine, tapered both ends
function seam(g, pts, w, col, seed = 7, a = 1) { ink(g, pts.length < 4 ? densify(pts, false, 6) : pts, w, { col, seed, t0: 0.25, t1: 0.25, min: 0.05, a }); }
