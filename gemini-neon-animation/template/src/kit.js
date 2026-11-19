// Animation kit: deterministic stage, shot timeline, transitions, compositor,
// look helpers, characters. The story (story.js) only describes sets and shots.
// Rule: every pixel is a function of t. No clocks, no Math.random, no state carried between frames.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
export { THREE };

// ---------------------------------------------------------------- math + time
export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a)); // 0..1 progress of t through [a,b]
export const ease = {
  linear: t => t,
  in: t => t * t * t,
  out: t => 1 - Math.pow(1 - t, 3),
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  smooth: t => t * t * (3 - 2 * t),
  back: t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  // settles with a couple of overshoots: pops, landings, cards arriving
  spring: t => 1 - Math.exp(-6 * t) * Math.cos(t * 13),
  // eased hop 0 -> 1 -> 0
  arc: t => Math.sin(Math.PI * clamp(t)),
};
// seeded random: const r = rng(7); r() in [0,1)
export function rng(seed = 1) {
  let s = (Math.floor(Math.abs(seed)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const hash = (i, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7 + 13.13) * 43758.5453; return s - Math.floor(s); };
// smooth 1D value noise in [-1,1]: wobble(t*freq, seed)
export function wobble(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed), hash(i + 1, seed), u) * 2 - 1;
}
// keyframes: keys(t, [[0, 0], [2, 5, 'out'], [4, [1,2,3], 'io']]) -> number or array.
// The ease on a key shapes the segment that ENDS on that key.
export function keys(t, list) {
  if (t <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    const [t1, v1, e] = list[i];
    if (t <= t1) {
      const [t0, v0] = list[i - 1];
      const p = (ease[e || 'io'])(seg(t, t0, t1));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], p)) : lerp(v0, v1, p);
    }
  }
  return list[list.length - 1][1];
}

// ---------------------------------------------------------------- stage
const Q = new URLSearchParams(location.search);
export const VIDEO = { width: 1920, height: 1080, fps: 24, duration: 30, scale: +(Q.get('scale') || 1) };

export function createStage(opts = {}) {
  Object.assign(VIDEO, opts.video || {});
  const S = VIDEO.scale, W = Math.round(VIDEO.width * S), H = Math.round(VIDEO.height * S);
  const out = document.getElementById('c');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 2000);
  // post: bloom only where a shot asks for it (it costs time in software GL)
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(new THREE.Scene(), camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.85);
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass());
  const scratch = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const buf = scratch(), buf2 = scratch(); // for transitions
  return { W, H, S, out, ctx, renderer, camera, composer, renderPass, bloom, buf, bctx: buf.getContext('2d'), buf2, bctx2: buf2.getContext('2d') };
}

