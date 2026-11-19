// ===== 02_board_engine.js — Engine A: Continuous-Camera Evidence & Cartography Board =====
const CRIMSON = '#C8322B';
const CRIMSON_BRIGHT = '#E03E36';
const PAPER_CREAM = '#EFE7D6';
const INK_DARK = '#1B1917';

function drawBoardWorld(g, spec, cam, t) {
  const plate = buildWorldPlate(spec);
  g.save();
  applyCameraTransform(g, cam);
  g.drawImage(plate.canvas, 0, 0, plate.ww, plate.wh);

  // 1. Dashed Map Routes (drawn under cards/pins so pins anchor on top)
  if (spec.routes) {
    for (const rt of spec.routes) drawRoute(g, rt, t);
  }

  // 2. Archival Photo & Document Cards
  if (spec.cards) {
    for (const card of spec.cards) {
      if (t < card.t0) continue;
      if (card.kind === 'doc') drawDocCard(g, card, t);
      else drawPhotoCard(g, card, t);
    }
  }

  // 3. Taut Crimson Investigation Strings + Map Pins
  if (spec.strings) {
    for (const st of spec.strings) drawString(g, st, t);
  }

  // 4. Hand-Wobble Crimson Fountain-Pen Circles
  if (spec.circles) {
    for (const ci of spec.circles) drawInkCircle(g, ci, t);
  }

  // 5. Rubber Stamps
  if (spec.stamps) {
    for (const sm of spec.stamps) drawStamp(g, sm, t);
  }

  // 6. Embossed Black-Tape Typewriter Tags
  if (spec.tags) {
    for (const tg of spec.tags) drawTapeTag(g, tg, t, spec.returnAllTagsAt);
  }

  g.restore();
}

function drawPhotoCard(g, card, t) {
  const p = E.outBack(seg(t, card.t0, card.t0 + (card.inDur || 0.55)));
  const im = LOADED_IMAGES[card.img];
  const w = card.w || 540;
  const aspect = im && im.width > 0 ? im.height / im.width : (card.aspect || 0.72);
  const imgW = w - 36;
  const imgH = Math.round(imgW * aspect);
  const lipH = card.caption ? 58 : 22;
  const h = imgH + 22 + lipH;

  const slideY = (1 - p) * 140;
  const sc = lerp(0.86, 1.0, seg(t, card.t0, card.t0 + 0.45));

  g.save();
  g.translate(card.x, card.y + slideY);
  g.rotate(((card.rot || 0) * Math.PI) / 180);
  g.scale(sc, sc);

  // Soft archival contact + ambient drop shadow
  g.save();
  g.shadowColor = 'rgba(0, 0, 0, 0.56)';
  g.shadowBlur = 42;
  g.shadowOffsetX = 10;
  g.shadowOffsetY = 22;
  g.fillStyle = PAPER_CREAM;
  g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();

  // Outer warm silver-gelatin border
  g.strokeStyle = 'rgba(40, 32, 22, 0.22)';
  g.lineWidth = 2;
  g.strokeRect(-w / 2, -h / 2, w, h);

  // Photo well
  const ix = -imgW / 2, iy = -h / 2 + 18;
  g.fillStyle = '#1D1B18';
  g.fillRect(ix, iy, imgW, imgH);
  if (im) {
    g.save();
    g.beginPath();
    g.rect(ix, iy, imgW, imgH);
    g.clip();
    // Subtle slow Ken Burns internal breath inside card
    const kb = 1 + 0.03 * Math.sin((t - card.t0) * 0.35);
    g.translate(ix + imgW / 2, iy + imgH / 2);
    g.scale(kb, kb);
    g.drawImage(im, -imgW / 2, -imgH / 2, imgW, imgH);
    // Gentle silver-gelatin contrast vignette
    const vg = g.createRadialGradient(0, 0, imgW * 0.28, 0, 0, imgW * 0.78);
    vg.addColorStop(0, 'rgba(245,235,215,0)');
    vg.addColorStop(1, 'rgba(18,14,10,0.28)');
    g.fillStyle = vg;
    g.fillRect(-imgW / 2, -imgH / 2, imgW, imgH);
    g.restore();
  } else if (card.procedural) {
    g.save();
    g.beginPath(); g.rect(ix, iy, imgW, imgH); g.clip();
    card.procedural(g, ix, iy, imgW, imgH, t);
    g.restore();
  }

  g.strokeStyle = 'rgba(32, 26, 20, 0.35)';
  g.lineWidth = 1.5;
  g.strokeRect(ix, iy, imgW, imgH);

  // Caption on silver-gelatin bottom lip (auto-constrained width so caption never collides with yearTag)
  if (card.caption) {
    let rightReserved = 8;
    if (card.yearTag) {
      g.fillStyle = CRIMSON;
      g.font = '700 18px "Courier New", monospace';
      rightReserved = g.measureText(card.yearTag).width + 22;
      g.textAlign = 'right';
      g.fillText(card.yearTag, ix + imgW - 4, iy + imgH + 36);
    }
    g.fillStyle = '#2A2520';
    g.font = '700 20px "HarmonyOS Sans SC", "Courier New", sans-serif';
    g.textAlign = 'left';
    g.fillText(card.caption, ix + 4, iy + imgH + 36, Math.max(120, imgW - rightReserved - 6));
  }

  // Top masking tape or brass/crimson pin
  if (card.tape) {
    g.save();
    g.translate(0, -h / 2 + 2);
    g.rotate(-0.04);
    g.fillStyle = 'rgba(228, 214, 178, 0.78)';
    g.fillRect(-68, -15, 136, 30);
    g.restore();
  } else {
    drawPinHead(g, 0, -h / 2 + 10, card.pinColor || CRIMSON);
  }
  g.restore();
}

