'use strict';
// ============================================================
//  HERO MIXER — lobby UI
// ============================================================

// ---------- modal / toast ----------
function showModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); return $('#modalBox'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }
let toastTimer = 0;
function toast(msg) { const t = $('#toast'); t.innerHTML = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800); }

// ---------- tiles ----------
function itemArt(it) { return it.slot === 'weapon' ? `<img src="${weaponIcon(it.wt, it.g)}" alt="">` : `<span class="emo">${SLOT[it.slot].icon}</span>`; }
function itemTile(it, cls = '', style = '') {
  const gr = GRADES[it.g];
  return `<div class="itile g${it.g} ${cls}" data-id="${it.id}" style="--c:${gr.c};${style}">${itemArt(it)}<span class="gb">${gr.n}</span><span class="lv">Lv${it.lv}</span>${isEquipped(it) ? '<span class="eq">E</span>' : ''}</div>`;
}
const heroTile = (id, extra = '') => `<div class="htile" data-hero="${id}" style="--c:${HRAR[HERO[id].r].c}"><img src="${heroIcon(id)}" alt=""><span class="gb">${HRAR[HERO[id].r].n}</span>${extra}</div>`;
const petTile = (id, extra = '') => `<div class="htile" data-pet="${id}" style="--c:${PRAR[PET[id].r].c}"><img src="${petIcon(id)}" alt=""><span class="gb">${PRAR[PET[id].r].n}</span>${extra}</div>`;
const starsHTML = n => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;

// ---------- animated hero preview canvases ----------
function drawPreviews(t) {
  for (const c of document.querySelectorAll('canvas.preview')) {
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) continue;
    if (c.width !== Math.round(w * DPR)) { c.width = Math.round(w * DPR); c.height = Math.round(h * DPR); }
    const x = c.getContext('2d');
    x.setTransform(DPR, 0, 0, DPR, 0, 0); x.clearRect(0, 0, w, h); x.lineJoin = 'round';
    const hero = HERO[c.dataset.hero !== undefined ? c.dataset.hero : S.hero], wItem = getItem(S.equip.weapon);
    const pet = c.dataset.pet !== undefined ? c.dataset.pet : S.pet;
    const cyc = t % 1.8, swing = cyc < 0.4 ? cyc / 0.4 : -1;
    const sc = Math.min(w / 70, h / 60);
    x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.ellipse(w / 2, h / 2 + sc * 18, sc * 30, sc * 7, 0, 0, TAU); x.fill();
    if (hero) {
      x.save(); x.translate(w / 2 - (pet ? sc * 9 : 0), h / 2 + sc * 4); x.scale(sc, sc);
      drawHero(x, 0, 0, { look: hero.look, wt: wItem ? wItem.wt : null, grade: wItem ? wItem.g : 0, aim: 0, face: 1, walk: 0, swing }, t);
      x.restore();
    }
    if (pet) { x.save(); x.translate(w / 2 + sc * (hero ? 22 : 0), h / 2 + sc * 4); x.scale(sc, sc); drawPet(x, pet, 0, 0, t, hero ? -1 : 1); x.restore(); }
  }
}

// ---------- lobby shell ----------
let tab = 'battle', selStage = 1, equipFilter = 'all', viewHero = null, viewPet = null, growTab = 'stats';
function refreshTop() {
  tickEnergy();
  const f = (v, s) => (v >= 100 ? Math.floor(v) : v.toFixed(1)) + s;
  const short = n => n >= 1e9 ? f(n / 1e9, 'B') : n >= 1e6 ? f(n / 1e6, 'M') : n >= 1e4 ? f(n / 1e3, 'K') : fmt(n);
  $('#rGold').textContent = short(S.gold);
  $('#rGems').textContent = short(S.gems);
  $('#rEnergy').textContent = S.energy + '/' + MAX_EN;
}
const PAGES = { battle: pageBattle, shop: pageShop, equip: pageEquip, hero: pageHero, pet: pagePet, grow: pageGrow };
function renderLobby() {
  refreshTop();
  document.querySelectorAll('nav.bottom button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const pg = $('#page'), y = pg.scrollTop;
  PAGES[tab](pg);
  pg.scrollTop = y;
}
document.querySelectorAll('nav.bottom button').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderLobby(); $('#page').scrollTop = 0; });
document.querySelectorAll('.res button').forEach(b => b.onclick = () => { tab = 'shop'; renderLobby(); $('#page').scrollTop = 0; });
$('#btnSettings').onclick = openSettings;
setInterval(() => { if (!G) refreshTop(); }, 5000);
const spend = (cur, n) => { if (S[cur] < n) { toast(cur === 'gems' ? '💎 보석 부족! 상점에서 ₩0에 충전하세요' : '🪙 골드 부족! 상점에서 ₩0에 충전하세요'); return false; } S[cur] -= n; return true; };

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

