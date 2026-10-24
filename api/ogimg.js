// 카톡·메신저 링크 미리보기 이미지: 카드의 앞면 사진을 1200x630 으로 만들어 돌려준다.
// GET /api/ogimg?s=<카드 주소>   (예: a/배미자)  →  image/jpeg   ·  &t=card 이면 명함 비율 세로 썸네일
// 사진이 가로로 안 맞아도 잘리지 않게: 흐리게 깐 배경 + 가운데에 사진 전체를 둔다.
const sharp = require('sharp');

const SUPABASE_URL = process.env.TC_SUPABASE_URL || 'https://omlcbrslzvdtqwbszgvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.TC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGNicnNsenZkdHF3YnN6Z3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mzc4NTQsImV4cCI6MjEwODMxMzg1NH0.j2YVNIFIit7nzvaGGCprpFhPQfpQ6cQCf5n-2Dctg3g';
const ORIGIN = 'https://toomcard.com';
const MAX_BYTES = 12 * 1024 * 1024;
const W = 1200, H = 630;

async function fetchBuf(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('fetch ' + r.status);
  const len = Number(r.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error('too large');
  const b = Buffer.from(await r.arrayBuffer());
  if (b.length > MAX_BYTES) throw new Error('too large');
  return b;
}

// 카드에서 쓸 이미지 후보를 순서대로 돌려준다: 앞면 사진 → 플레이트 → 로고
function candidates(card) {
  const out = [];
  const bg = card && card.front && card.front.bg;
  if (bg && bg.type === 'image' && bg.src) out.push(bg.src);
  if (card && card.plateCardImage) out.push(card.plateCardImage);
  if (card && card.logo && card.logo.src) out.push(card.logo.src);
  if (card && card.avatar) out.push(card.avatar);
  return out;
}

async function loadImage(src) {
  if (typeof src !== 'string') throw new Error('bad src');
  const m = src.match(/^data:image\/(?:jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if (m) return Buffer.from(m[1], 'base64');
  if (src.startsWith('/assets/') && /^\/assets\/[\w.\-\/]+$/.test(src)) return fetchBuf(ORIGIN + src);
  if (/^https:\/\/[\w.\-]+\.supabase\.co\/storage\/v1\/object\/public\/card-assets\/[\w.\-\/%]+$/.test(src)) return fetchBuf(src);
  if (src.startsWith(ORIGIN + '/assets/')) return fetchBuf(src);
  throw new Error('src not allowed');
}

module.exports = async (req, res) => {
  const raw = decodeURIComponent(String((req.query && req.query.s) || '')).trim();
  const slug = raw.replace(/[^a-zA-Z0-9_\-\/가-힣]/g, '').slice(0, 80);
  const fallback = async () => {
    const b = await fetchBuf(ORIGIN + '/assets/og_default.jpg');
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res.status(200).send(b);
  };
  if (!slug) return fallback();
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/pods?select=components_json&slug=eq.${encodeURIComponent(slug)}&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const rows = await r.json();
    const cj = Array.isArray(rows) && rows[0] && rows[0].components_json;
    if (!cj) return fallback();
    const card = cj.card || cj;
    let buf = null;
    for (const c of candidates(card)) { try { buf = await loadImage(c); if (buf) break; } catch (e) {} }
    if (!buf) return fallback();

    const base = sharp(buf, { animated: false }).rotate();
    if (req.query && req.query.t === 'card') {   // 홈 "실제 명함" 줄: 세로 썸네일 (명함 비율)
      const th = await base.clone().resize(360, 577, { fit: 'cover', position: 'top' }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(th);
    }
    const bgImg = await base.clone().resize(W, H, { fit: 'cover', position: 'attention' }).blur(28).modulate({ brightness: 0.55 }).toBuffer();
    const fg = await base.clone().resize({ height: H, width: W, fit: 'inside', withoutEnlargement: false }).toBuffer();
    const out = await sharp(bgImg).composite([{ input: fg, gravity: 'center' }]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(out);
  } catch (e) {
    try { return await fallback(); } catch (e2) { return res.status(500).end(); }
  }
};
module.exports.config = { maxDuration: 20 };
