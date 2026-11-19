// ===== 01_surfaces.js — Five Tactile Archival Documentary World Surfaces =====
const SURFACE_THEMES = {
  nautical: {
    bg0: '#142B39', bg1: '#0A1821',
    grid: 'rgba(182, 212, 226, 0.10)',
    contour: 'rgba(145, 190, 210, 0.14)',
    landFill: '#1D3949', landStroke: 'rgba(214, 228, 232, 0.32)',
    iceFill: 'rgba(222, 236, 242, 0.14)',
    coordCol: 'rgba(208, 224, 232, 0.38)',
  },
  blueprint: {
    bg0: '#11335A', bg1: '#071A32',
    grid: 'rgba(180, 218, 255, 0.13)',
    subGrid: 'rgba(180, 218, 255, 0.045)',
    contour: 'rgba(220, 240, 255, 0.20)',
    landFill: 'rgba(18, 56, 98, 0.75)', landStroke: 'rgba(218, 238, 255, 0.45)',
    coordCol: 'rgba(210, 234, 255, 0.48)',
  },
  microfilm: {
    bg0: '#171A21', bg1: '#0B0D12',
    grid: 'rgba(232, 210, 162, 0.08)',
    contour: 'rgba(235, 198, 120, 0.15)',
    landFill: '#1F232C', landStroke: 'rgba(238, 214, 168, 0.28)',
    coordCol: 'rgba(236, 212, 168, 0.40)',
  },
  press: {
    bg0: '#ECE3D0', bg1: '#D8CCB4',
    grid: 'rgba(84, 68, 48, 0.10)',
    contour: 'rgba(92, 74, 52, 0.15)',
    landFill: '#DFD3BC', landStroke: 'rgba(72, 56, 38, 0.30)',
    coordCol: 'rgba(76, 60, 42, 0.45)',
  },
  coda: {
    bg0: '#10141D', bg1: '#05070B',
    grid: 'rgba(160, 190, 230, 0.06)',
    contour: 'rgba(180, 205, 240, 0.10)',
    landFill: '#141924', landStroke: 'rgba(190, 210, 240, 0.22)',
    coordCol: 'rgba(190, 210, 240, 0.34)',
  },
};

let _WORLD_PLATE = null;

