'use strict';
// ============================================================
//  HERO MIXER — game data
// ============================================================

// ---------- stages ----------
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

// ---------- equipment grades (10) ----------
const GRADES = [
  { n: 'F', c: '#9ca3af', mult: 1 },
  { n: 'D', c: '#4ade80', mult: 1.5 },
  { n: 'C', c: '#2dd4bf', mult: 2.2 },
  { n: 'B', c: '#60a5fa', mult: 3.2 },
  { n: 'A', c: '#a78bfa', mult: 4.6 },
  { n: 'S', c: '#f472b6', mult: 6.5 },
  { n: 'SS', c: '#fb923c', mult: 9 },
  { n: 'SSS', c: '#f87171', mult: 12.5 },
  { n: '에픽', c: '#e879f9', mult: 17 },
  { n: '전설', c: '#fbbf24', mult: 24 },
];
const MAX_GRADE = GRADES.length - 1;
// image file suffix per grade: assets/weapons/sword_EPIC.png
['F', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'EPIC', 'LEGEND'].forEach((code, i) => { GRADES[i].code = code; });
// 에픽·전설은 뽑기로 안 나옴 → 합성으로만 획득
const GACHA_W = [420, 300, 160, 75, 32, 10, 2.5, 0.5, 0, 0];

// ---------- weapon types: the equipped weapon is your main attack ----------
const WT = {
  sword: { name: '검', kind: 'slash', coef: 1.0, cd: 0.85, range: 82, arc: 2.2, reach: 130, desc: '전방을 크게 베어냅니다' },
  dagger: { name: '단검', kind: 'throw', coef: 0.45, cd: 0.32, spd: 650, reach: 500, desc: '단검을 빠르게 연속으로 던집니다' },
  bow: { name: '활', kind: 'arrow', coef: 0.8, cd: 0.7, spd: 820, reach: 650, desc: '적 2명을 꿰뚫는 화살을 쏩니다' },
  crossbow: { name: '석궁', kind: 'bolt', coef: 1.5, cd: 1.25, spd: 980, reach: 700, desc: '모든 적을 꿰뚫는 무거운 볼트' },
  gun: { name: '머스킷', kind: 'bullet', coef: 0.95, cd: 0.6, spd: 1150, reach: 650, desc: '총알을 빠르게 발사합니다' },
  hammer: { name: '망치', kind: 'slam', coef: 1.9, cd: 1.5, range: 150, aoe: 75, reach: 170, desc: '땅을 내리쳐 충격파 + 기절' },
  axe: { name: '도끼', kind: 'axe', coef: 1.3, cd: 1.3, spd: 480, reach: 420, desc: '도끼를 던져 그 자리에서 회전' },
  spear: { name: '창', kind: 'thrust', coef: 1.15, cd: 0.8, range: 175, reach: 200, desc: '일직선으로 길게 꿰뚫습니다' },
  scythe: { name: '낫', kind: 'spin', coef: 1.0, cd: 1.15, range: 98, reach: 150, desc: '주변 360도를 베어냅니다' },
  spellbook: { name: '마법서', kind: 'orbs', coef: 0.55, cd: 1.1, spd: 320, reach: 600, desc: '적을 쫓아가는 마법구 소환' },
  wand: { name: '완드', kind: 'bounce', coef: 0.75, cd: 0.75, spd: 560, reach: 600, desc: '적 사이를 튕겨다니는 마법탄' },
  staff: { name: '지팡이', kind: 'fireball', coef: 1.2, cd: 1.15, spd: 420, aoe: 62, reach: 600, desc: '폭발하는 화염구를 날립니다' },
};
const WT_IDS = Object.keys(WT);
const FIST = { name: '주먹', kind: 'slash', coef: 0.6, cd: 0.5, range: 52, arc: 1.4, reach: 90, desc: '맨주먹 (무기를 장착하세요!)' };

