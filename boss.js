'use strict';
// ============================================================
//  HERO MIXER — boss skills and ground hazards
// ============================================================

// Each boss cycles through its own skill list (boss number = level, repeating every 10).
const BOSS_KITS = [
  ['leap', 'radial', 'split', 'dash'],               // 1 킹 슬라임
  ['stingers', 'dash', 'sandstorm', 'radial'],       // 2 사막 전갈왕
  ['laser', 'radial', 'golems', 'laser'],            // 3 유적의 수호자
  ['icespikes', 'dash', 'blizzard', 'radial'],       // 4 서리 거인
  ['lavapools', 'radial', 'meteors', 'dash'],        // 5 용암 골렘
  ['teleport', 'darkorbs', 'radial', 'teleport'],    // 6 어둠의 군주
  ['tripledash', 'knights', 'radial', 'tripledash'], // 7 망령 기사단장
  ['breath', 'poison', 'radial', 'breath'],          // 8 늪의 히드라
  ['dive', 'tornado', 'radial', 'dive'],             // 9 천공의 그리폰
  ['spiral', 'meteors', 'darkorbs', 'teleport'],     // 10 혼돈의 마왕
];
const BOSS_SKILL_NAMES = {
  leap: '점프 내려찍기', split: '분열', stingers: '독침 연사', sandstorm: '모래 폭풍', laser: '고대 레이저', golems: '수호 석상 소환',
  icespikes: '얼음 가시', blizzard: '눈보라', lavapools: '용암 분출', meteors: '메테오', teleport: '그림자 습격', darkorbs: '어둠의 구체',
  tripledash: '3연속 돌격', knights: '망령 소환', breath: '세 갈래 브레스', poison: '독 늪', dive: '급강하', tornado: '회오리', spiral: '혼돈의 소용돌이',
};
const bossKit = e => BOSS_KITS[(e.lvl - 1) % BOSS_KITS.length];

// ---------- hazards: warned areas on the ground ----------
// warn: seconds of warning before it can hurt. once: hits a single time when the warning ends,
// otherwise it hurts every time the player's invincibility runs out while standing in it.
function addHazard(h) {
  G.hazards.push(Object.assign({ t: 0, warn: 1, life: 0.3, once: true, done: false, dmg: 10, color: '#ef4444' }, h));
}
function inHazard(h, p) {
  if (h.beam) {
    const vx = h.x2 - h.x, vy = h.y2 - h.y, k = clamp(((p.x - h.x) * vx + (p.y - h.y) * vy) / (vx * vx + vy * vy || 1), 0, 1);
    return Math.hypot(p.x - (h.x + vx * k), p.y - (h.y + vy * k)) < h.w + p.r * 0.6;
  }
  return Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r * 0.5;
}
function updateHazards(dt) {
  const p = G.p;
  for (const h of G.hazards) {
    h.t += dt;
    if (h.follow && h.t > h.warn) { // drifts after the player (tornado)
      const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1;
      h.x += dx / d * h.follow * dt; h.y += dy / d * h.follow * dt;
    }
    if (h.t < h.warn) continue;
    if (h.once) {
      if (h.done) continue;
      h.done = true;
      if (inHazard(h, p)) hurtPlayer(h.dmg);
      if (!h.beam) G.fx.push({ type: 'boom', x: h.x, y: h.y, r: h.r, t: 0, life: 0.35, fire: h.fire });
      if (h.r > 70) addShake(4);
    } else if (inHazard(h, p)) {
      hurtPlayer(h.dmg);
      if (h.slow) p.slowUntil = G.time + 0.6;
    }
  }
  G.hazards = G.hazards.filter(h => h.t < h.warn + h.life);
}

