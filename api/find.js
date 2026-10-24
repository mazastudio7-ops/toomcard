// 찾기: toomcard.com/find — 당근처럼 "펜션", "보험" 치면 나오는 평범한 목록. /find/<업종>/<시·도> 는 검색엔진용 고정 주소.
// 메이커에서 "찾기·동네 숲에 올리기"를 켠 카드만 나온다 (동네 숲과 같은 데이터, 다른 옷).
const SUPABASE_URL = process.env.TC_SUPABASE_URL || 'https://omlcbrslzvdtqwbszgvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.TC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGNicnNsenZkdHF3YnN6Z3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mzc4NTQsImV4cCI6MjEwODMxMzg1NH0.j2YVNIFIit7nzvaGGCprpFhPQfpQ6cQCf5n-2Dctg3g';
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeImg = (u) => (/^(https:\/\/omlcbrslzvdtqwbszgvg\.supabase\.co\/|https:\/\/toomcard\.com\/|\/assets\/|data:image\/(jpeg|png|webp);base64,)/.test(String(u || '')) ? u : '');

const SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const IND = {
  stay: ['숙박·펜션', 'Stay', 'Unterkunft', '🏡', '펜션 민박 게스트하우스 숙소 호텔'], food: ['요식·카페', 'Food & café', 'Gastro', '☕', '카페 식당 맛집 베이커리 커피'],
  insurance: ['보험', 'Insurance', 'Versicherung', '🛡️', '보험 설계사 생명보험 손해보험 자동차보험'], farm: ['농산물·농가', 'Farm', 'Hof', '🍈', '농장 농가 참외 과일 직거래'],
  realestate: ['부동산', 'Real estate', 'Immobilien', '🏢', '공인중개사 아파트 원룸 상가'], beauty: ['뷰티', 'Beauty', 'Beauty', '💇', '미용실 네일 피부 메이크업'],
  medical: ['의료·건강', 'Health', 'Gesundheit', '🩺', '병원 한의원 치과 필라테스 헬스'], education: ['교육', 'Education', 'Bildung', '📚', '학원 과외 레슨 강사'],
  auto: ['자동차', 'Auto', 'Auto', '🚗', '중고차 정비 세차 딜러'], finance: ['금융·대출', 'Finance', 'Finanzen', '💳', '대출 투자 재무설계'],
  legal: ['법률', 'Legal', 'Recht', '⚖️', '변호사 법무사 행정사'], tax: ['세무·회계', 'Tax', 'Steuern', '🧾', '세무사 회계사 기장'],
  it: ['IT·개발', 'IT', 'IT', '💻', '개발 디자인 앱 홈페이지 제작'], other: ['기타', 'Other', 'Sonstiges', '✨', '']
};
const TX = {
  ko: { t: '찾기', ph: '펜션, 보험, 성주, 카페…', all: '전체', allR: '전국', n: '{n}곳', empty: '아직 등록된 곳이 없어요. 내 명함·미니홈을 올려 보세요.', card: '명함', home: '미니홈', links: '링크', demo: '예시', add: '＋ 내 가게·명함 올리기', desc: (w) => `${w} 명함과 미니홈을 한 곳에서 찾아요. 툼카드 찾기.`, lead: '명함·미니홈을 올린 사람과 가게를 찾아요. 연락처는 명함에서 바로 저장돼요.' },
  en: { t: 'Find', ph: 'stay, insurance, café…', all: 'All', allR: 'All regions', n: '{n} places', empty: 'Nothing listed yet. Add your card or mini site.', card: 'Card', home: 'Mini site', links: 'Links', demo: 'Example', add: '＋ Add my place', desc: (w) => `Find ${w} cards and mini sites in one place. TOOMCARD Find.`, lead: 'People and places with a TOOMCARD card or mini site. Save contacts straight from the card.' },
  de: { t: 'Finden', ph: 'Pension, Versicherung, Café…', all: 'Alle', allR: 'Alle Regionen', n: '{n} Orte', empty: 'Noch nichts eingetragen. Füge deine Karte oder Mini-Seite hinzu.', card: 'Karte', home: 'Mini-Seite', links: 'Links', demo: 'Beispiel', add: '＋ Meinen Ort eintragen', desc: (w) => `${w}: Karten und Mini-Seiten an einem Ort. TOOMCARD Finden.`, lead: 'Menschen und Orte mit TOOMCARD-Karte oder Mini-Seite. Kontakte direkt von der Karte speichern.' }
};

