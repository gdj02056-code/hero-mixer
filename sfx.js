'use strict';
// ============================================================
//  SFX — 효과음 (소리 파일 없이 브라우저의 Web Audio 로 직접 합성)
//
//  역할  : sfx('이름') 한 줄로 짧은 효과음을 낸다. 그림 파일처럼 받아 올 것이 없어서
//          오프라인에서도 그대로 동작하고 용량도 늘지 않는다.
//  입력  : sfx(name, arg) — name 은 아래 switch 의 이름, arg 는 일부 소리의 추가 값
//          (예: 'gem' 의 arg = 연달아 주운 횟수 → 소리가 한 음씩 높아진다)
//  출력  : 스피커. 설정에서 끄면(S.sfx === false) 아무 소리도 내지 않는다.
//  순서  : 첫 터치/키 입력 → sfxUnlock() 이 오디오 장치를 연다 → 그 뒤부터 sfx() 가 소리를 낸다.
//          (브라우저 정책: 사용자가 화면을 한 번 건드리기 전에는 소리를 낼 수 없다)
//
//  소리 만드는 방법은 두 가지뿐이다:
//   - tone  : 음높이가 있는 소리. 파형(sine 부드러움 / triangle 맑음 / square 게임기 / sawtooth 거침)을
//             고르고, 시작 주파수에서 끝 주파수로 미끄러지게 한다.
//   - noise : 음높이가 없는 "치익" 소리(타격·폭발). 필터로 밝기를 정한다.
//  둘 다 0.008초 만에 커졌다가 지정한 길이 동안 작아지는 음량 곡선을 쓴다 (뚝 끊기는 잡음 방지).
// ============================================================

const SFX = {
  ac: null,      // AudioContext — 첫 입력 전에는 null
  out: null,     // 모든 소리가 모이는 전체 음량 노드
  noise: null,   // 1초짜리 흰 잡음 (noise() 가 잘라 쓴다)
  last: {},      // 소리 이름 → 마지막으로 낸 시각(ms). 같은 소리가 너무 촘촘히 겹치지 않게 한다
};

// 같은 이름의 소리 사이에 두는 최소 간격 (ms).
// 수십 마리를 한꺼번에 때려도 소리가 뭉개지거나 찢어지지 않게 하는 값이다. 없는 이름은 간격 0.
const SFX_GAP = { hit: 55, crit: 70, kill: 45, gem: 35, gold: 60, hurt: 150, click: 40, elite: 200, combo: 300 };

// 오디오 장치를 연다. 첫 pointerdown / keydown 에서 불린다 (그 전에는 브라우저가 막는다).
function sfxUnlock() {
  if (SFX.ac) {
    // 이미 열려 있다: 앱을 내렸다 올리면 멈춰 있을 수 있으니 다시 깨운다
    if (SFX.ac.state === 'suspended') SFX.ac.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;   // 옛 사파리는 webkit 접두
  if (!AC) return;                                               // 지원하지 않는 브라우저: 조용히 무음
  const ac = SFX.ac = new AC();
  // 전체 음량 0.5 → 압축기 → 스피커. 압축기는 여러 소리가 겹쳐 커질 때 자동으로 눌러 준다
  const master = ac.createGain(), comp = ac.createDynamicsCompressor();
  master.gain.value = 0.5;
  master.connect(comp);
  comp.connect(ac.destination);
  SFX.out = master;
  // 흰 잡음 1초: -1 ~ +1 사이의 난수로 채운 버퍼
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  SFX.noise = buf;
}
addEventListener('pointerdown', sfxUnlock, { passive: true });
addEventListener('keydown', sfxUnlock);

// 음높이가 있는 소리 하나.
//   type : 'sine' | 'triangle' | 'square' | 'sawtooth'
//   f0→f1: 시작 → 끝 주파수 (Hz). 같으면 음이 변하지 않는다
//   dur  : 길이 (초)      vol : 최대 음량 (0~1, 보통 0.05~0.2)      delay : 지금부터 몇 초 뒤에 시작
function tone(type, f0, f1, dur, vol, delay = 0) {
  const ac = SFX.ac, t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);   // 20Hz 아래는 안 들린다
  // 음량 곡선: 거의 0 → vol (0.008초) → 거의 0 (dur). 지수 곡선은 0 을 못 쓰므로 0.0001 을 쓴다
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(SFX.out);
  o.start(t0);
  o.stop(t0 + dur + 0.02);                       // 곡선이 끝난 직후 정지 → 노드가 자동으로 정리된다
}

// 음높이가 없는 잡음 하나.
//   freq : 필터 중심 주파수 (Hz) — 높을수록 밝고 날카롭다      q : 필터의 좁기 (클수록 "휘익" 같은 색)
//   kind : 'bandpass' 그 근처만 통과 | 'lowpass' 그 아래만 통과(둔탁한 폭발음)
function noise(freq, q, dur, vol, delay = 0, kind = 'bandpass') {
  const ac = SFX.ac, t0 = ac.currentTime + delay, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = SFX.noise;
  f.type = kind;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(SFX.out);
  src.start(t0, Math.random() * 0.5, dur + 0.02);   // 버퍼의 아무 지점에서 시작 → 매번 조금씩 다른 소리
}

