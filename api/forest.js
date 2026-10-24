// 동네 숲: toomcard.com/forest, /forest/<시·도>, /forest/<시·도>/<시·군·구>?ind=<업종>
// 메이커에서 "동네 숲에 내 나무 심기"를 켠 카드만, 큰 나무 순으로. 검색엔진이 읽을 수 있게 서버에서 그린다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SUPABASE_URL = process.env.TC_SUPABASE_URL || 'https://omlcbrslzvdtqwbszgvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.TC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGNicnNsenZkdHF3YnN6Z3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mzc4NTQsImV4cCI6MjEwODMxMzg1NH0.j2YVNIFIit7nzvaGGCprpFhPQfpQ6cQCf5n-2Dctg3g';
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeImg = (u) => (/^(https:\/\/omlcbrslzvdtqwbszgvg\.supabase\.co\/|https:\/\/toomcard\.com\/|\/assets\/)/.test(String(u || '')) ? u : '');

// 브라우저용 js/tree.js 를 그대로 써서 미니홈·대시보드와 같은 키가 나오게 한다
let TREE = null;
function tree() {
  if (TREE) return TREE;
  const box = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'js', 'tree.js'), 'utf8'), box);
  return (TREE = box.window.TC_TREE);
}

const SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
const IND = {
  insurance: ['보험', 'Insurance', 'Versicherung'], farm: ['농산물·농가', 'Farm', 'Hof'], stay: ['숙박·펜션', 'Stay', 'Unterkunft'],
  realestate: ['부동산', 'Real estate', 'Immobilien'], auto: ['자동차', 'Auto', 'Auto'], finance: ['금융·대출', 'Finance', 'Finanzen'],
  legal: ['법률', 'Legal', 'Recht'], tax: ['세무·회계', 'Tax', 'Steuern'], medical: ['의료·건강', 'Health', 'Gesundheit'],
  education: ['교육', 'Education', 'Bildung'], beauty: ['뷰티', 'Beauty', 'Beauty'], food: ['요식·카페', 'Food & café', 'Gastro'],
  it: ['IT·개발', 'IT', 'IT'], other: ['기타', 'Other', 'Sonstiges']
};
const TX = {
  ko: { forest: '동네 숲', all: '전체', allInd: '모든 업종', intro: '우리 동네 사람들의 나무예요. 많이 찾고, 남기고, 일촌을 맺을수록 크게 자라요.', top: '🏆 이 숲에서 제일 큰 나무', empty: '아직 이 숲에는 나무가 없어요. 첫 나무를 심어 보세요 🌱', plant: '🌱 내 나무 심기', trees: '그루', desc: (w) => `${w}의 보험·농가·펜션·가게 사람들을 나무로 만나 보세요. TOOMCARD 동네 숲.` },
  en: { forest: 'Local forest', all: 'All', allInd: 'All fields', intro: 'Trees of people around here. The more people visit, write and follow, the taller they grow.', top: '🏆 Tallest tree in this forest', empty: 'No trees here yet. Plant the first one 🌱', plant: '🌱 Plant my tree', trees: 'trees', desc: (w) => `Meet people and shops in ${w} as trees. TOOMCARD local forest.` },
  de: { forest: 'Nachbarschaftswald', all: 'Alle', allInd: 'Alle Branchen', intro: 'Bäume der Leute aus der Gegend. Je mehr besuchen, schreiben und folgen, desto größer wachsen sie.', top: '🏆 Größter Baum in diesem Wald', empty: 'Hier gibt es noch keine Bäume. Pflanze den ersten 🌱', plant: '🌱 Meinen Baum pflanzen', trees: 'Bäume', desc: (w) => `Menschen und Läden in ${w} als Bäume entdecken. TOOMCARD Nachbarschaftswald.` }
};

