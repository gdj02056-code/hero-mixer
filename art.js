'use strict';
// ============================================================
//  ART — weapons, heroes and pets drawn with canvas.
//  The same drawing code is used for inventory icons and in battle.
// ============================================================
const TAU = Math.PI * 2;
const OUT = 'rgba(15,15,30,.85)', METAL = '#e5e7eb', METAL_D = '#94a3b8', WOOD = '#92400e', DARK = '#3f3f46';

function poly(c, p) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); }
function rect(c, x, y, w, h) { c.beginPath(); c.rect(x, y, w, h); }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function paint(c, fill, stroke = OUT, lw = 1.5) { c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
function line(c, pts, color, w) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }
function star(c, x, y, R, r, n = 5) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU - Math.PI / 2, rr = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }

// Each weapon points up (-y) with the hand grip at (0,0). `a` = grade accent color.
// mid/span/mx are used to center the drawing inside an icon.
const WEAPON_ART = {
  sword: {
    mid: -17, span: 60, draw(c, a) {
      poly(c, [-4.5, -3, 4.5, -3, 4.5, -38, 0, -48, -4.5, -38]); paint(c, METAL);
      line(c, [0, -6, 0, -40], METAL_D, 1.5);
      rect(c, -12, -5, 24, 5); paint(c, a);
      rect(c, -2.2, 0, 4.4, 10); paint(c, WOOD);
      circ(c, 0, 12, 3.4); paint(c, a);
    },
  },
  dagger: {
    mid: -9, span: 54, draw(c, a) {
      c.beginPath(); c.moveTo(-3.5, -2); c.lineTo(3.5, -2); c.quadraticCurveTo(7, -16, 1, -31); c.quadraticCurveTo(-1, -17, -3.5, -2); c.closePath(); paint(c, METAL);
      line(c, [0, -5, 1.5, -24], METAL_D, 1.2);
      poly(c, [-9, -1, -6, -5, 6, -5, 9, -1, 6, 0, -6, 0]); paint(c, a);
      rect(c, -2, 0, 4, 9); paint(c, '#1f2937');
      line(c, [-2, 3, 2, 5], '#9ca3af', 1); line(c, [-2, 6, 2, 8], '#9ca3af', 1);
      circ(c, 0, 11, 2.8); paint(c, a);
    },
  },
  bow: {
    mid: -1, span: 66, draw(c, a) {
      c.save(); c.translate(0, 7);
      line(c, [-22, 8, 0, 15, 22, 8], '#f8fafc', 1.2);
      c.beginPath(); c.moveTo(-22, 8); c.quadraticCurveTo(0, -22, 22, 8);
      c.strokeStyle = OUT; c.lineWidth = 7; c.stroke(); c.strokeStyle = WOOD; c.lineWidth = 4.5; c.stroke();
      circ(c, -22, 8, 2.6); paint(c, a); circ(c, 22, 8, 2.6); paint(c, a);
      rect(c, -3.5, -10, 7, 7); paint(c, a);
      line(c, [0, 15, 0, -24], '#d6d3d1', 2);
      poly(c, [0, -31, 4, -22, -4, -22]); paint(c, METAL);
      poly(c, [0, 11, -4, 17, 0, 15]); paint(c, a, null); poly(c, [0, 11, 4, 17, 0, 15]); paint(c, a, null);
      c.restore();
    },
  },
  crossbow: {
    mid: -13, span: 64, draw(c, a) {
      rect(c, -3, -28, 6, 36); paint(c, WOOD);
      poly(c, [-4, 6, 4, 6, 6, 15, -6, 15]); paint(c, WOOD);
      line(c, [-20, -19, 0, -12, 20, -19], '#f8fafc', 1.2);
      c.beginPath(); c.moveTo(-20, -18); c.quadraticCurveTo(0, -31, 20, -18);
      c.strokeStyle = OUT; c.lineWidth = 6.5; c.stroke(); c.strokeStyle = '#64748b'; c.lineWidth = 4; c.stroke();
      line(c, [0, -12, 0, -36], '#a8a29e', 2.5);
      poly(c, [0, -42, 4, -34, -4, -34]); paint(c, METAL);
      rect(c, -4.5, -10, 9, 5); paint(c, a);
      line(c, [0, 0, 3, 5], DARK, 2);
    },
  },
  gun: {
    mid: -14, span: 62, draw(c, a) {
      rect(c, -2.3, -45, 4.6, 40); paint(c, '#4b5563');
      rect(c, -3.3, -32, 6.6, 3); paint(c, a); rect(c, -3.3, -18, 6.6, 3); paint(c, a);
      poly(c, [-4, -7, 4, -7, 6.5, 16, -7, 16]); paint(c, WOOD);
      rect(c, -4.5, -11, 9, 6); paint(c, '#9ca3af');
      line(c, [2, -2, 5, 3], DARK, 2);
      circ(c, 0, -45, 1.5); paint(c, '#111', null);
    },
  },
  hammer: {
    mid: -17, span: 70, draw(c, a) {
      rect(c, -2.6, -34, 5.2, 46); paint(c, WOOD);
      rect(c, -3.2, 4, 6.4, 8); paint(c, '#44403c');
      rect(c, -16, -47, 32, 17); paint(c, '#6b7280');
      rect(c, -16, -47, 6, 17); paint(c, '#9ca3af'); rect(c, 10, -47, 6, 17); paint(c, '#9ca3af');
      rect(c, -4, -47, 8, 17); paint(c, a);
    },
  },
  axe: {
    mid: -18, mx: -5, span: 70, draw(c, a) {
      rect(c, -2.2, -42, 4.4, 54); paint(c, WOOD);
      poly(c, [2, -42, 17, -50, 23, -33, 17, -15, 2, -24]); paint(c, METAL);
      line(c, [18, -48, 22, -33, 17, -17], '#ffffff', 1.5);
      poly(c, [-2, -38, -11, -33, -2, -28]); paint(c, METAL_D);
      rect(c, -3.2, -27, 6.4, 3.5); paint(c, a);
    },
  },
  spear: {
    mid: -18, span: 74, draw(c, a) {
      rect(c, -1.7, -36, 3.4, 54); paint(c, WOOD);
      poly(c, [0, -56, 6.5, -41, 0, -36, -6.5, -41]); paint(c, METAL);
      line(c, [0, -53, 0, -39], METAL_D, 1.2);
      poly(c, [-2.5, -35, 2.5, -35, 6, -24, -6, -24]); paint(c, a);
      circ(c, 0, 18, 2.6); paint(c, METAL);
    },
  },
  scythe: {
    mid: -18, mx: 10, span: 70, draw(c, a) {
      rect(c, -2, -46, 4, 60); paint(c, DARK);
      c.beginPath(); c.moveTo(2, -46); c.quadraticCurveTo(-26, -60, -40, -27); c.quadraticCurveTo(-24, -44, 2, -38); c.closePath(); paint(c, METAL);
      c.beginPath(); c.moveTo(-6, -50); c.quadraticCurveTo(-28, -54, -38, -30); c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.stroke();
      circ(c, 0, -42, 3.4); paint(c, a);
      rect(c, -2.8, 6, 5.6, 6); paint(c, a);
    },
  },
  spellbook: {
    mid: -2, span: 52, noRot: true, held: 'float', draw(c, a) {
      c.save(); c.rotate(-0.12);
      rect(c, -12, -16, 27, 31); paint(c, '#fef3c7');
      line(c, [-9, -12, 12, -12], '#d6c7a0', 1); line(c, [-9, 11, 12, 11], '#d6c7a0', 1);
      rect(c, -15, -19, 27, 33); paint(c, a);
      rect(c, -15, -19, 5, 33); paint(c, 'rgba(0,0,0,.28)', null);
      circ(c, 1, -2, 7); paint(c, '#fde68a');
      star(c, 1, -2, 5, 2.2); paint(c, a, null);
      rect(c, 8, -4, 4, 5); paint(c, '#fde68a');
      c.restore();
    },
  },
  wand: {
    mid: -15, span: 54, draw(c, a) {
      rect(c, -1.7, -30, 3.4, 40); paint(c, '#3f2a1d');
      rect(c, -2.4, 1, 4.8, 9); paint(c, a);
      line(c, [-1.7, -10, 1.7, -14], '#fde68a', 1);
      star(c, 0, -35, 8.5, 3.6); paint(c, a);
      circ(c, 0, -35, 2.2); paint(c, '#fff', null);
    },
  },
  staff: {
    mid: -20, span: 74, draw(c, a) {
      rect(c, -2.1, -42, 4.2, 58); paint(c, WOOD);
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 2, -42); c.quadraticCurveTo(s * 11, -50, s * 4, -58); c.strokeStyle = OUT; c.lineWidth = 4.5; c.stroke(); c.strokeStyle = WOOD; c.lineWidth = 2.8; c.stroke(); }
      circ(c, 0, -50, 7.5); paint(c, a);
      circ(c, -2.5, -52.5, 2.4); paint(c, 'rgba(255,255,255,.85)', null);
      rect(c, -2.8, -30, 5.6, 3); paint(c, a);
    },
  },
};