// ---------------------------------------------------------------- film
// sets:  { name: { scene, update(t, shot, local) } }
// shots: [{ set, dur, cam(local, p) -> {pos, look, fov, roll}, in: {type, dur, color}, bloom, grade, update? }]
// Shots play back to back; 'at' is filled in. Transitions overlap the end of the previous shot.
export function makeFilm(stage, { sets, shots, overlay, finish = {} }) {
  let at = 0;
  for (const s of shots) { s.at = at; at += s.dur; }
  VIDEO.duration = at;
  const tmpLook = new THREE.Vector3();

  function drawShot(shot, t, target) {
    const local = t - shot.at, p = clamp(local / shot.dur);
    const set = sets[shot.set];
    set.update && set.update(t, shot, local);
    shot.update && shot.update(t, local, p, set);
    const c = shot.cam(local, p);
    const cam = stage.camera;
    cam.position.set(...c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(tmpLook.set(...c.look));
    if (c.roll) cam.rotateZ(c.roll);
    cam.fov = c.fov || 35; cam.updateProjectionMatrix();
    const b = shot.bloom || set.bloom;
    if (b) {
      stage.renderPass.scene = set.scene;
      stage.bloom.strength = b.strength ?? 0.6; stage.bloom.radius = b.radius ?? 0.5; stage.bloom.threshold = b.threshold ?? 0.85;
      stage.composer.render();
    } else stage.renderer.render(set.scene, cam);
    const g = target;
    g.save(); g.filter = shot.grade || set.grade || 'none';
    g.drawImage(stage.renderer.domElement, 0, 0); g.restore();
  }

  function renderAt(t) {
    t = clamp(t, 0, VIDEO.duration - 1e-6);
    const i = Math.max(0, shots.findIndex(s => t >= s.at && t < s.at + s.dur));
    const shot = shots[i], prev = shots[i - 1], tr = shot.in;
    const { ctx, bctx, W, H } = stage;
    const k = tr && prev ? clamp((t - shot.at) / tr.dur) : 1;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (k >= 1) drawShot(shot, t, ctx);
    else {
      const type = tr.type || 'dissolve', e = ease.io(k);
      if (type === 'dip') { // previous fades to a color, new one fades up from it
        if (k < 0.5) drawShot(prev, t, ctx); else drawShot(shot, t, ctx);
        ctx.save(); ctx.globalAlpha = 1 - Math.abs(k * 2 - 1); ctx.fillStyle = tr.color || '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
      } else {
        drawShot(prev, t, ctx);
        drawShot(shot, t, bctx);
        ctx.save();
        if (type === 'dissolve') { ctx.globalAlpha = e; ctx.drawImage(stage.buf, 0, 0); }
        else if (type === 'iris') { // circle opens on the new shot
          const cx = (tr.x ?? 0.5) * W, cy = (tr.y ?? 0.5) * H, r = e * Math.hypot(W, H) * 0.6;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip(); ctx.drawImage(stage.buf, 0, 0);
        } else if (type === 'whip') { // fast smeared pan between shots
          const dir = tr.dir || 1, blur = Math.sin(Math.PI * k) * 60 * stage.S;
          stage.bctx2.drawImage(stage.out, 0, 0);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          ctx.filter = `blur(${blur}px)`;
          ctx.drawImage(stage.buf2, -dir * e * W, 0); ctx.drawImage(stage.buf, dir * (1 - e) * W, 0);
        } else if (type === 'wipe') {
          const x = e * W; ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); ctx.drawImage(stage.buf, 0, 0);
        }
        ctx.restore();
      }
    }
    // overlays are drawn in 1920x1080 space whatever the render scale
    ctx.save(); ctx.setTransform(stage.S, 0, 0, stage.S, 0, 0);
    overlay && overlay(ctx, t);
    finishFrame(ctx, t, finish);
    ctx.restore();
  }
  return { renderAt, shots, duration: () => VIDEO.duration };
}

