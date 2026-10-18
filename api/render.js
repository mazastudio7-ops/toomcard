const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xhjauoabxybaksvbtcic.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoamF1b2FieHliYWtzdmJ0Y2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzg0NzQsImV4cCI6MjEwNDYxNDQ3NH0.wBK3-8IIq3JKYbMrVlLtx6rRPRmhCblm74EwL_3PxBY";

let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {}

module.exports = async (req, res) => {
  let slug = (req.query && req.query.slug && !req.query.slug.startsWith('$') && !req.query.slug.startsWith(':')) ? req.query.slug : '';
  const reqUrl = req.url || '';

  if (!slug && reqUrl) {
    try {
      const parsed = new URL(reqUrl, 'https://toomcard.com');
      const qSlug = parsed.searchParams.get('slug');
      if (qSlug && !qSlug.startsWith('$') && !qSlug.startsWith(':')) {
        slug = qSlug;
      }
      if (!slug) {
        const parts = parsed.pathname.split('/').filter(p => p && p !== 'api' && p !== 'render');
        if (parts.length > 0) slug = parts[parts.length - 1];
      }
    } catch (e) {}
  }

  // Also check Vercel matched path header (e.g. /hyangwon)
  const headers = req.headers || {};
  const matchedPath = headers['x-matched-path'] || headers['x-vercel-matched-path'] || '';
  if ((!slug || slug.startsWith('$') || slug.startsWith(':')) && matchedPath) {
    const parts = matchedPath.split('?')[0].split('/').filter(p => p && p !== 'api' && p !== 'render');
    if (parts.length > 0) slug = parts[parts.length - 1];
  }

  if (!slug || slug.startsWith('$') || slug.startsWith(':')) {
    slug = 'toomus'; // Default fallback
  }

  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {}

  // Safe slug cleaning: allow English, Korean, Numbers, Hyphen, Underscore, Slash
  const cleanSlug = decodedSlug.replace(/[^a-zA-Z0-9_\-\/가-힣]/g, '').trim();

  // Alias 매핑 (한글 및 오타 대응)
  const ALIAS_MAP = {
    // 이향원
    '이향원': 'hyangwon',
    'hyanwon': 'hyangwon',
    'won': 'hyangwon',

    // 박수빈
    '박수빈': 'subin',
    'subin': 'subin',

    // 김현수
    '김현수': 'hyunsoo',
    'hyunsoo': 'hyunsoo',

    // 유지연
    '유지연': 'jiyeon',
    'jiyeon': 'jiyeon',

    // 김용수
    '김용수': 'yongsu',
    'yongsu': 'yongsu',

    // 조윤서
    '조윤서': 'yunseo',
    'yunseo': 'yunseo',

    // 김나은
    '김나은': 'naeun',
    'naeun': 'naeun',

    // 김나현
    '김나현': 'nahyun',
    'nahyun': 'nahyun',

    // 김민준
    '김민준': 'nexus',
    'nexus': 'nexus',

    // Andrew K / 대표
    '대표': 'ceo',
    'ceo': 'ceo',
    'andrew': 'andrew',
    'toomus': 'toomus',
    'setupod': 'setupod',
    'toomcard': 'toomcard'
  };

  const aliasTarget = ALIAS_MAP[cleanSlug] || ALIAS_MAP[decodedSlug] || null;
  const slugsToTry = Array.from(new Set([cleanSlug, decodedSlug, aliasTarget].filter(Boolean)));

  let title = "TOOMCARD 3D 명함";
  let subtitle = "Next-Gen 3D Interactive Business Card";
  let company = "TOOMUS";
  let cardFound = false;

  try {
    // 1. Try local JSON first (instant zero-latency read)
    const candidates = [];
    slugsToTry.forEach(s => {
      candidates.push(
        path.join(process.cwd(), 'cards', `${s.replace('/', '_')}.json`),
        path.join(process.cwd(), 'cards', `${s}.json`)
      );
    });
    
    let targetJsonPath = candidates.find(p => fs.existsSync(p)) || null;

    let loadedCardObj = null;

    if (targetJsonPath) {
      try {
        const raw = fs.readFileSync(targetJsonPath, 'utf8');
        const card = JSON.parse(raw);
        loadedCardObj = card;
        title = card.name || card.meta?.title || title;
        subtitle = `${card.role || ''} · ${card.slogan || ''}`.trim() || subtitle;
        company = card.company || company;
        cardFound = true;
      } catch (e) {}
    }

    // 2. Fallback to Supabase Cloud Pods if not found locally
    if (!cardFound) {
      let pod = null;
      let profile = null;

      const orFilter = slugsToTry.map(s => `slug.eq.${s}`).join(',');

      if (supabase) {
        const { data: pData } = await supabase
          .from('pods')
          .select('components_json')
          .or(orFilter)
          .maybeSingle();
        pod = pData;

        const { data: prData } = await supabase
          .from('profiles')
          .select('*')
          .or(orFilter)
          .maybeSingle();
        profile = prData;
      } else {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/pods?or=(${encodeURIComponent(orFilter)})&select=components_json&limit=1`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
          });
          const rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) pod = rows[0];
        } catch (err) {}
      }

      if (pod && pod.components_json) {
        const card = pod.components_json.card || pod.components_json;
        loadedCardObj = card;
        title = card.name || profile?.name || title;
        subtitle = `${card.role || profile?.handle || ''} · ${card.slogan || card.tagline || ''}`.trim() || subtitle;
        company = card.company || profile?.bio || company;
        cardFound = true;
      } else if (profile) {
        title = profile.name || title;
        subtitle = profile.handle || subtitle;
        company = profile.bio || company;
        cardFound = true;
      }
    }

    // 3. Read HTML template (card.html)
    const htmlPath = path.join(process.cwd(), 'card.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // 4. Determine Dynamic OG Meta Tags
    const isHyangwon = slugsToTry.some(s => s === 'hyangwon' || s === '이향원' || s === 'hyanwon' || s === 'won');

    let cardTheme = loadedCardObj?.theme || 'obsidian';
    let ogImageUrl = '';
    let ogTitle = `${title} | ${company} - TOOMCARD`;
    let ogDesc = subtitle || '종이 명함의 시대를 끝내는 살아 움직이는 3D 스마트 명함';

    if (isHyangwon) {
      ogImageUrl = 'https://toomcard.com/assets/toomcard_og_hyangwon.jpg';
      ogTitle = '이향원 이사(Director) | TOOMCARD 3D 디지털 명함';
      ogDesc = '종이 명함의 시대를 끝내는 살아 움직이는 3D 스마트 명함 · 탭하여 연락처 저장 및 프로필 확인';
    } else if (loadedCardObj) {
      if (loadedCardObj.meta?.ogTitle) ogTitle = loadedCardObj.meta.ogTitle;
      if (loadedCardObj.meta?.ogDescription) ogDesc = loadedCardObj.meta.ogDescription;

      // 개인 전용 맞춤 커스텀 이미지가 지정되어 있는 경우 우선 적용
      if (loadedCardObj.meta?.ogImage && !loadedCardObj.meta.ogImage.includes('toomcard_card_hybrid') && !loadedCardObj.meta.ogImage.includes('toomus_card_minimal') && !loadedCardObj.meta.ogImage.includes('toomcard_front_plate')) {
        ogImageUrl = loadedCardObj.meta.ogImage.startsWith('http') ? loadedCardObj.meta.ogImage : `https://toomcard.com${loadedCardObj.meta.ogImage}`;
      }
    }

    // [옵션 1] 개인마다 이름, 직함, 회사명이 실시간 렌더링된 1200x630 동적 OG 이미지 생성
    if (!ogImageUrl) {
      const qTitle = encodeURIComponent(title || 'TOOMCARD');
      const qCompany = encodeURIComponent(company || 'TOOMCARD');
      const qSub = encodeURIComponent(subtitle || '3D 인터랙티브 스마트 명함');
      const qTheme = encodeURIComponent(cardTheme || 'obsidian');
      ogImageUrl = `https://toomcard.com/api/og?title=${qTitle}&company=${qCompany}&subtitle=${qSub}&theme=${qTheme}`;
    }

    html = html.replace(/<title>.*?<\/title>/i, `<title>${ogTitle}</title>`);
    html = html.replace(/<meta\s+property=["']og:title["'].*?>/i, `<meta property="og:title" content="${ogTitle}" />`);
    html = html.replace(/<meta\s+property=["']og:description["'].*?>/i, `<meta property="og:description" content="${ogDesc}" />`);
    html = html.replace(/<meta\s+property=["']og:image["'].*?>/i, `<meta property="og:image" content="${ogImageUrl}" />`);

    // 개인별 맞춤 PWA Manifest 동적 교체 (앱 설치 시 내 명함 이름 및 start_url 직행)
    const dynamicManifestUrl = `/manifest/${encodeURIComponent(cleanSlug || 'toomus')}.json`;
    html = html.replace(/<link\s+rel=["']manifest["'].*?>/i, `<link rel="manifest" href="${dynamicManifestUrl}">`);

    // SSR 레이아웃 & 테마 사전 적용 (첫 화면 깜빡임 완벽 제거)
    if (loadedCardObj) {
      const layout = loadedCardObj.layout || 'classic';
      if (layout !== 'classic') {
        html = html.replace(
          '<link rel="stylesheet" id="layoutStylesheet" href="">',
          `<link rel="stylesheet" id="layoutStylesheet" href="/themes/layout-${layout}.css">`
        );
        html = html.replace('class="card-scene"', `class="card-scene layout-${layout}"`);
        html = html.replace('class="card-flipper"', `class="card-flipper layout-${layout}"`);
      }
      if (loadedCardObj.theme && loadedCardObj.theme !== 'obsidian') {
        html = html.replace('/themes/obsidian.css', `/themes/${loadedCardObj.theme}.css`);
      }
    }

    const initialDataScript = loadedCardObj ? `<script>window.INITIAL_CARD_DATA = ${JSON.stringify(loadedCardObj).replace(/</g, '\\u003c')};</script>` : '';

    const extraTags = `
      ${initialDataScript}
      <meta property="og:url" content="https://toomcard.com/${isHyangwon ? 'hyangwon' : (cleanSlug || 'toomus')}" />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:title" content="${ogTitle}" />
      <meta property="twitter:description" content="${ogDesc}" />
      <meta property="twitter:image" content="${ogImageUrl}" />
    `;
    html = html.replace('</head>', `${extraTags}\n</head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (err) {
    console.error("Render API Error:", err);
    const htmlPath = path.join(process.cwd(), 'card.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
};
