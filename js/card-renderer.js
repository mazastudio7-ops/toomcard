/**
 * SETUPOD Dynamic Card Renderer Engine
 * Author: SETUPOD Team
 */

let cardData = null;
let qrcodeObj = null;

// 완전 오프라인 / 404 차단용 내장 마스터 카드 폴백 (절대 흰 화면 방지)
const DEFAULT_CARD_FALLBACK = {
  slug: "toomcard",
  id: "toomcard",
  theme: "obsidian",
  layout: "classic",
  edition: "TITANIUM PRO",
  name: "Alex Rivera",
  role: "총괄 디렉터 / Managing Director",
  company: "TOOMCARD",
  companyWatermark: "TOOMCARD",
  slogan: "오늘의 짧은 만남을 내일의 거대한 비즈니스로 잇는 스마트 카드",
  tagline: "TO DAY, TO TOMORROW",
  phone: "010-5555-0100",
  email: "hello@toomcard.com",
  origin: "TOOMCARD Global",
  moatTags: ["3D 인터랙티브", "vCard 주소록 저장", "스마트 NFC 하드웨어"],
  logo: {
    src: "/assets/logo_toomcard.gif",
    fallback: "/assets/toomcard-brand-logo.svg",
    alt: "TOOMCARD Logo"
  },
  plateCardImage: "/assets/toomcard_front_plate.png",
  primaryAction: {
    url: "https://toomcard.com",
    label: "공식 웹사이트",
    icon: "globe"
  },
  socials: [
    { type: "kakao", url: "https://open.kakao.com", label: "카카오톡 1:1" },
    { type: "instagram", url: "https://instagram.com", label: "인스타그램" }
  ],
  vcard: {
    firstName: "Alex",
    lastName: "Rivera",
    formattedName: "Alex Rivera",
    org: "TOOMCARD",
    title: "총괄 디렉터",
    tel: "010-5555-0100",
    email: "hello@toomcard.com",
    url: "https://toomcard.com"
  }
};

// getBasePath / applyTheme / renderWatermark → /js/card-core.js

// URL 파라미터 또는 경로에서 회사 및 카드 slug 추출 (Live Server /card.html 호환)
function getCardIdentifier() {
  const urlParams = new URLSearchParams(window.location.search);
  let qId = urlParams.get('id') || urlParams.get('card');
  let qComp = urlParams.get('company') || urlParams.get('org');
  if (qId) {
    try { qId = decodeURIComponent(qId); } catch(e) {}
    if (qComp) { try { qComp = decodeURIComponent(qComp); } catch(e) {} }
    return { company: qComp || null, slug: qId.trim().toLowerCase() };
  }

  let rawPath = window.location.pathname;
  try {
    rawPath = decodeURIComponent(rawPath);
  } catch(e) {}

  const pathParts = rawPath.split('/').filter(Boolean);
  // toomcard 폴더명 제외
  const filteredParts = pathParts.filter(p => p !== 'toomcard');

  if (filteredParts.length >= 2 && !filteredParts[filteredParts.length - 1].includes('.html')) {
    return { company: filteredParts[0].trim().toLowerCase(), slug: filteredParts[1].trim() };
  }
  if (filteredParts.length === 1 && !filteredParts[0].includes('.html')) {
    return { company: null, slug: filteredParts[0].trim() };
  }
  return { company: null, slug: 'toomcard' };
}

function getCardSlug() {
  return getCardIdentifier().slug;
}

// 테마 스타일시트 동적 주입 (Base Path 자동 결합)


