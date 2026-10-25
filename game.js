'use strict';
// ============================================================
//  HERO MIXER — 모든 결제가 ₩0 인 서바이벌 액션 RPG
// ============================================================

// ---------- utils ----------
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;
const fmt = n => { n = Math.floor(n); return n >= 1e7 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e5 ? Math.floor(n / 1e3) + 'K' : n.toLocaleString(); };
const fmtTime = s => { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash2(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// ---------- data ----------
const STAGES = [
  { name: '초록 평원', emoji: '🌿', g1: '#3f7a3a', g2: '#3a7035', deco: '#5aa050' },
  { name: '메마른 사막', emoji: '🏜️', g1: '#c9a75f', g2: '#bf9d55', deco: '#9c7b40' },
  { name: '고대 유적', emoji: '🏛️', g1: '#6b6f5e', g2: '#636756', deco: '#8d9180' },
  { name: '얼어붙은 동굴', emoji: '🧊', g1: '#7fa3bb', g2: '#7699b1', deco: '#d4ebf7' },
  { name: '불타는 화산', emoji: '🌋', g1: '#4a2a22', g2: '#43251e', deco: '#ea580c' },
  { name: '어둠의 던전', emoji: '🕯️', g1: '#2c2a3a', g2: '#272534', deco: '#55507a' },
  { name: '버려진 전장', emoji: '⚔️', g1: '#5a4c3a', g2: '#524534', deco: '#857560' },
  { name: '심연의 늪', emoji: '🐸', g1: '#2f4a3f', g2: '#2a4339', deco: '#4f8a60' },
  { name: '하늘 정원', emoji: '☁️', g1: '#8fb0d6', g2: '#86a7cd', deco: '#ffffff' },
  { name: '혼돈의 끝', emoji: '🌀', g1: '#3a1a2e', g2: '#331729', deco: '#be185d' },
];
const BOSSES = ['킹 슬라임', '사막 전갈왕', '유적의 수호자', '서리 거인', '용암 골렘', '어둠의 군주', '망령 기사단장', '늪의 히드라', '천공의 그리폰', '혼돈의 마왕'];
const STAGE_TIME = 180;
const MAX_EN = 30, EN_COST = 5, EN_REGEN_MS = 5 * 60 * 1000;

const ETYPES = {
  slime: { r: 14, hp: 12, spd: 62, dmg: 8, xp: 1, color: '#22c55e' },
  bat: { r: 11, hp: 7, spd: 108, dmg: 6, xp: 1, color: '#a855f7' },
  archer: { r: 13, hp: 16, spd: 58, dmg: 7, xp: 2, color: '#f97316', ranged: true },
  golem: { r: 22, hp: 60, spd: 42, dmg: 15, xp: 5, color: '#a16207' },
  elite: { r: 30, hp: 380, spd: 58, dmg: 20, xp: 25, color: '#dc2626', elite: true },
  boss: { r: 54, hp: 4000, spd: 52, dmg: 30, xp: 100, color: '#7c3aed', boss: true },
};

const WEAPONS = {
  knife: { name: '수리검', icon: '✴️', pair: 'book', evo: '수리검 폭풍', evoIcon: '🌟', info: '가장 가까운 적에게 수리검을 던집니다.', evoInfo: '사방으로 관통 수리검을 난사합니다.' },
  orbit: { name: '회전 칼날', icon: '🌀', pair: 'glove', evo: '성검 회전진', evoIcon: '⚜️', info: '주위를 도는 칼날이 적을 벱니다.', evoInfo: '거대한 성검 7자루가 주위를 돕니다.' },
  thunder: { name: '번개', icon: '⚡', pair: 'clock', evo: '뇌신의 심판', evoIcon: '🌩️', info: '무작위 적에게 번개를 내리칩니다.', evoInfo: '연쇄 번개가 적들을 꿰뚫습니다.' },
  aura: { name: '화염 오라', icon: '🔥', pair: 'armor', evo: '지옥불 영역', evoIcon: '☄️', info: '주변 적에게 지속 피해를 줍니다.', evoInfo: '거대한 지옥불이 적을 태우고 느리게 합니다.' },
  boomer: { name: '부메랑', icon: '🪃', pair: 'boots', evo: '차크람', evoIcon: '💫', info: '날아갔다 돌아오며 적을 관통합니다.', evoInfo: '거대한 차크람 4개를 던집니다.' },
  rocket: { name: '로켓', icon: '🚀', pair: 'magnet', evo: '핵 미사일', evoIcon: '☢️', info: '적에게 날아가 폭발합니다.', evoInfo: '초대형 폭발 미사일을 연사합니다.' },
};
const PASSIVES = {
  book: { name: '마도서', icon: '📕', info: '공격 범위/크기 +12%' },
  glove: { name: '힘의 장갑', icon: '🥊', info: '피해량 +12%' },
  clock: { name: '모래시계', icon: '⏳', info: '쿨타임 -8%' },
  armor: { name: '강철 갑옷', icon: '🛡️', info: '받는 피해 -7%, 최대 체력 +10%' },
  boots: { name: '바람 신발', icon: '👟', info: '이동 속도 +8%' },
  magnet: { name: '자석', icon: '🧲', info: '획득 범위 +30%' },
};
const MAX_WLV = 5, MAX_SLOTS = 4;

const SLOTS = [
  { id: 'weapon', name: '무기', icon: '⚔️', key: 'atk', base: 4, label: '공격력', names: ['낡은 검', '강철 검', '룬 블레이드', '영웅의 대검', '전설의 성검', '신화의 신검'] },
  { id: 'armor', name: '갑옷', icon: '🛡️', key: 'hp', base: 25, label: '체력', names: ['가죽 갑옷', '사슬 갑옷', '룬 갑옷', '영웅의 판금', '전설의 용린갑', '신화의 천의'] },
  { id: 'gloves', name: '장갑', icon: '🧤', key: 'crit', base: 0.012, label: '치명타', pct: true, names: ['천 장갑', '가죽 장갑', '룬 장갑', '영웅의 건틀릿', '전설의 용발톱', '신화의 신수'] },
  { id: 'ring', name: '반지', icon: '💍', key: 'atkPct', base: 0.03, label: '공격력%', pct: true, names: ['구리 반지', '은 반지', '룬 반지', '영웅의 인장', '전설의 용안', '신화의 성환'] },
  { id: 'neck', name: '목걸이', icon: '📿', key: 'regen', base: 0.25, label: '초당 회복', names: ['나무 목걸이', '은 목걸이', '룬 펜던트', '영웅의 부적', '전설의 생명석', '신화의 세계수'] },
  { id: 'boots', name: '신발', icon: '👢', key: 'spd', base: 0.02, label: '이동속도', pct: true, names: ['짚신', '가죽 장화', '룬 부츠', '영웅의 질풍화', '전설의 천마화', '신화의 축지화'] },
];
const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const RAR = [
  { name: '일반', color: '#9aa4b2', mult: 1 },
  { name: '고급', color: '#4ade80', mult: 1.8 },
  { name: '희귀', color: '#60a5fa', mult: 3 },
  { name: '영웅', color: '#c084fc', mult: 5 },
  { name: '전설', color: '#fbbf24', mult: 8 },
  { name: '신화', color: '#f87171', mult: 13 },
];

const TALENTS = [
  { id: 'atk', name: '공격력', icon: '⚔️', per: 2, max: 200, f: v => '+' + v },
  { id: 'hp', name: '최대 체력', icon: '❤️', per: 15, max: 200, f: v => '+' + v },
  { id: 'regen', name: '체력 재생', icon: '💚', per: 0.2, max: 100, f: v => '+' + v.toFixed(1) + '/초' },
  { id: 'speed', name: '이동 속도', icon: '👟', per: 0.02, max: 25, f: v => '+' + Math.round(v * 100) + '%' },
  { id: 'magnet', name: '획득 범위', icon: '🧲', per: 0.05, max: 30, f: v => '+' + Math.round(v * 100) + '%' },
  { id: 'crit', name: '치명타 확률', icon: '🎯', per: 0.01, max: 40, f: v => '+' + Math.round(v * 100) + '%' },
];
const talentCost = lv => Math.floor(100 * Math.pow(1.17, lv));

// ---------- save ----------
const SAVE_KEY = 'heromixer_save_v1';
const defaultSave = () => ({ gold: 1000, gems: 300, energy: MAX_EN, energyAt: Date.now(), cleared: 0, talents: { atk: 0, hp: 0, regen: 0, speed: 0, magnet: 0, crit: 0 }, items: [], equip: {}, nextId: 1, noAds: false, pass: false, starter: false, best: {}, spent: 0 });
let S;
function loadSave() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
  S = Object.assign(defaultSave(), raw || {});
  S.talents = Object.assign(defaultSave().talents, S.talents);
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function tickEnergy() {
  if (S.energy >= MAX_EN) { S.energyAt = Date.now(); return; }
  const n = Math.floor((Date.now() - S.energyAt) / EN_REGEN_MS);
  if (n > 0) { S.energy = Math.min(MAX_EN, S.energy + n); S.energyAt += n * EN_REGEN_MS; }
}

// ---------- equipment helpers ----------
const getItem = id => S.items.find(i => i.id === id);
const itemVal = it => SLOT[it.slot].base * RAR[it.r].mult * (1 + 0.15 * (it.lv - 1));
const itemMaxLv = it => 10 + it.r * 5;
const itemName = it => SLOT[it.slot].names[it.r];
const itemUpCost = it => Math.floor(150 * it.lv * (1 + it.r * 0.6));
const itemSell = it => 50 * Math.pow(3, it.r);
const isEquipped = it => S.equip[it.slot] === it.id;
function fmtStat(slot, v) { return SLOT[slot].pct ? '+' + (v * 100).toFixed(1) + '%' : '+' + (v < 10 ? v.toFixed(1) : Math.round(v)); }
function newItem(r, slot) { const it = { id: S.nextId++, slot: slot || pick(SLOTS).id, r, lv: 1 }; S.items.push(it); return it; }
function rollRarity(luck = 0) {
  const w = [600, 280, 95 + luck * 8, 22 + luck * 3, 3 + luck * 0.6];
  let x = Math.random() * w.reduce((a, b) => a + b);
  for (let i = 0; i < w.length; i++) { if ((x -= w[i]) < 0) return i; }
  return 0;
}
function itemTile(it, cls = '', style = '') {
  return `<div class="itile ${cls} ${it.r >= 4 ? 'r5' : ''}" data-id="${it.id}" style="--c:${RAR[it.r].color};${style}">${SLOT[it.slot].icon}<span class="lv">Lv${it.lv}</span>${isEquipped(it) ? '<span class="eq">E</span>' : ''}</div>`;
}
function mergeAll() {
  let merged = 0, again = true;
  while (again) {
    again = false;
    for (const s of SLOTS) for (let r = 0; r < RAR.length - 1; r++) {
      const g = S.items.filter(i => i.slot === s.id && i.r === r).sort((a, b) => (isEquipped(b) - isEquipped(a)) || b.lv - a.lv);
      while (g.length >= 3) {
        const [keep, a, b] = g.splice(0, 3);
        S.items = S.items.filter(i => i !== a && i !== b);
        keep.r++; keep.lv = Math.min(itemMaxLv(keep), Math.max(keep.lv, a.lv, b.lv));
        merged++; again = true;
      }
    }
  }
  return merged;
}
function autoEquip() {
  for (const s of SLOTS) {
    const best = S.items.filter(i => i.slot === s.id).sort((a, b) => itemVal(b) - itemVal(a))[0];
    if (best) S.equip[s.id] = best.id;
  }
}

function metaStats() {
  const t = S.talents;
  const m = { atk: 10 + t.atk * 2, hp: 100 + t.hp * 15, regen: t.regen * 0.2, spd: t.speed * 0.02, magnet: t.magnet * 0.05, crit: 0.05 + t.crit * 0.01, atkPct: 0 };
  for (const s of SLOTS) { const it = getItem(S.equip[s.id]); if (it) m[s.key] += itemVal(it); }
  m.spd = Math.min(m.spd, 1.2); m.crit = Math.min(m.crit, 0.85);
  m.atkTotal = m.atk * (1 + m.atkPct);
  m.power = Math.floor(m.atkTotal * 10 + m.hp * 2 + m.crit * 800 + m.regen * 60 + m.spd * 300);
  return m;
}

// ============================================================
//  CANVAS / INPUT
// ============================================================
const cv = $('#game'), ctx = cv.getContext('2d');
let VW = 0, VH = 0, DPR = 1, ZOOM = 1, SAFE_TOP = 0, SAFE_BOTTOM = 0;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  const probe = getComputedStyle($('#safeProbe'));
  SAFE_TOP = parseFloat(probe.paddingTop) || 0; SAFE_BOTTOM = parseFloat(probe.paddingBottom) || 0;
  cv.width = VW * DPR; cv.height = VH * DPR;
  cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
  ZOOM = clamp(Math.min(VW, VH) / 560, 0.6, 1.4);
}
addEventListener('resize', resize);

const keys = {};
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if ((e.key === 'Escape' || e.key === 'p') && G && G.state === 'play') pauseGame();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G && G.state === 'play') pauseGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G && G.state === 'play') pauseGame(); });
cv.addEventListener('contextmenu', e => e.preventDefault());

