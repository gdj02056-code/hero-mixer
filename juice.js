'use strict';
// ============================================================
//  JUICE — 전투 화면의 "맛"을 내는 연출 모음
//
//  역할  : 게임 규칙(피해량·보상·난이도)은 건드리지 않고, 보이는 것과 느낌만 더한다.
//  입력  : game.js 가 사건이 일어날 때 부르는 함수들
//          juiceStart(판 시작) · juiceHit(적 타격) · juiceKill(적 처치) · juiceHurt(영웅 피격)
//          juiceGem(경험치 획득) · juiceGold(골드 획득) · juiceLevelUp(레벨업 선택) · bossIntro(보스 등장)
//  출력  : game.js 의 render / drawHUD 가 부르는 그리기 함수들
//          drawHeroLight · drawGems · drawJuiceFx · drawTexts · drawAtmosphere
//          drawXpBar · drawBossBar · drawBanner · drawBossIntro · drawCombo
//  순서  : update() 맨 앞에서 juiceTime(멈칫·슬로모션) → 맨 뒤에서 juiceUpdate(타이머·입자 이동)
//
//  속도 주의 (폰에서 버벅였던 경험):
//   - 화면 전체를 덮는 그라데이션을 매 프레임 새로 만들지 않는다.
//     빛·비네트는 작은 그림(스프라이트)으로 한 번만 만들어 두고 늘려서 복사한다.
//   - 입자·이펙트 개수에는 항상 상한을 둔다.
// ============================================================

// ---------- 미리 만들어 두는 빛 그림 ----------
// 키(색 문자열) → 작은 캔버스. 한 번 만들면 계속 재사용한다.
const JSPRITE = new Map();

