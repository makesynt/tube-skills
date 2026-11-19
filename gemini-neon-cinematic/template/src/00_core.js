'use strict';
// Cinematic kit core: frame size, math, seeded noise, color, geometry helpers, shot list and keyframes.
// Everything is drawn procedurally on a 2D canvas. Rule: every pixel is a function of t (no clocks, no Math.random).
// B (the parsed src/beats.json) is put in front of this file by build.mjs.
const W = 1920, H = 1080, FPS = B.fps || 24, DUR = B.duration;
const SC = +(new URLSearchParams(location.search).get('scale') || 1); // render scale: 0.5 draft, 2 = 4K
const cv = document.getElementById('c'); cv.width = W * SC; cv.height = H * SC;
const CTX = cv.getContext('2d');
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sstep = t => t * t * (3 - 2 * t);
const E = {
  in2: t => t * t, in3: t => t * t * t,
  out2: t => 1 - (1 - t) * (1 - t), out3: t => 1 - Math.pow(1 - t, 3), out4: t => 1 - Math.pow(1 - t, 4),
  io2: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  io3: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};
// animation is shot "on twos" (12 drawings a second); camera moves stay on ones
const on2 = t => Math.floor(t * 12 + 1e-6) / 12;

function RNG(a) {
  a = (a >>> 0) || 1;
  return function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash(i, s = 0) {
  let h = Math.imul((i | 0) ^ Math.imul(s | 0, 0x9E3779B1), 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function n1(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, s), hash(i + 1, s), u) * 2 - 1; }
function n2(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const h = (a, b) => hash(a + Math.imul(b, 57731), s);
  return lerp(lerp(h(i, j), h(i + 1, j), u), lerp(h(i, j + 1), h(i + 1, j + 1), u), v) * 2 - 1;
}
function fbm(x, y, s = 0, o = 4) { let a = 0, m = 0.5, f = 1; for (let k = 0; k < o; k++) { a += m * n2(x * f, y * f, s + k * 17); f *= 2.03; m *= 0.5; } return a; }
const gauss = r => (r() + r() + r() - 1.5) / 1.5;

function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }

// ---------- color ----------
const _hx = {};
function hx(c) {
  if (Array.isArray(c)) return c;
  if (_hx[c]) return _hx[c];
  const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); _hx[c] = v; return v;
}
const css = (c, a = 1) => { const v = hx(c); return a >= 1 ? `rgb(${v[0] | 0},${v[1] | 0},${v[2] | 0})` : `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a})`; };
const mixv = (a, b, t) => { a = hx(a); b = hx(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; };
const mixc = (a, b, t, al = 1) => css(mixv(a, b, t), al);
const jit = (c, r, amt) => { c = hx(c); const k = (r() - 0.5) * amt; return [c[0] + k + (r() - .5) * amt * .5, c[1] + k + (r() - .5) * amt * .5, c[2] + k + (r() - .5) * amt * .5]; };
function stopsAt(stops, y) {
  if (y <= stops[0][0]) return hx(stops[0][1]);
  for (let i = 1; i < stops.length; i++) if (y <= stops[i][0]) return mixv(stops[i - 1][1], stops[i][1], (y - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return hx(stops[stops.length - 1][1]);
}

// shared palette: the default ink colors. Add the animation's own colors here or in its scene files.
const P = {
  ink: '#2a1610',      // warm sepia-black line for characters and props
  inkCool: '#1d2230',  // cool line for night and shadow scenes
  sun: '#fff2d4',      // light shafts and glows
};
function grade(pal, to, amt) { const o = {}; for (const k in pal) o[k] = mixv(pal[k], to, amt); return o; }
// ---------- geometry helpers ----------
function catmull(pts, closed = false, per = 6) {
  const out = [], n = pts.length; if (n < 3) return pts.slice();
  const g = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
function bez(p0, p1, p2, p3, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
function densify(pts, closed, step = 10) {
  const o = [], n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) o.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!closed) o.push(pts[n - 1]);
  return o;
}
function xf(pts, m) { // m = [a,b,c,d,e,f] like canvas transform
  return pts.map(p => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]);
}
function mat(x, y, rot = 0, sx = 1, sy = sx) { const c = Math.cos(rot), s = Math.sin(rot); return [c * sx, s * sx, -s * sy, c * sy, x, y]; }
function mmul(A, B) { return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]]; }
function path(g, pts, closed = true) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); if (closed) g.closePath(); }
function fillPts(g, pts, col) { path(g, pts); g.fillStyle = col; g.fill(); }
function area(pts) { let a = 0; for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function offsetPts(pts, dx, dy) { return pts.map(p => [p[0] + dx, p[1] + dy]); }
// rough a polygon's edge so it reads hand-cut rather than vector
function rough(pts, amt, seed, step = 8, closed = true) {
  const d = densify(pts, closed, step), n = d.length, o = [];
  for (let i = 0; i < n; i++) {
    const a = d[(i - 1 + n) % n], b = d[(i + 1) % n];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const k = amt * (n1(i * 0.35, seed) * 0.7 + n1(i * 1.7, seed + 5) * 0.3);
    o.push([d[i][0] + nx * k, d[i][1] + ny * k]);
  }
  return o;
}

const SHOTS = [];
// shot(name, t0, t1, prep, draw, o): prep() runs once (paint plates there); draw(g, local, t, state) runs every frame.
// o.in = { type: 'dissolve' | 'dip', dur, color } blends from the previous shot, which keeps running during the overlap.
function shot(name, t0, t1, prep, draw, o = {}) { SHOTS.push({ name, t0, t1, prep, draw, in: o.in, ready: false }); }
// keyframes: kf(t, [[t0, v0], [t1, v1], ...], ease) for numbers or arrays of numbers
function kf(t, keys, ease = E.io2) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], u = (keys[i][2] || ease)((t - a) / (b - a));
      return Array.isArray(va) ? va.map((v, k) => lerp(v, vb[k], u)) : lerp(va, vb, u);
    }
  }
  return keys[keys.length - 1][1];
}
