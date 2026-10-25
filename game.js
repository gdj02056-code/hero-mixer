'use strict';
// ============================================================
//  HERO MIXER — save, stats and battle
// ============================================================

// ---------- utils ----------
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const fmt = n => { n = Math.floor(n); return n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e7 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e5 ? Math.floor(n / 1e3) + 'K' : n.toLocaleString(); };
const fmtTime = s => { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash2(i, j) { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function weighted(w) { let x = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) if ((x -= w[i]) < 0) return i; return 0; }
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };

// ---------- save ----------
const SAVE_KEY = 'heromixer_save_v2';
const defaultSave = () => ({
  gold: 3000, gems: 1000, energy: MAX_EN, energyAt: Date.now(), cleared: 0, best: {},
  stats: {}, items: [{ id: 1, slot: 'weapon', wt: 'sword', g: 0, lv: 1 }], equip: { weapon: 1 }, nextId: 2,
  heroes: { knight: { lv: 1, stars: 0, shards: 0 } }, hero: 'knight', pets: {}, pet: null, relics: {},
  clv: 1, cexp: 0, noAds: false, pass: false, starter: false, spent: 0,
  skills: { knife: { lv: 1, evo: false } }, skillSlots: ['knife'], world: { cleared: 0, fb: {} },
});
let S;
function loadSave() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
  S = Object.assign(defaultSave(), raw || {});
  S.world = Object.assign({ cleared: 0, fb: {} }, S.world);
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }
function tickEnergy() {
  if (S.energy >= MAX_EN) { S.energyAt = Date.now(); return; }
  const n = Math.floor((Date.now() - S.energyAt) / EN_REGEN_MS);
  if (n > 0) { S.energy = Math.min(MAX_EN, S.energy + n); S.energyAt += n * EN_REGEN_MS; }
}

// ---------- items ----------
const getItem = id => S.items.find(i => i.id === id);
const itemVal = it => SLOT[it.slot].base * GRADES[it.g].mult * (1 + 0.08 * (it.lv - 1));
const itemMaxLv = it => 10 + it.g * 5;
const gradeName = g => g >= 8 ? GRADES[g].n : GRADES[g].n + '급';
const itemName = it => `${gradeName(it.g)} ${it.slot === 'weapon' ? WT[it.wt].name : SLOT[it.slot].name}`;
const itemUpCost = it => Math.floor(120 * it.lv * (1 + it.g * 0.5));
const itemSell = it => Math.floor(40 * Math.pow(2.2, it.g));
const isEquipped = it => S.equip[it.slot] === it.id;
function fmtStat(slot, v) { return fmtBonus(SLOT[slot].key, v); }
function newItem(g, slot) {
  slot = slot || (Math.random() < 0.3 ? 'weapon' : pick(SLOTS.slice(1)).id);
  const it = { id: S.nextId++, slot, g, lv: 1 };
  if (slot === 'weapon') it.wt = pick(WT_IDS);
  S.items.push(it);
  return it;
}
function rollGrade(luck = 0) {
  const w = GACHA_W.slice();
  for (let i = 3; i < 8; i++) w[i] *= 1 + luck * 0.15;
  return weighted(w);
}
// merge 3 items of the same slot and grade into one of the next grade; `keep` survives
function mergeInto(keep) {
  const mats = S.items.filter(i => i !== keep && i.slot === keep.slot && i.g === keep.g && !isEquipped(i)).sort((a, b) => a.lv - b.lv).slice(0, 2);
  if (mats.length < 2 || keep.g >= MAX_GRADE) return null;
  S.items = S.items.filter(i => !mats.includes(i));
  const from = keep.g;
  keep.g++;
  keep.lv = Math.min(itemMaxLv(keep), Math.max(keep.lv, ...mats.map(m => m.lv)));
  return { it: keep, from, mats };
}
function mergeAll() {
  const out = [];
  let again = true;
  while (again) {
    again = false;
    for (const s of SLOTS) for (let g = 0; g < MAX_GRADE; g++) {
      let grp = S.items.filter(i => i.slot === s.id && i.g === g).sort((a, b) => (isEquipped(b) - isEquipped(a)) || b.lv - a.lv);
      while (grp.length >= 3) {
        const r = mergeInto(grp[0]);
        if (!r) break;
        out.push(r); again = true;
        grp = grp.filter(i => i !== grp[0] && !r.mats.includes(i));
      }
    }
  }
  return out;
}
function autoEquip() {
  for (const s of SLOTS) {
    const best = S.items.filter(i => i.slot === s.id).sort((a, b) => itemVal(b) - itemVal(a))[0];
    if (best) S.equip[s.id] = best.id;
  }
}

// ---------- heroes / pets / relics ----------
const heroState = id => S.heroes[id];
function addHero(id) {
  const st = S.heroes[id];
  if (st) { st.shards++; return false; }
  S.heroes[id] = { lv: 1, stars: 0, shards: 0 };
  return true;
}
function addPet(id) {
  const st = S.pets[id];
  if (st) { st.shards++; return false; }
  S.pets[id] = { lv: 1, stars: 0, shards: 0 };
  if (!S.pet) S.pet = id;
  return true;
}
function addRelic(id) { S.relics[id] = Math.min(RELIC_MAX, (S.relics[id] || 0) + 1); }
const rollFrom = (list, w) => { const r = weighted(w); const pool = list.filter(x => x.r === r); return pick(pool.length ? pool : list); };

function addCexp(v) {
  S.cexp += v; let ups = 0;
  while (S.cexp >= cexpNeed(S.clv)) { S.cexp -= cexpNeed(S.clv); S.clv++; ups++; }
  return ups;
}