// 가운데가 밝고 가장자리로 갈수록 투명해지는 둥근 빛 (64×64).
// rgb: '255,140,40' 같은 "빨강,초록,파랑" 문자열. 그릴 때 크기와 투명도만 바꿔 쓴다.
function glowSprite(rgb) {
  let c = JSPRITE.get(rgb);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`);      // 중심: 가장 밝음
    g.addColorStop(0.35, `rgba(${rgb},.45)`); // 중간: 빠르게 옅어짐
    g.addColorStop(1, `rgba(${rgb},0)`);      // 가장자리: 완전히 투명 (네모 경계가 안 보이게)
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    JSPRITE.set(rgb, c);
  }
  return c;
}

// 처치 조각 하나의 그림 (32×32): 어두운 테두리 → 적의 색 → 왼쪽 위 밝은 점.
// 어떤 바닥색 위에서도 보이게 테두리를 두르고, 원을 세 번 칠하는 대신 이 그림을 복사해 쓴다.
// color: 적의 색 ('#rrggbb'). 색마다 한 장씩 만들어 둔다 (몬스터 색은 열 가지 안쪽).
function blobSprite(color) {
  const key = 'blob' + color;
  let c = JSPRITE.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d'), dot = (cx, cy, r, fill) => { x.fillStyle = fill; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); };
    dot(16, 16, 16, 'rgba(10,10,20,.55)');       // 테두리: 반지름 16 (그림 전체)
    dot(16, 16, 12.8, color);                    // 본색: 16 / 1.25 = 12.8 → 그릴 때 1.25 배로 늘려 맞춘다
    dot(12.2, 12.2, 4.9, 'rgba(255,255,255,.65)'); // 밝은 점: 왼쪽 위 30% 지점
    JSPRITE.set(key, c);
  }
  return c;
}

// 화면 가장자리를 어둡게 덮는 비네트 (96×96 을 화면 크기로 늘려 그린다).
// rgb: 어둠의 색, strength: 모서리의 진하기(0~1). 가운데 절반은 완전히 투명해서 전투가 가려지지 않는다.
function vignetteSprite(rgb, strength) {
  const key = 'v' + rgb + ':' + strength;
  let c = JSPRITE.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 96;
    // 반지름 68 ≈ 48×√2 : 정사각형의 모서리까지 닿는 거리
    const x = c.getContext('2d'), g = x.createRadialGradient(48, 48, 0, 48, 48, 68);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(0.5, `rgba(${rgb},0)`);
    g.addColorStop(0.8, `rgba(${rgb},${strength * 0.45})`);
    g.addColorStop(1, `rgba(${rgb},${strength})`);
    x.fillStyle = g;
    x.fillRect(0, 0, 96, 96);
    JSPRITE.set(key, c);
  }
  return c;
}

// ---------- 구역별 분위기 ----------
// STAGES 와 같은 순서(0 평원 … 9 혼돈). 각 항목의 뜻:
//   vig   : 화면 가장자리 어둠의 색          dark : 그 진하기
//   n     : 떠다니는 입자 수 (폰 기준 30개 이하)
//   shape : dot 점 · leaf 잎/꽃잎 · streak 바람 줄기 · glow 빛나는 점
//   cols  : 입자 색 (glow 는 'r,g,b', 나머지는 '#rrggbb')
//   vx,vy : 속도 범위 [최소,최대] (화면 px/초, vy 가 음수면 위로 올라감)
//   size  : 크기 범위 (px)    sway : 좌우로 흔들리는 폭 (px/초)
//   a     : 투명도            tw   : 깜빡임 빠르기 (0 이면 안 깜빡임)
const ATMOS = [
  { vig: '6,18,10', dark: 0.5, n: 16, shape: 'leaf', cols: ['#bef264', '#fde68a', '#86efac'], vx: [18, 40], vy: [22, 46], size: [2.5, 4.5], sway: 18, a: 0.7, tw: 0 },    // 초록 평원: 나뭇잎·꽃가루
  { vig: '40,22,4', dark: 0.5, n: 14, shape: 'streak', cols: ['#fde7b0'], vx: [220, 380], vy: [10, 30], size: [14, 34], sway: 0, a: 0.28, tw: 0 },                    // 메마른 사막: 모래바람
  { vig: '12,14,24', dark: 0.55, n: 16, shape: 'dot', cols: ['#fef3c7', '#e7e5e4'], vx: [-8, 8], vy: [-16, -4], size: [1.2, 2.4], sway: 10, a: 0.55, tw: 2 },         // 고대 유적: 떠다니는 먼지
  { vig: '4,18,44', dark: 0.5, n: 30, shape: 'dot', cols: ['#ffffff', '#e0f2fe'], vx: [-20, 10], vy: [40, 90], size: [1.4, 3], sway: 14, a: 0.8, tw: 0 },             // 얼어붙은 동굴: 눈
  { vig: '50,8,0', dark: 0.6, n: 20, shape: 'glow', cols: ['255,140,40', '255,200,80'], vx: [-12, 12], vy: [-70, -30], size: [5, 10], sway: 12, a: 0.8, tw: 3 },      // 불타는 화산: 불티
  { vig: '10,4,26', dark: 0.65, n: 14, shape: 'dot', cols: ['#c4b5fd', '#a78bfa'], vx: [-6, 6], vy: [-10, 4], size: [1.2, 2.2], sway: 8, a: 0.45, tw: 2 },            // 어둠의 던전: 보랏빛 먼지
  { vig: '20,12,8', dark: 0.55, n: 18, shape: 'dot', cols: ['#a8a29e', '#78716c', '#fdba74'], vx: [10, 30], vy: [14, 34], size: [1.4, 2.6], sway: 12, a: 0.6, tw: 0 }, // 버려진 전장: 재
  { vig: '2,20,10', dark: 0.6, n: 12, shape: 'glow', cols: ['190,255,90', '250,255,150'], vx: [-14, 14], vy: [-10, 10], size: [6, 11], sway: 26, a: 0.9, tw: 2 },     // 심연의 늪: 반딧불
  { vig: '30,40,90', dark: 0.4, n: 18, shape: 'leaf', cols: ['#fbcfe8', '#f9a8d4', '#ffffff'], vx: [14, 40], vy: [26, 50], size: [2.5, 4.5], sway: 20, a: 0.8, tw: 0 }, // 하늘 정원: 꽃잎
  { vig: '40,0,34', dark: 0.6, n: 20, shape: 'glow', cols: ['255,80,200', '200,120,255'], vx: [-20, 20], vy: [-120, -50], size: [4, 9], sway: 16, a: 0.8, tw: 4 },    // 혼돈의 끝: 솟구치는 불꽃
];

// ---------- 조정값 ----------
const COMBO_KEEP = 3;       // 콤보가 끊기기 전까지 버티는 시간 (초). 이 안에 또 처치하면 이어진다
const COMBO_SHOW = 5;       // 이 수 이상부터 화면에 콤보를 보여 준다 (1~4 는 너무 흔해서 숨김)
const FX_BUDGET = 240;      // 연출용 이펙트를 더 만들지 않는 기준 개수 (game.js 의 상한 350 보다 낮게)
const GEM_PAD = 2.4;        // 보석 그림의 반지름 = 보석 크기 × 이 값 (빛이 퍼질 자리까지 포함)
const TEXT_LIFE = 0.7;      // 피해 숫자가 떠 있는 시간 (초). game.js updateFx 의 0.7 과 같아야 한다
// 콤보가 이 수에 닿는 순간 한 번씩 외쳐 주는 문구
const COMBO_CALLS = [[25, '좋아요!'], [50, '굉장해요!'], [100, '학살자!'], [200, '무쌍!'], [350, '전설!'], [500, '신화!']];
// 콤보 숫자의 색: 0~19 흰색 → 20 노랑 → 50 주황 → 100 빨강 → 200 보라
const COMBO_COLS = ['#ffffff', '#fde047', '#fb923c', '#f87171', '#e879f9'];
// 경험치 보석 3단계 (작은 것부터): 본색 · 밝은 면 · 어두운 테두리 · 빛의 색 · 크기(px)
const GEM_LOOK = [
  { main: '#38bdf8', light: '#bae6fd', dark: '#075985', rgb: '56,189,248', s: 5.5 },
  { main: '#4ade80', light: '#bbf7d0', dark: '#14532d', rgb: '74,222,128', s: 7 },
  { main: '#fb7185', light: '#fecdd3', dark: '#881337', rgb: '251,113,133', s: 9 },
];

// ============================================================
//  상태 만들기 / 시간 조절 / 매 프레임 갱신
// ============================================================

// 판을 시작할 때 한 번 부른다. 연출에 필요한 모든 값을 G.juice 에 모아 둔다.
function juiceStart() {
  G.juice = {
    combo: 0,          // 지금 이어지고 있는 연속 처치 수
    comboT: 0,         // 콤보가 끊기기까지 남은 시간 (초)
    comboPop: 0,       // 숫자가 튀어 오르는 정도 1 → 0 (처치할 때마다 1 로)
    best: 0,           // 이번 판 최고 콤보 (결과 화면에 표시)
    callout: null,     // 콤보 외침 { text, t(남은 초) }
    hurtT: 0,          // 맞았을 때 붉은 번쩍임이 남은 시간 (초)
    xpFlash: 0,        // 경험치를 얻었을 때 막대가 하얗게 빛나는 시간 (초)
    freeze: 0,         // 멈칫: 이 시간 동안 게임이 완전히 멈춘다 (초, 실제 시간)
    slowT: 0,          // 슬로모션이 남은 시간 (초, 실제 시간)
    intro: null,       // 보스 등장 연출 { name, t(지난 초), life(전체 초) }
    amb: [],           // 떠다니는 입자들
    ambKind: -1,       // 지금 입자가 어느 구역용인지 (구역이 바뀌면 새로 만든다)
    camX: G.p.x,       // 지난 프레임의 영웅 위치 (입자를 카메라 반대로 밀기 위해)
    camY: G.p.y,
    stepD: 0,          // 마지막 발자국 먼지 이후 걸은 거리 (월드 단위)
    gemAt: -9,         // 마지막으로 보석을 주운 시각 (연달아 주울수록 소리가 높아지게)
    gemStep: 0,        // 연달아 주운 횟수 → 소리 높이 단계
    bossLag: 1,        // 보스 체력 막대의 "잔상" 비율 (실제 체력보다 천천히 줄어듦)
    bossId: 0,         // 잔상이 어느 보스 것인지 (보스가 바뀌면 다시 1 로)
  };
}

// 이번 프레임에 게임 시간을 얼마나 흘릴지 정한다. dt: 실제로 지난 시간(초).
// 반환: 0 이면 이번 프레임은 멈춤, 그 외에는 (느려졌을 수도 있는) 게임 시간.
function juiceTime(dt) {
  const J = G.juice;
  if (J.freeze > 0) {          // 멈칫: 강한 적을 쓰러뜨린 순간 아주 잠깐 정지해 "묵직함"을 준다
    J.freeze -= dt;
    return 0;
  }
  if (J.slowT > 0) {           // 슬로모션: 보스가 쓰러지는 장면을 천천히 보여 준다
    J.slowT -= dt;
    return dt * 0.3;           // 0.3배속 — 너무 느리면 답답하고, 0.5 이상은 티가 안 난다
  }
  return dt;
}

// 매 프레임(게임이 흐를 때만) 부른다. 타이머를 줄이고 입자를 움직인다.
function juiceUpdate(dt) {
  const J = G.juice, p = G.p;
  // --- 콤보: 시간이 다 되면 0 으로 ---
  if (J.combo > 0) {
    J.comboT -= dt;
    if (J.comboT <= 0) J.combo = 0;
  }
  J.comboPop = Math.max(0, J.comboPop - dt * 6);   // 약 0.17초 만에 제 크기로 돌아온다
  if (J.callout && (J.callout.t -= dt) <= 0) J.callout = null;
  // --- 번쩍임 타이머 ---
  J.hurtT = Math.max(0, J.hurtT - dt);
  J.xpFlash = Math.max(0, J.xpFlash - dt);
  // --- 보스 등장 연출 ---
  if (J.intro && (J.intro.t += dt) >= J.intro.life) J.intro = null;
  // --- 보스 체력 잔상: 실제 체력까지 1초에 25%p 씩 따라 내려간다 ---
  const b = G.boss;
  if (b && !b.dead) {
    const r = clamp(b.hp / b.maxHp, 0, 1);
    if (J.bossId !== b.id) { J.bossId = b.id; J.bossLag = r; }   // 새 보스: 잔상 없이 시작
    J.bossLag = Math.max(r, J.bossLag - dt * 0.25);
  }
  // --- 발자국 먼지: 일정 거리를 걸을 때마다 발밑에 작은 먼지 ---
  const mx = p.x - J.camX, my = p.y - J.camY, moved = Math.hypot(mx, my);
  if (moved < 60) {                                 // 60 이상은 순간이동(부활·월드 입장)이라 걸음이 아님
    J.stepD += moved;
    if (J.stepD > 34 && G.fx.length < FX_BUDGET) {  // 34 ≈ 영웅 두 걸음
      J.stepD = 0;
      G.fx.push({ type: 'smoke', x: p.x - p.fx * 8 + rand(-3, 3), y: p.y + 17, t: 0, life: 0.35 });
    }
  }
  // --- 떠다니는 입자 ---
  updateAmbient(dt, mx * ZOOM, my * ZOOM);
  J.camX = p.x;
  J.camY = p.y;
}

// 지금 영웅이 서 있는 구역의 분위기 번호 (0~9).
function atmosIndex() {
  const n = ATMOS.length;
  if (!G.world) return (G.stage - 1) % n;
  return Math.max(0, secAt(G.p.x, G.p.y)) % n;     // 월드 밖(-1)이면 0번(평원)으로
}

// 입자 이동. camDx/camDy: 이번 프레임에 카메라(영웅)가 움직인 양 (화면 px).
// 입자는 화면 좌표에 살지만 카메라 반대 방향으로 밀려서, 공중에 떠 있는 것처럼 보인다.
function updateAmbient(dt, camDx, camDy) {
  const J = G.juice, kind = atmosIndex(), A = ATMOS[kind];
  if (J.ambKind !== kind) {                          // 구역이 바뀌었다: 그 구역의 입자로 새로 뿌린다
    J.ambKind = kind;
    J.amb = [];
    for (let i = 0; i < A.n; i++) {
      J.amb.push({
        x: rand(0, VW), y: rand(0, VH),              // 화면 안 아무 곳
        vx: rand(A.vx[0], A.vx[1]), vy: rand(A.vy[0], A.vy[1]),
        s: rand(A.size[0], A.size[1]),
        c: A.cols[i % A.cols.length],
        ph: rand(0, TAU),                            // 흔들림·깜빡임이 서로 어긋나게 하는 시작 위상
        par: rand(0.7, 1.3),                         // 시차: 1 보다 크면 카메라보다 앞(가까이)에 있는 느낌
      });
    }
  }
  const W = VW + 40, H = VH + 40;                    // 화면보다 20px 씩 넓은 상자 안에서 돌고 돈다
  for (const q of J.amb) {
    q.ph += dt;
    q.x += (q.vx + Math.sin(q.ph * 1.7) * A.sway) * dt - camDx * q.par;
    q.y += q.vy * dt - camDy * q.par;
    // 상자 밖으로 나가면 반대편에서 다시 들어온다 (나머지 연산을 두 번 써서 음수도 처리)
    q.x = ((q.x + 20) % W + W) % W - 20;
    q.y = ((q.y + 20) % H + H) % H - 20;
  }
}

// ============================================================
//  사건이 일어났을 때 부르는 함수들 (game.js → 여기)
// ============================================================

// 적이 맞았다. e: 맞은 적, crit: 치명타 여부.
function juiceHit(e, crit) {
  if (!onScreen(e)) return;                          // 화면 밖의 타격은 보이지도 들리지도 않게
  // 같은 적에게 0.09초 안에 또 불꽃을 만들지 않는다 (불 장판처럼 연속으로 때리는 스킬 대비)
  if (G.fx.length < FX_BUDGET && !(e.sparkAt > G.time)) {
    e.sparkAt = G.time + 0.09;
    G.fx.push({ type: 'spark', x: e.x + rand(-0.4, 0.4) * e.r, y: e.y + rand(-0.4, 0.4) * e.r, a: rand(0, TAU), crit, t: 0, life: crit ? 0.22 : 0.14 });
  }
  sfx(crit ? 'crit' : 'hit');
}

// 적이 쓰러졌다. 콤보를 올리고 터지는 조각을 만든다.
function juiceKill(e) {
  const J = G.juice, strong = !!(e.elite || e.fb), boss = !!(e.boss || e.leader !== undefined);
  // --- 콤보 ---
  J.combo++;
  J.comboT = COMBO_KEEP;
  J.comboPop = 1;
  J.best = Math.max(J.best, J.combo);
  for (const [n, text] of COMBO_CALLS) {
    if (J.combo === n) {                             // 정확히 그 수에 닿은 순간에만 한 번
      J.callout = { text, t: 1.4 };
      sfx('combo');
    }
  }
  // --- 터지는 조각 ---
  if (onScreen(e) && (G.fx.length < FX_BUDGET || strong || boss)) {
    G.fx.push({ type: 'burst', x: e.x, y: e.y, r: e.r, color: e.color, seed: Math.random() * 1000, big: strong || boss, t: 0, life: strong || boss ? 0.7 : 0.42 });
  }
  // --- 무게감: 강한 적은 멈칫, 보스는 슬로모션 + 번쩍 ---
  if (boss) {
    J.slowT = 1.0;                                   // 실제 시간 1초 동안 0.3배속
    G.fx.push({ type: 'flash', t: 0, life: 0.5 });
    sfx('bossdown');
  } else if (strong) {
    J.freeze = 0.06;                                 // 60ms: 느껴지지만 조작이 끊기지는 않는 길이
    sfx('elite');
  } else {
    sfx('kill');
  }
}

// 영웅이 맞았다. 화면 가장자리를 붉게 번쩍이고 콤보를 끊는다.
// 콤보를 끊는 이유: 처치만으로는 콤보가 끝없이 이어져서 의미가 없다. "안 맞고 몇 마리"가 되어야 실력의 기록이 된다.
function juiceHurt() {
  const J = G.juice;
  J.hurtT = 0.4;
  J.combo = 0;
  sfx('hurt');
}

// 경험치 보석을 주웠다. 막대를 번쩍이고, 연달아 주울수록 소리를 한 음씩 올린다.
function juiceGem() {
  const J = G.juice, p = G.p;
  J.xpFlash = 0.18;
  J.gemStep = G.time - J.gemAt < 0.35 ? Math.min(J.gemStep + 1, 14) : 0;   // 0.35초 안에 이어 주우면 단계 +1 (최대 14)
  J.gemAt = G.time;
  if (G.fx.length < FX_BUDGET && Math.random() < 0.4) {
    G.fx.push({ type: 'sparkle', x: p.x + rand(-12, 12), y: p.y + rand(-16, 8), color: '#7dd3fc', t: 0, life: 0.3 });
  }
  sfx('gem', J.gemStep);
}

// 골드를 주웠다. v: 얻은 양.
function juiceGold(v) {
  const p = G.p;
  if (G.texts.length < 70) G.texts.push({ x: p.x + rand(-10, 10), y: p.y - 34, txt: '+' + Math.max(1, Math.round(v)), color: '#facc15', t: 0 });
  sfx('gold');
}

// 레벨업 카드를 골랐다. 영웅 주위로 금빛 고리가 퍼진다.
function juiceLevelUp() {
  const p = G.p;
  G.fx.push({ type: 'lvring', x: p.x, y: p.y, t: 0, life: 0.7 });
  for (let i = 0; i < 8; i++) {
    G.fx.push({ type: 'sparkle', x: p.x + rand(-30, 30), y: p.y + rand(-40, 20), color: '#fde047', t: 0, life: 0.6 });
  }
  G.texts.push({ x: p.x, y: p.y - 46, txt: 'LEVEL UP!', color: '#fde047', big: true, t: 0 });
  sfx('pick');
}

// 보스가 나타났다. e: 보스. 화면을 가로지르는 경고 띠 → 이름 순서로 약 2.8초 보여 준다.
function bossIntro(e) {
  G.juice.intro = { name: e.name, t: 0, life: 2.8 };
  addShake(10);
  sfx('boss');
}

// ============================================================
//  월드(땅 위)에 그리는 것들 — 카메라 변환이 걸린 상태에서 부른다
// ============================================================

// 영웅 발밑의 은은한 빛. 몬스터 떼 속에서도 영웅이 어디 있는지 바로 보이게 한다.
function drawHeroLight() {
  const p = G.p, pulse = Math.sin(G.time * 3) * 0.03;
  ctx.globalCompositeOperation = 'lighter';          // 더하기 합성: 바닥을 밝히는 빛처럼 보인다
  ctx.globalAlpha = 0.2 + pulse;
  ctx.drawImage(glowSprite('255,240,190'), p.x - 78, p.y - 38, 156, 104);   // 납작한 타원 (땅에 깔린 빛)
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

// 보석 한 단계의 그림(빛 + 테두리 + 본색 + 밝은 면 + 반짝 점)을 96×96 캔버스에 한 번만 그려 둔다.
// 보석을 매번 여러 번 나눠 칠하면 보석이 화면에 가득할 때 느려지므로, 그릴 때는 이 그림 한 장만 복사한다.
// tier: 0 작은 파랑 · 1 중간 초록 · 2 큰 분홍 (GEM_LOOK 의 순서).
function gemSprite(tier) {
  const key = 'gem' + tier;
  let c = JSPRITE.get(key);
  if (!c) {
    const L = GEM_LOOK[tier], N = 96, s = N / (2 * GEM_PAD);   // s: 그림 안에서의 보석 반지름 (px). 그림의 절반(48px)이 반지름의 GEM_PAD 배
    c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d'), m = N / 2;
    // 은은한 빛: 가운데 55% → 가장자리 0%
    const g = x.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, `rgba(${L.rgb},.55)`); g.addColorStop(0.45, `rgba(${L.rgb},.22)`); g.addColorStop(1, `rgba(${L.rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, N, N);
    const diamond = r => { x.beginPath(); x.moveTo(m, m - r); x.lineTo(m + r * 0.7, m); x.lineTo(m, m + r); x.lineTo(m - r * 0.7, m); x.closePath(); };
    x.fillStyle = L.dark; diamond(s * 1.28); x.fill();             // 어두운 테두리
    x.fillStyle = L.main; diamond(s); x.fill();                    // 본색
    x.fillStyle = L.light;                                         // 왼쪽 위 밝은 면 (빛이 왼쪽 위에서 온다)
    x.beginPath(); x.moveTo(m, m - s); x.lineTo(m - s * 0.7, m); x.lineTo(m, m); x.closePath(); x.fill();
    x.fillStyle = '#fff'; x.fillRect(m - s * 0.32, m - s * 0.52, s * 0.28, s * 0.28);   // 반짝 점
    JSPRITE.set(key, c);
  }
  return c;
}

