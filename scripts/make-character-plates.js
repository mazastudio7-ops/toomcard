#!/usr/bin/env node
// 캐릭터 플레이트 6장 (메이커 기본 디자인): 깨끗하게 오린 스티커(assets/stickers) 를 파스텔 배경 위에 올린다.
//   node scripts/make-character-plates.js
const sharp = require('sharp');
const path = require('path');
const A = path.join(__dirname, '..', 'assets');
const W = 832, H = 1334;

const PLATES = [
  { key: 'bear',   id: 'bear-00',  bg: ['#fff3e4', '#f7c9a8'], dots: '#ffffff' },
  { key: 'bunny',  id: 'bunny-01', bg: ['#ffe4ec', '#f7b6c8'], dots: '#ffffff' },
  { key: 'dream',  id: 'bunny-02', bg: ['#1d2550', '#3b4a8f'], dots: '#fff6c8', stars: true },
  { key: 'kitty',  id: 'cat-05',   bg: ['#e3f6ef', '#a8dcc8'], dots: '#ffffff' },
  { key: 'sleepy', id: 'bear-03',  bg: ['#ece6ff', '#bfb0f2'], dots: '#ffffff' },
  { key: 'heart',  id: 'bear-05',  bg: ['#fff7d6', '#ffd978'], dots: '#ffffff' },
];

(async () => {
  for (const p of PLATES) {
    const size = 600;
    const art = await sharp(path.join(A, 'stickers', p.id + '.png')).resize(size, size, { fit: 'inside' }).png().toBuffer();
    const m = await sharp(art).metadata();
    const dots = Array.from({ length: 38 }, (_, i) => `<circle cx="${(i * 151) % W}" cy="${(i * 283) % H}" r="${p.stars ? 2 + (i % 3) : 6 + (i % 4) * 3}" fill="${p.dots}" opacity="${p.stars ? .7 : .35}"/>`).join('');
    const top = 150 + Math.round((size - m.height) / 2);
    const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient>
      <radialGradient id="glow" cx=".5" cy=".38" r=".45"><stop offset="0" stop-color="#fff" stop-opacity="${p.stars ? .18 : .55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>${dots}<rect width="100%" height="100%" fill="url(#glow)"/>
      <ellipse cx="${W / 2}" cy="${top + m.height - 8}" rx="${m.width * .36}" ry="22" fill="#000" opacity=".10"/></svg>`;
    await sharp(Buffer.from(bg)).composite([{ input: art, left: Math.round((W - m.width) / 2), top }]).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(A, `plate_${p.key}.jpg`));
    console.log('plate_' + p.key, '←', p.id);
  }
})();
