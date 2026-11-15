/* V3 Master-Tier Infinite-Resolution Vector Worlds, Camera Rig, Glow Curves & Film Grain */
(function () {
  "use strict";

  const W = 1920;
  const H = 1080;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const { clamp, hash11 } = window.StickmanRig;

  // Pre-bake deterministic 256x256 film-grain noise tile (prevents 8-bit yuv420p sky banding!)
  const grainTile = document.createElement("canvas");
  grainTile.width = 256;
  grainTile.height = 256;
  (function initGrain() {
    const gctx = grainTile.getContext("2d");
    const img = gctx.createImageData(256, 256);
    const d = img.data;
    for (let i = 0; i < 256 * 256; i++) {
      const v = Math.floor(hash11(i * 1.37 + 7.1) * 255);
      const idx = i * 4;
      d[idx] = v;
      d[idx + 1] = v;
      d[idx + 2] = v;
      d[idx + 3] = 9; // Subtle ~3.5% cinema grain
    }
    gctx.putImageData(img, 0, 0);
  })();

  function withCamera(ctx, cam, drawFn) {
    const cx = cam.x === undefined ? W * 0.5 : cam.x;
    const cy = cam.y === undefined ? H * 0.5 : cam.y;
    const zoom = cam.zoom === undefined ? 1.0 : cam.zoom;
    const rot = cam.rotDeg || 0;
    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    if (Math.abs(rot) > 0.02) ctx.rotate(rot * DEG);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
    drawFn(ctx);
    ctx.restore();
  }

  function fillSkyGrad(ctx, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    for (const [pos, col] of stops) g.addColorStop(pos, col);
    ctx.fillStyle = g;
    ctx.fillRect(-320, -220, W + 640, H + 440);
  }

  function drawGlowPolyline(ctx, pts, color, coreW, glowBlur, dotEnd) {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Outer soft bloom pass
    ctx.shadowColor = color;
    ctx.shadowBlur = glowBlur || 18;
    ctx.strokeStyle = color;
    ctx.lineWidth = (coreW || 4) * 1.35;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();

    // Crisp hot core pass
    ctx.shadowBlur = 6;
    ctx.strokeStyle = "#ffffff";
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1.5, (coreW || 4) * 0.45);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (dotEnd !== false) {
      const last = pts[pts.length - 1];
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(last[0], last[1], (coreW || 4) * 1.45, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMotes(ctx, t, count, rgbStr) {
    ctx.save();
    for (let i = 0; i < count; i++) {
      const spx = 14 + (i % 5) * 5;
      const spy = 10 + (i % 4) * 4;
      const px = (((i * 293 + t * spx) % (W + 120)) + (W + 120)) % (W + 120) - 60;
      const py = (((i * 179 - t * spy) % (H + 120)) + (H + 120)) % (H + 120) - 60;
      const r = 1.6 + (i % 3) * 1.25;
      const a = 0.14 + 0.16 * Math.sin(t * 2.3 + i * 1.7);
      ctx.fillStyle = `rgba(${rgbStr}, ${clamp(a, 0.04, 0.36)})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function applyCinemaGradeAndGrain(ctx, t) {
    ctx.save();
    // Radial cinema vignette
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.28, W * 0.5, H * 0.5, W * 0.66);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(4,5,10,0.52)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // Deterministic animated film grain overlay
    const ox = Math.floor(hash11(Math.floor(t * 30) * 3.1) * 128);
    const oy = Math.floor(hash11(Math.floor(t * 30) * 7.7) * 128);
    const pat = ctx.createPattern(grainTile, "repeat");
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(ox, oy, W + 256, H + 256);
    ctx.restore();
  }

  // =========================================================================
  // WORLD 1: COZY VECTOR BEDROOM (Animated Goldfish, Mullion Moonlight, Wood Planks)
  // =========================================================================
  function drawBedroomWorld(ctx, t, opts) {
    opts = opts || {};
    fillSkyGrad(ctx, [
      [0.0, "#211926"],
      [0.76, "#2c2231"],
      [1.0, "#151118"],
    ]);

    // Warm floor-lamp radial glow
    const lg = ctx.createRadialGradient(125, 560, 15, 125, 560, 420);
    lg.addColorStop(0, "rgba(248, 206, 136, 0.28)");
    lg.addColorStop(1, "rgba(248, 206, 136, 0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 120, 620, 820);

    // 4-Pane Mullion Window (matching KuovIUmGS_A 675.4s!)
    const wx0 = 980, wy0 = 195, ww = 670, wh = 470;
    ctx.fillStyle = "#111936";
    ctx.fillRect(wx0, wy0, ww, wh);

    // Twinkling stars + glowing moon + distant night skyline inside window
    for (let s = 0; s < 10; s++) {
      const sx = wx0 + 45 + ((s * 137) % (ww - 90));
      const sy = wy0 + 34 + ((s * 79) % 145);
      const tw = 0.45 + 0.45 * Math.sin(t * 3.2 + s * 2.1);
      ctx.fillStyle = `rgba(242, 246, 255, ${tw})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.9, 0, TAU);
      ctx.fill();
    }
    const mg = ctx.createRadialGradient(1446, 308, 8, 1446, 308, 72);
    mg.addColorStop(0, "rgba(248, 250, 255, 0.96)");
    mg.addColorStop(0.45, "rgba(215, 228, 255, 0.35)");
    mg.addColorStop(1, "rgba(215, 228, 255, 0)");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(1446, 308, 72, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#f7f9ff";
    ctx.beginPath();
    ctx.arc(1446, 308, 32, 0, TAU);
    ctx.fill();

    const winTowers = [
      [1008, 74, 148], [1094, 88, 218], [1196, 68, 172],
      [1278, 56, 128], [1346, 94, 192], [1454, 78, 142], [1544, 92, 168],
    ];
    for (const [bx, bw, bh] of winTowers) {
      const by = wy0 + wh - 8 - bh;
      ctx.fillStyle = "#171a2b";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "rgba(244, 192, 104, 0.72)";
      for (let wy = by + 12; wy < wy0 + wh - 22; wy += 22) {
        for (let wx = bx + 11; wx < bx + bw - 14; wx += 18) {
          if ((bx + wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 7, 11);
        }
      }
    }

    // Window frame & cross mullions
    ctx.strokeStyle = "#1b141e";
    ctx.lineWidth = 12;
    ctx.strokeRect(wx0, wy0, ww, wh);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(wx0 + ww * 0.5, wy0);
    ctx.lineTo(wx0 + ww * 0.5, wy0 + wh);
    ctx.moveTo(wx0, wy0 + wh * 0.5);
    ctx.lineTo(wx0 + ww, wy0 + wh * 0.5);
    ctx.stroke();

    // Volumetric diagonal moonlight beam across bedroom!
    const beamG = ctx.createLinearGradient(1315, 220, 1180, 960);
    beamG.addColorStop(0, "rgba(156, 188, 248, 0.14)");
    beamG.addColorStop(1, "rgba(156, 188, 248, 0.02)");
    ctx.fillStyle = beamG;
    ctx.beginPath();
    ctx.moveTo(wx0 + 10, wy0 + 10);
    ctx.lineTo(wx0 + ww - 10, wy0 + 10);
    ctx.lineTo(1820, 960);
    ctx.lineTo(790, 960);
    ctx.closePath();
    ctx.fill();

    // Hardwood floor + baseboard molding + plank lines (crisp at 2.2x close-up!)
    ctx.fillStyle = "#18131c";
    ctx.fillRect(-100, 862, W + 200, 260);
    ctx.fillStyle = "#241c29";
    ctx.fillRect(-100, 852, W + 200, 12);
    ctx.strokeStyle = "rgba(255, 235, 215, 0.05)";
    ctx.lineWidth = 1.5;
    for (let fy = 886; fy <= 1020; fy += 28) {
      ctx.beginPath();
      ctx.moveTo(-100, fy);
      ctx.lineTo(W + 100, fy);
      ctx.stroke();
    }

    // Shelf + books + Glass Fishbowl with ANIMATED swimming orange goldfish!
    ctx.fillStyle = "#211722";
    ctx.fillRect(1355, 550, 385, 14);
    const bookCols = ["#783846", "#8c643e", "#3a5478", "#5a3e66"];
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = bookCols[k];
      ctx.beginPath();
      ctx.roundRect(1595 + k * 28, 468 + (k % 2) * 8, 23, 82 - (k % 2) * 8, 3);
      ctx.fill();
    }
    // Fishbowl water & glass rim
    const fbx = 1468, fby = 476;
    ctx.fillStyle = "rgba(82, 144, 198, 0.34)";
    ctx.beginPath();
    ctx.arc(fbx, fby, 74, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(205, 232, 255, 0.72)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fbx, fby, 76, -0.82 * Math.PI, 1.82 * Math.PI);
    ctx.stroke();
    // Swimming goldfish + rising tiny water bubble!
    const gx = fbx + Math.sin(t * 1.9) * 22;
    const gy = fby + 16 + Math.cos(t * 3.1) * 5;
    const dirF = Math.cos(t * 1.9) >= 0 ? 1 : -1;
    ctx.fillStyle = "#f48836";
    ctx.beginPath();
    ctx.ellipse(gx, gy, 18, 10, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gx - 15 * dirF, gy);
    ctx.lineTo(gx - 28 * dirF, gy - 9 + Math.sin(t * 12) * 3);
    ctx.lineTo(gx - 28 * dirF, gy + 9 + Math.sin(t * 12) * 3);
    ctx.closePath();
    ctx.fill();
    const bubP = (t * 0.9) % 1;
    ctx.strokeStyle = `rgba(225, 245, 255, ${(1 - bubP) * 0.7})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gx + 14 * dirF, gy - 8 - bubP * 32, 3.2, 0, TAU);
    ctx.stroke();

    // Framed wall art, floor lamp, bedside nightstand & cozy sofa
    ctx.fillStyle = "#483a34";
    ctx.fillRect(615, 285, 145, 98);
    ctx.strokeStyle = "#1c151e";
    ctx.lineWidth = 8;
    ctx.strokeRect(615, 285, 145, 98);

    // Floor lamp
    ctx.fillStyle = "#3e3440";
    ctx.fillRect(120, 608, 10, 255);
    ctx.fillRect(82, 856, 86, 8);
    ctx.fillStyle = "#cfc89e";
    ctx.beginPath();
    ctx.moveTo(52, 610);
    ctx.lineTo(198, 610);
    ctx.lineTo(172, 526);
    ctx.lineTo(78, 526);
    ctx.closePath();
    ctx.fill();

    // Cozy sofa + cushions
    ctx.fillStyle = "#2e2739";
    ctx.beginPath();
    ctx.roundRect(495, 712, 685, 152, 22);
    ctx.fill();
    ctx.fillStyle = "#393047";
    ctx.beginPath();
    ctx.roundRect(478, 778, 720, 90, 16);
    ctx.fill();

    // Bedside low nightstand + digital alarm clock '07:00' (framed cleanly inside S01 close-up!)
    ctx.fillStyle = "#251d2b";
    ctx.beginPath();
    ctx.roundRect(332, 765, 140, 102, 8);
    ctx.fill();
    ctx.fillStyle = "#13111a";
    ctx.strokeStyle = "#56485c";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(356, 720, 96, 45, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4c476";
    ctx.font = "600 24px 'Outfit', sans-serif";
    ctx.textAlign = "center";
    const colon = Math.floor(t * 2) % 2 === 0 ? ":" : " ";
    ctx.fillText(`07${colon}00`, 404, 751);

    // Optional slippers on bedroom rug/floor
    if (opts.showSlippers) {
      const shScale = clamp(1 - (opts.liftProg || 0) * 0.55, 0.35, 1);
      ctx.fillStyle = `rgba(5, 4, 10, ${0.52 * shScale})`;
      ctx.beginPath();
      ctx.ellipse(960, 886, 68 * shScale, 11 * shScale, 0, 0, TAU);
      ctx.fill();
      for (const sx of [908, 976]) {
        ctx.fillStyle = "#56749e";
        ctx.beginPath();
        ctx.roundRect(sx, 874, 46, 18, 9);
        ctx.fill();
        ctx.strokeStyle = "#89a8d4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx + 25, 882, 11, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    }

    // Swinging ceiling pendant lamp
    const swing = opts.lampSwing || 0;
    const lx = 825 + swing * 2.2;
    const ly = 136;
    ctx.strokeStyle = "#3c3644";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(825, 40);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = "#f6ce8a";
    ctx.beginPath();
    ctx.moveTo(lx - 46, ly + 36);
    ctx.lineTo(lx + 46, ly + 36);
    ctx.lineTo(lx + 20, ly);
    ctx.lineTo(lx - 20, ly);
    ctx.closePath();
    ctx.fill();
  }

  // =========================================================================
  // WORLD 2: SHIMMERING DUSK HORIZON LAKE & WOODEN PIER (Exact Horizon y = 668!)
  // =========================================================================
  const LAKE_HY = 668;

  function drawDuskLakeWorld(ctx, t, opts) {
    opts = opts || {};
    fillSkyGrad(ctx, [
      [0.0, "#2a1c40"],
      [0.36, "#5e3862"],
      [0.55, "#bc6e76"],
      [0.618, "#f8c492"],
      [0.625, "#54405c"],
      [1.0, "#191425"],
    ]);

    const sunX = W * 0.62;
    const sunY = LAKE_HY - 8;

    // Breathing crepuscular sun-rays!
    ctx.save();
    for (let i = -6; i <= 6; i++) {
      const ang = (i * 13 + Math.sin(t * 0.7 + i) * 1.2 - 90) * DEG;
      const x2 = sunX + Math.cos(ang) * 1350;
      const y2 = sunY + Math.sin(ang) * 850;
      const rg = ctx.createLinearGradient(sunX, sunY, x2, y2);
      rg.addColorStop(0, "rgba(255, 224, 174, 0.14)");
      rg.addColorStop(1, "rgba(255, 224, 174, 0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(x2 - 54, y2);
      ctx.lineTo(x2 + 54, y2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Sun halo + crisp solar disc above horizon
    const sg = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 185);
    sg.addColorStop(0, "rgba(255, 248, 222, 0.95)");
    sg.addColorStop(0.32, "rgba(255, 218, 158, 0.55)");
    sg.addColorStop(1, "rgba(255, 190, 138, 0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 185, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#fff7dc";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 52, Math.PI, TAU);
    ctx.fill();

    // Distant layered mountain ridge & pine tree silhouettes along y = 668!
    ctx.fillStyle = "#291b34";
    ctx.beginPath();
    ctx.moveTo(-80, LAKE_HY);
    ctx.lineTo(280, LAKE_HY - 30);
    ctx.lineTo(680, LAKE_HY - 14);
    ctx.lineTo(1080, LAKE_HY - 28);
    ctx.lineTo(1520, LAKE_HY - 12);
    ctx.lineTo(W + 80, LAKE_HY - 26);
    ctx.lineTo(W + 80, LAKE_HY + 6);
    ctx.lineTo(-80, LAKE_HY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#171021";
    for (const [tx, th] of [[112, 66], [238, 54], [412, 72], [595, 58], [975, 64], [1385, 70], [1540, 56], [1738, 68]]) {
      const sway = Math.sin(t * 1.8 + tx * 0.03) * 2.2;
      ctx.beginPath();
      ctx.moveTo(tx + sway, LAKE_HY - th);
      ctx.lineTo(tx - 15, LAKE_HY + 3);
      ctx.lineTo(tx + 15, LAKE_HY + 3);
      ctx.closePath();
      ctx.fill();
    }

    // CONTINUOUSLY ANIMATED Golden Lake Water Shimmer Dashes (never static!)
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < 34; i++) {
      const wy = LAKE_HY + 12 + i * 10.5;
      const baseSpan = Math.max(18, 175 - i * 4.2);
      const waveShift = Math.sin(t * 2.6 + i * 0.75) * (18 + (i % 4) * 5);
      const pulseSpan = baseSpan * (0.86 + 0.14 * Math.cos(t * 3.1 + i * 1.1));
      const alpha = clamp((1 - i / 36) * 0.68, 0.08, 0.72);
      ctx.strokeStyle = `rgba(255, 220, 168, ${alpha})`;
      ctx.lineWidth = i < 8 ? 2.6 : 1.8;
      ctx.beginPath();
      ctx.moveTo(sunX - pulseSpan + waveShift, wy);
      ctx.lineTo(sunX + pulseSpan + waveShift, wy);
      ctx.stroke();
    }
    ctx.restore();

    // Wooden Jetty Pier (extendable width for 5-cast finale!)
    const pierEnd = opts.widePier ? 1440 : 730;
    const deckY = LAKE_HY + 36;
    ctx.fillStyle = "#1f1524";
    ctx.fillRect(-40, deckY, pierEnd + 40, 12);
    ctx.strokeStyle = "rgba(248, 198, 138, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-40, deckY + 1);
    ctx.lineTo(pierEnd, deckY + 1);
    ctx.stroke();

    for (let px = 48; px < pierEnd - 12; px += 68) {
      ctx.fillStyle = "#160e1b";
      ctx.fillRect(px, deckY + 10, 9, 58);
      // Gentle water ripple ring around each piling!
      const rp = 10 + Math.sin(t * 2.8 + px) * 4;
      ctx.strokeStyle = "rgba(248, 212, 168, 0.18)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(px + 4.5, deckY + 66, rp, 2.5, 0, 0, TAU);
      ctx.stroke();
    }

    drawMotes(ctx, t, 28, "250, 214, 152");
  }

  // =========================================================================
  // WORLD 3: 4-PLANE PARALLAX URBAN STREET (Roofs, Balconies, Cables, Curbs, Lamp Wipes)
  // =========================================================================
  function drawUrbanStreetWorld(ctx, t, scrollX, mode) {
    const isSunset = mode === "sunset";
    fillSkyGrad(ctx, isSunset
      ? [[0.0, "#241636"], [0.36, "#763a5c"], [0.64, "#e27e5e"], [0.76, "#faca86"], [0.77, "#1c1822"], [1.0, "#100f15"]]
      : [[0.0, "#141326"], [0.48, "#342748"], [0.75, "#744a5c"], [0.76, "#1d1b25"], [1.0, "#101017"]]
    );

    const gy = Math.floor(H * 0.76); // Sidewalk surface Y = 820

    if (isSunset) {
      const sg = ctx.createRadialGradient(1480, 620, 20, 1480, 620, 320);
      sg.addColorStop(0, "rgba(255, 232, 168, 0.62)");
      sg.addColorStop(1, "rgba(255, 196, 128, 0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(1480, 620, 320, 0, TAU);
      ctx.fill();
    }

    // Plane 1 (0.16x): Far misty city skyline with varied spires & bevels
    const off1 = scrollX * 0.16;
    for (let k = -2; k < 13; k++) {
      const idx = ((k % 11) + 11) % 11;
      const bx = k * 195 - (((off1 % 195) + 195) % 195);
      const bh = 185 + ((idx * 73) % 165);
      ctx.fillStyle = isSunset ? "rgba(52, 30, 56, 0.65)" : "rgba(36, 28, 50, 0.68)";
      ctx.fillRect(bx, gy - bh, 158, bh);
      if (idx % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(bx + 20, gy - bh);
        ctx.lineTo(bx + 79, gy - bh - 34);
        ctx.lineTo(bx + 138, gy - bh);
        ctx.fill();
      }
    }

    // Plane 2 (0.52x): Detailed mid-ground apartments, rooftop water tanks, balconies, shop awnings & utility cables!
    const period2 = 310;
    const baseK2 = Math.floor((scrollX * 0.52) / period2);
    const frac2 = (scrollX * 0.52) - baseK2 * period2;
    for (let i = -2; i < 9; i++) {
      const worldK = baseK2 + i;
      const bx = i * period2 - frac2;
      const seedB = Math.abs(worldK * 131 + 17);
      const bh = 255 + (seedB % 185);
      const bw = 246;
      const by = gy - bh;

      ctx.fillStyle = "#191726";
      ctx.fillRect(bx, by, bw, bh);
      // Roof cornice + rooftop AC / water tower detail
      ctx.fillStyle = "#2b253a";
      ctx.fillRect(bx - 6, by - 9, bw + 12, 12);
      ctx.fillStyle = "#211c2e";
      ctx.fillRect(bx + 28, by - 28, 44, 19);
      if (seedB % 2 === 0) {
        ctx.fillRect(bx + bw - 68, by - 38, 32, 29);
      }

      // Warm apartment windows + subtle wrought-iron balconies
      for (let wy = by + 28; wy < gy - 72; wy += 44) {
        for (let wx = bx + 22; wx < bx + bw - 34; wx += 42) {
          const lit = ((worldK * 7 + wy + Math.floor(wx - bx)) % 5);
          if (lit === 0 || lit === 2) {
            ctx.fillStyle = lit === 0 ? "rgba(246, 196, 118, 0.78)" : "rgba(228, 166, 98, 0.52)";
            ctx.fillRect(wx, wy, 20, 26);
          } else {
            ctx.fillStyle = "rgba(14, 14, 24, 0.75)";
            ctx.fillRect(wx, wy, 20, 26);
          }
        }
      }

      // Ground-floor warm cafe / convenience-store awning glow
      if (seedB % 3 !== 1) {
        ctx.fillStyle = "rgba(248, 196, 118, 0.22)";
        ctx.fillRect(bx + 24, gy - 54, bw - 48, 46);
        ctx.fillStyle = seedB % 2 === 0 ? "#6e3244" : "#344c68";
        ctx.beginPath();
        ctx.moveTo(bx + 18, gy - 58);
        ctx.lineTo(bx + bw - 18, gy - 58);
        ctx.lineTo(bx + bw - 10, gy - 44);
        ctx.lineTo(bx + 10, gy - 44);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Overhead catenary utility wire across Plane 2
    ctx.strokeStyle = "rgba(18, 16, 26, 0.75)";
    ctx.lineWidth = 2;
    const periodL = 460;
    const baseKL = Math.floor((scrollX * 0.68) / periodL);
    const fracL = (scrollX * 0.68) - baseKL * periodL;

    // Plane 3 (0.68x): Volumetric warm streetlamps + swaying leafy trees
    for (let i = -2; i < 6; i++) {
      const lx = i * periodL - fracL + 140;
      // Overhead wire sag to next pole
      ctx.beginPath();
      ctx.moveTo(lx, gy - 228);
      ctx.quadraticCurveTo(lx + periodL * 0.5, gy - 196, lx + periodL, gy - 228);
      ctx.stroke();

      // Streetlamp pole & fixture
      ctx.fillStyle = "#2b2938";
      ctx.fillRect(lx - 3.5, gy - 242, 7, 242);
      ctx.beginPath();
      ctx.moveTo(lx - 3, gy - 242);
      ctx.quadraticCurveTo(lx + 18, gy - 254, lx + 30, gy - 242);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#2b2938";
      ctx.stroke();

      // Volumetric light cone
      const cg = ctx.createLinearGradient(lx + 26, gy - 240, lx + 26, gy + 12);
      cg.addColorStop(0, "rgba(255, 224, 156, 0.32)");
      cg.addColorStop(1, "rgba(255, 224, 156, 0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(lx + 26, gy - 240);
      ctx.lineTo(lx - 95, gy + 12);
      ctx.lineTo(lx + 148, gy + 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffe8b0";
      ctx.beginPath();
      ctx.ellipse(lx + 26, gy - 240, 10, 6, 0, 0, TAU);
      ctx.fill();

      // Swaying street tree
      const tx = lx + 235;
      const sway = Math.sin(t * 2.1 + i) * 4;
      ctx.fillStyle = "#1c1621";
      ctx.fillRect(tx - 6, gy - 126, 12, 120);
      ctx.fillStyle = "rgba(34, 28, 46, 0.94)";
      ctx.beginPath();
      ctx.ellipse(tx + sway, gy - 156, 54, 46, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(48, 38, 62, 0.88)";
      ctx.beginPath();
      ctx.ellipse(tx + 8 + sway * 1.2, gy - 184, 40, 36, 0, 0, TAU);
      ctx.fill();
    }

    // Plane 4 (1.0x): Crisp paved sidewalk slabs, granite curb & dashed asphalt roadway!
    ctx.fillStyle = "#36303f";
    ctx.fillRect(-120, gy - 12, W + 240, 24);
    ctx.fillStyle = "#484054";
    ctx.fillRect(-120, gy - 12, W + 240, 4);
    // Sidewalk slab joints (proves zero-slip foot contact in S11 & S12!)
    const slabOff = ((scrollX % 96) + 96) % 96;
    ctx.strokeStyle = "rgba(20, 16, 26, 0.55)";
    ctx.lineWidth = 2;
    for (let sx = -96; sx < W + 96; sx += 96) {
      ctx.beginPath();
      ctx.moveTo(sx - slabOff, gy - 12);
      ctx.lineTo(sx - slabOff - 14, gy + 12);
      ctx.stroke();
    }

    // Asphalt road + lane dashes
    ctx.fillStyle = "#13131b";
    ctx.fillRect(-120, gy + 12, W + 240, H - gy + 80);
    const dashOff = ((scrollX % 140) + 140) % 140;
    ctx.fillStyle = "rgba(244, 198, 122, 0.28)";
    for (let dx = -140; dx < W + 140; dx += 140) {
      ctx.fillRect(dx - dashOff, gy + 92, 68, 5);
    }
  }

  function drawForegroundStreetWipe(ctx, scrollX) {
    // 1.65x foreground bokeh lamp post sweeping past camera every ~1650px for cinematic depth!
    const period = 1680;
    const fx = period - (((scrollX * 1.65) % period + period) % period) - 240;
    if (fx > -160 && fx < W + 160) {
      ctx.save();
      ctx.fillStyle = "rgba(8, 8, 14, 0.62)";
      ctx.fillRect(fx - 26, 0, 52, H);
      ctx.restore();
    }
  }

  // =========================================================================
  // WORLD 4: CABLE-STAYED SUSPENSION BRIDGE OVER SHIMMERING SUNSET RIVER (S30, S33)
  // =========================================================================
  function drawSuspensionBridgeWorld(ctx, t, scrollX) {
    fillSkyGrad(ctx, [
      [0.0, "#221433"],
      [0.34, "#74385b"],
      [0.60, "#e27a58"],
      [0.72, "#fbd08c"],
      [0.73, "#36253c"],
      [1.0, "#14111e"],
    ]);

    const gy = Math.floor(H * 0.75); // Bridge deck Y = 810

    // Glowing low sun over bay
    const sg = ctx.createRadialGradient(1420, 595, 18, 1420, 595, 310);
    sg.addColorStop(0, "rgba(255, 244, 196, 0.85)");
    sg.addColorStop(0.45, "rgba(255, 196, 128, 0.35)");
    sg.addColorStop(1, "rgba(255, 160, 110, 0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(1420, 595, 310, 0, TAU);
    ctx.fill();

    // Shimmering river below the bridge deck (y = 855..1020)
    ctx.fillStyle = "#1d1529";
    ctx.fillRect(0, gy + 48, W, H - gy);
    for (let r = 0; r < 14; r++) {
      const ry = gy + 64 + r * 11;
      const rw = 220 - r * 10;
      const rx = 1420 + Math.sin(t * 2.8 + r) * 26;
      ctx.strokeStyle = `rgba(255, 212, 152, ${0.42 - r * 0.024})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx - rw, ry);
      ctx.lineTo(rx + rw, ry);
      ctx.stroke();
    }

    // Plane 1 (0.32x): Towering Cable-Stayed Bridge Pylons & Fan Steel Stay-Cables!
    const pylonPeriod = 1280;
    const pBase = Math.floor((scrollX * 0.32) / pylonPeriod);
    const pFrac = (scrollX * 0.32) - pBase * pylonPeriod;
    for (let i = -1; i < 3; i++) {
      const px = i * pylonPeriod - pFrac + 540;
      const topY = 115;
      // Diagonal fan cables Left & Right
      ctx.strokeStyle = "rgba(42, 30, 52, 0.65)";
      ctx.lineWidth = 2.4;
      for (let c = 1; c <= 8; c++) {
        const anchorY = topY + 24 + c * 18;
        const spanX = c * 74;
        ctx.beginPath();
        ctx.moveTo(px, anchorY);
        ctx.lineTo(px - spanX, gy);
        ctx.moveTo(px, anchorY);
        ctx.lineTo(px + spanX, gy);
        ctx.stroke();
      }
      // Concrete H-tower pylon + aviation warning beacon
      ctx.fillStyle = "#261b32";
      ctx.fillRect(px - 22, topY, 44, gy - topY);
      ctx.fillRect(px - 36, topY + 180, 72, 22);
      const blink = 0.5 + 0.5 * Math.sin(t * 5.2 + i);
      ctx.fillStyle = `rgba(255, 72, 78, ${blink})`;
      ctx.beginPath();
      ctx.arc(px, topY - 4, 5, 0, TAU);
      ctx.fill();
    }

    // Plane 2 (0.75x): Bridge light poles & iron safety railing
    const rOff = ((scrollX * 0.85) % 52 + 52) % 52;
    ctx.strokeStyle = "#1c1726";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, gy - 64);
    ctx.lineTo(W, gy - 64);
    ctx.stroke();
    ctx.lineWidth = 2.6;
    for (let rx = -52; rx < W + 52; rx += 52) {
      ctx.beginPath();
      ctx.moveTo(rx - rOff, gy - 64);
      ctx.lineTo(rx - rOff, gy);
      ctx.stroke();
    }

    // Bridge concrete girder & asphalt deck
    ctx.fillStyle = "#2b2538";
    ctx.fillRect(0, gy - 8, W, 18);
    ctx.fillStyle = "#14131d";
    ctx.fillRect(0, gy + 10, W, 62);
    ctx.fillStyle = "#221c2e";
    ctx.fillRect(0, gy + 68, W, 18);
  }

  function drawForegroundBridgeCables(ctx, scrollX) {
    // Fast foreground diagonal stay-cables whipping across frame during S33 high-speed rescue!
    const period = 540;
    const off = ((scrollX * 1.55) % period + period) % period;
    ctx.save();
    ctx.strokeStyle = "rgba(12, 10, 18, 0.36)";
    ctx.lineWidth = 9;
    for (let x = -period; x < W + period; x += period) {
      const cx = x - off;
      ctx.beginPath();
      ctx.moveTo(cx + 220, 0);
      ctx.lineTo(cx - 120, H);
      ctx.stroke();
    }
    ctx.restore();
  }

  // =========================================================================
  // WORLD 5: VERTIGO HIGH-BRIDGE CLIFFHANGER PERSPECTIVE FOR S31 (Fixed Z-Order!)
  // =========================================================================
  function drawBridgeCliffBackdrop(ctx, t) {
    // High-altitude looking down past suspension bridge parapet onto shimmering river 60m below!
    fillSkyGrad(ctx, [
      [0.0, "#241638"],
      [0.34, "#6c365a"],
      [0.54, "#d67462"],
      [0.60, "#f8c68e"],
      [0.61, "#2c213b"],
      [1.0, "#120f1d"],
    ]);

    // Vast river 60m below (y = 655..1020) + distant tiny cargo barge wake showing dizzying height!
    const sunX = 1480, sunY = 648;
    const sg = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 210);
    sg.addColorStop(0, "rgba(255, 244, 206, 0.9)");
    sg.addColorStop(1, "rgba(255, 190, 130, 0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 210, 0, TAU);
    ctx.fill();

    for (let i = 0; i < 26; i++) {
      const wy = 665 + i * 13;
      const sh = Math.sin(t * 2.7 + i * 0.9) * 20;
      const sp = Math.max(24, 160 - i * 4.5);
      ctx.strokeStyle = `rgba(255, 216, 164, ${0.52 - i * 0.015})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sunX - sp + sh, wy);
      ctx.lineTo(sunX + sp + sh, wy);
      ctx.stroke();
    }

    // Tiny river barge far below to accentuate precipitous drop!
    const bx = 1360 + t * 8;
    const by = 865;
    ctx.strokeStyle = "rgba(244, 214, 178, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by + 3);
    ctx.lineTo(bx - 58, by - 9);
    ctx.moveTo(bx, by + 3);
    ctx.lineTo(bx - 58, by + 15);
    ctx.stroke();
    ctx.fillStyle = "#161222";
    ctx.fillRect(bx - 16, by - 3, 34, 7);

    // Distant bridge tower & diagonal stay-cables on left
    ctx.strokeStyle = "rgba(255, 212, 168, 0.22)";
    ctx.lineWidth = 2.5;
    for (let c = 0; c < 6; c++) {
      ctx.beginPath();
      ctx.moveTo(140, 80 + c * 32);
      ctx.lineTo(1090 - c * 115, 725);
      ctx.stroke();
    }

    // Steep cantilevered concrete bridge deck & girder underside ending at x = 1095!
    ctx.fillStyle = "#1a1526";
    ctx.beginPath();
    ctx.moveTo(0, 735);
    ctx.lineTo(1095, 735);
    ctx.lineTo(1045, 845);
    ctx.lineTo(0, 910);
    ctx.closePath();
    ctx.fill();

    // Sidewalk & curb top surface where Duoduo's tiptoe balances!
    ctx.fillStyle = "#352c45";
    ctx.beginPath();
    ctx.moveTo(0, 718);
    ctx.lineTo(1102, 718);
    ctx.lineTo(1095, 742);
    ctx.lineTo(0, 742);
    ctx.closePath();
    ctx.fill();
    // Warm sunset rim highlight on the concrete precipice edge
    ctx.strokeStyle = "#f6bc80";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 719);
    ctx.lineTo(1102, 719);
    ctx.stroke();
  }

  function drawBridgeCliffForegroundRail(ctx) {
    // Drawn AFTER Duoduo so the iron parapet railing sits IN FRONT OF her legs/skirt (ZERO z-order bug!)
    const railTop = 626;
    const railBtm = 722;
    const endX = 1088;

    ctx.save();
    ctx.strokeStyle = "#171221";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, railTop);
    ctx.lineTo(endX, railTop);
    ctx.stroke();

    // Golden sunset specular edge along top iron bar
    ctx.strokeStyle = "rgba(246, 194, 132, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, railTop - 3);
    ctx.lineTo(endX, railTop - 3);
    ctx.stroke();

    // Vertical iron balusters + end post clearly crossing in front of Duoduo's legs!
    ctx.strokeStyle = "#1d172a";
    ctx.lineWidth = 5;
    for (let rx = 44; rx < endX - 10; rx += 48) {
      ctx.beginPath();
      ctx.moveTo(rx, railTop);
      ctx.lineTo(rx, railBtm);
      ctx.stroke();
    }
    ctx.fillStyle = "#171221";
    ctx.fillRect(endX - 6, railTop - 8, 14, railBtm - railTop + 10);
    ctx.restore();
  }

  // =========================================================================
  // WORLD 6: BOKEH PLATES & BORDERLESS NAVY SCIENCE STAGE
  // =========================================================================
  function drawBokehPlate(ctx, t, kind) {
    if (kind === "strat") {
      fillSkyGrad(ctx, [[0.0, "#050a1a"], [0.52, "#0e2248"], [0.86, "#363e68"], [1.0, "#6c5072"]]);
      const orbs = [
        [240, 280, 95, "155, 220, 255", 0.16],
        [520, 640, 75, "155, 220, 255", 0.12],
        [1420, 260, 120, "185, 232, 255", 0.18],
        [1640, 590, 90, "140, 198, 250", 0.14],
      ];
      for (const [ox, oy, r, rgb, a] of orbs) {
        const dx = Math.sin(t * 0.9 + ox) * 18;
        const dy = Math.cos(t * 1.1 + oy) * 14;
        const g = ctx.createRadialGradient(ox + dx, oy + dy, 4, ox + dx, oy + dy, r);
        g.addColorStop(0, `rgba(${rgb}, ${a})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox + dx, oy + dy, r, 0, TAU);
        ctx.fill();
      }
      drawMotes(ctx, t * 2.2, 38, "195, 238, 255");
    } else if (kind === "dusk") {
      fillSkyGrad(ctx, [[0.0, "#241838"], [0.46, "#6a3a5e"], [0.68, "#d88a72"], [1.0, "#1c1528"]]);
      const orbs = [
        [320, 480, 130, "252, 206, 146", 0.22],
        [1360, 520, 185, "255, 228, 172", 0.34],
        [1620, 380, 110, "244, 168, 132", 0.20],
      ];
      for (const [ox, oy, r, rgb, a] of orbs) {
        const dx = Math.sin(t * 0.8 + ox) * 14;
        const g = ctx.createRadialGradient(ox + dx, oy, 6, ox + dx, oy, r);
        g.addColorStop(0, `rgba(${rgb}, ${a})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox + dx, oy, r, 0, TAU);
        ctx.fill();
      }
      drawMotes(ctx, t, 26, "252, 216, 154");
    } else {
      // City night bokeh (matching audit_kuov_10_704.70s.jpg!)
      fillSkyGrad(ctx, [[0.0, "#090d1e"], [0.62, "#151c36"], [1.0, "#0c0f1c"]]);
      const orbs = [
        [210, 410, 125, "244, 186, 102", 0.34],
        [395, 545, 95, "232, 168, 88", 0.26],
        [1310, 680, 135, "244, 186, 102", 0.30],
        [1630, 360, 115, "138, 188, 248", 0.22],
        [1510, 165, 92, "238, 244, 255", 0.38],
      ];
      for (const [ox, oy, r, rgb, a] of orbs) {
        const dx = Math.sin(t * 0.75 + ox * 0.01) * 16;
        const g = ctx.createRadialGradient(ox + dx, oy, 5, ox + dx, oy, r);
        g.addColorStop(0, `rgba(${rgb}, ${a})`);
        g.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox + dx, oy, r, 0, TAU);
        ctx.fill();
      }
      drawMotes(ctx, t, 22, "225, 205, 168");
    }
  }

  function drawNavyScienceStage(ctx, t) {
    fillSkyGrad(ctx, [
      [0.0, "#050914"],
      [0.5, "#0a1326"],
      [1.0, "#050811"],
    ]);
    // Subtle drifting scientific grid + radial center glow
    const cg = ctx.createRadialGradient(W * 0.5, H * 0.5, 40, W * 0.5, H * 0.5, 760);
    cg.addColorStop(0, "rgba(38, 72, 128, 0.16)");
    cg.addColorStop(1, "rgba(10, 18, 36, 0)");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);

    const drift = (t * 14) % 64;
    ctx.strokeStyle = "rgba(64, 104, 168, 0.085)";
    ctx.lineWidth = 1;
    for (let gx = -64; gx < W + 64; gx += 64) {
      ctx.beginPath();
      ctx.moveTo(gx - drift, 0);
      ctx.lineTo(gx - drift, H);
      ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 64) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
  }

  window.StickmanWorlds = {
    W,
    H,
    LAKE_HY,
    withCamera,
    fillSkyGrad,
    drawGlowPolyline,
    drawMotes,
    applyCinemaGradeAndGrain,
    drawBedroomWorld,
    drawDuskLakeWorld,
    drawUrbanStreetWorld,
    drawForegroundStreetWipe,
    drawSuspensionBridgeWorld,
    drawForegroundBridgeCables,
    drawBridgeCliffBackdrop,
    drawBridgeCliffForegroundRail,
    drawBokehPlate,
    drawNavyScienceStage,
  };
})();