function drawDocCard(g, card, t) {
  const p = E.outBack(seg(t, card.t0, card.t0 + 0.55));
  const w = card.w || 520, h = card.h || 380;
  const slideY = (1 - p) * 120;

  g.save();
  g.translate(card.x, card.y + slideY);
  g.rotate(((card.rot || 0) * Math.PI) / 180);

  g.save();
  g.shadowColor = 'rgba(0,0,0,0.52)';
  g.shadowBlur = 38;
  g.shadowOffsetX = 8;
  g.shadowOffsetY = 20;
  g.fillStyle = '#F4ECD8';
  g.fillRect(-w / 2, -h / 2, w, h);
  g.restore();

  // Ruled ledger lines
  g.strokeStyle = 'rgba(120, 102, 78, 0.18)';
  g.lineWidth = 1.5;
  for (let ly = -h / 2 + 92; ly < h / 2 - 28; ly += 42) {
    g.beginPath(); g.moveTo(-w / 2 + 32, ly); g.lineTo(w / 2 - 32, ly); g.stroke();
  }

  // Document header + red classification rule
  g.fillStyle = CRIMSON;
  g.fillRect(-w / 2 + 32, -h / 2 + 30, w - 64, 4);
  g.fillStyle = '#1E1A16';
  g.font = '700 24px "Courier New", "HarmonyOS Sans SC", monospace';
  g.textAlign = 'left';
  g.fillText(card.header || 'ARCHIVAL LOGBOOK', -w / 2 + 32, -h / 2 + 68);

  // Body lines + animated crimson highlight bar
  const lines = card.lines || [];
  lines.forEach((ln, idx) => {
    const ly = -h / 2 + 122 + idx * 42;
    if (card.highlightIdx === idx && card.highlightAt && t >= card.highlightAt) {
      const hp = E.out3(seg(t, card.highlightAt, card.highlightAt + 0.42));
      g.fillStyle = 'rgba(200, 50, 43, 0.22)';
      g.fillRect(-w / 2 + 28, ly - 27, (w - 56) * hp, 36);
      g.fillStyle = CRIMSON;
      g.fillRect(-w / 2 + 28, ly + 8, (w - 56) * hp, 3.5);
    }
    g.fillStyle = card.highlightIdx === idx ? '#14110E' : '#3A332C';
    g.font = `${card.highlightIdx === idx ? '700' : '600'} 22px "HarmonyOS Sans SC", Georgia, serif`;
    g.fillText(ln, -w / 2 + 34, ly);
  });

  drawPinHead(g, 0, -h / 2 + 12, '#C59B48');
  g.restore();
}

