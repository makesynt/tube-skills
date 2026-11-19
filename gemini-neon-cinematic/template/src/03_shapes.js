function cels(g, pts, o) {
  const L = o.L || { lx: -0.6, ly: -0.8 }, sw = o.sw ?? 0, rw = o.rw ?? 0;
  path(g, pts); g.fillStyle = css(sw ? (o.sh ?? o.base) : o.base); g.fill();
  g.save(); path(g, pts); g.clip();
  if (sw) { path(g, offsetPts(pts, L.lx * sw, L.ly * sw)); g.fillStyle = css(o.base); g.fill(); }
  if (o.shade) for (const s of o.shade) { path(g, s.pts); g.fillStyle = css(s.col, s.a ?? 1); g.fill(); }
  if (rw && o.rim) {
    g.beginPath(); const sh = offsetPts(pts, -L.lx * rw, -L.ly * rw);
    g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath();
    g.moveTo(sh[0][0], sh[0][1]); for (let i = 1; i < sh.length; i++) g.lineTo(sh[i][0], sh[i][1]); g.closePath();
    g.fillStyle = css(o.rim, o.rimA ?? 1); g.fill('evenodd');
  }
  if (o.after) o.after(g);
  g.restore();
  if (o.lw !== 0) inkLoop(g, pts, o.lw ?? 3, { col: o.line, lx: L.lx, ly: L.ly, seed: o.seed ?? 3, bias: o.bias ?? 0.5, a: o.la });
}
// capsule between two joints, with an optional muscle/cloth bulge on one side (bul > 0 bulges left of a->b)
function capsule(a, b, w0, w1, bul = 0, n = 10) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const out = [];
  for (let i = 0; i <= n; i++) { const s = i / n, w = lerp(w0, w1, s) / 2 + bul * Math.sin(Math.PI * s) * (bul > 0 ? 1 : 0); out.push([a[0] + dx * s + nx * w, a[1] + dy * s + ny * w]); }
  for (let i = 1; i < 8; i++) { const an = Math.PI / 2 - Math.PI * i / 8; out.push([b[0] + (ux * Math.cos(an) + nx * Math.sin(an)) * w1 / 2, b[1] + (uy * Math.cos(an) + ny * Math.sin(an)) * w1 / 2]); }
  for (let i = n; i >= 0; i--) { const s = i / n, w = lerp(w0, w1, s) / 2 + (-bul) * Math.sin(Math.PI * s) * (bul < 0 ? 1 : 0); out.push([a[0] + dx * s - nx * w, a[1] + dy * s - ny * w]); }
  for (let i = 1; i < 8; i++) { const an = -Math.PI / 2 - Math.PI * i / 8; out.push([a[0] + (ux * Math.cos(an) + nx * Math.sin(an)) * w0 / 2, a[1] + (uy * Math.cos(an) + ny * Math.sin(an)) * w0 / 2]); }
  return out;
}
const pol = (p, ang, len) => [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
function rib(c, w, taper0 = 0.0, taper1 = 1.0, prof) { // tapered filled band along a centreline
  const Lf = [], Rt = [], n = c.length;
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), p = c[Math.max(0, i - 1)], q = c[Math.min(n - 1, i + 1)];
    let nx = -(q[1] - p[1]), ny = q[0] - p[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const ww = (prof ? prof(s) : (Math.min(1, s / Math.max(1e-3, taper0)) * Math.pow(Math.max(0, 1 - Math.max(0, s - (1 - taper1)) / Math.max(1e-3, taper1)), 0.6))) * w * 0.5 + 0.3;
    Lf.push([c[i][0] + nx * ww, c[i][1] + ny * ww]); Rt.push([c[i][0] - nx * ww, c[i][1] - ny * ww]);
  }
  return Lf.concat(Rt.reverse());
}
function cloudMass(g, cx, cy, rx, ry, body, top, base, r, lit) {
  const lumps = 7 + Math.floor(r() * 6), L = [];
  for (let i = 0; i < lumps; i++) { const u = (i / (lumps - 1)) * 2 - 1; L.push([cx + u * rx * (0.9 + 0.1 * r()), cy - Math.sqrt(1 - u * u * 0.9) * ry * (0.5 + 0.6 * r()), ry * (0.45 + 0.4 * r())]); }
  for (const [x, y, rr] of L) for (let j = 0; j < 70; j++) { const a = r() * TAU, d = Math.sqrt(r()) * rr; dab(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 30 + r() * 80, 14 + r() * 30, (r() - 0.5) * 0.6, jit(body, r, 8), 0.3 + 0.3 * r(), r); }
  for (const [x, y, rr] of L) for (let j = 0; j < 30; j++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.0, d = rr * (0.45 + 0.4 * r()); dab(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 24 + r() * 50, 10 + r() * 16, a + Math.PI / 2 + (r() - 0.5) * 0.5, jit(top, r, 10), (lit ? 0.2 : 0.14) * (0.4 + 0.6 * r()), r); }
  for (let j = 0; j < 90; j++) { const u = r() * 2 - 1; dab(g, cx + u * rx, cy + 10 + r() * ry * 0.25, 60 + r() * 140, 10 + r() * 24, (r() - 0.5) * 0.08, jit(base, r, 6), 0.3 + 0.3 * r(), r); }
}
