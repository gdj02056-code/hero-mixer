'use strict';
// ============================================================
//  HERO MIXER — shop (every price is ₩0)
// ============================================================
const won = n => '₩' + n.toLocaleString();
const DAY_MS = 86400000;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
let shopTab = 'hot';

// ---------- reward helpers ----------
function giveExpPotions(n) { let ups = 0; for (let i = 0; i < n; i++) ups += addCexp(Math.ceil(cexpNeed(S.clv) * 0.6)); return ups; }
function giveShards(kind, id, n) {
  const pool = kind === 'hero' ? S.heroes : S.pets;
  if (!pool[id]) { (kind === 'hero' ? addHero : addPet)(id); n--; }
  pool[id].shards += n;
}
function pickHeroModal(list) {
  const box = showModal(`<h2>🦸 영웅 선택</h2><div class="center sub">받고 싶은 영웅을 골라주세요</div>
    <div class="hgrid">${list.map(h => heroTile(h.id)).join('')}</div>`);
  box.querySelectorAll('.htile').forEach(t => t.onclick = () => {
    const id = t.dataset.hero, isNew = addHero(id);
    save(); closeModal(); toast(`🦸 ${HERO[id].name} ${isNew ? '획득!' : '조각 +1'}`); renderLobby();
  });
}

// ---------- daily deals ----------
const DEALS = [
  { icon: '⚔️', name: 'S~SSS급 무기', price: 19900, off: 85, give: () => `${itemName(newItem(5 + Math.floor(Math.random() * 3), 'weapon'))} 획득!` },
  { icon: '🛡️', name: 'SSS급 방어구', price: 29900, off: 80, give: () => `${itemName(newItem(7, pick(SLOTS.slice(1)).id))} 획득!` },
  { icon: '🦸', name: '랜덤 영웅 조각 x5', price: 9900, off: 70, give: () => { const h = pick(HEROES); giveShards('hero', h.id, 5); return `${h.name} 조각 +5`; } },
  { icon: '🐾', name: '랜덤 펫 조각 x5', price: 9900, off: 70, give: () => { const p = pick(PETS); giveShards('pet', p.id, 5); return `${p.name} 조각 +5`; } },
  { icon: '🏺', name: '랜덤 유물 +3레벨', price: 14900, off: 75, give: () => { const r = pick(RELICS); S.relics[r.id] = Math.min(RELIC_MAX, (S.relics[r.id] || 0) + 3); return `${r.name} Lv.${S.relics[r.id]}`; } },
  { icon: '🪙', name: '골드 500만', price: 4900, off: 90, give: () => { S.gold += 5e6; return '🪙 +5,000,000'; } },
  { icon: '💎', name: '보석 1만', price: 9900, off: 90, give: () => { S.gems += 1e4; return '💎 +10,000'; } },
  { icon: '📘', name: '경험치 물약 x20', price: 6900, off: 80, give: () => { giveExpPotions(20); return `📘 캐릭터 Lv.${S.clv}`; } },
];
function ensureDeals(force) {
  if (!force && S.deals && S.deals.day === today()) return;
  S.deals = { day: today(), list: shuffle(DEALS.map((_, i) => i)).slice(0, 3), bought: [false, false, false] };
  save();
}

