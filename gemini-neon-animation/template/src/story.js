// Example story: a kid, a puppy and a ball (12 s). Replace all of this for a new video.
// Pattern: the WORLD runs on global time t (so cuts stay continuous), CAMERAS run on shot-local time.
import { THREE, toon, mesh, sunlight, skyGradient, scatter, tree, rock, cloud, grass, makeCharacter, makeCritter,
  keys, seg, ease, lerp, clamp, wobble, title } from './kit.js';

export function buildStory(stage, B) {
  const cue = B.cues;

  // ------------------------------------------------ set: the meadow
  const scene = new THREE.Scene();
  skyGradient(scene, [[0, '#7fb6e8'], [0.55, '#cfe6f2'], [1, '#f6e7c8']]);
  scene.fog = new THREE.Fog('#e9eadb', 18, 55);
  sunlight(scene, { sun: '#fff0d2', sky: '#cfe3ff', ground: '#7d9a52', intensity: 2.8, ambient: 1.3, dir: [-6, 9, 6], area: 12 });
  const ground = mesh(new THREE.CircleGeometry(60, 64), toon('#8cc263', 3), { rot: [-Math.PI / 2, 0, 0] });
  scene.add(ground);
  const path = mesh(new THREE.PlaneGeometry(14, 1.3), toon('#e2c98f', 3), { pos: [0, 0.005, 0], rot: [-Math.PI / 2, 0, 0] });
  scene.add(path);
  scene.add(scatter(3, 26, r => tree(r), [-22, 22], [-22, -6]));
  scene.add(scatter(5, 10, r => tree(r, { h: 1.8 }), [-22, 22], [6, 14], (x) => Math.abs(x) < 6));
  scene.add(scatter(9, 14, r => rock(r, { size: lerp(0.15, 0.4, r()) }), [-10, 10], [-5, 5], (x, z) => Math.abs(z) < 1.2));
  const blades = grass(4, 5000, [-12, 12], [-6, 6]); scene.add(blades);
  const clouds = scatter(8, 6, r => cloud(r, { scale: lerp(1, 1.8, r()) }), [-30, 30], [-40, -30]);
  clouds.position.y = 12; scene.add(clouds);

  // cast: one factory per character or key object, used by the film AND the design sheet
  const cast = {
    kid: () => makeCharacter({ shirt: '#e4572e', pants: '#35508a', hair: '#5a3825', skin: '#f0c19a' }),
    pup: () => makeCritter({ fur: '#d9a05b', belly: '#f6e2c0', ear: '#9a6235', size: 1.05 }),
    ball: () => mesh(new THREE.SphereGeometry(0.09, 20, 16), toon('#ffd23f', 3)),
  };
  const kid = cast.kid(), pup = cast.pup(), ball = cast.ball();
  scene.add(kid.root, pup.root, ball);

  // ------------------------------------------------ the world over global time
  const walkEnd = cue['throw'] - 0.9;               // kid walks in and stops before the throw
  const kidX = t => keys(t, [[cue['walk-start'], -5], [walkEnd, -0.6, 'out']]);
  const throwT = cue['throw'], landT = cue['ball-lands'], catchT = cue['catch'];
  const landAt = [4.6, 0, -1.2];
  function world(t) {
    blades.sway(t);
    clouds.position.x = t * 0.25;
    // kid: walk, stop, wind-up + throw, then wave at the end
    const x = kidX(t), walking = t < walkEnd ? 1 - seg(t, walkEnd - 0.4, walkEnd) : 0;
    kid.root.position.set(x, 0, 0.2);
    const throwK = seg(t, throwT - 0.5, throwT) * (1 - seg(t, throwT + 0.25, throwT + 0.9));
    const waveK = seg(t, catchT + 0.6, catchT + 1.0);
    kid.pose({ walk: walking, phase: (x + 5) / 0.95, yaw: lerp(Math.PI / 2, Math.PI / 2.6, seg(t, walkEnd - 0.3, walkEnd + 0.4)),
      headYaw: lerp(0, 0.5, seg(t, throwT, landT)), blinkT: t, wave: Math.max(throwK, waveK), waveT: t, bounce: 0.04 * ease.arc(seg(t, throwT - 0.1, throwT + 0.3)) });
    // ball: in hand, arcs out, bounces, rolls, then in pup's mouth
    const hand = new THREE.Vector3(); kid.arm.R.hand.getWorldPosition(hand);
    if (t < throwT) ball.position.copy(hand);
    else if (t < landT) {
      const p = seg(t, throwT, landT);
      ball.position.set(lerp(hand.x, landAt[0], p), lerp(1.1, 0.09, p) + Math.sin(Math.PI * p) * 2.2, lerp(0.3, landAt[2], p));
    } else if (t < catchT) {
      const p = seg(t, landT, catchT);
      ball.position.set(landAt[0] + ease.out(p) * 0.9, 0.09 + Math.abs(Math.sin(p * 9)) * 0.5 * Math.pow(1 - p, 2), landAt[2] + ease.out(p) * 0.2);
    }
    // pup: trots beside the kid, sprints after the ball, catches it, sits wagging
    const pupStartRun = throwT + 0.25;
    const besideX = kidX(t) + 0.9;
    let px, pz, yaw, trot, phase, hop = 0, sit = 0;
    const catchPos = [landAt[0] + 0.9, landAt[2] + 0.2];
    if (t < pupStartRun) { px = besideX; pz = 0.9; yaw = Math.PI / 2; trot = t < walkEnd ? 1 : 0; phase = (px + 5) / 0.55; }
    else if (t < catchT) {
      const p = ease.io(seg(t, pupStartRun, catchT));
      px = lerp(-0.6 + 0.9, catchPos[0] - 0.25, p); pz = lerp(0.9, catchPos[1] + 0.1, p);
      yaw = Math.atan2(catchPos[0] - (-0.3), catchPos[1] - 0.9); trot = 1; phase = (t - pupStartRun) * 3.2;
    } else {
      px = catchPos[0] - 0.25; pz = catchPos[1] + 0.1; trot = 0; phase = 0;
      yaw = lerp(Math.atan2(catchPos[0] + 0.3, catchPos[1] - 0.9), -0.35, ease.io(seg(t, catchT + 0.3, catchT + 1.2)));
      hop = 0.22 * ease.arc(seg(t, catchT - 0.15, catchT + 0.35));
      sit = ease.out(seg(t, catchT + 1.2, catchT + 1.7));
    }
    pup.root.position.set(px, 0, pz);
    pup.pose({ trot, phase, yaw, t, wag: t > catchT ? 1 : 0.4, hop, sit, headTilt: t > catchT + 1.8 ? Math.sin(t * 2) * 0.15 : 0 });
    if (t >= catchT) { const m = new THREE.Vector3(0, -0.05, 0.2); pup.head.localToWorld(m); ball.position.copy(m); }
  }
  const sets = { meadow: { scene, update: t => world(t) } };

  // ------------------------------------------------ shots (camera on local time)
  const handheld = (l, a = 0.04) => [wobble(l * 0.7, 1) * a, wobble(l * 0.6, 2) * a, 0];
  const shots = [
    { set: 'meadow', dur: 4, cam: (l, p) => { const h = handheld(l);
      return { pos: [lerp(-1, 0.5, ease.io(p)) + h[0], 2.1 + h[1], lerp(10, 8.5, ease.io(p))], look: [-1.5 + p * 1.2, 0.8, 0], fov: 32 }; } },
    { set: 'meadow', dur: 4, in: { type: 'dissolve', dur: 0.6 }, cam: (l, p) => { const h = handheld(l, 0.03);
      return { pos: [-2.4 + h[0], 1.3 + h[1], 3.4], look: [lerp(-0.6, 2.4, ease.io(seg(p, 0.25, 0.75))), lerp(1.0, 1.4, ease.arc(seg(p, 0.27, 0.62))), -0.4], fov: 38 }; } },
    { set: 'meadow', dur: 4, in: { type: 'whip', dur: 0.35, dir: 1 }, cam: (l, p) => { const h = handheld(l, 0.025);
      return { pos: [lerp(7.2, 6.9, p) + h[0], 0.75 + h[1], lerp(1.9, 1.6, p)], look: [5.1, 0.35, -1.0], fov: 34 }; } },
  ];

  function overlay(g, t) {
    title(g, t, 'Playtime', { at: cue['title'], dur: B.duration - cue['title'] + 1, y: 0.17, size: 180 });
  }
  // design sheet for the planning step (node render.mjs --design)
  const design = [
    { name: 'The kid', note: 'Main character. Red tee, denim, brown hair.', make: () => cast.kid().root },
    { name: 'The puppy', note: 'The puppy. Caramel coat, cream belly, floppy ears.', make: () => { const c = cast.pup(); c.pose({ wag: 1, t: 0.05 }); return c.root; } },
    { name: 'The ball', note: 'Key object. Yellow, fits in the puppy\'s mouth.', make: () => cast.ball(), float: true, zoom: 0.6 },
  ];
  return { sets, shots, overlay, design, designTitle: B.title + ': cast', finish: { grain: 0.06, vignette: 0.35, fadeIn: 0.5, fadeOut: 0.8 } };
}
