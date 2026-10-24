#!/usr/bin/env node
// 툼 프렌즈 스티커: MAZA 플래너 스티커 시트를 한 장씩 오려 투명 PNG 로 굽고, 이름표(manifest.json)를 만든다.
//   node scripts/make-stickers.js <planner/assets 폴더>
// 결과: assets/stickers/<family>-<nn>.png + assets/stickers/manifest.json
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || '/Volumes/M/GitHub/planner/assets';
const OUT = path.join(__dirname, '..', 'assets', 'stickers');
fs.mkdirSync(OUT, { recursive: true });

// 가족 이름: 곰 = 툼돌이, 고양이 = 툼냥이, 토끼 = 툼깡이 (깡총깡총)
const FAMILIES = {
  bear:  { file: 'ai_bear_stickers.jpg',  cols: 4, rows: 3, ko: '툼돌이', en: 'Toomdol the Bear', de: 'Toomdol der Bär', emoji: '🐻',
           poses: [['커피 한 잔', 'Coffee', 'Kaffee'], ['일하는 중', 'Working', 'Bei der Arbeit'], ['꿀잠', 'Fast asleep', 'Tiefschlaf'], ['독서', 'Reading', 'Lesen'],
                   ['하트', 'Heart', 'Herz'], ['소파 휴식', 'Sofa break', 'Sofa-Pause'], ['팬케이크', 'Pancakes', 'Pfannkuchen'], ['화분 키우기', 'Plant care', 'Pflanzenpflege'],
                   ['킥보드', 'Scooter', 'Roller'], ['음악 감상', 'Music', 'Musik'], ['공부', 'Studying', 'Lernen'], ['낮잠', 'Nap', 'Nickerchen']] },
  // 고양이 시트는 아래 두 줄이 격자에서 벗어나 있어서(마지막 줄은 5마리) 그 칸들은 직접 잰 상자로 자른다
  cat:   { file: 'ai_cat_stickers.jpg',   cols: 4, rows: 4, count: 17, ko: '툼냥이', en: 'Toomnyang the Cat', de: 'Toomnyang die Katze', emoji: '🐱',
           boxes: { 9: [20, 530, 215, 230], 10: [255, 525, 310, 235], 11: [585, 525, 220, 235], 12: [825, 525, 190, 235],
                    13: [25, 770, 220, 240], 14: [250, 775, 175, 235], 15: [428, 775, 197, 235], 16: [628, 770, 177, 240], 17: [810, 770, 195, 240] },
           poses: [['구름 낮잠', 'Cloud nap', 'Wolken-Nickerchen'], ['간식 타임', 'Snack time', 'Snackzeit'], ['기지개', 'Stretch', 'Strecken'], ['뜨개질', 'Knitting', 'Stricken'],
                   ['독서', 'Reading', 'Lesen'], ['거품 목욕', 'Bubble bath', 'Schaumbad'], ['도넛', 'Donuts', 'Donuts'], ['커피', 'Coffee', 'Kaffee'],
                   ['그림 그리기', 'Drawing', 'Zeichnen'], ['실뭉치 놀이', 'Yarn play', 'Wollknäuel'], ['물 주기', 'Watering', 'Gießen'], ['가을 산책', 'Autumn walk', 'Herbstspaziergang'],
                   ['노트북', 'Laptop', 'Laptop'], ['자전거', 'Bicycle', 'Fahrrad'], ['요리', 'Cooking', 'Kochen'], ['음악 감상', 'Music', 'Musik'], ['외출', 'Going out', 'Unterwegs']] },
  bunny: { file: 'ai_secret_rabbit.jpg',  cols: 2, rows: 2, ko: '툼깡이', en: 'Toomkkang the Bunny', de: 'Toomkkang der Hase', emoji: '🐰',
           poses: [['당근 수확', 'Carrot', 'Karotte'], ['구름 낮잠', 'Cloud nap', 'Wolken-Nickerchen'], ['독서', 'Reading', 'Lesen'], ['버블티', 'Bubble tea', 'Bubble Tea']] },
};

// 가장자리에서 이어진 밝은 바탕만 투명하게 (캐릭터 안의 흰색은 남긴다)
async function cutout(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, seen = new Uint8Array(w * h), stack = [];
  const light = (i) => data[i * 4] > 228 && data[i * 4 + 1] > 228 && data[i * 4 + 2] > 228;
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop(); if (seen[p] || !light(p)) continue;
    seen[p] = 1; data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

(async () => {
  const manifest = { families: {}, stickers: [] };
  for (const [fam, f] of Object.entries(FAMILIES)) {
    manifest.families[fam] = { ko: f.ko, en: f.en, de: f.de, emoji: f.emoji };
    const cw = Math.floor(1024 / f.cols), ch = Math.floor(1024 / f.rows), k = 10;
    for (let i = 0; i < (f.count || f.cols * f.rows); i++) {
      const c = i % f.cols, r = Math.floor(i / f.cols);
      const bx = f.boxes && f.boxes[i + 1];
      const box = bx ? { left: bx[0], top: bx[1], width: bx[2], height: bx[3] } : { left: c * cw + k, top: r * ch + k, width: cw - 2 * k, height: ch - 2 * k };
      const cell = await sharp(path.join(SRC, f.file)).extract(box).png().toBuffer();
      const cut = await cutout(cell);
      const id = `${fam}-${String(i + 1).padStart(2, '0')}`;
      await sharp(cut).trim().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, id + '.png'));
      const [ko, en, de] = f.poses[i];
      manifest.stickers.push({ id, family: fam, ko, en, de });
      console.log(id, ko);
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
})();