// 경험치 보석. hw/hh: 화면 절반 크기(월드 단위) — 화면 밖 보석은 그리지 않는다.
// 보석 하나에 그림 복사 한 번(끌려오는 중이면 꼬리 선 하나 더)만 쓴다.
function drawGems(hw, hh) {
  const p = G.p, t = G.time;
  ctx.lineCap = 'round';
  for (const g of G.gems) {
    if (Math.abs(g.x - p.x) > hw + 24 || Math.abs(g.y - p.y) > hh + 24) continue;   // 화면 밖 (24 = 빛의 반지름 여유)
    const tier = g.v < 5 ? 0 : g.v < 20 ? 1 : 2, L = GEM_LOOK[tier], R = L.s * GEM_PAD;   // 값이 클수록 큰 보석
    const y = g.y + (g.m ? 0 : Math.sin(t * 5 + g.x * 0.2) * 1.5);                   // 바닥에 있을 땐 살짝 위아래로 뜬다
    if (g.m) {
      // 영웅에게 끌려오는 중: 반대쪽으로 꼬리를 그려 속도감을 낸다 (빠를수록 길게, 최대 18)
      const dx = g.x - p.x, dy = g.y - p.y, d = Math.hypot(dx, dy) || 1, len = Math.min(18, g.sp * 0.03);
      ctx.globalAlpha = 0.5; ctx.strokeStyle = L.main; ctx.lineWidth = L.s * 0.7;
      ctx.beginPath(); ctx.moveTo(g.x, y); ctx.lineTo(g.x + dx / d * len, y + dy / d * len); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(gemSprite(tier), g.x - R, y - R, R * 2, R * 2);
  }
  ctx.lineCap = 'butt';
}

// game.js 의 drawFx 가 모르는 종류를 만나면 여기로 넘긴다. f: 이펙트, k: 진행도 0→1.
function drawJuiceFx(f, k) {
  switch (f.type) {
    case 'spark': {
      // 타격 불꽃: 짧은 선 몇 개가 바깥으로 퍼진다. 치명타는 더 크고 노랗고 가운데에 별이 번쩍인다
      const n = f.crit ? 4 : 3, R = (f.crit ? 17 : 10) * (0.4 + k * 0.9);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.crit ? '#fde047' : '#ffffff';
      ctx.lineWidth = f.crit ? 3 : 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = f.a + i * TAU / n, cx = Math.cos(a), cy = Math.sin(a);
        ctx.moveTo(f.x + cx * R * 0.35, f.y + cy * R * 0.35);
        ctx.lineTo(f.x + cx * R, f.y + cy * R);
      }
      ctx.stroke();
      if (f.crit) { ctx.fillStyle = '#fff'; star(ctx, f.x, f.y, R * 0.75, R * 0.2, 4); ctx.fill(); }
      break;
    }
    case 'burst': {
      // 처치: 하얀 번쩍임(처음 30%) + 적의 색 조각들이 튀어 올랐다가 떨어지며 작아진다
      if (k < 0.3) {
        ctx.globalAlpha = (1 - k / 0.3) * 0.85;
        ctx.fillStyle = '#fff';
        circle(f.x, f.y, f.r * (0.8 + k * 1.6));
        ctx.fill();
      }
      if (f.big) {
        // 강한 적: 하얀 충격 고리가 몸의 3배까지 퍼진다
        ctx.globalAlpha = (1 - k) * 0.85;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * (1 - k) + 1;
        circle(f.x, f.y, f.r * (1 + k * 2.2)); ctx.stroke();
      }
      const n = f.big ? 14 : 7, out = 1 - (1 - k) * (1 - k);          // out: 처음엔 빠르고 점점 느려지는 퍼짐
      const blob = blobSprite(f.color);
      ctx.globalAlpha = 1 - k * k;
      for (let i = 0; i < n; i++) {
        const a = hash2(i, f.seed | 0) * TAU, h = hash2(f.seed | 0, i); // 조각마다 고정된 방향과 크기 (seed 로 매번 다르게)
        const sp = f.r * (1.2 + h * 1.6) * (f.big ? 1.6 : 1);
        const x = f.x + Math.cos(a) * sp * out;
        const y = f.y + Math.sin(a) * sp * out * 0.7 - Math.sin(k * Math.PI) * f.r * 0.7 + k * k * f.r * 0.9;   // 포물선 + 중력
        const s = f.r * 0.2 * (0.6 + h * 0.8) * (1 - k) + 1;           // 날아가며 작아진다 (최소 1px)
        // 둥근 덩어리 그림(테두리 + 적의 색 + 밝은 점)을 크기만 바꿔 복사한다. 1.25 = 그림에서 테두리까지 포함한 비율
        ctx.drawImage(blob, x - s * 1.25, y - s * 1.25, s * 2.5, s * 2.5);
      }
      break;
    }
    case 'lvring': {
      // 레벨업: 영웅을 따라다니는 금빛 고리가 퍼지고, 고리 위로 빛줄기 8개가 돈다
      const p = G.p, R = 28 + k * 115;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fde047'; ctx.lineWidth = 7 * (1 - k) + 1;
      circle(p.x, p.y, R); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      circle(p.x, p.y, R * 0.82); ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#fef9c3';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + k * 1.5;
        ctx.moveTo(p.x + Math.cos(a) * R * 0.5, p.y + Math.sin(a) * R * 0.5);
        ctx.lineTo(p.x + Math.cos(a) * R * 0.95, p.y + Math.sin(a) * R * 0.95);
      }
      ctx.stroke();
      break;
    }
    default:
      break;   // 모르는 종류는 조용히 넘어간다
  }
}

