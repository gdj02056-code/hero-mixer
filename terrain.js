'use strict';
// ============================================================
//  TERRAIN — the ground, the wandering section borders, and the props
//  (trees, rocks, ruins, pools…) that make each biome look like a place.
//  Props are placed from a hash of their spot, so the same map comes back every run.
//  Big props block walking for the hero and walking monsters; shots fly over everything.
// ============================================================

// ---------- ground ----------
const GROUND_PATCH = 340;
// One biome's ground over a rectangle: the ground picture calmed with the biome color, then big soft
// light and dark patches so the repeating picture doesn't read as a grid.
function paintGround(bi, x, y, w, h) {
  const b = STAGES[bi % STAGES.length], pat = groundPattern(bi);
  ctx.fillStyle = b.g1; ctx.fillRect(x, y, w, h);
  if (pat) {
    ctx.fillStyle = pat; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.4; ctx.fillStyle = b.g1; ctx.fillRect(x, y, w, h);
  }
  const P = GROUND_PATCH, i0 = Math.floor(x / P) - 1, i1 = Math.floor((x + w) / P) + 1, j0 = Math.floor(y / P) - 1, j1 = Math.floor((y + h) / P) + 1;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = hash2(i + 913, j + 271);
    if (k > 0.62) continue;
    const cx = (i + hash2(j, i + 17)) * P, cy = (j + hash2(i + 5, j + 3)) * P, r = P * (0.55 + hash2(i * 3 + 1, j * 7 + 2) * 0.75);
    const dark = k < 0.36, col = dark ? '#000000' : b.deco, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, col); g.addColorStop(1, col + '00');
    ctx.globalAlpha = dark ? 0.2 : 0.13; ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

// points along one side of section cell (col,row), clockwise: 0 top, 1 right, 2 bottom, 3 left
const SEC_SEG = 36;
function secBorder(col, row, side) {
  const pts = [];
  for (let k = 0; k <= SEC_SEG; k++) {
    const t = k / SEC_SEG;
    if (side === 0) { const x = (col + t) * SEC; pts.push(x, row * SEC + secEdgeOff(row, x, 1)); }
    else if (side === 1) { const y = (row + t) * SEC; pts.push((col + 1) * SEC + secEdgeOff(col + 1, y, 0), y); }
    else if (side === 2) { const x = (col + 1 - t) * SEC; pts.push(x, (row + 1) * SEC + secEdgeOff(row + 1, x, 1)); }
    else { const y = (row + 1 - t) * SEC; pts.push(col * SEC + secEdgeOff(col, y, 0), y); }
  }
  return pts;
}
function secPath(col, row) {
  ctx.beginPath();
  for (let side = 0; side < 4; side++) { const pts = secBorder(col, row, side); for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); }
  ctx.closePath();
}
function drawGround(hw, hh) {
  const p = G.p, x = p.x - hw - 4, y = p.y - hh - 4, w = hw * 2 + 8, h = hh * 2 + 8;
  if (!G.world) { paintGround(G.stage - 1, x, y, w, h); return; }
  const c0 = Math.floor((x - SEC_WAVE) / SEC), c1 = Math.floor((x + w + SEC_WAVE) / SEC);
  const r0 = Math.floor((y - SEC_WAVE) / SEC), r1 = Math.floor((y + h + SEC_WAVE) / SEC);
  for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) {
    const s = secIdx(col, row);
    if (s < 0) continue;
    ctx.save(); secPath(col, row); ctx.clip();
    paintGround(s, x, y, w, h);
    if (!accessible(s)) { ctx.fillStyle = 'rgba(5,6,13,.72)'; ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }
  // a soft seam where two open sections meet, instead of a hard cut
  for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) {
    if (!accessible(secIdx(col, row))) continue;
    for (const [side, n] of [[1, secIdx(col + 1, row)], [2, secIdx(col, row + 1)]]) {
      if (!accessible(n)) continue;
      const pts = secBorder(col, row, side);
      line(ctx, pts, 'rgba(0,0,0,.14)', 30); line(ctx, pts, 'rgba(255,255,255,.07)', 8);
    }
  }
  ctx.lineCap = 'butt';
}