// ---------- equipment slots ----------
const SLOTS = [
  { id: 'weapon', name: '무기', icon: '⚔️', key: 'atk', base: 5, label: '공격력' },
  { id: 'armor', name: '갑옷', icon: '🛡️', key: 'hp', base: 30, label: '체력' },
  { id: 'helmet', name: '투구', icon: '⛑️', key: 'def', base: 2, label: '방어력' },
  { id: 'gloves', name: '장갑', icon: '🧤', key: 'crit', base: 0.008, label: '치명타', pct: true },
  { id: 'ring', name: '반지', icon: '💍', key: 'atkPct', base: 0.025, label: '공격력%', pct: true },
  { id: 'neck', name: '목걸이', icon: '📿', key: 'critDmg', base: 0.04, label: '치명타 피해', pct: true },
  { id: 'belt', name: '벨트', icon: '🎗️', key: 'regen', base: 0.2, label: '초당 회복' },
  { id: 'boots', name: '신발', icon: '👢', key: 'spd', base: 0.012, label: '이동속도', pct: true },
];
const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));

// ---------- in-run skills ----------
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

// ---------- permanent stat upgrades (gold) ----------
const STATS = [
  { id: 'atk', name: '공격력', icon: '⚔️', per: 3, max: 500 },
  { id: 'hp', name: '체력', icon: '❤️', per: 20, max: 500 },
  { id: 'def', name: '방어력', icon: '🛡️', per: 2, max: 300 },
  { id: 'crit', name: '치명타 확률', icon: '🎯', per: 0.005, max: 100, pct: true },
  { id: 'critDmg', name: '치명타 피해', icon: '💥', per: 0.02, max: 150, pct: true },
  { id: 'aspd', name: '공격 속도', icon: '⚡', per: 0.01, max: 80, pct: true },
  { id: 'spd', name: '이동 속도', icon: '👟', per: 0.01, max: 40, pct: true },
  { id: 'regen', name: '체력 재생', icon: '💚', per: 0.2, max: 100, suf: '/초' },
  { id: 'magnet', name: '획득 범위', icon: '🧲', per: 0.03, max: 40, pct: true },
  { id: 'exp', name: '경험치 획득', icon: '📘', per: 0.02, max: 50, pct: true },
  { id: 'goldGain', name: '골드 획득', icon: '🪙', per: 0.03, max: 100, pct: true },
  { id: 'skillDmg', name: '스킬 피해', icon: '✨', per: 0.02, max: 100, pct: true },
];
const statCost = lv => Math.floor(50 + 40 * Math.pow(lv, 1.6));
const STAT_NAMES = { atk: '공격력', hp: '체력', def: '방어력', crit: '치명타 확률', critDmg: '치명타 피해', aspd: '공격 속도', spd: '이동 속도', regen: '체력 재생', magnet: '획득 범위', exp: '경험치 획득', goldGain: '골드 획득', skillDmg: '스킬 피해', atkPct: '공격력', hpPct: '체력', dr: '피해 감소' };
const PCT_KEYS = new Set(['crit', 'critDmg', 'aspd', 'spd', 'magnet', 'exp', 'goldGain', 'skillDmg', 'atkPct', 'hpPct', 'dr']);
function fmtBonus(key, v) { return PCT_KEYS.has(key) ? `+${+(v * 100).toFixed(1)}%` : key === 'regen' ? `+${v.toFixed(1)}/초` : `+${Math.round(v)}`; }