// 피해 숫자 · "+골드" · "LEVEL UP!" 같은 떠오르는 글자.
// 처음 0.1초는 크게 튀어나왔다가 제 크기로 줄고, 위로 떠오르며 마지막 40% 구간에서 사라진다.
function drawTexts() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const t of G.texts) {
    const k = t.t / TEXT_LIFE;
    const pop = 1 + 0.7 * Math.max(0, 1 - t.t / 0.1);
    const rise = (1 - (1 - k) * (1 - k)) * 34;       // 처음엔 빨리, 나중엔 천천히 (최대 34 위로)
    const px = Math.round((t.big ? 21 : 14) * pop);
    const x = t.x + (t.vx || 0) * k, y = t.y - rise; // vx: 숫자끼리 겹치지 않게 옆으로 흩어지는 양
    ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    ctx.font = `900 ${px}px sans-serif`;
    ctx.lineWidth = t.big ? 4 : 3;
    ctx.strokeStyle = t.crit ? '#7c2d12' : '#0b0b14'; // 치명타는 짙은 주황 테두리로 더 뜨겁게
    ctx.strokeText(t.txt, x, y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.txt, x, y);
  }
  ctx.globalAlpha = 1;
}

// ============================================================
//  화면(고정 좌표)에 그리는 것들
// ============================================================