async function rpc(name, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const clean = (v) => decodeURIComponent(String(v || '')).replace(/[^가-힣a-zA-Z0-9]/g, '').slice(0, 20);
  const sido = SIDO.includes(clean(q.sido)) ? clean(q.sido) : '';
  const city = sido ? clean(q.city) : '';
  const ind = IND[q.ind] ? q.ind : '';
  const al = String(q.lang || (req.headers && req.headers['accept-language']) || 'ko').slice(0, 2).toLowerCase();
  const lang = TX[al] ? al : 'ko', t = TX[lang], li = { ko: 0, en: 1, de: 2 }[lang];

  let rows = [], regions = [];
  try { [rows, regions] = await Promise.all([rpc('tc_forest', { p_sido: sido || null, p_city: city || null, p_industry: ind || null }), rpc('tc_forest_regions')]); } catch (e) {}

  const T = tree();
  const trees = rows.map((r) => ({ r, g: T.calc({ visits: r.visits, follows: r.follows, guestbook: r.guestbook, likes: r.likes, since: r.since }) }))
    .sort((a, b) => b.g.h - a.g.h);

  // 칩: 시·도 → (고르면) 시·군·구, 업종
  const sum = (f) => regions.filter(f).reduce((s, x) => s + Number(x.n || 0), 0);
  const href = (s, c, i) => '/forest' + (s ? '/' + encodeURIComponent(s) + (c ? '/' + encodeURIComponent(c) : '') : '') + (i ? '?ind=' + i : '');
  const chip = (on, h, label, n) => `<a class="chip${on ? ' on' : ''}" href="${h}">${esc(label)}${n ? ` <small>${n}</small>` : ''}</a>`;
  const sidoChips = [chip(!sido, href('', '', ind), t.all, sum(() => true))].concat(SIDO.filter((s) => sum((x) => x.sido === s)).map((s) => chip(sido === s, href(s, '', ind), s, sum((x) => x.sido === s)))).join('');
  const cities = sido ? [...new Set(regions.filter((x) => x.sido === sido && x.city).map((x) => x.city))] : [];
  const cityChips = cities.length ? [chip(!city, href(sido, '', ind), t.all, 0)].concat(cities.map((c) => chip(city === c, href(sido, c, ind), c, sum((x) => x.sido === sido && x.city === c)))).join('') : '';
  const inds = [...new Set(regions.filter((x) => (!sido || x.sido === sido) && (!city || x.city === city) && IND[x.industry]).map((x) => x.industry))];
  const indChips = inds.length ? [chip(!ind, href(sido, city, ''), t.allInd, 0)].concat(inds.map((k) => chip(ind === k, href(sido, city, k), IND[k][li], 0))).join('') : '';

  const where = [sido, city].filter(Boolean).join(' ') || (lang === 'ko' ? '전국' : lang === 'de' ? 'ganz Korea' : 'Korea');
  const head = [sido, city].filter(Boolean).join(' ');
  const title = `${head ? head + ' ' : ''}${ind ? IND[ind][li] + ' ' : ''}${t.forest} - TOOMCARD`;
  const tiles = trees.map(({ r, g }, i) => {
    const url = '/' + String(r.slug).split('/').map(encodeURIComponent).join('/') + (r.has_home ? '/page' : '');
    const sub = [r.company, IND[r.industry] ? IND[r.industry][li] : r.industry_text].filter(Boolean).join(' · ');
    const img = safeImg(r.photo);
    return `<a class="tr${i === 0 ? ' top' : ''}" href="${url}">${i === 0 && trees.length > 1 ? `<span class="badge">${t.top}</span>` : ''}
      <div class="tv">${T.svg(g.stage)}</div>
      <div class="h">${esc(T.heightText(g.h, lang))} <em>${esc(T.stageName(g.stage, lang))}</em></div>
      <div class="nm">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<b>${esc(r.name)}</b></div>
      ${sub ? `<small>${esc(sub)}</small>` : ''}<small class="loc">${esc([r.sido, r.city].filter(Boolean).join(' '))}</small></a>`;
  }).join('');

  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(t.desc(where))}"><link rel="canonical" href="https://toomcard.com${esc(href(sido, city, ind))}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(t.desc(where))}"><meta property="og:image" content="https://toomcard.com/assets/og_default.jpg">