function metaStats() {
  const m = { atk: 10, hp: 100, def: 0, crit: 0.05, critDmg: 1.5, aspd: 0, spd: 0, regen: 0, magnet: 0, exp: 0, goldGain: 0, skillDmg: 0, atkPct: 0, hpPct: 0, dr: 0 };
  for (const s of STATS) m[s.id] += (S.stats[s.id] || 0) * s.per;
  m.atk += (S.clv - 1) * 3; m.hp += (S.clv - 1) * 25;
  for (const s of SLOTS) { const it = getItem(S.equip[s.id]); if (it) m[s.key] += itemVal(it); }
  const h = HERO[S.hero], hs = S.heroes[S.hero];
  if (h && hs) {
    const k = heroPower(h, hs), flat = heroFlat(h, hs);
    for (const key in h.bonus) m[key] += h.bonus[key] * k;
    m.atk += flat.atk; m.hp += flat.hp;
  }
  for (const r of RELICS) m[r.key] += relicVal(r, S.relics[r.id] || 0);
  const wItem = getItem(S.equip.weapon);
  if (wItem) m.aspd += weaponGradeBonus(wItem.g).aspd;
  const vip = vipLevel(S.spent);
  m.goldGain += vip * 0.05 + (S.goldBoost ? 1 : 0); m.exp += vip * 0.03;
  m.spd = Math.min(m.spd, 1.2); m.crit = Math.min(m.crit, 1);
  m.atkTotal = m.atk * (1 + m.atkPct);
  m.hpTotal = m.hp * (1 + m.hpPct);
  m.drTotal = Math.min(0.75, m.def / (m.def + 200) + m.dr);
  const w = getItem(S.equip.weapon);
  m.wt = w ? w.wt : null; m.wg = w ? w.g : 0;
  m.power = Math.floor(m.atkTotal * 10 * (1 + m.crit * (m.critDmg - 1)) * (1 + m.aspd) + m.hpTotal * 2 + m.def * 5 + m.regen * 40);
  return m;
}
function petDmg(m, id) {
  const st = S.pets[id];
  return m.atkTotal * (0.35 + 0.06 * st.lv) * PRAR[PET[id].r].m * (1 + 0.2 * st.stars);
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
  ZOOM = clamp(Math.min(VW, VH) / 470, 0.78, 1.5);
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

function startRun(stage, world = false) {
  preloadBattleArt(); // hero, pet or weapon may have changed since the lobby opened
  const m = metaStats();
  const p = {
    x: 0, y: 0, r: 16, maxBase: m.hpTotal, maxHp: m.hpTotal, hp: m.hpTotal, atk: m.atkTotal, crit: m.crit, critDmg: m.critDmg,
    aspd: m.aspd, baseDr: m.drTotal, regen: m.regen, spdBase: 190 * (1 + m.spd), magBase: 70 * (1 + m.magnet),
    expMul: 1 + m.exp, goldMul: 1 + m.goldGain, skillMul: 1 + m.skillDmg,
    wt: m.wt, grade: m.wg, mlv: 1, mt: 0.3, anim: 0, animMax: 0.3, aim: 0, look: HERO[S.hero].look,
    lv: 1, xp: 0, xpNext: xpFor(1), inv: 0, fx: 1, fy: 0, face: 1, weapons: [], passives: [], walk: 0,
  };
  G = {
    state: 'play', stage, time: 0, kills: 0, gold: 0, p,
    enemies: [], proj: [], ebul: [], gems: [], items: [], fx: [], texts: [], later: [],
    spawnT: 0, eliteNext: 60, waves: [45, 105, 150], bossSpawned: false, boss: null, nextEid: 1,
    pendingLv: 0, shake: 0, banner: null, winT: -1, revives: 0, hazards: [],
    pet: S.pet && S.pets[S.pet] ? { id: S.pet, x: -30, y: -20, t: 0, cd: 1, healT: 5, mode: 'follow', face: 1, dmg: petDmg(m, S.pet) } : null,
  };
  pStat();
  joy.active = false;
  $('#lobby').classList.add('hidden');
  $('#hudBtns').classList.remove('hidden');
  if (!world) showBanner(`STAGE ${stage} · ${STAGES[(stage - 1) % STAGES.length].name}`);
}
function backToLobby() { closeModal(); G = null; $('#hudBtns').classList.add('hidden'); $('#lobby').classList.remove('hidden'); renderLobby(); }

// ---------- open world ----------
const accessible = s => s >= 0 && s <= S.world.cleared;
const fbDone = s => (S.world.fb[s] || 0) === 7;
const worldMainLv = () => clamp(1 + Math.floor(S.clv / 8), 1, MAX_WLV);
function startWorld(sec) {
  startRun(sec + 1, true);
  const c = secCenter(sec), l = lairSpot(sec), p = G.p;
  p.x = c.x - (l.x - c.x) * 0.8; p.y = c.y - (l.y - c.y) * 0.8;
  p.weapons = S.skillSlots.filter(id => S.skills[id]).map(id => ({ id, lv: S.skills[id].lv, evo: S.skills[id].evo, t: 0, ang: 0, spin: 0 }));
  p.mlv = worldMainLv();
  G.world = { fb: {}, leader: {}, saveT: 10, lastSec: -1, loot: { gold: 0, gems: 0, cexp: 0, items: [], ups: 0 } };
  if (G.pet) { G.pet.x = p.x - 30; G.pet.y = p.y; }
  pStat();
}
// re-read permanent stats mid-run (after a character level up)
function refreshMeta() {
  const m = metaStats(), p = G.p, ratio = p.hp / p.maxHp;
  Object.assign(p, { maxBase: m.hpTotal, atk: m.atkTotal, crit: m.crit, critDmg: m.critDmg, aspd: m.aspd, baseDr: m.drTotal, regen: m.regen, spdBase: 190 * (1 + m.spd), magBase: 70 * (1 + m.magnet), expMul: 1 + m.exp, goldMul: 1 + m.goldGain, skillMul: 1 + m.skillDmg });
  pStat();
  p.hp = p.maxHp * ratio;
  if (G.pet) G.pet.dmg = petDmg(m, G.pet.id);
}
function worldSpawnPos() {
  const R = Math.hypot(VW, VH) / 2 / ZOOM + 60;
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * TAU, x = G.p.x + Math.cos(a) * R, y = G.p.y + Math.sin(a) * R;
    if (accessible(secAt(x, y))) return [x, y];
  }
  return null;
}
function chooseWorldType(s) {
  const r = Math.random();
  if (s === 0) return r < 0.7 ? 'slime' : 'bat';
  if (s === 1) return r < 0.4 ? 'slime' : r < 0.7 ? 'bat' : 'archer';
  return r < 0.25 ? 'slime' : r < 0.5 ? 'bat' : r < 0.75 ? 'archer' : 'golem';
}
function spawnFieldBoss(s, k, pt) {
  const e = spawnEnemy('elite', pt.x, pt.y, s + 1);
  e.hp = e.maxHp = e.hp * 4; e.r = 34; e.spd *= 0.85;
  e.fb = { s, k }; e.home = pt;
  e.name = `${secBiome(s).name.split(' ').pop()}의 ${FB_NAMES[k]}`;
  e.color = ['#dc2626', '#ea580c', '#be185d'][k];
  return e;
}
function spawnLeader(s, l) {
  const e = spawnEnemy('boss', l.x, l.y, s + 1);
  e.leader = s; e.home = l;
  e.name = (s >= BOSSES.length ? '지옥의 ' : '') + BOSSES[s % BOSSES.length];
  G.boss = e;
  showBanner('👑 대장 보스 등장: ' + e.name, '#fcd34d'); addShake(10);
  return e;
}
function updateWorld(dt) {
  const W = G.world, p = G.p, cur = secAt(p.x, p.y);
  if (cur !== W.lastSec && cur >= 0) { W.lastSec = cur; showBanner(`🗺️ ${cur + 1}. ${secName(cur)}${cur < S.world.cleared ? ' ✅' : ''}`, '#fde68a'); }
  for (const s of [cur - 1, cur, cur + 1]) {
    if (!accessible(s)) continue;
    fbSpots(s).forEach((pt, k) => {
      const st = W.fb[s + ':' + k] || (W.fb[s + ':' + k] = { e: null, at: 0 });
      if (!st.e && G.time >= st.at && Math.hypot(pt.x - p.x, pt.y - p.y) < 900) st.e = spawnFieldBoss(s, k, pt);
    });
    const l = lairSpot(s), ls = W.leader[s] || (W.leader[s] = { e: null, at: 0 });
    if (!ls.e && G.time >= ls.at && fbDone(s) && Math.hypot(l.x - p.x, l.y - p.y) < 320) ls.e = spawnLeader(s, l);
  }
  const target = Math.min(130, 30 + Math.max(0, cur) * 5);
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = 0.15;
    const n = Math.min(4, target - G.enemies.length);
    for (let i = 0; i < n; i++) { const pos = worldSpawnPos(); if (pos) spawnEnemy(chooseWorldType(secAt(pos[0], pos[1])), pos[0], pos[1]); }
  }
  W.saveT -= dt;
  if (W.saveT <= 0) { W.saveT = 10; save(); }
}
function worldLoot(gold, gems, items) {
  const L = G.world.loot;
  for (let i = 0; i < 8; i++) G.items.push({ type: 'gold', x: G.p.x + rand(-60, 60), y: G.p.y + rand(-60, 60), v: gold / 8 });
  S.gems += gems; L.gems += gems;
  for (const g of items) L.items.push(newItem(g));
}
function fieldBossDown(e) {
  const { s, k } = e.fb, W = G.world;
  W.fb[s + ':' + k] = { e: null, at: G.time + FB_RESPAWN };
  const was = fbDone(s);
  S.world.fb[s] = (S.world.fb[s] || 0) | (1 << k);
  worldLoot(50 * (s + 1), 20 + s * 5, [rollGrade(s + 1)]);
  G.fx.push({ type: 'boom', x: e.x, y: e.y, r: 90, t: 0, life: 0.45 });
  if (!was && fbDone(s)) showBanner('👑 대장 보스의 봉인이 풀렸습니다!', '#fca5a5');
  else showBanner(`⚔️ ${e.name} 처치! (${bits3(S.world.fb[s])}/3)`, '#fdba74');
  save();
}
function leaderDown(e) {
  const s = e.leader;
  G.world.leader[s] = { e: null, at: G.time + LEADER_RESPAWN };
  G.boss = null; G.hazards = [];
  worldLoot(300 * (s + 1), 100 + s * 30, [rollGrade(s + 3), rollGrade(s + 3), rollGrade(s + 3)]);
  addShake(14);
  for (const o of G.enemies) if (!o.dead && !o.home && Math.hypot(o.x - e.x, o.y - e.y) < 600) { o.dead = true; dropGem(o.x, o.y, o.xp); }
  if (s === S.world.cleared) { S.world.cleared++; showBanner(`🎉 새 지역 개방: ${secName(S.world.cleared)}`, '#fde047'); }
  else showBanner('🏆 대장 보스 처치!', '#fde047');
  save();
}
function worldObjective() {
  const p = G.p, s = secAt(p.x, p.y);
  if (s < 0) return null;
  if (!fbDone(s)) {
    let best = null, bd = Infinity;
    fbSpots(s).forEach((pt, k) => { if ((S.world.fb[s] >> k) & 1) return; const d = (pt.x - p.x) ** 2 + (pt.y - p.y) ** 2; if (d < bd) { bd = d; best = { x: pt.x, y: pt.y, icon: '💀' }; } });
    return best;
  }
  if (s === S.world.cleared) { const l = lairSpot(s); return { x: l.x, y: l.y, icon: '👑' }; }
  return null;
}
function endWorld() {
  if (G.state === 'over') return;
  G.state = 'over'; joy.active = false; save();
  const L = G.world.loot, sec = Math.max(0, secAt(G.p.x, G.p.y));
  const box = showModal(`<div class="bigicon">🏕️</div><h2>마을로 귀환</h2>
    <div class="center">💀 ${G.kills} 처치 · ⏱ ${fmtTime(G.time)} · 🗺️ 정복 ${S.world.cleared}지역</div>
    <div class="reward"><span>🪙 ${fmt(L.gold)}</span><span>💎 ${fmt(L.gems)}</span><span>📘 ${fmt(L.cexp)}</span></div>
    ${L.ups ? `<div class="center lvup">🎉 캐릭터 레벨 +${L.ups} → Lv.${S.clv}</div>` : ''}
    ${L.items.length ? `<div class="ggrid">${L.items.slice(0, 20).map(it => itemTile(it)).join('')}</div>` : '<div class="center sub">장비는 필드 보스와 대장 보스가 떨어뜨려요</div>'}
    <div class="row"><button class="btn green" id="home">로비로</button><button class="btn gold" id="again">다시 출발 ▶</button></div>`);
  box.querySelector('#home').onclick = backToLobby;
  box.querySelector('#again').onclick = () => { backToLobby(); startWorld(Math.min(sec, S.world.cleared)); };
}
function addWeapon(id) { G.p.weapons.push({ id, lv: 1, evo: false, t: 0, ang: 0, spin: 0 }); }
function pLv(id) { const q = G.p.passives.find(x => x.id === id); return q ? q.lv : 0; }
function pStat() {
  const p = G.p;
  p.mainMul = 1 + pLv('glove') * 0.12;
  p.dmgMul = (p.atk / 10) * p.mainMul * p.skillMul;
  p.cdMul = 1 - pLv('clock') * 0.08;
  p.atkCd = (1 - pLv('clock') * 0.04) / (1 + p.aspd);
  p.areaMul = 1 + pLv('book') * 0.12;
  p.dr = Math.min(0.85, p.baseDr + pLv('armor') * 0.07);
  p.spd = p.spdBase * (1 + pLv('boots') * 0.08);
  p.mag = p.magBase * (1 + pLv('magnet') * 0.3);
  const nm = p.maxBase * (1 + pLv('armor') * 0.1);
  p.hp += nm - p.maxHp; p.maxHp = nm;
}
function showBanner(text, color = '#fff') { G.banner = { text, color, t: 2.4 }; }
function addShake(v) { G.shake = Math.max(G.shake, v); }
const curWT = () => G.p.wt ? WT[G.p.wt] : FIST;