// Lucide 아이콘 매핑 헬퍼
function getSocialIconSvg(type) {
  if (type === 'kakao') {
    return `<svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;flex-shrink:0;color:#ffd978;">
      <path d="M12 3C6.48 3 2 6.48 2 10.77C2 13.52 3.82 15.93 6.6 17.21L5.7 20.55C5.6 20.93 6.03 21.23 6.36 21.01L10.38 18.34C10.91 18.41 11.45 18.45 12 18.45C17.52 18.45 22 14.97 22 10.77C22 6.48 17.52 3 12 3Z" />
    </svg>`;
  }
  if (type === 'instagram') {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;flex-shrink:0;color:#f472b6;">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
    </svg>`;
  }
  const icons = { youtube: ['youtube', '#ff4d4d'], linkedin: ['linkedin', '#60a5fa'], x: ['twitter', '#e5e7eb'], threads: ['at-sign', '#e5e7eb'],
                  tiktok: ['music-2', '#f0abfc'], discord: ['message-circle', '#a5b4fc'], whatsapp: ['message-circle', '#4ade80'] };
  const [name, color] = icons[type] || ['globe', '#38bdf8'];
  return `<i data-lucide="${name}" style="width:14px;height:14px;color:${color};"></i>`;
}

// 내부 고전환 액션 버튼 바인딩 (setupod.com/ceo 2x2 럭셔리 그리드)
// 카드에 걸 수 있는 링크를 한 줄 목록으로 모은다: 웹사이트 + SNS(최대 2) + 추가 링크
// 일반 카드는 SNS가 먼저, 비즈니스 카드는 웹사이트가 먼저
function collectLinks(data) {
  const items = [];
  const personal = data.kind === 'personal';
  const site = (data.primaryAction && data.primaryAction.url && data.primaryAction.url !== '#')
    ? { kind: 'web', url: data.primaryAction.url, label: data.primaryAction.label || t('common.website'), icon: data.primaryAction.icon || 'globe' }
    : (data.primaryAction && data.primaryAction.url === '#' ? { kind: 'web', url: '#', label: data.primaryAction.label || t('common.website'), icon: 'globe' } : null);
  const socials = (data.socials || []).slice(0, 2).filter((s) => s.type === 'social_modal' || s.url)
    .map((s) => ({ kind: 'social', type: s.type, url: s.url, label: s.label, icon: s.icon }));
  const extras = (data.links || []).slice(0, 4).filter((l) => l && l.url)
    .map((l) => ({ kind: 'link', url: l.url, label: l.label || l.url.replace(/^https?:\/\//, '').slice(0, 24), icon: 'link' }));
  if (personal) { items.push(...socials); if (site) items.push(site); }
  else { if (site) items.push(site); items.push(...socials); }
  items.push(...extras);
  return items;
}

function linkButtonHtml(item) {
  if (item.kind === 'social' && item.type === 'social_modal') {
    return `
      <button class="btn-action btn-glass" onclick="event.stopPropagation(); openSocialModal();" title="${item.label}">
        <i data-lucide="${item.icon || 'globe'}" style="width: 14px; height: 14px; color: #38bdf8;"></i>
        <span>${item.label}</span>
      </button>`;
  }
  const icon = item.kind === 'social' ? getSocialIconSvg(item.type)
    : `<i data-lucide="${item.icon || 'globe'}" style="width: 14px; height: 14px; color: #38bdf8;"></i>`;
  return `
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="btn-action btn-glass" onclick="event.stopPropagation()" title="${item.label || ''}">
        ${icon}
        <span>${item.label || ''}</span>
      </a>`;
}

// 뒷면 모양: default(기본) / big(큰 로고) / links(링크 모음)
function applyBackLayout(data) {
  const scene = document.getElementById('cardScene');
  if (!scene) return;
  const mode = ['big', 'links'].includes(data.backLayout) ? data.backLayout : 'default';
  scene.classList.remove('back-big', 'back-links');
  if (mode !== 'default') scene.classList.add(`back-${mode}`);
}

function renderActionDocks(data) {
  const dockFront = document.getElementById('insideActionDockFront');
  const dockBack = document.getElementById('insideActionDockBack');
  const moreBox = document.getElementById('moreLinks');
  const moreList = document.getElementById('moreLinksList');

  const items = collectLinks(data);
  const mode = data.backLayout === 'links' ? 'links' : 'default';
  let html = '';
  let rest = [];
  if (mode === 'links') {
    // 링크 모음: 한 줄에 하나씩 최대 6개
    html = items.slice(0, 6).map((it) => `<div class="inside-action-row">${linkButtonHtml(it)}</div>`).join('');
  } else {
    // 기본·큰 로고: 카드에는 2개, 나머지는 더보기 시트
    html = items.length ? `<div class="inside-action-row">${items.slice(0, 2).map(linkButtonHtml).join('')}</div>` : '';
    rest = items.slice(2);
  }
  if (dockFront) dockFront.innerHTML = html;
  if (dockBack) dockBack.innerHTML = html;
  if (moreBox && moreList) {
    moreList.innerHTML = rest.map(linkButtonHtml).join('');
    moreBox.hidden = rest.length === 0;
  }
}

// i18n 미로드 시 안전한 번역 헬퍼
function t(key) {
  return (window.i18n && typeof window.i18n.t === 'function') ? window.i18n.t(key) : key;
}

// 전화번호를 wa.me 용 국제 형식 숫자로. 국가번호가 없으면 null (국내 번호는 WhatsApp에 못 넣는다)
function toIntlDigits(phone) {
  if (!phone) return null;
  const raw = String(phone).trim();
  const digits = raw.replace(/[^\d]/g, '');
  if (raw.startsWith('+') && digits.length >= 8) return digits;
  if (/^(82|49|1)\d{7,}$/.test(digits)) return digits;
  return null;
}

// 하단 고정 액션 바: 저장 / 전화 / 메시지(로케일별) / 더보기
function renderActionBar(data) {
  const callBtn = document.getElementById('actionCall');
  const msgBtn = document.getElementById('actionMessage');
  const msgLabel = document.getElementById('actionMessageLabel');
  if (!callBtn || !msgBtn) return;

  const phone = data.phone || (data.vcard && data.vcard.tel) || '';
  const lang = (window.i18n && window.i18n.lang) || 'ko';
  const kakao = (data.socials || []).find((s) => s.type === 'kakao' && s.url);
  const whatsapp = (data.socials || []).find((s) => s.type === 'whatsapp' && s.url);
  const intl = toIntlDigits(phone);
  const telDigits = String(phone).replace(/[^\d+]/g, '');

  if (phone) {
    callBtn.href = `tel:${telDigits}`;
    callBtn.hidden = false;
  } else {
    callBtn.hidden = true;
  }

  // 메시지 채널 우선순위: ko → 카카오톡, de → WhatsApp, en → SMS. 없으면 다음 후보.
  const sms = phone ? { href: `sms:${telDigits}`, label: t('common.sms') } : null;
  const wa = whatsapp ? { href: whatsapp.url, label: 'WhatsApp' }
           : (intl ? { href: `https://wa.me/${intl}`, label: 'WhatsApp' } : null);
  const kk = kakao ? { href: kakao.url, label: t('card.kakao') } : null;
  let target;
  if (lang === 'ko') target = kk || sms || wa;
  else if (lang === 'de') target = wa || sms || kk;
  else target = sms || wa || kk;
  if (!target) {
    const s = (data.socials || []).find((x) => x.url && x.type !== 'social_modal');
    if (s) target = { href: s.url, label: s.label || t('common.message') };
  }

  if (target) {
    msgBtn.href = target.href;
    msgBtn.target = target.href.startsWith('http') ? '_blank' : '';
    msgBtn.rel = 'noopener';
    if (msgLabel) { msgLabel.removeAttribute('data-i18n'); msgLabel.textContent = target.label; }
    msgBtn.hidden = false;
  } else {
    msgBtn.hidden = true;
  }

  // 더보기 시트의 카카오 전용 요소: ko 로케일이거나 카카오 채널이 있을 때만
  const showKakao = lang === 'ko' || !!kakao;
  const qrToggle = document.getElementById('qrTypeToggle');
  const saveKakao = document.getElementById('btnSaveKakao');
  if (qrToggle) qrToggle.style.display = showKakao ? '' : 'none';
  if (saveKakao) saveKakao.style.display = showKakao ? '' : 'none';
  if (!showKakao && typeof window.switchQrType === 'function') window.switchQrType('web');

  // 바이럴 배지: 어느 명함에서 왔는지 ref로
  const viral = document.getElementById('viralBadgeLink');
  if (viral && data.slug) viral.href = `/maker?ref=${encodeURIComponent(data.slug)}`;

  if (window.lucide) lucide.createIcons();
}

document.addEventListener('i18n:change', () => {
  if (cardData) renderActionBar(cardData);
});

// 소셜 채널 모달 채우기
function renderSocialModal(data) {
  const modalList = document.getElementById('socialModalList');
  if (!modalList) return;

  const socialModalItem = (data.socials || []).find(s => s.type === 'social_modal');
  if (!socialModalItem || !socialModalItem.channels) {
    modalList.innerHTML = '';
    return;
  }

  const itemsHtml = socialModalItem.channels.map(channel => `
    <a href="${channel.url}" target="_blank" rel="noopener noreferrer" class="channel-row">
      <div class="channel-left">
        <i data-lucide="${channel.icon || 'globe'}" style="width: 18px; height: 18px;"></i>
        <div class="channel-info">
          <span class="channel-name">${channel.name}</span>
          <span class="channel-handle">${channel.id}</span>
        </div>
      </div>
      <div class="channel-right">
        <span class="channel-badge">${channel.badge}</span>
        <i data-lucide="chevron-right" style="width: 16px; height: 16px; color: rgba(255,255,255,0.4);"></i>
      </div>
    </a>
  `).join('');

  modalList.innerHTML = itemsHtml;
}

// 메인 데이터 바인딩 (layout CSS 로드 완료 후 resolve하는 Promise 반환)
function populateCard(data) {
  cardData = data;

  // 레이아웃 적용 (기본: SETUPOD 정통 3D 카드)
  const layout = data.layout || (data.plateCardImage ? 'plate' : 'classic');
  const layoutStylesheet = document.getElementById('layoutStylesheet');
  const base = getBasePath();

  // layout CSS 로드 대기용 Promise
  const layoutReady = new Promise((resolve) => {
    if (!layoutStylesheet || layout === 'classic') {
      if (layoutStylesheet) layoutStylesheet.href = '';
      resolve();
    } else {
      const newHref = `${base}/themes/layout-${layout}.css`;
      if (layoutStylesheet.href && layoutStylesheet.href.endsWith(newHref.replace(/^\./, ''))) {
        resolve(); // 이미 같은 CSS 로드됨
      } else {
        layoutStylesheet.onload = () => resolve();
        layoutStylesheet.onerror = () => resolve(); // 에러 시에도 멈추지 않도록
        layoutStylesheet.href = newHref;
        // 2초 타임아웃 보험 (네트워크 지연 방어)
        setTimeout(resolve, 2000);
      }
    }
  });

  const cardElement = document.getElementById('cardScene');
  if (cardElement) {
    cardElement.classList.remove('layout-classic', 'layout-metal', 'layout-visual', 'layout-editorial', 'layout-plate');
    cardElement.classList.add(`layout-${layout}`);
  }
  const flipper = document.querySelector('.card-flipper');
  if (flipper) {
    flipper.classList.remove('layout-classic', 'layout-metal', 'layout-visual', 'layout-editorial', 'layout-plate');
    flipper.classList.add(`layout-${layout}`);
  }

  // 테마 적용
  applyTheme(data.theme);

  // 브라우저 타이틀 및 OG 태그
  if (data.meta) {
    document.title = data.meta.title || `${data.name} | ${data.company} · ${t('brand.descriptor')}`;
  }

  // 워터마크
  renderWatermark(data.companyWatermark || data.company);

  // 로고 이미지 (Base Path 정규화 & 무한 onerror 루프 완전 차단)
  function resolveAssetUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    return base + cleanUrl;
  }

  const frontLogoImg = document.getElementById('frontLogoImg');
  const backLogoImg = document.getElementById('backLogoImg');
  const fLogoBox = document.querySelector('.card-medallion-box') || document.querySelector('.front-logo-box');
  const bLogoBox = document.querySelector('.back-medallion-box') || document.querySelector('.back-top-logo');

  // 사진(Photo/Avatar) 우선 바인딩
  const photoSrc = data.photo || data.avatar;
  const isCustomPhoto = !!photoSrc || (data.logo && (data.logo.isPhoto || (typeof data.logo.src === 'string' && (data.logo.src.includes('sample_profile') || data.logo.src.startsWith('data:image')))));

  if (isCustomPhoto) {
    if (fLogoBox) fLogoBox.classList.add('has-photo');
    if (bLogoBox) bLogoBox.classList.add('has-photo');
  } else {
    if (fLogoBox) fLogoBox.classList.remove('has-photo');
    if (bLogoBox) bLogoBox.classList.remove('has-photo');
  }

  if (photoSrc) {
    const pUrl = resolveAssetUrl(photoSrc);
    if (frontLogoImg) {
      frontLogoImg.src = pUrl;
      frontLogoImg.alt = data.name || data.company;
    }
    if (backLogoImg) {
      backLogoImg.src = pUrl;
      backLogoImg.alt = data.name || data.company;
    }
  } else if (data.logo === false || (data.logo && data.logo.src === "")) {
    const fContainer = document.querySelector('.card-medallion-area') || document.querySelector('.front-logo-container');
    if (fContainer) fContainer.style.display = 'none';
  } else if (data.logo) {
    const primarySrc = resolveAssetUrl(data.logo.src || '/assets/logo_toomcard_hd.gif');
    const fallbackSrc = resolveAssetUrl(data.logo.fallback || '/assets/logo_toomcard_hd.gif');

    if (frontLogoImg) {
      frontLogoImg.onerror = function() {
        this.onerror = null; // 무한 재귀 깜빡임 완전 방지
        this.src = fallbackSrc;
      };
      frontLogoImg.src = primarySrc;
      frontLogoImg.alt = data.logo.alt || data.company;
    }
    if (backLogoImg) {
      backLogoImg.onerror = function() {
        this.onerror = null; // 무한 재귀 깜빡임 완전 방지
        this.src = fallbackSrc;
      };
      backLogoImg.src = primarySrc;
      backLogoImg.alt = data.logo.alt || data.company;
    }
  }

  // 3D 홀로그램 & GIF 모션 연출 바인딩
  const logoMotion = data.logoMotion || data.avatarMotion;
  if (logoMotion && logoMotion !== 'none') {
    const motionClasses = ['fx-hologram-pulse', 'fx-cyber-shimmer', 'fx-3d-floating', 'fx-gold-sparkle'];
    if (fLogoBox) {
      motionClasses.forEach(c => fLogoBox.classList.remove(c));
      if (logoMotion === 'pulse') fLogoBox.classList.add('fx-hologram-pulse');
      else if (logoMotion === 'shimmer') fLogoBox.classList.add('fx-cyber-shimmer');
      else if (logoMotion === 'float') fLogoBox.classList.add('fx-3d-floating');
      else if (logoMotion === 'gold') fLogoBox.classList.add('fx-gold-sparkle');
    }
    if (bLogoBox) {
      motionClasses.forEach(c => bLogoBox.classList.remove(c));
      if (logoMotion === 'pulse') bLogoBox.classList.add('fx-hologram-pulse');
      else if (logoMotion === 'shimmer') bLogoBox.classList.add('fx-cyber-shimmer');
      else if (logoMotion === 'float') bLogoBox.classList.add('fx-3d-floating');
      else if (logoMotion === 'gold') bLogoBox.classList.add('fx-gold-sparkle');
    }
  }

  // Plate 레이아웃 전용 실물 카드 아트워크 바인딩 (Base Path 및 캐시 무효화 적용)
  const plateImg = document.getElementById('plateArtworkImg');
  // 앞면 레이어(front)가 있는 카드는 renderFrontLayers가 사진을 맡는다. 여기서는 예전 카드만.
  if (plateImg && !data.front) {
    let rawPath = '/assets/toomcard_front_plate.jpg';
    if (data.plateCardImage) {
      rawPath = data.plateCardImage;
    } else if (data.company && data.company.toLowerCase().includes('toomus')) {
      rawPath = '/assets/toomus_front_plate.jpg';
    } else if (data.company && data.company.toLowerCase().includes('setupod')) {
      rawPath = '/assets/setupod_front_plate.jpg';
    } else if (data.company && data.company.toLowerCase().includes('maza')) {
      rawPath = '/assets/maza_front_plate.jpg';
    }
    plateImg.onerror = function() {
      this.onerror = null;
      this.src = './assets/toomcard_front_plate.jpg';
    };
    // 같은 사진이면 다시 받지 않는다 (매번 새로 받으면 카드가 깜빡였다)
    const next = (rawPath.startsWith('data:') || rawPath.startsWith('blob:')) ? rawPath : resolveAssetUrl(rawPath);
    if (plateImg.src !== new URL(next, location.href).href) plateImg.src = next;
  }

  // 앞면 레이어 (배경 · 글자 · 마감 · 옅은 QR)
  renderFrontLayers(data);

  // 앞면 정보 바인딩 (태그라인, 회사명, 슬로건, 이름, 직함)
  const frontTagline = document.getElementById('frontTagline');
  const frontCompany = document.getElementById('frontCompany');
  const frontSlogan = document.getElementById('frontSlogan');
  const frontName = document.getElementById('frontName');
  const frontRole = document.getElementById('frontRole');
  const frontEditionText = document.getElementById('frontEditionText');

  if (frontTagline) frontTagline.innerText = data.tagline || '';
  if (frontCompany) frontCompany.innerText = data.company || '';
  if (frontSlogan) frontSlogan.innerText = data.slogan || '';
  if (frontName) frontName.innerText = data.name || '';
  if (frontRole) frontRole.innerText = data.role || '';
  if (frontEditionText) {
    frontEditionText.innerText = data.edition || (data.theme === 'executive' ? 'PLATINUM VIP' : (data.theme === 'violet' ? 'NEON EDITION' : 'TITANIUM PRO'));
  }

  // 뒷면 정보 바인딩
  const backTagline = document.getElementById('backTagline');
  const backCompany = document.getElementById('backCompany');
  const backSlogan = document.getElementById('backSlogan');
  const roleTitle = document.getElementById('roleTitle');
  const nameTitle = document.getElementById('nameTitle');
  if (backTagline) backTagline.innerText = data.tagline || '';
  if (backCompany) backCompany.innerText = data.company || '';
  if (backSlogan) backSlogan.innerText = data.slogan || '';
  if (roleTitle) roleTitle.innerText = data.role || '';
  if (nameTitle) nameTitle.innerText = data.name || '';

  // 연락처 한 줄 (전화·이메일 텍스트. 동작은 하단 액션 바)
  const phoneValue = document.getElementById('phoneValue');
  const emailValue = document.getElementById('emailValue');
  const contactDot = document.getElementById('contactDot');
  if (phoneValue) phoneValue.innerText = data.phone || '';
  if (emailValue) emailValue.innerText = data.email || '';
  if (contactDot) contactDot.hidden = !(data.phone && data.email);

  // 해자 태그 (Moat Tags) 바인딩
  const frontMoatTags = document.getElementById('frontMoatTags');
  const backMoatTags = document.getElementById('backMoatTags');
  const tagsHtml = (data.moatTags || []).map(tag => `<span class="moat-tag">${tag}</span>`).join('');
  if (frontMoatTags) frontMoatTags.innerHTML = tagsHtml;
  if (backMoatTags) backMoatTags.innerHTML = tagsHtml;

  // 뒷면 직관 QR 코드 실시간 생성
  renderBackDirectQr();

  // 앞면 모핑 QR 코드 생성 (자동 팝업은 하지 않는다 — 카드를 가리므로. QR 알약으로 수동 열기)
  initPlateMorphQR(data);

  // 뒷면 모양 + 카드 안 링크 독 + 하단 고정 액션 바
  applyBackLayout(data);
  renderActionDocks(data);
  renderActionBar(data);
  renderEmblems(data);

  // 소셜 모달 바인딩
  renderSocialModal(data);

  // 수익화 슬롯 (쿠팡 파트너스 / 추천 링크) 바인딩
  const affContainer = document.getElementById('affiliateBannerContainer');
  const affLink = document.getElementById('affiliateBannerLink');
  const affLabel = document.getElementById('affiliateBannerLabel');
  if (affContainer && affLink && data.affiliateAction && data.affiliateAction.url) {
    affLink.href = data.affiliateAction.url;
    if (affLabel && data.affiliateAction.label) {
      affLabel.innerText = data.affiliateAction.label;
    }
    affContainer.style.display = 'block';
  } else if (affContainer) {
    affContainer.style.display = 'none';
  }

  // Lucide Icons 다시 렌더링
  if (window.lucide) {
    lucide.createIcons();
  }

  // layout CSS 로드 완료 Promise 반환 (FOUC 방지)
  return layoutReady;
}