const joy = { active: false, id: null, bx: 0, by: 0, x: 0, y: 0 };
cv.addEventListener('pointerdown', e => {
  if (!G || G.state !== 'play') return;
  Object.assign(joy, { active: true, id: e.pointerId, bx: e.clientX, by: e.clientY, x: e.clientX, y: e.clientY });
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => { if (joy.active && e.pointerId === joy.id) { joy.x = e.clientX; joy.y = e.clientY; } });
const endJoy = e => { if (e.pointerId === joy.id) { joy.active = false; joy.id = null; } };
cv.addEventListener('pointerup', endJoy);
cv.addEventListener('pointercancel', endJoy);

// ============================================================
//  RUN STATE
// ============================================================
let G = null;
const xpFor = lv => Math.floor(4 + lv * 3 + Math.pow(lv, 1.5));

function startRun(stage) {
  const m = metaStats();
  const p = {
    x: 0, y: 0, r: 16, maxBase: m.hp, maxHp: m.hp, hp: m.hp, baseAtk: m.atkTotal, crit: m.crit, regen: m.regen,
    spdBase: 190 * (1 + m.spd), magBase: 70 * (1 + m.magnet), lv: 1, xp: 0, xpNext: xpFor(1), inv: 0, fx: 1, fy: 0,
    weapons: [], passives: [], walk: 0,
  };
  G = {
    state: 'play', stage, time: 0, kills: 0, gold: 0, p,
    enemies: [], proj: [], ebul: [], gems: [], items: [], fx: [], texts: [],
    spawnT: 0, eliteNext: 60, waves: [45, 105, 150], bossSpawned: false, boss: null, nextEid: 1,
    pendingLv: 0, shake: 0, banner: null, winT: -1, revives: 0,
  };
  addWeapon('knife');
  pStat();
  joy.active = false;
  $('#lobby').classList.add('hidden');
  $('#hudBtns').classList.remove('hidden');
  showBanner(`STAGE ${stage} · ${STAGES[(stage - 1) % STAGES.length].name}`);
}
function addWeapon(id) { G.p.weapons.push({ id, lv: 1, evo: false, t: 0, ang: 0, spin: 0 }); }
function pLv(id) { const q = G.p.passives.find(x => x.id === id); return q ? q.lv : 0; }
function pStat() {
  const p = G.p;
  p.dmgMul = (p.baseAtk / 10) * (1 + pLv('glove') * 0.12);
  p.cdMul = 1 - pLv('clock') * 0.08;
  p.areaMul = 1 + pLv('book') * 0.12;
  p.dr = pLv('armor') * 0.07;
  p.spd = p.spdBase * (1 + pLv('boots') * 0.08);
  p.mag = p.magBase * (1 + pLv('magnet') * 0.3);
  const nm = p.maxBase * (1 + pLv('armor') * 0.1);
  p.hp += nm - p.maxHp; p.maxHp = nm;
}
function showBanner(text, color = '#fff') { G.banner = { text, color, t: 2.4 }; }
function addShake(v) { G.shake = Math.max(G.shake, v); }

// weapon stats by level
function wStats(w) {
  const p = G.p, L = w.lv, E = w.evo, dm = p.dmgMul, am = p.areaMul, cm = p.cdMul;
  switch (w.id) {
    case 'knife': return E ? { dmg: 38 * dm, cd: 0.32 * cm, count: 3, pierce: 6, spd: 620, size: 9 * am }
      : { dmg: (10 + L * 4) * dm, cd: (0.95 - L * 0.07) * cm, count: 1 + Math.floor(L / 2), pierce: 1 + Math.floor((L - 1) / 2), spd: 520, size: 7 * am };
    case 'orbit': return E ? { dmg: 45 * dm, count: 7, R: 100 * am, size: 22 * am, rot: 4.2 }
      : { dmg: (8 + L * 4) * dm, count: L + 1, R: 72 * am, size: 14 * am, rot: 3 };
    case 'thunder': return E ? { dmg: 110 * dm, cd: 0.9 * cm, count: 6, size: 70 * am, chain: 3 }
      : { dmg: (22 + L * 10) * dm, cd: (2.1 - L * 0.2) * cm, count: L, size: 42 * am, chain: 0 };
    case 'aura': return E ? { dmg: 28 * dm, cd: 0.35, size: 165 * am, slow: true }
      : { dmg: (5 + L * 3) * dm, cd: 0.4, size: (60 + L * 12) * am, slow: false };
    case 'boomer': return E ? { dmg: 65 * dm, cd: 0.8 * cm, count: 4, range: 320, size: 22 * am, spd: 430 }
      : { dmg: (15 + L * 7) * dm, cd: (1.7 - L * 0.12) * cm, count: Math.ceil(L / 2), range: 250, size: 13 * am, spd: 380 };
    case 'rocket': return E ? { dmg: 130 * dm, cd: 1.1 * cm, count: 4, size: 125 * am, spd: 360 }
      : { dmg: (28 + L * 12) * dm, cd: (2.5 - L * 0.2) * cm, count: 1 + Math.floor((L - 1) / 2), size: (55 + L * 6) * am, spd: 320 };
  }
}
const STAT_LABEL = { dmg: '피해', count: '개수', pierce: '관통', cd: '쿨타임', size: '범위', R: '반경', range: '사거리' };
function upDesc(w) {
  const a = wStats(w), b = wStats({ ...w, lv: w.lv + 1 }), out = [];
  for (const k in STAT_LABEL) {
    if (a[k] === undefined || Math.abs(a[k] - b[k]) < 0.001) continue;
    const f = k === 'cd' ? v => v.toFixed(2) + 's' : v => Math.round(v);
    out.push(`${STAT_LABEL[k]} ${f(a[k])}→<b>${f(b[k])}</b>`);
  }
  return out.join(', ') || '성능 강화';
}

// ---------- spatial grid ----------
const CELL = 64, grid = new Map();
const gkey = (cx, cy) => (cx + 30000) * 60000 + (cy + 30000);
function buildGrid() {
  grid.clear();
  for (const e of G.enemies) {
    if (e.dead) continue;
    const k = gkey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
    let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(e);
  }
}
function forNear(x, y, r, fn) {
  const pad = r + 60;
  const x0 = Math.floor((x - pad) / CELL), x1 = Math.floor((x + pad) / CELL), y0 = Math.floor((y - pad) / CELL), y1 = Math.floor((y + pad) / CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const a = grid.get(gkey(cx, cy)); if (!a) continue;
    for (const e of a) {
      if (e.dead) continue;
      const rr = r + e.r, dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= rr * rr && fn(e) === false) return;
    }
  }
}
function nearestEnemy(x, y, maxR) {
  let best = null, bd = maxR * maxR;
  for (const e of G.enemies) { if (e.dead) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function onScreen(e) { const hw = VW / 2 / ZOOM + 20, hh = VH / 2 / ZOOM + 20; return Math.abs(e.x - G.p.x) < hw && Math.abs(e.y - G.p.y) < hh; }

// ---------- enemies ----------
function spawnRingPos() { const a = Math.random() * TAU, R = Math.hypot(VW, VH) / 2 / ZOOM + 60; return [G.p.x + Math.cos(a) * R, G.p.y + Math.sin(a) * R]; }
function spawnEnemy(type, x, y) {
  const T = ETYPES[type], s = G.stage;
  const hpMul = (1 + (s - 1) * 0.75) * (1 + G.time / 60 * 0.55);
  const e = {
    id: G.nextEid++, type, x, y, r: T.r, hp: T.hp * hpMul, spd: T.spd * rand(0.9, 1.1), dmg: T.dmg * (1 + (s - 1) * 0.3), xp: T.xp,
    color: T.color, flash: 0, kx: 0, ky: 0, slowUntil: 0, ocd: 0, shootT: rand(1, 3), elite: !!T.elite, boss: !!T.boss, ranged: !!T.ranged, wob: Math.random() * TAU,
  };
  if (e.boss) { e.hp = T.hp * (1 + (s - 1) * 1.1); e.phaseT = 3; e.pat = 0; e.dashT = 0; e.windT = 0; e.name = BOSSES[(s - 1) % BOSSES.length]; }
  e.maxHp = e.hp;
  G.enemies.push(e);
  return e;
}
function chooseType() {
  const t = G.time, r = Math.random();
  if (t < 20) return r < 0.75 ? 'slime' : 'bat';
  if (t < 50) return r < 0.5 ? 'slime' : r < 0.8 ? 'bat' : 'archer';
  if (t < 100) return r < 0.35 ? 'slime' : r < 0.6 ? 'bat' : r < 0.8 ? 'archer' : 'golem';
  return r < 0.25 ? 'slime' : r < 0.5 ? 'bat' : r < 0.7 ? 'archer' : 'golem';
}
function updateSpawner(dt) {
  const t = G.time, s = G.stage;
  const target = G.boss ? 25 : Math.min(280, 12 + t * 1.25 * (1 + (s - 1) * 0.12));
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = 0.12;
    const n = Math.min(6, target - G.enemies.length);
    for (let i = 0; i < n; i++) spawnEnemy(chooseType(), ...spawnRingPos());
  }
  if (!G.bossSpawned && t >= G.eliteNext) {
    G.eliteNext += 40;
    spawnEnemy('elite', ...spawnRingPos());
    showBanner('⚠️ 엘리트 몬스터 등장!', '#fca5a5');
  }
  if (G.waves.length && t >= G.waves[0]) {
    G.waves.shift();
    const R = Math.hypot(VW, VH) / 2 / ZOOM + 30;
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; spawnEnemy('bat', G.p.x + Math.cos(a) * R, G.p.y + Math.sin(a) * R); }
    showBanner('🦇 박쥐 떼가 몰려옵니다!', '#d8b4fe');
  }
  if (!G.bossSpawned && t >= STAGE_TIME) {
    G.bossSpawned = true;
    const [x, y] = spawnRingPos();
    G.boss = spawnEnemy('boss', x, y);
    showBanner('👑 보스 등장: ' + G.boss.name, '#fcd34d');
    addShake(10);
  }
}
function shootAt(e, a, spd, dmg) { G.ebul.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, dmg, life: 5 }); }
function updateEnemies(dt) {
  const p = G.p;
  buildGrid();
  const farR = Math.hypot(VW, VH) / 2 / ZOOM + 450;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 0.01;
    let spd = e.spd * (e.slowUntil > G.time ? 0.5 : 1), dir = 1;
    if (e.boss) {
      e.phaseT -= dt;
      if (e.dashT > 0) { e.dashT -= dt; e.x += e.dvx * dt; e.y += e.dvy * dt; spd = 0; }
      else if (e.windT > 0) {
        e.windT -= dt; spd = 0;
        if (e.windT <= 0) { e.dashT = 0.55; const a = Math.atan2(dy, dx); e.dvx = Math.cos(a) * 560; e.dvy = Math.sin(a) * 560; }
      }
      if (e.phaseT <= 0 && e.dashT <= 0 && e.windT <= 0) {
        e.pat++;
        if (e.pat % 3 === 0) e.windT = 0.8;
        else if (e.pat % 3 === 1) { const n = 14 + Math.min(10, G.stage); const off = Math.random(); for (let i = 0; i < n; i++) shootAt(e, (i + off) / n * TAU, 190, e.dmg * 0.6); }
        else { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; spawnEnemy('bat', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80); } const a = Math.atan2(dy, dx); for (let i = -2; i <= 2; i++) shootAt(e, a + i * 0.18, 260, e.dmg * 0.6); }
        e.phaseT = 2.4;
      }
    } else if (e.ranged) {
      if (d < 200) dir = -0.6; else if (d < 320) dir = 0;
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 480) { e.shootT = 2.6; shootAt(e, Math.atan2(dy, dx), 210, e.dmg); }
    }
    e.x += (dx / d * spd * dir + e.kx) * dt;
    e.y += (dy / d * spd * dir + e.ky) * dt;
    const decay = Math.max(0, 1 - dt * 9); e.kx *= decay; e.ky *= decay;
    if (e.flash > 0) e.flash -= dt;
    if (!e.boss) {
      forNear(e.x, e.y, e.r, o => {
        if (o === e) return;
        const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy) || 0.01, ov = e.r + o.r - od;
        if (ov > 0) { const f = o.boss ? 0.6 : 0.25; e.x += ox / od * ov * f; e.y += oy / od * ov * f; }
      });
      if (d > farR) { const [nx, ny] = spawnRingPos(); e.x = nx; e.y = ny; }
    }
    if (d < e.r + p.r - 3) hurtPlayer(e.dmg);
  }
}
function hitEnemy(e, dmg, kx = 0, ky = 0) {
  if (e.dead) return;
  const crit = Math.random() < G.p.crit;
  if (crit) dmg *= 2;
  e.hp -= dmg; e.flash = 0.08;
  const kb = e.boss ? 0.03 : e.elite ? 0.3 : 1;
  e.kx += kx * kb; e.ky += ky * kb;
  if (crit || G.texts.length < 70) G.texts.push({ x: e.x + rand(-8, 8), y: e.y - e.r, txt: fmt(dmg), color: crit ? '#fde047' : '#fff', big: crit, t: 0 });
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; G.kills++;
  dropGem(e.x, e.y, e.xp);
  G.fx.push({ type: 'pop', x: e.x, y: e.y, r: e.r, t: 0, life: 0.3, color: e.color });
  if (e.boss) {
    G.boss = null; G.winT = 2;
    for (let i = 0; i < 25; i++) G.items.push({ type: 'gold', x: e.x + rand(-90, 90), y: e.y + rand(-90, 90), v: 10 * G.stage });
    showBanner('🏆 보스 처치!', '#fde047'); addShake(14);
    for (const o of G.enemies) if (!o.dead) { o.dead = true; dropGem(o.x, o.y, o.xp); }
    return;
  }
  if (e.elite) { G.items.push({ type: 'chest', x: e.x, y: e.y }); return; }
  const r = Math.random();
  if (r < 0.025) G.items.push({ type: 'gold', x: e.x, y: e.y, v: 1 + Math.floor(G.stage / 2) });
  else if (r < 0.032) G.items.push({ type: 'meat', x: e.x, y: e.y });
  else if (r < 0.0345) G.items.push({ type: 'magnet', x: e.x, y: e.y });
  else if (r < 0.0365) G.items.push({ type: 'bomb', x: e.x, y: e.y });
}
function dropGem(x, y, v) {
  if (G.gems.length > 350) { const g = G.gems[Math.floor(Math.random() * 100)]; g.v += v; return; }
  G.gems.push({ x: x + rand(-4, 4), y: y + rand(-4, 4), v, m: false, sp: 0 });
}