function drawPinHead(g, x, y, col = CRIMSON) {
  g.save();
  g.translate(x, y);
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath(); g.arc(4, 6, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = col;
  g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath(); g.arc(-4, -4, 4.2, 0, Math.PI * 2); g.fill();
  g.restore();
}

function drawRoute(g, rt, t) {
  if (t < rt.t0 || !rt.points || rt.points.length < 2) return;
  const p = E.io2(seg(t, rt.t0, rt.t0 + (rt.dur || 1.6)));
  const pts = rt.points;
  const segLens = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segLens.push(d);
    total += d;
  }
  const target = total * p;

  g.save();
  g.strokeStyle = rt.color || CRIMSON_BRIGHT;
  g.lineWidth = rt.width || 6.5;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.setLineDash(rt.dash || [18, 14]);
  g.shadowColor = 'rgba(200, 50, 43, 0.45)';
  g.shadowBlur = 12;

  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  let acc = 0, headX = pts[0][0], headY = pts[0][1];
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] <= target) {
      g.lineTo(pts[i + 1][0], pts[i + 1][1]);
      headX = pts[i + 1][0]; headY = pts[i + 1][1];
      acc += segLens[i];
    } else {
      const rem = (target - acc) / Math.max(1e-4, segLens[i]);
      headX = lerp(pts[i][0], pts[i + 1][0], rem);
      headY = lerp(pts[i][1], pts[i + 1][1], rem);
      g.lineTo(headX, headY);
      break;
    }
  }
  g.stroke();
  g.setLineDash([]);

  // Waypoint rings
  pts.forEach(([wx, wy], idx) => {
    const frac = idx / (pts.length - 1);
    if (p >= frac - 0.02) {
      g.fillStyle = PAPER_CREAM;
      g.beginPath(); g.arc(wx, wy, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = CRIMSON_BRIGHT;
      g.beginPath(); g.arc(wx, wy, 6, 0, Math.PI * 2); g.fill();
    }
  });
  g.restore();
}

function drawString(g, st, t) {
  if (t < st.t0) return;
  const p = E.out3(seg(t, st.t0, st.t0 + (st.dur || 0.55)));
  const [x1, y1] = st.from, [x2, y2] = st.to;
  const cx = lerp(x1, x2, p), cy = lerp(y1, y2, p);
  const sag = 18 * Math.sin(p * Math.PI * 0.5);

  g.save();
  // Board shadow of taut string
  g.strokeStyle = 'rgba(0,0,0,0.42)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(x1, y1 + 10);
  g.quadraticCurveTo((x1 + cx) / 2, (y1 + cy) / 2 + sag + 14, cx, cy + 10);
  g.stroke();

  // Crimson thread
  g.strokeStyle = CRIMSON_BRIGHT;
  g.lineWidth = 4.2;
  g.beginPath();
  g.moveTo(x1, y1);
  g.quadraticCurveTo((x1 + cx) / 2, (y1 + cy) / 2 + sag, cx, cy);
  g.stroke();

  drawPinHead(g, x1, y1, CRIMSON);
  if (p > 0.92) drawPinHead(g, x2, y2, CRIMSON);
  g.restore();
}

function drawInkCircle(g, ci, t) {
  if (t < ci.t0) return;
  const p = E.out3(seg(t, ci.t0, ci.t0 + (ci.dur || 0.42)));
  const steps = Math.max(4, Math.floor(68 * p));
  const maxAng = Math.PI * 2.22; // Slight organic overlap like a real fountain pen loop

  g.save();
  g.translate(ci.x, ci.y);
  g.rotate(((ci.rot || -6) * Math.PI) / 180);
  g.strokeStyle = CRIMSON_BRIGHT;
  g.lineWidth = ci.lineWidth || 6.5;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / 68) * maxAng;
    const wob = 1 + (noise2(Math.cos(a) * 2.4, Math.sin(a) * 2.4, ci.seed || 107) - 0.5) * 0.13;
    const spiral = 1 + (i / 68) * 0.045;
    const px = Math.cos(a) * (ci.rx || 130) * wob * spiral;
    const py = Math.sin(a) * (ci.ry || 88) * wob * spiral;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.stroke();
  g.restore();
}

function drawStamp(g, sm, t) {
  if (t < sm.t0) return;
  const p = E.out4(seg(t, sm.t0, sm.t0 + 0.18));
  const sc = lerp(1.9, 1.0, p);

  g.save();
  g.translate(sm.x, sm.y);
  g.rotate(((sm.rot || -11) * Math.PI) / 180);
  g.scale(sc, sc);

  g.font = '900 38px "Courier New", "HarmonyOS Sans SC", monospace';
  const tw = Math.max(260, g.measureText(sm.text).width + 58);
  const th = sm.subtext ? 104 : 76;

  g.fillStyle = 'rgba(24, 10, 10, 0.72)';
  g.fillRect(-tw / 2, -th / 2, tw, th);
  g.strokeStyle = CRIMSON_BRIGHT;
  g.lineWidth = 6;
  g.strokeRect(-tw / 2, -th / 2, tw, th);
  g.lineWidth = 2;
  g.strokeRect(-tw / 2 + 9, -th / 2 + 9, tw - 18, th - 18);

  g.fillStyle = CRIMSON_BRIGHT;
  g.textAlign = 'center';
  g.fillText(sm.text, 0, sm.subtext ? -4 : 13);
  if (sm.subtext) {
    g.font = '700 20px "Courier New", "HarmonyOS Sans SC", monospace';
    g.fillText(sm.subtext, 0, 30);
  }
  g.restore();
}