async function rpc(name, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json(); return Array.isArray(j) ? j : [];
}
// "펜션" 같은 검색어를 업종으로 (업종 이름·관련어 매칭)
function guessIndustry(q) {
  const s = q.toLowerCase();
  for (const [k, v] of Object.entries(IND)) if (s === k || v[0].includes(s) || v[0].split('·').some((x) => x === s) || v[4].split(' ').some((w) => w && (s === w || s.includes(w)))) return k;
  return '';
}

module.exports = async (req, res) => {
  const qy = req.query || {};
  const clean = (v) => decodeURIComponent(String(v || '')).replace(/[^가-힣a-zA-Z0-9 .·]/g, '').trim().slice(0, 30);
  const q = clean(qy.q);
  const sido = SIDO.includes(clean(qy.sido)) ? clean(qy.sido) : (SIDO.find((s) => q.includes(s)) || '');
  const ind = IND[qy.ind] ? qy.ind : (q ? guessIndustry(q.replace(sido, '').trim()) : '');
  const al = String(qy.lang || (req.headers && req.headers['accept-language']) || 'ko').slice(0, 2).toLowerCase();
  const lang = TX[al] ? al : 'ko', t = TX[lang], li = { ko: 0, en: 1, de: 2 }[lang];

  let rows = [], regions = [];
  try { [rows, regions] = await Promise.all([rpc('tc_forest', { p_sido: sido || null, p_city: null, p_industry: ind || null }), rpc('tc_forest_regions')]); } catch (e) {}
  // 공식 데모 카드(cards/demo.*.json)도 '예시'로 같이 보여 준다 — 목록이 비어 있을 때 어떤 모습인지 알 수 있게
  try {
    const fs = require('fs'), path = require('path'), dir = path.join(process.cwd(), 'cards');
    for (const f of fs.readdirSync(dir)) {
      if (!/^demo\..*\.json$/.test(f)) continue;
      const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); const rg = c.region || {};
      if (sido && rg.sido !== sido) continue; if (ind && c.industry !== ind) continue;
      rows.push({ slug: c.slug, name: c.name, company: c.company, industry: c.industry || '', industry_text: c.industryText || '', sido: rg.sido || '', city: rg.city || '', photo: c.front && c.front.bg && c.front.bg.src, kind: c.kind, has_home: !!(c.page && c.page.on), visits: 0, follows: 0, demo: true });
    }
  } catch (e) {}
  // 검색어가 업종·지역이 아니면 이름·상호·동네로 거른다
  const rest = q.replace(sido, '').trim().toLowerCase();
  if (rest && !ind) rows = rows.filter((r) => [r.name, r.company, r.city, r.industry_text].some((x) => String(x || '').toLowerCase().includes(rest)));
  rows.sort((a, b) => (Number(b.visits || 0) + Number(b.follows || 0) * 5) - (Number(a.visits || 0) + Number(a.follows || 0) * 5));

  const cnt = (f) => regions.filter(f).reduce((s, x) => s + Number(x.n || 0), 0);
  const href = (i, s) => '/find' + (i ? '/' + i : '') + (s ? (i ? '/' : '/all/') + encodeURIComponent(s) : '');
  const chip = (on, h, label, n) => `<a class="chip${on ? ' on' : ''}" href="${h}">${esc(label)}${n ? ` <small>${n}</small>` : ''}</a>`;
  const indChips = [chip(!ind, href('', sido), t.all, 0)].concat(Object.keys(IND).filter((k) => cnt((x) => x.industry === k)).map((k) => chip(ind === k, href(k, sido), IND[k][3] + ' ' + IND[k][li], cnt((x) => x.industry === k && (!sido || x.sido === sido))))).join('');
  const sidoChips = [chip(!sido, href(ind, ''), t.allR, 0)].concat(SIDO.filter((s) => cnt((x) => x.sido === s)).map((s) => chip(sido === s, href(ind, s), s, cnt((x) => x.sido === s && (!ind || x.industry === ind))))).join('');

  const where = [sido, ind ? IND[ind][li] : ''].filter(Boolean).join(' ') || t.allR;
  const title = `${where} ${t.t} — TOOMCARD`;
  const rowsHtml = rows.map((r) => {
    const base = '/' + String(r.slug).split('/').map(encodeURIComponent).join('/');
    const img = safeImg(r.photo), sub = [r.company, IND[r.industry] ? IND[r.industry][li] : r.industry_text, [r.sido, r.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
    return `<a class="row" href="${r.has_home ? base + '/page' : base}">
      <span class="ph" style="${img ? `background-image:url('${esc(img)}')` : ''}">${img ? '' : esc(String(r.name || '').charAt(0))}</span>
      <span class="tx"><b>${esc(r.name)}</b><small>${esc(sub)}</small></span>
      <span class="bt">${r.demo ? `<i class="demo">${t.demo}</i>` : ''}${r.has_home ? `<i>🏠 ${t.home}</i>` : ''}<i>🪪 ${t.card}</i></span></a>`;
  }).join('');

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(t.desc(where))}"><link rel="canonical" href="https://toomcard.com${esc(href(ind, sido))}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(t.desc(where))}"><meta property="og:image" content="https://toomcard.com/assets/og_default.jpg">
<meta name="theme-color" content="#0b0b10"><link rel="icon" href="/favicon.ico">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/product.css">
<style>
.find { max-width: 760px; margin: 0 auto; padding: 8px 16px 90px; }
.sbox { display: flex; gap: 8px; margin: 14px 0 10px; } .sbox input { flex: 1; padding: 13px 16px; border-radius: 14px; border: 1px solid var(--line); background: rgba(255,255,255,.06); color: #fff; font: 15px 'Noto Sans KR', sans-serif; outline: 0; } .sbox button { padding: 0 18px; border-radius: 14px; border: 0; background: var(--gold); color: #1a1205; font-weight: 900; cursor: pointer; }
.lead { color: var(--mut); font-size: 13px; margin: 0 0 10px; }
.chips { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0 8px; scrollbar-width: none; } .chips::-webkit-scrollbar { display: none; }
.chip { flex: none; padding: 7px 12px; border-radius: 99px; border: 1px solid var(--line); color: rgba(255,255,255,.8); text-decoration: none; font-size: 13px; font-weight: 700; background: rgba(255,255,255,.04); } .chip small { color: var(--mut); font-weight: 400; } .chip.on { background: var(--gold); color: #1a1205; border-color: var(--gold); } .chip.on small { color: #4a3a10; }
.cnt { font-size: 13px; color: var(--mut); margin: 8px 2px; }
.row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; background: rgba(255,255,255,.04); border: 1px solid var(--line); color: #fff; text-decoration: none; margin-bottom: 8px; }
.row .ph { width: 56px; height: 56px; border-radius: 14px; flex: none; background: linear-gradient(135deg,#ffe9a8,#c9a45c) center/cover; display: grid; place-items: center; font-weight: 900; color: #3a2a0c; font-size: 20px; }
.row .tx { flex: 1; min-width: 0; } .row .tx b { display: block; font-size: 15.5px; } .row .tx small { display: block; color: var(--mut); font-size: 12.5px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row .bt { display: flex; flex-direction: column; gap: 4px; } .row .bt i.demo { background: rgba(255,217,120,.18); color: var(--gold); } .row .bt i { font-style: normal; font-size: 11.5px; font-weight: 800; padding: 4px 8px; border-radius: 99px; background: rgba(255,255,255,.08); white-space: nowrap; }
.empty { padding: 40px 16px; text-align: center; color: var(--mut); border: 1px dashed var(--line); border-radius: 18px; }
.cta { position: fixed; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom)); transform: translateX(-50%); padding: 13px 22px; border-radius: 99px; background: var(--gold); color: #1a1205; font-weight: 900; text-decoration: none; box-shadow: 0 10px 30px rgba(0,0,0,.4); white-space: nowrap; }
</style></head><body>
<header class="top"><a class="logo" href="/">TOOMCARD</a>
  <nav class="pnav"><a href="/">🪪 ${lang === 'ko' ? '명함' : lang === 'de' ? 'Karte' : 'Card'}</a><a href="/link">🔗 ${lang === 'ko' ? '멀티링크' : 'Multilink'}</a><a href="/minihome">🏠 ${lang === 'ko' ? '미니홈' : lang === 'de' ? 'Mini-Seite' : 'Mini site'}</a><a href="/friends">🐻 ${lang === 'ko' ? '툼 프렌즈' : 'TOOM Friends'}</a><a href="/find" aria-current="page">🔎 ${t.t}</a></nav>
</header>
<main class="find">
  <form class="sbox" action="/find" method="get"><input name="q" value="${esc(q)}" placeholder="${esc(t.ph)}" autocomplete="off"><button type="submit">🔎</button></form>
  <p class="lead">${esc(t.lead)}</p>
  <div class="chips">${indChips}</div><div class="chips">${sidoChips}</div>
  <div class="cnt">${t.n.replace('{n}', rows.length)}</div>
  ${rows.length ? rowsHtml : `<div class="empty">${esc(t.empty)}</div>`}
</main>
<a class="cta" href="/maker">${esc(t.add)}</a>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
};