// 효과음 하나를 낸다. name: 아래 이름 중 하나, arg: 소리에 따라 쓰는 추가 값.
function sfx(name, arg) {
  const ac = SFX.ac;
  // 아직 못 열었거나, 멈췄거나, 게임이 다 켜지기 전(저장 데이터 S 가 아직 없음)이거나, 설정에서 껐다
  if (!ac || ac.state !== 'running' || !window.__booted || S.sfx === false) return;
  const now = performance.now(), gap = SFX_GAP[name] || 0;
  if (now - (SFX.last[name] || 0) < gap) return;                  // 방금 같은 소리를 냈다: 건너뛴다
  SFX.last[name] = now;
  const j = 0.94 + Math.random() * 0.12;                          // 매번 음높이를 ±6% 흔들어 기계적이지 않게
  switch (name) {
    case 'hit':       // 타격: 짧은 "탁" (잡음) + 낮은 "툭"
      noise(1900, 1.2, 0.05, 0.1);
      tone('square', 210 * j, 120, 0.05, 0.04);
      break;
    case 'crit':      // 치명타: 더 밝은 "챙"
      noise(3200, 2, 0.07, 0.12);
      tone('triangle', 900 * j, 1500, 0.08, 0.1);
      break;
    case 'kill':      // 처치: 위에서 아래로 떨어지는 "퐁"
      tone('sine', 560 * j, 170, 0.1, 0.13);
      break;
    case 'elite':     // 강한 적 처치: 묵직한 "쿵" + 밝은 마무리
      noise(500, 0.8, 0.22, 0.2, 0, 'lowpass');
      tone('sine', 200, 60, 0.25, 0.2);
      tone('triangle', 660, 990, 0.12, 0.1, 0.05);
      break;
    case 'gem': {     // 경험치: 맑은 "띵". 연달아 주우면 반음씩 올라간다 (arg = 단계 0~14)
      const f = 660 * Math.pow(2, (arg || 0) / 12);               // 반음 하나 = 주파수 2^(1/12) 배
      tone('triangle', f, f * 1.5, 0.06, 0.07);
      break;
    }
    case 'gold':      // 골드: 동전 두 번 "짤랑"
      tone('square', 1320, 1320, 0.05, 0.04);
      tone('square', 1760, 1760, 0.08, 0.04, 0.05);
      break;
    case 'hurt':      // 피격: 낮게 떨어지는 거친 "으윽"
      tone('sawtooth', 240, 70, 0.2, 0.16);
      noise(600, 0.7, 0.14, 0.14, 0, 'lowpass');
      break;
    case 'levelup':   // 레벨업: 도-미-솔-높은 도 로 올라가는 팡파르
      [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.14, 0.13, i * 0.08));
      tone('sine', 1047, 2093, 0.3, 0.05, 0.32);                  // 끝에 반짝이는 꼬리
      break;
    case 'pick':      // 카드 선택: 위로 "뿅"
      tone('triangle', 700, 1400, 0.1, 0.12);
      tone('sine', 1400, 2100, 0.15, 0.05, 0.06);
      break;
    case 'combo':     // 콤보 달성: 두 음 "따-당"
      tone('square', 784, 784, 0.07, 0.06);
      tone('square', 1175, 1175, 0.12, 0.06, 0.07);
      break;
    case 'boss':      // 보스 등장: 낮은 사이렌 두 번 + 바닥을 울리는 저음
      tone('sawtooth', 170, 260, 0.45, 0.1);
      tone('sawtooth', 170, 260, 0.45, 0.1, 0.5);
      tone('sine', 55, 45, 1.1, 0.25);
      break;
    case 'bossdown':  // 보스 처치: 큰 폭발 + 승리 화음
      noise(350, 0.6, 0.7, 0.3, 0, 'lowpass');
      tone('sine', 120, 40, 0.6, 0.25);
      [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.5, 0.09, 0.25 + i * 0.04));
      break;
    case 'chest':     // 보물상자: 빠르게 올라가는 반짝임
      [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.1, 0.1, i * 0.055));
      break;
    case 'win':       // 승리: 길게 올라가는 팡파르
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, i === 4 ? 0.5 : 0.16, 0.13, i * 0.11));
      break;
    case 'lose':      // 패배: 아래로 내려가는 세 음
      [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.97, 0.3, 0.12, i * 0.2));
      break;
    case 'click':     // 버튼: 아주 짧은 "톡"
      tone('sine', 720, 540, 0.035, 0.06);
      break;
    default:          // 모르는 이름: 아무 소리도 내지 않는다
      break;
  }
}

// 로비·창의 버튼과 타일을 누를 때마다 "톡".
// 캡처 단계(true)에서 듣기 때문에, 버튼의 onclick 이 화면을 새로 그려 버튼이 사라져도 소리는 난다.
document.addEventListener('click', e => {
  if (e.target.closest && e.target.closest('button,.itile,.htile,.rtile')) sfx('click');
}, true);
