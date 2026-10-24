// 툼 가든: 다녀간 사람·일촌·방명록·좋아요로 자라는 내 나무 (당근의 매너온도 자리)
//   키(m)는 1.0m 에서 시작해 줄어들지 않는다. 나이테 = 툼카드를 쓴 햇수.
(function () {
  const STAGES = [0, 1, 3, 7, 15];                         // 씨앗 · 새싹(1m) · 묘목(3m) · 나무(7m) · 큰 오크(15m)
  const NAMES = {
    ko: ['씨앗', '새싹', '묘목', '나무', '큰 오크'],
    en: ['Seed', 'Sprout', 'Sapling', 'Tree', 'Great oak'],
    de: ['Samen', 'Spross', 'Setzling', 'Baum', 'Große Eiche']
  };

  // s = { visits(하루 1번 센 누적), follows, guestbook(공개된 글), likes, since('YYYY-MM-DD') }
  function calc(s) {
    s = s || {};
    const score = (+s.visits || 0) * 0.1 + (+s.follows || 0) * 0.5 + (+s.guestbook || 0) * 0.3 + (+s.likes || 0) * 0.2;
    const h = Math.round((1 + score) * 10) / 10;
    let stage = 0;
    if (score > 0) for (let i = 1; i < STAGES.length; i++) if (h >= STAGES[i]) stage = i;
    const since = s.since ? new Date(s.since) : null;
    const rings = since && !isNaN(since) ? Math.floor((Date.now() - since.getTime()) / (365.25 * 864e5)) + 1 : 1;
    const next = STAGES[stage + 1] || null;
    return { h, stage, rings, next, toNext: next ? Math.max(0.1, Math.round((next - h) * 10) / 10) : 0 };
  }

  function season(d) {
    const m = (d || new Date()).getMonth() + 1;
    return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  }

  // 120×120 그림. 계절에 따라 잎 색이 바뀐다.
  function svg(stage, sea) {
    sea = sea || season();
    const leaf = { spring: ['#7ccf6a', '#5fb35a'], summer: ['#3f9d4f', '#2f7f40'], autumn: ['#e8a33a', '#d0702c'], winter: ['#9fb5a8', '#7f978a'] }[sea];
    const dots = sea === 'spring' ? '#ffb7c9' : sea === 'autumn' ? '#ffd978' : sea === 'winter' ? '#ffffff' : '#ffd978';
    const ground = '<ellipse cx="60" cy="108" rx="44" ry="7" fill="rgba(255,255,255,.08)"/>';
    const trunk = (w, top) => `<path d="M${60 - w} 108 Q${60 - w / 2} ${(108 + top) / 2} ${60 - w / 3} ${top} L${60 + w / 3} ${top} Q${60 + w / 2} ${(108 + top) / 2} ${60 + w} 108 Z" fill="#8a5a34"/>`;
    const blob = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
    const fruit = (pts) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${dots}"/>`).join('');
    let body = '';
    if (stage === 0) body = '<ellipse cx="60" cy="102" rx="9" ry="6" fill="#a8743f"/><path d="M60 96 q2 -6 6 -7" stroke="#7ccf6a" stroke-width="2" fill="none" stroke-linecap="round"/>';
    else if (stage === 1) body = '<path d="M60 108 L60 84" stroke="#6aa84f" stroke-width="3" stroke-linecap="round"/>' + `<ellipse cx="51" cy="82" rx="10" ry="5" fill="${leaf[0]}" transform="rotate(-25 51 82)"/><ellipse cx="69" cy="78" rx="11" ry="5.5" fill="${leaf[1]}" transform="rotate(25 69 78)"/>`;
    else if (stage === 2) body = trunk(4, 70) + blob(60, 60, 20, leaf[1]) + blob(52, 54, 13, leaf[0]) + blob(68, 52, 12, leaf[0]);
    else if (stage === 3) body = trunk(7, 62) + blob(60, 48, 28, leaf[1]) + blob(42, 54, 17, leaf[0]) + blob(78, 54, 17, leaf[0]) + blob(60, 30, 18, leaf[0]) + fruit([[48, 46], [72, 40], [62, 60]]);
    else body = trunk(11, 58) + '<path d="M56 70 L36 56 M64 68 L86 54" stroke="#8a5a34" stroke-width="5" stroke-linecap="round"/>' + blob(60, 40, 34, leaf[1]) + blob(30, 52, 20, leaf[0]) + blob(90, 52, 20, leaf[0]) + blob(44, 24, 20, leaf[0]) + blob(76, 24, 20, leaf[0]) + blob(60, 14, 16, leaf[0]) + fruit([[36, 46], [52, 30], [70, 36], [86, 48], [60, 54], [44, 60], [78, 62]]);
    const snow = sea === 'winter' && stage >= 2 ? '<path d="M38 40 q22 -14 44 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>' : '';
    if (stage <= 1) body = `<g transform="translate(60 108) scale(1.8) translate(-60 -108)">${body}</g>`;   // 씨앗·새싹은 작아서 크게
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img">${ground}${body}${snow}</svg>`;
  }

  // 미국은 피트, 나머지는 미터
  function heightText(h, lang) { return lang === 'en' ? Math.round(h * 3.281) + ' ft' : h.toFixed(1) + 'm'; }
  function stageName(stage, lang) { return (NAMES[lang] || NAMES.ko)[stage]; }

  window.TC_TREE = { calc, svg, season, heightText, stageName };
})();