// ---------- heroes ----------
const HRAR = [
  { n: 'R', c: '#60a5fa' },
  { n: 'SR', c: '#a78bfa' },
  { n: 'SSR', c: '#fbbf24' },
  { n: 'UR', c: '#f43f5e' },
];
const HERO_GACHA_W = [60, 28, 10, 2];
const HEROES = [
  { id: 'knight', name: '견습 기사', r: 0, wt: 'sword', look: { hair: '#f59e0b', body: '#2563eb', cape: '#dc2626', skin: '#fde4c8' }, bonus: { hpPct: 0.05, def: 5 } },
  { id: 'archer', name: '숲의 궁수', r: 0, wt: 'bow', look: { hair: '#65a30d', body: '#166534', cape: '#a16207', skin: '#fde4c8', hood: '#15803d' }, bonus: { aspd: 0.1 } },
  { id: 'gunner', name: '총잡이', r: 0, wt: 'gun', look: { hair: '#78350f', body: '#57534e', cape: '#92400e', skin: '#f5d0b0', hat: 'cowboy' }, bonus: { crit: 0.05, goldGain: 0.1 } },
  { id: 'rogue', name: '그림자 도적', r: 1, wt: 'dagger', look: { hair: '#1f2937', body: '#374151', cape: '#7c3aed', skin: '#fde4c8', mask: true }, bonus: { crit: 0.08, spd: 0.06 } },
  { id: 'mage', name: '불꽃 마법사', r: 1, wt: 'staff', look: { hair: '#dc2626', body: '#7c2d12', cape: '#f97316', skin: '#fde4c8', hat: 'wizard', hatColor: '#9a3412' }, bonus: { skillDmg: 0.15, exp: 0.1 } },
  { id: 'monk', name: '망치 수도승', r: 1, wt: 'hammer', look: { hair: '#292524', body: '#ca8a04', cape: '#b45309', skin: '#e7b98f', bald: true }, bonus: { hpPct: 0.12, regen: 1 } },
  { id: 'paladin', name: '성기사', r: 2, wt: 'hammer', look: { hair: '#fef3c7', body: '#e5e7eb', cape: '#facc15', skin: '#fde4c8', helmet: '#cbd5e1' }, bonus: { hpPct: 0.25, def: 25 } },
  { id: 'berserker', name: '광전사', r: 2, wt: 'axe', look: { hair: '#b91c1c', body: '#57534e', cape: '#7f1d1d', skin: '#e7b98f', horns: true }, bonus: { atkPct: 0.2, critDmg: 0.2 } },
  { id: 'ninja', name: '바람의 닌자', r: 2, wt: 'dagger', look: { hair: '#111827', body: '#1e3a8a', cape: '#0ea5e9', skin: '#fde4c8', mask: true }, bonus: { spd: 0.15, crit: 0.1 } },
  { id: 'reaper', name: '사신', r: 3, wt: 'scythe', look: { hair: '#e5e7eb', body: '#111827', cape: '#4c1d95', skin: '#d1d5db', hood: '#1f2937' }, bonus: { atkPct: 0.25, critDmg: 0.5 } },
  { id: 'dragoon', name: '용기사', r: 3, wt: 'spear', look: { hair: '#fbbf24', body: '#991b1b', cape: '#f59e0b', skin: '#fde4c8', helmet: '#b91c1c', horns: true }, bonus: { atkPct: 0.3, hpPct: 0.2 } },
  { id: 'archmage', name: '대마법사', r: 3, wt: 'spellbook', look: { hair: '#e0e7ff', body: '#3730a3', cape: '#818cf8', skin: '#fde4c8', hat: 'wizard', hatColor: '#312e81' }, bonus: { skillDmg: 0.35, exp: 0.25, aspd: 0.1 } },
  // R
  { id: 'squire', name: '방패병', r: 0, wt: 'sword', look: { hair: '#92400e', body: '#475569', cape: '#0369a1', skin: '#fde4c8', helmet: '#94a3b8' }, bonus: { def: 10, hpPct: 0.06 } },
  { id: 'hunter', name: '사냥꾼', r: 0, wt: 'crossbow', look: { hair: '#57534e', body: '#4d7c0f', cape: '#78350f', skin: '#f5d0b0', band: '#b91c1c' }, bonus: { crit: 0.06, magnet: 0.1 } },
  { id: 'farmer', name: '용감한 농부', r: 0, wt: 'axe', look: { hair: '#a16207', body: '#0284c7', cape: '#65a30d', skin: '#f5d0b0', hat: 'cowboy', hatColor: '#ca8a04' }, bonus: { goldGain: 0.15, hpPct: 0.05 } },
  { id: 'apprentice', name: '견습 마법사', r: 0, wt: 'wand', look: { hair: '#7c3aed', body: '#6d28d9', cape: '#c4b5fd', skin: '#fde4c8', hat: 'wizard', hatColor: '#4c1d95' }, bonus: { skillDmg: 0.08, exp: 0.05 } },
  { id: 'sailor', name: '해적 선원', r: 0, wt: 'gun', look: { hair: '#111827', body: '#f1f5f9', cape: '#1e3a8a', skin: '#e7b98f', band: '#dc2626' }, bonus: { aspd: 0.06, goldGain: 0.08 } },
  { id: 'scout', name: '숲 정찰병', r: 0, wt: 'spear', look: { hair: '#facc15', body: '#15803d', cape: '#166534', skin: '#fde4c8', elf: true }, bonus: { spd: 0.08, magnet: 0.1 } },
  // SR
  { id: 'priest', name: '사제', r: 1, wt: 'staff', look: { hair: '#fde68a', body: '#f8fafc', cape: '#60a5fa', skin: '#fde4c8', halo: true }, bonus: { regen: 2, hpPct: 0.1 } },
  { id: 'samurai', name: '사무라이', r: 1, wt: 'sword', look: { hair: '#111827', body: '#991b1b', cape: '#1f2937', skin: '#fde4c8', band: '#f8fafc' }, bonus: { crit: 0.1, critDmg: 0.25 } },
  { id: 'catgirl', name: '고양이 검사', r: 1, wt: 'dagger', look: { hair: '#fb923c', body: '#fef3c7', cape: '#f97316', skin: '#fde4c8', cat: true }, bonus: { aspd: 0.12, spd: 0.06 } },
  { id: 'viking', name: '바이킹', r: 1, wt: 'axe', look: { hair: '#f59e0b', body: '#78716c', cape: '#1e40af', skin: '#f5d0b0', horns: true, beard: true }, bonus: { atkPct: 0.12, hpPct: 0.1 } },
  { id: 'elfarcher', name: '엘프 궁수', r: 1, wt: 'bow', look: { hair: '#fef9c3', body: '#4ade80', cape: '#14532d', skin: '#fde4c8', elf: true }, bonus: { crit: 0.08, aspd: 0.08 } },
  { id: 'alchemist', name: '연금술사', r: 1, wt: 'spellbook', look: { hair: '#0f766e', body: '#115e59', cape: '#5eead4', skin: '#fde4c8', hood: '#134e4a' }, bonus: { skillDmg: 0.12, goldGain: 0.1 } },
  // SSR
  { id: 'stormmage', name: '폭풍 마법사', r: 2, wt: 'wand', look: { hair: '#38bdf8', body: '#1e3a8a', cape: '#60a5fa', skin: '#fde4c8', hat: 'wizard', hatColor: '#1e40af' }, bonus: { skillDmg: 0.25, aspd: 0.1 } },
  { id: 'commander', name: '기사단장', r: 2, wt: 'sword', look: { hair: '#d1d5db', body: '#1f2937', cape: '#dc2626', skin: '#f5d0b0', helmet: '#475569', beard: true }, bonus: { atkPct: 0.15, def: 30 } },
  { id: 'shadowqueen', name: '그림자 여왕', r: 2, wt: 'scythe', look: { hair: '#581c87', body: '#18181b', cape: '#7e22ce', skin: '#e9d5ff', crown: true }, bonus: { critDmg: 0.4, crit: 0.08 } },
  { id: 'sniper', name: '저격수', r: 2, wt: 'crossbow', look: { hair: '#4b5563', body: '#3f6212', cape: '#365314', skin: '#f5d0b0', hood: '#4d7c0f' }, bonus: { crit: 0.15, critDmg: 0.3 } },
  { id: 'saint', name: '성녀', r: 2, wt: 'staff', look: { hair: '#fef3c7', body: '#fefce8', cape: '#fbbf24', skin: '#fde4c8', halo: true, crown: true }, bonus: { hpPct: 0.3, regen: 3 } },
  { id: 'tiger', name: '호랑이 전사', r: 2, wt: 'hammer', look: { hair: '#f97316', body: '#78350f', cape: '#ea580c', skin: '#f5d0b0', cat: true, band: '#111827' }, bonus: { atkPct: 0.2, spd: 0.06 } },
  // UR
  { id: 'sunking', name: '태양왕', r: 3, wt: 'sword', look: { hair: '#fbbf24', body: '#facc15', cape: '#dc2626', skin: '#fde4c8', crown: true }, bonus: { atkPct: 0.35, goldGain: 0.3 } },
  { id: 'lich', name: '리치 군주', r: 3, wt: 'spellbook', look: { hair: '#a5f3fc', body: '#1e1b4b', cape: '#0e7490', skin: '#c7d2fe', crown: true }, bonus: { skillDmg: 0.4, exp: 0.2, regen: 2 } },
  { id: 'archangel', name: '대천사', r: 3, wt: 'spear', look: { hair: '#fef9c3', body: '#f8fafc', cape: '#fde047', skin: '#fde4c8', halo: true, helmet: '#fde68a' }, bonus: { hpPct: 0.35, atkPct: 0.2, def: 30 } },
  { id: 'demonlord', name: '마왕', r: 3, wt: 'scythe', look: { hair: '#111827', body: '#450a0a', cape: '#991b1b', skin: '#fca5a5', horns: true, crown: true }, bonus: { atkPct: 0.4, critDmg: 0.4 } },
  { id: 'gunqueen', name: '총의 여제', r: 3, wt: 'gun', look: { hair: '#e11d48', body: '#1f2937', cape: '#be123c', skin: '#fde4c8', hat: 'cowboy', hatColor: '#111827' }, bonus: { aspd: 0.25, crit: 0.15 } },
  { id: 'titan', name: '거신', r: 3, wt: 'hammer', look: { hair: '#78716c', body: '#57534e', cape: '#a16207', skin: '#e7b98f', helmet: '#a8a29e', beard: true }, bonus: { hpPct: 0.5, def: 50, atkPct: 0.15 } },
];
HEROES.sort((a, b) => b.r - a.r); // list grouped by grade, best first: UR → SSR → SR → R
const HERO = Object.fromEntries(HEROES.map(h => [h.id, h]));
const HERO_STAR_SHARDS = [1, 2, 3, 5, 8];
const heroMaxLv = st => 20 + st.stars * 10;
const heroLvCost = lv => Math.floor(200 * Math.pow(lv, 1.4));
const heroMult = st => 1 + 0.05 * (st.lv - 1) + 0.25 * st.stars;