// ---------- player ----------
function hurtPlayer(dmg) {
  const p = G.p;
  if (p.inv > 0 || G.state !== 'play') return;
  dmg *= (1 - p.dr);
  p.hp -= dmg; p.inv = 0.5; addShake(5);
  if (navigator.vibrate) navigator.vibrate(25);
  G.texts.push({ x: p.x, y: p.y - 24, txt: '-' + Math.round(dmg), color: '#f87171', big: true, t: 0 });
  if (p.hp <= 0) { p.hp = 0; playerDown(); }
}
function updatePlayer(dt) {
  const p = G.p;
  let mx = 0, my = 0;
  if (keys['a'] || keys['arrowleft']) mx--;
  if (keys['d'] || keys['arrowright']) mx++;
  if (keys['w'] || keys['arrowup']) my--;
  if (keys['s'] || keys['arrowdown']) my++;
  let mag = Math.hypot(mx, my);
  if (mag > 0) { mx /= mag; my /= mag; mag = 1; }
  if (joy.active) {
    const jx = joy.x - joy.bx, jy = joy.y - joy.by, jl = Math.hypot(jx, jy);
    if (jl > 6) { mx = jx / jl; my = jy / jl; mag = clamp(jl / 45, 0, 1); }
  }
  if (mag > 0) { p.x += mx * p.spd * mag * dt; p.y += my * p.spd * mag * dt; p.fx = mx; p.fy = my; p.walk += dt * 12 * mag; }
  if (p.inv > 0) p.inv -= dt;
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
}
function gainXp(v) {
  const p = G.p; p.xp += v;
  while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.lv++; p.xpNext = xpFor(p.lv); G.pendingLv++; }
}

