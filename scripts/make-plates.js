#!/usr/bin/env node
// 누구나 쓰는 기본 플레이트(카드 앞면 배경)를 SVG로 그려 assets/plate_*.jpg 로 굽는다. 브랜드 로고·글자는 넣지 않는다.
//   node scripts/make-plates.js
const sharp = require('sharp');
const path = require('path');

const W = 832, H = 1334;
const lines = (n, color, op, vertical) => Array.from({ length: n }, (_, i) => {
  const p = ((i + 0.5) / n) * (vertical ? W : H);
  const o = (op * (0.4 + 0.6 * Math.abs(Math.sin(i * 12.9898) % 1))).toFixed(3);
  return vertical ? `<line x1="${p}" y1="0" x2="${p}" y2="${H}" stroke="${color}" stroke-opacity="${o}" stroke-width="1"/>` : `<line x1="0" y1="${p}" x2="${W}" y2="${p}" stroke="${color}" stroke-opacity="${o}" stroke-width="1"/>`;
}).join('');
const sheen = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${a}" stop-color="#fff" stop-opacity="0"/><stop offset="${(a + b) / 2}" stop-color="#fff" stop-opacity=".16"/><stop offset="${b}" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
const grain = (seed, op) => `<filter id="g${seed}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 ${op} 0"/></filter><rect width="100%" height="100%" filter="url(#g${seed})"/>`;
const edge = '<linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".2" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient><rect width="100%" height="100%" fill="url(#eg)"/>';
const vignette = '<radialGradient id="vg" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient><rect width="100%" height="100%" fill="url(#vg)"/>';

const PLATES = {
  // 검은 브러시드 메탈
  onyx: `<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2b31"/><stop offset=".5" stop-color="#16171b"/><stop offset="1" stop-color="#0b0b0e"/></linearGradient>${sheen('s', .25, .55)}</defs>
    <rect width="100%" height="100%" fill="url(#b)"/>${lines(420, '#ffffff', .05)}<rect width="100%" height="100%" fill="url(#s)"/>${vignette}`,
  // 샴페인 골드 메탈
  champagne: `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dfae"/><stop offset=".45" stop-color="#c9a45c"/><stop offset=".7" stop-color="#e8cf92"/><stop offset="1" stop-color="#8f6d33"/></linearGradient>${sheen('s', .3, .6)}</defs>
    <rect width="100%" height="100%" fill="url(#b)"/>${lines(420, '#5a3f12', .08)}<rect width="100%" height="100%" fill="url(#s)"/>${edge}`,
  // 밤하늘 오로라
  aurora: `<defs><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="110"/></filter></defs>
    <rect width="100%" height="100%" fill="#070b1f"/>
    <g filter="url(#bl)" opacity=".75"><path d="M-100 380 C 200 200, 500 520, 950 300 L 950 520 C 600 700, 300 420, -100 640 Z" fill="#7c3aed"/><path d="M-100 700 C 250 560, 520 860, 950 640 L 950 860 C 560 1000, 300 780, -100 960 Z" fill="#0ea5b7"/><path d="M-100 1020 C 300 940, 560 1160, 950 1000 L 950 1200 C 600 1280, 300 1120, -100 1260 Z" fill="#16a34a" opacity=".55"/></g>
    ${Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 197) % W}" cy="${(i * 331) % H}" r="${1 + (i % 3) * .6}" fill="#fff" opacity="${.25 + (i % 5) * .12}"/>`).join('')}${vignette}`,
  // 흰 대리석: 가는 회색 결 몇 줄 (손으로 그린 곡선 + 살짝 번짐)
  marble: `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfaf7"/><stop offset="1" stop-color="#e6e2da"/></linearGradient>${sheen('s', .35, .6)}
    <filter id="v" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="18"/><feGaussianBlur stdDeviation=".8"/></filter></defs>
    <rect width="100%" height="100%" fill="url(#b)"/>
    <g filter="url(#v)" fill="none" stroke-linecap="round">
      <path d="M-40 180 C 180 260, 260 420, 470 470 S 760 640, 900 600" stroke="#8a8378" stroke-opacity=".45" stroke-width="3"/>
      <path d="M120 -20 C 200 200, 160 380, 300 560 S 420 900, 380 1360" stroke="#9d968b" stroke-opacity=".3" stroke-width="2"/>
      <path d="M-30 820 C 200 760, 380 900, 560 860 S 820 980, 880 1100" stroke="#7d766b" stroke-opacity=".4" stroke-width="2.5"/>
      <path d="M470 470 C 520 560, 640 600, 700 760" stroke="#9d968b" stroke-opacity=".3" stroke-width="1.5"/>
      <path d="M560 860 C 600 960, 520 1080, 600 1200" stroke="#a39c91" stroke-opacity=".28" stroke-width="1.5"/>
      <path d="M-20 1180 C 160 1120, 300 1230, 520 1180" stroke="#8a8378" stroke-opacity=".25" stroke-width="1.5"/>
    </g><rect width="100%" height="100%" fill="url(#s)"/>`,
  // 깊은 숲 (툼 가든)
  forest: `<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f2a1d"/><stop offset="1" stop-color="#06140d"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#b)"/>
    ${Array.from({ length: 30 }, (_, i) => { const col = i % 5, row = Math.floor(i / 5); const x = 80 + col * 170 + (row % 2) * 85 + ((i * 37) % 30), y = 110 + row * 215 + ((i * 53) % 40), r = (i * 67) % 360, s = .7 + (i % 3) * .25; return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" opacity=".11"><path d="M0 -60 C30 -50 40 -20 25 0 C45 10 40 40 15 45 C20 60 5 70 0 80 C-5 70 -20 60 -15 45 C-40 40 -45 10 -25 0 C-40 -20 -30 -50 0 -60 Z" fill="none" stroke="#c9e4a8" stroke-width="2"/><path d="M0 -55 L0 80" stroke="#c9e4a8" stroke-width="1.5"/></g>`; }).join('')}
    ${vignette}`,
  // 로즈 골드
  rose: `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d3c9"/><stop offset=".5" stop-color="#d79a8c"/><stop offset="1" stop-color="#9c5f57"/></linearGradient>${sheen('s', .3, .58)}</defs>
    <rect width="100%" height="100%" fill="url(#b)"/>${lines(420, '#5a2a24', .07)}<rect width="100%" height="100%" fill="url(#s)"/>${edge}`,
  // 남색 물결
  ocean: `<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1f45"/><stop offset="1" stop-color="#040c1f"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#b)"/>
    ${Array.from({ length: 26 }, (_, i) => { const y = 420 + i * 36; return `<path d="M-20 ${y} Q ${W * .25} ${y - 40} ${W * .5} ${y} T ${W + 20} ${y}" fill="none" stroke="#7fb4ff" stroke-opacity="${(.05 + (i % 6) * .02).toFixed(2)}" stroke-width="2"/>`; }).join('')}
    ${vignette}`
};

(async () => {
  for (const [k, body] of Object.entries(PLATES)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}${grain(k.length * 3, .05)}</svg>`;
    const out = path.join(__dirname, '..', 'assets', `plate_${k}.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
    console.log('wrote', out);
  }
})();
