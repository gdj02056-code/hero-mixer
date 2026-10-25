"""Builds the paste-ready image generation job lists in image_jobs/.

Run:  python tools/make_image_jobs.py
Each output file is self-contained (rules + style + job list) so it can be
pasted into a local image-generation session on its own.
"""
import json
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'image_jobs')

STYLE = ('cute chibi 2D mobile game art, sticker-like game asset, clean thick dark outline, '
         'flat cel shading with soft highlights, bright saturated colors, lighting from top-left, '
         'slightly top-down three-quarter view, centered single subject, plain background, no text')
GROUND_STYLE = ('seamless tileable top-down ground texture for a 2D game, hand painted, soft low contrast, '
                'evenly lit, no objects, no characters, no perspective')
SCENE_STYLE = '2D mobile game illustration, hand painted, soft lighting, vibrant but not too busy'
NEGATIVE = ('text, letters, watermark, signature, logo, multiple subjects, duplicate, cropped, cut off, blurry, '
            'noisy, realistic, photo, 3d render, ground shadow, background scenery, frame, border, ugly, deformed')

POSES = {
    'weapon': 'the weapon lies DIAGONALLY at 45 degrees, handle/grip at the BOTTOM-LEFT, tip/head at the TOP-RIGHT, filling about 85% of the image',
    'book': 'the book is shown from the front, slightly tilted, filling about 75% of the image',
    'hero': '2-heads-tall chibi, full body standing, side three-quarter view FACING RIGHT, BOTH HANDS EMPTY (holding nothing), feet near the bottom of the image',
    'pet': 'tiny cute creature, full body, facing right',
    'monster': 'full body, facing the viewer (front view)',
    'icon': 'simple game icon, one big clear symbol, front view, filling about 80% of the image',
}

# 10 equipment grades: file suffix, Korean name, what changes with the grade
GRADES = [
    ('F', 'F', 'crude old worn version, rusty dull iron and rough plain wood, dull grey-brown colors, no decoration'),
    ('D', 'D', 'simple basic version, clean plain iron and wood, a small green cloth wrap, minimal decoration'),
    ('C', 'C', 'sturdy version, clean steel, teal accents, one small teal gem, neat leather wrap'),
    ('B', 'B', 'polished steel version, blue accents, a blue gemstone, simple engraved patterns'),
    ('A', 'A', 'fine silver mithril version, purple accents, a glowing purple gem, elegant engravings'),
    ('S', 'S', 'ornate enchanted version, pink and magenta accents, glowing pink crystals, faint magic sparkles'),
    ('SS', 'SS', 'heroic ornate version, orange and gold trim, glowing orange runes, small fiery sparkles'),
    ('SSS', 'SSS', 'masterwork ornate version, crimson red and gold, glowing red runes, soft red aura'),
    ('EPIC', '에픽', 'epic artifact version, violet and magenta crystal parts, swirling arcane purple energy, strong purple glow'),
    ('LEGEND', '전설', 'divine legendary relic version, radiant gold and white, holy light rays, rainbow sparkles, intense golden glow'),
]

WEAPONS = [
    ('sword', 'fantasy longsword with a crossguard, grip and pommel', 'weapon'),
    ('dagger', 'short curved dagger with a guard and a wrapped handle', 'weapon'),
    ('bow', 'recurve bow with an arrow nocked on the string', 'weapon'),
    ('crossbow', 'crossbow with a loaded bolt', 'weapon'),
    ('gun', 'flintlock musket rifle with a long barrel and a wooden stock', 'weapon'),
    ('hammer', 'big two-handed war hammer with a heavy block head', 'weapon'),
    ('axe', 'battle axe with a single wide curved blade', 'weapon'),
    ('spear', 'long spear with a leaf-shaped tip and a tassel', 'weapon'),
    ('scythe', 'grim reaper scythe with a large curved blade and a long handle', 'weapon'),
    ('spellbook', 'magic spellbook, closed thick tome with an emblem on the cover', 'book'),
    ('wand', 'short magic wand with a star crystal tip', 'weapon'),
    ('staff', 'long wizard staff with an orb held by claws at the top', 'weapon'),
]

EQUIP = [
    ('armor', 'fantasy chest plate armor'),
    ('helmet', 'knight helmet with a visor'),
    ('gloves', 'pair of gauntlets'),
    ('ring', 'ring with a gemstone'),
    ('neck', 'necklace with a pendant'),
    ('belt', 'belt with a buckle, coiled'),
    ('boots', 'pair of adventurer boots'),
]

