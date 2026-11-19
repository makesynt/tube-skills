// ===== 99_main.js — Deterministic Master Clock & Interactive Browser Player =====
window.VIDEO = { width: W, height: H, fps: FPS, duration: DUR, scale: SC };

function renderAt(t) {
  const clamped = clamp(t, 0, Math.max(0, DUR - 0.0001));
  const spec = window.DOC_SPEC || {};
  const g = CTX;

  g.setTransform(SC, 0, 0, SC, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#07090D';
  g.fillRect(0, 0, W, H);

  // 1. Evaluate continuous physical camera & draw Engine A World Board
  const cam = evalCamera(spec.cameraKeys, spec.stamps, clamped);
  drawBoardWorld(g, spec, cam, clamped);

  // 2. Render any active Engine B 12fps Vintage 2D Insert (with Brass-Lens Iris Wipe)
  if (spec.inserts) {
    for (const ins of spec.inserts) {
      renderVintageInsert(g, ins, cam, clamped);
    }
  }

  // 3. Subtle unified film grain + optical lens vignette
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = 0.14;
  g.fillStyle = grainPattern(g);
  g.fillRect(0, 0, W, H);
  g.restore();

  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.68);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,7,12,0.42)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  // 4. Screen-space year/thesis cards & waveform-locked subtitles
  drawScreenOverlays(g, spec, clamped);
}

window.renderAt = renderAt;

preloadAllImages().then(() => {
  renderAt(0.001);
  window.__ready = true;
  if (qParam.has('render') || (typeof navigator !== 'undefined' && navigator.webdriver)) return;
  if (qParam.has('t')) { renderAt(+qParam.get('t')); return; }

  const ui = document.getElementById('ui');
  const snd = document.getElementById('snd');
  let playing = false, t0 = 0, pt = 0;
  const now = () => (snd && !snd.paused ? snd.currentTime : (performance.now() - t0) / 1000);

  function toggle() {
    playing = !playing;
    if (playing) {
      if (snd) { snd.currentTime = pt; snd.play().catch(() => {}); }
      t0 = performance.now() - pt * 1000;
    } else {
      pt = now();
      if (snd) snd.pause();
    }
  }

  function stepTo(x) {
    playing = false;
    if (snd) snd.pause();
    pt = clamp(x, 0, DUR - 1 / FPS);
    renderAt(pt);
    if (ui) ui.textContent = `${pt.toFixed(2)}s / ${DUR.toFixed(1)}s  [PAUSED — Arrow keys step frame]`;
  }

  CV.addEventListener('click', toggle);
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    if (e.code === 'ArrowRight') stepTo(pt + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') stepTo(pt - (e.shiftKey ? 1 : 1 / FPS));
  });

  if (ui) ui.textContent = 'Click or press Space to play documentary (sound on). Left/Right arrows step frame-by-frame.';
  function loop() {
    if (playing) {
      pt = now();
      if (pt >= DUR) {
        pt = 0;
        playing = false;
        if (snd) snd.pause();
        if (ui) ui.textContent = 'Finished — Click or Space to replay';
      } else {
        renderAt(pt);
        if (ui) ui.textContent = `${pt.toFixed(1)}s / ${DUR.toFixed(1)}s`;
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
});
