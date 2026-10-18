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

// Live Server 등 하위 디렉토리 호스팅 환경(/toomcard/) 자동 감지
function getBasePath() {
  const path = window.location.pathname;
  if (path.includes('/toomcard/')) {
    return '/toomcard';
  }
  return '';
}

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
function applyTheme(themeName) {
  const existingThemeLink = document.getElementById('themeStylesheet');
  const base = getBasePath();
  const themeHref = `${base}/themes/${themeName || 'obsidian'}.css`;
  
  if (existingThemeLink) {
    existingThemeLink.href = themeHref;
  } else {
    const link = document.createElement('link');
    link.id = 'themeStylesheet';
    link.rel = 'stylesheet';
    link.href = themeHref;
    document.head.appendChild(link);
  }
}

// 텍스트를 거꾸로 분해하여 워터마크 세로 텍스트 생성 (글자 수에 따른 지능형 동적 스케일링)
function renderWatermark(text) {
  const container = document.getElementById('watermarkContainerFront');
  const containerBack = document.getElementById('watermarkContainerBack');
  if (!text) return;

  const letters = text.toUpperCase().split('').reverse();
  const n = letters.length;

  let fontSize, spanHeight, spanWidth, rightOffset;

  if (n <= 3) {
    fontSize = 140;
    spanHeight = 115;
    spanWidth = 140;
    rightOffset = -22;
  } else if (n === 4) {
    // MAZA 원본 스펙: 135px x 105px
    fontSize = 135;
    spanHeight = 105;
    spanWidth = 135;
    rightOffset = -20;
  } else if (n === 5) {
    fontSize = 105;
    spanHeight = 92;
    spanWidth = 105;
    rightOffset = -15;
  } else if (n === 6) {
    fontSize = 88;
    spanHeight = 80;
    spanWidth = 88;
    rightOffset = -12;
  } else if (n === 7) {
    fontSize = 72;
    spanHeight = 70;
    spanWidth = 72;
    rightOffset = -8;
  } else if (n === 8) {
    fontSize = 64;
    spanHeight = 62;
    spanWidth = 64;
    rightOffset = -6;
  } else {
    spanHeight = Math.max(36, Math.floor(485 / n));
    fontSize = Math.round(spanHeight * 1.12);
    spanWidth = fontSize;
    rightOffset = -4;
  }

  const html = letters.map(c => `<span style="font-size:${fontSize}px !important; width:${spanWidth}px !important; height:${spanHeight}px !important; line-height:1;">${c}</span>`).join('');

  [container, containerBack].forEach(c => {
    if (!c) return;
    c.innerHTML = html;
    c.style.right = `${rightOffset}px`;
  });
}

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
  return `<i data-lucide="globe" style="width:14px;height:14px;color:#38bdf8;"></i>`;
}