function buildWorldPlate(spec) {
  if (_WORLD_PLATE) return _WORLD_PLATE;
  const ww = (spec.world && spec.world.width) || 5200;
  const wh = (spec.world && spec.world.height) || 4200;
  // Render crisp 0.5x world plate (2600x2100) + vector details
  const S = 0.5;
  const c = mkCanvas(Math.round(ww * S), Math.round(wh * S));
  const g = c.getContext('2d');
  g.scale(S, S);

  const sName = spec.surface || B.surface || 'nautical';
  const th = SURFACE_THEMES[sName] || SURFACE_THEMES.nautical;

  const rad = g.createRadialGradient(ww * 0.5, wh * 0.46, 240, ww * 0.5, wh * 0.5, ww * 0.68);
  rad.addColorStop(0, th.bg0);
  rad.addColorStop(1, th.bg1);
  g.fillStyle = rad;
  g.fillRect(0, 0, ww, wh);

  // Subtle paper/slate organic blotches
  const rng = mulberry32(4099);
  for (let i = 0; i < 65; i++) {
    const bx = rng() * ww, by = rng() * wh, br = 180 + rng() * 480;
    const bg = g.createRadialGradient(bx, by, 10, bx, by, br);
    bg.addColorStop(0, sName === 'press' ? 'rgba(120,95,65,0.035)' : 'rgba(255,255,255,0.022)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg;
    g.fillRect(bx - br, by - br, br * 2, br * 2);
  }

  // Sub-grid for blueprint
  if (th.subGrid) {
    g.strokeStyle = th.subGrid;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let x = 0; x <= ww; x += 60) { g.moveTo(x, 0); g.lineTo(x, wh); }
    for (let y = 0; y <= wh; y += 60) { g.moveTo(0, y); g.lineTo(ww, y); }
    g.stroke();
  }

  // Primary coordinate graticule
  const step = sName === 'blueprint' ? 300 : 360;
  g.strokeStyle = th.grid;
  g.lineWidth = 2;
  g.beginPath();
  for (let x = step; x < ww; x += step) { g.moveTo(x, 0); g.lineTo(x, wh); }
  for (let y = step; y < wh; y += step) { g.moveTo(0, y); g.lineTo(ww, y); }
  g.stroke();

  // Bathymetric / orbital / schematic contours
  g.strokeStyle = th.contour;
  g.lineWidth = 2;
  for (let r = 340; r <= 2300; r += 310) {
    g.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.06) {
      const wob = 1 + (noise2(Math.cos(a) * 2.2 + r * 0.002, Math.sin(a) * 2.2, 71) - 0.5) * (sName === 'nautical' ? 0.22 : 0.04);
      const px = ww * 0.48 + Math.cos(a) * r * wob * 1.18;
      const py = wh * 0.52 + Math.sin(a) * r * wob * 0.86;
      if (a === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.stroke();
  }

  // Custom geographic / schematic polygons (continents, ice shelves, spacecraft hull, pulsar ring)
  if (Array.isArray(spec.mapPolys)) {
    for (const poly of spec.mapPolys) {
      if (!poly.pts || poly.pts.length < 3) continue;
      g.save();
      g.beginPath();
      poly.pts.forEach(([px, py], idx) => (idx === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
      if (poly.closed !== false) g.closePath();
      if (poly.fill !== 'none') {
        g.fillStyle = poly.fill || th.landFill;
        g.fill();
      }
      g.strokeStyle = poly.stroke || th.landStroke;
      g.lineWidth = poly.lineWidth || 3.5;
      if (poly.dash) g.setLineDash(poly.dash);
      g.stroke();
      g.restore();

      if (poly.label && poly.labelAt) {
        g.save();
        g.fillStyle = poly.labelColor || th.coordCol;
        g.font = `700 ${poly.fontSize || 34}px "Courier New", "HarmonyOS Sans SC", monospace`;
        g.textAlign = 'center';
        g.fillText(poly.label, poly.labelAt[0], poly.labelAt[1]);
        g.restore();
      }
    }
  }

  // Graticule coordinate labels
  g.fillStyle = th.coordCol;
  g.font = '700 22px "Courier New", Consolas, monospace';
  const latLabels = spec.gridLabelsY || ['55°S', '60°S', '65°S', '70°S', '75°S', '78°S'];
  const lonLabels = spec.gridLabelsX || ['75°W', '60°W', '45°W', '30°W', '15°W', '0°'];
  for (let i = 0; i < latLabels.length; i++) {
    const y = (i + 1) * (wh / (latLabels.length + 1));
    for (let x = 520; x < ww - 400; x += 1440) {
      g.fillText(latLabels[i], x + 14, y - 10);
    }
  }
  for (let i = 0; i < lonLabels.length; i++) {
    const x = (i + 1) * (ww / (lonLabels.length + 1));
    for (let y = 520; y < wh - 400; y += 1300) {
      g.fillText(lonLabels[i], x + 14, y + 28);
    }
  }

  // Compass rose (nautical) or Registration Crosshairs (blueprint/microfilm)
  drawCompassOrReticle(g, spec.compassAt ? spec.compassAt[0] : ww - 680, spec.compassAt ? spec.compassAt[1] : 640, sName, th.coordCol);

  _WORLD_PLATE = { canvas: c, ww, wh, theme: th, name: sName };
  return _WORLD_PLATE;
}

function drawCompassOrReticle(g, cx, cy, sName, col) {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = col;
  g.fillStyle = col;
  g.lineWidth = 2.5;
  for (const r of [150, 134, 42]) {
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  }
  const spikes = sName === 'nautical' ? 8 : 4;
  for (let i = 0; i < spikes; i++) {
    const a = (i * Math.PI * 2) / spikes;
    const len = i % 2 === 0 ? 175 : 105;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    g.stroke();
  }
  g.font = '700 28px Georgia, serif';
  g.textAlign = 'center';
  g.fillText(sName === 'nautical' ? 'N' : 'REF-01', 0, -188);
  g.restore();
}
