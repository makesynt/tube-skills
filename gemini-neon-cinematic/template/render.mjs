// Render the built HTML to MP4 with parallel headless Chromium workers, then add sound and review sheets.
//   node render.mjs                         full render -> build/<slug>.mp4 (+ build/review/contact-*.jpg)
//   node render.mjs --stills 1,4.5,9        quick PNG stills -> build/stills/ + build/stills/sheet.jpg
//   node render.mjs --design                 design sheet of the cast / key elements -> build/design/design-sheet*.png
//   options: --html build/x.html --out build/x.mp4 --workers 4 --scale 0.5 (draft) | 2 (4K) --from 3 --to 8 --no-audio
import { createRequire } from 'module';
import { spawn, execFileSync } from 'child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { pathToFileURL } from 'url';
import os from 'os';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i < 0 ? d : A[i + 1]; }, flag = k => A.includes('--' + k);

const beats = JSON.parse(readFileSync('src/beats.json', 'utf8'));
const slug = (beats.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const html = resolve(arg('html', `build/${slug}.html`));
const scale = +arg('scale', 1);
const workers = +arg('workers', Math.max(1, Math.min(4, os.cpus().length - 1)));
// 2D canvas needs no special GPU flags; set CINEMATIC_CHROME_ARGS to pass extra Chromium flags if needed.
const GL = process.env.CINEMATIC_CHROME_ARGS ? process.env.CINEMATIC_CHROME_ARGS.split(' ') : [];
const url = `${pathToFileURL(html).href}?render=1&scale=${scale}`;

async function openPage() {
  const b = await chromium.launch({ args: GL });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGE ERROR', e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text()); });
  await p.goto(url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return { b, p };
}
const grab = (p, t, type = 'image/jpeg') => p.evaluate(([t, type]) => { renderAt(t); return document.getElementById('c').toDataURL(type, 0.94); }, [t, type])
  .then(d => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));

if (A.includes('--design')) { // planning step: character / key-element sheet
  const dir = 'build/design'; mkdirSync(dir, { recursive: true });
  const { b, p } = await openPage();
  const n = await p.evaluate(() => window.renderDesign && 1);
  if (!n) { console.log('no design sheet: define window.renderDesign in src/90_design.js'); process.exit(1); }
  const d = await p.evaluate(() => window.renderDesign());
  const file = join(dir, `design-sheet${existsSync(join(dir, 'design-sheet.png')) ? '-' + Date.now().toString(36) : ''}.png`);
  writeFileSync(file, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
  await b.close(); console.log(`design sheet -> ${file}`); process.exit(0);
}

if (A.includes('--stills')) {
  const times = arg('stills', '0').split(',').map(Number);
  const dir = 'build/stills'; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const { b, p } = await openPage();
  for (const [i, t] of times.entries()) { writeFileSync(join(dir, `s${String(i).padStart(2, '0')}.png`), await grab(p, t, 'image/png')); }
  await b.close();
  const cols = Math.min(4, times.length);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${dir}/s%02d.png`, '-vf', `scale=640:-1,tile=${cols}x${Math.ceil(times.length / cols)}:padding=6:color=white`, '-frames:v', '1', `${dir}/sheet.jpg`]);
  console.log(`stills -> ${dir}/ (sheet.jpg is ${cols} across, in the order given)`);
  process.exit(0);
}

const { p: probe, b: pb } = await openPage();
const V = await probe.evaluate(() => window.VIDEO);
await pb.close();
const fps = V.fps, f0 = Math.round(+arg('from', 0) * fps), f1 = Math.round(+arg('to', V.duration) * fps);
const out = resolve(arg('out', `build/${slug}${scale !== 1 ? `-x${scale}` : ''}.mp4`));
const tmp = 'build/segments'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
console.log(`rendering ${f1 - f0} frames (${((f1 - f0) / fps).toFixed(1)} s) at ${V.width * scale}x${V.height * scale}, ${fps} fps, ${workers} workers`);
const T0 = Date.now(); let done = 0;

async function worker(w, a, z) {
  const segFile = join(tmp, `seg${w}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(fps), segFile]);
  ff.stderr.on('data', d => process.stderr.write(d));
  const { b, p } = await openPage();
  for (let f = a; f < z; f++) {
    const buf = await grab(p, f / fps);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (++done % (fps * 5) === 0) { const s = (Date.now() - T0) / 1000; console.log(`  ${done}/${f1 - f0} frames, ${s.toFixed(0)} s, ~${(s / done * (f1 - f0 - done)).toFixed(0)} s left`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  return segFile;
}
const n = f1 - f0, per = Math.ceil(n / workers), jobs = [];
for (let w = 0; w < workers; w++) { const a = f0 + w * per, z = Math.min(f1, a + per); if (a < z) jobs.push(worker(w, a, z)); }
const segs = await Promise.all(jobs);
writeFileSync(join(tmp, 'list.txt'), segs.map(s => `file '${resolve(s).replace(/\\/g, '/')}'`).join('\n'));
const silent = join(tmp, 'video.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', silent]);

if (existsSync('build/audio.wav') && !flag('no-audio')) {
  const ss = (f0 / fps).toFixed(3), dur = (n / fps).toFixed(3);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', ss, '-t', dur, '-i', 'build/audio.wav',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
} else execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-c', 'copy', '-movflags', '+faststart', out]);
rmSync(tmp, { recursive: true, force: true });

// review sheets: one tile per second, 6 across, 5 rows = 30 s per sheet
const rev = 'build/review'; rmSync(rev, { recursive: true, force: true }); mkdirSync(rev, { recursive: true });
const rows = Math.max(1, Math.min(5, Math.ceil(n / fps / 6)));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-vf', `fps=1,scale=480:-1,tile=6x${rows}:padding=4:color=white`, `${rev}/contact-%02d.jpg`]);
console.log(`done in ${((Date.now() - T0) / 1000).toFixed(0)} s -> ${out}`);
console.log(`review sheets -> ${rev}/ (${readdirSync(rev).length} sheet(s), tile n = second n of the clip, left to right, top to bottom)`);
