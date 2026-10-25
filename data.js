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
];
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
const PETS = [
  { id: 'slime', name: '말랑 슬라임', r: 0, desc: '끈적한 점액탄을 뱉습니다' },
  { id: 'cat', name: '고양이 기사', r: 0, desc: '근처 적을 할퀴며 싸웁니다' },
  { id: 'fairy', name: '치유 요정', r: 1, desc: '주기적으로 체력을 회복시켜 줍니다' },
  { id: 'ghost', name: '꼬마 유령', r: 1, desc: '관통하는 유령탄을 쏩니다' },
  { id: 'eagle', name: '폭풍 독수리', r: 2, desc: '적에게 급강하해 큰 피해' },
  { id: 'dragon', name: '아기 용', r: 3, desc: '폭발하는 화염구를 뿜습니다' },
];
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

// ---------- character level ----------
const cexpNeed = lv => Math.floor(100 * Math.pow(lv, 1.35));