// 내부 고전환 액션 버튼 바인딩 (setupod.com/ceo 2x2 럭셔리 그리드)
function renderActionDocks(data) {
  const dockFront = document.getElementById('insideActionDockFront');
  const dockBack = document.getElementById('insideActionDockBack');

  const primaryAction = data.primaryAction || {
    url: 'https://toomus.com',
    label: '공식 웹사이트',
    icon: 'globe'
  };

  const socials = data.socials || [];
  const social1 = socials[0] || null;
  const social2 = socials[1] || null;

  function buildSocialBtn(social) {
    if (!social) return '';
    if (social.type === 'social_modal') {
      return `
        <button class="btn-action btn-glass" onclick="event.stopPropagation(); openSocialModal();" title="${social.label}">
          <i data-lucide="${social.icon || 'globe'}" style="width: 14px; height: 14px; color: #38bdf8;"></i>
          <span>${social.label}</span>
        </button>
      `;
    }
    return `
      <a href="${social.url}" target="_blank" rel="noopener noreferrer" class="btn-action btn-glass" onclick="event.stopPropagation()" title="${social.label}">
        ${getSocialIconSvg(social.type)}
        <span>${social.label}</span>
      </a>
    `;
  }

  const social1Btn = buildSocialBtn(social1) || `
    <a href="https://open.kakao.com" target="_blank" rel="noopener noreferrer" class="btn-action btn-glass" onclick="event.stopPropagation()" title="카카오 1:1">
      ${getSocialIconSvg('kakao')}
      <span>카카오 1:1</span>
    </a>
  `;

  const social2Btn = buildSocialBtn(social2);

  const row1 = `
    <div class="inside-action-row">
      <button class="btn-action btn-save" onclick="event.stopPropagation(); downloadVCard();" title="주소록에 연락처 저장">
        <i data-lucide="user-plus" style="width: 14px; height: 14px;"></i>
        <span>연락처 저장</span>
      </button>
      <a href="${primaryAction.url}" target="_blank" rel="noopener noreferrer" class="btn-action btn-glass" onclick="event.stopPropagation()" title="${primaryAction.label}">
        <i data-lucide="${primaryAction.icon || 'globe'}" style="width: 14px; height: 14px; color: #38bdf8;"></i>
        <span>${primaryAction.label}</span>
      </a>
    </div>
  `;

  const leadBtn = `
    <button class="btn-action btn-glass" onclick="event.stopPropagation(); document.getElementById('leadModal').classList.add('active');" style="border-color: rgba(168, 85, 247, 0.4); background: rgba(168, 85, 247, 0.12);" title="명함 주인에게 연락처 및 문의 남기기">
      <i data-lucide="message-square" style="width: 14px; height: 14px; color: #c084fc;"></i>
      <span style="color: #e9d5ff; font-weight: 700;">상담/문의</span>
    </button>
  `;

  let row2Buttons = '';
  if (social1Btn && social2Btn) {
    row2Buttons = `${social1Btn}${social2Btn}`;
  } else if (social1Btn) {
    row2Buttons = `${social1Btn}${leadBtn}`;
  } else {
    row2Buttons = `${leadBtn}`;
  }

  const row2 = `
    <div class="inside-action-row">
      ${row2Buttons}
    </div>
  `;

  if (dockFront) dockFront.innerHTML = row1 + row2;
  if (dockBack) dockBack.innerHTML = row1 + row2;
}

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
  const layout = data.layout || 'classic';
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
    document.title = data.meta.title || `${data.company} | ${data.name} 디지털 명함`;
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
  if (data.logo === false || (data.logo && data.logo.src === "")) {
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
  const fLogoBox = document.querySelector('.card-medallion-box') || document.querySelector('.front-logo-box');
  const bLogoBox = document.querySelector('.back-medallion-box') || document.querySelector('.back-top-logo');
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
  if (plateImg) {
    const cacheBuster = '?v=3dmaster_' + Date.now().toString(36);
    let rawPath = '/assets/toomcard_front_plate.jpg';
    if (data.plateCardImage) {
      rawPath = data.plateCardImage;
    } else if (data.company && data.company.toLowerCase().includes('toomus')) {
      rawPath = '/assets/toomus_front_plate.png';
    }
    plateImg.onerror = function() {
      this.onerror = null;
      this.src = './assets/toomcard_front_plate.png' + cacheBuster;
    };
    plateImg.src = resolveAssetUrl(rawPath) + cacheBuster;
  }

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

  // 연락처 정보 바인딩
  const phoneLink = document.getElementById('phoneLink');
  const phoneKey = document.getElementById('phoneKey');
  const phoneValue = document.getElementById('phoneValue');
  if (phoneLink && data.phone) {
    phoneLink.href = `tel:${data.phone}`;
    if (phoneKey) {
      phoneKey.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
    }
    if (phoneValue) phoneValue.innerText = data.phone;
  }

  const emailLink = document.getElementById('emailLink');
  const emailKey = document.getElementById('emailKey');
  const emailValue = document.getElementById('emailValue');
  if (emailLink && data.email) {
    emailLink.href = `mailto:${data.email}`;
    if (emailKey) {
      emailKey.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0;"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`;
    }
    if (emailValue) emailValue.innerText = data.email;
  }

  // 해자 태그 (Moat Tags) 바인딩
  const frontMoatTags = document.getElementById('frontMoatTags');
  const backMoatTags = document.getElementById('backMoatTags');
  const tagsHtml = (data.moatTags || []).map(tag => `<span class="moat-tag">${tag}</span>`).join('');
  if (frontMoatTags) frontMoatTags.innerHTML = tagsHtml;
  if (backMoatTags) backMoatTags.innerHTML = tagsHtml;

  // 뒷면 직관 QR 코드 실시간 생성
  renderBackDirectQr();

  // 액션 독 바인딩
  renderActionDocks(data);

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

// 3D Flip Card Toggle with 250ms Debounce & Propagation Protection
let isCardFlipping = false;
function toggleCardFlip(e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  if (isCardFlipping) return;
  isCardFlipping = true;
  setTimeout(() => { isCardFlipping = false; }, 250);

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

  cardSceneEl.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;
    if (Math.abs(diffX) > 40) {
      toggleCardFlip();
    }
  }, { passive: true });
}

// URL 쿼리 파라미터(side=back / flipped=true)에 따른 초기 카드 회전 상태 적용
function applyInitialFlipState() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const side = urlParams.get('side');
    const flipped = urlParams.get('flipped');
    const scene = document.getElementById('cardScene');
    if (scene) {
      if (side === 'back' || flipped === 'true' || flipped === '1') {
        scene.classList.add('flipped');
      } else if (side === 'front') {
        scene.classList.remove('flipped');
      }
    }
  } catch (e) {
    console.error("Flip state initialization error:", e);
  }
}

// 부모 프레임(iframe 쇼케이스 등)으로부터 카드 앞/뒷면 제어 메시지 수신 연동
window.addEventListener('message', (event) => {
  if (!event || !event.data) return;
  const scene = document.getElementById('cardScene');
  if (!scene) return;
  const action = typeof event.data === 'string' ? event.data : event.data.action;
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
  applyInitialFlipState();
  
  // Reveal the container after rendering
  const container = document.querySelector('.container');
  if (container) {
    container.classList.add('loaded');
  }
  
  // Analytics 조회수 기록
  if (typeof recordPageView === 'function') {
    const targetSlug = company ? `${company}/${slug}` : slug;
    recordPageView(targetSlug).catch(e => console.log('Analytics Error:', e));
  }
}

window.addEventListener('DOMContentLoaded', initCardEngine);
