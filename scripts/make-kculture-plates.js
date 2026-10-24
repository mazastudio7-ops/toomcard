#!/usr/bin/env node
// K-컬처 플레이트: Pixabay(무료, 상업 이용 가능) 이미지를 명함 비율로 자르고, 아래쪽에 이름이 읽히도록 어둡게 깐다.
//   node scripts/make-kculture-plates.js <받아 둔 원본 폴더>
// 원본 주소·작품 번호는 assets/plates/CREDITS.md 에 남긴다. 실제 인물 사진은 쓰지 않는다.
const sharp = require('sharp');
const path = require('path');

const SRC = process.argv[2];
if (!SRC) { console.error('usage: node scripts/make-kculture-plates.js <folder>'); process.exit(1); }
const W = 832, H = 1334;

// fit: 'cover' = 꽉 채워 자르기 / 'figure' = 투명 PNG 캐릭터를 배경 위에 올리기
const PLATES = [
  { key: 'taekwon',    file: 'tiger-8091579_1280.png',            fit: 'figure', bg: ['#0f2a6b', '#c8102e'] },   // 태극 파랑 → 빨강
  { key: 'tkbunny',    file: 'rabbit-8559925_1280.png',           fit: 'cover', pos: 'center', light: true },
  { key: 'dragon',     file: 'ai-generated-8569051_1280.png',     fit: 'cover', pos: 'top' },
  { key: 'geobukseon', file: 'turtle-ship-190366_1280.jpg',       fit: 'cover', pos: 'center' },
  { key: 'dancheong',  file: 'changdeokgung-palace-7143039_1280.jpg', fit: 'cover', pos: 'center' },
  { key: 'pavilion',   file: 'hyangwonjeong-pavilion-7490471_1280.jpg', fit: 'cover', pos: 'center' },
  { key: 'blossom',    file: 'palace-7937797_1280.jpg',           fit: 'cover', pos: 'center' },
  { key: 'eaves',      file: 'sky-6882623_1280.jpg',              fit: 'cover', pos: 'bottom' },
];

const shade = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
  <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#s)"/></svg>`;

(async () => {
  for (const p of PLATES) {
    const src = path.join(SRC, p.file);
    let out;
    if (p.fit === 'cover') {
      out = sharp(src).flatten({ background: '#f4b6c6' }).resize(W, H, { fit: 'cover', position: p.pos || 'center' });
      if (!p.light) out = out.composite([{ input: Buffer.from(shade) }]);   // 밝은 그림은 그대로 (글자가 어두워진다)
    } else {
      const art = await sharp(src).trim().resize(540, 700, { fit: 'inside' }).png().toBuffer();
      const m = await sharp(art).metadata();
      const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
        <radialGradient id="glow" cx=".5" cy=".38" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#glow)"/>
        <ellipse cx="${W / 2}" cy="${150 + m.height - 6}" rx="${m.width * .34}" ry="20" fill="#000" opacity=".18"/></svg>`;
      out = sharp(Buffer.from(bg)).composite([{ input: art, left: Math.round((W - m.width) / 2), top: 150 }]);
    }
    await out.jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(__dirname, '..', 'assets', `plate_${p.key}.jpg`));
    console.log('plate_' + p.key);
  }
})();