// ---------------------------------------------------------------- finishing (2D, in 1920x1080 space)
let GRAIN = null;
function finishFrame(g, t, f) {
  const W = VIDEO.width, H = VIDEO.height;
  if (f.vignette) {
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(${f.vignetteColor || '20,15,25'},${f.vignette})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  if (f.grain) {
    if (!GRAIN) {
      GRAIN = [];
      for (let k = 0; k < 6; k++) { // a few fixed grain tiles, picked by frame number
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const x = c.getContext('2d'), d = x.createImageData(256, 256), r = rng(11 + k);
        for (let i = 0; i < d.data.length; i += 4) { const v = 100 + r() * 155; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
        x.putImageData(d, 0, 0); GRAIN.push(c);
      }
    }
    const fr = Math.round(t * VIDEO.fps);
    g.save(); g.globalAlpha = f.grain; g.globalCompositeOperation = 'overlay';
    g.translate((fr * 37) % 256, (fr * 91) % 256);
    g.fillStyle = g.createPattern(GRAIN[fr % GRAIN.length], 'repeat'); g.fillRect(-256, -256, W + 512, H + 512);
    g.restore();
  }
  if (f.letterbox) { g.fillStyle = '#000'; const b = f.letterbox * H; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); }
  const fi = f.fadeIn ?? 0.6, fo = f.fadeOut ?? 1.0;
  const a = Math.max(fi ? 1 - seg(t, 0, fi) : 0, fo ? seg(t, VIDEO.duration - fo, VIDEO.duration) : 0);
  if (a > 0) { g.save(); g.globalAlpha = a; g.fillStyle = f.fadeColor || '#000'; g.fillRect(0, 0, W, H); g.restore(); }
}

// Title card text that fades/rises in and out. Draw from story overlay().
export function title(g, t, text, o = {}) {
  const at = o.at ?? 0, dur = o.dur ?? 3, inD = o.in ?? 0.6, outD = o.out ?? 0.6;
  const k = seg(t, at, at + inD) * (1 - seg(t, at + dur - outD, at + dur));
  if (k <= 0) return;
  const W = VIDEO.width, H = VIDEO.height;
  g.save();
  g.globalAlpha = ease.out(k);
  g.font = `${o.weight || 600} ${o.size || 110}px ${o.font || 'Title, Georgia, serif'}`;
  g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  const x = (o.x ?? 0.5) * W, y = (o.y ?? 0.5) * H + (1 - ease.out(k)) * 24;
  if (o.shadow !== false) { g.shadowColor = o.shadowColor || 'rgba(0,0,0,0.35)'; g.shadowBlur = 24; g.shadowOffsetY = 4; }
  g.fillStyle = o.color || '#fffaf0';
  g.fillText(text, x, y);
  g.restore();
}

// ---------------------------------------------------------------- look helpers
const GRADS = {};
function toonGradient(steps) {
  if (GRADS[steps]) return GRADS[steps];
  const d = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) d[i] = Math.round(40 + (215 * i) / (steps - 1));
  const tx = new THREE.DataTexture(d, steps, 1, THREE.RedFormat);
  tx.minFilter = tx.magFilter = THREE.NearestFilter; tx.generateMipmaps = false; tx.needsUpdate = true;
  return (GRADS[steps] = tx);
}
// cel-shaded material with hard light bands
export const toon = (color, steps = 3, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(steps), ...extra });
// soft matte "clay / felt / plastic toy" material
export const clay = (color, rough = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
export const glowMat = (color, intensity = 2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });

// ink outline by inverted hull; works best on smooth, closed shapes
const OUTLINE_MATS = {};
export function outline(mesh, width = 0.03, color = '#2a2230') {
  const m = OUTLINE_MATS[color] || (OUTLINE_MATS[color] = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
  const o = new THREE.Mesh(mesh.geometry, m);
  mesh.geometry.computeBoundingSphere();
  const r = mesh.geometry.boundingSphere.radius || 1;
  o.scale.setScalar(1 + width / r);
  o.castShadow = false; o.receiveShadow = false;
  mesh.add(o);
  return mesh;
}

export function mesh(geo, mat, { pos, rot, scale, shadow = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) Array.isArray(scale) ? m.scale.set(...scale) : m.scale.setScalar(scale);
  m.castShadow = shadow; m.receiveShadow = shadow;
  return m;
}
export const group = (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; };

// vertical gradient sky as the scene background
export function skyGradient(scene, stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  scene.background = tx;
  return tx;
}

// sky light + sun with a shadow box sized to the playing area
export function sunlight(scene, { sun = '#fff1d6', sky = '#bcd7ff', ground = '#6b7a4a', intensity = 2.6, ambient = 1.2, dir = [6, 10, 4], area = 14, mapSize = 2048 } = {}) {
  const hemi = new THREE.HemisphereLight(sky, ground, ambient);
  const s = new THREE.DirectionalLight(sun, intensity);
  s.position.set(...dir); s.castShadow = true;
  s.shadow.mapSize.set(mapSize, mapSize);
  Object.assign(s.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: 0.5, far: 80 });
  s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02; s.shadow.radius = 3;
  scene.add(hemi, s, s.target);
  return { hemi, sun: s };
}