// ---------- skill stats ----------
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
function mainStats(L = G.p.mlv) {
  const p = G.p, W = curWT(), gb = weaponGradeBonus(p.wt ? p.grade : 0);
  return { dmg: p.atk * W.coef * (1 + 0.3 * (L - 1)) * p.mainMul, cd: W.cd * p.atkCd, extra: Math.floor((L - 1) / 2) + gb.extra, size: (1 + 0.1 * (L - 1)) * (1 + gb.size) };
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
function nearestEnemy(x, y, maxR, skip) {
  let best = null, bd = maxR * maxR;
  for (const e of G.enemies) { if (e.dead || (skip && skip.has(e.id))) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function onScreen(e) { const hw = VW / 2 / ZOOM + 20, hh = VH / 2 / ZOOM + 20; return Math.abs(e.x - G.p.x) < hw && Math.abs(e.y - G.p.y) < hh; }

// ---------- enemies ----------
function spawnRingPos() { const a = Math.random() * TAU, R = Math.hypot(VW, VH) / 2 / ZOOM + 60; return [G.p.x + Math.cos(a) * R, G.p.y + Math.sin(a) * R]; }
function spawnEnemy(type, x, y, lvl) {
  const T = ETYPES[type], s = lvl || (G.world ? Math.max(0, secAt(x, y)) + 1 : G.stage);
  const hpMul = (1 + (s - 1) * 0.75) * (G.world ? 1.3 : 1 + G.time / 60 * 0.55);
  const e = {
    id: G.nextEid++, type, x, y, lvl: s, r: T.r, hp: T.hp * hpMul, spd: T.spd * rand(0.9, 1.1), dmg: T.dmg * (1 + (s - 1) * 0.3), xp: T.xp,
    color: T.color, flash: 0, kx: 0, ky: 0, slowUntil: 0, stunUntil: 0, ocd: 0, shootT: rand(1, 3), elite: !!T.elite, boss: !!T.boss, ranged: !!T.ranged, wob: Math.random() * TAU,
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
function shootAt(e, a, spd, dmg, extra) { G.ebul.push(Object.assign({ x: e.x, y: e.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, dmg, life: 5 }, extra)); }
function updateEnemies(dt) {
  const p = G.p;
  buildGrid();
  const farR = Math.hypot(VW, VH) / 2 / ZOOM + 450;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 0.01;
    let spd = e.spd * (e.slowUntil > G.time ? 0.5 : 1), dir = 1;
    if (e.stunUntil > G.time && !e.boss) spd = 0;
    if (e.boss) {
      spd = bossUpdate(e, dt, dx, dy, spd);
    } else if (e.ranged) {
      if (d < 200) dir = -0.6; else if (d < 320) dir = 0;
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 480 && spd > 0) { e.shootT = 2.6; e.recoilT = 0.2; shootAt(e, Math.atan2(dy, dx), 210, e.dmg); }
    }
    let mx = dx / d * dir, my = dy / d * dir;
    // field/leader bosses don't chase you out of their territory; they walk home and heal
    if (e.home && Math.hypot(e.home.x - p.x, e.home.y - p.y) > 700) {
      const hx = e.home.x - e.x, hy = e.home.y - e.y, hd = Math.hypot(hx, hy);
      if (hd > 15) { mx = hx / hd; my = hy / hd; } else { mx = my = 0; e.hp = e.maxHp; }
      if (e.boss) { e.dashT = 0; e.windT = 0; e.phaseT = 2; }
    }
    e.x += (mx * spd + e.kx) * dt;
    e.y += (my * spd + e.ky) * dt;
    const decay = Math.max(0, 1 - dt * 9); e.kx *= decay; e.ky *= decay;
    if (e.flash > 0) e.flash -= dt;
    // attack animation timers — visual only, damage still comes from touching / shooting as before
    e.pd = d;
    for (const k of ['atkT', 'atkCd', 'hitT', 'recoilT', 'castT']) if (e[k] > 0) e[k] -= dt;
    if (!e.ranged && !e.boss && !(e.atkCd > 0) && d < e.r + p.r + 30) {
      e.atkDur = e.atkT = e.elite ? 0.6 : e.type === 'golem' ? 0.55 : 0.4;
      e.atkCd = e.atkDur + 0.45; e.slammed = false;
    }
    if (e.type === 'golem' && e.atkT > 0 && !e.slammed && 1 - e.atkT / e.atkDur > 0.55) {
      e.slammed = true;
      G.fx.push({ type: 'pop', x: e.x + (dx / d) * e.r, y: e.y + e.r * 0.6, r: e.r * 0.7, t: 0, life: 0.3, color: '#d6d3d1' });
    }
    if (!e.boss) {
      forNear(e.x, e.y, e.r, o => {
        if (o === e) return;
        const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy) || 0.01, ov = e.r + o.r - od;
        if (ov > 0) { const f = o.boss ? 0.6 : 0.25; e.x += ox / od * ov * f; e.y += oy / od * ov * f; }
      });
      if (d > farR && !e.home) {
        const pos = G.world ? worldSpawnPos() : spawnRingPos();
        if (pos) { e.x = pos[0]; e.y = pos[1]; } else e.dead = true;
      }
    }
    if (d < e.r + p.r - 3 && !e.airborne) hurtPlayer(e.dmg);
  }
}
function hitEnemy(e, dmg, kx = 0, ky = 0) {
  if (e.dead) return;
  const crit = Math.random() < G.p.crit;
  if (crit) dmg *= G.p.critDmg;
  e.hp -= dmg; e.flash = 0.08; e.hitT = 0.12;
  const kb = e.boss ? 0.03 : e.elite ? 0.3 : 1;
  e.kx += kx * kb; e.ky += ky * kb;
  if (crit || G.texts.length < 70) G.texts.push({ x: e.x + rand(-8, 8), y: e.y - e.r, txt: fmt(dmg), color: crit ? '#fde047' : '#fff', big: crit, t: 0 });
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; G.kills++;
  dropGem(e.x, e.y, e.xp);
  G.fx.push({ type: 'pop', x: e.x, y: e.y, r: e.r, t: 0, life: 0.3, color: e.color });
  if (e.leader !== undefined) { leaderDown(e); return; }
  if (e.fb) { fieldBossDown(e); return; }
  if (e.boss) {
    G.boss = null; G.winT = 2; G.hazards = [];
    for (let i = 0; i < 25; i++) G.items.push({ type: 'gold', x: e.x + rand(-90, 90), y: e.y + rand(-90, 90), v: 10 * G.stage });
    showBanner('🏆 보스 처치!', '#fde047'); addShake(14);
    for (const o of G.enemies) if (!o.dead) { o.dead = true; dropGem(o.x, o.y, o.xp); }
    return;
  }
  if (e.elite) { G.items.push({ type: 'chest', x: e.x, y: e.y }); return; }
  const r = Math.random();
  if (r < (G.world ? 0.06 : 0.025)) G.items.push({ type: 'gold', x: e.x, y: e.y, v: G.world ? 2 + e.lvl * 2 : 1 + Math.floor(G.stage / 2) });
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
  if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(25);
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
  if (mag > 0) {
    const slow = p.slowUntil > G.time ? 0.55 : 1;
    let nx = p.x + mx * p.spd * slow * mag * dt, ny = p.y + my * p.spd * slow * mag * dt;
    if (G.world) { if (!accessible(secAt(nx, p.y))) nx = p.x; if (!accessible(secAt(nx, ny))) ny = p.y; }
    p.x = nx; p.y = ny; p.fx = mx; p.fy = my; p.walk += dt * 12 * mag;
    if (p.anim <= 0) { p.aim = Math.atan2(my, mx); if (Math.abs(mx) > 0.2) p.face = Math.sign(mx); }
  }
  if (p.inv > 0) p.inv -= dt;
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
}
function gainXp(v) {
  const p = G.p;
  if (G.world) {
    // no level-up cards in the open world: XP goes straight to the character level
    const amt = v * p.expMul * 2 * (1 + Math.max(0, secAt(p.x, p.y)) * 0.3), ups = addCexp(amt);
    G.world.loot.cexp += amt;
    if (ups) { G.world.loot.ups += ups; refreshMeta(); p.mlv = worldMainLv(); showBanner(`🎉 캐릭터 레벨 업! Lv.${S.clv}`, '#fde047'); G.fx.push({ type: 'heal', x: p.x, y: p.y, t: 0, life: 0.6 }); }
    return;
  }
  p.xp += v * p.expMul;
  while (p.xp >= p.xpNext) { p.xp -= p.xpNext; p.lv++; p.xpNext = xpFor(p.lv); G.pendingLv++; }
}

// ---------- main weapon (from equipped weapon type) ----------
function meleeArc(a, R, arc, dmg) {
  const p = G.p;
  forNear(p.x, p.y, R, e => {
    const ea = Math.atan2(e.y - p.y, e.x - p.x);
    if (Math.abs(angDiff(ea, a)) <= arc / 2 + 0.25) hitEnemy(e, dmg, Math.cos(ea) * 230, Math.sin(ea) * 230);
  });
}
function lineHit(x, y, a, len, w, dmg) {
  const ca = Math.cos(a), sa = Math.sin(a);
  forNear(x + ca * len / 2, y + sa * len / 2, len / 2 + w, e => {
    const dx = e.x - x, dy = e.y - y, t = dx * ca + dy * sa;
    if (t < -e.r || t > len + e.r) return;
    if (Math.abs(-dx * sa + dy * ca) < w + e.r) hitEnemy(e, dmg, ca * 250, sa * 250);
  });
}
function shoot(k, a, spd, extra) { const p = G.p; G.proj.push(Object.assign({ k, x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, hit: new Set(), life: 1.2, r: 6, pierce: 1, spin: 0 }, extra)); }
function fan(n, spread) { const out = []; for (let i = 0; i < n; i++) out.push((i - (n - 1) / 2) * spread); return out; }
function updateMain(dt) {
  const p = G.p, W = curWT(), st = mainStats(), col = GRADES[p.grade].c;
  if (p.anim > 0) p.anim = Math.max(0, p.anim - dt);
  p.mt -= dt;
  if (p.mt > 0) return;
  const tgt = nearestEnemy(p.x, p.y, W.reach);
  if (!tgt) return;
  const a = Math.atan2(tgt.y - p.y, tgt.x - p.x), dist = Math.hypot(tgt.x - p.x, tgt.y - p.y);
  p.aim = a; p.face = Math.cos(a) >= 0 ? 1 : -1;
  p.animMax = p.anim = Math.min(W.kind === 'slam' ? 0.4 : 0.28, st.cd * 0.85);
  switch (W.kind) {
    case 'slash': {
      const R = W.range * st.size;
      for (const off of st.extra >= 1 ? [0, Math.PI] : [0]) {
        meleeArc(a + off, R, W.arc, st.dmg);
        G.fx.push({ type: 'slash', x: p.x, y: p.y, a: a + off, r: R, arc: W.arc, color: col, t: 0, life: 0.22 });
      }
      break;
    }
    case 'spin': {
      const R = W.range * st.size * (1 + 0.15 * st.extra);
      forNear(p.x, p.y, R, e => { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; hitEnemy(e, st.dmg, (e.x - p.x) / d * 220, (e.y - p.y) / d * 220); });
      G.fx.push({ type: 'spin', x: p.x, y: p.y, a, r: R, color: col, t: 0, life: 0.3 });
      break;
    }
    case 'thrust': {
      const len = W.range * st.size, offs = st.extra >= 1 ? [0, -0.35, 0.35] : [0];
      for (const o of offs) { lineHit(p.x, p.y, a + o, len, 15 * st.size, st.dmg); G.fx.push({ type: 'thrust', x: p.x, y: p.y, a: a + o, len, color: col, t: 0, life: 0.22 }); }
      break;
    }
    case 'slam': {
      const d = Math.min(dist, W.range * 0.7), cx = p.x + Math.cos(a) * d, cy = p.y + Math.sin(a) * d, R = W.aoe * st.size * (1 + 0.25 * st.extra);
      G.later.push({ t: 0.16, fn: () => {
        forNear(cx, cy, R, e => { const dd = Math.hypot(e.x - cx, e.y - cy) || 1; hitEnemy(e, st.dmg, (e.x - cx) / dd * 280, (e.y - cy) / dd * 280); e.stunUntil = G.time + 0.8; });
        G.fx.push({ type: 'shock', x: cx, y: cy, r: R, color: col, seed: Math.random() * 100, t: 0, life: 0.45 });
        addShake(5);
      } });
      break;
    }
    case 'throw': for (const o of fan(1 + st.extra, 0.13)) shoot('dagger', a + o, W.spd, { dmg: st.dmg, r: 7 * st.size, pierce: 1, life: 0.9 }); break;
    case 'arrow': for (const o of fan(1 + st.extra, 0.1)) shoot('arrow', a + o, W.spd, { dmg: st.dmg, r: 7 * st.size, pierce: 2, life: 1 }); break;
    case 'bolt': for (const o of fan(1 + st.extra, 0.08)) shoot('bolt', a + o, W.spd, { dmg: st.dmg, r: 8 * st.size, pierce: 999, life: 1.1 }); break;
    case 'bullet':
      for (const o of fan(1 + st.extra, 0.07)) shoot('bullet', a + o, W.spd, { dmg: st.dmg, r: 5 * st.size, pierce: 1, life: 0.8 });
      G.fx.push({ type: 'muzzle', x: p.x + Math.cos(a) * 26, y: p.y + Math.sin(a) * 26, a, t: 0, life: 0.09 });
      break;
    case 'orbs': for (const o of fan(3 + st.extra, 0.7)) shoot('orb', a + o, W.spd, { dmg: st.dmg, r: 8 * st.size, pierce: 1, life: 2.6 }); break;
    case 'bounce': shoot('wbolt', a, W.spd, { dmg: st.dmg, r: 7 * st.size, bounces: 3 + st.extra, life: 2 }); break;
    case 'fireball': for (const o of fan(1 + st.extra, 0.2)) shoot('fireball', a + o, W.spd, { dmg: st.dmg, r: 9 * st.size, boom: W.aoe * st.size, life: 1.4 }); break;
    case 'axe':
      for (let i = 0; i <= st.extra; i++) {
        const tx = tgt.x + (i ? rand(-70, 70) : 0), ty = tgt.y + (i ? rand(-70, 70) : 0), aa = Math.atan2(ty - p.y, tx - p.x);
        shoot('axe', aa, W.spd, { dmg: st.dmg, r: 18 * st.size, tx, ty, hitT: new Map(), spinLeft: 0.6, life: 3 });
      }
      break;
  }
  p.mt = st.cd;
}

// ---------- skills ----------
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
          const e = pick(vis);
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
function explode(x, y, R, dmg, fire) {
  G.fx.push({ type: 'boom', x, y, r: R, t: 0, life: 0.35, fire });
  forNear(x, y, R, e => { const d = Math.hypot(e.x - x, e.y - y) || 1; hitEnemy(e, dmg, (e.x - x) / d * 300, (e.y - y) / d * 300); });
  addShake(R > 100 ? 5 : 2);
}

// ---------- pet ----------
function petShot(q, style, a, dmg, extra) {
  G.proj.push(Object.assign({ k: 'pshot', style, x: q.x, y: q.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 6, dmg, pierce: 1, life: 1.4, hit: new Set(), spin: 0 }, extra));
}
function updatePet(dt) {
  const q = G.pet, p = G.p;
  if (!q) return;
  const P = PET[q.id], melee = P.kind === 'scratch' || P.kind === 'coin';
  q.t += dt; q.cd -= dt;
  const ox = q.x;
  if (q.mode === 'dive') {
    const e = q.tgt;
    if (!e || e.dead) q.mode = 'back';
    else {
      const dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy) || 1;
      q.x += dx / d * 700 * dt; q.y += dy / d * 700 * dt;
      if (d < e.r + 8) { hitEnemy(e, q.dmg * 3, dx / d * 300, dy / d * 300); G.fx.push({ type: 'boom', x: e.x, y: e.y, r: 40, t: 0, life: 0.25 }); q.mode = 'back'; }
    }
  } else {
    let tx = p.x - p.face * 36, ty = p.y + 2, k = 4;
    if (melee) { const e = nearestEnemy(p.x, p.y, 170); if (e) { tx = e.x - Math.sign(e.x - p.x) * 14; ty = e.y; k = 7; } }
    q.x += (tx - q.x) * Math.min(1, dt * k); q.y += (ty - q.y) * Math.min(1, dt * k);
    if (q.mode === 'back' && Math.hypot(tx - q.x, ty - q.y) < 30) q.mode = 'follow';
  }
  if (Math.abs(q.x - ox) > 0.3) q.face = q.x > ox ? 1 : -1;
  if (P.kind === 'heal' || P.kind === 'phoenix') {
    q.healT -= dt;
    if (q.healT <= 0) {
      q.healT = P.kind === 'heal' ? 5 : 6;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (P.kind === 'heal' ? 0.06 : 0.05));
      G.texts.push({ x: p.x, y: p.y - 34, txt: '+HP', color: '#4ade80', big: true, t: 0 }); G.fx.push({ type: 'heal', x: p.x, y: p.y, t: 0, life: 0.6 });
    }
  }
  if (P.kind === 'coin' || P.crown) {
    q.coinT = (q.coinT == null ? 4 : q.coinT) - dt;
    if (q.coinT <= 0) { q.coinT = 4; G.items.push({ type: 'gold', x: q.x, y: q.y, v: 3 + (G.world ? Math.max(0, secAt(p.x, p.y)) : G.stage) * 2 }); }
  }
  if (q.cd > 0 || q.mode !== 'follow') return;
  const e = nearestEnemy(q.x, q.y, melee ? 40 : 420);
  if (!e) { q.cd = 0.15; return; }
  const a = Math.atan2(e.y - q.y, e.x - q.x), big = 1 + P.r * 0.35;
  const fireball = (dmg, boom, spd = 380) => G.proj.push({ k: 'fireball', x: q.x, y: q.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 6 + boom / 10, dmg, boom, life: 1.4, hit: new Set() });
  switch (P.kind) {
    case 'goo': petShot(q, 'goo', a, q.dmg * (P.crown ? 1.6 : 1), { slow: true, r: P.crown ? 10 : 6 }); q.cd = 1.1; break;
    case 'scratch': case 'coin':
      hitEnemy(e, q.dmg * big);
      if (q.id === 'wolf') e.slowUntil = G.time + 1;
      G.fx.push({ type: 'slash', x: q.x, y: q.y, a, r: 30, arc: 1.6, color: P.c[0], t: 0, life: 0.18 });
      q.cd = 0.45; break;
    case 'heal': petShot(q, 'spark', a, q.dmg, { home: true, life: 2 }); q.cd = 1.3; break;
    case 'ghost': petShot(q, 'ghost', a, q.dmg * 1.2, { pierce: 6, life: 1.6 }); q.cd = 1.3; break;
    case 'dive': q.mode = 'dive'; q.tgt = e; q.cd = 2.2; break;
    case 'fire': fireball(q.dmg * 1.6 * big, P.r ? 55 : 38); q.cd = 1.4; break;
    case 'phoenix': fireball(q.dmg * 2, 72, 420); q.cd = 1.2; break;
    case 'frost':
      for (const o of P.base === 'dragon' ? [-0.25, 0, 0.25] : [0]) petShot(q, 'frost', a + o, q.dmg * 1.1 * big, { slow: true, pierce: P.base === 'dragon' ? 3 : 1 });
      q.cd = 1.2; break;
    case 'spore': petShot(q, 'spore', a, q.dmg * 1.25, { pierce: 2 }); q.cd = 1.0; break;
    case 'sting': petShot(q, 'sting', a, q.dmg * 0.5, { vx: Math.cos(a) * 650, vy: Math.sin(a) * 650 }); q.cd = 0.4; break;
    case 'quake': {
      const R = 110 * big;
      forNear(p.x, p.y, R, o => { const d = Math.hypot(o.x - p.x, o.y - p.y) || 1; hitEnemy(o, q.dmg * 1.5 * big, (o.x - p.x) / d * 260, (o.y - p.y) / d * 260); o.stunUntil = G.time + 0.6; });
      G.fx.push({ type: 'shock', x: p.x, y: p.y, r: R, color: P.c[1], seed: Math.random() * 100, t: 0, life: 0.45 });
      q.cd = 2.6; break;
    }
    case 'zap': {
      let from = e;
      const hit = new Set();
      for (let i = 0; i < (P.base === 'jelly' ? 3 : 1); i++) {
        if (i === 0) G.fx.push({ type: 'bolt', x: from.x, y: from.y, t: 0, life: 0.25, seed: Math.random() * 1000, size: 40 });
        hit.add(from.id); forNear(from.x, from.y, 40, o => hitEnemy(o, q.dmg * 1.4 * big));
        const n = nearestEnemy(from.x, from.y, 200, hit);
        if (!n) break;
        G.fx.push({ type: 'chain', x: from.x, y: from.y, x2: n.x, y2: n.y, t: 0, life: 0.2 });
        from = n;
      }
      q.cd = 1.5; break;
    }
    case 'laser':
      lineHit(q.x, q.y, a, 320, 10, q.dmg * 1.3);
      G.fx.push({ type: 'beam', x: q.x, y: q.y, x2: q.x + Math.cos(a) * 320, y2: q.y + Math.sin(a) * 320, color: P.c[1], t: 0, life: 0.25 });
      q.cd = 1.3; break;
    case 'starfall': {
      const vis = G.enemies.filter(o => !o.dead && onScreen(o)), tgt = vis.length ? pick(vis) : e, tx = tgt.x, ty = tgt.y;
      G.fx.push({ type: 'starfall', x: tx, y: ty, t: 0, life: 0.35 });
      G.later.push({ t: 0.35, fn: () => explode(tx, ty, 65, q.dmg * 2.2) });
      q.cd = 1.3; break;
    }
  }
  q.cd *= 1 - 0.1 * P.r; // rarer pets attack faster
}

