#!/usr/bin/env node
// 툼 프렌즈 스티커: MAZA 플래너 배포 팩(dist_packages)에 이미 깨끗하게 잘려 있는 투명 PNG 를 가져와 이름표(manifest.json)를 붙인다.
//   node scripts/make-stickers.js <planner 폴더>
// 결과: assets/stickers/<family>-<nn>.png + assets/stickers/manifest.json
// 번호는 처음 정한 순서를 그대로 둔다 (홈 전시·플레이트·만든 카드가 번호로 가리킨다). 큰 코코아 곰(bear-00)만 따로 오린다.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const P = process.argv[2] || '/Volumes/M/GitHub/planner';
const PACK = path.join(P, 'dist_packages', 'Setupod_2027_All_in_One_Package', '사은품_기본_스티커팩');
const RAB = path.join(P, 'dist_packages', 'Kakao_Secret_Stickers', 'rabbit');
const OUT = path.join(__dirname, '..', 'assets', 'stickers');
fs.mkdirSync(OUT, { recursive: true });

const st = (dir, n) => path.join(dir, `sticker_${String(n).padStart(3, '0')}.png`);
// 가족 이름: 곰 = 툼돌이, 고양이 = 툼냥이, 토끼 = 툼깡이 (깡총깡총), 컬러 친구들 = 툼 친구들
const FAMILIES = {
  bear: { ko: '툼돌이', en: 'Toomdol the Bear', de: 'Toomdol der Bär', emoji: '🐻', list: [
    [null, '코코아 툼돌이 (대표)', 'Cocoa Toomdol (main)', 'Kakao-Toomdol (Hauptfigur)'],   // bear-00: 큰 그림
    [st(PACK + '/bear', 1), '커피 한 잔', 'Coffee', 'Kaffee'], [st(PACK + '/bear', 4), '일하는 중', 'Working', 'Bei der Arbeit'], [st(PACK + '/bear', 2), '꿀잠', 'Fast asleep', 'Tiefschlaf'], [st(PACK + '/bear', 3), '독서', 'Reading', 'Lesen'],
    [st(PACK + '/bear', 5), '하트', 'Heart', 'Herz'], [st(PACK + '/bear', 6), '소파 휴식', 'Sofa break', 'Sofa-Pause'], [st(PACK + '/bear', 8), '팬케이크', 'Pancakes', 'Pfannkuchen'], [st(PACK + '/bear', 7), '화분 키우기', 'Plant care', 'Pflanzenpflege'],
    [st(PACK + '/bear', 9), '킥보드', 'Scooter', 'Roller'], [st(PACK + '/bear', 10), '음악 감상', 'Music', 'Musik'], [st(PACK + '/bear', 11), '공부', 'Studying', 'Lernen'], [st(PACK + '/bear', 12), '낮잠', 'Nap', 'Nickerchen']] },
  cat: { ko: '툼냥이', en: 'Toomnyang the Cat', de: 'Toomnyang die Katze', emoji: '🐱', start: 1, list: [
    [st(PACK + '/cat', 4), '구름 낮잠', 'Cloud nap', 'Wolken-Nickerchen'], [st(PACK + '/cat', 1), '간식 타임', 'Snack time', 'Snackzeit'], [st(PACK + '/cat', 2), '기지개', 'Stretch', 'Strecken'], [st(PACK + '/cat', 3), '뜨개질', 'Knitting', 'Stricken'],
    [st(PACK + '/cat', 6), '독서', 'Reading', 'Lesen'], [st(PACK + '/cat', 8), '거품 목욕', 'Bubble bath', 'Schaumbad'], [st(PACK + '/cat', 7), '도넛', 'Donuts', 'Donuts'], [st(PACK + '/cat', 5), '커피', 'Coffee', 'Kaffee'],
    [st(PACK + '/cat', 10), '그림 그리기', 'Drawing', 'Zeichnen'], [st(PACK + '/cat', 11), '실뭉치 놀이', 'Yarn play', 'Wollknäuel'], [st(PACK + '/cat', 9), '물 주기', 'Watering', 'Gießen'], [st(PACK + '/cat', 12), '가을 산책', 'Autumn walk', 'Herbstspaziergang'],
    [st(PACK + '/cat', 17), '노트북', 'Laptop', 'Laptop'], [st(PACK + '/cat', 14), '자전거', 'Bicycle', 'Fahrrad'], [st(PACK + '/cat', 13), '요리', 'Cooking', 'Kochen'], [st(PACK + '/cat', 15), '음악 감상', 'Music', 'Musik'], [st(PACK + '/cat', 16), '외출', 'Going out', 'Unterwegs']] },
  bunny: { ko: '툼깡이', en: 'Toomkkang the Bunny', de: 'Toomkkang der Hase', emoji: '🐰', start: 1, list: [
    [st(RAB, 1), '당근 수확', 'Carrot', 'Karotte'], [st(RAB, 2), '구름 낮잠', 'Cloud nap', 'Wolken-Nickerchen'], [st(RAB, 3), '독서', 'Reading', 'Lesen'], [st(RAB, 4), '버블티', 'Bubble tea', 'Bubble Tea']] },
  pals: { ko: '툼 친구들', en: 'TOOM Pals', de: 'TOOM-Freunde', emoji: '🌈', start: 1, list: [
    ['분홍 토끼 꿀잠', 'Pink bunny asleep', 'Rosa Hase schläft'], ['파랑 토끼 독서', 'Blue bunny reading', 'Blauer Hase liest'], ['노랑 곰 라떼', 'Yellow bear latte', 'Gelber Bär mit Latte'], ['크림 고양이 인사', 'Cream cat hello', 'Creme-Katze winkt'],
    ['분홍 토끼 하트', 'Pink bunny heart', 'Rosa Hase mit Herz'], ['베이지 곰 낮잠', 'Beige bear nap', 'Beiger Bär döst'], ['회색 고양이 노트북', 'Gray cat laptop', 'Graue Katze am Laptop'], ['노랑 곰 이불 낮잠', 'Yellow bear snoozing', 'Gelber Bär unter der Decke'],
    ['파랑 토끼 인사', 'Blue bunny hello', 'Blauer Hase winkt'], ['분홍 곰 커피', 'Pink bear coffee', 'Rosa Bär mit Kaffee'], ['크림 고양이 독서', 'Cream cat reading', 'Creme-Katze liest'], ['베이지 곰 꿀잠', 'Beige bear asleep', 'Beiger Bär schläft'],
    ['회색 토끼 노트북', 'Gray bunny laptop', 'Grauer Hase am Laptop'], ['크림 토끼 인사', 'Cream bunny hello', 'Creme-Hase winkt'], ['노랑 곰 하트', 'Yellow bear heart', 'Gelber Bär mit Herz'], ['분홍 고양이 독서', 'Pink cat reading', 'Rosa Katze liest'],
    ['갈색 토끼 노트북', 'Brown bunny laptop', 'Brauner Hase am Laptop'], ['베이지 곰 하트', 'Beige bear heart', 'Beiger Bär mit Herz'], ['분홍 고양이 인사', 'Pink cat hello', 'Rosa Katze winkt'], ['파랑 곰 꿀잠', 'Blue bear asleep', 'Blauer Bär schläft']]
    .map(([ko, en, de], i) => [st(PACK + '/character', i + 1), ko, en, de]) },
};

