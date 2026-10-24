// 상품·링크 미리보기: 주소를 주면 그 페이지의 제목·사진·가격(있으면)을 가져온다. 미니홈 상품 블록이 쓴다.
// GET /api/unfurl?u=https://…   →  { title, image, price, site }
const esc = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const pick = (html, re) => { const m = html.match(re); return m ? m[1] : ''; };
const meta = (html, prop) => pick(html, new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i')) || pick(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
const dec = (s) => esc(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  const u = String((req.query && req.query.u) || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(u) || u.length > 600) return res.status(400).json({ error: 'bad_url' });
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(u, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'Accept-Language': 'ko,en;q=0.8' } });
    clearTimeout(t);
    const html = (await r.text()).slice(0, 400000);
    const host = new URL(r.url || u).hostname.replace(/^www\./, '');
    const title = dec(meta(html, 'og:title') || meta(html, 'twitter:title') || pick(html, /<title[^>]*>([^<]*)<\/title>/i));
    let image = dec(meta(html, 'og:image') || meta(html, 'twitter:image'));
    if (image && image.startsWith('//')) image = 'https:' + image;
    if (image && image.startsWith('/')) image = new URL(image, r.url || u).href;
    const price = dec(meta(html, 'product:price:amount') || meta(html, 'og:price:amount') || pick(html, /"price"\s*:\s*"?([0-9][0-9,.]*)"?/i));
    const currency = dec(meta(html, 'product:price:currency') || meta(html, 'og:price:currency')) || (/coupang|naver|gmarket|11st|auction|kurly/.test(host) ? 'KRW' : '');
    // 쿠팡·네이버처럼 로봇을 막는 곳은 '접근 거부'·'로그인' 페이지가 돌아온다 → 못 가져온 것으로 처리
    if (/access denied|로그인|에러페이지|robot|captcha/i.test(title) || r.status >= 400) return res.status(200).json({ title: '', image: '', price: '', currency, site: host, url: u, error: 'blocked' });
    return res.status(200).json({ title: title.slice(0, 120), image: /^https?:\/\//.test(image) ? image.slice(0, 500) : '', price: price.slice(0, 20), currency, site: host, url: u });
  } catch (e) {
    return res.status(200).json({ title: '', image: '', price: '', currency: '', site: '', url: u, error: 'fetch_failed' });
  }
};
module.exports.config = { maxDuration: 10 };