// ---------- projectiles ----------
function steer(b, tgt, rate, dt) {
  const want = Math.atan2(tgt.y - b.y, tgt.x - b.x), cur = Math.atan2(b.vy, b.vx), spd = Math.hypot(b.vx, b.vy);
  const na = cur + clamp(angDiff(want, cur), -rate * dt, rate * dt);
  b.vx = Math.cos(na) * spd; b.vy = Math.sin(na) * spd;
}
function pierceHits(b, kb = 0.25, onHit) {
  forNear(b.x, b.y, b.r, e => {
    if (b.hit.has(e.id)) return;
    b.hit.add(e.id); hitEnemy(e, b.dmg, b.vx * kb, b.vy * kb);
    if (onHit) onHit(e);
    if (--b.pierce <= 0) { b.life = 0; return false; }
  });
}
function updateProj(dt) {
  const p = G.p;
  for (const b of G.proj) {
    b.life -= dt;
    switch (b.k) {
      case 'knife': b.spin += dt * 20; // falls through
      case 'dagger': case 'arrow': case 'bolt': case 'bullet':
        b.x += b.vx * dt; b.y += b.vy * dt;
        pierceHits(b);
        break;
      case 'pshot':
        if (b.home) { const t = nearestEnemy(b.x, b.y, 300); if (t) steer(b, t, 8, dt); }
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 8;
        pierceHits(b, 0.15, b.slow ? e => { e.slowUntil = G.time + 1.5; } : null);
        break;
      case 'orb': {
        const t = nearestEnemy(b.x, b.y, 350);
        if (t) steer(b, t, 7, dt);
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.random() < 0.5) G.fx.push({ type: 'sparkle', x: b.x, y: b.y, color: '#d8b4fe', t: 0, life: 0.35 });
        pierceHits(b, 0.1);
        break;
      }
      case 'wbolt':
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 10;
        if (Math.random() < 0.6) G.fx.push({ type: 'sparkle', x: b.x, y: b.y, color: '#67e8f9', t: 0, life: 0.3 });
        forNear(b.x, b.y, b.r, e => {
          if (b.hit.has(e.id)) return;
          b.hit.add(e.id); hitEnemy(e, b.dmg);
          G.fx.push({ type: 'pop', x: e.x, y: e.y, r: 10, t: 0, life: 0.2, color: '#67e8f9' });
          if (--b.bounces < 0) { b.life = 0; return false; }
          const n = nearestEnemy(b.x, b.y, 260, b.hit);
          if (!n) { b.life = 0; return false; }
          const a = Math.atan2(n.y - b.y, n.x - b.x), spd = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(a) * spd; b.vy = Math.sin(a) * spd; b.life = Math.max(b.life, 0.8);
          return false;
        });
        break;
      case 'fireball': {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.random() < 0.7) G.fx.push({ type: 'ember', x: b.x + rand(-4, 4), y: b.y + rand(-4, 4), t: 0, life: 0.35 });
        let hit = false;
        forNear(b.x, b.y, b.r, () => { hit = true; return false; });
        if (hit || b.life <= 0) { explode(b.x, b.y, b.boom, b.dmg, true); b.life = 0; }
        break;
      }
      case 'axe': {
        b.spin += dt * 16;
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
        if (d > 6) { const s = Math.min(d, Math.hypot(b.vx, b.vy) * dt); b.x += dx / d * s; b.y += dy / d * s; }
        else { b.spinLeft -= dt; if (b.spinLeft <= 0) b.life = 0; }
        forNear(b.x, b.y, b.r, e => {
          if ((b.hitT.get(e.id) || 0) > G.time) return;
          b.hitT.set(e.id, G.time + 0.2); hitEnemy(e, b.dmg, rand(-80, 80), rand(-80, 80));
        });
        break;
      }
      case 'boomer':
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
        break;
      case 'rocket': {
        if (b.tgt && !b.tgt.dead) steer(b, b.tgt, 5, dt);
        const sp = Math.hypot(b.vx, b.vy), ns = sp + dt * 300;
        b.vx *= ns / sp; b.vy *= ns / sp;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.random() < 0.6) G.fx.push({ type: 'smoke', x: b.x, y: b.y, t: 0, life: 0.4 });
        let hit = false;
        forNear(b.x, b.y, b.r, () => { hit = true; return false; });
        if (hit || b.life <= 0) { explode(b.x, b.y, b.boom, b.dmg); b.life = 0; }
        break;
      }
    }
  }
  G.proj = G.proj.filter(b => b.life > 0);
}
function updateEbul(dt) {
  const p = G.p;
  for (const b of G.ebul) {
    if (b.home) steer(b, p, b.home, dt); // homing orbs turn toward the player
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
        case 'gold': {
          const v = it.v * p.goldMul;
          G.gold += v;
          if (G.world) { S.gold += Math.floor(v); G.world.loot.gold += Math.floor(v); }
          break;
        }
        case 'meat': p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); G.texts.push({ x: p.x, y: p.y - 30, txt: '+HP', color: '#4ade80', big: true, t: 0 }); break;
        case 'magnet': for (const g of G.gems) g.m = true; showBanner('🧲 경험치 전부 흡수!', '#93c5fd'); break;
        case 'bomb': for (const e of G.enemies) if (!e.dead && onScreen(e)) hitEnemy(e, e.boss || e.home ? 300 * p.dmgMul : 99999); G.fx.push({ type: 'flash', t: 0, life: 0.4 }); addShake(12); break;
        case 'chest': openChest(); break;
      }
    }
  }
  G.items = G.items.filter(i => !i.dead);
}
function updateFx(dt) {
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.life);
  if (G.fx.length > 350) G.fx.splice(0, G.fx.length - 350);
  for (const t of G.texts) t.t += dt;
  G.texts = G.texts.filter(t => t.t < 0.7);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  for (const l of G.later) { l.t -= dt; if (l.t <= 0) l.fn(); }
  G.later = G.later.filter(l => l.t > 0);
}