// ---------- weapons ----------
function updateWeapons(dt) {
  const p = G.p;
  for (const w of p.weapons) {
    const st = wStats(w);
    w.t -= dt;
    switch (w.id) {
      case 'knife': {
        if (w.t > 0) break;
        const tgt = nearestEnemy(p.x, p.y, 650);
        if (!tgt && !w.evo) break;
        const base = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : Math.atan2(p.fy, p.fx);
        for (let i = 0; i < st.count; i++) addKnife(base + (i - (st.count - 1) / 2) * 0.16, st);
        if (w.evo) { w.spin += 0.35; for (let i = 0; i < 8; i++) addKnife(w.spin + i / 8 * TAU, st); }
        w.t = st.cd;
        break;
      }
      case 'orbit': {
        w.ang += dt * st.rot;
        for (let i = 0; i < st.count; i++) {
          const a = w.ang + i / st.count * TAU, bx = p.x + Math.cos(a) * st.R, by = p.y + Math.sin(a) * st.R;
          forNear(bx, by, st.size, e => {
            if (e.ocd > G.time) return;
            e.ocd = G.time + 0.35;
            const kd = Math.hypot(e.x - p.x, e.y - p.y) || 1;
            hitEnemy(e, st.dmg, (e.x - p.x) / kd * 260, (e.y - p.y) / kd * 260);
          });
        }
        break;
      }
      case 'thunder': {
        if (w.t > 0) break;
        const vis = G.enemies.filter(e => !e.dead && onScreen(e));
        if (!vis.length) break;
        for (let i = 0; i < st.count; i++) {
          let e = pick(vis);
          strike(e.x, e.y, st);
          let from = e;
          for (let c = 0; c < st.chain; c++) {
            let nx = null, nd = 200 * 200;
            for (const o of vis) { if (o.dead || o === from) continue; const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2; if (d < nd) { nd = d; nx = o; } }
            if (!nx) break;
            G.fx.push({ type: 'chain', x: from.x, y: from.y, x2: nx.x, y2: nx.y, t: 0, life: 0.2 });
            hitEnemy(nx, st.dmg * 0.6);
            from = nx;
          }
        }
        w.t = st.cd;
        break;
      }
      case 'aura': {
        if (w.t > 0) break;
        forNear(p.x, p.y, st.size, e => { hitEnemy(e, st.dmg); if (st.slow) e.slowUntil = G.time + 0.6; });
        w.t = st.cd;
        break;
      }
      case 'boomer': {
        if (w.t > 0) break;
        const tgt = nearestEnemy(p.x, p.y, 500);
        const base = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : Math.atan2(p.fy, p.fx);
        for (let i = 0; i < st.count; i++) {
          const a = base + (st.count > 1 ? (i / st.count) * TAU : 0);
          G.proj.push({ k: 'boomer', x: p.x, y: p.y, ox: p.x, oy: p.y, vx: Math.cos(a) * st.spd, vy: Math.sin(a) * st.spd, spd: st.spd, range: st.range, r: st.size, dmg: st.dmg, ret: false, hitT: new Map(), life: 5, spin: 0, evo: w.evo });
        }
        w.t = st.cd;
        break;
      }
      case 'rocket': {
        if (w.t > 0) break;
        const vis = G.enemies.filter(e => !e.dead && onScreen(e));
        if (!vis.length) break;
        for (let i = 0; i < st.count; i++) {
          const tgt = pick(vis), a = Math.atan2(tgt.y - p.y, tgt.x - p.x) + rand(-0.5, 0.5);
          G.proj.push({ k: 'rocket', x: p.x, y: p.y, vx: Math.cos(a) * st.spd, vy: Math.sin(a) * st.spd, spd: st.spd, tgt, r: 7, dmg: st.dmg, boom: st.size, life: 3, evo: w.evo });
        }
        w.t = st.cd;
        break;
      }
    }
  }
}
function addKnife(a, st) {
  const p = G.p;
  G.proj.push({ k: 'knife', x: p.x, y: p.y, vx: Math.cos(a) * st.spd, vy: Math.sin(a) * st.spd, r: st.size, dmg: st.dmg, pierce: st.pierce, life: 1.3, hit: new Set(), spin: 0 });
}
function strike(x, y, st) {
  G.fx.push({ type: 'bolt', x, y, t: 0, life: 0.25, seed: Math.random() * 1000, size: st.size });
  forNear(x, y, st.size, e => hitEnemy(e, st.dmg));
}
function explode(x, y, R, dmg) {
  G.fx.push({ type: 'boom', x, y, r: R, t: 0, life: 0.35 });
  forNear(x, y, R, e => { const d = Math.hypot(e.x - x, e.y - y) || 1; hitEnemy(e, dmg, (e.x - x) / d * 300, (e.y - y) / d * 300); });
  addShake(R > 100 ? 5 : 2);
}
function updateProj(dt) {
  const p = G.p;
  for (const b of G.proj) {
    b.life -= dt;
    if (b.k === 'knife') {
      b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 20;
      forNear(b.x, b.y, b.r, e => {
        if (b.hit.has(e.id)) return;
        b.hit.add(e.id); hitEnemy(e, b.dmg, b.vx * 0.25, b.vy * 0.25);
        if (--b.pierce <= 0) { b.life = 0; return false; }
      });
    } else if (b.k === 'boomer') {
      b.spin += dt * 18;
      if (!b.ret) {
        if (Math.hypot(b.x - b.ox, b.y - b.oy) > b.range) b.ret = true;
      } else {
        const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
        b.vx = dx / d * b.spd * 1.25; b.vy = dy / d * b.spd * 1.25;
        if (d < 22) b.life = 0;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      forNear(b.x, b.y, b.r, e => {
        if ((b.hitT.get(e.id) || 0) > G.time) return;
        b.hitT.set(e.id, G.time + 0.3); hitEnemy(e, b.dmg, b.vx * 0.3, b.vy * 0.3);
      });
    } else if (b.k === 'rocket') {
      if (b.tgt && !b.tgt.dead) {
        const want = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x), cur = Math.atan2(b.vy, b.vx);
        let df = want - cur; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
        const na = cur + clamp(df, -5 * dt, 5 * dt);
        b.vx = Math.cos(na) * b.spd; b.vy = Math.sin(na) * b.spd;
      }
      b.spd += dt * 300;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.random() < 0.6) G.fx.push({ type: 'smoke', x: b.x, y: b.y, t: 0, life: 0.4 });
      let hit = false;
      forNear(b.x, b.y, b.r, () => { hit = true; return false; });
      if (hit || b.life <= 0) { explode(b.x, b.y, b.boom, b.dmg); b.life = 0; }
    }
  }
  G.proj = G.proj.filter(b => b.life > 0);
}
function updateEbul(dt) {
  const p = G.p;
  for (const b of G.ebul) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + p.r - 4) ** 2) { hurtPlayer(b.dmg); b.life = 0; }
  }
  G.ebul = G.ebul.filter(b => b.life > 0);
}
function updatePickups(dt) {
  const p = G.p, m2 = p.mag * p.mag;
  for (const g of G.gems) {
    const dx = p.x - g.x, dy = p.y - g.y, d2 = dx * dx + dy * dy;
    if (!g.m && d2 < m2) g.m = true;
    if (g.m) {
      const d = Math.sqrt(d2) || 1;
      g.sp = Math.max(g.sp, 120) + dt * 1100;
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
      if (d < p.r + 8) { g.dead = true; gainXp(g.v); }
    }
  }
  G.gems = G.gems.filter(g => !g.dead);
  for (const it of G.items) {
    const dx = p.x - it.x, dy = p.y - it.y, d = Math.hypot(dx, dy) || 1;
    if (it.type === 'gold' && d < p.mag) { it.x += dx / d * 500 * dt; it.y += dy / d * 500 * dt; }
    if (d < p.r + 16) {
      if (it.type === 'chest' && G.state !== 'play') continue;
      it.dead = true;
      switch (it.type) {
        case 'gold': G.gold += it.v; break;
        case 'meat': p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); G.texts.push({ x: p.x, y: p.y - 30, txt: '+HP', color: '#4ade80', big: true, t: 0 }); break;
        case 'magnet': for (const g of G.gems) g.m = true; showBanner('🧲 경험치 전부 흡수!', '#93c5fd'); break;
        case 'bomb': for (const e of G.enemies) if (!e.dead && onScreen(e)) hitEnemy(e, e.boss ? 300 * p.dmgMul : 99999); G.fx.push({ type: 'flash', t: 0, life: 0.4 }); addShake(12); break;
        case 'chest': openChest(); break;
      }
    }
  }
  G.items = G.items.filter(i => !i.dead);
}
function updateFx(dt) {
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.life);
  if (G.fx.length > 300) G.fx.splice(0, G.fx.length - 300);
  for (const t of G.texts) t.t += dt;
  G.texts = G.texts.filter(t => t.t < 0.7);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
}

function update(dt) {
  G.time += dt;
  updatePlayer(dt);
  updateSpawner(dt);
  updateEnemies(dt);
  buildGrid();
  updateWeapons(dt);
  updateProj(dt);
  updateEbul(dt);
  updatePickups(dt);
  updateFx(dt);
  G.enemies = G.enemies.filter(e => !e.dead);
  if (G.winT > 0) { G.winT -= dt; for (const g of G.gems) g.m = true; if (G.winT <= 0) { endRun(true); return; } }
  if (G.state === 'play' && G.pendingLv > 0) openLevelUp();
}

// ============================================================
//  RENDER
// ============================================================
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