// ---------- boss brain ----------
// returns the boss's walking speed for this frame (0 while it is busy with a skill)
function bossUpdate(e, dt, dx, dy, spd) {
  const p = G.p;
  e.phaseT -= dt;
  if (e.skillLabel && (e.skillLabel.t -= dt) <= 0) e.skillLabel = null;
  if (e.leap) { // flying to the landing spot
    const L = e.leap, k = Math.min(1, (L.t += dt) / L.dur);
    e.x = L.x0 + (L.x1 - L.x0) * k; e.y = L.y0 + (L.y1 - L.y0) * k; e.jumpH = Math.sin(k * Math.PI) * L.h;
    if (k >= 1) { e.leap = null; e.jumpH = 0; e.airborne = false; addShake(10); G.fx.push({ type: 'shock', x: e.x, y: e.y, r: L.r, color: '#fca5a5', seed: Math.random() * 100, t: 0, life: 0.45 }); }
    return 0;
  }
  if (e.fadeT > 0) { if ((e.fadeT -= dt) <= 0) shadowStrike(e); return 0; }
  if (e.dashT > 0) {
    e.dashT -= dt; e.x += e.dvx * dt; e.y += e.dvy * dt;
    if (e.dashT <= 0 && e.dashLeft > 0) { e.dashLeft--; e.windT = 0.35; }
    return 0;
  }
  if (e.windT > 0) {
    if ((e.windT -= dt) <= 0) { e.dashT = 0.55; const a = Math.atan2(dy, dx); e.dvx = Math.cos(a) * 560; e.dvy = Math.sin(a) * 560; }
    return 0;
  }
  if (e.spiralT > 0) {
    e.spiralT -= dt;
    if ((e.spiralCd = (e.spiralCd || 0) - dt) <= 0) { e.spiralCd = 0.08; e.spiralA += 0.33; for (let k = 0; k < 3; k++) shootAt(e, e.spiralA + k * TAU / 3, 170, e.dmg * 0.5, { color: '#e879f9' }); }
    e.castT = Math.max(e.castT || 0, 0.2);
    return 0;
  }
  if (e.breathT > 0) { // three heads sweep a fixed fan, so stepping sideways escapes it
    e.breathT -= dt;
    if ((e.breathCd = (e.breathCd || 0) - dt) <= 0) {
      e.breathCd = 0.08;
      const sweep = e.breathA + Math.sin((1.6 - e.breathT) * 3) * 0.35;
      for (const o of [-0.55, 0, 0.55]) shootAt(e, sweep + o + rand(-0.06, 0.06), 230, e.dmg * 0.35, { color: '#84cc16' });
    }
    e.castT = Math.max(e.castT || 0, 0.2);
    return 0;
  }
  if (e.phaseT > 0) return spd;
  const kit = bossKit(e);
  castBossSkill(e, kit[e.pat++ % kit.length], Math.atan2(dy, dx));
  return 0;
}