// ==================================================
// SMART FALLBACK MORPHING QR ENGINE
// 1차: 앞면 메탈 플레이트 스텔스 스캔 시도
// 2차: 2.5초 지연/미감지 시 or 탭 시 3D 크롬 모핑 QR 자동 팝업
// 3차: 스캔 시 상대방에게는 ?view=back으로 스마트 콕핏 우선 로드
// ==================================================
let plateMorphTimer = null;
let plateMorphQrObj = null;

function initPlateMorphQR(data) {
  const target = document.getElementById('plateMorphQrTarget');
  if (!target) return;

  // 상대방이 카메라로 스캔했을 때 즉시 뒷면(스마트 콕핏)이 로드되도록 ?view=back URL 인코딩
  let scanUrl;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'back');
    scanUrl = url.toString();
  } catch (e) {
    scanUrl = window.location.href + (window.location.href.includes('?') ? '&view=back' : '?view=back');
  }

  // 같은 주소면 QR을 다시 만들지 않는다 (입력할 때마다 다시 그리면 버벅였다)
  if (target.dataset.qrKey === scanUrl && target.childElementCount) return;
  target.dataset.qrKey = scanUrl;
  target.innerHTML = "";
  if (typeof QRCode !== 'undefined') {
    try {
      plateMorphQrObj = new QRCode(target, {
        text: scanUrl,
        width: 136,
        height: 136,
        colorDark: "#0c0a14",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (err) {
      console.warn("Plate Morph QR generate error:", err);
    }
  }

  // 2.5초 후 자동 팝업 타이머 시작 (카드가 앞면일 때만)
  // schedulePlateMorphAutoPopup(); // 자동 팝업 비활성 (Phase 1)
}

function schedulePlateMorphAutoPopup() {
  if (plateMorphTimer) {
    clearTimeout(plateMorphTimer);
    plateMorphTimer = null;
  }
  const scene = document.getElementById('cardScene');
  if (scene && scene.classList.contains('flipped')) {
    return;
  }
  plateMorphTimer = setTimeout(() => {
    togglePlateMorphQR(true);
  }, 2500);
}

// 스마트 모핑 QR 오버레이 토글
window.togglePlateMorphQR = function(forceState) {
  if (plateMorphTimer) {
    clearTimeout(plateMorphTimer);
    plateMorphTimer = null;
  }
  const wrap = document.getElementById('plateMorphQrWrap');
  if (!wrap) return;

  const willBeActive = (typeof forceState === 'boolean') ? forceState : !wrap.classList.contains('active');
  if (willBeActive) {
    wrap.classList.add('active');
    const target = document.getElementById('plateMorphQrTarget');
    if (target && (!target.hasChildNodes() || target.children.length === 0)) {
      initPlateMorphQR(cardData);
    }
  } else {
    wrap.classList.remove('active');
  }
};

// 3D Flip Card Toggle with 250ms Debounce & Propagation Protection
let isCardFlipping = false;
function toggleCardFlip(e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  if (isCardFlipping) return;
  isCardFlipping = true;
  setTimeout(() => { isCardFlipping = false; }, 250);

  // 카드를 뒤집을 때는 앞면의 모핑 QR 타이머 취소 및 팝업 닫기
  if (plateMorphTimer) {
    clearTimeout(plateMorphTimer);
    plateMorphTimer = null;
  }
  const morphWrap = document.getElementById('plateMorphQrWrap');
  if (morphWrap) {
    morphWrap.classList.remove('active');
  }

  const scene = document.getElementById('cardScene');
  if (scene) {
    scene.classList.toggle('flipped');
  }
}

// Touch Slide / Swipe Detection for 3D Flip
let touchStartX = 0;
let touchEndX = 0;

function setupSwipe() {
  const cardSceneEl = document.getElementById('cardScene');
  if (!cardSceneEl) return;

  cardSceneEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  // 메이커 미리보기(?maker=1)에서는 좌우 스와이프를 부모에게 넘겨 디자인을 바꾼다. 뒤집기는 탭으로.
  const inMaker = window.self !== window.top && new URLSearchParams(location.search).get('maker') === '1';
  const toParent = (msg) => { try { window.parent.postMessage(msg, '*'); } catch (err) {} };

  // 메이커에서는 손가락을 따라 카드가 움직이도록 드래그 거리를 실시간으로 넘긴다.
  // 사진 모드(메이커의 사진 탭)에서는 대신 한 손가락 이동(pan)·두 손가락 확대(pinch)를 넘긴다.
  let dragFrame = 0, photoMode = false, lastX = 0, lastY = 0, lastDist = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  if (inMaker) {
    cardSceneEl.style.touchAction = 'none';
    window.addEventListener('message', (e) => { if (e.data && e.data.action === 'photo_mode') photoMode = !!e.data.on; });
    cardSceneEl.addEventListener('touchstart', (e) => {
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      lastDist = e.touches.length > 1 ? dist(e.touches) : 0;
    }, { passive: true });
    cardSceneEl.addEventListener('touchmove', (e) => {
      if (photoMode) {
        if (e.touches.length > 1) {
          const d = dist(e.touches);
          if (lastDist) toParent({ action: 'pinch', ratio: d / lastDist });
          lastDist = d;
        } else {
          const t = e.touches[0];
          toParent({ action: 'pan', dx: t.clientX - lastX, dy: t.clientY - lastY });
          lastX = t.clientX; lastY = t.clientY;
        }
        return;
      }
      const dx = e.changedTouches[0].screenX - touchStartX;
      if (dragFrame) return;
      dragFrame = requestAnimationFrame(() => { dragFrame = 0; toParent({ action: 'drag', dx }); });
    }, { passive: true });
  }

  cardSceneEl.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;
    if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
    if (inMaker && photoMode) { lastDist = 0; return; }
    if (inMaker) {
      if (Math.abs(diffX) > 50) toParent({ action: 'swipe', dir: diffX < 0 ? 'next' : 'prev' });
      else toParent({ action: 'drag_end' });
      return;
    }
    if (Math.abs(diffX) > 40) toggleCardFlip();
  }, { passive: true });
}