function update(dt) {
  G.time += dt;
  updatePlayer(dt);
  if (G.world) updateWorld(dt); else updateSpawner(dt);
  updateEnemies(dt);
  buildGrid();
  updateMain(dt);
  updateWeapons(dt);
  updatePet(dt);
  updateProj(dt);
  updateEbul(dt);
  updateHazards(dt);
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
  ctx.fillStyle = G.world ? '#05060d' : st.g1; ctx.fillRect(0, 0, VW, VH);
  const sx = G.shake ? rand(-1, 1) * G.shake : 0, sy = G.shake ? rand(-1, 1) * G.shake : 0;
  ctx.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, DPR * (VW / 2 - p.x * ZOOM + sx), DPR * (VH / 2 - p.y * ZOOM + sy));
  ctx.lineJoin = 'round';
  const hw = VW / 2 / ZOOM, hh = VH / 2 / ZOOM;

  // ground
  const T = 90, i0 = Math.floor((p.x - hw) / T), i1 = Math.floor((p.x + hw) / T), j0 = Math.floor((p.y - hh) / T), j1 = Math.floor((p.y + hh) / T);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    let b = st, locked = false, bi = G.stage - 1;
    if (G.world) {
      const s = secAt(i * T + T / 2, j * T + T / 2);
      if (s < 0) continue;
      b = secBiome(s); locked = !accessible(s); bi = s;
      ctx.fillStyle = b.g1; ctx.fillRect(i * T, j * T, T, T);
    }
    const pat = groundPattern(bi);
    if (pat) {
      ctx.fillStyle = pat; ctx.fillRect(i * T, j * T, T, T);
      // calm the texture with the biome color so monsters and bullets stay readable
      ctx.globalAlpha = 0.4; ctx.fillStyle = b.g1; ctx.fillRect(i * T, j * T, T, T); ctx.globalAlpha = 1;
      if (locked) { ctx.fillStyle = 'rgba(5,6,13,.72)'; ctx.fillRect(i * T, j * T, T, T); }
      continue;
    }
    if ((i + j) & 1) { ctx.fillStyle = b.g2; ctx.fillRect(i * T, j * T, T, T); }
    const h = hash2(i, j);
    if (h < 0.3) {
      ctx.fillStyle = b.deco; ctx.globalAlpha = 0.55;
      const dx = i * T + hash2(j, i) * T, dy = j * T + h * 3 * T;
      if (h < 0.15) { circle(dx, dy, 3 + h * 20); ctx.fill(); }
      else { ctx.fillRect(dx, dy, 3, 9); ctx.fillRect(dx + 5, dy + 2, 3, 7); ctx.fillRect(dx - 5, dy + 3, 3, 6); }
      ctx.globalAlpha = 1;
    }
    if (locked) { ctx.fillStyle = 'rgba(5,6,13,.72)'; ctx.fillRect(i * T, j * T, T, T); }
  }
  if (G.world) drawWorldFeatures(hw, hh);
  drawHazards();

  // aura skill
  for (const w of p.weapons) if (w.id === 'aura') {
    const s = wStats(w), pulse = 1 + Math.sin(G.time * 6) * 0.03;
    const g = ctx.createRadialGradient(p.x, p.y, s.size * 0.2, p.x, p.y, s.size * pulse);
    g.addColorStop(0, w.evo ? 'rgba(239,68,68,0.05)' : 'rgba(251,146,60,0.03)');
    g.addColorStop(1, w.evo ? 'rgba(220,38,38,0.4)' : 'rgba(251,146,60,0.3)');
    ctx.fillStyle = g; circle(p.x, p.y, s.size * pulse); ctx.fill();
  }
  // shock rings under enemies
  for (const f of G.fx) if (f.type === 'shock') {
    const k = f.t / f.life;
    ctx.globalAlpha = 0.35 * (1 - k); ctx.fillStyle = f.color; circle(f.x, f.y, f.r); ctx.fill();
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#7c5a2a'; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) {
      const a = hash2(i, f.seed | 0) * TAU, l = f.r * (0.5 + hash2(f.seed | 0, i) * 0.5);
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * l * 0.5 + 6, f.y + Math.sin(a) * l * 0.5); ctx.lineTo(f.x + Math.cos(a) * l, f.y + Math.sin(a) * l); ctx.stroke();
    }
    ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 8 * (1 - k) + 1; circle(f.x, f.y, f.r * (0.3 + 0.7 * k)); ctx.stroke();
    ctx.globalAlpha = 1;
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
    const iim = imgReady(ITEM_IMG[it.type]);
    if (it.type === 'chest') { ctx.fillStyle = 'rgba(253,224,71,.35)'; circle(it.x, it.y, 26 + Math.sin(G.time * 5) * 4); ctx.fill(); }
    if (iim) { const s = it.type === 'gold' ? 15 : it.type === 'chest' ? 40 : 26; ctx.drawImage(iim, it.x - s / 2, it.y + bob - s / 2, s, s); continue; }
    if (it.type === 'gold') { ctx.fillStyle = '#facc15'; circle(it.x, it.y + bob, 6); ctx.fill(); ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2; ctx.stroke(); continue; }
    ctx.font = (it.type === 'chest' ? 30 : 20) + 'px serif';
    ctx.fillText({ meat: '🍖', magnet: '🧲', bomb: '💣', chest: '🎁' }[it.type], it.x, it.y + bob);
  }

  for (const e of G.enemies) drawEnemy(e);
  const petFront = G.pet && G.pet.y > p.y;
  if (G.pet && !petFront) drawPet(ctx, G.pet.id, G.pet.x, G.pet.y, G.pet.t, G.pet.face);
  drawHero(ctx, p.x, p.y, {
    id: S.hero, look: p.look, wt: p.wt, grade: p.grade, aim: p.aim, face: p.face, walk: p.walk,
    swing: p.anim > 0 ? 1 - p.anim / p.animMax : -1, alpha: p.inv > 0 && Math.floor(p.inv * 20) % 2 ? 0.45 : 1,
  }, G.time);
  ctx.globalAlpha = 1;
  if (petFront) drawPet(ctx, G.pet.id, G.pet.x, G.pet.y, G.pet.t, G.pet.face);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(p.x - 21, p.y + 24, 42, 6, 3); ctx.fill();
  ctx.fillStyle = p.hp / p.maxHp > 0.3 ? '#22c55e' : '#ef4444'; rr(p.x - 20, p.y + 25, 40 * clamp(p.hp / p.maxHp, 0, 1), 4, 2); ctx.fill();

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

  drawProjectiles();
  // enemy bullets
  for (const b of G.ebul) {
    ctx.globalAlpha = 0.4; ctx.fillStyle = b.color || '#ef4444'; circle(b.x, b.y, b.r + 4); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = b.color ? '#fff' : '#fca5a5'; circle(b.x, b.y, b.r * (b.color ? 0.55 : 1)); ctx.fill();
  }
  drawFx();
  // damage numbers
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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

const ITEM_IMG = { gold: 'items/gold', chest: 'items/chest', meat: 'items/meat', magnet: 'items/magnet_item', bomb: 'items/bomb' };
const GROUND = new Map();
// repeating ground texture for a biome, if its image exists
function groundPattern(i) {
  const im = imgReady(`stages/stage${i % STAGES.length + 1}`);
  if (!im) return null;
  let pat = GROUND.get(im);
  if (!pat) { pat = ctx.createPattern(im, 'repeat'); GROUND.set(im, pat); }
  return pat;
}
function drawWorldFeatures(hw, hh) {
  const p = G.p, W = G.world, pulse = 0.6 + Math.sin(G.time * 4) * 0.3;
  const c0 = Math.floor((p.x - hw) / SEC), c1 = Math.floor((p.x + hw) / SEC), r0 = Math.floor((p.y - hh) / SEC), r1 = Math.floor((p.y + hh) / SEC);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = (t, x, y, size, color) => { ctx.font = `900 ${size}px sans-serif`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y); };
  for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) {
    const s = secAt((col + 0.5) * SEC, (row + 0.5) * SEC);
    if (s < 0) continue;
    const x0 = col * SEC, y0 = row * SEC;
    if (!accessible(s)) {
      ctx.globalAlpha = 0.7;
      label('🔒', x0 + SEC / 2, y0 + SEC / 2 - 40, 70, '#fff');
      label(`${s + 1}. ${secName(s)}`, x0 + SEC / 2, y0 + SEC / 2 + 40, 36, '#cbd5ff');
      ctx.globalAlpha = 1;
      continue;
    }
    // walls to the void, glowing barriers to locked sections
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = secAt((col + dx + 0.5) * SEC, (row + dy + 0.5) * SEC);
      if (accessible(n)) continue;
      const ex = dx === 1 ? x0 + SEC : x0, ey = dy === 1 ? y0 + SEC : y0;
      ctx.beginPath();
      if (dy) { ctx.moveTo(x0, ey); ctx.lineTo(x0 + SEC, ey); } else { ctx.moveTo(ex, y0); ctx.lineTo(ex, y0 + SEC); }
      if (n < 0) { ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 28; ctx.stroke(); ctx.strokeStyle = '#374151'; ctx.lineWidth = 8; ctx.stroke(); }
      else {
        ctx.globalAlpha = pulse; ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 16; ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 24; ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        const mx = dy ? x0 + SEC / 2 : ex, my = dy ? ey : y0 + SEC / 2;
        label('🔒 대장 보스를 잡으면 열려요', mx - dx * 40, my - dy * 40, 22, '#e9d5ff');
      }
    }
    // field boss spots
    fbSpots(s).forEach((pt, k) => {
      const st = W.fb[s + ':' + k];
      if (st && st.e) return;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; circle(pt.x, pt.y, 46); ctx.fill();
      if (st && st.at > G.time) label(`⏳ ${Math.ceil(st.at - G.time)}s`, pt.x, pt.y, 18, '#cbd5e1');
      else label('💀', pt.x, pt.y, 34, '#fff');
    });
    // leader lair
    const l = lairSpot(s), done = fbDone(s), ls = W.leader[s];
    ctx.fillStyle = '#292524'; circle(l.x, l.y, 86); ctx.fill();
    ctx.strokeStyle = done ? `rgba(239,68,68,${pulse})` : '#57534e'; ctx.lineWidth = 6; ctx.stroke();
    star(ctx, l.x, l.y, 66, 26, 5); ctx.lineWidth = 3; ctx.stroke();
    if (!(ls && ls.e)) {
      const t = !done ? `🔒 봉인 ${bits3(S.world.fb[s] || 0)}/3` : ls && ls.at > G.time ? `⏳ ${Math.ceil(ls.at - G.time)}s` : '👑 대장 보스';
      label(t, l.x, l.y - 110, 20, done ? '#fca5a5' : '#d6d3d1');
      label(done ? '👑' : '🗿', l.x, l.y, 40, '#fff');
    }
  }
}