// ---------- pets ----------
const PRAR = [
  { n: '일반', c: '#9ca3af', m: 1 },
  { n: '희귀', c: '#60a5fa', m: 1.5 },
  { n: '영웅', c: '#a78bfa', m: 2.2 },
  { n: '전설', c: '#fbbf24', m: 3.2 },
];
const PET_GACHA_W = [55, 30, 12, 3];
// base = body drawing, kind = how it fights, c = colors
const PETS = [
  { id: 'slime', name: '말랑 슬라임', r: 0, base: 'slime', kind: 'goo', c: ['#4ade80', '#bbf7d0'], desc: '끈적한 점액탄으로 적을 느리게' },
  { id: 'cat', name: '고양이 기사', r: 0, base: 'cat', kind: 'scratch', c: ['#fb923c', '#94a3b8'], desc: '근처 적을 할퀴며 싸워요' },
  { id: 'bunny', name: '깡총 토끼', r: 0, base: 'bunny', kind: 'scratch', c: ['#f8fafc', '#f9a8d4'], desc: '뛰어다니며 적을 걷어차요' },
  { id: 'penguin', name: '꼬마 펭귄', r: 0, base: 'penguin', kind: 'frost', c: ['#1f2937', '#f8fafc'], desc: '얼음탄으로 적을 얼려요' },
  { id: 'shroom', name: '독버섯', r: 0, base: 'mushroom', kind: 'spore', c: ['#dc2626', '#fef3c7'], desc: '독 포자를 날려요' },
  { id: 'bee', name: '꿀벌', r: 0, base: 'bee', kind: 'sting', c: ['#facc15', '#1f2937'], desc: '빠르게 독침을 연사해요' },
  { id: 'fireslime', name: '불꽃 슬라임', r: 0, base: 'slime', kind: 'fire', c: ['#f97316', '#fde68a'], desc: '작은 불덩이를 뱉어요' },
  { id: 'puppy', name: '황금 강아지', r: 0, base: 'dog', kind: 'coin', c: ['#d97706', '#fde68a'], desc: '골드를 물어 와요 + 깨물기' },
  { id: 'fairy', name: '치유 요정', r: 1, base: 'fairy', kind: 'heal', c: ['#f9a8d4', '#bae6fd'], desc: '주기적으로 체력을 회복시켜 줘요' },
  { id: 'ghost', name: '꼬마 유령', r: 1, base: 'ghost', kind: 'ghost', c: ['#f1f5f9'], desc: '관통하는 유령탄을 쏴요' },
  { id: 'turtle', name: '바위 거북', r: 1, base: 'turtle', kind: 'quake', c: ['#65a30d', '#a3e635'], desc: '주변에 충격파를 일으켜요' },
  { id: 'iceslime', name: '얼음 슬라임', r: 1, base: 'slime', kind: 'frost', c: ['#67e8f9', '#ecfeff'], desc: '적을 꽁꽁 얼려요' },
  { id: 'owl', name: '지혜의 부엉이', r: 1, base: 'owl', kind: 'zap', c: ['#92400e', '#fde68a'], desc: '번개를 떨어뜨려요' },
  { id: 'fox', name: '불여우', r: 1, base: 'fox', kind: 'fire', c: ['#ea580c', '#fff7ed'], desc: '여우불을 날려요' },
  { id: 'robot', name: '미니 로봇', r: 1, base: 'robot', kind: 'laser', c: ['#94a3b8', '#ef4444'], desc: '레이저 빔을 발사해요' },
  { id: 'eagle', name: '폭풍 독수리', r: 2, base: 'eagle', kind: 'dive', c: ['#92400e', '#f8fafc'], desc: '적에게 급강하해 큰 피해' },
  { id: 'wolf', name: '서리 늑대', r: 2, base: 'wolf', kind: 'scratch', c: ['#93c5fd', '#e0f2fe'], desc: '강하게 물어뜯어요' },
  { id: 'jelly', name: '전기 해파리', r: 2, base: 'jelly', kind: 'zap', c: ['#c084fc', '#f5d0fe'], desc: '연쇄 번개를 일으켜요' },
  { id: 'golem', name: '미니 골렘', r: 2, base: 'golem', kind: 'quake', c: ['#78716c', '#facc15'], desc: '땅을 내려쳐 기절시켜요' },
  { id: 'kingslime', name: '킹 슬라임', r: 2, base: 'slime', kind: 'goo', c: ['#facc15', '#fef9c3'], crown: true, desc: '거대한 점액탄 + 골드 보너스' },
  { id: 'dragon', name: '아기 용', r: 3, base: 'dragon', kind: 'fire', c: ['#dc2626', '#8b5cf6', '#fde68a'], desc: '폭발하는 화염구를 뿜어요' },
  { id: 'phoenix', name: '불사조', r: 3, base: 'phoenix', kind: 'phoenix', c: ['#f97316', '#fde047'], desc: '화염구 + 체력 회복' },
  { id: 'icedragon', name: '얼음 용', r: 3, base: 'dragon', kind: 'frost', c: ['#38bdf8', '#e0f2fe', '#f0f9ff'], desc: '거대한 얼음 숨결' },
  { id: 'starspirit', name: '별의 정령', r: 3, base: 'star', kind: 'starfall', c: ['#fde047', '#fef9c3'], desc: '하늘에서 별을 떨어뜨려요' },
];
PETS.sort((a, b) => b.r - a.r); // best first: 전설 → 영웅 → 희귀 → 일반
const PET = Object.fromEntries(PETS.map(p => [p.id, p]));
const petMaxLv = st => 20 + st.stars * 10;
const petLvCost = lv => Math.floor(250 * Math.pow(lv, 1.4));