// 받는 사람 화면: 손가락·마우스·폰 기울기를 따라 카드가 살짝 기울고, 광택이 따라온다.
function setupTilt() {
  const scene = document.getElementById('cardScene');
  if (window.__tiltOn) return;
  if (!scene || window.__MAKER || (window.self !== window.top && new URLSearchParams(location.search).get('maker') === '1')) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.__tiltOn = true;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, last = 0, hasInput = false;
  const MAX = 11;
  function set(nx, ny) {       // nx, ny: -1..1
    hasInput = true; last = performance.now();
    ty = Math.max(-1, Math.min(1, nx)) * MAX;
    tx = -Math.max(-1, Math.min(1, ny)) * MAX * 0.8;
    kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame() {
    raf = 0;
    cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14;
    scene.style.setProperty('--tx', cx.toFixed(2) + 'deg');
    scene.style.setProperty('--ty', cy.toFixed(2) + 'deg');
    const gx = 50 + (cy / MAX) * 38, gy = 28 - (cx / (MAX * 0.8)) * 30;
    scene.style.setProperty('--gx', gx.toFixed(1) + '%');
    scene.style.setProperty('--gy', gy.toFixed(1) + '%');
    scene.style.setProperty('--go', Math.min(1, (Math.abs(cx) + Math.abs(cy)) / 7).toFixed(2));
    if (Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02) kick();
  }
  const rel = (e) => { const r = scene.getBoundingClientRect(); return [((e.clientX - r.left) / r.width - .5) * 2, ((e.clientY - r.top) / r.height - .5) * 2]; };
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const [x, y] = rel(e); set(x * 0.9, y * 0.9); });
  scene.addEventListener('touchmove', (e) => { const t = e.touches[0]; const [x, y] = rel(t); set(x, y); }, { passive: true });
  scene.addEventListener('touchend', () => { tx = 0; ty = 0; kick(); }, { passive: true });
  scene.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });

  // 폰 기울기(자이로): iOS는 첫 터치에서 허용을 한 번 묻는다. 거절·미지원이면 터치 기울기만 쓴다.
  let base = null;
  function onOri(e) {
    if (e.gamma == null || e.beta == null) return;
    if (!base) base = { b: e.beta, g: e.gamma };
    set((e.gamma - base.g) / 22, (e.beta - base.b) / 26);
  }
  function listenOri() { window.addEventListener('deviceorientation', onOri, true); }
  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const ask = () => {
        document.removeEventListener('touchend', ask, true);
        DeviceOrientationEvent.requestPermission().then((r) => { if (r === 'granted') listenOri(); }).catch(() => {});
      };
      document.addEventListener('touchend', ask, true);
    } else if ('ontouchstart' in window) { listenOri(); }
  }

  // 들어오자마자 한 번 훑어서 "움직이는 카드"임을 보여준다
  setTimeout(() => {
    if (hasInput) return;
    const t0 = performance.now();
    (function sweep(now) {
      if (hasInput) return;
      const k = (now - t0) / 1500;
      if (k >= 1) { tx = 0; ty = 0; kick(); return; }
      ty = Math.sin(k * Math.PI * 2) * MAX * 0.8; tx = Math.sin(k * Math.PI) * -3;
      kick(); requestAnimationFrame(sweep);
    })(t0);
  }, 900);
}