// scatter n things with a seeded rng: scatter(7, 40, r => tree(r), [-20,20], [-20,-5])
export function scatter(seed, n, make, xr, zr, avoid = null) {
  const r = rng(seed), g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const x = lerp(xr[0], xr[1], r()), z = lerp(zr[0], zr[1], r());
    if (avoid && avoid(x, z)) continue;
    const o = make(r, i); o.position.x += x; o.position.z += z; o.rotation.y += r() * TAU;
    g.add(o);
  }
  return g;
}

// ---------------------------------------------------------------- props
export function tree(r, o = {}) {
  const h = (o.h || 2.2) * lerp(0.8, 1.25, r());
  const trunk = mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.5, 8), o.trunkMat || toon('#7a5236'), { pos: [0, h * 0.25, 0] });
  const g = group(trunk);
  const leaf = o.leafMat || toon(o.leaf || ['#5d9b4a', '#6fae52', '#4f8a43'][Math.floor(r() * 3)]);
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.IcosahedronGeometry(h * lerp(0.28, 0.38, r()), 1), leaf, { pos: [lerp(-0.3, 0.3, r()) * h * 0.4, h * (0.6 + i * 0.13), lerp(-0.3, 0.3, r()) * h * 0.4] });
    g.add(b);
  }
  return g;
}
export function rock(r, o = {}) {
  const geo = new THREE.DodecahedronGeometry(o.size || 0.5, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * lerp(0.8, 1.2, r()), p.getY(i) * lerp(0.5, 0.9, r()), p.getZ(i) * lerp(0.8, 1.2, r()));
  geo.computeVertexNormals();
  return mesh(geo, o.mat || toon('#9a978f'));
}
// puffy cloud from spheres (use with a bright toon or basic material)
export function cloud(r, o = {}) {
  const m = o.mat || toon('#ffffff', 2, { emissive: '#dfe8ff', emissiveIntensity: 0.25 });
  const g = new THREE.Group();
  const n = 4 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) g.add(mesh(new THREE.SphereGeometry(lerp(0.8, 1.6, r()), 16, 12), m, { pos: [(i - n / 2) * 1.1, lerp(-0.2, 0.5, r()), lerp(-0.4, 0.4, r())], shadow: false }));
  g.scale.setScalar(o.scale || 1);
  return g;
}
// instanced grass blades over an area; sway(t) bends them in the wind
export function grass(seed, n, xr, zr, colors = ['#6fae52', '#8cc263', '#5d9b4a']) {
  const geo = new THREE.ConeGeometry(0.025, 0.2, 3); geo.translate(0, 0.1, 0);
  const g = new THREE.Group(), r = rng(seed), per = Math.ceil(n / colors.length), dummy = new THREE.Object3D();
  const sets = colors.map(c => { const im = new THREE.InstancedMesh(geo, toon(c, 2), per); im.receiveShadow = true; g.add(im); return { im, base: [] }; });
  for (let i = 0; i < per * colors.length; i++) {
    const s = sets[i % colors.length];
    s.base.push([lerp(xr[0], xr[1], r()), lerp(zr[0], zr[1], r()), r() * TAU, lerp(0.6, 1.4, r()), r()]);
  }
  g.sway = t => sets.forEach(s => {
    s.base.forEach(([x, z, ry, sc, ph], j) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(Math.sin(t * 1.7 + x * 0.6 + ph * 6) * 0.18, ry, 0); dummy.scale.set(1, sc, 1);
      dummy.updateMatrix(); s.im.setMatrixAt(j, dummy.matrix);
    });
    s.im.instanceMatrix.needsUpdate = true;
  });
  g.sway(0);
  return g;
}