HERO_RARITY = {
    0: ('R', 'simple modest outfit'),
    1: ('SR', 'nicer outfit with small decorative details'),
    2: ('SSR', 'ornate outfit with gold trim and a faint magical glow'),
    3: ('UR', 'epic legendary outfit with ornate gold details and a glowing magical aura'),
}
HEROES = [
    # UR
    ('sunking', 3, 'sun king, golden hair, big golden crown, shining gold armor, red royal cape'),
    ('lich', 3, 'lich lord, icy cyan hair, crown, pale blue skin, dark indigo robe, teal cape, glowing eyes'),
    ('archangel', 3, 'archangel, light blonde hair, golden halo, golden helmet, white armor, small white wings, yellow cape'),
    ('demonlord', 3, 'demon lord, black hair, red horns, small dark crown, pinkish red skin, dark crimson armor, red cape'),
    ('gunqueen', 3, 'gun queen, crimson red hair, black cowboy hat, black coat, crimson cape'),
    ('titan', 3, 'titan giant warrior, grey beard, stone grey helmet, heavy grey armor, bronze cape, muscular'),
    ('reaper', 3, 'grim reaper girl, white hair, dark hood, black robe, purple cape'),
    ('dragoon', 3, 'dragon knight, red dragon helmet with horns, crimson armor, golden cape'),
    ('archmage', 3, 'archmage, long white hair, tall dark indigo wizard hat, indigo robe, lavender cape'),
    # SSR
    ('paladin', 2, 'holy paladin, silver helmet, white plate armor, golden cape'),
    ('berserker', 2, 'berserker warrior, red hair, horned helmet, grey fur armor, dark red cape'),
    ('ninja', 2, 'wind ninja, black hair, face mask, navy blue outfit, light blue scarf'),
    ('stormmage', 2, 'storm mage, light blue hair, tall dark blue wizard hat, navy robe, sky blue cape, tiny sparks'),
    ('commander', 2, 'knight commander, grey beard, dark steel helmet, black plate armor, red cape'),
    ('shadowqueen', 2, 'shadow queen, dark purple hair, small golden crown, black dress armor, purple cape, pale skin'),
    ('sniper', 2, 'sniper ranger, green camouflage hood, olive outfit, dark green cape'),
    ('saint', 2, 'holy saint girl, cream hair, golden halo, small crown, white and gold robe, golden cape'),
    ('tiger', 2, 'tiger warrior, orange hair, tiger ears, black headband, brown armor, orange cape'),
    # SR
    ('rogue', 1, 'shadow thief, black hair, dark cloth mask over the mouth, dark grey outfit, purple cape'),
    ('mage', 1, 'fire mage, red hair, tall dark orange wizard hat, brown robe, orange cape'),
    ('monk', 1, 'bald monk, tan skin, golden yellow robe'),
    ('priest', 1, 'kind priest girl, light blonde hair, golden halo above head, white robe, light blue cape'),
    ('samurai', 1, 'samurai, black topknot hair, white headband, red samurai armor, black cape'),
    ('catgirl', 1, 'cat girl swordswoman, orange hair, orange cat ears, cream outfit, orange cape'),
    ('viking', 1, 'viking warrior, orange braided beard, horned helmet, grey fur armor, blue cape'),
    ('elfarcher', 1, 'elf archer, pale blonde long hair, pointed elf ears, light green outfit, dark green cape'),
    ('alchemist', 1, 'alchemist, dark teal hood, teal robe, mint green cape, small potion bottles on belt'),
    # R
    ('knight', 0, 'young knight boy, orange hair, blue tunic, red cape'),
    ('archer', 0, 'forest archer girl, green hood, green leather outfit, brown cape'),
    ('gunner', 0, 'gunslinger, brown cowboy hat, grey long coat, brown cape'),
    ('squire', 0, 'young shield soldier, brown hair, round steel helmet, grey tunic, blue cape'),
    ('hunter', 0, 'hunter, grey hair, red headband, olive green leather outfit, brown cape'),
    ('farmer', 0, 'brave farmer boy, yellow straw hat, blue overalls, green cape'),
    ('apprentice', 0, 'apprentice wizard girl, purple hair, tall dark purple wizard hat, violet robe, lilac cape'),
    ('sailor', 0, 'pirate sailor, black hair, red bandana, white striped shirt, navy blue cape'),
    ('scout', 0, 'elf forest scout, blonde hair, pointed elf ears, green tunic, dark green cape'),
]