// URL 쿼리 파라미터(view=back / side=back / flipped=true)에 따른 초기 카드 회전 상태 적용
function applyInitialFlipState() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view') || urlParams.get('side');
    const flipped = urlParams.get('flipped');
    const scene = document.getElementById('cardScene');
    if (scene) {
      if (view === 'back' || flipped === 'true' || flipped === '1') {
        scene.classList.add('flipped');
        // 방문자가 뒷면으로 즉시 들어왔으므로 앞면 2.5초 자동 팝업 타이머 해제
        if (plateMorphTimer) {
          clearTimeout(plateMorphTimer);
          plateMorphTimer = null;
        }
      } else if (view === 'front') {
        scene.classList.remove('flipped');
      }
    }
  } catch (e) {
    console.error("Flip state initialization error:", e);
  }
}

// 부모 프레임(iframe 쇼케이스 등)으로부터 카드 앞/뒷면 제어 메시지 수신 연동
/* ------------------------------------------------------------------
 * 앞면 레이어 모델
 *   front: {
 *     bg:     { type: 'image'|'color'|'gradient', src?, color?, from?, to?, angle? },
 *     text:   { layout: 'none'|'bottom-left'|'bottom-center'|'center'|'top-left', showLogo?, tone?: 'auto'|'light'|'dark' },
 *     finish: 'metal'|'glass'|'matte',
 *     qr:     'subtle'|'off'
 *   }
 * 예전 카드(plateCardImage 한 장)는 image 배경 + 글자 없음으로 읽는다.
 * ------------------------------------------------------------------ */
function normalizeFront(data) {
  const f = data.front || {};
  const bg = f.bg || (data.plateCardImage ? { type: 'image', src: data.plateCardImage } : { type: 'image', src: '/assets/toomcard_front_plate.jpg' });
  const text = Object.assign({ layout: 'none', showLogo: false, tone: 'auto' }, f.text || {});
  return {
    bg: bg,
    text: text,
    finish: ['metal', 'glass', 'matte', 'studio', 'holo'].includes(f.finish) ? f.finish : 'metal',
    qr: f.qr || 'off',
    // 틀은 사진이 있을 때만. 단색 배경은 항상 풀 블리드
    frame: (bg.type === 'image' && ['rim', 'matte', 'arch', 'round', 'polaroid', 'film', 'magazine'].includes(f.frame)) ? f.frame : 'full',
    frameTone: (f.frameTone === 'light' && f.frame !== 'film') ? 'light' : 'dark',
    look: ['studio', 'editorial', 'film'].includes(f.look) ? f.look : 'clean'
  };
}

function bgCss(bg) {
  if (!bg) return '';
  if (bg.type === 'color') return (window.TCCore && TCCore.solidBg) ? TCCore.solidBg(bg).css : (bg.color || '#101018');
  if (bg.type === 'gradient') return `linear-gradient(${bg.angle || 160}deg, ${bg.from || '#1a1530'} 0%, ${bg.to || '#07050d'} 100%)`;
  return '';
}

// 이미지 평균 밝기 → 글자 톤. 교차 출처 이미지는 읽을 수 없으니 밝은 글자로 둔다.
function detectTone(img, cb) {
  try {
    const c = document.createElement('canvas');
    c.width = 12; c.height = 12;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 12, 12);
    const d = ctx.getImageData(0, 6, 12, 6).data; // 아래 절반 (글자 자리)
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    cb(sum / (d.length / 4) > 150 ? 'dark' : 'light');
  } catch (e) {
    cb('light');
  }
}

/* ---------- 로고 엠블럼 ---------- */
const EMBLEM_OPTS = { material: ['gold', 'silver', 'chrome', 'rose'], shape: ['coin', 'tile', 'engrave'], motion: ['gold', 'sweep', 'sparkle', 'float', 'none'] };
const emblemMaskCache = {};

// 이름·회사에서 엠블럼 글자를 뽑는다 (규칙은 card-core.js에 있다)
function emblemAutoText(s) {
  return (window.TCCore && TCCore.emblemAutoText) ? TCCore.emblemAutoText(s) : (Array.from(String(s || 'T').trim())[0] || 'T').toUpperCase();
}

function normalizeEmblem(data) {
  const e = data.emblem;
  if (!e || e.on === false) return null;   // 예전 카드(엠블럼 없음)는 기존 로고 그대로
  const pick = (k, d) => (EMBLEM_OPTS[k].includes(e[k]) ? e[k] : d);
  const source = (e.source === 'logo' && e.img) ? 'logo' : 'initials';
  const base = data.kind === 'business' ? (data.company || data.name) : (data.name || data.company);
  const text = Array.from((e.text || '').trim()).slice(0, 3).join('') || emblemAutoText(base);
  return { source, text, img: e.img || '', material: pick('material', 'gold'), shape: pick('shape', 'coin'), motion: pick('motion', 'gold') };
}

// 글자 → 마스크 PNG (불투명 흰 글자). 페이지에 로드된 웹폰트로 캔버스에 그린다
function emblemTextMask(text) {
  const key = text + '|' + (document.fonts ? document.fonts.status : '');
  if (emblemMaskCache[key]) return emblemMaskCache[key];
  const N = 256, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d');
  const n = Array.from(text).length;
  let size = n === 1 ? 190 : (n === 2 ? 142 : 104);
  const family = "Montserrat, Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w > 226) { size = Math.floor(size * 226 / w); ctx.font = `900 ${size}px ${family}`; }
  ctx.fillText(text, N / 2, N / 2 + size * 0.05);
  return (emblemMaskCache[key] = cv.toDataURL('image/png'));
}

function mountEmblem(host, em) {
  const key = [em.source, em.text, em.img.length, em.material, em.shape, em.motion, document.fonts ? document.fonts.status : ''].join('|');
  if (host.dataset.key === key && host.firstChild) return;
  host.dataset.key = key;
  const mask = em.source === 'logo' ? em.img : emblemTextMask(em.text);
  const detail = em.source === 'logo' ? em.img : '';
  host.innerHTML = `<div class="emblem em-${em.shape} mat-${em.material} mo-${em.motion}" style="--em-mask:url('${mask}')">
    <div class="em-plate"></div>
    <div class="em-art"><div class="em-shape"><div class="em-metal"></div>${detail ? `<div class="em-detail" style="background-image:url('${detail}')"></div>` : ''}<div class="em-shine"></div></div></div>
    ${em.motion === 'sparkle' ? '<i class="em-sp s1"></i><i class="em-sp s2"></i><i class="em-sp s3"></i>' : ''}${em.motion === 'gold' ? '<i class="em-sp s1"></i><i class="em-sp s2"></i><i class="em-sp s3"></i><i class="em-sp s4"></i><i class="em-sp s5"></i>' : ''}
  </div>`;
}

function renderEmblems(data) {
  const em = normalizeEmblem(data);
  const scene = document.getElementById('cardScene');
  if (scene) scene.classList.toggle('has-emblem', !!em);
  const backHost = document.getElementById('backEmblem');
  const backImg = document.getElementById('backLogoImg');
  if (backHost) { backHost.hidden = !em; if (em) mountEmblem(backHost, em); else { backHost.innerHTML = ''; backHost.dataset.key = ''; } }
  if (backImg) backImg.style.visibility = em ? 'hidden' : '';
  // 앞면 글자 옆 로고도 엠블럼으로 (앞면에 로고 표시를 켠 경우)
  const ptHost = document.getElementById('ptEmblem');
  const ptLogo = document.getElementById('ptLogo');
  const showFront = !!em && !!(data.front && data.front.text && data.front.text.showLogo);
  if (ptHost) { ptHost.hidden = !showFront; if (showFront) mountEmblem(ptHost, em); }
  if (ptLogo && showFront) ptLogo.hidden = true;
}
// 웹폰트가 늦게 도착하면 엠블럼 글자를 다시 그린다
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (typeof cardData !== 'undefined' && cardData) renderEmblems(cardData); });