// 분위기: 떠다니는 입자 → 가장자리 어둠 → 위험할 때 붉은 가장자리. render 의 끝, HUD 직전에 부른다.
function drawAtmosphere() {
  const J = G.juice, p = G.p, A = ATMOS[J.ambKind < 0 ? atmosIndex() : J.ambKind], t = G.time;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);            // 화면 좌표 (CSS px)
  // --- 입자 ---
  if (A.shape === 'glow') ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const q of J.amb) {
    const tw = A.tw ? 0.55 + 0.45 * Math.sin(q.ph * A.tw) : 1;   // 깜빡임 (tw 가 0 이면 항상 켜짐)
    ctx.globalAlpha = A.a * tw;
    if (A.shape === 'glow') {
      ctx.drawImage(glowSprite(q.c), q.x - q.s, q.y - q.s, q.s * 2, q.s * 2);
    } else if (A.shape === 'streak') {
      // 바람 줄기: 진행 방향으로 길게 늘어진 선
      ctx.strokeStyle = q.c; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.s, q.y - q.s * q.vy / q.vx); ctx.stroke();
    } else if (A.shape === 'leaf') {
      // 잎·꽃잎: 납작한 타원이 떨어지며 빙글 돈다
      ctx.fillStyle = q.c;
      ctx.beginPath(); ctx.ellipse(q.x, q.y, q.s, q.s * 0.45, q.ph * 2, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = q.c;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, TAU); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'butt';
  // --- 가장자리 어둠: 시선이 가운데(영웅)로 모이고 화면에 깊이가 생긴다 ---
  ctx.globalAlpha = 1;
  ctx.drawImage(vignetteSprite(A.vig, A.dark), 0, 0, VW, VH);
  // --- 붉은 가장자리: 방금 맞았거나(짧게 번쩍) 체력이 35% 아래(심장 뛰듯 계속) ---
  const hpk = p.hp / p.maxHp;
  // 35% 에서 0.45 로 시작해 체력이 0 에 가까울수록 1 까지 진해지고, 1초에 약 한 번 심장처럼 뛴다(밝기 30~100%)
  const low = hpk < 0.35 ? (0.45 + 0.55 * (0.35 - hpk) / 0.35) * (0.65 + 0.35 * Math.sin(t * 7)) : 0;
  const red = Math.max(low, J.hurtT / 0.4 * 0.9);
  if (red > 0.01) {
    ctx.globalAlpha = Math.min(1, red);
    ctx.drawImage(vignetteSprite('200,0,0', 0.8), 0, 0, VW, VH);
  }
  ctx.globalAlpha = 1;
}

