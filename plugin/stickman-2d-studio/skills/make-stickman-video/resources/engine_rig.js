/* V3 Master-Tier Vector Stickman & Vehicle Rig Engine (Zero-Artifact Alpha-Masked Rim Light + Blinking + Hoodie Drawstrings + Contact Poses) */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function easeOutCubic(x) {
    x = clamp(x, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  }
  function easeInOutCubic(x) {
    x = clamp(x, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) * 0.5;
  }
  function easeOutBack(x, s) {
    if (s === undefined) s = 1.35;
    x = clamp(x, 0, 1);
    const c3 = s + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  }

  // Deterministic hash & natural blink curve (ZERO Math.random!)
  function hash11(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function getBlinkClose(t, seed) {
    const period = 3.1 + (seed % 5) * 0.23;
    const cyc = Math.floor((t + seed * 0.71) / period);
    const offset = 0.35 + hash11(cyc * 13.7 + seed) * (period - 0.7);
    const dt = (t + seed * 0.71) - cyc * period - offset;
    const halfDur = 0.072;
    if (Math.abs(dt) >= halfDur) return 0;
    return Math.cos((dt / halfDur) * (Math.PI * 0.5));
  }

  // Pooled offscreen canvases for zero-GC alpha-masked silhouette rim lighting!
  const BUF_W = 520;
  const BUF_H = 600;
  const bodyCanvas = document.createElement("canvas");
  bodyCanvas.width = BUF_W;
  bodyCanvas.height = BUF_H;
  const bodyCtx = bodyCanvas.getContext("2d");

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = BUF_W;
  maskCanvas.height = BUF_H;
  const maskCtx = maskCanvas.getContext("2d");

  const rimCanvas = document.createElement("canvas");
  rimCanvas.width = BUF_W;
  rimCanvas.height = BUF_H;
  const rimCtx = rimCanvas.getContext("2d");

  function drawRoundedQuad(ctx, p0, p1, p2, p3) {
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Computes 2-segment limb joint & end coordinates + draws smooth curved/jointed limb.
   */
  function drawLimbVector(ctx, x0, y0, a1Deg, a2Deg, l1, l2, wPx, facing, hasFoot, shoeColor) {
    const r1 = a1Deg * DEG;
    const r2 = a2Deg * DEG;
    const x1 = x0 + Math.sin(r1) * l1;
    const y1 = y0 + Math.cos(r1) * l1;
    const x2 = x1 + Math.sin(r2) * l2;
    const y2 = y1 + Math.cos(r2) * l2;

    ctx.save();
    ctx.strokeStyle = "#0b0d14";
    ctx.lineWidth = wPx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (hasFoot) {
      const footLen = 15.5;
      const footAngle = r2 * 0.25;
      const fx = x2 + Math.cos(footAngle) * footLen * facing;
      const fy = y2 - Math.sin(footAngle) * footLen * 0.25;
      ctx.lineWidth = wPx * 0.96;
      ctx.strokeStyle = shoeColor || "#0b0d14";
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      // Subtle crisp sneaker/shoe sole highlight
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = "rgba(244, 241, 234, 0.34)";
      ctx.beginPath();
      ctx.moveTo(x2 - 2 * facing, fy + wPx * 0.42);
      ctx.lineTo(fx + 2 * facing, fy + wPx * 0.42);
      ctx.stroke();
    }
    ctx.restore();
    return { jx: x1, jy: y1, ex: x2, ey: y2 };
  }

  /**
   * Draws a top-tier @IfverseTales / KuovIUmGS_A vector character with:
   *   - Mathematically masked silhouette rim light (ZERO detached joint lines!)
   *   - Hoodie drawstrings, swaying ponytails, eyeglasses/goggles, cane ground-contact
   *   - Directional pupil/eye gaze + natural blinking
   */
  function drawActorV3(ctx, opts) {
    const cx = opts.x || 960;
    const cy = opts.y || 540;
    const scale = opts.scale === undefined ? 1.0 : opts.scale;
    const shirt = opts.shirt || "#3e82c4";
    const rim = opts.rim || "#f6bc80";
    const rimSide = opts.rimSide === undefined ? 1 : opts.rimSide;
    const facing = opts.facing === undefined ? 1 : opts.facing;
    const hair = opts.hair || "hoodie"; // hoodie | ponytail | bun | spiky | cap | helmet | suit
    const mood = opts.mood || "curious";
    const pose = opts.pose || "stand";
    const phase = opts.phase || 0;
    const t = opts.t === undefined ? phase : opts.t;
    const tiltDeg = opts.tiltDeg || 0;
    const headNodDeg = opts.headNodDeg || 0;
    const squashX = opts.squashX === undefined ? 1.0 : opts.squashX;
    const squashY = opts.squashY === undefined ? 1.0 : opts.squashY;
    const lookX = opts.lookX || 0;
    const lookY = opts.lookY || 0;
    const crackedGoggle = !!opts.crackedGoggle;
    const chestGlow = opts.chestGlow || null;
    const cane = !!opts.cane;
    const clipboard = !!opts.clipboard;
    const seed = opts.seed === undefined ? 1 : opts.seed;
    const pushPhase = opts.pushPhase || 0; // 0..1 for car_push contact!

    bodyCtx.clearRect(0, 0, BUF_W, BUF_H);
    const ox = BUF_W * 0.5;
    let oy = BUF_H * 0.54;
    const f = facing >= 0 ? 1 : -1;

    // 1. Pose Kinematics (angles in degrees clockwise from +Y downward)
    let bob = 0;
    let la1 = -18, la2 = -10, ra1 = 18, ra2 = 10;
    let ll1 = -8, ll2 = 0, rl1 = 8, rl2 = 0;
    let torsoLean = 0;

    if (pose === "walk_ik" || pose === "run_ik") {
      const isRun = pose === "run_ik";
      const amp = isRun ? 40 : 25;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      bob = -Math.abs(c) * (isRun ? 10 : 4.5);
      torsoLean = (isRun ? 14 : 3) * f;
      ll1 = amp * s * f;
      ll2 = ll1 - (s * f < 0 ? 28 : 5) * f;
      rl1 = -amp * s * f;
      rl2 = rl1 - (-s * f < 0 ? 28 : 5) * f;
      la1 = -amp * 0.85 * s * f;
      la2 = la1 + 24 * f;
      ra1 = amp * 0.85 * s * f;
      ra2 = ra1 + 24 * f;
    } else if (pose === "float") {
      const s = Math.sin(phase * 2.5);
      bob = s * 6;
      la1 = -48 + 9 * s; la2 = -22 + 6 * s;
      ra1 = 48 - 9 * s; ra2 = 22 - 6 * s;
      ll1 = -16 + 5 * s; ll2 = -28 + 4 * s;
      rl1 = 18 - 5 * s; rl2 = 6 - 4 * s;
    } else if (pose === "panic_grab") {
      const s = Math.sin(phase * 13);
      la1 = -125 + 26 * s; la2 = -152 + 18 * s;
      ra1 = 108 - 26 * s; ra2 = 138 - 18 * s;
      ll1 = -34 + 22 * s; ll2 = -58;
      rl1 = 38 - 22 * s; rl2 = 10;
    } else if (pose === "dogpaddle") {
      const s = Math.sin(phase * 14);
      const c = Math.cos(phase * 14);
      la1 = (68 + 34 * s) * f; la2 = (108 + 26 * c) * f;
      ra1 = (82 - 34 * s) * f; ra2 = (120 - 26 * c) * f;
      ll1 = (-58 + 26 * c) * f; ll2 = (-88 + 15 * s) * f;
      rl1 = (-44 - 26 * c) * f; rl2 = (-76 - 15 * s) * f;
    } else if (pose === "charge") {
      bob = 12;
      torsoLean = 12 * f;
      la1 = -46 * f; la2 = 34 * f;
      ra1 = 42 * f; ra2 = 95 * f;
      ll1 = -32 * f; ll2 = 24 * f;
      rl1 = 28 * f; rl2 = -22 * f;
    } else if (pose === "rocket") {
      la1 = -148; la2 = -172;
      ra1 = 148; ra2 = 172;
      ll1 = -6; ll2 = -2;
      rl1 = 6; rl2 = 2;
    } else if (pose === "reach_up") {
      const s = Math.sin(phase * 4);
      la1 = (-32 + 5 * s) * f; la2 = -14 * f;
      ra1 = (154 + 4 * s) * f; ra2 = 172 * f;
      ll1 = -14 * f; ll2 = -22 * f;
      rl1 = 18 * f; rl2 = 8 * f;
    } else if (pose === "railing_tip") {
      // Precariously tipping over bridge railing on one tiptoe!
      const s = Math.sin(phase * 5.5);
      torsoLean = 26 * f;
      la1 = (-45 + 12 * s) * f; la2 = -75 * f;
      ra1 = (138 + 6 * s) * f; ra2 = 158 * f;
      ll1 = (-42 + 8 * s) * f; ll2 = -64 * f; // Back leg lifted in air!
      rl1 = 12 * f; rl2 = 18 * f; // Front foot tiptoeing on curb!
    } else if (pose === "tumble") {
      const s = Math.sin(phase * 6.5);
      la1 = -118 + 30 * s; la2 = -88;
      ra1 = 114 - 30 * s; ra2 = 86;
      ll1 = -38 + 20 * s; ll2 = -62;
      rl1 = 42 - 20 * s; rl2 = 14;
    } else if (pose === "cruise") {
      const s = Math.sin(phase * 4.5) * 4;
      la1 = (74 + s) * f; la2 = 92 * f;
      ra1 = (60 - s) * f; ra2 = 78 * f;
      ll1 = (-72 + s) * f; ll2 = -84 * f;
      rl1 = (-62 - s) * f; rl2 = -74 * f;
    } else if (pose === "smack") {
      la1 = -142; la2 = -160;
      ra1 = 132; ra2 = 154;
      ll1 = -38; ll2 = -12;
      rl1 = 40; rl2 = 24;
    } else if (pose === "car_push") {
      // Real physical contact push cycle: 0..0.36 palm + boot press car roof; 0.36..1.0 powerful kick-glide!
      const contact = pushPhase < 0.38 ? Math.sin((pushPhase / 0.38) * Math.PI) : 0;
      bob = contact * 22 - (1 - contact) * 8;
      torsoLean = lerp(38, 26, contact) * f;
      ra1 = lerp(55, 16, contact) * f;
      ra2 = lerp(85, 8, contact) * f; // Front hand reaches straight down to touch car roof!
      la1 = lerp(-68, -28, contact) * f;
      la2 = lerp(-92, -48, contact) * f;
      rl1 = lerp(24, 6, contact) * f;
      rl2 = lerp(-18, 4, contact) * f; // Front boot pushes off roof!
      ll1 = lerp(-64, -30, contact) * f;
      ll2 = lerp(-86, -52, contact) * f;
    } else if (pose === "embrace_hero") {
      // Warm forward-leaning hug wrapping arms around Duoduo!
      torsoLean = 16 * f;
      bob = 8;
      la1 = 56 * f; la2 = 82 * f;
      ra1 = 48 * f; ra2 = 76 * f;
      ll1 = -16 * f; ll2 = 8 * f;
      rl1 = 22 * f; rl2 = -6 * f;
    } else if (pose === "embrace_child") {
      torsoLean = 14 * f;
      la1 = 62 * f; la2 = 95 * f;
      ra1 = 54 * f; ra2 = 88 * f;
      ll1 = -8 * f; ll2 = 0;
      rl1 = 10 * f; rl2 = 0;
    } else if (pose === "chill_glide") {
      const s = Math.sin(phase * 2.4) * 5;
      torsoLean = 14 * f;
      la1 = (-24 + s) * f; la2 = 12 * f;
      ra1 = (26 - s) * f; ra2 = 42 * f;
      ll1 = -14 * f; ll2 = -24 * f;
      rl1 = 12 * f; rl2 = -8 * f;
    } else if (pose === "wave") {
      const s = Math.sin(phase * 8.5);
      la1 = -16 * f; la2 = -8 * f;
      ra1 = 135 * f; ra2 = (158 + 22 * s) * f;
      ll1 = -7; ll2 = 0;
      rl1 = 7; rl2 = 0;
    }

    oy += bob;
    const lw = 12.2;
    const hipY = oy + 16;
    const shY = oy - 58;
    const shX = ox + Math.sin(torsoLean * DEG) * 14;

    // 2. Draw Back Limb Layer onto bodyCtx
    drawLimbVector(bodyCtx, ox - 9 * f, hipY, ll1, ll2, 43, 43, lw, f, true);
    drawLimbVector(bodyCtx, shX - 14 * f, shY + 5, la1, la2, 35, 33, lw * 0.88, f, false);

    // 3. Draw Rounded Tapered Torso
    const wTop = 19.5;
    const wBot = hair === "ponytail" ? 28.5 : (hair === "bun" ? 25 : 23);
    bodyCtx.fillStyle = shirt;
    drawRoundedQuad(
      bodyCtx,
      [shX - wTop, shY - 4],
      [shX + wTop, shY - 4],
      [ox + wBot, hipY + 9],
      [ox - wBot, hipY + 9]
    );
    bodyCtx.beginPath();
    bodyCtx.ellipse(shX, shY - 3, wTop, 10, 0, 0, TAU);
    bodyCtx.fill();
    bodyCtx.beginPath();
    bodyCtx.ellipse(ox, hipY + 8, wBot, 6, 0, 0, TAU);
    bodyCtx.fill();

    // Suit / Police / Hoodie Collar & Drawstrings (@IfverseTales signature craft!)
    if (hair === "suit") {
      bodyCtx.fillStyle = "#f4f3ef";
      bodyCtx.beginPath();
      bodyCtx.moveTo(shX - 8, shY - 6);
      bodyCtx.lineTo(shX + 8, shY - 6);
      bodyCtx.lineTo(shX + 1, shY + 22);
      bodyCtx.closePath();
      bodyCtx.fill();
      bodyCtx.strokeStyle = "#d93842";
      bodyCtx.lineWidth = 4.5;
      bodyCtx.beginPath();
      bodyCtx.moveTo(shX, shY - 1);
      bodyCtx.lineTo(shX + 1, shY + 28);
      bodyCtx.stroke();
    } else if (hair === "cap") {
      // Officer Chen golden star badge on chest!
      bodyCtx.fillStyle = "#f4c476";
      bodyCtx.beginPath();
      bodyCtx.arc(shX + 9 * f, shY + 14, 5.5, 0, TAU);
      bodyCtx.fill();
    } else if (hair === "hoodie" || hair === "helmet") {
      // Swaying white hoodie drawstrings with aglet tips!
      const sway = Math.sin(phase * 4.2 + cx * 0.01) * 5.5 - torsoLean * 0.22;
      bodyCtx.save();
      bodyCtx.strokeStyle = "rgba(246, 244, 238, 0.92)";
      bodyCtx.lineWidth = 2.8;
      bodyCtx.lineCap = "round";
      for (const dxC of [-5.5, 5.5]) {
        const sx0 = shX + dxC + 4 * f;
        const sy0 = shY + 2;
        const lenC = dxC < 0 ? 24 : 20;
        bodyCtx.beginPath();
        bodyCtx.moveTo(sx0, sy0);
        bodyCtx.quadraticCurveTo(sx0 + sway * 0.6, sy0 + lenC * 0.55, sx0 + sway, sy0 + lenC);
        bodyCtx.stroke();
      }
      bodyCtx.restore();
    }

    if (chestGlow) {
      const grad = bodyCtx.createRadialGradient(shX, oy - 22, 2, shX, oy - 22, 34);
      grad.addColorStop(0, chestGlow);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      bodyCtx.fillStyle = grad;
      bodyCtx.beginPath();
      bodyCtx.arc(shX, oy - 22, 34, 0, TAU);
      bodyCtx.fill();
    }

    // 4. Front Leg & Front Arm
    const frontFoot = drawLimbVector(bodyCtx, ox + 9 * f, hipY, rl1, rl2, 43, 43, lw, f, true);
    const frontHand = drawLimbVector(bodyCtx, shX + 14 * f, shY + 5, ra1, ra2, 35, 33, lw * 0.88, f, false);

    // Cane with true ground-contact angle (pivots from hand down to ground plane hipY + 86!)
    if (cane) {
      const groundY = hipY + 86 - bob * 0.85;
      const tipX = frontHand.ex + 16 * f;
      bodyCtx.save();
      bodyCtx.strokeStyle = "#b58352";
      bodyCtx.lineWidth = 5.5;
      bodyCtx.lineCap = "round";
      bodyCtx.beginPath();
      bodyCtx.moveTo(frontHand.ex - 5 * f, frontHand.ey - 4);
      bodyCtx.quadraticCurveTo(frontHand.ex + 4 * f, frontHand.ey - 9, frontHand.ex + 7 * f, frontHand.ey + 2);
      bodyCtx.lineTo(tipX, groundY);
      bodyCtx.stroke();
      // Rubber cane ferrule tip
      bodyCtx.fillStyle = "#2b242c";
      bodyCtx.beginPath();
      bodyCtx.arc(tipX, groundY, 3.8, 0, TAU);
      bodyCtx.fill();
      bodyCtx.restore();
    }

    if (clipboard) {
      bodyCtx.save();
      bodyCtx.translate(frontHand.ex + 6 * f, frontHand.ey + 4);
      bodyCtx.rotate(-14 * f * DEG);
      bodyCtx.fillStyle = "#e6b86a";
      bodyCtx.fillRect(-13, -18, 26, 36);
      bodyCtx.fillStyle = "#faf6ee";
      bodyCtx.fillRect(-10, -13, 20, 28);
      bodyCtx.fillStyle = "#555";
      bodyCtx.fillRect(-6, -19, 12, 5);
      bodyCtx.restore();
    }

    // 5. Head & Dynamic Secondary-Motion Hair Silhouette
    const hr = 41.5;
    const hx = shX + Math.sin(torsoLean * DEG) * 6;
    const hy = shY - hr - 8;

    bodyCtx.save();
    bodyCtx.translate(hx, hy);
    bodyCtx.rotate(headNodDeg * DEG);

    if (hair === "ponytail") {
      // Dynamic secondary-motion ponytail lagging behind movement!
      const lag = Math.sin(phase * 5.2 - 0.9) * 10;
      const px = -(hr - 4) * f;
      bodyCtx.fillStyle = "#0b0d14";
      bodyCtx.beginPath();
      bodyCtx.moveTo(px, -16);
      bodyCtx.bezierCurveTo(px - 28 * f, -34 + lag * 0.4, px - 46 * f, 4 + lag, px - 26 * f, 36 + lag);
      bodyCtx.bezierCurveTo(px - 10 * f, 24 + lag * 0.5, px - 8 * f, 0, px, -6);
      bodyCtx.closePath();
      bodyCtx.fill();
      // Red hair tie ribbon
      bodyCtx.fillStyle = "#e64852";
      bodyCtx.beginPath();
      bodyCtx.arc(px - 3 * f, -11, 5.5, 0, TAU);
      bodyCtx.fill();
    } else if (hair === "bun") {
      // Silver-grey grandma hair bun + warm wooden hairpin
      bodyCtx.fillStyle = "#cfd3df";
      bodyCtx.beginPath();
      bodyCtx.arc(-22 * f, -hr + 4, 17, 0, TAU);
      bodyCtx.fill();
      bodyCtx.strokeStyle = "#d89c60";
      bodyCtx.lineWidth = 3.2;
      bodyCtx.beginPath();
      bodyCtx.moveTo(-36 * f, -hr - 6);
      bodyCtx.lineTo(-8 * f, -hr + 12);
      bodyCtx.stroke();
    } else if (hair === "spiky") {
      bodyCtx.fillStyle = "#0b0d14";
      for (const ang of [-42, -14, 14, 38]) {
        const r = (ang - 90) * DEG;
        bodyCtx.beginPath();
        bodyCtx.moveTo(Math.cos(r - 0.28) * (hr - 4), Math.sin(r - 0.28) * (hr - 4));
        bodyCtx.lineTo(Math.cos(r) * (hr + 21), Math.sin(r) * (hr + 21));
        bodyCtx.lineTo(Math.cos(r + 0.28) * (hr - 4), Math.sin(r + 0.28) * (hr - 4));
        bodyCtx.closePath();
        bodyCtx.fill();
      }
    } else if (hair === "hoodie") {
      // Subtle expressive hair tuft on Hero's forehead/crown
      const swayH = Math.sin(phase * 3.8) * 3;
      bodyCtx.fillStyle = "#0b0d14";
      bodyCtx.beginPath();
      bodyCtx.moveTo(-6 * f, -hr + 3);
      bodyCtx.quadraticCurveTo(6 * f, -hr - 14 + swayH, 18 * f, -hr - 6 + swayH);
      bodyCtx.quadraticCurveTo(10 * f, -hr + 2, 4 * f, -hr + 5);
      bodyCtx.fill();
    }

    // Matte-obsidian round head
    bodyCtx.fillStyle = "#0b0d14";
    bodyCtx.beginPath();
    bodyCtx.arc(0, 0, hr, 0, TAU);
    bodyCtx.fill();
    bodyCtx.restore();

    // 6. PURE ALPHA-MASKED CRESCENT RIM LIGHT (Zero detached joint artifacts!)
    const rimDx = 4.2 * (rimSide >= 0 ? 1 : -1);
    const rimDy = -1.8;
    maskCtx.clearRect(0, 0, BUF_W, BUF_H);
    maskCtx.drawImage(bodyCanvas, 0, 0);

    rimCtx.clearRect(0, 0, BUF_W, BUF_H);
    rimCtx.globalCompositeOperation = "source-over";
    rimCtx.drawImage(maskCanvas, 0, 0);
    rimCtx.globalCompositeOperation = "destination-out";
    rimCtx.drawImage(maskCanvas, -rimDx, -rimDy);
    // Tint remaining outer crescent with rim color!
    rimCtx.globalCompositeOperation = "source-in";
    rimCtx.fillStyle = rim;
    rimCtx.fillRect(0, 0, BUF_W, BUF_H);
    rimCtx.globalCompositeOperation = "source-over";

    bodyCtx.save();
    bodyCtx.globalCompositeOperation = "source-atop";
    bodyCtx.globalAlpha = 0.92;
    bodyCtx.drawImage(rimCanvas, 0, 0);
    bodyCtx.restore();

    // 7. Crisp Facial Expressions, Gaze Tracking, Blinking & Headgear (drawn ABOVE rim light!)
    bodyCtx.save();
    bodyCtx.translate(hx, hy);
    bodyCtx.rotate(headNodDeg * DEG);

    const exOff = 9 * f + clamp(lookX, -8, 8);
    const eyOff = -2 + clamp(lookY, -7, 7);
    const elx = -13.5 + exOff;
    const erx = 13.5 + exOff;
    const er = 6.6;
    const blink = (mood === "blackout" || mood === "dizzy" || mood === "hug_warm") ? 0 : getBlinkClose(t, seed);
    const eyeScaleY = clamp(1 - blink * 0.92, 0.08, 1);

    bodyCtx.fillStyle = "#faf8f2";
    bodyCtx.strokeStyle = "#faf8f2";
    bodyCtx.lineCap = "round";

    if (mood === "hug_warm") {
      // Peaceful warm curved closed eyes + gentle smile
      bodyCtx.lineWidth = 3.6;
      for (const ex of [elx, erx]) {
        bodyCtx.beginPath();
        bodyCtx.arc(ex, eyOff + 3, 7, Math.PI * 1.15, Math.PI * 1.85);
        bodyCtx.stroke();
      }
      bodyCtx.beginPath();
      bodyCtx.arc(exOff, eyOff + 11, 8.5, 0.15 * Math.PI, 0.85 * Math.PI);
      bodyCtx.stroke();
    } else if (mood === "blackout") {
      bodyCtx.strokeStyle = "rgba(210, 216, 228, 0.82)";
      bodyCtx.lineWidth = 3.6;
      for (const ex of [elx, erx]) {
        bodyCtx.beginPath();
        bodyCtx.moveTo(ex - 7.5, eyOff + 1);
        bodyCtx.lineTo(ex + 7.5, eyOff + 1);
        bodyCtx.stroke();
      }
    } else if (mood === "dizzy") {
      bodyCtx.lineWidth = 3.3;
      for (const ex of [elx, erx]) {
        bodyCtx.beginPath();
        bodyCtx.moveTo(ex - 6, eyOff - 6);
        bodyCtx.lineTo(ex + 6, eyOff + 6);
        bodyCtx.moveTo(ex - 6, eyOff + 6);
        bodyCtx.lineTo(ex + 6, eyOff - 6);
        bodyCtx.stroke();
      }
      bodyCtx.beginPath();
      bodyCtx.arc(exOff, eyOff + 16, 5, 0, TAU);
      bodyCtx.stroke();
    } else {
      const rBoost = mood === "amazed" ? 1.24 : 1.0;
      const rx = er * rBoost;
      const ry = er * rBoost * (mood === "strain" || mood === "focused" ? 0.8 : 1.0) * eyeScaleY;
      for (const ex of [elx, erx]) {
        bodyCtx.beginPath();
        bodyCtx.ellipse(ex, eyOff, rx, ry, 0, 0, TAU);
        bodyCtx.fill();
        // Dark expressive pupil + tiny catchlight when eyes open!
        if (eyeScaleY > 0.45) {
          bodyCtx.fillStyle = "#121521";
          bodyCtx.beginPath();
          bodyCtx.arc(ex + clamp(lookX * 0.35, -2.5, 2.5) + 1.1 * f, eyOff + clamp(lookY * 0.35, -2.2, 2.2), rx * 0.44, 0, TAU);
          bodyCtx.fill();
          bodyCtx.fillStyle = "#ffffff";
          bodyCtx.beginPath();
          bodyCtx.arc(ex - 1.5, eyOff - 1.8, rx * 0.2, 0, TAU);
          bodyCtx.fill();
          bodyCtx.fillStyle = "#faf8f2";
        }
      }

      // Eyebrows & Mouth per mood
      bodyCtx.lineWidth = 3.5;
      if (mood === "amazed") {
        bodyCtx.beginPath();
        bodyCtx.arc(elx, eyOff - 9, 8, Math.PI * 1.15, Math.PI * 1.85);
        bodyCtx.stroke();
        bodyCtx.beginPath();
        bodyCtx.arc(erx, eyOff - 9, 8, Math.PI * 1.15, Math.PI * 1.85);
        bodyCtx.stroke();
        bodyCtx.beginPath();
        bodyCtx.ellipse(exOff, eyOff + 16, 5, 6.2, 0, 0, TAU);
        bodyCtx.stroke();
      } else if (mood === "happy") {
        bodyCtx.beginPath();
        bodyCtx.arc(exOff, eyOff + 8, 9.5, 0.12 * Math.PI, 0.88 * Math.PI);
        bodyCtx.stroke();
      } else if (mood === "strain" || mood === "focused") {
        bodyCtx.beginPath();
        bodyCtx.moveTo(elx - 8, eyOff - 13);
        bodyCtx.lineTo(elx + 7, eyOff - 8);
        bodyCtx.moveTo(erx - 7, eyOff - 8);
        bodyCtx.lineTo(erx + 8, eyOff - 13);
        bodyCtx.stroke();
        bodyCtx.beginPath();
        bodyCtx.moveTo(exOff - 7.5, eyOff + 15);
        bodyCtx.lineTo(exOff + 7.5, eyOff + 14);
        bodyCtx.stroke();
        if (mood === "strain") {
          const sw = (t * 2.4) % 1;
          bodyCtx.fillStyle = `rgba(138, 218, 255, ${(1 - sw) * 0.92})`;
          bodyCtx.beginPath();
          bodyCtx.ellipse(-hr * 0.72 * f, -10 + sw * 18, 4.2, 6.8, 0.2 * f, 0, TAU);
          bodyCtx.fill();
        }
      } else if (mood === "sad") {
        bodyCtx.beginPath();
        bodyCtx.moveTo(elx - 8, eyOff - 8);
        bodyCtx.lineTo(elx + 6, eyOff - 14);
        bodyCtx.moveTo(erx - 6, eyOff - 14);
        bodyCtx.lineTo(erx + 8, eyOff - 8);
        bodyCtx.stroke();
        bodyCtx.beginPath();
        bodyCtx.arc(exOff, eyOff + 21, 8, Math.PI * 1.15, Math.PI * 1.85);
        bodyCtx.stroke();
      } else if (mood === "freeze") {
        bodyCtx.strokeStyle = "#dcf4ff";
        bodyCtx.beginPath();
        bodyCtx.moveTo(elx - 8, eyOff - 9);
        bodyCtx.lineTo(elx + 6, eyOff - 15);
        bodyCtx.moveTo(erx - 6, eyOff - 15);
        bodyCtx.lineTo(erx + 8, eyOff - 9);
        bodyCtx.stroke();
        // Shivering wavy mouth
        bodyCtx.beginPath();
        bodyCtx.moveTo(exOff - 11, eyOff + 15);
        bodyCtx.lineTo(exOff - 4, eyOff + 12);
        bodyCtx.lineTo(exOff + 3, eyOff + 16);
        bodyCtx.lineTo(exOff + 11, eyOff + 12);
        bodyCtx.stroke();
        // Frost icicles under chin
        bodyCtx.fillStyle = "rgba(168, 232, 255, 0.9)";
        for (const ix of [-15, -2, 11]) {
          bodyCtx.beginPath();
          bodyCtx.moveTo(ix, hr - 5);
          bodyCtx.lineTo(ix + 7, hr - 5);
          bodyCtx.lineTo(ix + 3.5, hr + 14);
          bodyCtx.closePath();
          bodyCtx.fill();
        }
      } else {
        // curious / calm
        bodyCtx.beginPath();
        bodyCtx.moveTo(exOff - 6, eyOff + 14);
        bodyCtx.lineTo(exOff + 6, eyOff + 14);
        bodyCtx.stroke();
      }
    }

    // Grandma round eyeglasses
    if (hair === "bun") {
      bodyCtx.strokeStyle = "rgba(244, 206, 138, 0.85)";
      bodyCtx.lineWidth = 2.4;
      bodyCtx.beginPath();
      bodyCtx.arc(elx, eyOff, 10, 0, TAU);
      bodyCtx.stroke();
      bodyCtx.beginPath();
      bodyCtx.arc(erx, eyOff, 10, 0, TAU);
      bodyCtx.stroke();
      bodyCtx.beginPath();
      bodyCtx.moveTo(elx + 10, eyOff);
      bodyCtx.lineTo(erx - 10, eyOff);
      bodyCtx.stroke();
    }

    // Helmet & Aviator Goggles / Police Cap
    if (hair === "helmet") {
      bodyCtx.fillStyle = "#d93842";
      bodyCtx.beginPath();
      bodyCtx.arc(0, -3, hr + 4.5, Math.PI * 0.96, Math.PI * 2.04);
      bodyCtx.fill();
      // Gloss highlight arc on red helmet
      bodyCtx.strokeStyle = "rgba(255, 225, 220, 0.55)";
      bodyCtx.lineWidth = 4;
      bodyCtx.beginPath();
      bodyCtx.arc(0, -3, hr - 3, Math.PI * 1.18, Math.PI * 1.62);
      bodyCtx.stroke();
      // Aviator goggles
      for (const gx of [elx, erx]) {
        bodyCtx.fillStyle = "rgba(135, 215, 255, 0.36)";
        bodyCtx.strokeStyle = "#f4c476";
        bodyCtx.lineWidth = 3.2;
        bodyCtx.beginPath();
        bodyCtx.arc(gx, eyOff - 1, 11.2, 0, TAU);
        bodyCtx.fill();
        bodyCtx.stroke();
      }
      if (crackedGoggle) {
        bodyCtx.strokeStyle = "#ffffff";
        bodyCtx.lineWidth = 2.4;
        bodyCtx.beginPath();
        bodyCtx.moveTo(erx - 7, eyOff - 9);
        bodyCtx.lineTo(erx + 1, eyOff - 1);
        bodyCtx.lineTo(erx + 8, eyOff + 7);
        bodyCtx.moveTo(erx + 1, eyOff - 1);
        bodyCtx.lineTo(erx + 8, eyOff - 6);
        bodyCtx.stroke();
      }
    } else if (hair === "cap") {
      bodyCtx.fillStyle = "#223668";
      bodyCtx.beginPath();
      bodyCtx.moveTo(-43, -hr + 9);
      bodyCtx.lineTo(43, -hr + 9);
      bodyCtx.lineTo(32, -hr - 19);
      bodyCtx.lineTo(-32, -hr - 19);
      bodyCtx.closePath();
      bodyCtx.fill();
      bodyCtx.fillStyle = "#101628";
      bodyCtx.fillRect(-44 + (f > 0 ? 0 : -10), -hr + 6, 98, 8);
      bodyCtx.fillStyle = "#f4c476";
      bodyCtx.beginPath();
      bodyCtx.arc(0, -hr - 6, 5.5, 0, TAU);
      bodyCtx.fill();
    }
    bodyCtx.restore();

    // 8. Composite onto target Canvas with scale, squash & rotation!
    ctx.save();
    ctx.translate(cx, cy);
    if (Math.abs(tiltDeg) > 0.1) ctx.rotate(tiltDeg * DEG);
    ctx.scale(scale * squashX, scale * squashY);
    ctx.drawImage(bodyCanvas, -ox, -(BUF_H * 0.54));
    ctx.restore();
  }

  /**
   * Draws a rich, detailed urban sedan / SUV / taxi (wheels, arches, tinted glass, sky reflection,
   * interior driver silhouette, headlight cone, brake glow, suspension squash & optional open-window clip!)
   */
  function drawDetailedVehicle(ctx, opts) {
    const x = opts.x || 0;
    const y = opts.y || 760; // Road tire-contact Y!
    const kind = opts.kind || "sedan"; // sedan | suv | taxi
    const bodyCol = opts.color || "#3b334c";
    const rimCol = opts.rim || "#f6bc80";
    const compY = opts.compY || 0; // Positive = suspension squashes car body downward!
    const wheelSpin = opts.wheelSpin || 0;
    const t = opts.t || 0;
    const exhaust = opts.exhaust !== false;

    const w = kind === "suv" ? 268 : 248;
    const chH = kind === "suv" ? 56 : 48;
    const cabH = kind === "suv" ? 44 : 38;
    const wheelR = 23;
    const baseBtm = y - wheelR * 0.55 + compY;
    const chassisTop = baseBtm - chH;
    const roofTop = chassisTop - cabH;

    ctx.save();

    // 1. Soft road contact shadow underneath car
    ctx.fillStyle = "rgba(6, 6, 12, 0.55)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + 4, w * 0.52, 8, 0, 0, TAU);
    ctx.fill();

    // 2. Drifting exhaust puffs behind rear bumper
    if (exhaust) {
      for (let i = 0; i < 3; i++) {
        const ep = ((t * 0.9 + i * 0.33 + x * 0.001) % 1);
        const exX = x - 10 - ep * 36;
        const exY = baseBtm - 8 - ep * 22;
        ctx.fillStyle = `rgba(198, 190, 212, ${(1 - ep) * 0.22})`;
        ctx.beginPath();
        ctx.arc(exX, exY, 6 + ep * 12, 0, TAU);
        ctx.fill();
      }
    }

    // 3. Warm forward headlight cone + glowing red rear brake light bloom
    const hlGrad = ctx.createLinearGradient(x + w, chassisTop + 14, x + w + 145, chassisTop + 42);
    hlGrad.addColorStop(0, "rgba(255, 232, 172, 0.42)");
    hlGrad.addColorStop(1, "rgba(255, 232, 172, 0)");
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.moveTo(x + w - 4, chassisTop + 12);
    ctx.lineTo(x + w + 150, chassisTop - 4);
    ctx.lineTo(x + w + 150, baseBtm + 16);
    ctx.lineTo(x + w - 4, chassisTop + 28);
    ctx.closePath();
    ctx.fill();

    const brkPulse = 0.78 + 0.22 * Math.sin(t * 3.8 + x * 0.02);
    const tlGrad = ctx.createRadialGradient(x + 4, chassisTop + 18, 2, x + 4, chassisTop + 18, 34);
    tlGrad.addColorStop(0, `rgba(255, 58, 66, ${0.75 * brkPulse})`);
    tlGrad.addColorStop(1, "rgba(255, 58, 66, 0)");
    ctx.fillStyle = tlGrad;
    ctx.beginPath();
    ctx.arc(x + 4, chassisTop + 18, 34, 0, TAU);
    ctx.fill();

    // 4. Upper Cabin & Roof Silhouette
    const cabX0 = x + (kind === "suv" ? 26 : 42);
    const cabX1 = x + w - (kind === "suv" ? 42 : 48);
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.moveTo(cabX0, chassisTop + 3);
    ctx.lineTo(cabX0 + 26, roofTop);
    ctx.lineTo(cabX1 - 28, roofTop);
    ctx.lineTo(cabX1, chassisTop + 3);
    ctx.closePath();
    ctx.fill();

    // Roof rim-light highlight!
    ctx.strokeStyle = rimCol;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(cabX0 + 26, roofTop + 1);
    ctx.lineTo(cabX1 - 28, roofTop + 1);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Taxi roof sign
    if (kind === "taxi") {
      ctx.fillStyle = "#f6c85f";
      ctx.beginPath();
      ctx.roundRect(x + w * 0.45, roofTop - 13, 38, 13, 4);
      ctx.fill();
    }

    // 5. Tinted Cabin Windows + Driver Silhouette + Diagonal Glass Reflection
    const winTop = roofTop + 6;
    const winBtm = chassisTop + 1;
    const midPillar = (cabX0 + cabX1) * 0.52;

    // Rear passenger window
    ctx.fillStyle = "#191c2b";
    ctx.beginPath();
    ctx.moveTo(cabX0 + 9, winBtm);
    ctx.lineTo(cabX0 + 29, winTop);
    ctx.lineTo(midPillar - 4, winTop);
    ctx.lineTo(midPillar - 4, winBtm);
    ctx.closePath();
    ctx.fill();

    // Front driver window
    ctx.beginPath();
    ctx.moveTo(midPillar + 4, winBtm);
    ctx.lineTo(midPillar + 4, winTop);
    ctx.lineTo(cabX1 - 30, winTop);
    ctx.lineTo(cabX1 - 9, winBtm);
    ctx.closePath();
    ctx.fill();

    // Subtle interior driver silhouette (unless overridden by openWindowActor!)
    if (!opts.openWindowActor) {
      ctx.fillStyle = "rgba(10, 11, 17, 0.88)";
      ctx.beginPath();
      ctx.arc(midPillar + 26, winTop + 13, 8.5, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(midPillar + 24, winBtm, 13, 10, 0, Math.PI, TAU);
      ctx.fill();
    }

    // Glass reflection slash
    ctx.strokeStyle = "rgba(220, 232, 255, 0.18)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cabX0 + 28, winBtm - 3);
    ctx.lineTo(cabX0 + 42, winTop + 3);
    ctx.moveTo(midPillar + 14, winBtm - 3);
    ctx.lineTo(midPillar + 28, winTop + 3);
    ctx.stroke();

    // Optional Open-Window Actor (strictly clipped to window sill and above -> ZERO legs outside car door!)
    if (typeof opts.openWindowActor === "function") {
      ctx.save();
      ctx.beginPath();
      ctx.rect(midPillar - 30, roofTop - 160, cabX1 - midPillar + 70, (winBtm - (roofTop - 160)));
      ctx.clip();
      opts.openWindowActor(ctx, midPillar + 28, winBtm + 32);
      ctx.restore();
    }

    // 6. Lower Aerodynamic Chassis Body (drawn AFTER openWindowActor so the car door cleanly occludes lower body!)
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.roundRect(x, chassisTop, w, chH, [12, 18, 10, 10]);
    ctx.fill();

    // Subtle door seam & beltline highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 16, chassisTop + 2);
    ctx.lineTo(x + w - 16, chassisTop + 2);
    ctx.stroke();

    // Crisp Headlight & Taillight lenses
    ctx.fillStyle = "#fff3cc";
    ctx.beginPath();
    ctx.roundRect(x + w - 10, chassisTop + 11, 10, 13, 4);
    ctx.fill();
    ctx.fillStyle = "#ff3b47";
    ctx.beginPath();
    ctx.roundRect(x, chassisTop + 11, 9, 15, 4);
    ctx.fill();

    // 7. Front & Rear Wheel Wells + Rubber Tires + Alloy Rims (stay planted on road y!)
    for (const wx of [x + 52, x + w - 54]) {
      const wy = y - wheelR;
      // Dark wheel arch cutout
      ctx.fillStyle = "#090a10";
      ctx.beginPath();
      ctx.arc(wx, wy + 2, wheelR + 4, Math.PI, TAU);
      ctx.fill();
      // Rubber tire
      ctx.fillStyle = "#14161f";
      ctx.beginPath();
      ctx.arc(wx, wy, wheelR, 0, TAU);
      ctx.fill();
      // Alloy rim + spokes
      ctx.fillStyle = "#7c8296";
      ctx.beginPath();
      ctx.arc(wx, wy, wheelR * 0.54, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#232736";
      ctx.lineWidth = 2.2;
      for (let sp = 0; sp < 4; sp++) {
        const sa = wheelSpin + sp * (Math.PI * 0.5);
        ctx.beginPath();
        ctx.moveTo(wx - Math.cos(sa) * wheelR * 0.48, wy - Math.sin(sa) * wheelR * 0.48);
        ctx.lineTo(wx + Math.cos(sa) * wheelR * 0.48, wy + Math.sin(sa) * wheelR * 0.48);
        ctx.stroke();
      }
      ctx.fillStyle = "#d8dce8";
      ctx.beginPath();
      ctx.arc(wx, wy, 3.8, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
    return { roofY: roofTop, roofCenterX: (cabX0 + cabX1) * 0.5 };
  }

  function drawRedBalloon(ctx, bx, by, scale, t, burstProg) {
    scale = scale === undefined ? 1 : scale;
    burstProg = burstProg || 0;
    ctx.save();
    if (burstProg <= 0.01) {
      const rx = 31 * scale;
      const ry = 39 * scale;
      const sway = Math.sin(t * 3.4 + bx * 0.02) * 12 * scale;
      // Smooth Bezier catenary balloon string!
      ctx.strokeStyle = "rgba(242, 238, 228, 0.82)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by + ry + 3);
      ctx.bezierCurveTo(bx + sway * 0.5, by + ry + 34 * scale, bx - sway * 0.7, by + ry + 64 * scale, bx + sway * 0.4, by + ry + 92 * scale);
      ctx.stroke();

      // Balloon knot
      ctx.fillStyle = "#c82834";
      ctx.beginPath();
      ctx.moveTo(bx - 4 * scale, by + ry + 4);
      ctx.lineTo(bx + 4 * scale, by + ry + 4);
      ctx.lineTo(bx, by + ry - 2);
      ctx.closePath();
      ctx.fill();

      // Warm rim aura + glossy crimson balloon body
      const bGrad = ctx.createRadialGradient(bx - rx * 0.32, by - ry * 0.35, 3, bx, by, ry * 1.15);
      bGrad.addColorStop(0, "#ff7a82");
      bGrad.addColorStop(0.55, "#e63542");
      bGrad.addColorStop(1, "#9e1924");
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, Math.sin(t * 2.2) * 0.05, 0, TAU);
      ctx.fill();

      // Specular crescent highlight
      ctx.fillStyle = "rgba(255, 238, 238, 0.65)";
      ctx.beginPath();
      ctx.ellipse(bx - rx * 0.38, by - ry * 0.36, rx * 0.16, ry * 0.24, -0.35, 0, TAU);
      ctx.fill();
    } else {
      // Crisp elastic burst shards + expanding pressure ring!
      const p = clamp(burstProg, 0, 1);
      ctx.strokeStyle = `rgba(255, 196, 188, ${(1 - p) * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, 28 + p * 135, 0, TAU);
      ctx.stroke();
      for (let k = 0; k < 12; k++) {
        const ang = (k * 30 + 12) * DEG;
        const dist = 20 + easeOutCubic(p) * 145;
        const px = bx + Math.cos(ang) * dist;
        const py = by + Math.sin(ang) * dist + p * p * 28;
        ctx.fillStyle = `rgba(236, 62, 74, ${1 - p})`;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang + 0.4) * 16, py + Math.sin(ang + 0.4) * 16);
        ctx.lineTo(px + Math.cos(ang - 0.3) * 12, py + Math.sin(ang - 0.3) * 12);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  window.StickmanRig = {
    clamp,
    lerp,
    easeOutCubic,
    easeInOutCubic,
    easeOutBack,
    hash11,
    drawActorV3,
    drawDetailedVehicle,
    drawRedBalloon,
  };
})();