// ---------- catalog ----------
const SHOP_TABS = [['hot', '🔥 추천'], ['pack', '🎁 패키지'], ['summon', '📦 소환'], ['gold', '🪙 골드'], ['gem', '💎 보석'], ['etc', '🧪 기타']];
const amount = (cur, amt) => () => { S[cur] += amt; return `${cur === 'gold' ? '🪙' : '💎'} +${amt.toLocaleString()}`; };
const SHOP = {
  pack: [
    { sec: '🎁 시작 & 필수' },
    { id: 'starter', wide: true, icon: '🎁', name: '스타터 팩', desc: '💎5,000 + 🪙100,000 + SSS급 무기', price: 5900, once: 'starter', badge: '1회 한정', give: () => { S.gems += 5000; S.gold += 100000; return `💎5,000, 🪙100,000, ${itemName(newItem(7, 'weapon'))} 획득!`; } },
    { id: 'pass', wide: true, icon: '👑', name: '프리미엄 패스', desc: '전투 보상 2배 + 레벨업 선택지 4개', price: 14900, once: 'pass', give: () => '👑 프리미엄 패스 활성화!' },
    { id: 'monthly', wide: true, icon: '📅', name: '월정액 카드', desc: '즉시 💎3,000 + 30일간 매일 💎300·🪙100만', price: 4900, give: () => { S.monthlyUntil = Math.max(Date.now(), S.monthlyUntil || 0) + 30 * DAY_MS; S.gems += 3000; return `📅 월정액 ${Math.ceil((S.monthlyUntil - Date.now()) / DAY_MS)}일 남음 (추천 탭에서 매일 수령)`; } },
    { id: 'noads', wide: true, icon: '🚫', name: '광고 제거', desc: '모든 광고 제거 (사실 원래 없음)', price: 9900, once: 'noAds', give: () => '🚫 광고 제거 완료! (원래 없었지만)' },
    { sec: '⚔️ 장비' },
    { id: 'legend', wide: true, icon: '🌟', name: '전설 무기 상자', desc: '전설 등급 무기 1개 확정!', price: 99000, give: () => `🌟 ${itemName(newItem(9, 'weapon'))} 획득!!` },
    { id: 'legendset', wide: true, icon: '👑', name: '전설 장비 풀세트', desc: '8부위 전설 장비 + 바로 장착', price: 299000, badge: '인기', give: () => { for (const s of SLOTS) S.equip[s.id] = newItem(9, s.id).id; return '👑 전설 장비 8종 장착 완료!'; } },
    { id: 'epic5', icon: '💜', name: '에픽 장비 x5', desc: '랜덤 부위 에픽 5개', price: 59000, give: () => { for (let i = 0; i < 5; i++) newItem(8); return '💜 에픽 장비 5개 획득!'; } },
    { id: 'sss10', icon: '❤️', name: 'SSS 장비 x10', desc: '랜덤 부위 SSS 10개', price: 49000, give: () => { for (let i = 0; i < 10; i++) newItem(7); return '❤️ SSS 장비 10개 획득! 합성해 보세요'; } },
    { sec: '🦸 영웅 · 펫' },
    { id: 'urpick', wide: true, icon: '🦸', name: 'UR 영웅 선택권', desc: '원하는 UR 영웅 1명을 직접 선택', price: 49000, give: () => { pickHeroModal(HEROES.filter(h => h.r === 3)); return null; } },
    { id: 'awaken', wide: true, icon: '⭐', name: '영웅 각성 팩', desc: '사용 중 영웅 조각 +19 (5성 가능) + 🪙1,000만', price: 39000, give: () => { giveShards('hero', S.hero, 19); S.gold += 1e7; return `⭐ ${HERO[S.hero].name} 조각 +19, 🪙+10,000,000`; } },
    { id: 'dragonpet', icon: '🐉', name: '아기 용 알', desc: '전설 펫 확정', price: 29000, give: () => { const n = addPet('dragon'); return `🐉 아기 용 ${n ? '획득!' : '조각 +1'}`; } },
    { id: 'petall', icon: '🐾', name: '펫 컬렉션', desc: '모든 펫 획득', price: 59000, give: () => { for (const p of PETS) addPet(p.id); return '🐾 모든 펫 획득!'; } },
    { sec: '📈 성장' },
    { id: 'growpack', wide: true, icon: '🚀', name: '성장 패키지', desc: '🪙1,000만 + 📘경험치 물약 x30', price: 19900, give: () => { S.gold += 1e7; giveExpPotions(30); return `🚀 캐릭터 Lv.${S.clv}, 🪙+10,000,000`; } },
    { id: 'skillmaster', wide: true, icon: '⚗️', name: '스킬 마스터 팩', desc: '모든 스킬 해금 + 최대 레벨 + 진화', price: 49000, give: () => { for (const id in WEAPONS) S.skills[id] = { lv: MAX_WLV, evo: true }; return '⚗️ 모든 스킬 진화 완료!'; } },
    { id: 'relicpack', icon: '🏺', name: '유물 컬렉션', desc: '모든 유물 +5레벨', price: 39000, give: () => { for (const r of RELICS) S.relics[r.id] = Math.min(RELIC_MAX, (S.relics[r.id] || 0) + 5); return '🏺 모든 유물 +5레벨!'; } },
    { id: 'statpack', icon: '📈', name: '스탯 일괄 +10', desc: '모든 스탯 10레벨 상승', price: 29000, give: () => { for (const d of STATS) S.stats[d.id] = Math.min(d.max, (S.stats[d.id] || 0) + 10); return '📈 모든 스탯 +10!'; } },
    { sec: '💸 끝판왕' },
    { id: 'whale', wide: true, icon: '💸', name: '재벌 패키지', desc: '🪙100억 · 💎1,000만 · 전설 풀세트 · 모든 영웅/펫 5성 · 스킬/유물 MAX', price: 999000, badge: '최고가', give: () => {
      S.gold += 1e10; S.gems += 1e7;
      for (const s of SLOTS) S.equip[s.id] = newItem(9, s.id).id;
      for (const h of HEROES) giveShards('hero', h.id, 19);
      for (const p of PETS) giveShards('pet', p.id, 19);
      for (const id in WEAPONS) S.skills[id] = { lv: MAX_WLV, evo: true };
      for (const r of RELICS) S.relics[r.id] = RELIC_MAX;
      return '💸 재벌 등극! 모든 것을 손에 넣었습니다 (영웅·펫 승급은 각 탭에서)';
    } },
  ],
  gold: [
    { sec: '🪙 골드 충전' },
    { id: 'g1', icon: '🪙', name: '골드 한 줌', desc: '🪙 10,000', price: 1100, give: amount('gold', 1e4) },
    { id: 'g2', icon: '💵', name: '골드 주머니', desc: '🪙 50,000', price: 3300, give: amount('gold', 5e4) },
    { id: 'g3', icon: '💰', name: '골드 자루', desc: '🪙 200,000', price: 5500, give: amount('gold', 2e5) },
    { id: 'g4', icon: '🧺', name: '골드 바구니', desc: '🪙 1,000,000', price: 11000, give: amount('gold', 1e6) },
    { id: 'g5', icon: '📦', name: '골드 상자', desc: '🪙 5,000,000', price: 33000, give: amount('gold', 5e6) },
    { id: 'g6', icon: '🛒', name: '골드 수레', desc: '🪙 30,000,000', price: 55000, give: amount('gold', 3e7) },
    { id: 'g7', icon: '🏛️', name: '골드 창고', desc: '🪙 100,000,000', price: 99000, give: amount('gold', 1e8) },
    { id: 'g8', icon: '🏦', name: '골드 은행', desc: '🪙 1,000,000,000', price: 199000, badge: '10억', give: amount('gold', 1e9) },
    { sec: '✨ 골드 옵션' },
    { custom: 'gold' },
    { id: 'goldboost', wide: true, icon: '💰', name: '골드 획득 2배 (영구)', desc: '전투·모험 골드 획득량 +100%', price: 29000, once: 'goldBoost', give: () => '💰 골드 획득량 영구 2배!' },
    { id: 'infgold', wide: true, icon: '♾️', name: '골드 무한 모드', desc: '골드가 모자라면 자동으로 채워져요 (강화가 안 막힘)', toggle: 'infGold' },
  ],
  gem: [
    { sec: '💎 보석 충전 · 첫 구매 2배!' },
    { id: 'gem1', icon: '💎', name: '보석 한 줌', amt: 1000, price: 1200 },
    { id: 'gem2', icon: '💰', name: '보석 주머니', amt: 5500, price: 5900 },
    { id: 'gem3', icon: '👝', name: '보석 가방', amt: 12000, price: 12000 },
    { id: 'gem4', icon: '🧳', name: '보석 상자', amt: 30000, price: 29000 },
    { id: 'gem5', icon: '🏦', name: '보석 금고', amt: 100000, price: 59000 },
    { id: 'gem6', icon: '🏰', name: '보석 성', amt: 500000, price: 119000 },
    { sec: '✨ 보석 옵션' },
    { custom: 'gems' },
    { id: 'infgems', wide: true, icon: '♾️', name: '보석 무한 모드', desc: '보석이 모자라면 자동으로 채워져요 (뽑기가 안 막힘)', toggle: 'infGems' },
  ],
  etc: [
    { sec: '⚡ 에너지' },
    { id: 'energy', icon: '⚡', name: '에너지 충전', desc: `⚡ ${MAX_EN} 가득`, price: 1100, give: () => { S.energy = Math.max(S.energy, MAX_EN); return '⚡ 에너지 충전 완료!'; } },
    { id: 'infenergy', icon: '♾️', name: '에너지 무한', desc: '스테이지 입장 시 에너지 소모 없음', toggle: 'infEnergy' },
    { sec: '🧪 소모품' },
    { id: 'pot10', icon: '📘', name: '경험치 물약 x10', desc: '캐릭터 경험치', price: 3300, give: () => { giveExpPotions(10); return `📘 캐릭터 Lv.${S.clv}`; } },
    { id: 'pot100', icon: '📚', name: '경험치 물약 x100', desc: '캐릭터 경험치 대량', price: 29000, give: () => { giveExpPotions(100); return `📚 캐릭터 Lv.${S.clv}`; } },
    { id: 'shardbox', icon: '🧩', name: '영웅 조각 상자', desc: '랜덤 영웅 조각 x15', price: 9900, give: () => { for (let i = 0; i < 15; i++) giveShards('hero', pick(HEROES).id, 1); return '🧩 영웅 조각 15개 획득!'; } },
    { id: 'petsnack', icon: '🍖', name: '펫 간식', desc: '동행 펫 레벨 +5', price: 4900, give: () => { const st = S.pets[S.pet]; if (!st) return '🐾 먼저 펫을 동행시켜 주세요'; st.lv = Math.min(petMaxLv(st), st.lv + 5); return `🍖 ${PET[S.pet].name} Lv.${st.lv}`; } },
    { id: 'skillticket', icon: '🎫', name: '스킬 해금권', desc: '잠긴 스킬 1개 해금', price: 5900, give: () => { const locked = Object.keys(WEAPONS).filter(id => !S.skills[id]); if (!locked.length) return '모든 스킬이 이미 해금됐어요'; const id = pick(locked); S.skills[id] = { lv: 1, evo: false }; return `🎫 ${WEAPONS[id].name} 해금!`; } },
    { id: 'heroticket', icon: '🎟️', name: '영웅 소환권 x10', desc: '영웅 10회 소환', price: 27000, give: () => { S.gems += PULL_COST[10]; heroGacha(10); return null; } },
  ],
};
const SHOP_BY_ID = {};
for (const list of Object.values(SHOP)) for (const it of list) if (it.id) SHOP_BY_ID[it.id] = it;
for (const it of SHOP.gem) if (it.amt) {
  it.desc = `💎 ${it.amt.toLocaleString()}`;
  it.give = () => { const first = !(S.firstBuy || {})[it.id]; S.firstBuy = Object.assign(S.firstBuy || {}, { [it.id]: true }); const n = it.amt * (first ? 2 : 1); S.gems += n; return `💎 +${n.toLocaleString()}${first ? ' (첫 구매 2배!)' : ''}`; };
}