// ---------- relics ----------
const RELICS = [
  { id: 'sheath', name: '고대 검집', icon: '🗡️', key: 'atkPct', per: 0.02, r: 0 },
  { id: 'grail', name: '생명의 성배', icon: '🏆', key: 'hpPct', per: 0.02, r: 0 },
  { id: 'whetstone', name: '날카로운 숫돌', icon: '🪨', key: 'critDmg', per: 0.03, r: 0 },
  { id: 'feather', name: '바람의 깃털', icon: '🪶', key: 'spd', per: 0.006, r: 0 },
  { id: 'coin', name: '황금 동전', icon: '🪙', key: 'goldGain', per: 0.04, r: 0 },
  { id: 'scroll', name: '지혜의 두루마리', icon: '📜', key: 'exp', per: 0.03, r: 1 },
  { id: 'lens', name: '매의 눈', icon: '🔍', key: 'crit', per: 0.006, r: 1 },
  { id: 'hourglass', name: '시간의 모래', icon: '⏳', key: 'aspd', per: 0.01, r: 1 },
  { id: 'shield', name: '수호의 방패', icon: '🛡️', key: 'def', per: 3, r: 2 },
  { id: 'orb', name: '마나 오브', icon: '🔮', key: 'skillDmg', per: 0.03, r: 2 },
  { id: 'heart', name: '불사조의 심장', icon: '❤️‍🔥', key: 'regen', per: 0.3, r: 3 },
  { id: 'crown', name: '왕의 왕관', icon: '👑', key: 'atkPct', per: 0.05, r: 3 },
];
const RELIC_W = [60, 28, 10, 2];
const RELIC_MAX = 50;
const relicCost = lv => Math.floor(300 * Math.pow(lv, 1.5));