// 큰 코코아 곰(시트 밖의 한 장)만: 흰 다이컷 테두리를 버리고 캐릭터 선 안쪽만 남긴다
async function cutout(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, seen = new Uint8Array(w * h), stack = [];
  const light = (i) => { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; const lum = .299 * r + .587 * g + .114 * b, sat = Math.max(r, g, b) - Math.min(r, g, b); return lum > 185 && sat < 26; };
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop(); if (seen[p] || !light(p)) continue;
    seen[p] = 1; data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
  }
  let a = new Float32Array(w * h); for (let i = 0; i < w * h; i++) a[i] = data[i * 4 + 3];
  const erode = (src) => { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 255; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= h || xx < 0 || xx >= w) { m = 0; continue; } m = Math.min(m, src[yy * w + xx]); } o[y * w + x] = m; } return o; };
  const box = (src) => { const t = new Float32Array(w * h), o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; t[i] = (src[i] + src[i - (x > 0 ? 1 : 0)] + src[i + (x < w - 1 ? 1 : 0)]) / 3; } for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; o[i] = (t[i] + t[i - (y > 0 ? w : 0)] + t[i + (y < h - 1 ? w : 0)]) / 3; } return o; };
  a = box(erode(erode(a)));
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = Math.max(0, Math.min(255, Math.round((a[i] - 0.3 * 255) * 2)));
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

(async () => {
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  const manifest = { families: {}, stickers: [] };
  for (const [fam, f] of Object.entries(FAMILIES)) {
    manifest.families[fam] = { ko: f.ko, en: f.en, de: f.de, emoji: f.emoji };
    for (const [i, [file, ko, en, de]] of f.list.entries()) {
      const id = `${fam}-${String(i + (f.start || 0)).padStart(2, '0')}`;
      if (!file) {   // bear-00: 큰 코코아 곰
        const cut = await cutout(await sharp(path.join(P, 'assets', 'big_bear_cropped.png')).flatten({ background: '#fff' }).png().toBuffer());
        await sharp(cut).trim().resize(768, 768, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(OUT, id + '.png'));
      } else {
        await sharp(file).trim().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(OUT, id + '.png'));
      }
      manifest.stickers.push({ id, family: fam, ko, en, de });
      console.log(id, ko);
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
})();
