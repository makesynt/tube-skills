// ===== 00_core.js — Deterministic Math, Seeded Noise, Log-Space Camera & Offscreen Plates =====
const W = 1920, H = 1080;
const FPS = B.fps || 30, DUR = B.duration || 15;
const qParam = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const SC = +(qParam.get('scale') || 1);
const CV = document.getElementById('c');
CV.width = Math.round(W * SC);
CV.height = Math.round(H * SC);
const CTX = CV.getContext('2d');

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a), 0, 1));

const E = {
  lin: x => x,
  io2: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  io3: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out3: x => 1 - Math.pow(1 - x, 3),
  out4: x => 1 - Math.pow(1 - x, 4),
  in3: x => x * x * x,
  outBack: x => {
    const c1 = 1.45, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed = 17) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise2(x, y, seed = 17) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

let _GRAIN_PAT = null;
function grainPattern(g) {
  if (_GRAIN_PAT) return _GRAIN_PAT;
  const c = mkCanvas(160, 160);
  const x = c.getContext('2d');
  const img = x.createImageData(160, 160);
  const rng = mulberry32(90210);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(110 + (rng() - 0.5) * 90);
    img.data[i] = v;
    img.data[i + 1] = v - 3;
    img.data[i + 2] = v - 8;
    img.data[i + 3] = 32;
  }
  x.putImageData(img, 0, 0);
  _GRAIN_PAT = g.createPattern(c, 'repeat');
  return _GRAIN_PAT;
}

// Resolve archival images from pre-decoded DOM <img data-archive-name="..."> or base64 map
const LOADED_IMAGES = {};
function preloadAllImages() {
  if (typeof document !== 'undefined') {
    document.querySelectorAll('img[data-archive-name]').forEach(el => {
      LOADED_IMAGES[el.getAttribute('data-archive-name')] = el;
    });
  }
  const entries = Object.entries(typeof ARCHIVE_URLS !== 'undefined' ? ARCHIVE_URLS : {})
    .filter(([name]) => !LOADED_IMAGES[name]);
  if (!entries.length) return Promise.resolve();
  return Promise.all(
    entries.map(([name, src]) => new Promise(res => {
      const im = new Image();
      im.onload = () => { LOADED_IMAGES[name] = im; res(); };
      im.onerror = () => res();
      im.src = src;
    }))
  );
}

// Evaluate continuous world camera with log-space zoom + organic handheld breath + stamp trauma
function evalCamera(keys, stamps, t) {
  if (!keys || !keys.length) return { x: 2600, y: 2100, zoom: 0.75, rot: 0 };
  let k0 = keys[0], k1 = keys[keys.length - 1];
  if (t <= k0.t) {
    k1 = k0;
  } else if (t >= k1.t) {
    k0 = k1;
  } else {
    for (let i = 0; i < keys.length - 1; i++) {
      if (t >= keys[i].t && t < keys[i + 1].t) {
        k0 = keys[i];
        k1 = keys[i + 1];
        break;
      }
    }
  }
  const fn = E[k1.ease || 'io3'] || E.io3;
  const p = k1.t > k0.t ? fn(seg(t, k0.t, k1.t)) : 1;
  const zoom = Math.exp(lerp(Math.log(Math.max(0.15, k0.zoom)), Math.log(Math.max(0.15, k1.zoom)), p));
  let x = lerp(k0.x, k1.x, p);
  let y = lerp(k0.y, k1.y, p);
  let rot = lerp(k0.rot || 0, k1.rot || 0, p);

  // Subtle handheld documentary float (deterministic)
  x += (noise2(t * 0.35, 1.7, 31) - 0.5) * (14 / zoom);
  y += (noise2(4.3, t * 0.35, 57) - 0.5) * (10 / zoom);
  rot += (noise2(t * 0.28, 9.1, 83) - 0.5) * 0.004;

  // Damped impact shake when rubber stamps slam
  if (stamps) {
    for (const st of stamps) {
      const dt = t - st.t0;
      if (dt >= 0 && dt < 0.38) {
        const amp = Math.exp(-dt * 14) * (11 / zoom);
        x += Math.sin(dt * 95) * amp;
        y += Math.cos(dt * 112) * amp * 0.8;
        rot += Math.sin(dt * 80) * 0.005 * Math.exp(-dt * 14);
      }
    }
  }
  return { x, y, zoom, rot };
}

function applyCameraTransform(g, cam) {
  g.translate(W / 2, H / 2);
  g.rotate(cam.rot);
  g.scale(cam.zoom, cam.zoom);
  g.translate(-cam.x, -cam.y);
}

function worldToScreen(wx, wy, cam) {
  const dx = (wx - cam.x) * cam.zoom;
  const dy = (wy - cam.y) * cam.zoom;
  const c = Math.cos(cam.rot), s = Math.sin(cam.rot);
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}
