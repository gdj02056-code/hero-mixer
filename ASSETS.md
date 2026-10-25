# Hero Mixer 이미지 요청 목록

만든 이미지를 이 폴더의 `assets/` 아래에 **아래 파일 이름 그대로** 넣어주면 돼요.
일부만 넣어도 괜찮아요. 없는 그림은 지금의 직접 그린 그림이 그대로 쓰여요.

## 공통 규칙

- **형식:** PNG, **배경 투명** (가장 중요!)
  - 투명 배경이 안 되면 단색 배경으로 만들어주세요. 초록 `#00FF00` 배경으로 하고, 초록색 대상(슬라임 등)만 자주색 `#FF00FF` 배경으로 해주세요. 배경은 제가 지울게요.
- **크기:** 따로 적힌 게 없으면 **512×512**
- **구도:** 대상 하나만 가운데에. 글자 없음, 바닥 그림자 없음, 테두리 여백 조금
- **화풍 통일:** 모든 그림에 아래 공통 프롬프트를 앞에 붙여주세요.

```
cute chibi 2D mobile game art, clean thick dark outline, cel shading, vibrant colors, simple shapes, centered, single subject, plain background, no text, no ground shadow
```

네거티브 프롬프트 (지원되면):

```
text, watermark, signature, multiple objects, cropped, blurry, realistic, photo, 3d render, background scenery
```

---

## 1순위 — 게임 느낌이 제일 크게 바뀌는 것 (45장)

### 🗡️ 무기 12종 → `assets/weapons/`
**구도:** 무기를 **45도 대각선**으로 놓고, **손잡이는 왼쪽 아래, 끝은 오른쪽 위**를 향하게 해주세요. 그림의 85% 정도를 채우면 돼요.
등급 색(F~전설)은 제가 테두리와 빛으로 넣을 테니 무기는 1종류씩만 있으면 돼요.

| 파일 | 내용 | 프롬프트 |
|---|---|---|
| `sword.png` | 검 | `fantasy longsword, steel blade, golden crossguard, leather grip, diagonal` |
| `dagger.png` | 단검 | `curved dagger, short sharp blade, ornate guard, wrapped handle, diagonal` |
| `bow.png` | 활 | `wooden recurve bow with an arrow nocked, diagonal` |
| `crossbow.png` | 석궁 | `wooden crossbow with metal limbs and a bolt loaded, diagonal` |
| `gun.png` | 머스킷 | `fantasy flintlock musket rifle, wooden stock, brass bands, diagonal` |
| `hammer.png` | 망치 | `big two-handed war hammer, heavy steel head, wooden handle, diagonal` |
| `axe.png` | 도끼 | `battle axe, single wide curved blade, wooden handle, diagonal` |
| `spear.png` | 창 | `long spear, leaf-shaped steel tip, red tassel, wooden shaft, diagonal` |
| `scythe.png` | 낫 | `grim reaper scythe, large curved blade, dark long handle, diagonal` |
| `spellbook.png` | 마법서 | `magic spellbook, closed thick tome, glowing rune emblem on cover, front view` |
| `wand.png` | 완드 | `magic wand, short dark stick with a glowing star crystal tip, diagonal` |
| `staff.png` | 지팡이 | `wizard staff, long wooden staff with a glowing orb held by claws at the top, diagonal` |

### 🦸 영웅 12명 → `assets/heroes/`
**구도:** 2등신 꼬마 캐릭터, **전신**, **오른쪽을 바라보는 옆모습(3/4)**, 서 있는 자세.
**무기는 들지 않고 빈손**이어야 해요. 장착한 무기를 제가 손에 따로 붙일 거예요. 발이 그림 아래쪽에 오게 해주세요.

| 파일 | 영웅 | 프롬프트 |
|---|---|---|
| `knight.png` | 견습 기사 | `young knight boy, orange hair, blue tunic, red cape, empty hands` |
| `archer.png` | 숲의 궁수 | `forest archer girl, green hood, green leather outfit, brown cape, empty hands` |
| `gunner.png` | 총잡이 | `gunslinger, brown cowboy hat, grey coat, brown cape, empty hands` |
| `rogue.png` | 그림자 도적 | `shadow thief, black hair, dark mask over mouth, dark grey outfit, purple cape, empty hands` |
| `mage.png` | 불꽃 마법사 | `fire mage, red hair, tall dark orange wizard hat, brown robe, orange cape, empty hands` |
| `monk.png` | 망치 수도승 | `bald monk, tan skin, golden yellow robe, empty hands` |
| `paladin.png` | 성기사 | `holy paladin, silver helmet, white plate armor, golden cape, empty hands` |
| `berserker.png` | 광전사 | `berserker warrior, red hair, horned helmet, grey fur armor, dark red cape, empty hands` |
| `ninja.png` | 바람의 닌자 | `wind ninja, black hair, face mask, navy blue outfit, light blue scarf, empty hands` |
| `reaper.png` | 사신 | `grim reaper girl, white hair, dark hood, black robe, purple cape, empty hands` |
| `dragoon.png` | 용기사 | `dragon knight, red dragon helmet with horns, crimson armor, golden cape, empty hands` |
| `archmage.png` | 대마법사 | `archmage, white hair, tall dark indigo wizard hat, indigo robe, lavender cape, empty hands` |