// ---------------------------------------------------------------- characters
// A friendly figure built from primitives, with pivots you can pose.
// Proportions: short tapered arms, a cuff, mitten hands, big readable head.
export function makeCharacter(o = {}) {
  const M = o.mat || toon;
  const skin = M(o.skin || '#f2c6a0'), shirt = M(o.shirt || '#e4572e'), pants = M(o.pants || '#3b5b92'), shoe = M(o.shoe || '#3a2c2c');
  const hair = M(o.hair || '#4a2f22'), white = M('#ffffff', 2), dark = new THREE.MeshBasicMaterial({ color: '#1d1820' });
  const ol = o.outline === false ? x => x : x => outline(x, o.outlineWidth ?? 0.018);
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.62; root.add(hips);
  const torso = ol(mesh(new THREE.CapsuleGeometry(0.2, 0.28, 6, 16), shirt, { pos: [0, 0.28, 0] }));
  torso.scale.set(1, 1, 0.8); hips.add(torso);
  const neck = new THREE.Group(); neck.position.y = 0.56; hips.add(neck);
  const head = ol(mesh(new THREE.SphereGeometry(0.24, 24, 18), skin, { pos: [0, 0.22, 0] })); neck.add(head);
  const hairCap = mesh(new THREE.SphereGeometry(0.255, 24, 12, 0, TAU, 0, Math.PI * 0.55), hair, { pos: [0, 0.02, -0.02], rot: [-0.55, 0, 0] });
  head.add(hairCap);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.05, 16, 12), white, { pos: [s * 0.085, 0.03, 0.205], shadow: false });
    const p = mesh(new THREE.SphereGeometry(0.028, 12, 10), dark, { pos: [0, 0, 0.032], shadow: false });
    e.add(p); head.add(e); eyes.push(e);
  }
  const mouth = mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16, Math.PI), dark, { pos: [0, -0.07, 0.215], rot: [0, 0, Math.PI], shadow: false });
  head.add(mouth);
  function limb(len, r0, r1, mat) { const g = new THREE.CylinderGeometry(r0, r1, len, 12); g.translate(0, -len / 2, 0); return ol(mesh(g, mat)); }
  function arm(s) {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.46, 0); hips.add(sh);
    sh.add(limb(0.2, 0.065, 0.055, shirt));
    const el = new THREE.Group(); el.position.y = -0.2; sh.add(el);
    el.add(limb(0.17, 0.05, 0.042, skin));
    el.add(mesh(new THREE.TorusGeometry(0.052, 0.018, 8, 16), shirt, { pos: [0, -0.01, 0], rot: [Math.PI / 2, 0, 0] })); // cuff
    const hand = ol(mesh(new THREE.SphereGeometry(0.062, 16, 12), skin, { pos: [0, -0.21, 0], scale: [0.85, 1.05, 0.75] })); // mitten
    el.add(hand);
    sh.rotation.z = s * 0.12;
    return { sh, el, hand };
  }
  function leg(s) {
    const hp = new THREE.Group(); hp.position.set(s * 0.1, 0, 0); hips.add(hp);
    hp.add(limb(0.32, 0.085, 0.07, pants));
    const kn = new THREE.Group(); kn.position.y = -0.32; hp.add(kn);
    kn.add(limb(0.27, 0.068, 0.058, pants));
    const foot = ol(mesh(new THREE.CapsuleGeometry(0.06, 0.1, 4, 10), shoe, { pos: [0, -0.28, 0.05], rot: [Math.PI / 2, 0, 0] }));
    kn.add(foot);
    return { hp, kn, foot };
  }
  const A = { L: arm(1), R: arm(-1) }, L = { L: leg(1), R: leg(-1) };
  root.scale.setScalar(o.height ? o.height / 1.55 : 1);
  const c = { root, hips, torso, neck, head, eyes, mouth, arm: A, leg: L };
  // pose: call once per frame with everything that matters at time t
  c.pose = ({ walk = 0, phase = 0, yaw = 0, headYaw = 0, headTilt = 0, blinkT = null, wave = 0, waveT = 0, armsUp = 0, bounce = 0, smile = 1 } = {}) => {
    const s = Math.sin(phase * TAU), s2 = Math.sin(phase * TAU * 2);
    root.rotation.y = yaw;
    hips.position.y = 0.62 + Math.abs(s) * 0.03 * walk + bounce;
    hips.rotation.z = s * 0.04 * walk;
    for (const [k, sg] of [['L', 1], ['R', -1]]) {
      L[k].hp.rotation.x = sg * s * 0.55 * walk;
      L[k].kn.rotation.x = Math.max(0, -sg * Math.cos(phase * TAU) * 0.8) * walk;
      A[k].sh.rotation.x = -sg * s * 0.5 * walk - armsUp * 2.6;
      A[k].sh.rotation.z = (k === 'L' ? 1 : -1) * (0.12 + armsUp * 0.25);
      A[k].el.rotation.x = -0.25 * walk - 0.3 * armsUp;
    }
    if (wave > 0) { // right hand waves
      A.R.sh.rotation.z = -lerp(0.12, 2.5, wave); A.R.sh.rotation.x = 0;
      A.R.el.rotation.z = -Math.sin(waveT * 14) * 0.45 * wave; A.R.el.rotation.x = 0;
    } else A.R.el.rotation.z = 0;
    neck.rotation.set(headTilt + s2 * 0.02 * walk, headYaw, 0);
    const blink = blinkT === null ? 1 : (Math.abs(((blinkT % 3.7) + 3.7) % 3.7 - 0.1) < 0.07 ? 0.1 : 1);
    eyes.forEach(e => (e.scale.y = blink));
    mouth.scale.set(1, smile, 1);
  };
  c.pose({});
  return c;
}