PET_RARITY = {
    0: ('일반', 'plain simple look'),
    1: ('희귀', 'small sparkle accents'),
    2: ('영웅', 'faint magical glow'),
    3: ('전설', 'radiant legendary aura with glowing particles'),
}
PETS = [
    # 전설
    ('dragon', 3, 'baby red dragon with small purple wings, tiny horns, yellow belly'),
    ('phoenix', 3, 'baby phoenix bird made of orange and yellow flames'),
    ('icedragon', 3, 'baby ice dragon, light blue scales, white crystal wings'),
    ('starspirit', 3, 'smiling yellow star spirit, glowing, tiny sparkles around'),
    # 영웅
    ('eagle', 2, 'small bald eagle with spread brown wings, white head, yellow beak'),
    ('wolf', 2, 'frost wolf pup, light blue fur, fluffy tail, fierce eyes'),
    ('jelly', 2, 'glowing purple jellyfish with electric tentacles'),
    ('golem', 2, 'mini stone golem with glowing yellow eyes'),
    ('kingslime', 2, 'golden king slime wearing a small crown'),
    # 희귀
    ('fairy', 1, 'tiny pink healing fairy with translucent light blue wings'),
    ('ghost', 1, 'small white ghost with a wavy bottom and black oval eyes'),
    ('turtle', 1, 'turtle with a green rock shell'),
    ('iceslime', 1, 'light cyan ice slime with frost sparkles'),
    ('owl', 1, 'round brown owl with big yellow eyes'),
    ('fox', 1, 'red fire fox with a fluffy tail and white chest'),
    ('robot', 1, 'small hovering robot, grey metal box head, red glowing eye, antenna'),
    # 일반
    ('slime', 0, 'green slime blob pet with big shiny eyes'),
    ('cat', 0, 'orange cat wearing a tiny silver knight helmet'),
    ('bunny', 0, 'white bunny with long ears and pink inner ears'),
    ('penguin', 0, 'baby penguin, black and white, orange beak and feet'),
    ('shroom', 0, 'walking mushroom, red cap with white dots, cream stem with a face'),
    ('bee', 0, 'chubby bumblebee, yellow and black stripes, small wings'),
    ('fireslime', 0, 'orange fire slime with a small flame on top'),
    ('puppy', 0, 'golden puppy with floppy brown ears and a red collar with a gold coin tag'),
]