// ============================================================
//  BATTLE
// ============================================================
function pageBattle(pg) {
  const maxSel = S.cleared + 1;
  selStage = clamp(selStage, 1, maxSel);
  const st = STAGES[(selStage - 1) % STAGES.length], m = metaStats(), lap = Math.floor((selStage - 1) / STAGES.length);
  const w = getItem(S.equip.weapon), W = w ? WT[w.wt] : FIST;
  pg.innerHTML = `
    <div class="power">⚔️ 전투력 <b>${fmt(m.power)}</b> <span class="clv">Lv.${S.clv}</span></div>
    <div class="herobox"><canvas class="preview"></canvas>
      <div class="heroline"><b style="color:${HRAR[HERO[S.hero].r].c}">${HERO[S.hero].name}</b> · ${w ? `<b style="color:${GRADES[w.g].c}">${itemName(w)}</b>` : '👊 맨주먹'}${S.pet ? ` · ${PET[S.pet].name}` : ''}<br><small>${W.desc}</small></div></div>
    <div class="stage" style="background:linear-gradient(160deg,${st.g1},${st.g2} 60%,${st.deco})">
      <button class="arrow" id="sPrev" ${selStage <= 1 ? 'disabled' : ''}>◀</button>
      <div class="sinfo">
        <div class="snum">STAGE ${selStage} ${lap ? `<span class="hard">지옥 ${lap}</span>` : ''}</div>
        <div class="sname">${st.emoji} ${st.name}</div>
        <div class="sbest">${S.cleared >= selStage ? '✅ 클리어' : '🔒 미클리어'} · 최고 ${fmtTime(S.best[selStage] || 0)}</div>
        <div class="sboss">👑 보스: ${BOSSES[(selStage - 1) % BOSSES.length]} · 3분 생존 후 등장</div>
      </div>
      <button class="arrow" id="sNext" ${selStage >= maxSel ? 'disabled' : ''}>▶</button>
    </div>
    <button class="btn gold big" id="startBtn">⚔️ 전투 시작 <small>⚡${EN_COST}</small></button>
    <div class="tips">💡 레벨업 스킬을 <b>최대 레벨(${MAX_WLV})</b>까지 올리고 짝이 되는 보조 아이템이 있으면 <b>⚗️ 스킬 믹스</b>로 진화!
      <div class="mix">${Object.values(WEAPONS).map(x => `<div>${x.icon} + ${PASSIVES[x.pair].icon} = ${x.evoIcon}<b>${x.evo}</b></div>`).join('')}</div>
    </div>`;
  pg.querySelector('#sPrev').onclick = () => { selStage--; renderLobby(); };
  pg.querySelector('#sNext').onclick = () => { selStage++; renderLobby(); };
  pg.querySelector('#startBtn').onclick = () => tryStart(selStage);
}

