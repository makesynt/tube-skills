// ===== 03_vintage_2d.js — Engine B: 12fps Boiling-Ink Chronicle Inserts & Brass-Lens Iris Wipe =====
let _INSERT_BUF = null;
function getInsertBuf() {
  if (!_INSERT_BUF) _INSERT_BUF = mkCanvas(W, H);
  return _INSERT_BUF;
}

const q12 = t => Math.floor(t * 12) / 12;

function boilStroke(g, pts, stepIdx, amp = 2.1, closed = false) {
  if (!pts || pts.length < 2) return;
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const jx = (hash2(i * 13 + 5, stepIdx * 17, 401) - 0.5) * 2 * amp;
    const jy = (hash2(i * 29 + 11, stepIdx * 23, 709) - 0.5) * 2 * amp;
    const px = pts[i][0] + jx, py = pts[i][1] + jy;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  if (closed) g.closePath();
}

function drawVintageStock(g, stock = 'copperplate') {
  if (stock === 'cyanotype') {
    const gr = g.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, W * 0.72);
    gr.addColorStop(0, '#133B68');
    gr.addColorStop(1, '#081C35');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(210, 232, 255, 0.09)';
    g.lineWidth = 1;
    for (let x = 80; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 80; y < H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  } else {
    const gr = g.createRadialGradient(W / 2, H * 0.45, 140, W / 2, H / 2, W * 0.72);
    gr.addColorStop(0, '#E8D8B7');
    gr.addColorStop(0.7, '#D8C39B');
    gr.addColorStop(1, '#BC9F72');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    // Fine copperplate horizontal engraving lines in upper sky
    g.strokeStyle = 'rgba(62, 44, 28, 0.08)';
    g.lineWidth = 1;
    for (let y = 36; y < H * 0.55; y += 7) {
      g.beginPath(); g.moveTo(40, y); g.lineTo(W - 40, y); g.stroke();
    }
  }
}

function drawIntertitleCard(g, eyebrow, lines, sub) {
  g.save();
  g.fillStyle = '#100E0C';
  g.fillRect(0, 0, W, H);

  // Double classic silent-cinema ivory border + crimson corner diamonds
  g.strokeStyle = '#DFCDAE';
  g.lineWidth = 3;
  g.strokeRect(86, 68, W - 172, H - 136);
  g.lineWidth = 1.4;
  g.strokeRect(102, 84, W - 204, H - 168);

  for (const [cx, cy] of [[102, 84], [W - 102, 84], [102, H - 84], [W - 102, H - 84]]) {
    g.fillStyle = '#C8322B';
    g.beginPath();
    g.moveTo(cx, cy - 11); g.lineTo(cx + 11, cy); g.lineTo(cx, cy + 11); g.lineTo(cx - 11, cy);
    g.closePath();
    g.fill();
  }

  if (eyebrow) {
    g.fillStyle = '#C8322B';
    g.font = '700 25px "Courier New", "HarmonyOS Sans SC", monospace';
    g.textAlign = 'center';
    g.fillText(eyebrow, W / 2, 260);
  }

  const arr = Array.isArray(lines) ? lines : [lines];
  g.fillStyle = '#F6ECDA';
  g.font = '700 54px "HarmonyOS Sans SC", Georgia, serif';
  g.textAlign = 'center';
  const startY = H / 2 - ((arr.length - 1) * 76) / 2 + 10;
  arr.forEach((ln, idx) => g.fillText(ln, W / 2, startY + idx * 78));

  if (sub) {
    g.fillStyle = '#CBB998';
    g.font = '600 26px "HarmonyOS Sans SC", Georgia, serif';
    g.fillText(sub, W / 2, H - 195);
  }
  g.restore();
}