function setClassGroup(el, prefix, list, value) {
  list.forEach((v) => el.classList.remove(prefix + v));
  el.classList.add(prefix + value);
}

// 사진 크기·위치·보정(룩 포함)을 사진 레이어와 가장자리 흐림 레이어에 함께 적용
function applyPhotoStyle(bg, look) {
  const img = document.getElementById('plateArtworkImg');
  const soft = document.getElementById('plateSoftImg');
  if (!img || !window.TCCore) return;
  const st = TCCore.frontImageStyle(bg, look);
  [[img, st.filter], [soft, st.softFilter]].forEach(([el, filter]) => {
    if (!el) return;
    el.style.setProperty('object-position', st.objectPosition, 'important');
    el.style.setProperty('transform', st.transform);
    el.style.setProperty('transform-origin', st.transformOrigin);
    el.style.setProperty('filter', filter, 'important');
  });
  applyTint(st.tint);
}

function applyTint(color) {
  const el = document.getElementById('plateTint');
  if (!el) return;
  el.hidden = !color;
  el.style.background = color || '';
}

function renderFrontLayers(data) {
  const container = document.getElementById('plateArtworkContainer');
  const plateImg = document.getElementById('plateArtworkImg');
  const overlay = document.getElementById('plateTextOverlay');
  const subtleQr = document.getElementById('plateSubtleQr');
  if (!container) return;
  const front = normalizeFront(data);
  const soft = document.getElementById('plateSoftImg');
  window.__look = front.look;
  setClassGroup(container, 'frame-', ['full', 'rim', 'matte', 'arch', 'round', 'polaroid', 'film', 'magazine'], front.frame);
  setClassGroup(container, 'fb-', ['dark', 'light'], front.frameTone);
  setClassGroup(container, 'look-', ['clean', 'studio', 'editorial', 'film'], front.look);
  const bandFrame = ['matte', 'arch', 'round', 'polaroid', 'film'].includes(front.frame);

  // 배경
  if (front.bg.type === 'image') {
    const src = front.bg.src || '/assets/toomcard_front_plate.jpg';
    if (plateImg) {
      plateImg.hidden = false;
      if (plateImg.src !== new URL(src, location.href).href) plateImg.src = src;
      // 사진 조정: 크기(zoom) · 위치(x, y) · 룩 · 필터 · 밝기 · 흐림 · 색 입히기
      applyPhotoStyle(front.bg, front.look);
      // 사진관 룩: 가장자리만 흐린 두 번째 레이어 (인물 배경이 부드럽게 날아간 느낌)
      if (soft) {
        soft.hidden = front.look !== 'studio';
        if (!soft.hidden && soft.src !== plateImg.src) soft.src = plateImg.src;
      }
    }
    container.style.background = '';
  } else {
    if (plateImg) plateImg.hidden = true;
    if (soft) soft.hidden = true;
    applyTint('');
    container.style.background = bgCss(front.bg);
  }

  // 마감
  container.classList.remove('plate-finish-metal', 'plate-finish-glass', 'plate-finish-matte');
  container.classList.add(`plate-finish-${front.finish}`);

  // 글자·로고
  if (overlay) {
    const layout = front.text.layout || 'none';
    if (layout === 'none') {
      overlay.hidden = true;
    } else {
      overlay.hidden = false;
      overlay.className = `plate-text-overlay ${bandFrame ? 'pos-band' : 'pos-' + layout}`;
      const el = (id) => document.getElementById(id);
      if (el('ptName')) el('ptName').innerText = data.name || '';
      if (el('ptRole')) el('ptRole').innerText = data.role || '';
      if (el('ptCompany')) el('ptCompany').innerText = data.company || '';
      const logo = el('ptLogo');
      if (logo) {
        const logoSrc = front.text.showLogo ? ((data.logo && data.logo.src) || data.avatar || '') : '';
        logo.hidden = !logoSrc;
        if (logoSrc) logo.src = logoSrc;
      }
      const applyTone = (tone) => { overlay.classList.remove('tone-light', 'tone-dark'); overlay.classList.add(`tone-${tone}`); };
      if (bandFrame) {
        applyTone(front.frameTone === 'light' ? 'dark' : 'light');   // 사진 밑 띠는 틀 배경색 기준
      } else if (front.text.tone && front.text.tone !== 'auto') {
        applyTone(front.text.tone);
      } else if (front.bg.type === 'image' && plateImg) {
        applyTone('light');
        const probe = new Image();
        if (!/^(data:|blob:)/.test(plateImg.src) && new URL(plateImg.src, location.href).origin === location.origin) probe.crossOrigin = 'anonymous';
        probe.onload = () => detectTone(probe, applyTone);
        probe.src = plateImg.src;
      } else if (front.bg.type === 'color') {
        const s = (window.TCCore && TCCore.solidBg) ? TCCore.solidBg(front.bg) : { isLight: false };
        applyTone(s.isLight ? 'dark' : 'light');
      } else {
        applyTone('light');
      }
    }
  }

  // 옅은 QR. 켜져 있으면 하단 'QR코드' 알약은 중복이라 숨긴다
  container.classList.toggle('has-subtle-qr', front.qr === 'subtle');
  if (subtleQr) {
    if (front.qr === 'subtle') {
      subtleQr.hidden = false;
      const dark = !(overlay && overlay.classList.contains('tone-dark'));
      const qrKey = 'icon|' + dark;
      if (subtleQr.dataset.qrKey !== qrKey) {
        // 빽빽한 진짜 QR 대신 또렷한 QR 모양 아이콘 하나만 둔다. 누르면 진짜 QR이 크게 뜬다.
        subtleQr.dataset.qrKey = qrKey;
        const c = dark ? '#fff' : '#000';
        subtleQr.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h2.5v2.5H14zM18.5 14H21M14 19h2.5M18.5 18.5H21V21h-2.5z"/></svg>`;
      }
    } else {
      subtleQr.hidden = true;
      subtleQr.innerHTML = ''; subtleQr.dataset.qrKey = '';
    }
  }
}

window.addEventListener('message', (event) => {
  if (!event || !event.data) return;
  const scene = document.getElementById('cardScene');
  if (!scene) return;
  const action = typeof event.data === 'string' ? event.data : event.data.action;
  if (action === 'adjust' && event.data.bg && event.data.bg.type === 'color') {
    // 단색: 색·밝기를 바꾸는 동안 배경과 글자 톤만 바로 갱신
    const box = document.getElementById('plateArtworkContainer');
    if (box && window.TCCore) {
      box.style.background = bgCss(event.data.bg);
      const ov = document.getElementById('plateTextOverlay');
      if (ov && !ov.hidden && ov.className.indexOf('tone-') >= 0) {
        const light = TCCore.solidBg(event.data.bg).isLight;
        ov.classList.remove('tone-light', 'tone-dark'); ov.classList.add(light ? 'tone-dark' : 'tone-light');
      }
    }
    return;
  }
  if (action === 'adjust' && event.data.bg) {
    // 메이커에서 사진을 끌거나 벌리는 동안: 전체를 다시 그리지 않고 사진 스타일만 바꾼다
    applyPhotoStyle(event.data.bg, window.__look);
    return;
  }
  if (action === 'render' && event.data.card) {
    // 메이커 미리보기: 카드 데이터를 통째로 다시 그리고, 다 그렸다고 알린다 (전환 애니메이션 타이밍용)
    Promise.resolve(populateCard(event.data.card)).then(() => {
      try { window.parent.postMessage({ action: 'rendered', seq: event.data.seq }, '*'); } catch (err) {}
    });
    return;
  }
  if (action === 'show_back') {
    scene.classList.add('flipped');
  } else if (action === 'show_front') {
    scene.classList.remove('flipped');
  } else if (action === 'flip') {
    scene.classList.toggle('flipped');
  }
});