function drawProjectiles() {
  const col = GRADES[G.p.grade].c;
  for (const b of G.proj) {
    const ang = Math.atan2(b.vy, b.vx);
    ctx.save(); ctx.translate(b.x, b.y);
    switch (b.k) {
      case 'knife':
        ctx.rotate(b.spin); ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const r2 = i % 2 ? b.r * 0.35 : b.r * 1.3, a = i / 8 * TAU; ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'dagger': {
        const dim = imgReady(weaponKey('dagger', G.p.grade));
        if (dim) { ctx.rotate(ang + Math.PI / 4); ctx.drawImage(dim, -14, -14, 28, 28); break; }
        ctx.rotate(ang + Math.PI / 2); ctx.scale(0.55, 0.55); ctx.translate(0, 8); WEAPON_ART.dagger.draw(ctx, col); break;
      }
      case 'arrow':
        ctx.rotate(ang);
        line(ctx, [-16, 0, 10, 0], '#a16207', 2.2);
        poly(ctx, [16, 0, 8, -4, 8, 4]); paint(ctx, METAL, OUT, 1);
        poly(ctx, [-16, 0, -20, -4, -12, 0]); paint(ctx, col, null); poly(ctx, [-16, 0, -20, 4, -12, 0]); paint(ctx, col, null);
        break;
      case 'bolt':
        ctx.rotate(ang);
        ctx.globalAlpha = 0.35; line(ctx, [-40, 0, -14, 0], '#fff', 3); ctx.globalAlpha = 1;
        line(ctx, [-16, 0, 12, 0], '#57534e', 3.5);
        poly(ctx, [20, 0, 10, -5.5, 10, 5.5]); paint(ctx, METAL, OUT, 1);
        rect(ctx, -16, -3, 5, 6); paint(ctx, col, null);
        break;
      case 'bullet': {
        ctx.rotate(ang);
        const g = ctx.createLinearGradient(-22, 0, 0, 0); g.addColorStop(0, 'rgba(253,224,71,0)'); g.addColorStop(1, 'rgba(253,224,71,.8)');
        ctx.fillStyle = g; ctx.fillRect(-22, -2, 22, 4);
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'orb':
        ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#c084fc'; circle(0, 0, b.r); ctx.fill();
        ctx.fillStyle = '#fff'; circle(0, 0, b.r * 0.45); ctx.fill();
        break;
      case 'wbolt':
        ctx.rotate(b.spin); ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 14;
        star(ctx, 0, 0, b.r * 1.4, b.r * 0.6); paint(ctx, '#a5f3fc', null);
        circle(0, 0, b.r * 0.4); ctx.fillStyle = '#fff'; ctx.fill();
        break;
      case 'fireball': {
        ctx.shadowColor = '#f97316'; ctx.shadowBlur = 16;
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, b.r * 1.3); g.addColorStop(0, '#fef9c3'); g.addColorStop(0.5, '#fb923c'); g.addColorStop(1, '#dc2626');
        ctx.fillStyle = g; circle(0, 0, b.r * 1.3); ctx.fill();
        break;
      }
      case 'axe': {
        const aim = imgReady(weaponKey('axe', G.p.grade));
        ctx.rotate(b.spin);
        if (aim) { ctx.drawImage(aim, -20, -20, 40, 40); break; }
        ctx.scale(0.7, 0.7); ctx.translate(0, 18); WEAPON_ART.axe.draw(ctx, col); break;
      }
      case 'pshot':
        if (b.style === 'goo') { ctx.fillStyle = '#4ade80'; circle(0, 0, b.r); ctx.fill(); ctx.fillStyle = '#bbf7d0'; circle(-2, -2, 2); ctx.fill(); }
        else if (b.style === 'ghost') { ctx.rotate(ang); ctx.globalAlpha = 0.85; ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; circle(4, -1.5, 1.3); ctx.fill(); circle(4, 2, 1.3); ctx.fill(); }
        else if (b.style === 'frost') { ctx.rotate(ang); ctx.shadowColor = '#67e8f9'; ctx.shadowBlur = 10; poly(ctx, [10, 0, 0, -4, -8, 0, 0, 4]); paint(ctx, '#cffafe', '#0891b2', 1); }
        else if (b.style === 'spore') { ctx.globalAlpha = 0.85; ctx.fillStyle = '#a855f7'; circle(0, 0, b.r); ctx.fill(); ctx.fillStyle = '#e9d5ff'; circle(-2, -2, 1.6); ctx.fill(); circle(2, 1, 1.2); ctx.fill(); }
        else if (b.style === 'sting') { ctx.rotate(ang); line(ctx, [-6, 0, 6, 0], '#1f2937', 2); poly(ctx, [9, 0, 5, -2, 5, 2]); paint(ctx, '#facc15', null); }
        else { ctx.rotate(b.spin); ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 10; star(ctx, 0, 0, 7, 3); paint(ctx, '#fbcfe8', null); }
        break;
      case 'boomer':
        ctx.rotate(b.spin);
        if (b.evo) { ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 5; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12; circle(0, 0, b.r); ctx.stroke(); ctx.fillStyle = '#f5d0fe'; for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.fillRect(b.r - 2, -2, 8, 4); } }
        else { ctx.strokeStyle = '#b45309'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-b.r, b.r * 0.4); ctx.lineTo(0, -b.r * 0.4); ctx.lineTo(b.r, b.r * 0.4); ctx.stroke(); }
        break;
      case 'rocket':
        ctx.rotate(ang);
        ctx.fillStyle = '#fb923c'; circle(-10, 0, 4 + Math.random() * 2); ctx.fill();
        ctx.fillStyle = b.evo ? '#84cc16' : '#ef4444'; rr(-8, -4, 16, 8, 4); ctx.fill();
        ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(13, 0); ctx.lineTo(8, 4); ctx.fill();
        break;
    }
    ctx.restore();
  }
}

function drawFx() {
  for (const f of G.fx) {
    const k = f.t / f.life;
    switch (f.type) {
      case 'pop': ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = 3; circle(f.x, f.y, f.r * (1 + k)); ctx.stroke(); break;
      case 'smoke': ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = '#d1d5db'; circle(f.x, f.y, 3 + k * 6); ctx.fill(); break;
      case 'ember': ctx.globalAlpha = 1 - k; ctx.fillStyle = k < 0.4 ? '#fde047' : '#f97316'; circle(f.x, f.y - k * 8, 3.5 * (1 - k) + 1); ctx.fill(); break;
      case 'sparkle': ctx.globalAlpha = 1 - k; ctx.fillStyle = f.color; star(ctx, f.x, f.y, 4 * (1 - k) + 1, 1.2, 4); ctx.fill(); break;
      case 'boom': {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = f.fire ? '#ef4444' : '#fb923c'; circle(f.x, f.y, f.r * (0.4 + k * 0.6)); ctx.fill();
        ctx.fillStyle = '#fef08a'; circle(f.x, f.y, f.r * (0.4 + k * 0.6) * 0.55); ctx.fill();
        break;
      }
      case 'slash': {
        const start = f.a - f.arc / 2, sweep = start + f.arc * Math.min(1, k * 3);
        ctx.globalAlpha = 1 - k * k;
        ctx.strokeStyle = f.color; ctx.lineWidth = f.r * 0.32 * (1 - k * 0.7); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.72, start, sweep); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.9, start + 0.1, sweep); ctx.stroke();
        break;
      }
      case 'spin': {
        ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
        const rot = f.a + k * TAU * 1.5;
        ctx.strokeStyle = f.color; ctx.lineWidth = f.r * 0.25 * (1 - k * 0.5);
        for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.75, rot + i * Math.PI, rot + i * Math.PI + 2.2); ctx.stroke(); }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.92, rot, rot + 2.2); ctx.stroke();
        break;
      }
      case 'thrust': {
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a);
        ctx.globalAlpha = 1 - k;
        const g = ctx.createLinearGradient(0, 0, f.len, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, f.color); g.addColorStop(1, '#fff');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10, -9 * (1 - k)); ctx.lineTo(f.len * (0.6 + 0.4 * Math.min(1, k * 4)), 0); ctx.lineTo(10, 9 * (1 - k)); ctx.fill();
        ctx.restore();
        break;
      }
      case 'muzzle': ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fef08a'; star(ctx, f.x, f.y, 12, 4, 6); ctx.fill(); break;
      case 'beam':
        ctx.globalAlpha = 1 - k; ctx.lineCap = 'round'; ctx.shadowColor = f.color; ctx.shadowBlur = 14;
        line(ctx, [f.x, f.y, f.x2, f.y2], f.color, 8 * (1 - k) + 2); line(ctx, [f.x, f.y, f.x2, f.y2], '#fff', 2);
        ctx.shadowBlur = 0;
        break;
      case 'starfall': {
        const sy = f.y - 320 * (1 - k);
        ctx.globalAlpha = 0.5; line(ctx, [f.x + 60 * (1 - k) + 30, sy - 60, f.x + 60 * (1 - k), sy], '#fef9c3', 4);
        ctx.globalAlpha = 1; ctx.shadowColor = '#fde047'; ctx.shadowBlur = 16;
        star(ctx, f.x + 60 * (1 - k), sy, 12, 5); paint(ctx, '#fde047', OUT, 1.2); ctx.shadowBlur = 0;
        break;
      }
      case 'heal': ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 3; circle(f.x, f.y, 20 + k * 25); ctx.stroke(); break;
      case 'bolt': {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fef9c3'; ctx.lineWidth = 4; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(f.x, f.y - 420);
        for (let i = 1; i <= 8; i++) ctx.lineTo(f.x + (i < 8 ? (hash2(i, f.seed | 0) - 0.5) * 50 : 0), f.y - 420 + i * 52.5);
        ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(254,240,138,.5)'; circle(f.x, f.y, f.size * (0.6 + k * 0.4)); ctx.fill();
        break;
      }
      case 'chain': {
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(f.x, f.y);
        for (let i = 1; i < 5; i++) { const t = i / 5; ctx.lineTo(f.x + (f.x2 - f.x) * t + rand(-12, 12), f.y + (f.y2 - f.y) * t + rand(-12, 12)); }
        ctx.lineTo(f.x2, f.y2); ctx.stroke();
        break;
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.lineCap = 'butt';
}