function render() {
  const p = G.p, st = STAGES[(G.stage - 1) % STAGES.length];
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = st.g1; ctx.fillRect(0, 0, VW, VH);
  const sx = G.shake ? rand(-1, 1) * G.shake : 0, sy = G.shake ? rand(-1, 1) * G.shake : 0;
  ctx.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, DPR * (VW / 2 - p.x * ZOOM + sx), DPR * (VH / 2 - p.y * ZOOM + sy));
  const hw = VW / 2 / ZOOM, hh = VH / 2 / ZOOM;

  // ground
  const T = 80, i0 = Math.floor((p.x - hw) / T), i1 = Math.floor((p.x + hw) / T), j0 = Math.floor((p.y - hh) / T), j1 = Math.floor((p.y + hh) / T);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    if ((i + j) & 1) { ctx.fillStyle = st.g2; ctx.fillRect(i * T, j * T, T, T); }
    const h = hash2(i, j);
    if (h < 0.3) {
      ctx.fillStyle = st.deco; ctx.globalAlpha = 0.55;
      const dx = i * T + hash2(j, i) * T, dy = j * T + h * 3 * T;
      if (h < 0.15) { circle(dx, dy, 3 + h * 20); ctx.fill(); }
      else { ctx.fillRect(dx, dy, 3, 9); ctx.fillRect(dx + 5, dy + 2, 3, 7); ctx.fillRect(dx - 5, dy + 3, 3, 6); }
      ctx.globalAlpha = 1;
    }
  }

  // aura
  for (const w of p.weapons) if (w.id === 'aura') {
    const s = wStats(w), pulse = 1 + Math.sin(G.time * 6) * 0.03;
    const g = ctx.createRadialGradient(p.x, p.y, s.size * 0.2, p.x, p.y, s.size * pulse);
    g.addColorStop(0, w.evo ? 'rgba(239,68,68,0.05)' : 'rgba(251,146,60,0.03)');
    g.addColorStop(1, w.evo ? 'rgba(220,38,38,0.4)' : 'rgba(251,146,60,0.3)');
    ctx.fillStyle = g; circle(p.x, p.y, s.size * pulse); ctx.fill();
  }

  // gems
  for (const g of G.gems) {
    const c = g.v < 5 ? '#38bdf8' : g.v < 20 ? '#4ade80' : '#f43f5e', s = g.v < 5 ? 5 : g.v < 20 ? 7 : 9;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(g.x, g.y - s); ctx.lineTo(g.x + s * 0.7, g.y); ctx.lineTo(g.x, g.y + s); ctx.lineTo(g.x - s * 0.7, g.y); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(g.x - 1, g.y - s * 0.6, 2, s * 0.6);
  }
  // items
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const it of G.items) {
    const bob = Math.sin(G.time * 4 + it.x) * 3;
    if (it.type === 'gold') { ctx.fillStyle = '#facc15'; circle(it.x, it.y + bob, 6); ctx.fill(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.stroke(); continue; }
    if (it.type === 'chest') { ctx.fillStyle = 'rgba(253,224,71,.35)'; circle(it.x, it.y, 26 + Math.sin(G.time * 5) * 4); ctx.fill(); }
    ctx.font = (it.type === 'chest' ? 30 : 20) + 'px serif';
    ctx.fillText({ meat: '🍖', magnet: '🧲', bomb: '💣', chest: '🎁' }[it.type], it.x, it.y + bob);
  }

  // enemies
  for (const e of G.enemies) drawEnemy(e);
  drawPlayer();

  // orbit blades
  for (const w of p.weapons) if (w.id === 'orbit') {
    const s = wStats(w);
    for (let i = 0; i < s.count; i++) {
      const a = w.ang + i / s.count * TAU, bx = p.x + Math.cos(a) * s.R, by = p.y + Math.sin(a) * s.R;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(a + Math.PI / 2);
      if (w.evo) { ctx.shadowColor = '#fde047'; ctx.shadowBlur = 14; }
      ctx.fillStyle = w.evo ? '#fde68a' : '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(0, -s.size * 1.3); ctx.lineTo(s.size * 0.35, s.size * 0.5); ctx.lineTo(-s.size * 0.35, s.size * 0.5); ctx.fill();
      ctx.fillStyle = w.evo ? '#b45309' : '#64748b'; ctx.fillRect(-s.size * 0.5, s.size * 0.5, s.size, 4); ctx.fillRect(-2, s.size * 0.5, 4, s.size * 0.5);
      ctx.restore();
    }
  }

  // projectiles
  for (const b of G.proj) {
    ctx.save(); ctx.translate(b.x, b.y);
    if (b.k === 'knife') {
      ctx.rotate(b.spin); ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const rr2 = i % 2 ? b.r * 0.35 : b.r * 1.3, a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (b.k === 'boomer') {
      ctx.rotate(b.spin);
      if (b.evo) { ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 5; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12; circle(0, 0, b.r); ctx.stroke(); ctx.fillStyle = '#f5d0fe'; for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.fillRect(b.r - 2, -2, 8, 4); } }
      else { ctx.strokeStyle = '#b45309'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-b.r, b.r * 0.4); ctx.lineTo(0, -b.r * 0.4); ctx.lineTo(b.r, b.r * 0.4); ctx.stroke(); }
    } else if (b.k === 'rocket') {
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = '#fb923c'; circle(-10, 0, 4 + Math.random() * 2); ctx.fill();
      ctx.fillStyle = b.evo ? '#84cc16' : '#ef4444'; rr(-8, -4, 16, 8, 4); ctx.fill();
      ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(13, 0); ctx.lineTo(8, 4); ctx.fill();
    }
    ctx.restore();
  }
  // enemy bullets
  for (const b of G.ebul) {
    ctx.fillStyle = 'rgba(239,68,68,.35)'; circle(b.x, b.y, b.r + 4); ctx.fill();
    ctx.fillStyle = '#fca5a5'; circle(b.x, b.y, b.r); ctx.fill();
  }
  // fx
  for (const f of G.fx) {
    const k = f.t / f.life;
    if (f.type === 'pop') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = 3; circle(f.x, f.y, f.r * (1 + k)); ctx.stroke(); }
    else if (f.type === 'smoke') { ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = '#d1d5db'; circle(f.x, f.y, 3 + k * 6); ctx.fill(); }
    else if (f.type === 'boom') {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#fb923c'; circle(f.x, f.y, f.r * (0.4 + k * 0.6)); ctx.fill();
      ctx.fillStyle = '#fef08a'; circle(f.x, f.y, f.r * (0.4 + k * 0.6) * 0.55); ctx.fill();
    } else if (f.type === 'bolt') {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fef9c3'; ctx.lineWidth = 4; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 16;
      ctx.beginPath(); let yy = f.y - 420; ctx.moveTo(f.x, yy);
      for (let i = 1; i <= 8; i++) { yy = f.y - 420 + i * 52.5; ctx.lineTo(f.x + (i < 8 ? (hash2(i, f.seed | 0) - 0.5) * 50 : 0), yy); }
      ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(254,240,138,.5)'; circle(f.x, f.y, f.size * (0.6 + k * 0.4)); ctx.fill();
    } else if (f.type === 'chain') {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(f.x, f.y);
      for (let i = 1; i < 5; i++) { const t = i / 5; ctx.lineTo(f.x + (f.x2 - f.x) * t + rand(-12, 12), f.y + (f.y2 - f.y) * t + rand(-12, 12)); }
      ctx.lineTo(f.x2, f.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // damage numbers
  ctx.lineJoin = 'round';
  for (const t of G.texts) {
    const k = t.t / 0.7;
    ctx.globalAlpha = 1 - k * k;
    ctx.font = `900 ${t.big ? 18 : 13}px sans-serif`;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.strokeText(t.txt, t.x, t.y - k * 30); ctx.fillStyle = t.color; ctx.fillText(t.txt, t.x, t.y - k * 30);
  }
  ctx.globalAlpha = 1;

  drawHUD();
}

function drawEnemy(e) {
  const p = G.p, bob = Math.sin(G.time * 8 + e.wob) * 1.5, y = e.y + bob, r = e.r;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.85, r * 0.9, r * 0.3, 0, 0, TAU); ctx.fill();
  const col = e.flash > 0 ? '#ffffff' : e.color;
  if (e.type === 'bat') {
    const flap = Math.sin(G.time * 20 + e.wob) * 6;
    ctx.fillStyle = e.flash > 0 ? '#fff' : '#6b21a8';
    ctx.beginPath(); ctx.moveTo(e.x - r * 0.5, y); ctx.lineTo(e.x - r * 2, y - 6 + flap); ctx.lineTo(e.x - r * 1.2, y + 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(e.x + r * 0.5, y); ctx.lineTo(e.x + r * 2, y - 6 + flap); ctx.lineTo(e.x + r * 1.2, y + 6); ctx.fill();
  }
  if (e.boss && e.windT > 0) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    ctx.strokeStyle = 'rgba(239,68,68,.5)'; ctx.lineWidth = r * 1.4; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * 330, e.y + Math.sin(a) * 330); ctx.stroke();
  }
  ctx.fillStyle = col;
  if (e.type === 'golem') { rr(e.x - r, y - r, r * 2, r * 2, r * 0.4); ctx.fill(); }
  else if (e.type === 'slime') { ctx.beginPath(); ctx.ellipse(e.x, y + r * 0.15, r * 1.1, r * 0.9, 0, 0, TAU); ctx.fill(); }
  else { circle(e.x, y, r); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
  // eyes
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, lx = dx / d * r * 0.15, ly = dy / d * r * 0.15;
  const es = Math.max(2.5, r * 0.22);
  ctx.fillStyle = '#fff'; circle(e.x - r * 0.35 + lx, y - r * 0.15 + ly, es); ctx.fill(); circle(e.x + r * 0.35 + lx, y - r * 0.15 + ly, es); ctx.fill();
  ctx.fillStyle = e.elite || e.boss ? '#dc2626' : '#111'; circle(e.x - r * 0.35 + lx * 1.6, y - r * 0.15 + ly * 1.6, es * 0.55); ctx.fill(); circle(e.x + r * 0.35 + lx * 1.6, y - r * 0.15 + ly * 1.6, es * 0.55); ctx.fill();
  if (e.type === 'archer') { ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x + lx * 5, y + ly * 5, r * 0.9, Math.atan2(dy, dx) - 1, Math.atan2(dy, dx) + 1); ctx.stroke(); }
  if (e.elite) {
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath(); ctx.moveTo(e.x - r * 0.7, y - r * 0.6); ctx.lineTo(e.x - r * 0.9, y - r * 1.4); ctx.lineTo(e.x - r * 0.3, y - r * 0.85); ctx.fill();
    ctx.beginPath(); ctx.moveTo(e.x + r * 0.7, y - r * 0.6); ctx.lineTo(e.x + r * 0.9, y - r * 1.4); ctx.lineTo(e.x + r * 0.3, y - r * 0.85); ctx.fill();
  }
  if (e.boss) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.moveTo(e.x - r * 0.6, y - r * 0.75);
    for (let i = 0; i <= 4; i++) { ctx.lineTo(e.x - r * 0.6 + i * r * 0.3, y - r * (i % 2 ? 1.0 : 1.45)); }
    ctx.lineTo(e.x + r * 0.6, y - r * 0.75); ctx.fill();
  }
  if (e.elite && e.hp < e.maxHp) {
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - r, y + r + 6, r * 2, 5);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x - r, y + r + 6, r * 2 * e.hp / e.maxHp, 5);
  }
}

function drawPlayer() {
  const p = G.p, x = p.x, y = p.y + Math.abs(Math.sin(p.walk)) * -2.5;
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2) ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 15, 14, 5, 0, 0, TAU); ctx.fill();
  // cape
  ctx.fillStyle = '#dc2626';
  ctx.beginPath(); ctx.moveTo(x - 10, y - 4); ctx.lineTo(x + 10, y - 4); ctx.lineTo(x - p.fx * 10 + 12, y + 14); ctx.lineTo(x - p.fx * 10 - 12, y + 14); ctx.fill();
  // body
  ctx.fillStyle = '#2563eb'; circle(x, y + 4, 12); ctx.fill();
  // head
  ctx.fillStyle = '#fde4c8'; circle(x, y - 9, 11); ctx.fill();
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x, y - 11, 11.5, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#111';
  const ex = p.fx * 3, ey = p.fy * 2;
  circle(x - 4 + ex, y - 8 + ey, 1.8); ctx.fill(); circle(x + 4 + ex, y - 8 + ey, 1.8); ctx.fill();
  ctx.globalAlpha = 1;
  // hp bar
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(p.x - 21, p.y + 22, 42, 6, 3); ctx.fill();
  ctx.fillStyle = p.hp / p.maxHp > 0.3 ? '#22c55e' : '#ef4444'; rr(p.x - 20, p.y + 23, 40 * clamp(p.hp / p.maxHp, 0, 1), 4, 2); ctx.fill();
}