// ============================================================
//  EQUIPMENT
// ============================================================
function pageEquip(pg) {
  const m = metaStats();
  let inv = S.items.slice().sort((a, b) => b.g - a.g || SLOTS.findIndex(s => s.id === a.slot) - SLOTS.findIndex(s => s.id === b.slot) || b.lv - a.lv);
  if (equipFilter !== 'all') inv = inv.filter(i => i.slot === equipFilter);
  pg.innerHTML = `
    <div class="power">⚔️ 전투력 <b>${fmt(m.power)}</b></div>
    <div class="equiptop">
      <div class="slots">${SLOTS.slice(0, 4).map(slotCell).join('')}</div>
      <canvas class="preview"></canvas>
      <div class="slots">${SLOTS.slice(4).map(slotCell).join('')}</div>
    </div>
    <div class="stats">
      <span>공격력 <b>${fmt(m.atkTotal)}</b></span><span>체력 <b>${fmt(m.hpTotal)}</b></span>
      <span>방어력 <b>${fmt(m.def)}</b></span><span>피해감소 <b>${Math.round(m.drTotal * 100)}%</b></span>
      <span>치명타 <b>${Math.round(m.crit * 100)}%</b></span><span>치명피해 <b>${Math.round(m.critDmg * 100)}%</b></span>
      <span>공격속도 <b>+${Math.round(m.aspd * 100)}%</b></span><span>이동속도 <b>+${Math.round(m.spd * 100)}%</b></span>
    </div>
    <div class="row"><button class="btn green" id="auto">자동 장착</button><button class="btn purple" id="merge">⚗️ 일괄 합성</button></div>
    <h3>🎒 가방 (${S.items.length}) <small>같은 부위·등급 3개 → 다음 등급!</small></h3>
    <div class="chips"><button data-f="all" class="${equipFilter === 'all' ? 'on' : ''}">전체</button>${SLOTS.map(s => `<button data-f="${s.id}" class="${equipFilter === s.id ? 'on' : ''}">${s.icon}</button>`).join('')}</div>
    <div class="gradebar">${GRADES.map(g => `<span style="color:${g.c}">${g.n}</span>`).join('›')}</div>
    ${inv.length ? `<div class="inv">${inv.map(it => itemTile(it)).join('')}</div>` : '<div class="tips">장비가 없어요. 상점에서 무료로 뽑아보세요!</div>'}`;
  pg.querySelectorAll('.itile').forEach(t => t.onclick = () => itemDetail(getItem(+t.dataset.id)));
  pg.querySelectorAll('.chips button').forEach(b => b.onclick = () => { equipFilter = b.dataset.f; renderLobby(); });
  pg.querySelector('#auto').onclick = () => { autoEquip(); save(); toast('최고 장비 장착 완료!'); renderLobby(); };
  pg.querySelector('#merge').onclick = () => {
    const res = mergeAll(); save();
    if (!res.length) { toast('합성할 장비가 없어요 (같은 부위·등급 3개 필요)'); return; }
    showMergeResults(res);
  };
}
function slotCell(s) {
  const it = getItem(S.equip[s.id]);
  return `<div class="slot">${it ? itemTile(it) : `<div class="empty">${s.icon}</div>`}</div>`;
}
function itemDetail(it) {
  if (!it) return;
  const s = SLOT[it.slot], eq = isEquipped(it), maxed = it.lv >= itemMaxLv(it), cost = itemUpCost(it);
  const mats = S.items.filter(i => i !== it && i.slot === it.slot && i.g === it.g && !isEquipped(i)).length;
  const canMerge = mats >= 2 && it.g < MAX_GRADE;
  const W = it.slot === 'weapon' ? WT[it.wt] : null;
  const box = showModal(`<div class="center">${itemTile(it, 'big')}</div>
    <h2 style="margin-top:10px;color:${GRADES[it.g].c}">${itemName(it)}</h2>
    <div class="gradebar">${GRADES.map((g, i) => `<span style="color:${g.c};${i === it.g ? 'text-decoration:underline;font-size:15px' : 'opacity:.45'}">${g.n}</span>`).join('›')}</div>
    <div class="center">${s.name} · Lv ${it.lv}/${itemMaxLv(it)}<br>${s.label} <b>${fmtStat(it.slot, itemVal(it))}</b>${maxed ? '' : ` → <b style="color:#4ade80">${fmtStat(it.slot, itemVal({ ...it, lv: it.lv + 1 }))}</b>`}</div>
    ${W ? `<div class="tips">🗡️ <b>${W.name}</b> 공격 방식: ${W.desc}</div>` : ''}
    <div class="row"><button class="btn gold" id="up" ${maxed ? 'disabled' : ''}>${maxed ? '최대 레벨' : `강화 🪙${fmt(cost)}`}</button>
      <button class="btn gold" id="up10" ${maxed ? 'disabled' : ''}>+10 강화</button></div>
    <div class="row"><button class="btn purple" id="mg" ${canMerge ? '' : 'disabled'}>⚗️ 합성 (${Math.min(mats, 2)}/2)</button>
      <button class="btn ${eq ? 'gray' : 'green'}" id="eq">${eq ? '해제' : '장착'}</button></div>
    <div class="row"><button class="btn red" id="sell" ${eq ? 'disabled' : ''}>분해 🪙+${fmt(itemSell(it))}</button><button class="btn gray" id="close">닫기</button></div>`);
  const upN = n => {
    let done = 0;
    while (done < n && it.lv < itemMaxLv(it) && S.gold >= itemUpCost(it)) { S.gold -= itemUpCost(it); it.lv++; done++; }
    if (!done) { toast('🪙 골드 부족! 상점에서 ₩0에 충전하세요'); return; }
    save(); refreshTop(); itemDetail(it); renderLobby();
  };
  box.querySelector('#up').onclick = () => upN(1);
  box.querySelector('#up10').onclick = () => upN(10);
  box.querySelector('#mg').onclick = () => { const r = mergeInto(it); save(); renderLobby(); if (r) showMergeAnim(r); };
  box.querySelector('#eq').onclick = () => { if (eq) delete S.equip[it.slot]; else S.equip[it.slot] = it.id; save(); closeModal(); renderLobby(); };
  box.querySelector('#sell').onclick = () => { S.gold += itemSell(it); S.items = S.items.filter(i => i !== it); save(); closeModal(); renderLobby(); };
  box.querySelector('#close').onclick = closeModal;
}
function showMergeAnim(r) {
  const before = { ...r.it, g: r.from, id: -1 };
  const box = showModal(`<h2>⚗️ 합성!</h2>
    <div class="mergeanim">
      <div class="mats">${itemTile(before, 'm1')}${itemTile({ ...r.mats[0], id: -2 }, 'm2')}${itemTile({ ...r.mats[1], id: -3 }, 'm3')}</div>
      <div class="burst" style="--c:${GRADES[r.it.g].c}"></div>
      <div class="result">${itemTile(r.it, 'big')}</div>
    </div>
    <div class="center mres" style="color:${GRADES[r.it.g].c}"><b>${gradeName(r.from)} → ${itemName(r.it)}</b></div>
    <div class="row"><button class="btn green" id="ok">확인</button><button class="btn purple" id="again">상세 보기</button></div>`);
  box.querySelector('#ok').onclick = closeModal;
  box.querySelector('#again').onclick = () => itemDetail(r.it);
}
function showMergeResults(res) {
  const finals = [...new Set(res.map(r => r.it))].sort((a, b) => b.g - a.g);
  const best = finals[0];
  const box = showModal(`<h2>⚗️ 일괄 합성 ${res.length}회!</h2>
    <div class="mergeanim small"><div class="burst" style="--c:${GRADES[best.g].c}"></div><div class="result">${itemTile(best, 'big')}</div></div>
    <div class="center mres" style="color:${GRADES[best.g].c}"><b>최고 등급: ${itemName(best)}</b></div>
    <div class="ggrid">${finals.map((it, i) => itemTile(it, '', `animation-delay:${0.6 + i * 0.05}s`)).join('')}</div>
    <div class="row"><button class="btn green" id="ok">확인</button></div>`);
  box.querySelector('#ok').onclick = closeModal;
}