### 🐾 펫 6종 → `assets/pets/`
**구도:** 아주 작고 귀여운 몸, 전신, 오른쪽을 바라보는 모습

| 파일 | 펫 | 프롬프트 |
|---|---|---|
| `slime.png` | 말랑 슬라임 | `cute green slime blob pet with big eyes` (자주색 배경) |
| `cat.png` | 고양이 기사 | `cute orange cat wearing a tiny silver helmet` |
| `fairy.png` | 치유 요정 | `tiny pink healing fairy with translucent blue wings, soft glow` |
| `ghost.png` | 꼬마 유령 | `cute small white ghost with wavy bottom, black oval eyes` |
| `eagle.png` | 폭풍 독수리 | `small bald eagle with spread brown wings, white head, yellow beak` |
| `dragon.png` | 아기 용 | `baby red dragon with purple wings, small horns, yellow belly` |

### 👾 몬스터 5종 → `assets/monsters/`
**구도:** **정면**, 전신

| 파일 | 몬스터 | 프롬프트 |
|---|---|---|
| `slime.png` | 슬라임 | `green slime monster, angry cute face` (자주색 배경) |
| `bat.png` | 박쥐 | `purple bat monster with spread wings, front view` |
| `archer.png` | 고블린 궁수 | `small orange goblin archer holding a bow, front view` |
| `golem.png` | 골렘 | `small brown rock golem, blocky body, glowing eyes, front view` |
| `elite.png` | 엘리트 | `big red horned demon brute, angry, front view` |

### 👑 보스 10종 → `assets/bosses/`
**구도:** **정면**, 전신, 크고 위협적이지만 귀여운 화풍 유지

| 파일 | 보스 | 프롬프트 |
|---|---|---|
| `boss1.png` | 킹 슬라임 | `giant king slime boss wearing a golden crown` (자주색 배경) |
| `boss2.png` | 사막 전갈왕 | `giant desert scorpion king boss, golden armor plates, raised stinger` |
| `boss3.png` | 유적의 수호자 | `ancient stone guardian golem boss, glowing blue runes` |
| `boss4.png` | 서리 거인 | `frost giant boss, icy blue skin, ice armor, frozen beard` |
| `boss5.png` | 용암 골렘 | `lava golem boss, black rock body with glowing orange magma cracks` |
| `boss6.png` | 어둠의 군주 | `dark lord boss, black armor, purple flames, glowing red eyes` |
| `boss7.png` | 망령 기사단장 | `ghostly undead knight commander boss, tattered banner, spectral green glow` |
| `boss8.png` | 늪의 히드라 | `swamp hydra boss with three snake heads, green scales` (자주색 배경) |
| `boss9.png` | 천공의 그리폰 | `sky griffin boss, white eagle head, lion body, large wings` |
| `boss10.png` | 혼돈의 마왕 | `chaos demon king boss, crimson and black, four horns, swirling chaos aura` |

---

## 2순위 — 있으면 훨씬 예뻐지는 것 (29장)

### 🗺️ 스테이지 바닥 10종 → `assets/stages/`
**크기 512×512**, **위에서 내려다본 바닥 텍스처**, **이음새 없이 반복되는(seamless, tileable)** 그림이어야 해요.
몬스터가 잘 보이도록 큰 물체 없이 **차분하고 대비가 낮게** 해주세요. 이 항목만 공통 프롬프트 대신 아래 프롬프트를 써주세요.

```
seamless tileable top-down ground texture, 2D game, hand painted, soft low contrast, no objects
```

| 파일 | 스테이지 | 추가 프롬프트 |
|---|---|---|
| `stage1.png` | 초록 평원 | `green grass meadow, small flowers` |
| `stage2.png` | 메마른 사막 | `desert sand, small pebbles` |
| `stage3.png` | 고대 유적 | `ancient cracked stone tiles with moss` |
| `stage4.png` | 얼어붙은 동굴 | `icy blue frozen cave floor, frost` |
| `stage5.png` | 불타는 화산 | `dark volcanic rock with glowing lava cracks` |
| `stage6.png` | 어둠의 던전 | `dark dungeon stone brick floor, purple tint` |
| `stage7.png` | 버려진 전장 | `muddy battlefield dirt, broken arrows` |
| `stage8.png` | 심연의 늪 | `murky green swamp ground, puddles` |
| `stage9.png` | 하늘 정원 | `white clouds and light blue sky platform` |
| `stage10.png` | 혼돈의 끝 | `dark crimson cracked chaos ground, magenta glow` |

### 🛡️ 방어구·장신구 7종 → `assets/equip/`
**구도:** 아이콘처럼 정면 또는 살짝 기울인 모습