// 뒷면 로고 ↔ 인스턴트 QR 3D 인터랙티브 플립 토글 (엄격한 이벤트 버블링 방지)
window.toggleBackLogoQr = function(event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
  }
  const flipper = document.getElementById('backFlipper');
  if (!flipper) return;

  const isShowingQr = flipper.classList.toggle('show-qr');

  // QR이 아직 렌더링되지 않았거나 비어있으면 즉시 생성
  if (isShowingQr) {
    const qrTarget = document.getElementById('backQrDirectTarget');
    if (qrTarget && (!qrTarget.hasChildNodes() || qrTarget.children.length === 0)) {
      renderBackDirectQr();
    }
  }
};

// QR Code Modal (qrcodeObj is declared at top of file)
function renderBackDirectQr() {
  const target = document.getElementById('backQrDirectTarget');
  if (!target) return;
  target.innerHTML = "";
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(target, {
        text: window.location.href,
        width: 86,
        height: 86,
        colorDark: "#0c0a14",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (e) {
      console.warn("Back QR generate error:", e);
    }
  }
}

function initQrCode() {
  const qrTarget = document.getElementById('qrContainer');
  if (!qrTarget) return;
  qrTarget.innerHTML = "";
  qrcodeObj = new QRCode(qrTarget, {
    text: window.location.href,
    width: 160,
    height: 160,
    colorDark: "#100a24",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

window.switchQrType = function(type) {
  if (!qrcodeObj) return;

  const btnWeb = document.getElementById('btnQrWeb');
  const btnKakao = document.getElementById('btnQrKakao');

  if (type === 'web') {
    btnWeb.style.background = 'rgba(168, 85, 247, 0.2)';
    btnWeb.style.color = '#d8b4fe';
    btnKakao.style.background = 'transparent';
    btnKakao.style.color = 'rgba(255, 255, 255, 0.5)';
    qrcodeObj.clear();
    qrcodeObj.makeCode(window.location.href);
  } else if (type === 'kakao') {
    const kakaoSocial = cardData?.socials?.find(s => s.type === 'kakao');
    if (!kakaoSocial || !kakaoSocial.url || !kakaoSocial.url.startsWith('http')) {
      showToast("❌ 카카오톡 링크가 등록되지 않았습니다.");
      return;
    }
    btnKakao.style.background = '#fee500';
    btnKakao.style.color = '#371d1e';
    btnWeb.style.background = 'transparent';
    btnWeb.style.color = 'rgba(255, 255, 255, 0.5)';
    qrcodeObj.clear();
    qrcodeObj.makeCode(kakaoSocial.url);
  }
};

function openShareModal() {
  if (typeof gtag === 'function') {
    gtag('event', 'view_qr', {
      event_category: 'engagement',
      card_name: cardData?.name || 'unknown'
    });
  }
  const modal = document.getElementById('shareModal');
  if (modal) {
    modal.classList.add('active');
    if (!qrcodeObj) {
      initQrCode();
    }
  }
}

function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (modal) modal.classList.remove('active');
}

function handleModalBgClick(e) {
  if (e.target.id === 'shareModal') {
    closeShareModal();
  }
}

// Social Channels Modal
function openSocialModal() {
  const modal = document.getElementById('socialModal');
  if (modal) modal.classList.add('active');
}

function closeSocialModal() {
  const modal = document.getElementById('socialModal');
  if (modal) modal.classList.remove('active');
}

function handleSocialModalBgClick(e) {
  if (e.target.id === 'socialModal') {
    closeSocialModal();
  }
}

// Toast
function showToast(msg) {
  const toast = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');
  if (!toast) return;
  if (toastText) toastText.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// Kakao SDK Init
if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
  Kakao.init('a9f1f4d2bdd716519cf711ef516bf8b9');
}

// Kakao Share
function shareToKakao() {
  if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
    showToast("카카오톡 공유를 초기화할 수 없습니다.");
    return;
  }
  
  const title = (cardData && cardData.name) ? `${cardData.name} | ${cardData.company || 'TOOMCARD'}` : ((cardData && cardData.meta) ? cardData.meta.title : "TOOMCARD 3D 디지털 명함");
  const desc = (cardData && cardData.role) ? `${cardData.role} · ${cardData.slogan || '3D 인터랙티브 스마트 명함'}` : "종이 명함의 시대를 끝내는 살아 움직이는 3D 스마트 명함";
  
  let imageUrl = '';
  if (cardData && cardData.meta && cardData.meta.ogImage) {
    imageUrl = cardData.meta.ogImage.startsWith('http') ? cardData.meta.ogImage : `https://toomcard.com/${cardData.meta.ogImage.replace(/^\/+/, '')}`;
  } else if (cardData && (cardData.slug === 'hyangwon' || cardData.name === '이향원')) {
    imageUrl = 'https://toomcard.com/assets/toomcard_og_hyangwon.jpg';
  } else {
    const ogParams = new URLSearchParams({
      title: cardData?.name || 'TOOMCARD',
      subtitle: (cardData?.role || '') + (cardData?.slogan ? ` · ${cardData.slogan}` : ''),
      company: cardData?.company || 'TOOMCARD',
      theme: cardData?.theme || 'obsidian'
    });
    imageUrl = `https://toomcard.com/api/og?${ogParams.toString()}`;
  }

  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: title,
      description: desc,
      imageUrl: imageUrl,
      link: {
        mobileWebUrl: window.location.href,
        webUrl: window.location.href,
      },
    },
    buttons: [
      {
        title: '명함 보기',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
    ],
  });
  
  if (typeof gtag === 'function') {
    gtag('event', 'share', {
      method: 'kakao_share',
      content_type: 'digital_card',
      item_id: window.location.pathname
    });
  }
}

// Copy URL
function copyCardUrl() {
  if (typeof gtag === 'function') {
    gtag('event', 'share', {
      method: 'copy_link',
      content_type: 'digital_card',
      item_id: window.location.pathname
    });
  }
  navigator.clipboard.writeText(window.location.href).then(() => {
    showToast("명함 링크가 복사되었습니다!");
    closeShareModal();
  }).catch(() => {
    showToast("링크 복사에 실패했습니다.");
  });
}

// Native Web Share
function nativeShare() {
  if (typeof gtag === 'function') {
    gtag('event', 'share', {
      method: 'native_share',
      content_type: 'digital_card',
      item_id: window.location.pathname
    });
  }
  if (navigator.share) {
    navigator.share({
      title: (cardData && cardData.meta) ? cardData.meta.title : "TOOMCARD 3D 디지털 명함",
      text: (cardData && cardData.company) ? `${cardData.company} 3D 스마트 명함입니다.` : "TOOMCARD 3D 스마트 명함입니다.",
      url: window.location.href
    }).catch(() => {});
  } else {
    copyCardUrl();
  }
}

// Dynamic vCard Download
function downloadVCard() {
  if (typeof gtag === 'function') {
    gtag('event', 'save_contact', {
      event_category: 'conversion',
      card_name: cardData?.name || 'unknown'
    });
  }
  // Record conversion to Supabase page_views
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const slug = (typeof currentSlug !== 'undefined' && currentSlug) ? currentSlug : window.location.pathname.replace(/^\//, '');
      if (slug && !slug.includes('.')) {
        supabaseClient.from('page_views').insert({
          target_slug: slug,
          metadata: {
            event: 'vcard_save',
            channel: 'vCard Download',
            device: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            referrer: document.referrer || ''
          }
        }).then();
      }
    }
  } catch(e) {}

  if (!cardData || !cardData.vcard) {
    showToast("연락처 정보를 찾을 수 없습니다.");
    return;
  }
  const v = cardData.vcard;
  const vcardData = `BEGIN:VCARD
VERSION:3.0
N:${v.lastName || ''};${v.firstName || ''};;;
FN:${v.formattedName || cardData.name}
ORG:${v.org || cardData.company}
TITLE:${v.title || cardData.role}
TEL;TYPE=WORK,VOICE:${v.tel || cardData.phone}
EMAIL;TYPE=WORK,INTERNET:${v.email || cardData.email}
URL;TYPE=WORK:${v.url || cardData.website || ''}
NOTE:${v.note || cardData.slogan || ''}
END:VCARD`;

  const ua = navigator.userAgent || '';
  const isKakaoTalk = /KAKAOTALK/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(v.formattedName || cardData.name).replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  if (isKakaoTalk && isIOS) {
    showToast("💡 카톡 우측 상단 [···] > [Safari로 열기] 시 주소록에 즉시 자동 저장됩니다.", 4500);
  } else {
    showToast("연락처 파일(vCard)이 다운로드되었습니다!");
  }
}