// ============================================================
//  HEROES
// ============================================================
function pageHero(pg) {
  if (!viewHero || !HERO[viewHero]) viewHero = S.hero;
  const h = HERO[viewHero], st = heroState(viewHero), rar = HRAR[h.r];
  let body;
  if (st) {
    const k = heroMult(st), maxLv = heroMaxLv(st), cost = heroLvCost(st.lv), need = HERO_STAR_SHARDS[st.stars];
    body = `<div class="center">Lv <b>${st.lv}</b>/${maxLv} · ${starsHTML(st.stars)}</div>
      <div class="bonus">${Object.entries(h.bonus).map(([key, v]) => `<span>${STAT_NAMES[key]} <b>${fmtBonus(key, v * k)}</b></span>`).join('')}
        <span>공격력 <b>+${(st.lv - 1) * 2}</b></span><span>체력 <b>+${(st.lv - 1) * 12}</b></span></div>
      <div class="row"><button class="btn ${S.hero === viewHero ? 'gray' : 'green'}" id="use" ${S.hero === viewHero ? 'disabled' : ''}>${S.hero === viewHero ? '✅ 사용 중' : '이 영웅 사용'}</button>
        <button class="btn gold" id="lvup" ${st.lv >= maxLv ? 'disabled' : ''}>${st.lv >= maxLv ? '레벨 MAX' : `레벨업 🪙${fmt(cost)}`}</button></div>
      <div class="row"><button class="btn purple" id="star" ${st.stars >= 5 || st.shards < need ? 'disabled' : ''}>${st.stars >= 5 ? '★ 최대 승급' : `★ 승급 (조각 ${st.shards}/${need})`}</button>
        <button class="btn gold" id="lvmax" ${st.lv >= maxLv ? 'disabled' : ''}>최대 레벨업</button></div>`;
  } else {
    body = `<div class="tips center">🔒 아직 없는 영웅이에요. 아래 <b>영웅 소환</b>으로 획득!<br>${Object.entries(h.bonus).map(([key, v]) => `${STAT_NAMES[key]} ${fmtBonus(key, v)}`).join(' · ')}</div>`;
  }
  pg.innerHTML = `
    <div class="herobox big"><canvas class="preview" data-hero="${viewHero}" data-pet=""></canvas></div>
    <h2 style="color:${rar.c};margin:4px 0">[${rar.n}] ${h.name}</h2>
    <div class="center sub">기본 무기 성향: ${WT[h.wt].name}</div>
    ${body}
    <h3>🦸 영웅 목록 (${Object.keys(S.heroes).length}/${HEROES.length})</h3>
    <div class="hgrid">${HEROES.map(x => heroTile(x.id, `${S.heroes[x.id] ? `<span class="lv">Lv${S.heroes[x.id].lv}</span>` : '<span class="lock">🔒</span>'}${S.hero === x.id ? '<span class="eq">사용</span>' : ''}`)).join('')}</div>
    <h3>✨ 영웅 소환</h3>
    <div class="row"><button class="btn green" data-hs="0">무료 1회</button><button class="btn" data-hs="1">1회 💎300</button><button class="btn purple" data-hs="10">10회 💎2,700</button></div>
    <div class="gradebar">${HRAR.map((r, i) => `<span style="color:${r.c}">${r.n} ${HERO_GACHA_W[i]}%</span>`).join(' · ')}</div>`;
  pg.querySelectorAll('.htile').forEach(t => t.classList.toggle('locked', !S.heroes[t.dataset.hero]));
  pg.querySelectorAll('.htile').forEach(t => t.onclick = () => { viewHero = t.dataset.hero; renderLobby(); });
  pg.querySelectorAll('[data-hs]').forEach(b => b.onclick = () => heroGacha(+b.dataset.hs));
  if (!st) return;
  const lvTo = n => { let d = 0; while (d < n && st.lv < heroMaxLv(st) && S.gold >= heroLvCost(st.lv)) { S.gold -= heroLvCost(st.lv); st.lv++; d++; } if (!d) toast('🪙 골드 부족!'); save(); renderLobby(); };
  pg.querySelector('#use').onclick = () => { S.hero = viewHero; save(); toast(`${h.name} 출전!`); renderLobby(); };
  pg.querySelector('#lvup').onclick = () => lvTo(1);
  pg.querySelector('#lvmax').onclick = () => lvTo(999);
  pg.querySelector('#star').onclick = () => { st.shards -= HERO_STAR_SHARDS[st.stars]; st.stars++; save(); toast(`★ ${h.name} ${st.stars}성 승급!`); renderLobby(); };
}
function heroGacha(n) {
  if (!spend('gems', n === 0 ? 0 : n === 1 ? 300 : 2700)) return;
  const got = [];
  for (let i = 0; i < Math.max(1, n); i++) { const h = rollFrom(HEROES, HERO_GACHA_W); got.push({ id: h.id, isNew: addHero(h.id) }); }
  save(); refreshTop();
  const best = Math.max(...got.map(g => HERO[g.id].r));
  const box = showModal(`<h2>${best >= 3 ? '🌈 UR 영웅 등장!!' : best >= 2 ? '✨ SSR 영웅!' : '🦸 영웅 소환'}</h2>
    <div class="hgrid">${got.map((g, i) => heroTile(g.id, `<span class="${g.isNew ? 'new' : 'lv'}">${g.isNew ? 'NEW' : '조각+1'}</span>`).replace('class="htile"', `class="htile pop" style="animation-delay:${i * 0.08}s;--c:${HRAR[HERO[g.id].r].c}"`)).join('')}</div>
    <div class="row"><button class="btn gray" id="ok">확인</button><button class="btn purple" id="again">한 번 더</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); renderLobby(); };
  box.querySelector('#again').onclick = () => { closeModal(); heroGacha(n); };
}

// ============================================================
//  PETS
// ============================================================
function pagePet(pg) {
  const owned = PETS.filter(p => S.pets[p.id]);
  if (!viewPet || !PET[viewPet]) viewPet = S.pet || (owned[0] && owned[0].id) || PETS[0].id;
  const P = PET[viewPet], st = S.pets[viewPet], rar = PRAR[P.r];
  let body;
  if (st) {
    const maxLv = petMaxLv(st), cost = petLvCost(st.lv), need = HERO_STAR_SHARDS[st.stars];
    body = `<div class="center">Lv <b>${st.lv}</b>/${maxLv} · ${starsHTML(st.stars)} · 공격력 <b>${fmt(petDmg(metaStats(), viewPet))}</b></div>
      <div class="row"><button class="btn ${S.pet === viewPet ? 'gray' : 'green'}" id="use">${S.pet === viewPet ? '동행 해제' : '🐾 동행하기'}</button>
        <button class="btn gold" id="lvup" ${st.lv >= maxLv ? 'disabled' : ''}>${st.lv >= maxLv ? '레벨 MAX' : `레벨업 🪙${fmt(cost)}`}</button></div>
      <div class="row"><button class="btn purple" id="star" ${st.stars >= 5 || st.shards < need ? 'disabled' : ''}>${st.stars >= 5 ? '★ 최대 승급' : `★ 승급 (조각 ${st.shards}/${need})`}</button>
        <button class="btn gold" id="lvmax" ${st.lv >= maxLv ? 'disabled' : ''}>최대 레벨업</button></div>`;
  } else body = `<div class="tips center">🔒 아직 없는 펫이에요. 아래 <b>펫 알</b>을 부화시켜 보세요!</div>`;
  pg.innerHTML = `
    <div class="herobox big"><canvas class="preview" data-hero="" data-pet="${viewPet}"></canvas></div>
    <h2 style="color:${rar.c};margin:4px 0">[${rar.n}] ${P.name}</h2>
    <div class="center sub">${P.desc}</div>
    ${body}
    <h3>🐾 펫 목록 (${owned.length}/${PETS.length})</h3>
    <div class="hgrid">${PETS.map(x => petTile(x.id, `${S.pets[x.id] ? `<span class="lv">Lv${S.pets[x.id].lv}</span>` : '<span class="lock">🔒</span>'}${S.pet === x.id ? '<span class="eq">동행</span>' : ''}`)).join('')}</div>
    <h3>🥚 펫 알 부화</h3>
    <div class="row"><button class="btn green" data-ps="0">무료 1회</button><button class="btn" data-ps="1">1회 💎250</button><button class="btn purple" data-ps="10">10회 💎2,250</button></div>`;
  pg.querySelectorAll('.htile').forEach(t => { t.classList.toggle('locked', !S.pets[t.dataset.pet]); t.onclick = () => { viewPet = t.dataset.pet; renderLobby(); }; });
  pg.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => petGacha(+b.dataset.ps));
  if (!st) return;
  const lvTo = n => { let d = 0; while (d < n && st.lv < petMaxLv(st) && S.gold >= petLvCost(st.lv)) { S.gold -= petLvCost(st.lv); st.lv++; d++; } if (!d) toast('🪙 골드 부족!'); save(); renderLobby(); };
  pg.querySelector('#use').onclick = () => { S.pet = S.pet === viewPet ? null : viewPet; save(); renderLobby(); };
  pg.querySelector('#lvup').onclick = () => lvTo(1);
  pg.querySelector('#lvmax').onclick = () => lvTo(999);
  pg.querySelector('#star').onclick = () => { st.shards -= HERO_STAR_SHARDS[st.stars]; st.stars++; save(); toast(`★ ${P.name} ${st.stars}성 승급!`); renderLobby(); };
}
function petGacha(n) {
  if (!spend('gems', n === 0 ? 0 : n === 1 ? 250 : 2250)) return;
  const got = [];
  for (let i = 0; i < Math.max(1, n); i++) { const p = rollFrom(PETS, PET_GACHA_W); got.push({ id: p.id, isNew: addPet(p.id) }); }
  save(); refreshTop();
  const box = showModal(`<h2>🥚 부화 완료!</h2>
    <div class="hgrid">${got.map((g, i) => petTile(g.id, `<span class="${g.isNew ? 'new' : 'lv'}">${g.isNew ? 'NEW' : '조각+1'}</span>`).replace('class="htile"', `class="htile pop" style="animation-delay:${i * 0.08}s;--c:${PRAR[PET[g.id].r].c}"`)).join('')}</div>
    <div class="row"><button class="btn gray" id="ok">확인</button><button class="btn purple" id="again">한 번 더</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); renderLobby(); };
  box.querySelector('#again').onclick = () => { closeModal(); petGacha(n); };
}

