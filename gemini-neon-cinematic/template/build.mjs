// Join src/*.js (in file-name order) into ONE self-contained HTML file that plays with sound.
// usage: node build.mjs [out.html]      (default: build/<slug>.html, slug from beats.json title)
// Puts src/beats.json in front as `const B = {...}`, and embeds build/audio.wav (as AAC) when present.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { execFileSync } from 'child_process';

const beatsText = readFileSync('src/beats.json', 'utf8'), beats = JSON.parse(beatsText);
const slug = (beats.title || 'animation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const out = process.argv[2] || `build/${slug}.html`;
mkdirSync('build', { recursive: true });

const files = readdirSync('src').filter(f => f.endsWith('.js')).sort();
const js = (`'use strict';\nconst B = ${beatsText.trim()};\n` + files.map(f => `// ===== ${f}\n` + readFileSync(`src/${f}`, 'utf8').replace(/^'use strict';\s*/, '')).join('\n'))
  .replace(/<\/script/gi, '<\\/script');

let audio = '';
if (existsSync('build/audio.wav')) {
  const m4a = 'build/audio.m4a';
  if (!existsSync(m4a) || statSync(m4a).mtimeMs < statSync('build/audio.wav').mtimeMs) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'build/audio.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', m4a]);
  }
  audio = `<audio id="snd" preload="auto" src="data:audio/mp4;base64,${readFileSync(m4a).toString('base64')}"></audio>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${beats.title || 'Animation'}</title>
<style>html,body{margin:0;height:100%;background:#07060a;overflow:hidden}
canvas{display:block;width:100vw;height:100vh;object-fit:contain;cursor:pointer}
#ui{position:fixed;left:12px;bottom:10px;font:12px/1.4 system-ui,sans-serif;color:#bbb;text-shadow:0 1px 2px #000;user-select:none}</style></head>
<body><canvas id="c" width="1920" height="1080"></canvas><div id="ui"></div>${audio}
<script>${js}</script></body></html>`;
writeFileSync(out, html);
console.log(`built ${out}  ${(html.length / 1024).toFixed(0)} KB  (${files.join(', ')})${audio ? '  (with sound)' : '  (no build/audio.wav yet, silent)'}`);
