#!/usr/bin/env node
// MAZA 플래너 캐릭터(토끼·고양이·곰, 우리가 만든 그림)를 오려서 파스텔 배경 위에 올린 플레이트를 굽는다.
//   node scripts/make-character-plates.js <planner/assets 폴더>
// 스티커 시트에서 칸 하나를 잘라 → 가장자리에서 이어진 흰 바탕만 투명하게 → 배경 위 가운데 위쪽에 올린다 (아래쪽은 이름 자리).
const sharp = require('sharp');
const path = require('path');

const SRC = process.argv[2] || '/Volumes/M/GitHub/planner/assets';
const W = 832, H = 1334;

// [파일, 열 수, 행 수, 열, 행] 또는 이미 투명한 PNG
const PLATES = [
  { key: 'bear',   src: ['big_bear_cropped.png'],          bg: ['#fff3e4', '#f7c9a8'], dots: '#ffffff' },
  { key: 'bunny',  src: ['ai_secret_rabbit.jpg', 2, 2, 0, 0], bg: ['#ffe4ec', '#f7b6c8'], dots: '#ffffff' },
  { key: 'dream',  src: ['ai_secret_rabbit.jpg', 2, 2, 1, 0], bg: ['#1d2550', '#3b4a8f'], dots: '#fff6c8', stars: true },
  { key: 'kitty',  src: ['ai_cat_stickers.jpg', 4, 4, 0, 1],  bg: ['#e3f6ef', '#a8dcc8'], dots: '#ffffff' },
  { key: 'sleepy', src: ['ai_bear_stickers.jpg', 4, 3, 2, 0], bg: ['#ece6ff', '#bfb0f2'], dots: '#ffffff' },
  { key: 'heart',  src: ['ai_bear_stickers.jpg', 4, 3, 0, 1], bg: ['#fff7d6', '#ffd978'], dots: '#ffffff' },
];

// 가장자리에서 이어진 밝은 바탕을 투명하게 (캐릭터 안의 흰색은 남는다)
async function cutout(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, seen = new Uint8Array(w * h), stack = [];
  const light = (i) => data[i * 4] > 232 && data[i * 4 + 1] > 232 && data[i * 4 + 2] > 232;
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const p = stack.pop(); if (seen[p] || !light(p)) continue;
    seen[p] = 1; data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function sticker(src) {
  const [file, cols, rows, c, r] = src;
  let img = sharp(path.join(SRC, file));
  if (cols) {
    const cw = Math.floor(1024 / cols), ch = Math.floor(1024 / rows);
    const k = 14;   // 칸 가장자리에 걸친 옆 스티커 조각은 버린다
    img = img.extract({ left: c * cw, top: r * ch + k, width: cw, height: ch - k });
    const cell = await img.png().toBuffer();
    const cut = await cutout(cell);
    return sharp(cut).trim().png().toBuffer();
  }
  return sharp(path.join(SRC, file)).trim().png().toBuffer();
}

(async () => {
  for (const p of PLATES) {
    const st = await sticker(p.src);
    const size = 560;
    const art = await sharp(st).resize(size, size, { fit: 'inside' }).png().toBuffer();
    const m = await sharp(art).metadata();
    const dots = Array.from({ length: 38 }, (_, i) => `<circle cx="${(i * 151) % W}" cy="${(i * 283) % H}" r="${p.stars ? 2 + (i % 3) : 6 + (i % 4) * 3}" fill="${p.dots}" opacity="${p.stars ? .7 : .35}"/>`).join('');
    const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
      <radialGradient id="glow" cx=".5" cy=".38" r=".45"><stop offset="0" stop-color="#fff" stop-opacity="${p.stars ? .18 : .55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>${dots}<rect width="100%" height="100%" fill="url(#glow)"/>
      <ellipse cx="${W / 2}" cy="${200 + size * .5 + m.height / 2 - 10}" rx="${m.width * .36}" ry="22" fill="#000" opacity=".10"/></svg>`;
    await sharp(Buffer.from(bg)).composite([{ input: art, left: Math.round((W - m.width) / 2), top: Math.round(200 + (size - m.height) / 2) }])
      .jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(__dirname, '..', 'assets', `plate_${p.key}.jpg`));
    console.log('plate_' + p.key);
  }
})();