// ============================================================
//  GROWTH: stats / character / relics
// ============================================================
function pageGrow(pg) {
  const tabs = `<div class="subtabs">${[['stats', '📈 스탯'], ['char', '🧍 캐릭터'], ['relic', '🏺 유물']].map(([id, n]) => `<button data-g="${id}" class="${growTab === id ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  pg.innerHTML = tabs + `<div class="power">⚔️ 전투력 <b>${fmt(metaStats().power)}</b></div><div id="growBody"></div>`;
  pg.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { growTab = b.dataset.g; renderLobby(); });
  const gb = pg.querySelector('#growBody');
  ({ stats: growStats, char: growChar, relic: growRelic })[growTab](gb);
}
function growStats(el) {
  const fmtS = (d, lv) => d.pct ? `+${+(lv * d.per * 100).toFixed(1)}%` : `+${+(lv * d.per).toFixed(1)}${d.suf || ''}`;
  el.innerHTML = STATS.map(d => {
    const lv = S.stats[d.id] || 0, maxed = lv >= d.max;
    return `<div class="tal"><div class="ti">${d.icon}</div><div class="tn"><b>${d.name} <small>Lv.${lv}/${d.max}</small></b><span>${fmtS(d, lv)} → ${fmtS(d, lv + 1)}</span></div>
      <div class="tb"><button class="btn gold" data-s="${d.id}" data-n="1" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : '🪙 ' + fmt(statCost(lv))}</button>
      <button class="btn gold" data-s="${d.id}" data-n="10" ${maxed ? 'disabled' : ''}>x10</button></div></div>`;
  }).join('') + `<div class="row"><button class="btn purple" id="allUp">⚡ 골드로 전부 강화</button></div>`;
  const up = (id, n) => {
    const d = STATS.find(x => x.id === id); let done = 0;
    while (done < n && (S.stats[id] || 0) < d.max && S.gold >= statCost(S.stats[id] || 0)) { S.gold -= statCost(S.stats[id] || 0); S.stats[id] = (S.stats[id] || 0) + 1; done++; }
    return done;
  };
  el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { if (!up(b.dataset.s, +b.dataset.n)) toast('🪙 골드 부족! 상점에서 ₩0에 충전하세요'); save(); renderLobby(); });
  el.querySelector('#allUp').onclick = () => {
    let n = 0, progress = true;
    while (progress) { progress = false; for (const d of STATS) if (up(d.id, 1)) { n++; progress = true; } }
    save(); toast(n ? `💪 ${n}회 강화 완료!` : '골드가 부족해요'); renderLobby();
  };
}
function growChar(el) {
  const need = cexpNeed(S.clv);
  el.innerHTML = `<div class="charbox"><canvas class="preview"></canvas>
      <div class="clvbig">Lv.${S.clv}</div>
      <div class="expbar"><div style="width:${Math.min(100, S.cexp / need * 100)}%"></div><span>${fmt(S.cexp)} / ${fmt(need)}</span></div></div>
    <div class="stats"><span>레벨 공격력 <b>+${(S.clv - 1) * 3}</b></span><span>레벨 체력 <b>+${(S.clv - 1) * 25}</b></span></div>
    <div class="tips">📘 캐릭터 경험치는 전투(처치 수·생존 시간·클리어)로 얻어요. 레벨이 오를 때마다 공격력 +3, 체력 +25!</div>
    <div class="row"><button class="btn purple" id="pot">📘 경험치 물약 <small>(<s>₩3,300</s> ₩0)</small></button></div>
    <div class="row"><button class="btn gold" id="pot10">📘 물약 10개 <small>(₩0)</small></button></div>`;
  const use = n => { let ups = 0; for (let i = 0; i < n; i++) ups += addCexp(Math.ceil(cexpNeed(S.clv) * 0.6)); S.spent += 3300 * n; save(); toast(ups ? `🎉 레벨 업! Lv.${S.clv}` : '📘 경험치 획득!'); renderLobby(); };
  el.querySelector('#pot').onclick = () => use(1);
  el.querySelector('#pot10').onclick = () => use(10);
}
function growRelic(el) {
  const owned = RELICS.filter(r => S.relics[r.id]).length;
  el.innerHTML = `<h3 style="margin-top:4px">🏺 유물 (${owned}/${RELICS.length}) <small>탭해서 강화</small></h3>
    <div class="rgrid">${RELICS.map(r => {
      const lv = S.relics[r.id] || 0;
      return `<div class="rtile ${lv ? '' : 'locked'}" data-r="${r.id}" style="--c:${PRAR[r.r].c}"><div class="ri">${r.icon}</div><div class="rn">${r.name}</div><div class="rl">${lv ? `Lv.${lv}/${RELIC_MAX}` : '🔒'}</div><div class="rs">${STAT_NAMES[r.key]} ${fmtBonus(r.key, Math.max(1, lv) * r.per)}</div></div>`;
    }).join('')}</div>
    <h3>🎁 유물 상자 <small>중복 획득 시 레벨 +1</small></h3>
    <div class="row"><button class="btn green" data-rs="0">무료 1회</button><button class="btn" data-rs="1">1회 💎200</button><button class="btn purple" data-rs="10">10회 💎1,800</button></div>`;
  el.querySelectorAll('[data-r]').forEach(t => t.onclick = () => relicDetail(RELICS.find(r => r.id === t.dataset.r)));
  el.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => relicGacha(+b.dataset.rs));
}
function relicDetail(r) {
  const lv = S.relics[r.id] || 0;
  if (!lv) { toast('🔒 유물 상자에서 먼저 획득하세요'); return; }
  const cost = relicCost(lv), maxed = lv >= RELIC_MAX;
  const box = showModal(`<div class="bigicon">${r.icon}</div><h2 style="color:${PRAR[r.r].c}">${r.name}</h2>
    <div class="center">Lv.${lv}/${RELIC_MAX}<br>${STAT_NAMES[r.key]} <b>${fmtBonus(r.key, lv * r.per)}</b>${maxed ? '' : ` → <b style="color:#4ade80">${fmtBonus(r.key, (lv + 1) * r.per)}</b>`}</div>
    <div class="row"><button class="btn gold" id="up" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : `강화 🪙${fmt(cost)}`}</button><button class="btn gray" id="close">닫기</button></div>`);
  box.querySelector('#up').onclick = () => { if (!spend('gold', cost)) return; S.relics[r.id]++; save(); refreshTop(); relicDetail(r); renderLobby(); };
  box.querySelector('#close').onclick = closeModal;
}
function relicGacha(n) {
  if (!spend('gems', n === 0 ? 0 : n === 1 ? 200 : 1800)) return;
  const got = [];
  for (let i = 0; i < Math.max(1, n); i++) { const r = rollFrom(RELICS, RELIC_W); const isNew = !S.relics[r.id]; addRelic(r.id); got.push({ r, isNew }); }
  save(); refreshTop();
  const box = showModal(`<h2>🏺 유물 획득!</h2>
    <div class="rgrid">${got.map((g, i) => `<div class="rtile pop" style="--c:${PRAR[g.r.r].c};animation-delay:${i * 0.07}s"><div class="ri">${g.r.icon}</div><div class="rn">${g.r.name}</div><div class="rl">${g.isNew ? '<b class="newtxt">NEW</b>' : 'Lv.' + S.relics[g.r.id]}</div></div>`).join('')}</div>
    <div class="row"><button class="btn gray" id="ok">확인</button><button class="btn purple" id="again">한 번 더</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); renderLobby(); };
  box.querySelector('#again').onclick = () => { closeModal(); relicGacha(n); };
}

// ============================================================
//  SHOP
// ============================================================
const SHOP = [
  { sec: '🎁 특별 패키지' },
  { id: 'starter', wide: true, icon: '🎁', name: '스타터 팩', desc: '💎5,000 + 🪙100,000 + SSS급 무기', price: '₩5,900', once: 'starter', give: () => { S.gems += 5000; S.gold += 100000; const it = newItem(7, 'weapon'); return `💎5,000, 🪙100,000, ${itemName(it)} 획득!`; } },
  { id: 'pass', wide: true, icon: '👑', name: '프리미엄 패스', desc: '전투 보상 2배 + 레벨업 선택지 4개', price: '₩14,900', once: 'pass', give: () => '👑 프리미엄 패스 활성화!' },
  { id: 'noads', wide: true, icon: '🚫', name: '광고 제거', desc: '모든 광고 제거 (사실 원래 없음)', price: '₩9,900', once: 'noAds', give: () => '🚫 광고 제거 완료! (원래 없었지만)' },
  { id: 'legend', wide: true, icon: '🌟', name: '전설 무기 상자', desc: '전설 등급 무기 1개 확정!', price: '₩99,000', give: () => { const it = newItem(9, 'weapon'); return `🌟 ${itemName(it)} 획득!!`; } },
  { id: 'urhero', wide: true, icon: '🦸', name: 'UR 영웅 선택권', desc: 'UR 영웅 1명 랜덤 획득', price: '₩49,000', give: () => { const h = pick(HEROES.filter(x => x.r === 3)); const n = addHero(h.id); return `🦸 ${h.name} ${n ? '획득!' : '조각 +1'}`; } },
  { id: 'dragonpet', wide: true, icon: '🐉', name: '아기 용 알', desc: '전설 펫 아기 용 확정', price: '₩29,000', give: () => { const n = addPet('dragon'); return `🐉 아기 용 ${n ? '획득!' : '조각 +1'}`; } },
  { sec: '💎 보석' },
  { id: 'gem1', icon: '💎', name: '보석 한 줌', desc: '💎 300', price: '₩1,200', give: () => { S.gems += 300; return '💎 +300'; } },
  { id: 'gem2', icon: '💰', name: '보석 주머니', desc: '💎 3,000', price: '₩5,900', give: () => { S.gems += 3000; return '💎 +3,000'; } },
  { id: 'gem3', icon: '🧳', name: '보석 상자', desc: '💎 30,000', price: '₩12,000', give: () => { S.gems += 30000; return '💎 +30,000'; } },
  { id: 'gem4', icon: '🏦', name: '보석 금고', desc: '💎 300,000', price: '₩59,000', give: () => { S.gems += 300000; return '💎 +300,000'; } },
  { sec: '🪙 골드' },
  { id: 'gold1', icon: '🪙', name: '골드 더미', desc: '🪙 50,000', price: '₩2,500', give: () => { S.gold += 50000; return '🪙 +50,000'; } },
  { id: 'gold2', icon: '💰', name: '골드 자루', desc: '🪙 1,000,000', price: '₩11,000', give: () => { S.gold += 1e6; return '🪙 +1,000,000'; } },
  { id: 'gold3', icon: '🏛️', name: '골드 창고', desc: '🪙 100,000,000', price: '₩99,000', give: () => { S.gold += 1e8; return '🪙 +100,000,000'; } },
  { id: 'energy', icon: '⚡', name: '에너지 충전', desc: `⚡ ${MAX_EN} 가득`, price: '₩1,100', give: () => { S.energy = Math.max(S.energy, MAX_EN); return '⚡ 에너지 충전 완료!'; } },
];
function pageShop(pg) {
  let html = `<h3>📦 소환 & 뽑기</h3><div class="sgrid">
    <div class="sitem"><div class="si">📦</div><div class="sn">장비 상자</div><div class="sd">F ~ SSS 등급</div><div class="sbtns"><button class="btn green" data-gacha="0">무료</button><button class="btn" data-gacha="1">💎300</button></div><button class="btn purple" data-gacha="10">10회 💎2,700 <small>B+ 확정</small></button></div>
    <div class="sitem"><div class="si">🦸</div><div class="sn">영웅 소환</div><div class="sd">R ~ UR 영웅</div><div class="sbtns"><button class="btn green" data-hs="0">무료</button><button class="btn" data-hs="1">💎300</button></div><button class="btn purple" data-hs="10">10회 💎2,700</button></div>
    <div class="sitem"><div class="si">🥚</div><div class="sn">펫 알</div><div class="sd">귀여운 전투 펫</div><div class="sbtns"><button class="btn green" data-ps="0">무료</button><button class="btn" data-ps="1">💎250</button></div><button class="btn purple" data-ps="10">10회 💎2,250</button></div>
    <div class="sitem"><div class="si">🏺</div><div class="sn">유물 상자</div><div class="sd">영구 스탯 보너스</div><div class="sbtns"><button class="btn green" data-rs="0">무료</button><button class="btn" data-rs="1">💎200</button></div><button class="btn purple" data-rs="10">10회 💎1,800</button></div>
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
  pg.querySelectorAll('[data-hs]').forEach(b => b.onclick = () => heroGacha(+b.dataset.hs));
  pg.querySelectorAll('[data-ps]').forEach(b => b.onclick = () => petGacha(+b.dataset.ps));
  pg.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => relicGacha(+b.dataset.rs));
}
function gacha(n) {
  if (!spend('gems', n === 0 ? 0 : n === 1 ? 300 : 2700)) return;
  const got = [];
  for (let i = 0; i < Math.max(1, n); i++) got.push(newItem(rollGrade()));
  if (n === 10 && !got.some(i => i.g >= 3)) got[9].g = 3;
  save(); refreshTop();
  const best = Math.max(...got.map(i => i.g));
  const box = showModal(`<h2 style="color:${GRADES[best].c}">${best >= 7 ? '🌈 SSS 등급!!' : best >= 5 ? '✨ S 등급 이상!' : '📦 장비 획득'}</h2>
    <div class="ggrid">${got.map((it, i) => itemTile(it, 'pop', `animation-delay:${i * 0.07}s`)).join('')}</div>
    <div class="row"><button class="btn gray" id="ok">확인</button><button class="btn purple" id="again">한 번 더</button></div>`);
  box.querySelector('#ok').onclick = () => { closeModal(); renderLobby(); };
  box.querySelector('#again').onclick = () => { closeModal(); gacha(n); };
}

