// ===== 10_documentary.js — Starter 12-Second Dual-Engine Example =====
window.DOC_SPEC = {
  surface: 'nautical',
  world: { width: 5200, height: 4200 },
  returnAllTagsAt: 9.2,
  mapPolys: [
    {
      pts: [[1500, 2650], [1920, 2500], [2480, 2580], [2950, 2460], [3420, 2720], [3180, 3150], [1760, 3120]],
      fill: 'rgba(210, 232, 242, 0.14)',
      stroke: 'rgba(225, 240, 248, 0.42)',
      label: 'ANTARCTIC PACK ICE · 74°S',
      labelAt: [2480, 2860],
    },
  ],
  cameraKeys: [
    { t: 0.0, x: 2200, y: 2100, zoom: 0.62, rot: -0.015 },
    { t: 1.4, x: 2050, y: 2020, zoom: 0.92, rot: -0.01, ease: 'io3' },
    { t: 4.8, x: 2120, y: 2000, zoom: 0.96, rot: 0.005, ease: 'lin' },
    { t: 9.0, x: 2820, y: 2080, zoom: 0.92, rot: 0.012, ease: 'io3' },
    { t: 10.6, x: 2460, y: 2120, zoom: 0.56, rot: 0.0, ease: 'io3' },
    { t: 12.0, x: 2460, y: 2120, zoom: 0.58, rot: 0.0, ease: 'lin' },
  ],
  routes: [
    { points: [[2050, 2020], [2380, 2210], [2820, 2080]], t0: 1.8, dur: 2.2 },
  ],
  cards: [
    {
      kind: 'doc',
      x: 2050, y: 2020, w: 500, h: 340, rot: -3.2, t0: 0.4,
      header: 'EXPEDITION DISPATCH · 1915',
      lines: ['LATITUDE: 76° 34′ SOUTH', 'PACK ICE PRESSURE RISING', 'NO RADIO CONTACT POSSIBLE'],
      highlightIdx: 1,
      highlightAt: 2.1,
    },
    {
      kind: 'doc',
      x: 2820, y: 2080, w: 500, h: 340, rot: 2.8, t0: 8.6,
      header: 'RELIEF STATION LOG · 1916',
      lines: ['800 NAUTICAL MILES CROSSED', 'SOUTH GEORGIA REACHED', 'CREW ROSTER: 28 / 28'],
      highlightIdx: 2,
      highlightAt: 9.3,
    },
  ],
  circles: [
    { x: 2050, y: 2030, rx: 210, ry: 55, rot: -3, t0: 2.4, dur: 0.4 },
  ],
  tags: [
    { x: 2050, y: 1840, dx: -180, dy: -85, text: 'WEDDELL SEA · ICE TRAP', t0: 1.2, fadeAt: 4.5 },
    { x: 2820, y: 1900, dx: 70, dy: -85, text: 'STROMNESS WHALING STATION', t0: 9.0, fadeAt: 13.0 },
  ],
  stamps: [
    { x: 2820, y: 2210, rot: -9, text: '28 / 28 ALIVE', subtext: 'ARCHIVAL RECORD VERIFIED', t0: 9.6 },
  ],
  inserts: [
    {
      t0: 4.8, t1: 9.0, stock: 'copperplate', irisDur: 0.55, pinWorld: [2380, 2210], impactAt: 6.4,
      intertitle: { startFrac: 0.68, endFrac: 0.92, eyebrow: 'MAY 1916 · DRAKE PASSAGE', lines: ['二十二英尺敞口木艇', '横渡八百海里狂暴冰洋'] },
      draw(g, lt, dur, H) {
        const t2 = H.q12(lt);
        g.strokeStyle = H.INK;
        g.lineWidth = 3.5;
        // Boiling storm waves + wooden lifeboat silhouette
        for (let row = 0; row < 5; row++) {
          const baseY = 610 + row * 82;
          const pts = [];
          for (let x = 0; x <= 1920; x += 48) {
            const y = baseY + Math.sin(x * 0.008 + t2 * (3.2 + row * 0.4) + row) * (34 + row * 8);
            pts.push([x, y]);
          }
          H.boilStroke(g, pts, H.step + row, 2.2, false);
          g.stroke();
        }
        const bx = 960 + Math.sin(t2 * 2.1) * 35;
        const by = 585 + Math.sin(t2 * 3.2) * 28;
        g.save();
        g.translate(bx, by);
        g.rotate(-0.16 + Math.cos(t2 * 3.2) * 0.14);
        g.fillStyle = H.INK;
        H.boilStroke(g, [[-130, 0], [140, -12], [105, 42], [-105, 42]], H.step, 1.8, true);
        g.fill();
        H.boilStroke(g, [[10, -10], [10, -175], [98, -40], [10, -24]], H.step + 3, 2.0, true);
        g.strokeStyle = H.CRIMSON;
        g.lineWidth = 4;
        g.stroke();
        g.restore();
      },
    },
  ],
  overlays: [
    { kind: 'year', t0: 0.2, t1: 2.2, year: 1915, label: 'WEDDELL SEA EXPEDITION' },
  ],
  subtitles: [
    { t0: 0.3, t1: 4.6, text: '1915 年南极威德尔海，浮冰彻底锁死了探险船的退路' },
    { t0: 4.9, t1: 8.9, text: '在没有相机记录的黑夜巨浪中，六名船员驾小艇搏命突围' },
    { t0: 9.1, t1: 11.8, text: '最终跨越八百海里绝境，二十八名船员奇迹般全员生还' },
  ],
};
