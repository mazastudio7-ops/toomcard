#!/usr/bin/env node
// 홈 전시용 "툼 프렌즈 × 플레이트" 카드 (메이커의 composeFriendPlate 와 같은 배치). assets/combo_*.jpg
//   node scripts/make-combos.js
const sharp = require('sharp');
const path = require('path');
const A = path.join(__dirname, '..', 'assets');
const W = 832, H = 1334;
const SIZE = { xs: 240, sm: 400, md: 560, lg: 720, xl: 900 };

const COMBOS = [
  ['bear_onyx',      'bear-01',  'plate:onyx',      'lg'],
  ['bear_aurora',    'bear-09',  'plate:aurora',    'lg'],
  ['cat_champagne',  'cat-08',   'plate:champagne', 'md'],
  ['cat_forest',     'cat-12',   'plate:forest',    'md'],
  ['bunny_marble',   'bunny-01', 'plate:marble',    'lg'],
  ['bear_rose',      'bear-05',  'plate:rose',      'lg'],
  ['cat_ocean',      'cat-16',   'plate:ocean',     'xl'],
  ['bunny_sun',      'bunny-04', '#fff7d6',         'xl'],
  ['cat_night',      'cat-01',   '#1d2550',         'lg'],
];

const shade = (hex, amt) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };

(async () => {
  for (const [name, id, bg, size] of COMBOS) {
    let base;
    if (bg.startsWith('plate:')) base = sharp(path.join(A, `plate_${bg.slice(6)}.jpg`)).resize(W, H);
    else {
      const dark = parseInt(bg.slice(1), 16) < 0x808080;
      const dots = Array.from({ length: 38 }, (_, i) => `<circle cx="${(i * 151) % W}" cy="${(i * 283) % H}" r="${dark ? 2 + (i % 3) : 6 + (i % 4) * 3}" fill="#fff" opacity="${dark ? .18 : .4}"/>`).join('');
      base = sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${shade(bg, dark ? 22 : -34)}"/></linearGradient><radialGradient id="r" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="#fff" stop-opacity="${dark ? .14 : .5}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${dots}<rect width="100%" height="100%" fill="url(#r)"/></svg>`));
    }
    const box = SIZE[size];
    const st = await sharp(path.join(A, 'stickers', id + '.png')).resize(box, box, { fit: 'inside' }).png().toBuffer();
    const m = await sharp(st).metadata();
    const x = Math.round((W - m.width) / 2), y = Math.round(size === 'xl' ? 90 : size === 'xs' ? 120 : 150 + (box - m.height) / 2);
    const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><ellipse cx="${W / 2}" cy="${Math.min(y + m.height - 6, H - 40)}" rx="${m.width * .36}" ry="20" fill="#000" opacity=".12"/></svg>`);
    const layers = [{ input: shadow }, { input: st, left: x, top: Math.min(y, H - 1), ...(y + m.height > H ? {} : {}) }];
    // 아래로 넘치는 큰 스티커는 캔버스 안쪽만 그린다
    const stickerLayer = y + m.height > H ? { input: await sharp(st).extract({ left: 0, top: 0, width: m.width, height: H - y }).png().toBuffer(), left: x, top: y } : { input: st, left: x, top: y };
    await base.composite([{ input: shadow }, stickerLayer]).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(A, `combo_${name}.jpg`));
    console.log('combo_' + name);
  }
})();