MONSTERS = [
    ('slime', 'green slime monster with an angry cute face'),
    ('bat', 'purple bat monster with spread wings, red eyes'),
    ('archer', 'small orange goblin archer holding a short bow'),
    ('golem', 'small brown rock golem, blocky body, glowing yellow eyes'),
    ('elite', 'big red horned demon brute, angry, muscular'),
]
BOSSES = [
    ('boss1', '킹 슬라임', 'giant king slime boss wearing a golden crown, green'),
    ('boss2', '사막 전갈왕', 'giant desert scorpion king boss, golden armor plates, raised stinger'),
    ('boss3', '유적의 수호자', 'ancient stone guardian golem boss with glowing blue runes'),
    ('boss4', '서리 거인', 'frost giant boss, icy blue skin, ice armor, frozen beard'),
    ('boss5', '용암 골렘', 'lava golem boss, black rock body with glowing orange magma cracks'),
    ('boss6', '어둠의 군주', 'dark lord boss, black spiked armor, purple flames, glowing red eyes'),
    ('boss7', '망령 기사단장', 'ghostly undead knight commander boss, tattered banner, spectral green glow'),
    ('boss8', '늪의 히드라', 'swamp hydra boss with three snake heads, green scales'),
    ('boss9', '천공의 그리폰', 'sky griffin boss, white eagle head, golden lion body, large wings'),
    ('boss10', '혼돈의 마왕', 'chaos demon king boss, crimson and black, four horns, swirling dark aura'),
]
STAGES = [
    'green grass meadow with tiny flowers', 'desert sand with small pebbles', 'ancient cracked stone tiles with moss',
    'icy blue frozen cave floor with frost', 'dark volcanic rock with thin glowing lava cracks', 'dark dungeon stone brick floor, slight purple tint',
    'muddy battlefield dirt with scattered broken arrows', 'murky green swamp ground with small puddles',
    'soft white cloud floor with light blue sky gaps', 'dark crimson cracked ground with faint magenta glow',
]
RELICS = [
    ('sheath', 'ancient ornate sword sheath with gold trim'), ('grail', 'holy golden grail cup with a red glow'),
    ('whetstone', 'grey sharpening whetstone with sparks'), ('feather', 'light green wind feather with swirling wind'),
    ('coin', 'big ancient gold coin with a crown emblem'), ('scroll', 'rolled ancient parchment scroll with a red ribbon'),
    ('lens', 'golden monocle lens showing an eagle eye'), ('hourglass', 'ornate golden hourglass with glowing blue sand'),
    ('shield', 'round guardian shield with a golden lion emblem'), ('orb', 'glowing blue mana crystal orb on a small stand'),
    ('heart', 'burning phoenix heart wrapped in flames'), ('crown', 'royal golden crown with red and blue jewels'),
]
SKILLS = [
    ('knife', 'silver ninja shuriken throwing star'), ('knife_evo', 'swirling storm of golden shurikens, radiant'),
    ('orbit', 'three silver blades spinning in a circle'), ('orbit_evo', 'holy golden swords circling, radiant light'),
    ('thunder', 'yellow lightning bolt'), ('thunder_evo', 'dark storm cloud shooting chain lightning'),
    ('aura', 'ring of orange fire'), ('aura_evo', 'huge crimson hellfire flame circle'),
    ('boomer', 'wooden boomerang'), ('boomer_evo', 'glowing purple chakram ring blade'),
    ('rocket', 'small red rocket missile with flame'), ('rocket_evo', 'big green nuclear missile with a radiation symbol'),
    ('book', 'red magic book with a golden star'), ('glove', 'red boxing glove'),
    ('clock', 'simple wooden hourglass with golden sand'), ('armor_p', 'steel shield emblem'),
    ('boots_p', 'blue sneakers with small white wings'), ('magnet', 'red horseshoe magnet with silver tips'),
]
ITEMS = [
    ('gold', 'shiny gold coin'), ('gem', 'sparkling blue diamond gem'), ('energy', 'yellow lightning bolt energy icon'),
    ('chest', 'golden treasure chest, slightly open, glowing light inside'), ('meat', 'roasted meat on the bone'),
    ('magnet_item', 'big red horseshoe magnet'), ('bomb', 'round black bomb with a lit fuse'),
]

GREENISH = ('green', 'teal', 'mint', 'olive', 'lime', 'emerald', 'cyan')


def bg_for(prompt):
    """Solid key color that is not in the subject, for tools without transparency."""
    return 'magenta' if any(w in prompt.lower() for w in GREENISH) else 'green'


def job(path, prompt, pose=None, size='512x512', bg=None, style=None):
    j = {'file': path, 'size': size, 'bg': bg or bg_for(prompt)}
    if pose:
        j['pose'] = pose
    if style:
        j['style'] = style
    j['prompt'] = prompt
    return j


def header(title, count, extra=''):
    poses = '\n'.join(f'{k:<8}: {v}' for k, v in POSES.items())
    return f"""You are generating game art for a 2D mobile survival action RPG called "Hero Mixer".
This file: {title}.
Generate EVERY image in the JOB LIST below, one by one, and save each one to the exact file path given.

=== RULES ===
1. Final prompt for each image = STYLE + ", " + job "prompt". Jobs with "style": "ground" or "scene" use that style instead of STYLE.
2. Use NEGATIVE as the negative prompt for every image.
3. Background:
   - If you can output a transparent PNG, use a transparent background for every job with "bg": "green" or "bg": "magenta".
   - If you cannot, fill the background with a flat solid color: "green" = pure #00FF00, "magenta" = pure #FF00FF. No gradient, no shadow, no scenery.
   - "bg": "full" means a normal full picture (no transparency needed).
4. Size: use the "size" field (width x height). Save as PNG.
5. Composition: exactly ONE subject, centered, fully inside the frame with a small margin. Never crop the subject.
6. Keep the same art style, outline thickness and lighting across ALL images so they look like one game.
7. Follow each job's "pose" note exactly (see POSE NOTES).
8. If an image comes out wrong (text, extra objects, cropped, wrong pose), regenerate it.
9. When finished, print a list of saved files and any jobs that failed.
{extra}
=== STYLE ===
{STYLE}

=== STYLE for "style": "ground" ===
{GROUND_STYLE}

=== STYLE for "style": "scene" ===
{SCENE_STYLE}

=== NEGATIVE ===
{NEGATIVE}

=== POSE NOTES ===
{poses}

=== JOB LIST ({count} images) ===
"""