// four-legged friend (puppy, fox, pony...): body, head, ears, tail, legs
export function makeCritter(o = {}) {
  const M = o.mat || toon;
  const fur = M(o.fur || '#d9a05b'), belly = M(o.belly || '#f3dcb8'), dark = new THREE.MeshBasicMaterial({ color: '#1d1820' });
  const ear = M(o.ear || o.fur2 || '#8a5a32'), white = M('#ffffff', 2);
  const ol = o.outline === false ? x => x : x => outline(x, 0.018);
  const root = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.36; root.add(body);
  const torso = ol(mesh(new THREE.CapsuleGeometry(0.17, 0.32, 6, 16), fur, { rot: [Math.PI / 2, 0, 0] })); body.add(torso);
  body.add(mesh(new THREE.SphereGeometry(0.15, 16, 12), belly, { pos: [0, -0.06, 0.12], scale: [0.9, 0.7, 1.3] }));
  const neck = new THREE.Group(); neck.position.set(0, 0.12, 0.26); body.add(neck);
  const head = ol(mesh(new THREE.SphereGeometry(0.16, 20, 16), fur, { pos: [0, 0.1, 0.04] })); neck.add(head);
  head.add(ol(mesh(new THREE.SphereGeometry(0.08, 14, 10), belly, { pos: [0, -0.04, 0.13], scale: [1, 0.8, 1.1] })));
  head.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), dark, { pos: [0, -0.01, 0.215] })); // nose
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.035, 12, 10), white, { pos: [s * 0.065, 0.04, 0.125], shadow: false });
    e.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), dark, { pos: [0, 0, 0.02], shadow: false })); head.add(e);
  }
  const ears = [-1, 1].map(s => {
    const p = new THREE.Group(); p.position.set(s * 0.11, 0.1, -0.01); head.add(p);
    const g = new THREE.SphereGeometry(0.06, 12, 10); g.translate(0, -0.06, 0);
    p.add(ol(mesh(g, ear, { scale: [0.6, 1.4, 0.35] }))); p.rotation.z = s * 0.4; return p;
  });
  const tail = new THREE.Group(); tail.position.set(0, 0.06, -0.3); body.add(tail);
  const tg = new THREE.CapsuleGeometry(0.035, 0.16, 4, 8); tg.translate(0, 0.1, 0);
  tail.add(ol(mesh(tg, fur))); tail.rotation.x = -0.6;
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
    const p = new THREE.Group(); p.position.set(sx * 0.1, -0.08, sz * 0.17); body.add(p);
    const g = new THREE.CapsuleGeometry(0.045, 0.16, 4, 8); g.translate(0, -0.12, 0);
    p.add(ol(mesh(g, fur))); return p;
  });
  root.scale.setScalar(o.size || 1);
  const c = { root, body, neck, head, ears, tail, legs };
  c.pose = ({ trot = 0, phase = 0, yaw = 0, wag = 0, t = 0, headYaw = 0, headTilt = 0, hop = 0, sit = 0 } = {}) => {
    const s = Math.sin(phase * TAU);
    root.rotation.y = yaw;
    body.position.y = 0.36 + Math.abs(Math.cos(phase * TAU)) * 0.04 * trot + hop - sit * 0.1;
    body.rotation.x = -sit * 0.5;
    legs.forEach((l, i) => { const diag = i === 0 || i === 3 ? 1 : -1; l.rotation.x = diag * s * 0.7 * trot + (i >= 2 ? sit * 1.2 : 0); });
    tail.rotation.z = Math.sin(t * 18) * 0.6 * wag;
    neck.rotation.set(headTilt + sit * 0.4, headYaw, 0);
    ears.forEach((e, i) => (e.rotation.x = Math.sin(phase * TAU + i) * 0.25 * trot));
  };
  c.pose({});
  return c;
}