// ---------- props ----------
const rrect = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
// round shapes made of several circles with one outline around the whole outside
function blob(c, cs, fill) {
  c.beginPath();
  for (let i = 0; i < cs.length; i += 3) { c.moveTo(cs[i] + cs[i + 2], cs[i + 1]); c.arc(cs[i], cs[i + 1], cs[i + 2], 0, TAU); }
  c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); c.fillStyle = fill; c.fill();
}
const stick = (c, pts, col, w) => { line(c, pts, OUT, w + 3); line(c, pts, col, w); };
function propTree(c, dark, light, trunk) {
  poly(c, [-6, 0, 6, 0, 4.5, -36, -4.5, -36]); paint(c, trunk, OUT, 2.5);
  blob(c, [-17, -48, 20, 17, -48, 20, 0, -66, 26, 0, -44, 18], dark);
  c.fillStyle = light; circ(c, -7, -71, 12); c.fill(); circ(c, -20, -52, 8); c.fill(); circ(c, 12, -58, 6); c.fill();
}
function propPine(c) {
  poly(c, [-5, 0, 5, 0, 4, -16, -4, -16]); paint(c, '#5d4037', OUT, 2.5);
  for (const [y, w] of [[-14, 30], [-40, 24], [-64, 17]]) {
    poly(c, [-w, y, w, y, 0, y - 36]); paint(c, '#1b5e3a', OUT, 2.5);
    poly(c, [-w * 0.42, y - 21, w * 0.42, y - 21, 0, y - 36]); c.fillStyle = '#eef6ff'; c.fill();
  }
}
function propDeadTree(c, col) {
  stick(c, [0, -28, -18, -50, -26, -56], col, 5); stick(c, [0, -38, 17, -58, 26, -62], col, 5); stick(c, [0, -46, -3, -74], col, 4);
  poly(c, [-8, 0, 8, 0, 4, -50, -4, -50]); paint(c, col, OUT, 2.5);
}
function propRock(c, base, light, glow) {
  poly(c, [-30, 0, -27, -18, -14, -33, 6, -36, 23, -25, 31, 0]); paint(c, base, OUT, 3);
  poly(c, [-19, -20, -9, -29, 5, -31, -2, -21]); c.fillStyle = light; c.fill();
  if (glow) { c.shadowColor = glow; c.shadowBlur = 8; line(c, [-16, -4, -8, -14, 1, -10, 9, -21], glow, 2.5); c.shadowBlur = 0; }
}
function propCactus(c) {
  const G1 = '#3f9a4a';
  rrect(c, 9, -40, 13, 8, 4); paint(c, G1, OUT, 2.5); rrect(c, 15, -55, 8, 22, 4); paint(c, G1, OUT, 2.5);
  rrect(c, -21, -28, 13, 8, 4); paint(c, G1, OUT, 2.5); rrect(c, -21, -42, 8, 20, 4); paint(c, G1, OUT, 2.5);
  rrect(c, -8, -64, 17, 64, 8); paint(c, G1, OUT, 2.5);
  line(c, [-2, -58, -2, -6], '#66bb6a', 2.5);
}
function propPillar(c, base, light, v) {
  const H = v < 0.5 ? 44 : 76;
  poly(c, [-20, 0, 20, 0, 20, -8, -20, -8]); paint(c, base, OUT, 2.5);
  if (v < 0.5) poly(c, [-13, -8, 13, -8, 13, -H, 7, -H - 9, 0, -H - 2, -6, -H - 8, -13, -H]);
  else poly(c, [-13, -8, 13, -8, 13, -H, -13, -H]);
  paint(c, light, OUT, 2.5);
  line(c, [-5, -12, -5, -H + 4], base, 2); line(c, [5, -12, 5, -H + 4], base, 2);
  if (v >= 0.5) { poly(c, [-18, -H, 18, -H, 18, -H - 9, -18, -H - 9]); paint(c, base, OUT, 2.5); }
}
function propCrystal(c, base, light) {
  c.shadowColor = base; c.shadowBlur = 10;
  for (const [x, h, w, a] of [[-13, 40, 9, -0.35], [13, 34, 8, 0.4], [0, 60, 12, 0]]) {
    c.save(); c.translate(x, 0); c.rotate(a);
    poly(c, [-w, 0, -w, -h * 0.72, 0, -h, w, -h * 0.72, w, 0]); paint(c, base, OUT, 2.5);
    poly(c, [-w * 0.45, -4, -w * 0.45, -h * 0.68, 0, -h * 0.9, 0, -4]); c.fillStyle = light; c.globalAlpha *= 0.7; c.fill(); c.globalAlpha /= 0.7;
    c.restore();
  }
  c.shadowBlur = 0;
}
function propBarrel(c) {
  rrect(c, -14, -36, 28, 36, 7); paint(c, '#8d5524', OUT, 2.5);
  line(c, [-14, -10, 14, -10], '#4e342e', 3); line(c, [-14, -26, 14, -26], '#4e342e', 3);
  c.beginPath(); c.ellipse(0, -36, 13, 4.5, 0, 0, TAU); paint(c, '#a1673a', OUT, 2);
}
function propCrate(c) {
  poly(c, [-18, 0, 18, 0, 18, -34, -18, -34]); paint(c, '#b07a3e', OUT, 2.5);
  line(c, [-15, -3, 15, -31], '#7a4f24', 3); line(c, [-18, -17, 18, -17], '#7a4f24', 2);
}
function propPool(c, water, light, bank) {
  c.beginPath(); c.ellipse(0, 0, 76, 44, 0, 0, TAU); c.fillStyle = bank; c.fill();
  c.beginPath(); c.ellipse(0, 1, 67, 37, 0, 0, TAU); paint(c, water, 'rgba(0,0,0,.35)', 3);
  const t = G.time;
  c.globalAlpha *= 0.7; c.fillStyle = light;
  c.beginPath(); c.ellipse(-22 + Math.sin(t * 1.3) * 5, -10, 18, 4.5, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(20 + Math.cos(t * 1.1) * 5, 9, 12, 3.5, 0, 0, TAU); c.fill();
  c.globalAlpha /= 0.7;
}
function propBush(c, dark, light) {
  blob(c, [-13, -10, 12, 13, -10, 12, 0, -19, 14], dark);
  c.fillStyle = light; circ(c, -5, -24, 5.5); c.fill(); circ(c, 11, -15, 4); c.fill();
}
function propFlowers(c, v) {
  const cols = [['#f48fb1', '#fff176'], ['#fff176', '#ffffff'], ['#ce93d8', '#fff59d'], ['#ffffff', '#ffd54f']][Math.floor(v * 4)];
  for (const [x, y] of [[-14, -2], [-4, -8], [8, -3], [16, -9], [2, 3]]) {
    line(c, [x, y + 4, x, y - 6], '#2e7d32', 2);
    c.fillStyle = cols[0]; for (let k = 0; k < 5; k++) { circ(c, x + Math.cos(k * 1.257) * 3.6, y - 8 + Math.sin(k * 1.257) * 3.6, 2.8); c.fill(); }
    c.fillStyle = cols[1]; circ(c, x, y - 8, 2); c.fill();
  }
}
function propTuft(c, col) {
  for (const [x, dx, h] of [[-8, -6, 14], [-3, -2, 20], [2, 3, 17], [7, 7, 12]]) line(c, [x, 0, x + dx, -h], col, 3);
}
function propBones(c) {
  stick(c, [-15, 3, 9, -3], '#e8e4d8', 3.5);
  for (const [x, y] of [[-16, 1], [-16, 5], [10, -5], [10, -1]]) { circ(c, x, y, 2.6); paint(c, '#e8e4d8', null); }
  circ(c, 4, -12, 8); paint(c, '#f1ede1', OUT, 2);
  c.fillStyle = '#3a3a3a'; circ(c, 1, -13, 2); c.fill(); circ(c, 7, -13, 2); c.fill();
}
function propMushroom(c) {
  for (const [x, s] of [[-9, 1], [8, 0.7]]) {
    rrect(c, x - 3.5 * s, -14 * s, 7 * s, 14 * s, 3); paint(c, '#efe6d0', OUT, 2);
    c.beginPath(); c.ellipse(x, -14 * s, 13 * s, 9 * s, 0, Math.PI, 0); c.closePath(); paint(c, '#9c4dcc', OUT, 2);
    c.fillStyle = '#e1bee7'; circ(c, x - 4 * s, -18 * s, 2.2 * s); c.fill(); circ(c, x + 4 * s, -17 * s, 1.8 * s); c.fill();
  }
}
function propReeds(c) {
  for (const [x, dx, h] of [[-10, -4, 34], [-3, -1, 44], [4, 2, 38], [11, 5, 30]]) {
    line(c, [x, 0, x + dx, -h], '#556b2f', 2.5);
    c.beginPath(); c.ellipse(x + dx * 0.9, -h + 6, 2.8, 7, dx * 0.04, 0, TAU); paint(c, '#6d4c41', null);
  }
}
function propSwords(c) {
  for (const [x, a] of [[-10, -0.35], [10, 0.25]]) {
    c.save(); c.translate(x, 0); c.rotate(a);
    poly(c, [-3, 0, 3, 0, 3, -30, -3, -30]); paint(c, '#b0bec5', OUT, 2);
    poly(c, [-9, -30, 9, -30, 9, -34, -9, -34]); paint(c, '#6d4c41', OUT, 2);
    poly(c, [-2, -34, 2, -34, 2, -44, -2, -44]); paint(c, '#4e342e', OUT, 1.5);
    c.restore();
  }
}
function propTorch(c) {
  const f = 1 + Math.sin(G.time * 14) * 0.08 + Math.sin(G.time * 23) * 0.05;
  const g = c.createRadialGradient(0, -46, 2, 0, -46, 46);
  g.addColorStop(0, 'rgba(255,183,77,.45)'); g.addColorStop(1, 'rgba(255,183,77,0)');
  c.fillStyle = g; circ(c, 0, -46, 46); c.fill();
  poly(c, [-3, 0, 3, 0, 3, -36, -3, -36]); paint(c, '#5d4037', OUT, 2);
  poly(c, [-8, -36, 8, -36, 5, -42, -5, -42]); paint(c, '#455a64', OUT, 2);
  c.save(); c.translate(0, -42); c.scale(1, f);
  c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-7, -10, 0, -20); c.quadraticCurveTo(7, -10, 6, 0); c.closePath(); c.fillStyle = '#ff7043'; c.fill();
  c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(-3, -6, 0, -12); c.quadraticCurveTo(3, -6, 3, 0); c.closePath(); c.fillStyle = '#ffe082'; c.fill();
  c.restore();
}
function propPebbles(c) {
  for (const [x, y, r] of [[-10, 0, 5], [2, -3, 3.5], [9, 2, 4.5], [-2, 4, 2.8]]) { c.beginPath(); c.ellipse(x, y, r * 1.3, r, 0, 0, TAU); paint(c, '#9aa0a6', 'rgba(15,15,30,.55)', 1.5); }
}
function propCrack(c, col) { // glowing crack in the ground (lava vent, chaos rift)
  const pulse = 0.65 + Math.sin(G.time * 3) * 0.35;
  c.shadowColor = col; c.shadowBlur = 14 * pulse;
  line(c, [-34, 4, -16, -3, -6, 5, 8, -4, 20, 2, 34, -6], '#1a1012', 7);
  c.globalAlpha *= pulse; line(c, [-34, 4, -16, -3, -6, 5, 8, -4, 20, 2, 34, -6], col, 3); c.globalAlpha /= pulse;
  c.shadowBlur = 0;
}