GRADE_RULES = """
=== GRADE RULES (very important) ===
Items come in 10 grades. The file name ends with the grade: _F, _D, _C, _B, _A, _S, _SS, _SSS, _EPIC, _LEGEND.
- All 10 grades of the same item must be the SAME KIND of object with the SAME overall shape, angle, size and position,
  so they can be swapped in the game without moving. Only materials, colors, decorations and glow change.
- Generate the 10 grades of one item back to back. If you can, use the F image as a reference (img2img / same seed)
  for the higher grades and only add detail.
- Higher grade = more ornate, more precious materials, stronger glow. F looks cheap and worn, LEGEND looks divine.
"""


def write(name, title, jobs, extra=''):
    os.makedirs(OUT, exist_ok=True)
    lines = ',\n'.join('  ' + json.dumps(j, ensure_ascii=False) for j in jobs)
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(header(title, len(jobs), extra) + '[\n' + lines + '\n]\n')
    print(f'{name}: {len(jobs)} jobs')
    return len(jobs)


def main():
    total = 0
    for part, half in (('a', WEAPONS[:6]), ('b', WEAPONS[6:])):
        jobs = [job(f'assets/weapons/{wid}_{suf}.png', f'{desc}, {gdesc}', pose)
                for wid, desc, pose in half for suf, _, gdesc in GRADES]
        names = ', '.join(w[0] for w in half)
        total += write(f'01{part}_weapons.txt', f'PART 1{part.upper()} of 7 - weapons x 10 grades ({names})', jobs, GRADE_RULES)

    jobs = [job(f'assets/heroes/{hid}.png', f'{desc}, {HERO_RARITY[r][1]}', 'hero') for hid, r, desc in HEROES]
    total += write('02_heroes.txt', 'PART 2 of 7 - 36 heroes (UR heroes look the most epic, R heroes the simplest)', jobs)

    jobs = [job(f'assets/pets/{pid}.png', f'cute {desc}, {PET_RARITY[r][1]}', 'pet') for pid, r, desc in PETS]
    total += write('03_pets.txt', 'PART 3 of 7 - 24 pets (legendary pets look the most magical)', jobs)

    jobs = [job(f'assets/monsters/{mid}.png', desc, 'monster') for mid, desc in MONSTERS]
    jobs += [job(f'assets/bosses/{bid}.png', desc, 'monster') for bid, _, desc in BOSSES]
    total += write('04_monsters_bosses.txt', 'PART 4 of 7 - 5 monsters and 10 bosses (bosses are big and threatening but keep the cute style)', jobs)

    jobs = [job(f'assets/equip/{eid}_{suf}.png', f'{desc}, {gdesc}', 'icon')
            for eid, desc in EQUIP for suf, _, gdesc in GRADES]
    total += write('05_equipment.txt', 'PART 5 of 7 - 7 armor and accessory types x 10 grades', jobs, GRADE_RULES)

    jobs = [job(f'assets/stages/stage{i + 1}.png', d, size='512x512', bg='full', style='ground') for i, d in enumerate(STAGES)]
    jobs += [job(f'assets/relics/{rid}.png', d, 'icon') for rid, d in RELICS]
    jobs += [job(f'assets/items/{iid}.png', d, 'icon') for iid, d in ITEMS]
    jobs += [
        job('assets/ui/lobby_bg.png', 'fantasy castle town at dusk, purple and orange sky, mobile game lobby background, darker empty bottom area', size='1080x1920', bg='full', style='scene'),
        job('assets/ui/app_icon.png', 'two crossed swords over a glowing golden round emblem, deep purple background, app icon', size='1024x1024', bg='full'),
        job('assets/ui/logo.png', 'game title logo reading HERO MIXER, bold golden letters with a sword. Skip this job if the text comes out misspelled', 'icon', size='1024x512'),
    ]
    total += write('06_world_relics_items.txt', 'PART 6 of 7 - 10 stage ground textures, 12 relics, 7 items, 3 UI images', jobs)

    jobs = [job(f'assets/skills/{sid}.png', d, 'icon') for sid, d in SKILLS]
    total += write('07_skills.txt', 'PART 7 of 7 - 18 battle skill icons', jobs)
    print('total', total)


if __name__ == '__main__':
    main()