// walking along a path: returns position + heading at progress p (0..1)
export function onPath(points, p) {
  const curve = points.isCurve ? points : new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v)));
  const q = clamp(p, 0, 1), pos = curve.getPointAt(q), tan = curve.getTangentAt(q);
  return { pos, yaw: Math.atan2(tan.x, tan.z), length: curve.getLength(), curve };
}

// ---------------------------------------------------------------- design sheet
// Model sheet for the planning step: each item gets a row of turnaround views (front, three-quarter, side)
// on a neutral backdrop, with its name and a short note. items: [{ name, note, make: () => Object3D, pose?(obj), views?, float? }]
export function renderDesignSheet(stage, items, o = {}) {
  const views = o.views || [['front', 0], ['three-quarter', -0.75], ['side', -Math.PI / 2]];
  const cw = 640, ch = 480, head = 78, pad = 24, cols = views.length;
  const sheet = document.createElement('canvas');
  sheet.width = cw * cols + pad * 2; sheet.height = pad * 2 + items.length * (ch + head) + 70;
  const g = sheet.getContext('2d');
  g.fillStyle = o.paper || '#faf7f0'; g.fillRect(0, 0, sheet.width, sheet.height);
  g.fillStyle = '#2a2230'; g.font = '600 46px Title, Georgia, serif'; g.textBaseline = 'middle';
  g.fillText(o.title || 'Design sheet', pad, pad + 26);
  const scene = new THREE.Scene();
  skyGradient(scene, o.backdrop || [[0, '#e9edf2'], [1, '#f4efe4']]);
  sunlight(scene, { dir: [-4, 8, 7], area: 6, ambient: 1.5, intensity: 2.6, ...(o.light || {}) });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const cam = new THREE.PerspectiveCamera(30, stage.W / stage.H, 0.01, 500);
  const box = new THREE.Box3(), sph = new THREE.Sphere(), c = new THREE.Vector3();
  items.forEach((it, row) => {
    const obj = it.make(); it.pose && it.pose(obj);
    const holder = new THREE.Group(); holder.add(obj); scene.add(holder);
    holder.updateMatrixWorld(true); box.setFromObject(obj);
    box.getCenter(c); holder.position.set(-c.x, it.float ? -c.y + 0.6 : -box.min.y, -c.z);
    holder.updateMatrixWorld(true); box.setFromObject(obj); box.getBoundingSphere(sph);
    const y0 = pad + 70 + row * (ch + head);
    g.fillStyle = '#2a2230'; g.font = '600 38px Title, Georgia, serif'; g.fillText(it.name, pad, y0 + 30);
    if (it.note) { g.fillStyle = '#6b6470'; g.font = '24px system-ui, sans-serif'; g.fillText(it.note, pad, y0 + 64); }
    views.forEach(([label, yaw], col) => {
      const dist = sph.radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2)) * 0.85 * (it.zoom ? 1 / it.zoom : 1);
      const el = 0.12;
      cam.position.set(sph.center.x + Math.sin(yaw) * Math.cos(el) * dist, sph.center.y + Math.sin(el) * dist, sph.center.z + Math.cos(yaw) * Math.cos(el) * dist);
      cam.lookAt(sph.center); cam.updateProjectionMatrix();
      stage.renderer.render(scene, cam);
      const sw = stage.H * cw / ch, sx = (stage.W - sw) / 2, x = pad + col * cw, y = y0 + head;
      g.drawImage(stage.renderer.domElement, sx, 0, sw, stage.H, x + 4, y, cw - 8, ch - 8);
      g.fillStyle = 'rgba(42,34,48,0.55)'; g.font = '20px system-ui, sans-serif'; g.fillText(label, x + 16, y + 24);
    });
    scene.remove(holder);
  });
  return sheet;
}