function drawTapeTag(g, tg, t, returnAllAt) {
  if (t < tg.t0) return;
  const fadeStart = tg.fadeAt || (tg.t0 + 9.5);
  const returning = returnAllAt && t >= returnAllAt;
  if (!returning && t > fadeStart + 0.6) return;

  const chars = Math.min(tg.text.length, Math.max(1, Math.floor((t - tg.t0) * 26)));
  const shown = returning ? tg.text : tg.text.slice(0, chars);
  const dx = tg.dx ?? 90, dy = tg.dy ?? -90;
  const bx = tg.x + dx, by = tg.y + dy;

  let vis = 1;
  if (!returning && t > fadeStart) vis = 1 - seg(t, fadeStart, fadeStart + 0.6);
  if (returning) vis = seg(t, returnAllAt, returnAllAt + 0.5);
  if (vis <= 0.02) return;

  g.save();
  g.scale(1, 1);
  // Leader line
  g.strokeStyle = CRIMSON_BRIGHT;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(tg.x, tg.y);
  g.lineTo(bx, by);
  g.stroke();
  g.fillStyle = CRIMSON_BRIGHT;
  g.beginPath(); g.arc(tg.x, tg.y, 6.5, 0, Math.PI * 2); g.fill();

  g.font = '700 24px "Courier New", "HarmonyOS Sans SC", monospace';
  const padX = 20;
  const w = ( g.measureText(tg.text).width + padX * 2 ) * (returning ? vis : 1);
  const h = 46;

  g.shadowColor = 'rgba(0,0,0,0.5)';
  g.shadowBlur = 16;
  g.shadowOffsetY = 6;
  g.fillStyle = '#12151B';
  g.fillRect(bx, by - h / 2, w, h);
  g.shadowBlur = 0;
  g.fillStyle = CRIMSON_BRIGHT;
  g.fillRect(bx, by - h / 2, 6, h);

  g.fillStyle = '#F5EFE2';
  g.textAlign = 'left';
  g.fillText(shown, bx + padX, by + 8);
  g.restore();
}

function drawScreenOverlays(g, spec, t) {
  if (spec.overlays) {
    for (const ov of spec.overlays) {
      if (t < ov.t0 || t > ov.t1) continue;
      if (ov.kind === 'year') drawYearOverlay(g, ov, t);
      else if (ov.kind === 'thesis') drawThesisOverlay(g, ov, t);
      else if (ov.kind === 'counter') drawCounterOverlay(g, ov, t);
    }
  }
  if (spec.subtitles) {
    for (const sub of spec.subtitles) {
      if (t >= sub.t0 && t < sub.t1) {
        drawDocSubtitle(g, sub.text, t - sub.t0, sub.t1 - sub.t0);
        break;
      }
    }
  }
}

function drawYearOverlay(g, ov, t) {
  const enter = E.out3(seg(t, ov.t0, ov.t0 + 0.45));
  const exit = 1 - E.in3(seg(t, ov.t1 - 0.35, ov.t1));
  const k = Math.min(enter, exit);
  const yOff = (1 - k) * 44;

  g.save();
  // Clean floating archival corner/top-center badge without blocking full screen
  const cx = ov.x || W / 2, cy = (ov.y || 168) - yOff;
  const rw = 360 * k;
  g.fillStyle = 'rgba(10, 16, 24, 0.86)';
  g.fillRect(cx - 230, cy - 68, 460, 128);
  g.strokeStyle = CRIMSON_BRIGHT;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - rw / 2, cy - 54); g.lineTo(cx + rw / 2, cy - 54);
  g.moveTo(cx - rw / 2, cy + 46); g.lineTo(cx + rw / 2, cy + 46);
  g.stroke();

  g.fillStyle = '#F6EFE0';
  g.font = '700 64px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.fillText(String(ov.year), cx, cy + 12);

  if (ov.label) {
    g.fillStyle = '#D9CBB2';
    g.font = '700 19px "HarmonyOS Sans SC", "Courier New", monospace';
    g.fillText(ov.label, cx, cy + 38);
  }
  g.restore();
}