function drawHUD() {
  const p = G.p;
  ctx.setTransform(DPR, 0, 0, DPR, 0, DPR * SAFE_TOP);
  ctx.textBaseline = 'middle';
  // xp bar
  const bx = 12, by = 10, bw = VW - 24;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(bx, by, bw, 16, 8); ctx.fill();
  const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#22d3ee'); gr.addColorStop(1, '#3b82f6');
  ctx.fillStyle = gr; rr(bx + 2, by + 2, Math.max(0, (bw - 4) * clamp(p.xp / p.xpNext, 0, 1)), 12, 6); ctx.fill();
  ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('Lv.' + p.lv, VW / 2, by + 8.5);
  // timer
  ctx.font = '900 26px sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
  const tt = G.bossSpawned ? 'BOSS' : fmtTime(G.time);
  ctx.strokeText(tt, VW / 2, 48); ctx.fillStyle = G.bossSpawned ? '#f87171' : '#fff'; ctx.fillText(tt, VW / 2, 48);
  // kills/gold
  ctx.textAlign = 'left'; ctx.font = '800 14px sans-serif';
  const txt = (s, x, y) => { ctx.strokeText(s, x, y); ctx.fillStyle = '#fff'; ctx.fillText(s, x, y); };
  ctx.lineWidth = 3;
  txt('💀 ' + G.kills, 14, 44); txt('🪙 ' + fmt(G.gold), 14, 64);
  // build
  ctx.font = '18px serif';
  p.weapons.forEach((w, i) => {
    const x = 14 + i * 30, y = 92;
    ctx.fillStyle = w.evo ? 'rgba(251,191,36,.45)' : 'rgba(0,0,0,.45)'; rr(x, y - 13, 26, 26, 6); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(w.evo ? WEAPONS[w.id].evoIcon : WEAPONS[w.id].icon, x + 13, y);
    ctx.font = '900 9px sans-serif'; ctx.fillText(w.evo ? 'MAX' : w.lv, x + 20, y + 10); ctx.font = '18px serif';
  });
  p.passives.forEach((q, i) => {
    const x = 14 + i * 30, y = 122;
    ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(x, y - 13, 26, 26, 6); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(PASSIVES[q.id].icon, x + 13, y);
    ctx.font = '900 9px sans-serif'; ctx.fillText(q.lv, x + 21, y + 10); ctx.font = '18px serif';
  });
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // boss bar
  if (G.boss && !G.boss.dead) {
    const b = G.boss, w = Math.min(420, VW - 40), x = (VW - w) / 2, y = VH - 60 - SAFE_BOTTOM;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(x, y, w, 18, 9); ctx.fill();
    ctx.fillStyle = '#dc2626'; rr(x + 2, y + 2, (w - 4) * clamp(b.hp / b.maxHp, 0, 1), 14, 7); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = '900 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('👑 ' + b.name, VW / 2, y - 10);
    // off-screen arrow
    if (!onScreen(b)) {
      const a = Math.atan2(b.y - p.y, b.x - p.x), ax = VW / 2 + Math.cos(a) * Math.min(VW, VH) * 0.4, ay = VH / 2 + Math.sin(a) * Math.min(VW, VH) * 0.4;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.fill(); ctx.restore();
    }
  }
  // flash
  for (const f of G.fx) if (f.type === 'flash') { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - f.t / f.life)})`; ctx.fillRect(0, 0, VW, VH); }
  // banner
  if (G.banner) {
    const a = Math.min(1, G.banner.t * 2), y = VH * 0.28;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, y - 24, VW, 48);
    ctx.textAlign = 'center'; ctx.font = '900 22px sans-serif'; ctx.fillStyle = G.banner.color; ctx.fillText(G.banner.text, VW / 2, y + 1);
    ctx.globalAlpha = 1;
  }
  // joystick
  if (joy.active) {
    ctx.fillStyle = 'rgba(255,255,255,.12)'; circle(joy.bx, joy.by, 50); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
    const jx = joy.x - joy.bx, jy = joy.y - joy.by, jl = Math.hypot(jx, jy), k = jl > 45 ? 45 / jl : 1;
    ctx.fillStyle = 'rgba(255,255,255,.5)'; circle(joy.bx + jx * k, joy.by + jy * k, 22); ctx.fill();
  } else if (G.time < 6) {
    ctx.globalAlpha = 1 - G.time / 6; ctx.textAlign = 'center'; ctx.font = '800 15px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('화면을 드래그하거나 WASD로 이동', VW / 2, VH - 90); ctx.globalAlpha = 1;
  }
}

// ============================================================
//  IN-RUN MODALS
// ============================================================
function showModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); return $('#modalBox'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }
let toastTimer = 0;
function toast(msg) { const t = $('#toast'); t.innerHTML = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800); }

function buildOptions(n) {
  const p = G.p, opts = [], pool = [];
  for (const w of p.weapons) if (!w.evo && w.lv >= MAX_WLV && p.passives.some(q => q.id === WEAPONS[w.id].pair)) opts.push({ kind: 'evo', id: w.id });
  for (const w of p.weapons) if (!w.evo && w.lv < MAX_WLV) pool.push({ kind: 'wup', id: w.id });
  if (p.weapons.length < MAX_SLOTS) for (const id in WEAPONS) if (!p.weapons.some(w => w.id === id)) pool.push({ kind: 'wnew', id });
  for (const q of p.passives) if (q.lv < MAX_WLV) pool.push({ kind: 'pup', id: q.id });
  if (p.passives.length < MAX_SLOTS) for (const id in PASSIVES) if (!p.passives.some(q => q.id === id)) pool.push({ kind: 'pnew', id });
  shuffle(pool);
  while (opts.length < n && pool.length) opts.push(pool.pop());
  if (!opts.length) opts.push({ kind: 'heal' }, { kind: 'gold' });
  return opts.slice(0, n);
}
const pips = (lv) => '★'.repeat(lv) + '☆'.repeat(MAX_WLV - lv);
function optInfo(o) {
  const p = G.p;
  switch (o.kind) {
    case 'evo': { const d = WEAPONS[o.id], q = PASSIVES[d.pair]; return { icon: d.evoIcon, name: d.evo, tag: '⚗️ 무기 믹스!', cls: 'evo', desc: `${d.icon}${d.name} + ${q.icon}${q.name} → ${d.evoInfo}` }; }
    case 'wnew': { const d = WEAPONS[o.id]; return { icon: d.icon, name: d.name, tag: 'NEW', desc: `${d.info}<br><small>믹스 재료: ${PASSIVES[d.pair].icon}${PASSIVES[d.pair].name}</small>` }; }
    case 'wup': { const d = WEAPONS[o.id], w = p.weapons.find(x => x.id === o.id); return { icon: d.icon, name: d.name, tag: `Lv.${w.lv + 1}`, up: true, desc: `<span class="pips">${pips(w.lv + 1)}</span><br>${upDesc(w)}` }; }
    case 'pnew': { const d = PASSIVES[o.id], wid = Object.keys(WEAPONS).find(k => WEAPONS[k].pair === o.id); return { icon: d.icon, name: d.name, tag: 'NEW', desc: `${d.info}<br><small>믹스 재료: ${WEAPONS[wid].icon}${WEAPONS[wid].name}</small>` }; }
    case 'pup': { const d = PASSIVES[o.id], q = p.passives.find(x => x.id === o.id); return { icon: d.icon, name: d.name, tag: `Lv.${q.lv + 1}`, up: true, desc: `<span class="pips">${pips(q.lv + 1)}</span><br>${d.info}` }; }
    case 'heal': return { icon: '🍖', name: '고기', tag: '회복', desc: '체력 50% 회복' };
    case 'gold': return { icon: '🪙', name: '금화 주머니', tag: '골드', desc: '골드 +50' };
  }
}
function applyOption(o) {
  const p = G.p;
  switch (o.kind) {
    case 'evo': p.weapons.find(x => x.id === o.id).evo = true; showBanner('⚗️ 무기 믹스! ' + WEAPONS[o.id].evo, '#fde047'); break;
    case 'wnew': addWeapon(o.id); break;
    case 'wup': p.weapons.find(x => x.id === o.id).lv++; break;
    case 'pnew': p.passives.push({ id: o.id, lv: 1 }); break;
    case 'pup': p.passives.find(x => x.id === o.id).lv++; break;
    case 'heal': p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5); break;
    case 'gold': G.gold += 50; break;
  }
  pStat();
}
function cardHTML(o, i) {
  const f = optInfo(o);
  return `<button class="card ${f.cls || ''}" data-i="${i}"><div class="ic">${f.icon}</div><div class="ct"><div class="cn">${f.name}<span class="tag ${f.up ? 'up' : ''}">${f.tag}</span></div><div class="cd">${f.desc}</div></div></button>`;
}
function openLevelUp() {
  G.state = 'modal'; G.pendingLv--; joy.active = false;
  const n = S.pass ? 4 : 3;
  let opts = buildOptions(n);
  const draw = () => {
    const box = showModal(`<h2>⬆️ 레벨 업! <small>Lv.${G.p.lv - G.pendingLv}</small></h2><div class="cards">${opts.map(cardHTML).join('')}</div>
      <div class="row"><button class="btn gray" id="reroll">🔄 새로고침 <small>(광고 X · 무료)</small></button></div>`);
    box.querySelectorAll('.card').forEach(c => c.onclick = () => { applyOption(opts[+c.dataset.i]); closeModal(); G.state = 'play'; });
    box.querySelector('#reroll').onclick = () => { opts = buildOptions(n); draw(); };
  };
  draw();
}
function openChest() {
  G.state = 'modal'; joy.active = false;
  const r = Math.random(), n = r < 0.1 ? 5 : r < 0.4 ? 3 : 1, got = [];
  for (let i = 0; i < n; i++) { const o = buildOptions(1)[0]; const f = optInfo(o); got.push(f); applyOption(o); }
  const box = showModal(`<div class="bigicon">🎁</div><h2>보물상자! <small>x${n}</small></h2>
    <div class="gotlist">${got.map(f => `<div>${f.icon} <b>${f.name}</b> <span class="tag ${f.up ? 'up' : ''}">${f.tag}</span></div>`).join('')}</div>
    <div class="row"><button class="btn green" id="ok">확인</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); G.state = 'play'; };
}
function buildSummary() {
  const p = G.p;
  return `<div class="build">${p.weapons.map(w => `<span>${w.evo ? WEAPONS[w.id].evoIcon + ' ' + WEAPONS[w.id].evo : WEAPONS[w.id].icon + ' Lv' + w.lv}</span>`).join('')}${p.passives.map(q => `<span>${PASSIVES[q.id].icon} Lv${q.lv}</span>`).join('')}</div>`;
}
function pauseGame() {
  if (!G || G.state !== 'play') return;
  G.state = 'modal'; joy.active = false;
  const box = showModal(`<h2>⏸ 일시정지</h2><div class="center">STAGE ${G.stage} · ${fmtTime(G.time)} · 💀${G.kills}</div>${buildSummary()}
    <div class="row"><button class="btn red" id="quit">포기하기</button><button class="btn green" id="resume">계속하기</button></div>`);
  box.querySelector('#resume').onclick = () => { closeModal(); G.state = 'play'; };
  box.querySelector('#quit').onclick = () => { closeModal(); endRun(false); };
}
$('#btnPause').onclick = pauseGame;