// ============================================================
//  SETTINGS
// ============================================================
let installEvt = null;
const isStandalone = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone === true;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
addEventListener('appinstalled', () => { installEvt = null; toast('📲 설치 완료! 홈 화면에서 실행하세요'); });
function openSettings() {
  const box = showModal(`<h2>⚙️ 설정</h2>
    <div class="tips">🎮 <b>Hero Mixer</b><br>• 이동: 화면 드래그(조이스틱) 또는 WASD / 방향키<br>• 공격: 장착한 무기로 자동 공격 (무기마다 공격 방식이 달라요)<br>• 3분 생존 → 보스 처치 → 클리어<br>• 모든 결제 상품은 <b>₩0</b> 💸</div>
    <h3>📱 휴대폰에 설치</h3>
    ${isStandalone() ? '<div class="tips">✅ 앱으로 실행 중이에요. 인터넷 없이도 플레이할 수 있어요.</div>'
      : installEvt ? '<div class="row"><button class="btn green" id="install">📲 홈 화면에 설치</button></div>'
      : '<div class="tips">• <b>안드로이드 (크롬)</b>: ⋮ 메뉴 → <b>앱 설치</b> / <b>홈 화면에 추가</b><br>• <b>아이폰 (사파리)</b>: 공유 ⬆️ → <b>홈 화면에 추가</b></div>'}
    <div class="row"><button class="btn red" id="reset">데이터 초기화</button><button class="btn gray" id="close">닫기</button></div>`);
  const ib = box.querySelector('#install');
  if (ib) ib.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; closeModal(); };
  box.querySelector('#close').onclick = closeModal;
  box.querySelector('#reset').onclick = () => {
    const b2 = showModal(`<h2>정말 초기화할까요?</h2><div class="center">모든 진행 상황이 삭제됩니다.</div>
      <div class="row"><button class="btn gray" id="no">취소</button><button class="btn red" id="yes">초기화</button></div>`);
    b2.querySelector('#no').onclick = closeModal;
    b2.querySelector('#yes').onclick = () => { S = defaultSave(); save(); closeModal(); selStage = 1; tab = 'battle'; viewHero = viewPet = null; renderLobby(); };
  };
}

// ============================================================
//  BOOT
// ============================================================
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (G) { if (G.state === 'play') update(dt); if (G) render(); }
  else drawPreviews(now / 1000);
  requestAnimationFrame(frame);
}
loadSave();
resize();
selStage = Math.min(S.cleared + 1, 999);
renderLobby();
requestAnimationFrame(frame);