function drawThesisOverlay(g, ov, t) {
  const enter = E.out3(seg(t, ov.t0, ov.t0 + 0.5));
  const strikeP = E.out3(seg(t, ov.t0 + 0.55, ov.t0 + 1.0));
  const truthP = E.outBack(seg(t, ov.t0 + 0.95, ov.t0 + 1.45));
  const slideY = (1 - enter) * 90;

  g.save();
  g.translate(W / 2, H / 2 + slideY);
  g.shadowColor = 'rgba(0,0,0,0.68)';
  g.shadowBlur = 48;
  g.fillStyle = 'rgba(11, 16, 23, 0.92)';
  g.fillRect(-520, -145, 1040, 275);
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(235, 224, 200, 0.28)';
  g.lineWidth = 2;
  g.strokeRect(-520, -145, 1040, 275);
  g.fillStyle = CRIMSON_BRIGHT;
  g.fillRect(-520, -145, 1040, 6);

  // Old assumption + crimson strikethrough
  g.fillStyle = '#ACA395';
  g.font = '700 30px "Courier New", "HarmonyOS Sans SC", monospace';
  g.textAlign = 'center';
  g.fillText(ov.oldText, 0, -48);
  const oldW = g.measureText(ov.oldText).width + 28;
  if (strikeP > 0) {
    g.fillStyle = CRIMSON_BRIGHT;
    g.fillRect(-oldW / 2, -60, oldW * strikeP, 6);
  }

  // New truth
  if (truthP > 0.02) {
    g.save();
    g.scale(lerp(0.88, 1.0, clamp(truthP, 0, 1)), lerp(0.88, 1.0, clamp(truthP, 0, 1)));
    g.fillStyle = '#FAF4E6';
    g.font = '900 50px "HarmonyOS Sans SC", Georgia, serif';
    g.fillText(ov.newText, 0, 52);
    if (ov.sub) {
      g.fillStyle = '#DFC48C';
      g.font = '700 22px "HarmonyOS Sans SC", monospace';
      g.fillText(ov.sub, 0, 96);
    }
    g.restore();
  }
  g.restore();
}

function drawCounterOverlay(g, ov, t) {
  const p = E.out3(seg(t, ov.t0, ov.t1 - 0.4));
  const val = Math.round(lerp(ov.from, ov.to, p)).toLocaleString('en-US');
  g.save();
  g.translate(ov.x || W / 2, ov.y || 210);
  g.fillStyle = 'rgba(10, 14, 22, 0.88)';
  g.fillRect(-340, -75, 680, 148);
  g.strokeStyle = 'rgba(228, 194, 118, 0.45)';
  g.lineWidth = 2;
  g.strokeRect(-340, -75, 680, 148);
  g.fillStyle = '#F7DF9C';
  g.font = '800 52px "Courier New", monospace';
  g.textAlign = 'center';
  g.fillText(`${val} ${ov.unit || ''}`, 0, 6);
  if (ov.caption) {
    g.fillStyle = '#DCE4F0';
    g.font = '700 21px "HarmonyOS Sans SC", sans-serif';
    g.fillText(ov.caption, 0, 48);
  }
  g.restore();
}

function drawDocSubtitle(g, text, lt, dur) {
  const enter = E.out3(seg(lt, 0, 0.14));
  const exit = 1 - E.in3(seg(lt, dur - 0.12, dur));
  const yOff = (1 - Math.min(enter, exit)) * 42;
  g.save();
  g.font = '700 32px "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif';
  const tw = g.measureText(text).width;
  const pw = tw + 56, ph = 58;
  const px = (W - pw) / 2, py = H - 98 + yOff;

  g.fillStyle = 'rgba(12, 14, 18, 0.86)';
  g.beginPath();
  g.roundRect(px, py, pw, ph, 12);
  g.fill();
  g.strokeStyle = 'rgba(235, 224, 202, 0.22)';
  g.lineWidth = 1.5;
  g.stroke();

  g.fillStyle = '#FAF6EC';
  g.textAlign = 'center';
  g.fillText(text, W / 2, py + 40);
  g.restore();
}