// ---------- VIP (grows with the money "saved" in the ₩0 shop) ----------
const VIP_TIERS = [0, 10000, 50000, 150000, 300000, 600000, 1000000, 2000000, 5000000, 10000000, 30000000];
function vipLevel(spent) { let v = 0; while (v + 1 < VIP_TIERS.length && spent >= VIP_TIERS[v + 1]) v++; return v; }

// ---------- character level ----------
const cexpNeed = lv => Math.floor(100 * Math.pow(lv, 1.35));

// ---------- open world ----------
// Sections are square regions laid out in a snake path, 4 per row:
//  0 1 2 3
//  7 6 5 4
//  8 9 ...
// Killing a section's leader boss opens the next section.
const SEC = 1800, WORLD_COLS = 4;
const secCell = i => { const row = Math.floor(i / WORLD_COLS), k = i % WORLD_COLS; return { col: row % 2 ? WORLD_COLS - 1 - k : k, row }; };
const secCenter = i => { const c = secCell(i); return { x: (c.col + 0.5) * SEC, y: (c.row + 0.5) * SEC }; };
function secAt(x, y) {
  const col = Math.floor(x / SEC), row = Math.floor(y / SEC);
  if (col < 0 || col >= WORLD_COLS || row < 0) return -1;
  return row * WORLD_COLS + (row % 2 ? WORLD_COLS - 1 - col : col);
}
const secBiome = i => STAGES[i % STAGES.length];
const secName = i => (i >= STAGES.length ? `지옥${Math.floor(i / STAGES.length)} ` : '') + secBiome(i).name;
const FB_NAMES = ['수호자', '파수꾼', '사냥꾼'];
const FB_RESPAWN = 90, LEADER_RESPAWN = 180;
const bits3 = n => (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);
function fbSpots(i) {
  const c = secCenter(i), r0 = ((i * 2654435761) % 1000) / 1000 * Math.PI * 2;
  return [0, 1, 2].map(k => ({ x: c.x + Math.cos(r0 + k * Math.PI * 2 / 3) * 580, y: c.y + Math.sin(r0 + k * Math.PI * 2 / 3) * 580 }));
}
function lairSpot(i) {
  const c = secCenter(i), r0 = ((i * 2654435761) % 1000) / 1000 * Math.PI * 2 + Math.PI / 3;
  return { x: c.x + Math.cos(r0) * 400, y: c.y + Math.sin(r0) * 400 };
}

// ---------- permanent skills (used in open world instead of level-up cards) ----------
const SKILL_UNLOCK = 500, SKILL_EVO_COST = 3000, MAX_SKILL_SLOTS = 3;
const skillLvCost = lv => Math.floor(1500 * lv * lv);