// ---------------------------------------------------------------- page hooks + player
// window.renderAt(t) draws one frame; window.VIDEO describes the film; window.__ready is set when fonts are in.
export async function boot(film, stage, story = {}) {
  window.renderAt = film.renderAt;
  window.renderDesign = () => renderDesignSheet(stage, story.design || [], { title: story.designTitle }).toDataURL('image/png');
  window.VIDEO = VIDEO;
  try { await document.fonts.ready; await document.fonts.load('600 40px Title'); } catch (e) {}
  film.renderAt(0);
  window.__ready = true;
  if (navigator.webdriver || Q.has('render')) return; // the renderer drives frames
  if (Q.has('t')) { film.renderAt(+Q.get('t')); return; }
  if (Q.has('design')) { // show the design sheet in the page
    const img = new Image(); img.src = window.renderDesign();
    img.style.cssText = 'display:block;max-width:100%;margin:0 auto';
    document.body.style.overflow = 'auto'; document.body.replaceChildren(img); return;
  }
  startPlayer(film);
}

function startPlayer(film) {
  const ui = document.getElementById('ui'), audio = document.getElementById('snd');
  let playing = false, t0 = 0, base = 0, t = 0;
  const D = VIDEO.duration;
  const label = () => (ui.textContent = `${t.toFixed(1)} / ${D.toFixed(1)}s   ${playing ? 'space: pause' : 'space or click: play'}   ←/→: 1s`);
  const play = () => { playing = true; base = t >= D - 0.05 ? 0 : t; t0 = performance.now(); if (audio) { audio.currentTime = base; audio.play().catch(() => {}); } };
  const pause = () => { playing = false; if (audio) audio.pause(); };
  const seek = v => { t = clamp(v, 0, D - 0.01); if (playing) play(); else film.renderAt(t); label(); };
  document.getElementById('c').addEventListener('click', () => (playing ? pause() : play()));
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.code === 'ArrowRight') seek(t + 1);
    if (e.code === 'ArrowLeft') seek(t - 1);
  });
  (function loop() {
    if (playing) {
      t = audio && !audio.paused ? audio.currentTime : base + (performance.now() - t0) / 1000;
      if (t >= D) { t = D - 0.01; pause(); }
      film.renderAt(t);
    }
    label();
    requestAnimationFrame(loop);
  })();
}