// ---------- purchase ----------
function buy(it) {
  if (it.toggle) {
    S[it.toggle] = !S[it.toggle]; save();
    toast(`${it.icon} ${it.name} ${S[it.toggle] ? 'ON' : 'OFF'}`); renderLobby();
    return;
  }
  const vip0 = vipLevel(S.spent);
  if (it.once) S[it.once] = true;
  S.spent += it.price;
  const msg = it.give();
  save();
  if (msg) toast('✅ 결제 완료 (₩0)<br>' + msg);
  const vip1 = vipLevel(S.spent);
  if (vip1 > vip0) setTimeout(() => toast(`👑 VIP ${vip1} 달성! 골드 +${vip1 * 5}% · 경험치 +${vip1 * 3}%`), 1900);
  renderLobby();
}

// ---------- rendering ----------
function shopCard(it) {
  if (it.custom) return customCard(it.custom);
  let btn;
  if (it.toggle) btn = `<button class="btn ${S[it.toggle] ? 'green' : 'gray'}" data-buy="${it.id}">${S[it.toggle] ? 'ON' : 'OFF'}</button>`;
  else {
    const owned = it.once && S[it.once];
    btn = `<button class="btn gold price" data-buy="${it.id}" ${owned ? 'disabled' : ''}>${owned ? '보유중' : `<s>${won(it.price)}</s>₩0`}</button>`;
  }
  const first = it.amt && !(S.firstBuy || {})[it.id];
  const badge = first ? '<span class="badge">첫 구매 2배</span>' : it.badge ? `<span class="badge">${it.badge}</span>` : '';
  return it.wide
    ? `<div class="sitem wide"><div class="si">${it.icon}</div><div class="info"><div class="sn">${it.name} ${badge}</div><div class="sd">${it.desc}</div></div>${btn}</div>`
    : `<div class="sitem">${badge ? `<div class="corner">${badge}</div>` : ''}<div class="si">${it.icon}</div><div class="sn">${it.name}</div><div class="sd">${it.desc}</div>${btn}</div>`;
}
function customCard(cur) {
  const icon = cur === 'gold' ? '🪙' : '💎';
  const quick = cur === 'gold' ? [[1e4, '+1만'], [1e6, '+100만'], [1e8, '+1억'], [1e10, '+100억']] : [[1e3, '+1천'], [1e4, '+1만'], [1e5, '+10만'], [1e6, '+100만']];
  return `<div class="sitem wide custom"><div class="info">
      <div class="sn">🧮 원하는 만큼 ${cur === 'gold' ? '골드' : '보석'}</div>
      <div class="camt"><span>${icon}</span><input type="number" inputmode="numeric" min="0" id="amt_${cur}" value="${cur === 'gold' ? 1000000 : 10000}"></div>
      <div class="qbtns">${quick.map(([v, l]) => `<button data-q="${v}" data-cur="${cur}">${l}</button>`).join('')}<button data-q="0" data-cur="${cur}">초기화</button></div>
    </div><button class="btn gold" data-custom="${cur}">₩0<br>받기</button></div>`;
}
function renderList(el, list) {
  let html = '', open = false;
  for (const it of list) {
    if (it.sec) { if (open) html += '</div>'; html += `<h3>${it.sec}</h3><div class="sgrid">`; open = true; continue; }
    html += shopCard(it);
  }
  el.innerHTML = html + (open ? '</div>' : '');
}
function shopHot(el) {
  ensureDeals();
  const v = vipLevel(S.spent), next = VIP_TIERS[v + 1], prev = VIP_TIERS[v];
  const pct = next ? (S.spent - prev) / (next - prev) * 100 : 100;
  const monthly = (S.monthlyUntil || 0) > Date.now();
  const claimed = S.monthlyClaim === today();
  el.innerHTML = `
    <div class="vip"><div class="vlv">VIP<b>${v}</b></div><div class="vinfo">
      <div>아낀 돈 <b>${won(S.spent)}</b></div>
      <div class="expbar"><div style="width:${pct}%"></div><span>${next ? `다음 VIP까지 ${won(next - S.spent)}` : 'VIP MAX'}</span></div>
      <small>VIP 혜택: 골드 +${v * 5}% · 경험치 +${v * 3}% (₩0 결제할수록 올라가요)</small></div></div>
    ${monthly ? `<div class="sitem wide"><div class="si">📅</div><div class="info"><div class="sn">월정액 카드 <span class="badge">${Math.ceil((S.monthlyUntil - Date.now()) / DAY_MS)}일 남음</span></div><div class="sd">매일 💎300 + 🪙100만</div></div><button class="btn ${claimed ? 'gray' : 'green'}" id="claim" ${claimed ? 'disabled' : ''}>${claimed ? '수령 완료' : '받기'}</button></div>` : ''}
    <h3>🔥 오늘의 특가 <small>매일 자정 교체</small> <button class="btn gray mini" id="dealRefresh">🔄 새로고침 (무료)</button></h3>
    <div class="sgrid deals">${S.deals.list.map((di, i) => {
      const d = DEALS[di], done = S.deals.bought[i];
      return `<div class="sitem deal"><div class="corner"><span class="badge">-${d.off}%</span></div><div class="si">${d.icon}</div><div class="sn">${d.name}</div><div class="sd">1일 1회</div>
        <button class="btn gold price" data-deal="${i}" ${done ? 'disabled' : ''}>${done ? '구매 완료' : `<s>${won(d.price)}</s>₩0`}</button></div>`;
    }).join('')}</div>
    <h3>⭐ 추천 상품</h3><div class="sgrid">${['starter', 'legendset', 'monthly', 'urpick', 'whale'].map(id => shopCard(SHOP_BY_ID[id])).join('')}</div>`;
  const cl = el.querySelector('#claim');
  if (cl) cl.onclick = () => { S.monthlyClaim = today(); S.gems += 300; S.gold += 1e6; save(); toast('📅 오늘의 보상: 💎300 + 🪙1,000,000'); renderLobby(); };
  el.querySelector('#dealRefresh').onclick = () => { ensureDeals(true); toast('🔄 특가 상품 교체!'); renderLobby(); };
  el.querySelectorAll('[data-deal]').forEach(b => b.onclick = () => {
    const i = +b.dataset.deal, d = DEALS[S.deals.list[i]], vip0 = vipLevel(S.spent);
    S.deals.bought[i] = true; S.spent += d.price;
    const msg = d.give(); save(); toast('✅ 결제 완료 (₩0)<br>' + msg);
    const vip1 = vipLevel(S.spent);
    if (vip1 > vip0) setTimeout(() => toast(`👑 VIP ${vip1} 달성!`), 1900);
    renderLobby();
  });
}
function shopSummon(el) {
  const row = (icon, name, desc, kind, costs, rates) => `<div class="sitem wide sum"><div class="sumtop"><div class="si">${icon}</div><div class="info"><div class="sn">${name}</div><div class="sd">${desc}</div></div></div>
    <div class="sbtns">${[0, 1, 10, 30].map(n => `<button class="btn ${n === 0 ? 'green' : n === 30 ? 'purple' : ''}" data-sum="${kind}" data-n="${n}">${n === 0 ? '무료' : n + '회'}<br><small>${n === 0 ? '광고 X' : '💎' + fmt(costs[n])}</small></button>`).join('')}</div>
    <div class="rates">${rates}</div></div>`;
  const rates = (names, w) => names.map((r, i) => `<span style="color:${r.c}">${r.n} ${pctOf(w, i)}%</span>`).join(' ');
  el.innerHTML = `<h3>📦 소환 & 뽑기</h3><div class="sgrid">
    ${row('📦', '장비 상자', '10회 이상 C등급 1개 확정 · 에픽·전설은 합성으로만', 'equip', PULL_COST, rates(GRADES.slice(0, 8), GACHA_W))}
    <div class="sitem wide sum lucky"><div class="sumtop"><div class="si">🍀</div><div class="info"><div class="sn">확률 UP 행운 상자 <span class="badge">A 이상 확정</span></div><div class="sd">B 이상 확률 3배 이상 · 10회 시 A등급 이상 1개 확정</div></div></div>
      <div class="sbtns"><button class="btn purple" id="lucky">10회<br><small>💎5,000</small></button></div></div>
    ${row('🦸', '영웅 소환', '중복 시 조각 → 승급 재료', 'hero', PULL_COST, rates(HRAR, HERO_GACHA_W))}
    ${row('🥚', '펫 알', '중복 시 조각 → 승급 재료', 'pet', PET_COST, rates(PRAR, PET_GACHA_W))}
    ${row('🏺', '유물 상자', '중복 시 유물 레벨 +1', 'relic', RELIC_COST, rates(PRAR, RELIC_W))}
  </div>`;
  el.querySelectorAll('[data-sum]').forEach(b => b.onclick = () => ({ equip: gacha, hero: heroGacha, pet: petGacha, relic: relicGacha })[b.dataset.sum](+b.dataset.n));
  el.querySelector('#lucky').onclick = () => gacha(10, { cost: 5000, luck: 15, min: 4 });
}
function pageShop(pg) {
  pg.innerHTML = `<div class="shoptabs">${SHOP_TABS.map(([id, n]) => `<button data-st="${id}" class="${shopTab === id ? 'on' : ''}">${n}</button>`).join('')}</div><div id="shopBody"></div>
    <div class="tips">💸 지금까지 아낀 돈: <b>${won(S.spent)}</b> · 👑 VIP ${vipLevel(S.spent)}</div>`;
  pg.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { shopTab = b.dataset.st; renderLobby(); $('#page').scrollTop = 0; });
  const body = pg.querySelector('#shopBody');
  if (shopTab === 'hot') shopHot(body);
  else if (shopTab === 'summon') shopSummon(body);
  else renderList(body, SHOP[shopTab]);
  body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(SHOP_BY_ID[b.dataset.buy]));
  body.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
    const inp = body.querySelector('#amt_' + b.dataset.cur), q = +b.dataset.q;
    inp.value = q ? Math.min(1e15, (+inp.value || 0) + q) : 0;
  });
  body.querySelectorAll('[data-custom]').forEach(b => b.onclick = () => {
    const cur = b.dataset.custom, amt = Math.floor(Math.min(1e15, +body.querySelector('#amt_' + cur).value || 0));
    if (amt <= 0) { toast('받을 양을 입력해 주세요'); return; }
    S[cur] += amt; S.spent += Math.ceil(amt / (cur === 'gold' ? 1000 : 10));
    save(); toast(`✅ 결제 완료 (₩0)<br>${cur === 'gold' ? '🪙' : '💎'} +${amt.toLocaleString()}`); renderLobby();
  });
}