const ICONS = new Map();
function iconURL(key, size, draw) {
  let url = ICONS.get(key);
  if (url) return url;
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'); c.lineJoin = 'round';
  draw(c, size);
  url = cv.toDataURL(); ICONS.set(key, url);
  return url;
}
// ---------- generated images (img/, listed in imglist.js); canvas art is the fallback ----------
const IMG_SET = new Set(typeof IMG_LIST !== 'undefined' ? IMG_LIST : []);
const IMGS = {};
// loads an image the first time it is asked for; until then the canvas art is drawn instead
function imgReady(k) {
  if (!k || !IMG_SET.has(k)) return null;
  let im = IMGS[k];
  if (!im) { im = IMGS[k] = new Image(); im.src = `img/${k}.webp`; }
  return im.complete && im.naturalWidth ? im : null;
}
const imgURL = k => k && IMG_SET.has(k) ? `img/${k}.webp` : null;
// grade image, else the nearest lower grade, else the plain image
function gradedKey(dir, id, g) {
  for (let i = g; i >= 0; i--) { const k = `${dir}/${id}_${GRADES[i].code}`; if (IMG_SET.has(k)) return k; }
  return IMG_SET.has(`${dir}/${id}`) ? `${dir}/${id}` : null;
}
const weaponKey = (wt, g) => gradedKey('weapons', wt, g);
const equipKey = (slot, g) => gradedKey('equip', slot, g);
// where the hand holds each weapon image (fraction of the image; images are drawn diagonally, grip bottom-left)
const WEAPON_GRIP = { bow: [0.38, 0.55], crossbow: [0.3, 0.72], gun: [0.32, 0.7], hammer: [0.22, 0.78], axe: [0.22, 0.78], spear: [0.3, 0.7], scythe: [0.26, 0.74], staff: [0.28, 0.72] };
const WEAPON_IMG_SIZE = 44;
// white silhouette of an image, for the hit flash
const WHITE = new Map();
function whiteOf(im) {
  let w = WHITE.get(im);
  if (!w) {
    w = document.createElement('canvas'); w.width = im.naturalWidth; w.height = im.naturalHeight;
    const x = w.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height);
    WHITE.set(im, w);
  }
  return w;
}

