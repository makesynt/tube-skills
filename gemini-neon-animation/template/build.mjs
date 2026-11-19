// Bundle src/ (rendering library included) into ONE self-contained HTML file that plays with sound.
// usage: node build.mjs [out.html]      (default: build/<slug>.html, slug from beats.json title)
// Embeds src/assets/title.woff2 as the 'Title' font and build/audio.wav (as AAC) when present.
import { build } from 'esbuild';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { execFileSync } from 'child_process';

const beats = JSON.parse(readFileSync('src/beats.json', 'utf8'));
const slug = (beats.title || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const out = process.argv[2] || `build/${slug}.html`;
mkdirSync('build', { recursive: true });

const res = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', loader: { '.json': 'json' }, logLevel: 'warning' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let font = '';
if (existsSync('src/assets/title.woff2')) {
  font = `@font-face{font-family:'Title';font-weight:100 900;src:url(data:font/woff2;base64,${readFileSync('src/assets/title.woff2').toString('base64')}) format('woff2')}`;
}
let audio = '';
if (existsSync('build/audio.wav')) {
  const m4a = 'build/audio.m4a';
  if (!existsSync(m4a) || statSync(m4a).mtimeMs < statSync('build/audio.wav').mtimeMs) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'build/audio.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', m4a]);
  }
  audio = `<audio id="snd" preload="auto" src="data:audio/mp4;base64,${readFileSync(m4a).toString('base64')}"></audio>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${beats.title || 'Video'}</title>
<style>${font}html,body{margin:0;height:100%;background:#0d0d10;overflow:hidden}
canvas{display:block;width:100vw;height:100vh;object-fit:contain;cursor:pointer}
#ui{position:fixed;left:12px;bottom:10px;font:12px/1.4 system-ui,sans-serif;color:#bbb;text-shadow:0 1px 2px #000;user-select:none}</style></head>
<body><canvas id="c" width="1920" height="1080"></canvas><div id="ui"></div>${audio}
<script>${js}</script></body></html>`;
writeFileSync(out, html);
console.log(`built ${out}  ${(html.length / 1024).toFixed(0)} KB${audio ? '  (with sound)' : '  (no build/audio.wav yet, silent)'}`);
