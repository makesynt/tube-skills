// Bundle src/beats.json + assets/archive/* + src/*.js + build/audio.wav into ONE standalone playable HTML file.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { extname, join } from 'path';
import { execFileSync } from 'child_process';

const beatsText = readFileSync('src/beats.json', 'utf8');
const beats = JSON.parse(beatsText);
const slug = (beats.slug || beats.title || 'documentary')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '') || 'documentary';
const out = process.argv[2] || `build/${slug}.html`;
mkdirSync('build', { recursive: true });

const archiveMap = {};
if (existsSync('assets/archive')) {
  for (const f of readdirSync('assets/archive').sort()) {
    const ext = extname(f).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : '';
    if (!mime) continue;
    const b64 = readFileSync(join('assets/archive', f)).toString('base64');
    archiveMap[f] = `data:${mime};base64,${b64}`;
  }
}

const archiveImgTags = Object.entries(archiveMap)
  .map(([name, uri]) => `<img data-archive-name="${name}" src="${uri}" alt="" style="position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none" />`)
  .join('\n');

const files = readdirSync('src').filter(f => f.endsWith('.js')).sort();
const js = (
  `'use strict';\nconst B = ${beatsText.trim()};\nconst ARCHIVE_URLS = {};\n` +
  files.map(f => `// ===== ${f}\n` + readFileSync(`src/${f}`, 'utf8').replace(/^'use strict';\s*/, '')).join('\n')
).replace(/<\/script/gi, '<\\/script');

let audioTag = '';
if (existsSync('build/audio.wav')) {
  const m4a = 'build/audio.m4a';
  if (!existsSync(m4a) || statSync(m4a).mtimeMs < statSync('build/audio.wav').mtimeMs) {
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', 'build/audio.wav',
      '-af', 'loudnorm=I=-14:TP=-1.0:LRA=9', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', m4a
    ]);
  }
  audioTag = `<audio id="snd" preload="auto" src="data:audio/mp4;base64,${readFileSync(m4a).toString('base64')}"></audio>`;
}

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${beats.title || 'Documentary'}</title>
<style>
  html,body{margin:0;height:100%;background:#07090d;overflow:hidden;font-family:"HarmonyOS Sans SC","Microsoft YaHei","PingFang SC",Georgia,serif}
  canvas{display:block;width:100vw;height:100vh;object-fit:contain;cursor:pointer}
  #ui{position:fixed;left:14px;bottom:10px;font:12px/1.4 ui-monospace,Consolas,monospace;color:rgba(235,228,212,0.75);text-shadow:0 1px 3px #000;user-select:none;pointer-events:none}
</style></head>
<body>${archiveImgTags}<canvas id="c" width="1920" height="1080"></canvas><div id="ui"></div>${audioTag}
<script>${js}</script></body></html>`;

writeFileSync(out, html);
console.log(`built ${out}  ${(html.length / 1024).toFixed(0)} KB  (${Object.keys(archiveMap).length} archival plates, ${files.length} scripts)${audioTag ? '  [with -14 LUFS sound]' : '  [silent preview]'}`);