// Monster body motion. dx: toward the player, dy: up/down, rot: lean toward the player, sx/sy: squash.
function enemyPose(e) {
  const P = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, glow: 0, glowColor: '' };
  if (e.hitT > 0) { const k = e.hitT / 0.12; P.sx += 0.14 * k; P.sy -= 0.12 * k; }
  if (e.boss) {
    if (e.jumpH) { P.dy -= e.jumpH; P.sy += 0.1; }
    if (e.windT > 0) { const k = Math.min(1, (0.8 - e.windT) / 0.5); P.sy -= 0.16 * k; P.sx += 0.12 * k; P.rot = -0.08 * k; P.glow = k; P.glowColor = 'rgba(239,68,68,A)'; }
    else if (e.dashT > 0) { P.sx += 0.18; P.sy -= 0.1; P.rot = 0.15; }
    if (e.castT > 0) { const k = Math.sin(e.castT / 0.45 * Math.PI); P.sx += 0.1 * k; P.sy += 0.1 * k; P.dy -= 6 * k; P.glow = Math.max(P.glow, k); P.glowColor = P.glowColor || 'rgba(192,132,252,A)'; }
    return P;
  }
  if (e.ranged) {
    if (e.recoilT > 0) { const k = e.recoilT / 0.2; P.dx = -5 * k; P.rot = -0.12 * k; }
    else if (e.shootT < 0.45 && e.pd < 480) { const k = 1 - e.shootT / 0.45; P.dx = -3 * k; P.rot = -0.18 * k; P.sx += 0.06 * k; }
    return P;
  }
  if (!(e.atkT > 0)) return P;
  const s = 1 - e.atkT / e.atkDur; // 0 → 1 through the attack
  if (e.elite) { // charge up red, then a heavy lunge
    if (s < 0.5) { const k = s / 0.5; P.sy -= 0.12 * k; P.sx += 0.1 * k; P.dx = -4 * k; P.glow = k; P.glowColor = 'rgba(239,68,68,A)'; }
    else { const k = Math.sin((s - 0.5) / 0.5 * Math.PI); P.dx = 14 * k; P.rot = 0.2 * k; P.sx += 0.12 * k; }
    return P;
  }
  switch (e.type) {
    case 'slime': // squish down, then hop onto the player
      if (s < 0.35) { const k = s / 0.35; P.sy -= 0.28 * k; P.sx += 0.22 * k; }
      else { const k = Math.sin((s - 0.35) / 0.65 * Math.PI); P.dy = -12 * k; P.dx = 10 * k; P.sy += 0.18 * k; P.sx -= 0.1 * k; }
      break;
    case 'bat': // pull back, then dart in for a bite
      if (s < 0.3) { const k = s / 0.3; P.dx = -5 * k; P.rot = -0.2 * k; }
      else { const k = Math.sin((s - 0.3) / 0.7 * Math.PI); P.dx = 14 * k; P.rot = 0.3 * k; P.sx += 0.1 * k; }
      break;
    case 'golem': // rear up, then slam down
      if (s < 0.55) { const k = s / 0.55; P.sy += 0.14 * k; P.rot = -0.15 * k; P.dy = -4 * k; }
      else { const k = 1 - (s - 0.55) / 0.45; P.sy -= 0.2 * k; P.sx += 0.18 * k; P.dx = 6 * k; P.rot = 0.12 * k; }
      break;
  }
  return P;
}
const FLYING_MONSTERS = new Set(['monsters/bat', 'bosses/boss9']);
const enemyImgKey = e => e.boss ? `bosses/boss${(e.lvl - 1) % BOSSES.length + 1}` : `monsters/${e.elite ? 'elite' : e.type}`;
function drawEnemy(e) {
  const p = G.p, bob = Math.sin(G.time * 8 + e.wob) * 1.5, y = e.y + bob, r = e.r;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.85, r * 0.9, r * 0.3, 0, 0, TAU); ctx.fill();
  // attack pose: step toward the player, hop, lean and squash around the feet
  const pd = Math.hypot(p.x - e.x, p.y - e.y) || 1, ux = (p.x - e.x) / pd, uy = (p.y - e.y) / pd, P = enemyPose(e);
  ctx.save();
  if (e.fadeT > 0) ctx.globalAlpha = e.fadeT / 0.5; // shadow strike: fade out before reappearing
  ctx.translate(P.dx * ux, P.dx * uy * 0.6 + P.dy);
  ctx.translate(e.x, e.y + r * 0.85); ctx.rotate(P.rot * (ux >= 0 ? 1 : -1)); ctx.scale(P.sx, P.sy); ctx.translate(-e.x, -(e.y + r * 0.85));
  if (P.glow) {
    const g = ctx.createRadialGradient(e.x, y, r * 0.3, e.x, y, r * 1.8);
    g.addColorStop(0, P.glowColor.replace('A', 0.55 * P.glow)); g.addColorStop(1, P.glowColor.replace('A', 0));
    ctx.fillStyle = g; circle(e.x, y, r * 1.8); ctx.fill();
  }
  const col = e.flash > 0 ? '#ffffff' : e.color;
  const imKey = enemyImgKey(e), im = imgReady(imKey), noArt = im || imgPending(imKey);
  if (e.type === 'bat' && !noArt) {
    const flap = Math.sin(G.time * 20 + e.wob) * 6;
    ctx.fillStyle = e.flash > 0 ? '#fff' : '#6b21a8';
    ctx.beginPath(); ctx.moveTo(e.x - r * 0.5, y); ctx.lineTo(e.x - r * 2, y - 6 + flap); ctx.lineTo(e.x - r * 1.2, y + 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(e.x + r * 0.5, y); ctx.lineTo(e.x + r * 2, y - 6 + flap); ctx.lineTo(e.x + r * 1.2, y + 6); ctx.fill();
  }
  if (e.boss && e.windT > 0) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    ctx.strokeStyle = 'rgba(239,68,68,.5)'; ctx.lineWidth = r * 1.4; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(a) * 330, e.y + Math.sin(a) * 330); ctx.stroke();
  }
  if (im) {
    const S = r * 2.8;
    const lift = FLYING_MONSTERS.has(imKey) ? r * 0.5 + Math.sin(G.time * 5 + e.wob) * 3 : 0;
    const ix = e.x - S / 2, iy = y + r * 0.95 - S * imgBottom(imKey) - lift;
    ctx.drawImage(im, ix, iy, S, S);
    if (e.flash > 0) { ctx.globalAlpha = 0.6; ctx.drawImage(whiteOf(im), ix, iy, S, S); ctx.globalAlpha = 1; } // hit flash over the picture
  } else if (!noArt) {
  ctx.fillStyle = col;
  if (e.type === 'golem') { rr(e.x - r, y - r, r * 2, r * 2, r * 0.4); ctx.fill(); }
  else if (e.type === 'slime') { ctx.beginPath(); ctx.ellipse(e.x, y + r * 0.15, r * 1.1, r * 0.9, 0, 0, TAU); ctx.fill(); }
  else { circle(e.x, y, r); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; ctx.stroke();
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, lx = dx / d * r * 0.15, ly = dy / d * r * 0.15;
  const es = Math.max(2.5, r * 0.22);
  ctx.fillStyle = '#fff'; circle(e.x - r * 0.35 + lx, y - r * 0.15 + ly, es); ctx.fill(); circle(e.x + r * 0.35 + lx, y - r * 0.15 + ly, es); ctx.fill();
  ctx.fillStyle = e.elite || e.boss ? '#dc2626' : '#111'; circle(e.x - r * 0.35 + lx * 1.6, y - r * 0.15 + ly * 1.6, es * 0.55); ctx.fill(); circle(e.x + r * 0.35 + lx * 1.6, y - r * 0.15 + ly * 1.6, es * 0.55); ctx.fill();
  if (e.type === 'archer') { ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x + lx * 5, y + ly * 5, r * 0.9, Math.atan2(dy, dx) - 1, Math.atan2(dy, dx) + 1); ctx.stroke(); }
  }
  if (e.stunUntil > G.time) { ctx.fillStyle = '#fde047'; for (let i = 0; i < 3; i++) { const a = G.time * 6 + i * TAU / 3; star(ctx, e.x + Math.cos(a) * r * 0.8, y - r - 4 + Math.sin(a) * 3, 4, 1.6); ctx.fill(); } }
  if (e.elite && !noArt) {
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath(); ctx.moveTo(e.x - r * 0.7, y - r * 0.6); ctx.lineTo(e.x - r * 0.9, y - r * 1.4); ctx.lineTo(e.x - r * 0.3, y - r * 0.85); ctx.fill();
    ctx.beginPath(); ctx.moveTo(e.x + r * 0.7, y - r * 0.6); ctx.lineTo(e.x + r * 0.9, y - r * 1.4); ctx.lineTo(e.x + r * 0.3, y - r * 0.85); ctx.fill();
  }
  if (e.boss && !noArt) {
    ctx.fillStyle = '#facc15';
    ctx.beginPath(); ctx.moveTo(e.x - r * 0.6, y - r * 0.75);
    for (let i = 0; i <= 4; i++) ctx.lineTo(e.x - r * 0.6 + i * r * 0.3, y - r * (i % 2 ? 1.0 : 1.45));
    ctx.lineTo(e.x + r * 0.6, y - r * 0.75); ctx.fill();
  }
  ctx.restore();
  if (e.skillLabel) {
    const ly = e.y - r * 2.2 - (e.jumpH || 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 16px sans-serif';
    ctx.globalAlpha = Math.min(1, e.skillLabel.t * 3); ctx.lineWidth = 4; ctx.strokeStyle = '#000';
    ctx.strokeText('⚠️ ' + e.skillLabel.txt, e.x, ly); ctx.fillStyle = '#fca5a5'; ctx.fillText('⚠️ ' + e.skillLabel.txt, e.x, ly); ctx.globalAlpha = 1;
  }
  if (e.elite && e.hp < e.maxHp) {
    ctx.fillStyle = '#000'; ctx.fillRect(e.x - r, y + r + 6, r * 2, 5);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x - r, y + r + 6, r * 2 * e.hp / e.maxHp, 5);
  }
  if (e.fb) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 13px sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText('💀 ' + e.name, e.x, y - r * 1.5 - 8);
    ctx.fillStyle = '#fdba74'; ctx.fillText('💀 ' + e.name, e.x, y - r * 1.5 - 8);
  }
}