// 맨 위 경험치 막대. bx,by,bw: 위치와 너비, k: 채워진 비율 0~1, label: 가운데 글자("Lv.6").
function drawXpBar(bx, by, bw, k, label) {
  const J = G.juice, w = Math.max(0, (bw - 4) * clamp(k, 0, 1));
  ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(bx, by, bw, 16, 8); ctx.fill();               // 바탕
  const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  gr.addColorStop(0, '#22d3ee'); gr.addColorStop(1, '#3b82f6');
  ctx.fillStyle = gr; rr(bx + 2, by + 2, w, 12, 6); ctx.fill();                       // 채움 (청록 → 파랑)
  if (w > 6) {
    ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(bx + 4, by + 3.5, w - 4, 3.5, 2); ctx.fill();   // 윗면 광택
    ctx.globalCompositeOperation = 'lighter';                                          // 앞머리의 빛
    ctx.globalAlpha = 0.9;
    ctx.drawImage(glowSprite('160,235,255'), bx + 2 + w - 13, by - 5, 26, 26);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  if (J.xpFlash > 0) {                                                                 // 방금 얻었다: 하얗게 번쩍
    ctx.globalAlpha = J.xpFlash / 0.18 * 0.5;
    ctx.fillStyle = '#fff'; rr(bx + 2, by + 2, w, 12, 6); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; rr(bx + 0.5, by + 0.5, bw - 1, 15, 8); ctx.stroke();   // 테두리
  ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(label, VW / 2, by + 8.5);
  ctx.fillStyle = '#fff'; ctx.fillText(label, VW / 2, by + 8.5);
}

// 화면 아래 보스 체력 막대. b: 보스.
// 실제 체력(빨강) 뒤에 잔상(노랑)이 천천히 따라 줄어서, 방금 얼마나 깎았는지가 눈에 보인다.
function drawBossBar(b) {
  const J = G.juice, w = Math.min(420, VW - 40), x = (VW - w) / 2, y = VH - 60 - SAFE_BOTTOM, h = 16;
  const r = clamp(b.hp / b.maxHp, 0, 1), inner = w - 4;
  ctx.fillStyle = 'rgba(0,0,0,.78)'; rr(x - 3, y - 3, w + 6, h + 6, 11); ctx.fill();                 // 틀
  ctx.fillStyle = '#fde68a'; rr(x + 2, y + 2, inner * clamp(J.bossLag, 0, 1), h - 4, 6); ctx.fill();  // 잔상
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#f87171'); gr.addColorStop(1, '#b91c1c');
  ctx.fillStyle = gr; rr(x + 2, y + 2, inner * r, h - 4, 6); ctx.fill();                              // 실제 체력
  ctx.fillStyle = 'rgba(255,255,255,.25)'; rr(x + 4, y + 3.5, Math.max(0, inner * r - 4), 3.5, 2); ctx.fill();   // 광택
  ctx.fillStyle = 'rgba(0,0,0,.35)';                                                                   // 10% 눈금
  for (let i = 1; i < 10; i++) ctx.fillRect(x + 2 + inner * i / 10 - 0.5, y + 2, 1, h - 4);
  ctx.strokeStyle = 'rgba(254,202,202,.6)'; ctx.lineWidth = 1.5; rr(x - 2.5, y - 2.5, w + 5, h + 5, 10); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 14px sans-serif';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  ctx.strokeText('👑 ' + b.name, VW / 2, y - 13); ctx.fillStyle = '#fff'; ctx.fillText('👑 ' + b.name, VW / 2, y - 13);
  ctx.font = '900 10px sans-serif'; ctx.fillText(Math.ceil(r * 100) + '%', VW / 2, y + h / 2 + 0.5);   // 남은 체력 %
}

// 화면 가운데 위쪽의 알림 띠 (스테이지 이름, 엘리트 등장, 보스 처치 …).
// 가운데는 진하고 양끝은 투명해서 화면에 떠 있는 느낌이 난다. 등장 순간 글자가 커졌다 줄어든다.
function drawBanner() {
  const b = G.banner;
  if (!b || G.juice.intro) return;                   // 보스 등장 연출 중에는 겹치지 않게 띠를 숨긴다
  const age = 2.4 - b.t;                             // 2.4 = showBanner 가 주는 수명 (초)
  const a = Math.min(1, b.t * 2.5, age * 8);         // 0.125초에 나타나고 마지막 0.4초에 사라진다
  const pop = 1 + 0.35 * Math.max(0, 1 - age / 0.16);
  const y = VH * 0.28, h = b.sub ? 66 : 52;
  ctx.globalAlpha = a;
  const gr = ctx.createLinearGradient(0, 0, VW, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.22, 'rgba(0,0,0,.72)');
  gr.addColorStop(0.78, 'rgba(0,0,0,.72)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, y - h / 2, VW, h);
  ctx.fillStyle = b.color;                           // 위아래 얇은 색 줄
  ctx.globalAlpha = a * 0.75;
  ctx.fillRect(VW * 0.16, y - h / 2 - 1, VW * 0.68, 2);
  ctx.fillRect(VW * 0.16, y + h / 2 - 1, VW * 0.68, 2);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  // 글자가 화면보다 길면 맞게 줄인다 (좁은 폰에서 긴 문장이 잘리지 않게)
  let px = 23;
  ctx.font = `900 ${px}px sans-serif`;
  const tw = ctx.measureText(b.text).width;
  if (tw > VW - 28) px = Math.floor(px * (VW - 28) / tw);
  ctx.font = `900 ${Math.round(px * pop)}px sans-serif`;
  const ty = b.sub ? y - 10 : y + 1;
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(b.text, VW / 2, ty);
  ctx.fillStyle = b.color; ctx.fillText(b.text, VW / 2, ty);
  if (b.sub) {                                       // 둘째 줄 (작은 설명)
    ctx.font = '700 13px sans-serif';
    ctx.fillStyle = '#e5e7eb'; ctx.fillText(b.sub, VW / 2, y + 17);
  }
  ctx.globalAlpha = 1;
}

// 보스 등장 연출: 화면이 어두워지고 경고 줄무늬가 흐르는 검은 띠 위에
// 처음 1초는 "WARNING" 이 깜빡이고, 그다음 보스 이름이 크게 찍힌다.
function drawBossIntro() {
  const I = G.juice.intro;
  if (!I) return;
  const t = I.t, a = Math.min(1, t / 0.2, (I.life - t) / 0.3);   // 0.2초에 나타나고 마지막 0.3초에 사라진다
  const y = VH * 0.36, h = 92, top = y - h / 2;
  ctx.fillStyle = `rgba(0,0,0,${0.4 * a})`; ctx.fillRect(0, 0, VW, VH);             // 화면 전체를 어둡게
  ctx.fillStyle = `rgba(14,0,0,${0.88 * a})`; ctx.fillRect(0, top, VW, h);          // 검붉은 띠
  // 경고 줄무늬 (노랑 바탕에 검은 사선). 위 줄은 오른쪽, 아래 줄은 왼쪽으로 흐른다
  ctx.globalAlpha = a;
  for (const [sy, dir] of [[top - 9, 1], [top + h, -1]]) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, sy, VW, 9); ctx.clip();
    ctx.fillStyle = '#facc15'; ctx.fillRect(0, sy, VW, 9);
    ctx.fillStyle = '#18181b';
    const off = (t * 60 * dir) % 28;                 // 28px 마다 반복, 1초에 60px 흐름
    for (let x = -56 + off; x < VW + 28; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + 14, sy); ctx.lineTo(x + 5, sy + 9); ctx.lineTo(x - 9, sy + 9); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (t < 1) {
    // 1단계: WARNING — 1초에 약 3번 깜빡임
    ctx.globalAlpha = a * (Math.sin(t * 19) > -0.2 ? 1 : 0.25);
    ctx.font = '900 38px sans-serif';
    ctx.lineWidth = 6; ctx.strokeStyle = '#450a0a'; ctx.strokeText('⚠ WARNING ⚠', VW / 2, y);
    ctx.fillStyle = '#ef4444'; ctx.fillText('⚠ WARNING ⚠', VW / 2, y);
  } else {
    // 2단계: 보스 이름 — 1.7배로 나타나 0.18초 만에 제 크기로 "쾅" 찍힌다
    const pop = 1 + 0.7 * Math.max(0, 1 - (t - 1) / 0.18);
    ctx.font = '800 13px sans-serif'; ctx.fillStyle = '#fca5a5'; ctx.fillText('— 보스 등장 —', VW / 2, y - 26);
    let px = 32;
    ctx.font = `900 ${px}px sans-serif`;
    const tw = ctx.measureText('👑 ' + I.name).width;
    if (tw > VW - 30) px = Math.floor(px * (VW - 30) / tw);     // 이름이 길면 화면에 맞게 줄인다
    ctx.font = `900 ${Math.round(px * pop)}px sans-serif`;
    ctx.lineWidth = 6; ctx.strokeStyle = '#450a0a'; ctx.strokeText('👑 ' + I.name, VW / 2, y + 8);
    ctx.fillStyle = '#fde68a'; ctx.fillText('👑 ' + I.name, VW / 2, y + 8);
  }
  ctx.globalAlpha = 1;
}

// 콤보 표시 (화면 오른쪽). top: 그리기 시작할 세로 위치 (CSS px).
// 숫자는 처치할 때마다 튀어 오르고, 수가 커질수록 색이 뜨거워진다. 아래 막대는 끊기기까지 남은 시간.
function drawCombo(top) {
  const J = G.juice;
  if (J.combo < COMBO_SHOW) return;
  const n = J.combo, tier = n >= 200 ? 4 : n >= 100 ? 3 : n >= 50 ? 2 : n >= 20 ? 1 : 0, col = COMBO_COLS[tier];
  const x = VW - 14, px = Math.round((28 + tier * 3) * (1 + J.comboPop * 0.35));
  ctx.globalAlpha = Math.min(1, J.comboT / 0.5);     // 끊기기 0.5초 전부터 흐려진다
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.font = `italic 900 ${px}px sans-serif`;
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(n, x, top + 16);
  ctx.fillStyle = col; ctx.fillText(n, x, top + 16);
  ctx.font = 'italic 900 11px sans-serif';
  ctx.lineWidth = 3; ctx.strokeText('COMBO', x, top + 38);
  ctx.fillStyle = '#fff'; ctx.fillText('COMBO', x, top + 38);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 62, top + 47, 62, 3);           // 남은 시간 막대 바탕
  ctx.fillStyle = col; ctx.fillRect(x - 62 * J.comboT / COMBO_KEEP, top + 47, 62 * J.comboT / COMBO_KEEP, 3);
  if (J.callout) {
    // 외침: 1.4초 동안, 처음에 커졌다 줄며 나타나고 마지막 0.3초에 사라진다
    const c = J.callout, pop = 1 + 0.5 * Math.max(0, (c.t - 1.25) / 0.15);
    ctx.globalAlpha = Math.min(1, c.t / 0.3);
    ctx.font = `italic 900 ${Math.round(17 * pop)}px sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(c.text, x, top + 66);
    ctx.fillStyle = '#fde047'; ctx.fillText(c.text, x, top + 66);
  }
  ctx.globalAlpha = 1;
}