<meta name="theme-color" content="#0b0d0a"><link rel="icon" href="/favicon.ico">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#0b0d0a;--card:rgba(255,255,255,.04);--line:rgba(255,255,255,.1);--mut:rgba(255,255,255,.55);--green:#9fe08f;--gold:#ffd978}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(120% 60% at 50% 0%,#14200f 0%,var(--bg) 60%);color:#fff;font-family:'Noto Sans KR',sans-serif;min-height:100vh}
.wrap{max-width:980px;margin:0 auto;padding:18px 16px 110px}.top-b{display:flex;align-items:center;justify-content:space-between}
.top-b a.logo{color:#fff;text-decoration:none;font:900 15px Montserrat,sans-serif;letter-spacing:.08em}
h1{margin:22px 0 6px;font-size:26px;font-weight:900}h1 small{font-size:14px;color:var(--mut);font-weight:700;margin-left:6px}
.intro{color:var(--mut);font-size:14px;line-height:1.6;margin:0 0 14px}
.chips{display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px;scrollbar-width:none}.chips::-webkit-scrollbar{display:none}
.chip{flex:none;padding:7px 13px;border-radius:99px;border:1px solid var(--line);color:rgba(255,255,255,.8);text-decoration:none;font-size:13px;font-weight:700;background:var(--card)}
.chip small{color:var(--mut);font-weight:400}.chip.on{background:var(--green);color:#0f1a0b;border-color:var(--green)}.chip.on small{color:#2b4a22}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:12px}
.tr{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:14px 10px 12px;border-radius:18px;background:var(--card);border:1px solid var(--line);color:#fff;text-decoration:none;transition:transform .15s}
.tr:hover{transform:translateY(-2px);border-color:rgba(124,207,106,.4)}.tr.top{grid-column:span 2;border-color:rgba(255,217,120,.45);background:linear-gradient(160deg,rgba(255,217,120,.08),rgba(124,207,106,.06))}
.tr .badge{position:absolute;top:10px;left:10px;font-size:11px;font-weight:900;color:var(--gold)}
.tv{width:96px;height:96px}.tr.top .tv{width:130px;height:130px}.tv svg{width:100%;height:100%}
.h{font:900 20px Montserrat,sans-serif;color:var(--green);margin-top:2px}.h em{font:700 12px 'Noto Sans KR',sans-serif;font-style:normal;color:rgba(255,255,255,.7)}
.nm{display:flex;align-items:center;gap:6px;margin-top:6px;max-width:100%}.nm img{width:22px;height:22px;border-radius:50%;object-fit:cover}.nm b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tr small{display:block;font-size:12px;color:var(--mut);margin-top:2px}.tr small.loc{opacity:.7}
.empty{padding:40px 16px;text-align:center;color:var(--mut);border:1px dashed var(--line);border-radius:18px;margin-top:12px}
.cta{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:14px 26px;border-radius:99px;background:var(--gold);color:#1a1205;font-weight:900;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.4)}
@media (max-width:420px){.tr.top{grid-column:span 2}}
</style></head><body><div class="wrap">
<div class="top-b"><a class="logo" href="/">TOOMCARD</a></div>
<h1>🌳 ${esc(head || t.forest)}${head ? ` <small>${esc(t.forest)}</small>` : ''}<small>${trees.length} ${t.trees}</small></h1>
<p class="intro">${esc(t.intro)}</p>
<div class="chips">${sidoChips}</div>${cityChips ? `<div class="chips">${cityChips}</div>` : ''}${indChips ? `<div class="chips">${indChips}</div>` : ''}
${trees.length ? `<div class="grid">${tiles}</div>` : `<div class="empty">${esc(t.empty)}</div>`}
</div><a class="cta" href="/maker">${esc(t.plant)}</a></body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
};