// ---------- gacha ----------
const PULL_COST = { 0: 0, 1: 300, 10: 2700, 30: 7500 };
const PET_COST = { 0: 0, 1: 250, 10: 2250, 30: 6000 };
const RELIC_COST = { 0: 0, 1: 200, 10: 1800, 30: 4800 };
function gacha(n, opt = {}) {
  if (!spend('gems', opt.cost != null ? opt.cost : PULL_COST[n])) return;
  const got = [];
  for (let i = 0; i < Math.max(1, n); i++) got.push(newItem(rollGrade(opt.luck || 0)));
  const min = opt.min != null ? opt.min : 2;
  if (n >= 10 && !got.some(i => i.g >= min)) got[got.length - 1].g = min;
  save(); refreshTop();
  const best = Math.max(...got.map(i => i.g));
  const box = showModal(`<h2 style="color:${GRADES[best].c}">${best >= 7 ? '🌈 SSS 등급!!' : best >= 5 ? '✨ S 등급 이상!' : '📦 장비 획득'}</h2>
    <div class="ggrid">${got.map((it, i) => itemTile(it, 'pop', `animation-delay:${i * 0.05}s`)).join('')}</div>
    <div class="row"><button class="btn gray" id="ok">확인</button><button class="btn purple" id="again">한 번 더</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); renderLobby(); };
  box.querySelector('#again').onclick = () => { closeModal(); gacha(n, opt); };
}