// 클라우드 프로필을 3D 명함 모델로 매핑 (profile + components_json 완전 병합)
function populateCardFromCloud(cloud, company) {
  const p = cloud.profile || {};
  const podJson = (cloud.pod && cloud.pod.components_json) ? cloud.pod.components_json : {};
  const innerCard = podJson.card || podJson;

  // 1. 직접 저장된 고품질 명함 객체(card)가 유효한 경우 바로 렌더링
  if (innerCard && innerCard.name && (innerCard.role || innerCard.company)) {
    return populateCard(innerCard);
  }

  // 2. profile과 components_json을 누락 없이 지능형 병합 (단일 명함 발행 지원)
  const name = innerCard.name || p.name || 'Member';
  const role = innerCard.role || (p.handle ? p.handle.replace(/@\w+\s*[·•-]?\s*/, '').trim() : '대표');
  const companyName = innerCard.company || company || p.bio || (p.handle && p.handle.includes('@') ? p.handle.split('·')[0].replace('@', '').trim() : 'TOOMCARD');
  const layout = innerCard.layout || p.layout || 'plate';
  const theme = innerCard.theme || p.theme || 'obsidian';
  const watermark = innerCard.companyWatermark || companyName;
  const slogan = innerCard.slogan || p.bio || '종이 명함의 시대를 끝내는 살아 움직이는 3D 명함';
  const tagline = innerCard.tagline || 'LIFE · CONNECTED';
  const phone = innerCard.phone || p.phone || '010-0000-0000';
  const email = innerCard.email || p.email || 'hello@toomcard.com';
  const moatTags = innerCard.moatTags || ['3D 인터랙티브', 'vCard 주소록 저장', '올인원 멀티링크'];
  const primaryAction = innerCard.primaryAction || {
    url: 'https://toomcard.com',
    label: '공식 웹사이트',
    icon: 'globe'
  };
  const affiliateAction = innerCard.affiliateAction || null;
  const socials = innerCard.socials || [
    { type: 'kakao', url: 'https://open.kakao.com', label: '카카오톡 상담', color: '#ffd978' },
    { type: 'instagram', url: 'https://instagram.com', label: '인스타그램', color: '#f472b6' }
  ];

  const cardModel = {
    slug: p.slug || cloud.pod?.slug || '',
    layout: layout,
    theme: theme,
    name: name,
    role: role,
    title: role,
    company: companyName,
    companyWatermark: watermark,
    slogan: slogan,
    tagline: tagline,
    phone: phone,
    email: email,
    origin: 'TOOMCARD Global',
    moatTags: moatTags,
    primaryAction: primaryAction,
    affiliateAction: affiliateAction,
    socials: socials,
    logo: innerCard.logo || {
      src: p.avatar_url || '/assets/logo_toomcard_hd.gif',
      fallback: '/assets/logo_toomcard_hd.gif',
      alt: companyName
    },
    plateCardImage: innerCard.plateCardImage || '/assets/toomcard_front_plate.png',
    vcard: {
      firstName: name.length > 2 ? name.slice(1) : name,
      lastName: name.length > 2 ? name.slice(0, 1) : '',
      formattedName: name,
      org: companyName,
      title: role,
      tel: phone,
      email: email,
      url: primaryAction.url || window.location.href,
      note: `${companyName} | ${slogan}`
    },
    meta: {
      title: `${companyName} | ${name} 3D 스마트 명함`,
      siteName: companyName,
      ogTitle: `${name} ${role} | ${companyName}`,
      ogDescription: `${slogan} | ${companyName} 공식 3D 디지털 명함`,
      ogImage: '/assets/toomcard_front_plate.png'
    }
  };

  return populateCard(cardModel);
}

const CARD_ALIAS_MAP = {
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
  'toomcard': 'toomcard',
  'gold': 'gold',
  'enterprise': 'enterprise',
  'maza': 'maza',
  '마자': 'maza'
};

// 초기화 진입점
async function initCardEngine() {
  // 0. SSR에서 주입된 데이터가 있으면 네트워크 대기 0초 즉시 렌더링 (화면 깜빡임 원천 차단)
  if (window.INITIAL_CARD_DATA) {
    await populateCard(window.INITIAL_CARD_DATA);
    setupSwipe();
    setupTilt();
    applyInitialFlipState();
    const container = document.querySelector('.container');
    if (container) container.classList.add('loaded');
    return;
  }

  const { company, slug } = getCardIdentifier();
  let decodedSlug = slug;
  try { decodedSlug = decodeURIComponent(slug); } catch(e) {}

  const alias = CARD_ALIAS_MAP[slug] || CARD_ALIAS_MAP[decodedSlug] || null;
  const slugsToTry = Array.from(new Set([slug, decodedSlug, alias].filter(Boolean)));

  // 1. Supabase 클라우드에서 검색 시도
  if (typeof loadPodFromCloud === 'function') {
    for (const s of slugsToTry) {
      try {
        const searchSlug = company ? `${company}/${s}` : s;
        let cloud = await loadPodFromCloud(searchSlug);
        if (!cloud || (!cloud.profile && !cloud.pod)) {
          cloud = await loadPodFromCloud(s);
        }
        if (cloud && (cloud.profile || cloud.pod)) {
          await populateCardFromCloud(cloud, company);
          setupSwipe();
          setupTilt();
          applyInitialFlipState();
          const container = document.querySelector('.container');
          if (container) container.classList.add('loaded');
          return;
        }
      } catch (e) {
        console.log("Cloud card fetch fallback:", e);
      }
    }
  }

  // 2. 로컬 JSON 파일 폴백 (Live Server /toomcard/ 및 루트 환경 동시 지원)
  const base = getBasePath();
  const paths = [];
  slugsToTry.forEach(s => {
    const enc = encodeURIComponent(s);
    if (company) {
      paths.push(`${base}/cards/${company}_${s}.json`, `/cards/${company}_${s}.json`);
      if (enc !== s) {
        paths.push(`${base}/cards/${company}_${enc}.json`, `/cards/${company}_${enc}.json`);
      }
    }
    paths.push(`${base}/cards/${s}.json`, `/cards/${s}.json`, `cards/${s}.json`);
    if (enc !== s) {
      paths.push(`${base}/cards/${enc}.json`, `/cards/${enc}.json`, `cards/${enc}.json`);
    }
  });

  let loaded = false;
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        const data = await res.json();
        await populateCard(data);
        loaded = true;
        break;
      }
    } catch (e) {}
  }

  // 3. 기본 toomcard / toomus 파일 폴백
  if (!loaded) {
    const fallbackUrls = [
      `${base}/cards/toomcard.json`,
      `/cards/toomcard.json`,
      `cards/toomcard.json`,
      `${base}/cards/toomus.json`,
      `/cards/toomus.json`
    ];
    for (const fb of fallbackUrls) {
      try {
        const fallbackRes = await fetch(fb);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          await populateCard(fallbackData);
          loaded = true;
          break;
        }
      } catch (e) {}
    }
  }

  // 4. 완전 오프라인 / 404 차단용 내장 마스터 폴백 (절대 흰 화면 방지)
  if (!loaded) {
    console.warn("Using embedded master card fallback");
    await populateCard(DEFAULT_CARD_FALLBACK);
    loaded = true;
  }

  setupSwipe();
  setupTilt();
  applyInitialFlipState();
  
  // Reveal the container after rendering
  const container = document.querySelector('.container');
  if (container) {
    container.classList.add('loaded');
  }
  
  // 메이커 미리보기(iframe)에서는 조회수를 기록하지 않고, 부모에게 준비 신호만 보낸다
  const embedded = window.self !== window.top;
  if (embedded) {
    try { window.parent.postMessage({ action: 'card_ready' }, '*'); } catch (e) {}
    return;
  }

  // Analytics 조회수 기록
  if (typeof recordPageView === 'function') {
    const targetSlug = company ? `${company}/${slug}` : slug;
    recordPageView(targetSlug).catch(e => console.log('Analytics Error:', e));
  }
}

window.addEventListener('DOMContentLoaded', initCardEngine);