// kinds: r = blocking radius at the base (0 = walk through), sy = squash of that circle,
// flat = lies on the ground under everything, w/h = drawn size (for the see-through check)
const PROP_KINDS = {
  tree: { r: 12, w: 78, h: 96, draw: c => propTree(c, '#2e7d32', '#5cb860', '#6d4c2f') },
  blossom: { r: 12, w: 78, h: 96, draw: c => propTree(c, '#ec7aa8', '#f8bbd0', '#8d6e63') },
  pine: { r: 12, w: 62, h: 104, draw: c => propPine(c) },
  deadtree: { r: 10, w: 60, h: 80, draw: c => propDeadTree(c, '#4e3b31') },
  rock: { r: 26, w: 64, h: 38, draw: c => propRock(c, '#8a8f98', '#b8bdc6') },
  sandrock: { r: 26, w: 64, h: 38, draw: c => propRock(c, '#b08a55', '#dcbf87') },
  snowrock: { r: 26, w: 64, h: 38, draw: c => propRock(c, '#7b93a6', '#f2f7fb') },
  lavarock: { r: 26, w: 64, h: 38, draw: c => propRock(c, '#3b2f2f', '#5d4a44', '#ff7043') },
  voidrock: { r: 26, w: 64, h: 38, draw: c => propRock(c, '#2d1b33', '#4a2f55', '#ec4899') },
  cactus: { r: 11, w: 46, h: 66, draw: c => propCactus(c) },
  pillar: { r: 17, w: 42, h: 86, draw: (c, v) => propPillar(c, '#8e8e7e', '#c4c4ae', v) },
  marble: { r: 17, w: 42, h: 86, draw: (c, v) => propPillar(c, '#c9d3df', '#ffffff', v) },
  darkpillar: { r: 17, w: 42, h: 86, draw: (c, v) => propPillar(c, '#3d3a52', '#5e5a7a', v) },
  icecrystal: { r: 18, w: 56, h: 62, draw: c => propCrystal(c, '#4fc3f7', '#e1f5fe') },
  chaoscrystal: { r: 18, w: 56, h: 62, draw: c => propCrystal(c, '#d81b60', '#f8bbd0') },
  barrel: { r: 15, w: 30, h: 42, draw: c => propBarrel(c) },
  crate: { r: 17, w: 38, h: 36, draw: c => propCrate(c) },
  pond: { r: 66, sy: 0.55, w: 152, h: 0, flat: true, draw: c => propPool(c, '#3f9fd8', '#b3e5fc', '#5d4a35') },
  lava: { r: 66, sy: 0.55, w: 152, h: 0, flat: true, draw: c => { c.shadowColor = '#ff6d00'; c.shadowBlur = 18; propPool(c, '#f4511e', '#ffd54f', '#2b1d1a'); c.shadowBlur = 0; } },
  swamp: { r: 66, sy: 0.55, w: 152, h: 0, flat: true, draw: c => propPool(c, '#35562c', '#7fae5c', '#22302a') },
  bush: { r: 0, w: 52, h: 32, draw: c => propBush(c, '#2f7d32', '#66bb6a') },
  snowbush: { r: 0, w: 52, h: 32, draw: c => propBush(c, '#dfeaf2', '#ffffff') },
  drybush: { r: 0, w: 52, h: 32, draw: c => propBush(c, '#8d7a4a', '#b8a36a') },
  cloud: { r: 0, w: 52, h: 32, flat: true, draw: c => propBush(c, '#f4f8ff', '#ffffff') },
  flowers: { r: 0, w: 40, h: 20, flat: true, draw: (c, v) => propFlowers(c, v) },
  tuft: { r: 0, w: 24, h: 20, flat: true, draw: c => propTuft(c, '#2f6d2c') },
  drytuft: { r: 0, w: 24, h: 20, flat: true, draw: c => propTuft(c, '#8a6d3b') },
  bones: { r: 0, w: 36, h: 20, flat: true, draw: c => propBones(c) },
  mushroom: { r: 0, w: 36, h: 24, draw: c => propMushroom(c) },
  reeds: { r: 0, w: 30, h: 44, draw: c => propReeds(c) },
  swords: { r: 0, w: 40, h: 44, draw: c => propSwords(c) },
  torch: { r: 0, w: 20, h: 62, draw: c => propTorch(c) },
  pebbles: { r: 0, w: 30, h: 0, flat: true, draw: c => propPebbles(c) },
  vent: { r: 0, w: 70, h: 0, flat: true, draw: c => propCrack(c, '#ff6d00') },
  rift: { r: 0, w: 70, h: 0, flat: true, draw: c => propCrack(c, '#ec4899') },
};
// what stands in each biome (same order as STAGES): [kind, weight]
const PROP_SETS = [
  [['tree', 4], ['rock', 2], ['bush', 3], ['pond', 1]], // 초록 평원
  [['cactus', 4], ['sandrock', 4], ['drybush', 2]], // 메마른 사막
  [['pillar', 5], ['rock', 3], ['bush', 2]], // 고대 유적
  [['pine', 3], ['icecrystal', 3], ['snowrock', 3], ['snowbush', 2]], // 얼어붙은 동굴
  [['lavarock', 5], ['lava', 1], ['deadtree', 2]], // 불타는 화산
  [['darkpillar', 3], ['barrel', 2], ['crate', 2], ['torch', 3]], // 어둠의 던전
  [['swords', 4], ['deadtree', 2], ['rock', 2], ['barrel', 1], ['crate', 1]], // 버려진 전장
  [['deadtree', 4], ['swamp', 1], ['reeds', 3], ['mushroom', 3]], // 심연의 늪
  [['blossom', 4], ['marble', 3], ['bush', 2]], // 하늘 정원
  [['chaoscrystal', 4], ['voidrock', 4], ['deadtree', 1]], // 혼돈의 끝
];
// small things lying on the ground between them
const PROP_SMALL = [
  [['tuft', 3], ['flowers', 3], ['pebbles', 1]],
  [['drytuft', 3], ['bones', 2], ['pebbles', 2]],
  [['tuft', 3], ['pebbles', 3], ['bones', 1]],
  [['pebbles', 1]],
  [['vent', 3], ['pebbles', 2]],
  [['bones', 3], ['pebbles', 2]],
  [['drytuft', 3], ['bones', 3]],
  [['tuft', 3], ['pebbles', 1]],
  [['flowers', 4], ['cloud', 2]],
  [['rift', 3], ['bones', 1], ['pebbles', 1]],
];
const PROP_CELL = 190, PROP_RATE = 0.6, SMALL_RATE = 0.45;

