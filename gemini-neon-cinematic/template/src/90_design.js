// ---------- design sheet for the planning step (node render.mjs --design, or open the page with ?design=1) ----------
// Show each character and key object in its key poses on a flat painted card, with a name and a one-line note.
window.renderDesign = function () {
  const g = CTX; g.setTransform(SC, 0, 0, SC, 0, 0);
  g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, W, H);
  const label = (x, y, name, note) => {
    g.fillStyle = css(P.ink); g.font = '600 34px Georgia, "Times New Roman", serif'; g.textAlign = 'center'; g.fillText(name, x, y);
    g.font = '22px Georgia, "Times New Roman", serif'; g.fillStyle = css(P.ink, 0.7); g.fillText(note, x, y + 32);
  };
  g.fillStyle = css(P.ink); g.font = '600 48px Georgia, "Times New Roman", serif'; g.textAlign = 'left'; g.fillText(B.title + ': design sheet', 70, 90);
  // the hat: resting, rocking back, letting go, tumbling
  [[280, 0.28, 0, 'Resting'], [700, 0.28, -0.22, 'Rocks back'], [1120, 0.45, 0.6, 'Lets go'], [1540, 0.15, 2.1, 'Tumbling']].forEach(([x, v, rot, nm], i) => {
    strawHat(g, x, 330, 150, { v, rot, t: i * 0.7, wind: i > 1 ? 0.9 : 0.3 });
    label(x, 520, nm, i ? '' : 'Straw, faded blue ribbon, two tails');
  });
  post(g, 400, 1000, 300, 60, 501); label(400, 1040, 'Fence post', 'Weathered, split top');
  const bl = makeBlades(3, 60, 820, 1200, () => 960, 120, 30); drawBlades(g, bl, 0.5); label(1010, 1040, 'Grass', 'Bends with windAt(t)');
  driftLeaves(g, 4, 12, 9, [1350, 700, 500, 200], 22); label(1600, 1040, 'Leaves', 'Tumble and flip');
  finish(g, DUR / 2);
  return document.getElementById('c').toDataURL('image/png');
};