function playerDown() {
  G.state = 'modal'; joy.active = false;
  const box = showModal(`<div class="bigicon">💀</div><h2>쓰러졌습니다!</h2>
    <div class="center">원래라면 💎보석이나 광고가 필요하지만…<br><b>여기선 공짜!</b> (부활 ${G.revives}회)</div>
    <div class="row"><button class="btn gray" id="giveup">포기</button><button class="btn gold" id="rev">💖 무료 부활</button></div>`);
  box.querySelector('#rev').onclick = () => {
    closeModal(); G.revives++;
    const p = G.p; p.hp = p.maxHp; p.inv = 2.5; G.ebul = [];
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
      if (d < 350) { if (e.boss) { e.x = p.x + (e.x - p.x) / d * 350; e.y = p.y + (e.y - p.y) / d * 350; } else killEnemy(e); }
    }
    G.fx.push({ type: 'boom', x: p.x, y: p.y, r: 350, t: 0, life: 0.5 }, { type: 'flash', t: 0, life: 0.4 });
    G.state = 'play';
  };
  box.querySelector('#giveup').onclick = () => { closeModal(); endRun(false); };
}

function endRun(win) {
  if (G.state === 'over') return;
  G.state = 'over'; joy.active = false;
  const s = G.stage, mult = S.pass ? 2 : 1;
  let gold = Math.floor((G.gold + G.kills * 1.5 + G.time * 2) * (1 + (s - 1) * 0.25)) * mult;
  let gems = (win ? 30 + s * 10 : Math.floor(G.time / 30) * 2) * mult;
  let first = false, item = null;
  if (win) {
    first = S.cleared < s;
    if (first) gems += 100;
    S.cleared = Math.max(S.cleared, s);
    item = newItem(rollRarity(s));
  }
  S.gold += gold; S.gems += gems;
  S.best[s] = Math.max(S.best[s] || 0, Math.floor(G.time));
  save();
  const box = showModal(`<div class="bigicon">${win ? '🏆' : '☠️'}</div><h2>${win ? '스테이지 클리어!' : '패배…'}</h2>
    <div class="center">STAGE ${s} · ${fmtTime(G.time)} · 💀 ${G.kills} 처치${S.pass ? ' · 👑패스 2배' : ''}</div>
    ${buildSummary()}
    <div class="reward"><span>🪙 ${fmt(gold)}</span><span>💎 ${fmt(gems)}</span></div>
    ${first ? '<div class="center">🎉 첫 클리어 보너스 💎100 포함</div>' : ''}
    ${item ? `<div class="center" style="margin-top:8px">${itemTile(item, 'big')}<div style="margin-top:6px;color:${RAR[item.r].color}"><b>[${RAR[item.r].name}] ${itemName(item)}</b></div></div>` : ''}
    <div class="row"><button class="btn purple" id="dbl">📺 2배 받기 <small>(광고 없이 무료)</small></button></div>
    <div class="row"><button class="btn green" id="home">로비로</button>${win ? '<button class="btn gold" id="next">다음 스테이지 ▶</button>' : '<button class="btn gold" id="retry">다시 도전</button>'}</div>`);
  box.querySelector('#dbl').onclick = e => { S.gold += gold; S.gems += gems; save(); e.target.closest('button').disabled = true; e.target.closest('button').textContent = '✅ 2배 지급 완료'; toast(`🪙+${fmt(gold)} 💎+${fmt(gems)} 추가 지급!`); };
  const back = () => { closeModal(); G = null; $('#hudBtns').classList.add('hidden'); $('#lobby').classList.remove('hidden'); renderLobby(); };
  box.querySelector('#home').onclick = back;
  const again = box.querySelector('#next') || box.querySelector('#retry');
  again.onclick = () => { const ns = win ? s + 1 : s; back(); selStage = ns; tryStart(ns); };
}

// ============================================================
//  LOBBY
// ============================================================
let tab = 'battle', selStage = 1;
function refreshTop() {
  tickEnergy();
  $('#rGold').textContent = fmt(S.gold);
  $('#rGems').textContent = fmt(S.gems);
  $('#rEnergy').textContent = S.energy + '/' + MAX_EN;
}
function renderLobby() {
  refreshTop();
  document.querySelectorAll('nav.bottom button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const pg = $('#page');
  ({ battle: pageBattle, shop: pageShop, equip: pageEquip, hero: pageHero, settings: pageSettings })[tab](pg);
}
document.querySelectorAll('nav.bottom button').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderLobby(); $('#page').scrollTop = 0; });
document.querySelectorAll('.res button').forEach(b => b.onclick = () => { tab = 'shop'; renderLobby(); });
setInterval(() => { if (!G) refreshTop(); }, 5000);

function tryStart(stage) {
  tickEnergy();
  if (S.energy < EN_COST) {
    const box = showModal(`<div class="bigicon">⚡</div><h2>에너지 부족!</h2><div class="center">원래라면 기다리거나 결제해야 하지만…</div>
      <div class="row"><button class="btn gray" id="no">닫기</button><button class="btn gold" id="fill">⚡ 무료 충전 <small>₩0</small></button></div>`);
    box.querySelector('#no').onclick = closeModal;
    box.querySelector('#fill').onclick = () => { S.energy = MAX_EN; save(); closeModal(); refreshTop(); tryStart(stage); };
    return;
  }
  if (S.energy >= MAX_EN) S.energyAt = Date.now();
  S.energy -= EN_COST; save();
  startRun(stage);
}

function pageBattle(pg) {
  const maxSel = S.cleared + 1;
  selStage = clamp(selStage, 1, maxSel);
  const st = STAGES[(selStage - 1) % STAGES.length], m = metaStats();
  const lap = Math.floor((selStage - 1) / STAGES.length);
  pg.innerHTML = `
    <div class="power">⚔️ 전투력 <b>${fmt(m.power)}</b></div>
    <div class="stage" style="background:linear-gradient(160deg,${st.g1},${st.g2} 60%,${st.deco})">
      <button class="arrow" id="sPrev" ${selStage <= 1 ? 'disabled' : ''}>◀</button>
      <div class="sinfo">
        <div class="snum">STAGE ${selStage} ${lap ? `<span class="hard">지옥 ${lap}</span>` : ''}</div>
        <div class="sname">${st.name}</div>
        <div class="semoji">${st.emoji}</div>
        <div class="sbest">${S.cleared >= selStage ? '✅ 클리어' : '🔒 미클리어'} · 최고 기록 ${fmtTime(S.best[selStage] || 0)}</div>
        <div class="sboss">👑 보스: ${BOSSES[(selStage - 1) % BOSSES.length]} · 3분 생존 후 등장</div>
      </div>
      <button class="arrow" id="sNext" ${selStage >= maxSel ? 'disabled' : ''}>▶</button>
    </div>
    <button class="btn gold big" id="startBtn">⚔️ 전투 시작 <small>⚡${EN_COST}</small></button>
    <div class="tips">💡 무기를 <b>최대 레벨(${MAX_WLV})</b>까지 올리고 짝이 되는 보조 아이템을 가지고 있으면 레벨업 때 <b>⚗️ 무기 믹스</b>가 등장해요!
      <div class="mix">${Object.values(WEAPONS).map(w => `<div>${w.icon} + ${PASSIVES[w.pair].icon} = ${w.evoIcon}<b>${w.evo}</b></div>`).join('')}</div>
    </div>`;
  pg.querySelector('#sPrev').onclick = () => { selStage--; renderLobby(); };
  pg.querySelector('#sNext').onclick = () => { selStage++; renderLobby(); };
  pg.querySelector('#startBtn').onclick = () => tryStart(selStage);
}