function castBossSkill(e, skill, a) {
  const p = G.p, dmg = e.dmg;
  if (BOSS_SKILL_NAMES[skill]) e.skillLabel = { txt: BOSS_SKILL_NAMES[skill], t: 1.6 };
  e.phaseT = 2.4;
  const ring = (cx, cy, n, r) => { for (let i = 0; i < n; i++) { const b = i / n * TAU; spawnEnemy(...r, cx + Math.cos(b) * 80, cy + Math.sin(b) * 80); } };
  switch (skill) {
    case 'dash': e.windT = 0.8; break;
    case 'tripledash': e.windT = 0.6; e.dashLeft = 2; e.phaseT = 3.4; break;
    case 'radial': {
      e.castT = 0.45;
      const n = 14 + Math.min(10, e.lvl), off = Math.random();
      for (let i = 0; i < n; i++) shootAt(e, (i + off) / n * TAU, 190, dmg * 0.6);
      break;
    }
    case 'leap': case 'dive': {
      const dive = skill === 'dive', R = dive ? 80 : 95, dur = dive ? 0.85 : 1.1;
      addHazard({ x: p.x, y: p.y, r: R, warn: dur, dmg: dmg * (dive ? 1.4 : 1.3) });
      e.leap = { t: 0, dur, x0: e.x, y0: e.y, x1: p.x, y1: p.y, h: dive ? 170 : 90, r: R };
      e.airborne = true; e.phaseT = dur + 1.6;
      break;
    }
    case 'split': e.castT = 0.45; ring(e.x, e.y, 5, ['slime']); break;
    case 'golems': e.castT = 0.45; ring(e.x, e.y, 3, ['golem']); break;
    case 'knights': e.castT = 0.45; ring(e.x, e.y, 4, ['archer']); break;
    case 'stingers':
      e.castT = 0.45;
      for (let v = 0; v < 3; v++) G.later.push({ t: v * 0.3, fn: () => {
        if (e.dead) return;
        const aa = Math.atan2(G.p.y - e.y, G.p.x - e.x);
        for (const o of [-0.15, 0, 0.15]) shootAt(e, aa + o, 330, dmg * 0.5, { color: '#4ade80' });
      } });
      break;
    case 'sandstorm': case 'poison': case 'lavapools': {
      const color = { sandstorm: '#d6b25e', poison: '#65a30d', lavapools: '#f97316' }[skill];
      e.castT = 0.45; e.phaseT = 3;
      for (let i = 0; i < 4; i++) {
        const r = i === 0 ? 0 : rand(60, 170), b = rand(0, TAU);
        addHazard({ x: p.x + Math.cos(b) * r, y: p.y + Math.sin(b) * r, r: 65, warn: 0.9, life: 4, once: false, dmg: dmg * 0.4, color, slow: skill === 'sandstorm', pool: true });
      }
      break;
    }
    case 'laser': {
      const ax = Math.cos(a), ay = Math.sin(a);
      addHazard({ beam: true, x: e.x, y: e.y, x2: e.x + ax * 950, y2: e.y + ay * 950, w: 20, warn: 1.0, life: 0.45, once: false, dmg: dmg * 0.9, color: '#38bdf8' });
      e.castT = 0.45;
      break;
    }
    case 'icespikes':
      e.castT = 0.45;
      for (let i = 0; i < 9; i++) addHazard({ x: e.x + Math.cos(a) * (60 + i * 55), y: e.y + Math.sin(a) * (60 + i * 55), r: 34, warn: 0.6 + i * 0.07, dmg: dmg * 0.9, color: '#7dd3fc', spike: true });
      break;
    case 'blizzard':
      e.castT = 0.45; e.phaseT = 3;
      p.slowUntil = G.time + 3;
      for (let i = 0; i < 7; i++) addHazard({ x: p.x + rand(-170, 170), y: p.y + rand(-170, 170), r: 40, warn: 0.8 + i * 0.15, dmg: dmg * 0.8, color: '#bae6fd', spike: true });
      break;
    case 'meteors':
      e.castT = 0.45; e.phaseT = 3.2;
      for (let i = 0; i < 6; i++) addHazard({ x: p.x + (i ? rand(-200, 200) : 0), y: p.y + (i ? rand(-200, 200) : 0), r: 70, warn: 1.0 + i * 0.2, dmg: dmg * 1.2, color: '#f97316', fire: true, meteor: true });
      break;
    case 'teleport': e.fadeT = 0.5; e.phaseT = 2.6; break;
    case 'darkorbs':
      e.castT = 0.45;
      for (let i = 0; i < 4; i++) shootAt(e, a + (i - 1.5) * 0.6, 140, dmg * 0.7, { color: '#a855f7', home: 2.2, life: 6, r: 10 });
      break;
    case 'tornado':
      e.castT = 0.45; e.phaseT = 3;
      for (let i = 0; i < 3; i++) addHazard({ x: e.x + rand(-60, 60), y: e.y + rand(-60, 60), r: 38, warn: 0.6, life: 5, once: false, dmg: dmg * 0.5, color: '#e2e8f0', follow: 70 + i * 15, tornado: true });
      break;
    case 'spiral': e.spiralT = 2.2; e.spiralA = Math.random() * TAU; e.phaseT = 3.2; break;
  }
}