function apply16mmFinish(g, localT, stock = 'copperplate', impactAt = -99) {
  const step = Math.floor(localT * 12);
  // Subtle luminance flicker
  const flick = (hash2(step, 3, 919) - 0.5) * 0.06;
  if (flick > 0) {
    g.fillStyle = `rgba(255,246,225,${flick.toFixed(3)})`;
    g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = `rgba(18,12,8,${(-flick).toFixed(3)})`;
    g.fillRect(0, 0, W, H);
  }

  // 1-2 faint vertical 16mm emulsion scratches
  g.save();
  g.strokeStyle = stock === 'cyanotype' ? 'rgba(235,245,255,0.16)' : 'rgba(54,38,24,0.18)';
  g.lineWidth = 1.3;
  for (let s = 0; s < 2; s++) {
    if (hash2(step, s + 40, 521) > 0.45) {
      const sx = W * (0.18 + 0.64 * hash2(Math.floor(step / 3), s + 9, 313));
      g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + 3, H); g.stroke();
    }
  }
  // Occasional dust speck
  if (hash2(step, 77, 881) > 0.6) {
    const dx = W * hash2(step, 12, 601), dy = H * hash2(step, 19, 607);
    g.fillStyle = stock === 'cyanotype' ? 'rgba(240,248,255,0.28)' : 'rgba(42,28,16,0.32)';
    g.beginPath(); g.arc(dx, dy, 2.6, 0, Math.PI * 2); g.fill();
  }
  g.restore();

  // Impact flash (30fps brief luminance punch)
  const dtImp = localT - impactAt;
  if (dtImp >= 0 && dtImp < 0.24) {
    const fp = 1 - dtImp / 0.24;
    g.fillStyle = `rgba(255,250,238,${(fp * 0.65).toFixed(3)})`;
    g.fillRect(0, 0, W, H);
  }

  // Heavy vintage lens vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, W * 0.66);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, stock === 'cyanotype' ? 'rgba(3,10,22,0.58)' : 'rgba(24,16,9,0.56)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
}

// Render an Engine B insert with circular Brass-Lens Iris Wipe into & out of the board
function renderVintageInsert(mainG, ins, cam, t) {
  if (t < ins.t0 || t >= ins.t1) return;
  const dur = ins.t1 - ins.t0;
  const lt = t - ins.t0;
  const irisDur = ins.irisDur || 0.65;

  const buf = getInsertBuf();
  const bg = buf.getContext('2d');
  bg.setTransform(1, 0, 0, 1, 0, 0);
  bg.clearRect(0, 0, W, H);

  // 16mm gate weave jitter
  const step = Math.floor(lt * 12);
  const wx = (hash2(step, 1, 211) - 0.5) * 2.6;
  const wy = (hash2(step, 2, 223) - 0.5) * 2.2;
  bg.save();
  bg.translate(wx, wy);

  const it = ins.intertitle;
  if (it && lt >= dur * it.startFrac && lt < dur * it.endFrac) {
    drawIntertitleCard(bg, it.eyebrow, it.lines, it.sub);
  } else {
    drawVintageStock(bg, ins.stock || 'copperplate');
    if (ins.draw) {
      ins.draw(bg, lt, dur, { q12, boilStroke, step, CRIMSON: '#C8322B', INK: ins.stock === 'cyanotype' ? '#F0F7FF' : '#2B1D12' });
    }
  }
  bg.restore();
  apply16mmFinish(bg, lt, ins.stock || 'copperplate', ins.impactAt ?? -99);

  // Compute Iris Wipe aperture centered on world pin or screen center
  let [ix, iy] = [W / 2, H / 2];
  if (ins.pinWorld) [ix, iy] = worldToScreen(ins.pinWorld[0], ins.pinWorld[1], cam);
  else if (ins.pinScreen) [ix, iy] = ins.pinScreen;
  ix = clamp(ix, 180, W - 180);
  iy = clamp(iy, 140, H - 140);

  const maxR = Math.hypot(Math.max(ix, W - ix), Math.max(iy, H - iy)) + 30;
  let openK = 1;
  if (lt < irisDur) openK = E.io3(lt / irisDur);
  else if (lt > dur - irisDur) openK = E.io3((dur - lt) / irisDur);
  const rad = Math.max(2, maxR * openK);

  mainG.save();
  mainG.beginPath();
  mainG.arc(ix, iy, rad, 0, Math.PI * 2);
  mainG.clip();
  mainG.drawImage(buf, 0, 0);
  mainG.restore();

  // Brass optical iris ring during transition
  if (openK < 0.985) {
    mainG.save();
    mainG.strokeStyle = '#C89E52';
    mainG.lineWidth = 7;
    mainG.beginPath(); mainG.arc(ix, iy, rad, 0, Math.PI * 2); mainG.stroke();
    mainG.strokeStyle = '#C8322B';
    mainG.lineWidth = 2.5;
    mainG.beginPath(); mainG.arc(ix, iy, Math.max(1, rad - 8), 0, Math.PI * 2); mainG.stroke();
    mainG.restore();
  }
}