// ---------- shop ----------
const SHOP = [
  { sec: '🎁 특별 패키지' },
  { id: 'starter', wide: true, icon: '🎁', name: '스타터 팩', desc: '💎500 + 🪙10,000 + 영웅 장비 1개', price: '₩5,900', once: 'starter', give: () => { S.gems += 500; S.gold += 10000; const it = newItem(3); return `💎500, 🪙10,000, [영웅] ${itemName(it)} 획득!`; } },
  { id: 'pass', wide: true, icon: '👑', name: '프리미엄 패스', desc: '전투 보상 2배 + 레벨업 선택지 4개', price: '₩14,900', once: 'pass', give: () => '👑 프리미엄 패스 활성화!' },
  { id: 'noads', wide: true, icon: '🚫', name: '광고 제거', desc: '모든 광고 제거 (사실 원래 없음)', price: '₩9,900', once: 'noAds', give: () => '🚫 광고 제거 완료! (원래 없었지만)' },
  { sec: '💎 보석' },
  { id: 'gem1', icon: '💎', name: '보석 한 줌', desc: '💎 300', price: '₩1,200', give: () => { S.gems += 300; return '💎 +300'; } },
  { id: 'gem2', icon: '💰', name: '보석 주머니', desc: '💎 1,600', price: '₩5,900', give: () => { S.gems += 1600; return '💎 +1,600'; } },
  { id: 'gem3', icon: '🧳', name: '보석 상자', desc: '💎 3,500', price: '₩12,000', give: () => { S.gems += 3500; return '💎 +3,500'; } },
  { id: 'gem4', icon: '🏦', name: '보석 금고', desc: '💎 20,000', price: '₩59,000', give: () => { S.gems += 20000; return '💎 +20,000'; } },
  { sec: '🪙 골드' },
  { id: 'gold1', icon: '🪙', name: '골드 더미', desc: '🪙 5,000', price: '₩2,500', give: () => { S.gold += 5000; return '🪙 +5,000'; } },
  { id: 'gold2', icon: '💰', name: '골드 자루', desc: '🪙 50,000', price: '₩11,000', give: () => { S.gold += 50000; return '🪙 +50,000'; } },
  { id: 'gold3', icon: '🏛️', name: '골드 창고', desc: '🪙 1,000,000', price: '₩99,000', give: () => { S.gold += 1000000; return '🪙 +1,000,000'; } },
  { id: 'energy', icon: '⚡', name: '에너지 충전', desc: `⚡ ${MAX_EN} 가득`, price: '₩1,100', give: () => { S.energy = Math.max(S.energy, MAX_EN); return '⚡ 에너지 충전 완료!'; } },
];
function pageShop(pg) {
  let html = `<h3>📦 장비 상자</h3><div class="sgrid">
    <div class="sitem"><div class="si">🎟️</div><div class="sn">무료 뽑기</div><div class="sd">광고 시청 대신 그냥 무료</div><button class="btn green" data-gacha="0">무료</button></div>
    <div class="sitem"><div class="si">📦</div><div class="sn">장비 상자 1회</div><div class="sd">전설 확률 0.3%</div><button class="btn" data-gacha="1">💎 300</button></div>
    <div class="sitem wide"><div class="si">🎰</div><div class="info"><div class="sn">장비 상자 10회 <span class="badge">희귀 이상 1개 확정</span></div><div class="sd">10% 할인</div></div><button class="btn purple" data-gacha="10">💎 2,700</button></div>
  </div>`;
  let open = false;
  for (const it of SHOP) {
    if (it.sec) { if (open) html += '</div>'; html += `<h3>${it.sec}</h3><div class="sgrid">`; open = true; continue; }
    const owned = it.once && S[it.once];
    const btn = `<button class="btn gold price" data-buy="${it.id}" ${owned ? 'disabled' : ''}>${owned ? '보유중' : `<s>${it.price}</s>₩0`}</button>`;
    html += it.wide
      ? `<div class="sitem wide"><div class="si">${it.icon}</div><div class="info"><div class="sn">${it.name}</div><div class="sd">${it.desc}</div></div>${btn}</div>`
      : `<div class="sitem"><div class="si">${it.icon}</div><div class="sn">${it.name}</div><div class="sd">${it.desc}</div>${btn}</div>`;
  }
  html += `</div><div class="tips">💸 지금까지 아낀 돈: <b>₩${S.spent.toLocaleString()}</b></div>`;
  pg.innerHTML = html;
  pg.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const it = SHOP.find(x => x.id === b.dataset.buy);
    if (it.once) S[it.once] = true;
    S.spent += parseInt(it.price.replace(/[^\d]/g, ''), 10);
    const msg = it.give(); save(); toast('✅ 결제 완료 (₩0)<br>' + msg); renderLobby();
  });
  pg.querySelectorAll('[data-gacha]').forEach(b => b.onclick = () => gacha(+b.dataset.gacha));
}
function gacha(n) {
  const cost = n === 0 ? 0 : n === 1 ? 300 : 2700;
  if (S.gems < cost) { toast('💎 보석이 부족해요! 아래 보석 상품을 ₩0에 사세요 👇'); return; }
  S.gems -= cost;
  const cnt = Math.max(1, n), got = [];
  for (let i = 0; i < cnt; i++) got.push(newItem(rollRarity()));
  if (n === 10 && !got.some(i => i.r >= 2)) got[9].r = 2;
  save(); refreshTop();
  const best = Math.max(...got.map(i => i.r));
  const box = showModal(`<h2>${best >= 4 ? '🌟 전설 획득!!' : best >= 3 ? '✨ 영웅 획득!' : '📦 장비 획득'}</h2>
    <div class="ggrid">${got.map((it, i) => itemTile(it, '', `animation-delay:${i * 0.07}s`)).join('')}</div>
    <div class="row"><button class="btn gray" id="ok">확인</button><button class="btn purple" id="again">한 번 더</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); renderLobby(); };
  box.querySelector('#again').onclick = () => { closeModal(); gacha(n); };
}

// ---------- equipment ----------
function pageEquip(pg) {
  const m = metaStats();
  const inv = S.items.slice().sort((a, b) => b.r - a.r || a.slot.localeCompare(b.slot) || b.lv - a.lv);
  pg.innerHTML = `
    <div class="power">⚔️ 전투력 <b>${fmt(m.power)}</b></div>
    <div class="slots">${SLOTS.map(s => { const it = getItem(S.equip[s.id]); return `<div class="slot">${it ? itemTile(it) : `<div class="empty">${s.icon}</div>`}${s.name}</div>`; }).join('')}</div>
    <div class="stats">
      <span>공격력 <b>${fmt(m.atkTotal)}</b></span><span>체력 <b>${fmt(m.hp)}</b></span>
      <span>치명타 <b>${Math.round(m.crit * 100)}%</b></span><span>회복 <b>${m.regen.toFixed(1)}/초</b></span>
      <span>이동속도 <b>+${Math.round(m.spd * 100)}%</b></span><span>획득범위 <b>+${Math.round(m.magnet * 100)}%</b></span>
    </div>
    <div class="row"><button class="btn green" id="auto">자동 장착</button><button class="btn purple" id="merge">⚗️ 일괄 합성</button></div>
    <h3>🎒 가방 (${S.items.length}) <small>같은 등급·부위 3개 → 상위 등급 합성</small></h3>
    ${inv.length ? `<div class="inv">${inv.map(it => itemTile(it)).join('')}</div>` : '<div class="tips">장비가 없어요. 상점에서 무료로 뽑아보세요!</div>'}`;
  pg.querySelectorAll('.itile').forEach(t => t.onclick = () => itemDetail(getItem(+t.dataset.id)));
  pg.querySelector('#auto').onclick = () => { autoEquip(); save(); toast('최고 장비 장착 완료!'); renderLobby(); };
  pg.querySelector('#merge').onclick = () => { const n = mergeAll(); save(); toast(n ? `⚗️ ${n}회 합성 성공!` : '합성할 장비가 없어요 (같은 부위·등급 3개 필요)'); renderLobby(); };
}
function itemDetail(it) {
  if (!it) return;
  const s = SLOT[it.slot], eq = isEquipped(it), maxed = it.lv >= itemMaxLv(it), cost = itemUpCost(it);
  const box = showModal(`<div class="center">${itemTile(it, 'big')}</div>
    <h2 style="margin-top:10px;color:${RAR[it.r].color}">[${RAR[it.r].name}] ${itemName(it)}</h2>
    <div class="center">${s.name} · Lv ${it.lv}/${itemMaxLv(it)}<br>${s.label} <b>${fmtStat(it.slot, itemVal(it))}</b>${maxed ? '' : ` → <b style="color:#4ade80">${fmtStat(it.slot, itemVal({ ...it, lv: it.lv + 1 }))}</b>`}</div>
    <div class="row"><button class="btn gold" id="up" ${maxed || S.gold < cost ? 'disabled' : ''}>${maxed ? '최대 레벨' : `강화 🪙${fmt(cost)}`}</button>
      <button class="btn ${eq ? 'gray' : 'green'}" id="eq">${eq ? '해제' : '장착'}</button></div>
    <div class="row"><button class="btn red" id="sell" ${eq ? 'disabled' : ''}>분해 🪙+${fmt(itemSell(it))}</button><button class="btn gray" id="close">닫기</button></div>`);
  box.querySelector('#up').onclick = () => { S.gold -= cost; it.lv++; save(); refreshTop(); itemDetail(it); renderLobby(); };
  box.querySelector('#eq').onclick = () => { if (eq) delete S.equip[it.slot]; else S.equip[it.slot] = it.id; save(); closeModal(); renderLobby(); };
  box.querySelector('#sell').onclick = () => { S.gold += itemSell(it); S.items = S.items.filter(i => i !== it); save(); closeModal(); renderLobby(); };
  box.querySelector('#close').onclick = closeModal;
}

// ---------- hero talents ----------
function pageHero(pg) {
  const t = S.talents;
  pg.innerHTML = `<div class="power">⚔️ 전투력 <b>${fmt(metaStats().power)}</b></div>
    ${TALENTS.map(d => {
      const lv = t[d.id], maxed = lv >= d.max, c = talentCost(lv);
      return `<div class="tal"><div class="ti">${d.icon}</div><div class="tn"><b>${d.name} <small>Lv.${lv}/${d.max}</small></b><span>현재 ${d.f(lv * d.per)} · 다음 ${d.f((lv + 1) * d.per)}</span></div>
        <button class="btn gold" data-t="${d.id}" ${maxed || S.gold < c ? 'disabled' : ''}>${maxed ? 'MAX' : '🪙 ' + fmt(c)}</button></div>`;
    }).join('')}
    <div class="row"><button class="btn purple" id="allUp">⚡ 골드로 전부 강화</button></div>
    <div class="tips">골드가 부족하면 상점에서 ₩0에 사면 돼요 😎</div>`;
  pg.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const d = TALENTS.find(x => x.id === b.dataset.t), c = talentCost(t[d.id]);
    if (S.gold < c || t[d.id] >= d.max) return;
    S.gold -= c; t[d.id]++; save(); renderLobby();
  });
  pg.querySelector('#allUp').onclick = () => {
    let n = 0, progress = true;
    while (progress) {
      progress = false;
      for (const d of TALENTS) { const c = talentCost(t[d.id]); if (t[d.id] < d.max && S.gold >= c) { S.gold -= c; t[d.id]++; n++; progress = true; } }
    }
    save(); toast(n ? `💪 ${n}회 강화 완료!` : '골드가 부족해요'); renderLobby();
  };
}

// ---------- settings ----------
function pageSettings(pg) {
  pg.innerHTML = `<h2>⚙️ 설정</h2>
    <div class="tips">🎮 <b>Hero Mixer</b><br>• 이동: 화면 드래그(조이스틱) 또는 WASD / 방향키<br>• 공격: 자동<br>• 일시정지: 우측 상단 버튼 또는 ESC<br>• 3분 생존하면 보스 등장 → 처치하면 클리어<br>• 모든 결제 상품은 <b>₩0</b> 입니다 💸</div>
    <div class="stats" style="margin-top:12px">
      <span>클리어 <b>${S.cleared}</b></span><span>보유 장비 <b>${S.items.length}</b></span>
      <span>패스 <b>${S.pass ? 'ON' : 'OFF'}</b></span><span>아낀 돈 <b>₩${fmt(S.spent)}</b></span>
    </div>
    <h3>📱 휴대폰에 설치</h3>
    ${isStandalone() ? '<div class="tips">✅ 앱으로 실행 중이에요. 인터넷 없이도 플레이할 수 있어요.</div>'
      : installEvt ? '<div class="row"><button class="btn green" id="install">📲 홈 화면에 설치</button></div>'
      : '<div class="tips">• <b>안드로이드 (크롬)</b>: 오른쪽 위 ⋮ 메뉴 → <b>홈 화면에 추가</b> 또는 <b>앱 설치</b><br>• <b>아이폰 (사파리)</b>: 아래 공유 버튼 ⬆️ → <b>홈 화면에 추가</b></div>'}
    <div class="row"><button class="btn red" id="reset">데이터 초기화</button></div>`;
  const ib = pg.querySelector('#install');
  if (ib) ib.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderLobby(); };
  pg.querySelector('#reset').onclick = () => {
    const box = showModal(`<h2>정말 초기화할까요?</h2><div class="center">모든 진행 상황이 삭제됩니다.</div>
      <div class="row"><button class="btn gray" id="no">취소</button><button class="btn red" id="yes">초기화</button></div>`);
    box.querySelector('#no').onclick = closeModal;
    box.querySelector('#yes').onclick = () => { S = defaultSave(); save(); closeModal(); selStage = 1; tab = 'battle'; renderLobby(); };
  };
}

// ============================================================
//  BOOT
// ============================================================
let installEvt = null;
const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (!G && tab === 'settings') renderLobby(); });
addEventListener('appinstalled', () => { installEvt = null; toast('📲 설치 완료! 홈 화면에서 실행하세요'); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (G) { if (G.state === 'play') update(dt); if (G) render(); }
  requestAnimationFrame(frame);
}
loadSave();
resize();
selStage = Math.min(S.cleared + 1, 999);
renderLobby();
requestAnimationFrame(frame);
