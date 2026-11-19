// Parallel headless Chromium frame renderer + NVENC/x264 encoder + Contact-Sheet QA generator.
//   node render.mjs                           -> build/<slug>.mp4 + build/review/contact-*.jpg
//   node render.mjs --stills 2,8,15,24        -> build/stills/sheet.jpg (multi-frame process QA)
import { createRequire } from 'module';
import { spawn, execFileSync } from 'child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { pathToFileURL } from 'url';
import os from 'os';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const A = process.argv.slice(2);
const arg = (k, d) => { const i = A.indexOf('--' + k); return i < 0 ? d : A[i + 1]; };
const flag = k => A.includes('--' + k);

const beats = JSON.parse(readFileSync('src/beats.json', 'utf8'));
const slug = (beats.slug || beats.title || 'documentary').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'documentary';
const html = resolve(arg('html', `build/${slug}.html`));
const scale = +arg('scale', 1);
const workers = +arg('workers', Math.max(1, Math.min(6, os.cpus().length - 2)));
const url = `${pathToFileURL(html).href}?render=1&scale=${scale}`;

function hasNvenc() {
  try {
    const out = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    return out.includes('h264_nvenc');
  } catch {
    return false;
  }
}
const USE_NVENC = !flag('cpu') && hasNvenc();

async function openPage() {
  const b = await chromium.launch({ args: ['--disable-gpu-vsync', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return { b, p };
}

const grab = (p, t, type = 'image/jpeg') =>
  p.evaluate(([t, type]) => { window.renderAt(t); return document.getElementById('c').toDataURL(type, 0.94); }, [t, type])
   .then(d => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));

if (A.includes('--stills')) {
  const times = arg('stills', '0').split(',').map(Number);
  const dir = 'build/stills';
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const { b, p } = await openPage();
  for (const [i, t] of times.entries()) {
    writeFileSync(join(dir, `s${String(i).padStart(2, '0')}.png`), await grab(p, t, 'image/png'));
  }
  await b.close();
  const cols = Math.min(4, times.length);
  const rows = Math.ceil(times.length / cols);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', `${dir}/s%02d.png`,
    '-vf', `scale=640:-1,tile=${cols}x${rows}:padding=6:color=0x14161a`,
    '-frames:v', '1', `${dir}/sheet.jpg`
  ]);
  console.log(`stills -> ${dir}/sheet.jpg (${times.length} frames, ${cols}x${rows})`);
  process.exit(0);
}

const { b: pb, p: probe } = await openPage();
const V = await probe.evaluate(() => window.VIDEO);
await pb.close();

const fps = V.fps;
const f0 = Math.round(+arg('from', 0) * fps);
const f1 = Math.round(+arg('to', V.duration) * fps);
const out = resolve(arg('out', `build/${slug}.mp4`));
const tmp = 'build/segments';
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

console.log(`rendering ${f1 - f0} frames (${((f1 - f0) / fps).toFixed(2)}s) @ ${V.width * scale}x${V.height * scale} ${fps}fps | ${workers} workers | encoder=${USE_NVENC ? 'h264_nvenc' : 'libx264'}`);
const T0 = Date.now();
let done = 0;

async function worker(w, a, z) {
  const segFile = join(tmp, `seg${w}.mp4`);
  const vCodec = USE_NVENC
    ? ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '19', '-g', '15', '-bf', '0']
    : ['-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-g', '15', '-bf', '0'];
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...vCodec, '-pix_fmt', 'yuv420p', '-r', String(fps), segFile
  ]);
  ff.stderr.on('data', d => process.stderr.write(d));
  const { b, p } = await openPage();
  for (let f = a; f < z; f++) {
    const buf = await grab(p, f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % (fps * 5) === 0) {
      const elapsed = (Date.now() - T0) / 1000;
      console.log(`  ${done}/${f1 - f0} frames (${elapsed.toFixed(1)}s)`);
    }
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
  return segFile;
}

const n = f1 - f0;
const per = Math.ceil(n / workers);
const jobs = [];
for (let w = 0; w < workers; w++) {
  const a = f0 + w * per, z = Math.min(f1, a + per);
  if (a < z) jobs.push(worker(w, a, z));
}
const segs = await Promise.all(jobs);
writeFileSync(join(tmp, 'list.txt'), segs.map(s => `file '${resolve(s).replace(/\\/g, '/')}'`).join('\n'));
const silent = join(tmp, 'video.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', silent]);

if (existsSync('build/audio.wav') && !flag('no-audio')) {
  const ss = (f0 / fps).toFixed(3), dur = (n / fps).toFixed(3);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', silent, '-ss', ss, '-t', dur, '-i', 'build/audio.wav',
    '-af', 'loudnorm=I=-14:TP=-1.0:LRA=9', '-ar', '48000', '-ac', '2',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out
  ]);
} else {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-c', 'copy', '-movflags', '+faststart', out]);
}
rmSync(tmp, { recursive: true, force: true });

const rev = 'build/review';
rmSync(rev, { recursive: true, force: true });
mkdirSync(rev, { recursive: true });
const step = Math.max(1, (n / fps) / 16);
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-i', out,
  '-vf', `fps=1/${step.toFixed(4)},scale=480:270,tile=4x4:padding=4:color=0x14161a`,
  '-frames:v', '1', `${rev}/contact-16grid.jpg`
]);
console.log(`done in ${((Date.now() - T0) / 1000).toFixed(1)}s -> ${out}`);
console.log(`16-frame contact sheet -> ${rev}/contact-16grid.jpg`);
