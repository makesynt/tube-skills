// ---------- timeline, finish and player ----------
// window.renderAt(t) draws the frame at time t. The renderer calls it in any order and in several browsers at once.
window.VIDEO = { width: W, height: H, fps: FPS, duration: DUR, scale: SC };
function renderAt(t) {
  const g = CTX; g.setTransform(SC, 0, 0, SC, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const i = SHOTS.findIndex(s => t >= s.t0 && t < s.t1), s = SHOTS[i < 0 ? SHOTS.length - 1 : i];
  if (!s) return;
  drawShot(g, s, t);
  // optional transition into this shot: { in: { type: 'dissolve' | 'dip', dur, color } }
  const tr = s.in, prev = SHOTS[i - 1];
  if (tr && prev && t < s.t0 + tr.dur) {
    const k = E.io2(seg(t, s.t0, s.t0 + tr.dur));
    if (tr.type === 'dip') { // previous fades to a color, new one fades up from it
      if (k < 0.5) { drawShot(g, prev, t); }
      g.setTransform(SC, 0, 0, SC, 0, 0); g.globalAlpha = 1 - Math.abs(k * 2 - 1); g.fillStyle = tr.color || '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    } else { // dissolve: previous shot (still running) fades out over the new one
      const buf = scratch(); const bg = buf.getContext('2d'); bg.setTransform(SC, 0, 0, SC, 0, 0); drawShot(bg, prev, t);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1 - k; g.drawImage(buf, 0, 0); g.globalAlpha = 1;
    }
  }
  g.setTransform(SC, 0, 0, SC, 0, 0);
  if (window.overlay) overlay(g, t);
  finish(g, t);
}
function drawShot(g, s, t) {
  if (!s.ready) { s.state = s.prep ? s.prep() : {}; s.ready = true; }
  g.save(); s.draw(g, t - s.t0, t, s.state); g.restore();
}
let SCR = null;
function scratch() { if (!SCR) SCR = mk(W * SC, H * SC); const c = SCR.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SCR.width, SCR.height); return SCR; }
// film finish: fixed paper tooth (never animated, so nothing flickers), gentle lens falloff, fade in and out
function finish(g, t) {
  g.setTransform(SC, 0, 0, SC, 0, 0); g.globalAlpha = 1;
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.16; g.fillStyle = g.createPattern(tooth(), 'repeat'); g.fillRect(0, 0, W, H); g.restore();
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 1.1);
  v.addColorStop(0, 'rgba(6,10,14,0)'); v.addColorStop(1, 'rgba(6,10,14,0.32)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const f = Math.min(seg(t, 0, B.fadeIn ?? 0.8), 1 - seg(t, DUR - (B.fadeOut ?? 1.5), DUR - 0.1));
  if (f < 1) { g.fillStyle = `rgba(0,0,0,${1 - f})`; g.fillRect(0, 0, W, H); }
}
window.renderAt = renderAt;
(function () {
  const q = new URLSearchParams(location.search), ui = document.getElementById('ui');
  const end = SHOTS.length ? SHOTS[SHOTS.length - 1].t1 : 0;
  if (Math.abs(end - DUR) > 1e-3) console.warn(`shots end at ${end} s but beats.json duration is ${DUR} s`);
  window.__ready = true;
  if (q.has('render') || navigator.webdriver) return;
  if (q.has('design') && window.renderDesign) { renderDesign(); return; }
  if (q.has('t')) { renderAt(+q.get('t')); return; }
  const snd = document.getElementById('snd');
  let playing = false, t0 = 0, pt = 0;
  const now = () => snd && !snd.paused ? snd.currentTime : (performance.now() - t0) / 1000;
  function toggle() {
    playing = !playing;
    if (playing) { if (snd) { snd.currentTime = pt; snd.play().catch(() => {}); } t0 = performance.now() - pt * 1000; }
    else { pt = now(); if (snd) snd.pause(); }
  }
  function stepTo(x) { playing = false; if (snd) snd.pause(); pt = clamp(x, 0, DUR - 1 / FPS); renderAt(pt); ui.textContent = pt.toFixed(2) + ' s  (paused)'; }
  cv.addEventListener('click', toggle);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') stepTo(pt + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') stepTo(pt - (e.shiftKey ? 1 : 1 / FPS));
  });
  renderAt(0.0001); ui.textContent = 'Click or press space to play (sound on). Arrow keys step a frame.';
  function loop() {
    if (playing) {
      pt = now(); if (pt >= DUR) { pt = 0; playing = false; if (snd) snd.pause(); ui.textContent = 'Click to play again'; }
      else { renderAt(pt); ui.textContent = pt.toFixed(1) + ' / ' + DUR + ' s   (click to pause)'; }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