| 파일 | 내용 | 프롬프트 |
|---|---|---|
| `armor.png` | 갑옷 | `fantasy chest plate armor, steel` |
| `helmet.png` | 투구 | `knight helmet, steel, visor` |
| `gloves.png` | 장갑 | `pair of leather gauntlets` |
| `ring.png` | 반지 | `gold ring with a gemstone` |
| `neck.png` | 목걸이 | `necklace with a glowing pendant` |
| `belt.png` | 벨트 | `leather belt with a golden buckle` |
| `boots.png` | 신발 | `pair of leather adventurer boots` |

### 🏺 유물 12종 → `assets/relics/`

| 파일 | 유물 | 프롬프트 |
|---|---|---|
| `sheath.png` | 고대 검집 | `ancient ornate sword sheath` |
| `grail.png` | 생명의 성배 | `holy golden grail cup glowing red` |
| `whetstone.png` | 날카로운 숫돌 | `sharpening whetstone with sparks` |
| `feather.png` | 바람의 깃털 | `light green wind feather` |
| `coin.png` | 황금 동전 | `big ancient gold coin` |
| `scroll.png` | 지혜의 두루마리 | `rolled ancient scroll with a ribbon` |
| `lens.png` | 매의 눈 | `golden monocle lens with an eagle eye` |
| `hourglass.png` | 시간의 모래 | `ornate hourglass with glowing sand` |
| `shield.png` | 수호의 방패 | `round guardian shield with a lion emblem` |
| `orb.png` | 마나 오브 | `glowing blue mana crystal orb` |
| `heart.png` | 불사조의 심장 | `burning phoenix heart, flames` |
| `crown.png` | 왕의 왕관 | `royal golden crown with jewels` |

---

## 3순위 — 여유 있을 때 (28장)

### ✨ 전투 스킬 아이콘 18종 → `assets/skills/`
**구도:** 둥근 사각형 아이콘 느낌, 가운데 큰 심볼 하나

| 파일 | 내용 | 프롬프트 |
|---|---|---|
| `knife.png` | 수리검 | `ninja shuriken throwing star` |
| `knife_evo.png` | 수리검 폭풍 | `swirling storm of golden shurikens` |
| `orbit.png` | 회전 칼날 | `three blades spinning in a circle` |
| `orbit_evo.png` | 성검 회전진 | `holy golden swords circling, radiant` |
| `thunder.png` | 번개 | `lightning bolt` |
| `thunder_evo.png` | 뇌신의 심판 | `massive thunderstorm, chain lightning, storm cloud` |
| `aura.png` | 화염 오라 | `ring of orange fire` |
| `aura_evo.png` | 지옥불 영역 | `huge hellfire red flame circle` |
| `boomer.png` | 부메랑 | `wooden boomerang` |
| `boomer_evo.png` | 차크람 | `glowing purple chakram ring blade` |
| `rocket.png` | 로켓 | `small red rocket missile` |
| `rocket_evo.png` | 핵 미사일 | `big green nuclear missile with radiation symbol` |
| `book.png` | 마도서 | `red magic book` |
| `glove.png` | 힘의 장갑 | `red boxing glove` |
| `clock.png` | 모래시계 | `simple hourglass` |
| `armor_p.png` | 강철 갑옷 | `steel shield emblem` |
| `boots_p.png` | 바람 신발 | `winged sneakers` |
| `magnet.png` | 자석 | `red horseshoe magnet` |

### 🎁 아이템·재화 7종 → `assets/items/`

| 파일 | 내용 | 프롬프트 |
|---|---|---|
| `gold.png` | 골드 | `shiny gold coin` |
| `gem.png` | 보석 | `blue diamond gem` |
| `energy.png` | 에너지 | `yellow lightning energy icon` |
| `chest.png` | 보물상자 | `golden treasure chest, slightly open, glowing` |
| `meat.png` | 고기 | `roasted meat on the bone` |
| `magnet_item.png` | 자석 아이템 | `big red magnet` |
| `bomb.png` | 폭탄 | `round black bomb with a lit fuse` |

### 🖼️ UI 3종 → `assets/ui/`

| 파일 | 내용 | 크기 | 프롬프트 |
|---|---|---|---|
| `lobby_bg.png` | 로비 배경 | **1080×1920** (세로) | `fantasy castle town at dusk, mobile game lobby background, soft, dark bottom area` (배경 있음) |
| `app_icon.png` | 앱 아이콘 | **1024×1024** | `two crossed swords over a glowing golden emblem, purple background` (배경 있음) |
| `logo.png` | 게임 로고 | **1024×512** | `game logo text "HERO MIXER", golden letters, sword` (글자가 깨지면 생략해도 돼요) |

---

## 다 만들면

`assets/` 폴더에 넣고 알려주세요. 제가 확인한 뒤에 할게요:

1. 배경 정리 (투명하지 않으면 제거)
2. 크기 최적화 (폰에서 빠르게 로딩되도록 축소)
3. 게임에 연결: 무기는 영웅 손 위치에 맞추고, 몬스터·보스 걷기와 피격 효과 연결
4. 휴대폰 사이트에 반영