// keep props off the paths that matter: section borders, boss spots and where the hero arrives
function propClear(x, y) {
  if (!G.world) return Math.hypot(x, y) > 200;
  const s = secAt(x, y), m = 140;
  if (s < 0 || secAt(x + m, y) !== s || secAt(x - m, y) !== s || secAt(x, y + m) !== s || secAt(x, y - m) !== s) return false;
  const near = (q, r) => Math.hypot(x - q.x, y - q.y) < r;
  const c = secCenter(s), l = lairSpot(s);
  return !fbSpots(s).some(q => near(q, 180)) && !near(l, 240) && !near({ x: c.x - (l.x - c.x) * 0.8, y: c.y - (l.y - c.y) * 0.8 }, 220);
}
// the props of one grid cell (at most one standing and one small), made once per run
function cellProps(i, j) {
  const M = G.props || (G.props = new Map()), key = (i + 32768) * 65536 + (j + 32768);
  let a = M.get(key);
  if (a) return a;
  a = [];
  const place = (sets, rate, salt) => {
    if (hash2(i * 7 + 3 + salt, j * 13 + 5) >= rate) return;
    const x = (i + 0.12 + 0.76 * hash2(j + 41 + salt, i)) * PROP_CELL, y = (j + 0.12 + 0.76 * hash2(i, j + 77 + salt)) * PROP_CELL;
    const sec = G.world ? secAt(x, y) : G.stage - 1;
    if (sec < 0 || !propClear(x, y)) return;
    const set = sets[sec % sets.length];
    let pick = hash2(i + 19 + salt, j + 23) * set.reduce((n, k) => n + k[1], 0), kind = set[0][0];
    for (const [k, wt] of set) { if ((pick -= wt) < 0) { kind = k; break; } }
    const K = PROP_KINDS[kind], s = 0.85 + hash2(j * 3 + 1, i * 5 + 2 + salt) * 0.35;
    a.push({ x, y, kind, sec, s, flip: hash2(i + 61, j + 3 + salt) < 0.5 ? -1 : 1, v: hash2(i + 5 + salt, j + 9), r: K.r * s, sy: K.sy || 1, w: K.w * s, h: K.h * s, flat: !!K.flat });
  };
  place(PROP_SETS, PROP_RATE, 0);
  place(PROP_SMALL, SMALL_RATE, 500);
  M.set(key, a);
  return a;
}
// Push a walker (anything with x, y) out of the props that block walking. The push leans a little
// sideways, so something walking straight into a rock slides around it instead of stopping dead.
function pushOutOfProps(o, r) {
  const ci = Math.floor(o.x / PROP_CELL), cj = Math.floor(o.y / PROP_CELL);
  for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const q of cellProps(i, j)) {
    if (!q.r) continue;
    const dx = o.x - q.x, dy = (o.y - q.y) / q.sy, d = Math.hypot(dx, dy) || 0.01, min = q.r + r;
    if (d >= min) continue;
    const k = (min - d) / d, side = (min - d) * 0.4 * q.flip / d;
    o.x += dx * k - dy * side; o.y += (dy * k + dx * side) * q.sy;
  }
}
// props on screen in open sections; flat ones (pools, cracks, flowers) or standing ones
function visibleProps(hw, hh, flat) {
  const p = G.p, pad = 110, out = [];
  const i0 = Math.floor((p.x - hw - pad) / PROP_CELL), i1 = Math.floor((p.x + hw + pad) / PROP_CELL);
  const j0 = Math.floor((p.y - hh - pad) / PROP_CELL), j1 = Math.floor((p.y + hh + pad * 2) / PROP_CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const q of cellProps(i, j)) {
    if (q.flat === flat && (!G.world || accessible(q.sec))) out.push(q);
  }
  return out;
}
function drawProp(q) {
  const p = G.p, key = 'props/' + q.kind, im = imgReady(key);
  ctx.save(); ctx.translate(q.x, q.y);
  // see-through while the hero walks behind something tall
  if (!q.flat && p.y < q.y && q.y - p.y < q.h + 10 && Math.abs(p.x - q.x) < q.w * 0.55) ctx.globalAlpha = 0.45;
  if (!q.flat) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 1, q.w * 0.42, q.w * 0.13, 0, 0, TAU); ctx.fill(); }
  ctx.scale(q.flip, 1);
  if (im) { const S = q.w * 1.3; ctx.drawImage(im, -S / 2, -S * imgBottom(key) + (q.flat ? S * 0.4 : 0), S, S); }
  else if (!imgPending(key)) { ctx.scale(q.s, q.s); ctx.lineJoin = 'round'; PROP_KINDS[q.kind].draw(ctx, q.v); }
  ctx.restore();
  ctx.lineCap = 'butt';
}