function drawHUD() {
  const p = G.p;
  ctx.setTransform(DPR, 0, 0, DPR, 0, DPR * SAFE_TOP);
  ctx.textBaseline = 'middle';
  const bx = 12, by = 10, bw = VW - 24;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(bx, by, bw, 16, 8); ctx.fill();
  const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#22d3ee'); gr.addColorStop(1, '#3b82f6');
  const xpk = G.world ? S.cexp / cexpNeed(S.clv) : p.xp / p.xpNext;
  ctx.fillStyle = gr; rr(bx + 2, by + 2, Math.max(0, (bw - 4) * clamp(xpk, 0, 1)), 12, 6); ctx.fill();
  ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('Lv.' + (G.world ? S.clv : p.lv), VW / 2, by + 8.5);
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)';
  if (G.world) {
    const s = Math.max(0, secAt(p.x, p.y)), t = `${s + 1}. ${secName(s)}`;
    ctx.font = '900 18px sans-serif'; ctx.strokeText(t, VW / 2, 46); ctx.fillStyle = '#fde68a'; ctx.fillText(t, VW / 2, 46);
  } else {
    ctx.font = '900 26px sans-serif';
    const tt = G.bossSpawned ? 'BOSS' : fmtTime(G.time);
    ctx.strokeText(tt, VW / 2, 48); ctx.fillStyle = G.bossSpawned ? '#f87171' : '#fff'; ctx.fillText(tt, VW / 2, 48);
  }
  ctx.textAlign = 'left'; ctx.font = '800 14px sans-serif';
  const txt = (s, x, y) => { ctx.strokeText(s, x, y); ctx.fillStyle = '#fff'; ctx.fillText(s, x, y); };
  ctx.lineWidth = 3;
  txt('💀 ' + G.kills, 14, 44); txt('🪙 ' + fmt(G.gold), 14, 64);
  // main weapon + skills + passives
  const slot = (x, y, bg) => { ctx.fillStyle = bg; rr(x, y - 13, 26, 26, 6); ctx.fill(); };
  slot(14, 92, `${GRADES[p.grade].c}88`);
  if (p.wt) { const im = mainIconImg(); if (im.complete) ctx.drawImage(im, 15, 80, 24, 24); } else { ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText('👊', 27, 92); }
  ctx.font = '900 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(p.mlv, 35, 102);
  ctx.font = '18px serif';
  p.weapons.forEach((w, i) => {
    const x = 44 + i * 30, y = 92;
    slot(x, y, w.evo ? 'rgba(251,191,36,.45)' : 'rgba(0,0,0,.45)');
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; drawSkillIcon(ctx, w.id, w.evo, x + 13, y, 22);
    ctx.font = '900 9px sans-serif'; ctx.fillText(w.evo ? 'MAX' : w.lv, x + 20, y + 10); ctx.font = '18px serif';
  });
  p.passives.forEach((q, i) => {
    const x = 44 + i * 30, y = 122;
    slot(x, y, 'rgba(0,0,0,.45)');
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; drawSkillIcon(ctx, q.id, false, x + 13, y, 22);
    ctx.font = '900 9px sans-serif'; ctx.fillText(q.lv, x + 21, y + 10); ctx.font = '18px serif';
  });
  if (G.world) drawMinimap();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.world) {
    const o = worldObjective();
    if (o && !onScreen(o)) {
      const a = Math.atan2(o.y - p.y, o.x - p.x), R = Math.min(VW, VH) * 0.38, ax = VW / 2 + Math.cos(a) * R, ay = VH / 2 + Math.sin(a) * R;
      ctx.save(); ctx.translate(ax, ay);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; circle(0, 0, 18); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '18px serif'; ctx.fillText(o.icon, 0, 1);
      ctx.rotate(a); ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(20, -8); ctx.lineTo(20, 8); ctx.fill();
      ctx.restore();
    }
  }
  if (G.boss && !G.boss.dead) {
    const b = G.boss, w = Math.min(420, VW - 40), x = (VW - w) / 2, y = VH - 60 - SAFE_BOTTOM;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(x, y, w, 18, 9); ctx.fill();
    ctx.fillStyle = '#dc2626'; rr(x + 2, y + 2, (w - 4) * clamp(b.hp / b.maxHp, 0, 1), 14, 7); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = '900 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('👑 ' + b.name, VW / 2, y - 10);
    if (!onScreen(b)) {
      const a = Math.atan2(b.y - p.y, b.x - p.x), ax = VW / 2 + Math.cos(a) * Math.min(VW, VH) * 0.4, ay = VH / 2 + Math.sin(a) * Math.min(VW, VH) * 0.4;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(a); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.fill(); ctx.restore();
    }
  }
  for (const f of G.fx) if (f.type === 'flash') { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - f.t / f.life)})`; ctx.fillRect(0, 0, VW, VH); }
  if (G.banner) {
    const a = Math.min(1, G.banner.t * 2), y = VH * 0.28;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, y - 24, VW, 48);
    ctx.textAlign = 'center'; ctx.font = '900 22px sans-serif'; ctx.fillStyle = G.banner.color; ctx.fillText(G.banner.text, VW / 2, y + 1);
    ctx.globalAlpha = 1;
  }
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
function drawMinimap() {
  const p = G.p, rows = secCell(S.world.cleared + 1).row + 1, cs = 22, mw = cs * WORLD_COLS, mh = cs * rows;
  const x0 = VW - 12 - mw, y0 = 84;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(x0 - 4, y0 - 4, mw + 8, mh + 8, 8); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '9px serif';
  for (let row = 0; row < rows; row++) for (let col = 0; col < WORLD_COLS; col++) {
    const s = secAt((col + 0.5) * SEC, (row + 0.5) * SEC), x = x0 + col * cs, y = y0 + row * cs;
    ctx.fillStyle = accessible(s) ? secBiome(s).g1 : '#1f2030'; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
    if (!accessible(s)) ctx.fillText('🔒', x + cs / 2, y + cs / 2);
    else if (s < S.world.cleared) { ctx.fillStyle = '#4ade80'; ctx.fillText('✔', x + cs - 6, y + 6); }
  }
  const o = worldObjective();
  if (o) { ctx.fillStyle = '#fde047'; circle(x0 + o.x / SEC * cs, y0 + o.y / SEC * cs, 2.5); ctx.fill(); }
  ctx.fillStyle = '#fff'; circle(x0 + p.x / SEC * cs, y0 + p.y / SEC * cs, 3); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
}
let mainIconCache = null;
function mainIconImg() {
  const key = G.p.wt + G.p.grade;
  if (!mainIconCache || mainIconCache.key !== key) { mainIconCache = new Image(); mainIconCache.key = key; mainIconCache.src = weaponIcon(G.p.wt, G.p.grade); }
  return mainIconCache;
}

// ============================================================
//  IN-RUN MODALS
// ============================================================
function buildOptions(n) {
  const p = G.p, opts = [], pool = [];
  for (const w of p.weapons) if (!w.evo && w.lv >= MAX_WLV && p.passives.some(q => q.id === WEAPONS[w.id].pair)) opts.push({ kind: 'evo', id: w.id });
  if (p.mlv < MAX_WLV) pool.push({ kind: 'main' }, { kind: 'main' });
  for (const w of p.weapons) if (!w.evo && w.lv < MAX_WLV) pool.push({ kind: 'wup', id: w.id });
  if (p.weapons.length < MAX_SLOTS) for (const id in WEAPONS) if (!p.weapons.some(w => w.id === id)) pool.push({ kind: 'wnew', id });
  for (const q of p.passives) if (q.lv < MAX_WLV) pool.push({ kind: 'pup', id: q.id });
  if (p.passives.length < MAX_SLOTS) for (const id in PASSIVES) if (!p.passives.some(q => q.id === id)) pool.push({ kind: 'pnew', id });
  shuffle(pool);
  while (opts.length < n && pool.length) { const o = pool.pop(); if (o.kind === 'main' && opts.some(x => x.kind === 'main')) continue; opts.push(o); }
  if (!opts.length) opts.push({ kind: 'heal' }, { kind: 'gold' });
  return opts.slice(0, n);
}
const pips = lv => '★'.repeat(lv) + '☆'.repeat(MAX_WLV - lv);
function optInfo(o) {
  const p = G.p;
  switch (o.kind) {
    case 'main': {
      const W = curWT(), a = mainStats(), b = mainStats(p.mlv + 1);
      const icon = p.wt ? `<img src="${weaponIcon(p.wt, p.grade)}">` : '👊';
      const extra = b.extra > a.extra ? ` · <b>${{ slash: '양방향 베기', spin: '범위 확대', thrust: '3갈래 찌르기', slam: '충격파 확대', orbs: '마법구 +1', bounce: '튕김 +1', axe: '도끼 +1' }[W.kind] || '발사 수 +1'}</b>` : '';
      return { icon, name: `${W.name} 숙련`, tag: `Lv.${p.mlv + 1}`, up: true, cls: 'mainup', desc: `<span class="pips">${pips(p.mlv + 1)}</span><br>주무기 피해 ${fmt(a.dmg)}→<b>${fmt(b.dmg)}</b>${extra}` };
    }
    case 'evo': { const d = WEAPONS[o.id], q = PASSIVES[d.pair]; return { icon: skillIconHTML(o.id, true), name: d.evo, tag: '⚗️ 스킬 믹스!', cls: 'evo', desc: `${skillIconHTML(o.id, false, 'sm')}${d.name} + ${skillIconHTML(d.pair, false, 'sm')}${q.name} → ${d.evoInfo}` }; }
    case 'wnew': { const d = WEAPONS[o.id]; return { icon: skillIconHTML(o.id, false), name: d.name, tag: 'NEW', desc: `${d.info}<br><small>믹스 재료: ${skillIconHTML(d.pair, false, 'sm')}${PASSIVES[d.pair].name}</small>` }; }
    case 'wup': { const d = WEAPONS[o.id], w = p.weapons.find(x => x.id === o.id); return { icon: skillIconHTML(o.id, false), name: d.name, tag: `Lv.${w.lv + 1}`, up: true, desc: `<span class="pips">${pips(w.lv + 1)}</span><br>${upDesc(w)}` }; }
    case 'pnew': { const d = PASSIVES[o.id], wid = Object.keys(WEAPONS).find(k => WEAPONS[k].pair === o.id); return { icon: skillIconHTML(o.id, false), name: d.name, tag: 'NEW', desc: `${d.info}<br><small>믹스 재료: ${skillIconHTML(wid, false, 'sm')}${WEAPONS[wid].name}</small>` }; }
    case 'pup': { const d = PASSIVES[o.id], q = p.passives.find(x => x.id === o.id); return { icon: skillIconHTML(o.id, false), name: d.name, tag: `Lv.${q.lv + 1}`, up: true, desc: `<span class="pips">${pips(q.lv + 1)}</span><br>${d.info}` }; }
    case 'heal': return { icon: '🍖', name: '고기', tag: '회복', desc: '체력 50% 회복' };
    case 'gold': return { icon: '🪙', name: '금화 주머니', tag: '골드', desc: '골드 +50' };
  }
}
function applyOption(o) {
  const p = G.p;
  switch (o.kind) {
    case 'main': p.mlv++; break;
    case 'evo': p.weapons.find(x => x.id === o.id).evo = true; showBanner('⚗️ 스킬 믹스! ' + WEAPONS[o.id].evo, '#fde047'); break;
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
  for (let i = 0; i < n; i++) { const o = buildOptions(1)[0]; got.push(optInfo(o)); applyOption(o); }
  const box = showModal(`<div class="bigicon">🎁</div><h2>보물상자! <small>x${n}</small></h2>
    <div class="gotlist">${got.map(f => `<div><span class="gi">${f.icon}</span> <b>${f.name}</b> <span class="tag ${f.up ? 'up' : ''}">${f.tag}</span></div>`).join('')}</div>
    <div class="row"><button class="btn green" id="ok">확인</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); G.state = 'play'; };
}
function buildSummary() {
  const p = G.p;
  const main = p.wt ? `<span><img src="${weaponIcon(p.wt, p.grade)}"> ${WT[p.wt].name} Lv${p.mlv}</span>` : `<span>👊 Lv${p.mlv}</span>`;
  return `<div class="build">${main}${p.weapons.map(w => `<span>${skillIconHTML(w.id, w.evo)} ${w.evo ? WEAPONS[w.id].evo : 'Lv' + w.lv}</span>`).join('')}${p.passives.map(q => `<span>${skillIconHTML(q.id, false)} Lv${q.lv}</span>`).join('')}</div>`;
}
function pauseGame() {
  if (!G || G.state !== 'play') return;
  G.state = 'modal'; joy.active = false;
  if (G.world) {
    const L = G.world.loot, b = showModal(`<h2>⏸ 일시정지</h2><div class="center">🗺️ ${secName(Math.max(0, secAt(G.p.x, G.p.y)))} · 💀${G.kills} · ⏱ ${fmtTime(G.time)}</div>${buildSummary()}
      <div class="reward"><span>🪙 ${fmt(L.gold)}</span><span>💎 ${fmt(L.gems)}</span><span>🎒 ${L.items.length}</span></div>
      <div class="row"><button class="btn gray" id="quit">🏕️ 마을로 귀환</button><button class="btn green" id="resume">계속하기</button></div>`);
    b.querySelector('#resume').onclick = () => { closeModal(); G.state = 'play'; };
    b.querySelector('#quit').onclick = () => { closeModal(); endWorld(); };
    return;
  }
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
    const p = G.p; p.hp = p.maxHp; p.inv = 2.5; G.ebul = []; G.hazards = [];
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
      if (d < 350) { if (e.boss || e.home) { e.x = p.x + (e.x - p.x) / d * 350; e.y = p.y + (e.y - p.y) / d * 350; } else killEnemy(e); }
    }
    G.fx.push({ type: 'boom', x: p.x, y: p.y, r: 350, t: 0, life: 0.5 }, { type: 'flash', t: 0, life: 0.4 });
    G.state = 'play';
  };
  box.querySelector('#giveup').onclick = () => { closeModal(); G.world ? endWorld() : endRun(false); };
}

function endRun(win) {
  if (G.state === 'over') return;
  G.state = 'over'; joy.active = false;
  const s = G.stage, mult = S.pass ? 2 : 1;
  const gold = Math.floor((G.gold + G.kills * 1.5 + G.time * 2) * (1 + (s - 1) * 0.25) * G.p.goldMul) * mult;
  let gems = (win ? 30 + s * 10 : Math.floor(G.time / 30) * 2) * mult;
  const cexp = Math.floor((G.kills * 0.5 + G.time + (win ? 100 * s : 0)) * mult);
  let first = false;
  const drops = [];
  if (win) {
    first = S.cleared < s;
    if (first) gems += 100;
    S.cleared = Math.max(S.cleared, s);
    drops.push(newItem(rollGrade(s)), newItem(rollGrade(s)));
  }
  S.gold += gold; S.gems += gems;
  const ups = addCexp(cexp);
  S.best[s] = Math.max(S.best[s] || 0, Math.floor(G.time));
  save();
  const box = showModal(`<div class="bigicon">${win ? '🏆' : '☠️'}</div><h2>${win ? '스테이지 클리어!' : '패배…'}</h2>
    <div class="center">STAGE ${s} · ${fmtTime(G.time)} · 💀 ${G.kills} 처치${S.pass ? ' · 👑패스 2배' : ''}</div>
    ${buildSummary()}
    <div class="reward"><span>🪙 ${fmt(gold)}</span><span>💎 ${fmt(gems)}</span><span>📘 ${fmt(cexp)}</span></div>
    ${ups ? `<div class="center lvup">🎉 캐릭터 레벨 업! Lv.${S.clv}</div>` : ''}
    ${first ? '<div class="center">🎉 첫 클리어 보너스 💎100 포함</div>' : ''}
    ${drops.length ? `<div class="ggrid" style="justify-content:center;grid-template-columns:repeat(2,64px)">${drops.map(it => itemTile(it)).join('')}</div>` : ''}
    <div class="row"><button class="btn purple" id="dbl">📺 2배 받기 <small>(광고 없이 무료)</small></button></div>
    <div class="row"><button class="btn green" id="home">로비로</button>${win ? '<button class="btn gold" id="next">다음 스테이지 ▶</button>' : '<button class="btn gold" id="retry">다시 도전</button>'}</div>`);
  box.querySelector('#dbl').onclick = e => {
    S.gold += gold; S.gems += gems; addCexp(cexp); save();
    const b = e.target.closest('button'); b.disabled = true; b.textContent = '✅ 2배 지급 완료';
    toast(`🪙+${fmt(gold)} 💎+${fmt(gems)} 📘+${fmt(cexp)} 추가 지급!`);
  };
  const back = () => { closeModal(); G = null; $('#hudBtns').classList.add('hidden'); $('#lobby').classList.remove('hidden'); renderLobby(); };
  box.querySelector('#home').onclick = back;
  (box.querySelector('#next') || box.querySelector('#retry')).onclick = () => { const ns = win ? s + 1 : s; back(); selStage = ns; tryStart(ns); };
}