function drawWeaponCentered(c, size, wt, g) {
  const A = WEAPON_ART[wt], col = GRADES[g].c;
  c.translate(size / 2, size / 2);
  if (!A.noRot) c.rotate(Math.PI / 4);
  const k = size * (A.noRot ? 0.75 : 1.05) / A.span;
  c.scale(k, k); c.translate(A.mx || 0, -A.mid);
  if (g >= 5) { c.shadowColor = col; c.shadowBlur = 6 + (g - 5) * 3; }
  A.draw(c, col);
}
const weaponIcon = (wt, g) => imgURL(weaponKey(wt, g)) || iconURL(`w:${wt}:${g}`, 128, (c, s) => drawWeaponCentered(c, s, wt, g));

// ---------- hero ----------
const easeOut = t => 1 - (1 - t) * (1 - t);
function drawHeld(c, o, t) {
  const wt = o.wt, aim = o.aim || 0, sw = o.swing == null ? -1 : o.swing;
  let hx = Math.cos(aim) * 12, hy = 5 + Math.sin(aim) * 7;
  if (!wt) {
    const ext = sw >= 0 ? Math.sin(sw * Math.PI) * 12 : 0;
    circ(c, hx + Math.cos(aim) * ext, hy + Math.sin(aim) * ext, 4.5); paint(c, o.look.skin);
    return;
  }
  const A = WEAPON_ART[wt], W = WT[wt], col = GRADES[o.grade || 0].c;
  if (A.held === 'float') {
    c.save(); c.translate((o.face || 1) * 20, -16 + Math.sin(t * 3) * 2.5);
    if (sw >= 0) { c.shadowColor = '#c084fc'; c.shadowBlur = 20; }
    const fim = imgReady(weaponKey(wt, o.grade || 0));
    if (fim) c.drawImage(fim, -14, -14, 28, 28); else { c.scale(0.6, 0.6); A.draw(c, col); }
    c.restore();
    if (!o.img) { circ(c, hx, hy, 3.6); paint(c, o.look.skin); }
    return;
  }
  let rot = aim + Math.PI / 2;
  switch (W.kind) {
    case 'slash': rot += sw >= 0 ? -1.4 + 2.8 * easeOut(sw) : -0.9; break;
    case 'spin': rot += sw >= 0 ? sw * TAU : -0.9; break;
    case 'slam': rot += sw >= 0 ? (sw < 0.4 ? -1.8 * (sw / 0.4) : -1.8 + 1.8 * easeOut((sw - 0.4) / 0.6)) : -0.6; break;
    case 'thrust': { const ext = sw >= 0 ? Math.sin(sw * Math.PI) * 18 : 0; hx += Math.cos(aim) * ext; hy += Math.sin(aim) * ext; if (sw < 0) rot -= 0.25; break; }
    case 'axe': rot += sw >= 0 ? -1.6 + 2.4 * sw : -0.6; break;
    default: if (sw >= 0) { hx -= Math.cos(aim) * 4 * (1 - sw); hy -= Math.sin(aim) * 4 * (1 - sw); }
  }
  c.save(); c.translate(hx, hy); c.rotate(rot);
  if ((o.grade || 0) >= 5) { c.shadowColor = col; c.shadowBlur = 12; }
  const wim = imgReady(weaponKey(wt, o.grade || 0));
  if (wim) {
    const [gx, gy] = WEAPON_GRIP[wt] || [0.2, 0.8], S = WEAPON_IMG_SIZE;
    c.rotate(-Math.PI / 4); // image points up-right; turn it to point along the aim
    c.drawImage(wim, -gx * S, -gy * S, S, S);
  } else { const k = A.span > 68 ? 0.62 : 0.72; c.scale(k, k); A.draw(c, col); }
  c.restore();
  if (!o.img) { circ(c, hx, hy, 3.6); paint(c, o.look.skin); }
}
// o: { look, wt, grade, aim, face, walk, swing, alpha }
function drawHeroImg(c, x, y, o, t, im) {
  const face = o.face || 1, H = 50, walk = o.walk || 0;
  o = Object.assign({}, o, { img: true });
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 15, 14, 5, 0, 0, TAU); c.fill();
  c.translate(0, -Math.abs(Math.sin(walk)) * 2.5);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  const behind = Math.sin(o.aim || 0) < -0.35;
  if (behind) drawHeld(c, o, t);
  c.save(); c.scale(face, 1); c.rotate(Math.sin(walk) * 0.06);
  c.drawImage(im, -H / 2, 17 - H * 0.94, H, H);
  c.restore();
  if (!behind) drawHeld(c, o, t);
  c.restore();
}
function drawHero(c, x, y, o, t) {
  const him = o.id && imgReady('heroes/' + o.id);
  if (him) return drawHeroImg(c, x, y, o, t, him);
  const L = o.look, face = o.face || 1;
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 15, 14, 5, 0, 0, TAU); c.fill();
  c.translate(0, -Math.abs(Math.sin(o.walk || 0)) * 2.5);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  const behind = Math.sin(o.aim || 0) < -0.35;
  if (behind) drawHeld(c, o, t);
  // cape
  poly(c, [-10, -4, 10, -4, -face * 7 + 13, 15, -face * 7 - 13, 15]); paint(c, L.cape, OUT, 1.2);
  // feet
  const st = Math.sin(o.walk || 0) * 3;
  circ(c, -5, 15 + st * 0.3, 3.5); paint(c, '#3f2a1d', null); circ(c, 5, 15 - st * 0.3, 3.5); paint(c, '#3f2a1d', null);
  // body
  circ(c, 0, 4, 12); paint(c, L.body, OUT, 1.2);
  rect(c, -11, 7, 22, 3); paint(c, 'rgba(0,0,0,.3)', null);
  // head
  if (L.hood) { circ(c, 0, -10, 14); paint(c, L.hood, OUT, 1.2); }
  if (L.elf) { poly(c, [-9, -11, -19, -16, -10, -5]); paint(c, L.skin, OUT, 1); poly(c, [9, -11, 19, -16, 10, -5]); paint(c, L.skin, OUT, 1); }
  circ(c, 0, -9, 11); paint(c, L.skin, OUT, 1.2);
  if (!L.bald && !L.hood && !L.helmet) { c.beginPath(); c.arc(0, -11, 11.6, Math.PI, TAU); c.closePath(); paint(c, L.hair, null); rect(c, -11.6, -12, 6, 7); paint(c, L.hair, null); rect(c, 5.6, -12, 6, 7); paint(c, L.hair, null); }
  if (L.helmet) { c.beginPath(); c.arc(0, -10, 12.5, Math.PI * 1.02, TAU * 0.99); c.closePath(); paint(c, L.helmet, OUT, 1.2); rect(c, -12, -11, 24, 3); paint(c, 'rgba(0,0,0,.25)', null); }
  if (L.horns) { poly(c, [-8, -17, -15, -27, -4, -20]); paint(c, '#fef3c7', OUT, 1); poly(c, [8, -17, 15, -27, 4, -20]); paint(c, '#fef3c7', OUT, 1); }
  if (L.cat) { poly(c, [-10, -14, -9, -25, -2, -18]); paint(c, L.hair, OUT, 1); poly(c, [10, -14, 9, -25, 2, -18]); paint(c, L.hair, OUT, 1); poly(c, [-8, -16, -8, -22, -4, -18]); paint(c, '#fda4af', null); poly(c, [8, -16, 8, -22, 4, -18]); paint(c, '#fda4af', null); }
  if (L.band) { rect(c, -11.5, -15, 23, 3.5); paint(c, L.band, null); poly(c, [-face * 11, -14, -face * 18, -11, -face * 16, -16]); paint(c, L.band, null); }
  if (L.mask) { rect(c, -10, -6, 20, 6); paint(c, L.hair === '#111827' ? '#1e293b' : '#111827', null); }
  // eyes
  const ex = face * 3;
  circ(c, -4 + ex, -9, 1.9); paint(c, '#111', null); circ(c, 4 + ex, -9, 1.9); paint(c, '#111', null);
  if (L.beard) { c.beginPath(); c.arc(face * 1, -5, 8, 0.15, Math.PI - 0.15); c.closePath(); paint(c, L.hair, OUT, 1); }
  if (L.crown) { poly(c, [-8, -18, -8, -26, -4, -21, 0, -28, 4, -21, 8, -26, 8, -18]); paint(c, '#fbbf24', OUT, 1); circ(c, 0, -21, 1.5); paint(c, '#ef4444', null); }
  if (L.halo) { c.beginPath(); c.ellipse(0, -29, 9, 3, 0, 0, TAU); c.strokeStyle = '#fde047'; c.lineWidth = 2.5; c.shadowColor = '#fde047'; c.shadowBlur = 8; c.stroke(); c.shadowBlur = 0; }
  if (L.hat === 'wizard') { poly(c, [-14, -15, 14, -15, face * 4, -40]); paint(c, L.hatColor, OUT, 1.2); rect(c, -12, -17, 24, 3); paint(c, '#fbbf24', null); }
  if (L.hat === 'cowboy') { c.beginPath(); c.ellipse(0, -17, 17, 4, 0, 0, TAU); paint(c, L.hatColor || '#78350f', OUT, 1.2); rect(c, -8, -27, 16, 10); paint(c, L.hatColor || '#78350f', OUT, 1.2); rect(c, -8, -20, 16, 2.5); paint(c, '#f59e0b', null); }
  if (!behind) drawHeld(c, o, t);
  c.restore();
}
const heroLookOpts = (h, g = 3) => ({ look: h.look, wt: h.wt, grade: g, aim: 0.5, face: 1, walk: 0 });
const heroIcon = id => imgURL('heroes/' + id) || iconURL(`h:${id}`, 160, (c, s) => { c.translate(s / 2, s / 2 + 8); c.scale(2.6, 2.6); drawHero(c, 0, 0, heroLookOpts(HERO[id]), 0); });

