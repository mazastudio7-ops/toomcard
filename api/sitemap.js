// sitemap.xml: 홈 · 동네 숲(지역·업종) · 숲에 나무를 심은 카드. 숲을 켠 카드만 넣는다.
const SUPABASE_URL = process.env.TC_SUPABASE_URL || 'https://omlcbrslzvdtqwbszgvg.supabase.co';
const SUPABASE_ANON_KEY = process.env.TC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGNicnNsenZkdHF3YnN6Z3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mzc4NTQsImV4cCI6MjEwODMxMzg1NH0.j2YVNIFIit7nzvaGGCprpFhPQfpQ6cQCf5n-2Dctg3g';
const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function rpc(name, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

module.exports = async (req, res) => {
  const B = 'https://toomcard.com';
  const urls = new Set([B + '/', B + '/forest']);
  try {
    const [regions, trees] = await Promise.all([rpc('tc_forest_regions'), rpc('tc_forest', {})]);
    for (const r of regions) {
      const s = encodeURIComponent(r.sido);
      urls.add(`${B}/forest/${s}`);
      if (r.city) urls.add(`${B}/forest/${s}/${encodeURIComponent(r.city)}`);
      if (r.industry) urls.add(`${B}/forest/${s}${r.city ? '/' + encodeURIComponent(r.city) : ''}?ind=${r.industry}`);
    }
    for (const t of trees) {
      const p = '/' + String(t.slug).split('/').map(encodeURIComponent).join('/');
      urls.add(B + p);
      if (t.has_home) urls.add(B + p + '/page');
    }
  } catch (e) {}
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map((u) => `  <url><loc>${x(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
};