// vanish, reappear beside the player and slash around
function shadowStrike(e) {
  const p = G.p, side = Math.random() < 0.5 ? -1 : 1;
  e.x = p.x + side * 120; e.y = p.y + rand(-40, 40);
  G.fx.push({ type: 'pop', x: e.x, y: e.y, r: e.r * 1.5, t: 0, life: 0.4, color: '#7c3aed' });
  addHazard({ x: e.x, y: e.y, r: 135, warn: 0.6, dmg: e.dmg * 1.2, color: '#7c3aed' });
  e.castT = 0.45;
}

// ---------- drawing ----------
function drawHazards() {
  for (const h of G.hazards) {
    const warn = h.t < h.warn, k = Math.min(1, h.t / h.warn);
    ctx.save();
    if (h.beam) {
      if (warn) { // aiming line: a wide faint band plus a blinking bright core
        ctx.globalAlpha = 0.18; line(ctx, [h.x, h.y, h.x2, h.y2], h.color, h.w * 2);
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(h.t * 20); ctx.shadowColor = h.color; ctx.shadowBlur = 10;
        line(ctx, [h.x, h.y, h.x2, h.y2], h.color, 4);
      }
      else {
        ctx.shadowColor = h.color; ctx.shadowBlur = 24;
        line(ctx, [h.x, h.y, h.x2, h.y2], h.color, h.w * 2); line(ctx, [h.x, h.y, h.x2, h.y2], '#fff', h.w * 0.7);
      }
    } else if (warn) { // warning: outline plus a fill that grows until it hits
      ctx.globalAlpha = 0.18; ctx.fillStyle = h.color; circle(h.x, h.y, h.r); ctx.fill();
      ctx.globalAlpha = 0.4; circle(h.x, h.y, h.r * k); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = h.color; ctx.lineWidth = 2.5; circle(h.x, h.y, h.r); ctx.stroke();
      if (h.meteor) { // falling rock
        const fy = h.y - 360 * (1 - k);
        ctx.globalAlpha = 1; ctx.fillStyle = '#7c2d12'; circle(h.x + 120 * (1 - k), fy, 14); ctx.fill();
        ctx.fillStyle = '#fb923c'; circle(h.x + 120 * (1 - k), fy, 8); ctx.fill();
      }
    } else if (h.tornado) {
      ctx.globalAlpha = 0.75; ctx.strokeStyle = h.color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const rr2 = h.r * (0.35 + i * 0.22), sp = G.time * 8 + i; ctx.beginPath(); ctx.arc(h.x, h.y - i * 6, rr2, sp, sp + 4); ctx.stroke(); }
    } else if (h.pool) {
      const fade = Math.min(1, (h.warn + h.life - h.t) * 2);
      ctx.globalAlpha = 0.45 * fade; ctx.fillStyle = h.color; circle(h.x, h.y, h.r); ctx.fill();
      ctx.globalAlpha = 0.7 * fade; ctx.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) { const ph = (G.time * 1.5 + i * 0.37) % 1, b = hash2(i, h.x | 0) * TAU; circle(h.x + Math.cos(b) * h.r * 0.6, h.y + Math.sin(b) * h.r * 0.5, 3 * ph); ctx.fill(); }
    } else if (h.spike) {
      ctx.globalAlpha = Math.max(0, 1 - (h.t - h.warn) / h.life);
      ctx.fillStyle = h.color; ctx.strokeStyle = '#0c4a6e'; ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) { poly(ctx, [h.x + i * 12 - 7, h.y + 6, h.x + i * 12, h.y - 30 + Math.abs(i) * 10, h.x + i * 12 + 7, h.y + 6]); ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();
  }
}