// ---------- pets ----------
// four-legged critters share one body: cat, dog, fox, wolf, bunny
function critter(c, t, fur, acc, o) {
  if (o.tail === 'fluffy') { c.beginPath(); c.ellipse(-12, 1, 9, 4.5, -0.6 + Math.sin(t * 5) * 0.2, 0, TAU); paint(c, fur, OUT, 1); circ(c, -18, -3, 3); paint(c, acc, null); }
  else if (o.tail === 'thin') { c.beginPath(); c.moveTo(-6, 6); c.quadraticCurveTo(-17, Math.sin(t * 5) * 2, -13, -9); c.strokeStyle = fur; c.lineWidth = 3; c.lineCap = 'round'; c.stroke(); }
  circ(c, 0, 5, 7); paint(c, fur, OUT, 1.2);
  if (o.ears === 'point') { poly(c, [-7, -7, -5, -16, 0, -9]); paint(c, fur, OUT, 1); poly(c, [7, -7, 5, -16, 0, -9]); paint(c, fur, OUT, 1); }
  if (o.ears === 'long') for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 3.5, -16, 2.8, 8, s * 0.15, 0, TAU); paint(c, fur, OUT, 1); c.beginPath(); c.ellipse(s * 3.5, -16, 1.2, 6, s * 0.15, 0, TAU); paint(c, acc, null); }
  circ(c, 0, -4, 8); paint(c, fur, OUT, 1.2);
  if (o.ears === 'floppy') for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 8, -3, 3, 6, s * 0.3, 0, TAU); paint(c, o.earColor || '#78350f', OUT, 1); }
  if (o.muzzle) { c.beginPath(); c.ellipse(4, -1, 4, 3, 0, 0, TAU); paint(c, acc, null); circ(c, 7.5, -2, 1.3); paint(c, '#111', null); }
  if (o.fierce) { line(c, [-3, -8, 0, -6.5], '#111', 1.2); line(c, [6, -8, 3, -6.5], '#111', 1.2); }
  circ(c, -1, -5, 1.6); paint(c, '#111', null); circ(c, 4, -5, 1.6); paint(c, '#111', null);
  if (o.helmet) { rect(c, -6, -13, 12, 3); paint(c, o.helmet, null); }
  if (o.whiskers) { line(c, [6, -2, 11, -3], '#fff', 0.8); line(c, [6, -1, 11, 1], '#fff', 0.8); }
  if (o.collar) { rect(c, -5, 1.5, 10, 2.5); paint(c, '#dc2626', null); circ(c, 0, 5, 1.8); paint(c, '#facc15', null); }
}
function drawPet(c, id, x, y, t, face = 1) {
  const P = PET[id], [c1, c2, c3] = P.c;
  c.save(); c.translate(x, y); c.scale(face, 1);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 11, 9, 3, 0, 0, TAU); c.fill();
  const pim = imgReady('pets/' + id);
  if (pim) { const S = 32; c.drawImage(pim, -S / 2, 12 - S * 0.94 + Math.sin(t * 6) * 1.5, S, S); c.restore(); return; }
  const bob = Math.sin(t * 6) * 2, flap = Math.sin(t * 14);
  const eyes = (x1, x2, yy, r = 1.6) => { circ(c, x1, yy, r); paint(c, '#111', null); circ(c, x2, yy, r); paint(c, '#111', null); };
  switch (P.base) {
    case 'slime': {
      const sq = 1 + Math.sin(t * 8) * 0.08;
      c.beginPath(); c.ellipse(0, 3, 10 * sq, 8 / sq, 0, 0, TAU); paint(c, c1, OUT, 1.2);
      circ(c, -4, 0, 2.4); paint(c, c2, null);
      eyes(2, 6, 2);
      if (P.kind === 'fire') { c.beginPath(); c.moveTo(-4, -3); c.quadraticCurveTo(0, -15 + Math.sin(t * 12) * 2, 4, -3); paint(c, '#fde047', null); }
      if (P.crown) { poly(c, [-6, -4, -6, -12, -3, -7, 0, -13, 3, -7, 6, -12, 6, -4]); paint(c, '#fbbf24', OUT, 1); }
      break;
    }
    case 'cat': c.translate(0, bob * 0.5); critter(c, t, c1, c1, { ears: 'point', tail: 'thin', helmet: c2, whiskers: true }); break;
    case 'dog': c.translate(0, bob * 0.5); critter(c, t, c1, c2, { ears: 'floppy', tail: 'thin', muzzle: true, collar: true, earColor: '#92400e' }); break;
    case 'fox': c.translate(0, bob * 0.5); critter(c, t, c1, c2, { ears: 'point', tail: 'fluffy', muzzle: true }); break;
    case 'wolf': c.translate(0, bob * 0.5); critter(c, t, c1, c2, { ears: 'point', tail: 'fluffy', muzzle: true, fierce: true }); break;
    case 'bunny': c.translate(0, -Math.abs(Math.sin(t * 7)) * 4); critter(c, t, c1, c2, { ears: 'long' }); circ(c, -7, 7, 2.5); paint(c, '#fff', OUT, 0.8); break;
    case 'fairy': {
      c.translate(0, bob - 6);
      const g = c.createRadialGradient(0, 0, 1, 0, 0, 16); g.addColorStop(0, 'rgba(251,207,232,.8)'); g.addColorStop(1, 'rgba(251,207,232,0)');
      c.fillStyle = g; circ(c, 0, 0, 16); c.fill();
      const fl = Math.abs(Math.sin(t * 18));
      c.globalAlpha = 0.7; c.beginPath(); c.ellipse(-7, -3, 7, 3 + fl * 3, -0.5, 0, TAU); paint(c, c2, null);
      c.beginPath(); c.ellipse(7, -3, 7, 3 + fl * 3, 0.5, 0, TAU); paint(c, c2, null); c.globalAlpha = 1;
      circ(c, 0, 2, 4.5); paint(c, c1, OUT, 1);
      circ(c, 0, -5, 4); paint(c, '#fde4c8', OUT, 1);
      circ(c, 1.5, -5, 0.9); paint(c, '#111', null);
      break;
    }
    case 'ghost': {
      c.translate(0, bob - 4); c.globalAlpha = 0.9;
      c.beginPath(); c.arc(0, -2, 9, Math.PI, TAU); c.lineTo(9, 8);
      for (let i = 0; i < 4; i++) { const xx = 9 - (i + 1) * 4.5; c.quadraticCurveTo(xx + 2.25, 4 + Math.sin(t * 8 + i) * 2, xx, 8); }
      c.closePath(); paint(c, c1, OUT, 1.2);
      c.beginPath(); c.ellipse(-1, -2, 1.6, 2.6, 0, 0, TAU); paint(c, '#111', null); c.beginPath(); c.ellipse(4, -2, 1.6, 2.6, 0, 0, TAU); paint(c, '#111', null);
      break;
    }
    case 'eagle': {
      c.translate(0, bob - 6);
      const fl = flap * 7;
      poly(c, [-3, 0, -18, -4 + fl, -12, 4]); paint(c, '#78350f', OUT, 1); poly(c, [3, 0, 18, -4 + fl, 12, 4]); paint(c, '#78350f', OUT, 1);
      c.beginPath(); c.ellipse(0, 2, 6, 8, 0, 0, TAU); paint(c, c1, OUT, 1.2);
      circ(c, 0, -7, 5); paint(c, c2, OUT, 1);
      poly(c, [4, -8, 9, -6, 4, -5]); paint(c, '#facc15', OUT, 0.8);
      circ(c, 2, -8, 1); paint(c, '#111', null);
      break;
    }
    case 'owl': {
      c.translate(0, bob - 4);
      poly(c, [-6, 0, -13, 2 + flap * 3, -7, 7]); paint(c, c1, OUT, 1); poly(c, [6, 0, 13, 2 + flap * 3, 7, 7]); paint(c, c1, OUT, 1);
      c.beginPath(); c.ellipse(0, 1, 8, 9, 0, 0, TAU); paint(c, c1, OUT, 1.2);
      c.beginPath(); c.ellipse(0, 4, 5, 5, 0, 0, TAU); paint(c, '#fef3c7', null);
      poly(c, [-7, -6, -6, -12, -3, -7]); paint(c, c1, OUT, 1); poly(c, [7, -6, 6, -12, 3, -7]); paint(c, c1, OUT, 1);
      for (const s of [-1, 1]) { circ(c, s * 3.3, -3, 3.2); paint(c, '#fff', OUT, 0.8); circ(c, s * 3.3 + 0.6, -3, 1.8); paint(c, c2, null); circ(c, s * 3.3 + 0.6, -3, 0.9); paint(c, '#111', null); }
      poly(c, [0, -1, 1.5, 1.5, -1.5, 1.5]); paint(c, '#f59e0b', null);
      break;
    }
    case 'phoenix': {
      c.translate(0, bob - 6);
      c.shadowColor = '#f97316'; c.shadowBlur = 12;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-4, 4); c.quadraticCurveTo(-14 - i * 3, 8 + i * 3 + Math.sin(t * 9 + i) * 2, -20 - i * 2, 4 + i * 4); c.strokeStyle = i % 2 ? c2 : c1; c.lineWidth = 3; c.lineCap = 'round'; c.stroke(); }
      poly(c, [-2, -1, -16, -10 + flap * 7, -10, 4]); paint(c, c2, OUT, 1); poly(c, [2, -1, 16, -10 + flap * 7, 10, 4]); paint(c, c2, OUT, 1);
      c.beginPath(); c.ellipse(0, 2, 6, 7, 0, 0, TAU); paint(c, c1, OUT, 1.2);
      circ(c, 3, -6, 4.5); paint(c, c1, OUT, 1);
      poly(c, [1, -10, 0, -16, 4, -11]); paint(c, c2, null);
      poly(c, [7, -7, 11, -5, 7, -4]); paint(c, '#facc15', OUT, 0.8);
      circ(c, 4.5, -7, 1); paint(c, '#111', null);
      c.shadowBlur = 0;
      break;
    }
    case 'dragon': {
      c.translate(0, bob - 4);
      const fl = flap * 5;
      poly(c, [-2, -2, -16, -12 + fl, -12, 2]); paint(c, c2, OUT, 1);
      c.beginPath(); c.moveTo(-6, 6); c.quadraticCurveTo(-16, 10, -18, 2); c.strokeStyle = c1; c.lineWidth = 3; c.stroke();
      circ(c, -1, 3, 8); paint(c, c1, OUT, 1.2);
      c.beginPath(); c.ellipse(1, 5, 4, 5, 0, 0, TAU); paint(c, c3, null);
      circ(c, 6, -5, 6.5); paint(c, c1, OUT, 1.2);
      poly(c, [3, -10, 1, -17, 6, -11]); paint(c, '#fef3c7', OUT, 0.8); poly(c, [7, -11, 8, -18, 10, -10]); paint(c, '#fef3c7', OUT, 0.8);
      circ(c, 8, -6, 1.4); paint(c, '#111', null);
      poly(c, [2, -2, 16, -12 + fl, 12, 2]); paint(c, c2, OUT, 1);
      break;
    }
    case 'penguin': {
      c.translate(0, Math.abs(Math.sin(t * 6)) * -1.5);
      const w = Math.sin(t * 8) * 0.4;
      c.save(); c.translate(-7, 2); c.rotate(0.4 + w); c.beginPath(); c.ellipse(0, 3, 2.5, 6, 0, 0, TAU); paint(c, c1, OUT, 1); c.restore();
      c.save(); c.translate(7, 2); c.rotate(-0.4 - w); c.beginPath(); c.ellipse(0, 3, 2.5, 6, 0, 0, TAU); paint(c, c1, OUT, 1); c.restore();
      c.beginPath(); c.ellipse(0, 1, 8, 10, 0, 0, TAU); paint(c, c1, OUT, 1.2);
      c.beginPath(); c.ellipse(1, 3, 5.5, 7, 0, 0, TAU); paint(c, c2, null);
      eyes(0, 5, -4, 1.4);
      poly(c, [2, -2, 8, -1, 2, 1]); paint(c, '#f97316', OUT, 0.8);
      c.beginPath(); c.ellipse(-3, 11, 3, 1.5, 0, 0, TAU); paint(c, '#f97316', null); c.beginPath(); c.ellipse(3, 11, 3, 1.5, 0, 0, TAU); paint(c, '#f97316', null);
      break;
    }
    case 'mushroom': {
      c.translate(0, bob * 0.5);
      rect(c, -5, -2, 10, 12); paint(c, c2, OUT, 1.2);
      eyes(-1.5, 2.5, 3, 1.3);
      c.beginPath(); c.arc(0, -2, 11, Math.PI, TAU); c.closePath(); paint(c, c1, OUT, 1.2);
      for (const [dx, dy, r] of [[-5, -6, 2.2], [2, -9, 2.6], [6, -4, 1.8]]) { circ(c, dx, dy, r); paint(c, '#fff', null); }
      break;
    }
    case 'bee': {
      c.translate(0, bob - 6);
      c.globalAlpha = 0.6;
      c.beginPath(); c.ellipse(-2, -8, 4, 6 + flap * 2, -0.4, 0, TAU); paint(c, '#e0f2fe', null);
      c.beginPath(); c.ellipse(3, -8, 4, 6 + flap * 2, 0.4, 0, TAU); paint(c, '#e0f2fe', null);
      c.globalAlpha = 1;
      c.beginPath(); c.ellipse(0, 0, 9, 7, 0, 0, TAU); paint(c, c1, OUT, 1.2);
      for (const sx of [-3, 2]) { rect(c, sx, -6.5, 2.6, 13); paint(c, c2, null); }
      poly(c, [-9, 0, -14, 0, -9, 2]); paint(c, c2, null);
      circ(c, 6, -1, 1.4); paint(c, '#111', null);
      line(c, [5, -6, 8, -11], '#111', 1);
      break;
    }
    case 'turtle': {
      c.translate(0, Math.abs(Math.sin(t * 4)) * -1);
      for (const [dx, dy] of [[-6, 7], [5, 7]]) { circ(c, dx, dy, 2.8); paint(c, c2, OUT, 1); }
      circ(c, 11, 0, 4.5); paint(c, c2, OUT, 1.2);
      circ(c, 12.5, -1, 1.1); paint(c, '#111', null);
      c.beginPath(); c.arc(0, 4, 11, Math.PI, TAU); c.closePath(); paint(c, c1, OUT, 1.2);
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.2;
      poly(c, [-4, -3, 4, -3, 6, 2, -6, 2]); c.stroke();
      line(c, [-4, -3, -7, -5], 'rgba(0,0,0,.3)', 1.2); line(c, [4, -3, 7, -5], 'rgba(0,0,0,.3)', 1.2);
      break;
    }
    case 'robot': {
      c.translate(0, bob - 6);
      c.globalAlpha = 0.6 + Math.random() * 0.3; poly(c, [-3, 10, 3, 10, 0, 16]); paint(c, '#38bdf8', null); c.globalAlpha = 1;
      rect(c, -7, 2, 14, 8); paint(c, '#64748b', OUT, 1.2);
      rect(c, -9, -10, 18, 13); paint(c, c1, OUT, 1.2);
      rect(c, -6, -7, 13, 5); paint(c, '#0f172a', null);
      circ(c, 3, -4.5, 1.8); c.fillStyle = c2; c.shadowColor = c2; c.shadowBlur = 8; c.fill(); c.shadowBlur = 0;
      line(c, [0, -10, 0, -15], '#475569', 1.5);
      circ(c, 0, -16, 2); paint(c, Math.sin(t * 6) > 0 ? c2 : '#fca5a5', null);
      break;
    }
    case 'jelly': {
      c.translate(0, bob * 1.5 - 6);
      for (let i = 0; i < 4; i++) { const xx = -6 + i * 4; c.beginPath(); c.moveTo(xx, 2); c.quadraticCurveTo(xx + Math.sin(t * 6 + i) * 3, 9, xx, 15); c.strokeStyle = c2; c.lineWidth = 1.6; c.stroke(); }
      c.shadowColor = c1; c.shadowBlur = 12; c.globalAlpha = 0.85;
      c.beginPath(); c.arc(0, 3, 10, Math.PI, TAU); c.closePath(); paint(c, c1, OUT, 1);
      c.globalAlpha = 1; c.shadowBlur = 0;
      circ(c, -4, -3, 2); paint(c, c2, null);
      eyes(0, 4, 0, 1.3);
      break;
    }
    case 'golem': {
      c.translate(0, Math.abs(Math.sin(t * 5)) * -1.5);
      rect(c, -8, 8, 5, 4); paint(c, c1, OUT, 1); rect(c, 3, 8, 5, 4); paint(c, c1, OUT, 1);
      rect(c, -14, -2, 5, 9); paint(c, c1, OUT, 1); rect(c, 9, -2, 5, 9); paint(c, c1, OUT, 1);
      rect(c, -9, -4, 18, 13); paint(c, c1, OUT, 1.2);
      rect(c, -6, -12, 12, 9); paint(c, '#a8a29e', OUT, 1.2);
      circ(c, -2, -8, 1.6); c.fillStyle = c2; c.shadowColor = c2; c.shadowBlur = 8; c.fill(); circ(c, 3, -8, 1.6); c.fill(); c.shadowBlur = 0;
      line(c, [-4, 0, 0, 4, -2, 7], 'rgba(0,0,0,.35)', 1);
      break;
    }
    case 'star': {
      c.translate(0, bob * 1.5 - 8);
      c.save(); c.rotate(Math.sin(t * 2) * 0.2);
      c.shadowColor = c1; c.shadowBlur = 16;
      star(c, 0, 0, 12, 5.5); paint(c, c1, OUT, 1.2);
      c.shadowBlur = 0; c.restore();
      eyes(-2.5, 2.5, -1, 1.3);
      c.beginPath(); c.arc(0, 1.5, 2, 0.2, Math.PI - 0.2); c.strokeStyle = '#111'; c.lineWidth = 1; c.stroke();
      for (let i = 0; i < 3; i++) { const a = t * 2 + i * TAU / 3; star(c, Math.cos(a) * 15, Math.sin(a) * 15, 2.5, 1, 4); paint(c, c2, null); }
      break;
    }
  }
  c.restore();
}
const petIcon = id => imgURL('pets/' + id) || iconURL(`p:${id}`, 128, (c, s) => { c.translate(s / 2, s / 2 + 8); c.scale(3.1, 3.1); drawPet(c, id, 0, 0, 0.3, 1); });
