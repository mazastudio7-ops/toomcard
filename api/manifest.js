const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xhjauoabxybaksvbtcic.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoamF1b2FieHliYWtzdmJ0Y2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzg0NzQsImV4cCI6MjEwNDYxNDQ3NH0.wBK3-8IIq3JKYbMrVlLtx6rRPRmhCblm74EwL_3PxBY";

const ALIAS_MAP = {
  '이향원': 'hyangwon', 'hyanwon': 'hyangwon', 'won': 'hyangwon',
  '박수빈': 'subin', 'subin': 'subin',
  '김현수': 'hyunsoo', 'hyunsoo': 'hyunsoo',
  '유지연': 'jiyeon', 'jiyeon': 'jiyeon',
  '김용수': 'yongsu', 'yongsu': 'yongsu',
  '조윤서': 'yunseo', 'yunseo': 'yunseo',
  '김나은': 'naeun', 'naeun': 'naeun',
  '김민준': '김민준',
  'ceo': 'ceo', 'andrew': 'andrew',
  'toomus': 'toomus', 'toomcard': 'toomcard'
};

module.exports = async (req, res) => {
  let slug = req.query.slug || '';
  if (!slug) {
    const parts = (req.url || '').split('?')[0].split('/').filter(Boolean);
    if (parts.length > 0 && parts[parts.length - 1] !== 'manifest') {
      slug = parts[parts.length - 1];
    }
  }
  slug = slug.trim() || 'toomus';

  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {}

  const cleanSlug = decodedSlug.replace(/[^a-zA-Z0-9_\-\/가-힣]/g, '').trim();
  const resolvedSlug = ALIAS_MAP[cleanSlug] || ALIAS_MAP[cleanSlug.toLowerCase()] || cleanSlug;

  let name = 'TOOMCARD';
  let company = 'TOOMUS';
  let role = '3D 디지털 명함';
  let theme = 'obsidian';

  // 1. Try local JSON first
  const cardsDir = path.join(process.cwd(), 'cards');
  const possiblePaths = [
    path.join(cardsDir, `${resolvedSlug}.json`),
    path.join(cardsDir, `${cleanSlug}.json`)
  ];

  let foundLocal = false;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const cJson = JSON.parse(fs.readFileSync(p, 'utf8'));
        name = cJson.name || name;
        company = cJson.company || company;
        role = cJson.role || cJson.title || role;
        theme = cJson.theme || theme;
        foundLocal = true;
        break;
      } catch (e) {}
    }
  }

  // 2. Try Supabase fallback
  if (!foundLocal && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const orFilter = `slug.eq.${cleanSlug},slug.eq.${resolvedSlug}`;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/pods?or=(${encodeURIComponent(orFilter)})&select=components_json&limit=1`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].components_json) {
        const c = rows[0].components_json.card || rows[0].components_json;
        name = c.name || name;
        company = c.company || company;
        role = c.role || role;
      }
    } catch (e) {}
  }

  const appFullName = `${name} | ${company}`;
  const appShortName = name || 'TOOMCARD';
  const startUrl = `/${cleanSlug}?source=pwa`;

  const manifest = {
    name: appFullName,
    short_name: appShortName,
    description: `${name} (${company} ${role}) - 살아 움직이는 3D 스마트 명함`,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07040d",
    theme_color: "#07040d",
    icons: [
      {
        src: "/assets/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/assets/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.status(200).json(manifest);
};
