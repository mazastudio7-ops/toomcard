/**
 * TOOMCARD i18n
 * 원본 HTML 하나에 data-i18n 속성으로 키를 달고, 이 사전으로 UI 문구만 바꾼다.
 * 명함 내용(이름·직함 등)은 사용자 데이터이므로 번역하지 않는다.
 *
 * 사용법
 *   <span data-i18n="nav.maker">무료 만들기</span>
 *   <input data-i18n-placeholder="maker.name_ph">
 *   <a data-i18n-title="nav.home_title">
 *   <div data-i18n-switcher></div>        ← 언어 버튼이 여기 그려진다
 *   i18n.t('common.close')                 ← 스크립트에서
 *   document.addEventListener('i18n:change', e => e.detail.lang)
 *
 * 언어 결정 순서: ?lang= → localStorage → 브라우저 언어 → en
 */
(function (global) {
  'use strict';

  var LANGS = ['ko', 'en', 'de'];
  var LABELS = { ko: '한국어', en: 'EN', de: 'DE' };
  var STORAGE_KEY = 'toomcard_lang';

  var DICT = {
    ko: {
      'brand.tagline': '살아 움직이는 3D 스마트 명함',
      'brand.descriptor': '3D 디지털 명함',
      'brand.meaning': 'TOOM = To Day, To Tomorrow',

      'nav.features': '핵심 기능',
      'nav.templates': '디자인 템플릿',
      'nav.showcase': '3D 쇼룸',
      'nav.nfc': '스마트 NFC',
      'nav.reviews': '고객 후기',
      'nav.pricing': '요금제',
      'nav.faq': 'FAQ',
      'nav.enterprise': '기업 B2B',
      'nav.dashboard': '내 명함 관리',
      'nav.maker': '무료 만들기',
      'nav.home': '홈으로',
      'nav.editor': '3D 에디터',
      'nav.teams': '기업 B2B 단체',
      'nav.nfc_physical': 'NFC 스마트 실물',
      'nav.nfc_intro': '실물 NFC 카드 소개',

      'hero.cta': '30초 만에 무료 명함 만들기',
      'hero.cta_secondary': '3D 데모 체험',

      'common.close': '닫기',
      'common.cancel': '취소',
      'common.copy_link': '링크 복사',
      'common.share_other': '다른 앱 공유',
      'common.save_contact': '연락처 저장',
      'common.call': '전화',
      'common.message': '메시지',
      'common.email': '이메일',
      'common.website': '웹사이트',
      'common.more': '더보기',
      'common.back': '뒤로',
      'common.next': '다음',
      'common.required': '필수',
      'common.optional': '선택',
      'common.login_google': 'Google 계정으로 계속하기',

      'card.qr_title': '디지털 명함 QR코드',
      'card.qr_desc': '상대방 카메라로 QR코드를 스캔하세요',
      'card.qr_web': '명함 웹',
      'card.qr_kakao': '바로 카톡',
      'card.save_kakao': '내 카톡에 명함 저장하기',
      'card.lead_submit': '1초 만에 연락처 전달하기',
      'card.made_with': 'TOOMCARD로 만든 명함',
      'card.make_mine': '내 명함 만들기',
      'card.tap_to_flip': '탭해서 뒤집기',

      'maker.title': 'TOOMCARD Studio',
      'maker.sec_info': '1. 기본 정보',
      'maker.sec_design': '2. 카드 디자인',
      'maker.sec_tags': '3. 키워드 태그',
      'maker.sec_contact': '4. 연락처 & 링크',
      'maker.design_hint': '앞면 디자인을 고르세요. 옆으로 넘기면 더 있어요.',
      'maker.back_color': '뒷면 색상',
      'maker.back_color_hint': '앞면은 그대로 유지돼요',
      'maker.more_fields': '추가 정보 (선택): 주소, 슬로건, 태그라인',
      'maker.name': '이름',
      'maker.name_ph': '예: 홍길동',
      'maker.role': '직함',
      'maker.role_ph': '예: 대표, 디자이너',
      'maker.company': '회사 / 브랜드',
      'maker.company_ph': '예: TOOMCARD',
      'maker.slug': '명함 주소',
      'maker.slug_hint': '비워두면 자동 생성',
      'maker.slug_ph': '영문/숫자 (예: ceo)',
      'maker.watermark': '배경 워터마크',
      'maker.watermark_hint': '영문 대문자',
      'maker.slogan': '슬로건 한 줄',
      'maker.tagline': '영문 태그라인',
      'maker.tagline_hint': '카드 상단 작은 글씨',
      'maker.tag': '태그',
      'maker.phone': '전화번호',
      'maker.email': '이메일',
      'maker.website': '웹사이트',
      'maker.website_label': '웹사이트 버튼 이름',
      'maker.kakao': '카카오톡 링크',
      'maker.kakao_label': '카카오톡 버튼 이름',
      'maker.instagram': '인스타그램 URL',
      'maker.instagram_label': '인스타그램 버튼 이름',
      'maker.scan_ai': '내 종이 명함 찍기 (AI)',
      'maker.gallery': '템플릿 전체 보기 ↗',
      'maker.upload_front': '내 앞면 이미지 올리기',
      'maker.advanced': '고급: 앞면 사진·로고 직접 바꾸기',
      'maker.backup_json': 'JSON 백업',
      'maker.publish': '명함 만들기',
      'maker.published_title': '3D 명함이 발행되었습니다!',

      'dash.title': '내 3D 스마트 명함 & 리드 관리',
      'dash.login_required': '로그인이 필요합니다',
      'dash.my_cards': '내 스마트 명함 목록',
      'dash.leads': '수집된 잠재 고객 리드',

      'footer.tagline': '종이 명함의 시대를 끝내는 살아 움직이는 3D 명함 & 비즈니스 리드 솔루션',
      'footer.privacy': '개인정보처리방침',
      'footer.terms': '이용약관',
      'footer.imprint': '사업자 정보'
    },

    en: {
      'brand.tagline': 'The living 3D smart business card',
      'brand.descriptor': '3D Digital Business Card',
      'brand.meaning': 'TOOM = To Day, To Tomorrow',

      'nav.features': 'Features',
      'nav.templates': 'Templates',
      'nav.showcase': '3D Showroom',
      'nav.nfc': 'NFC Card',
      'nav.reviews': 'Reviews',
      'nav.pricing': 'Pricing',
      'nav.faq': 'FAQ',
      'nav.enterprise': 'For Teams',
      'nav.dashboard': 'My Cards',
      'nav.maker': 'Create Free',
      'nav.home': 'Home',
      'nav.editor': '3D Editor',
      'nav.teams': 'For Teams',
      'nav.nfc_physical': 'Physical NFC Card',
      'nav.nfc_intro': 'About NFC Cards',

      'hero.cta': 'Create your free card in 30s',
      'hero.cta_secondary': 'Try the 3D demo',

      'common.close': 'Close',
      'common.cancel': 'Cancel',
      'common.copy_link': 'Copy link',
      'common.share_other': 'Share via…',
      'common.save_contact': 'Save contact',
      'common.call': 'Call',
      'common.message': 'Message',
      'common.email': 'Email',
      'common.website': 'Website',
      'common.more': 'More',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.required': 'required',
      'common.optional': 'optional',
      'common.login_google': 'Continue with Google',

      'card.qr_title': 'Business card QR code',
      'card.qr_desc': 'Scan with your phone camera',
      'card.qr_web': 'Card link',
      'card.qr_kakao': 'KakaoTalk',
      'card.save_kakao': 'Save to KakaoTalk',
      'card.lead_submit': 'Send my contact in 1 second',
      'card.made_with': 'Made with TOOMCARD',
      'card.make_mine': 'Create my own card',
      'card.tap_to_flip': 'Tap to flip',

      'maker.title': 'TOOMCARD Studio',
      'maker.sec_info': '1. Basic info',
      'maker.sec_design': '2. Card design',
      'maker.sec_tags': '3. Keyword tags',
      'maker.sec_contact': '4. Contact & links',
      'maker.design_hint': 'Pick a front design. Swipe for more.',
      'maker.back_color': 'Back color',
      'maker.back_color_hint': 'The front stays as is',
      'maker.more_fields': 'More (optional): URL, slogan, tagline',
      'maker.name': 'Name',
      'maker.name_ph': 'e.g. Alex Rivera',
      'maker.role': 'Title',
      'maker.role_ph': 'e.g. Founder, Designer',
      'maker.company': 'Company / brand',
      'maker.company_ph': 'e.g. TOOMCARD',
      'maker.slug': 'Card URL',
      'maker.slug_hint': 'auto-generated if empty',
      'maker.slug_ph': 'letters/numbers (e.g. alex)',
      'maker.watermark': 'Background watermark',
      'maker.watermark_hint': 'UPPERCASE',
      'maker.slogan': 'One-line slogan',
      'maker.tagline': 'Tagline',
      'maker.tagline_hint': 'small text at the top of the card',
      'maker.tag': 'Tag',
      'maker.phone': 'Phone',
      'maker.email': 'Email',
      'maker.website': 'Website',
      'maker.website_label': 'Website button label',
      'maker.kakao': 'KakaoTalk link',
      'maker.kakao_label': 'KakaoTalk button label',
      'maker.instagram': 'Instagram URL',
      'maker.instagram_label': 'Instagram button label',
      'maker.scan_ai': 'Scan my paper card (AI)',
      'maker.gallery': 'See all templates ↗',
      'maker.upload_front': 'Upload my front image',
      'maker.advanced': 'Advanced: replace front photo / logo',
      'maker.backup_json': 'Backup JSON',
      'maker.publish': 'Create card',
      'maker.published_title': 'Your 3D card is live!',

      'dash.title': 'My 3D cards & leads',
      'dash.login_required': 'Please sign in',
      'dash.my_cards': 'My cards',
      'dash.leads': 'Collected leads',

      'footer.tagline': 'The living 3D business card that ends the paper era',
      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',
      'footer.imprint': 'Imprint'
    },

    de: {
      'brand.tagline': 'Die lebendige digitale 3D-Visitenkarte',
      'brand.descriptor': 'Digitale 3D-Visitenkarte',
      'brand.meaning': 'TOOM = To Day, To Tomorrow',

      'nav.features': 'Funktionen',
      'nav.templates': 'Vorlagen',
      'nav.showcase': '3D-Showroom',
      'nav.nfc': 'NFC-Karte',
      'nav.reviews': 'Bewertungen',
      'nav.pricing': 'Preise',
      'nav.faq': 'FAQ',
      'nav.enterprise': 'Für Teams',
      'nav.dashboard': 'Meine Karten',
      'nav.maker': 'Kostenlos erstellen',
      'nav.home': 'Start',
      'nav.editor': '3D-Editor',
      'nav.teams': 'Für Teams',
      'nav.nfc_physical': 'Physische NFC-Karte',
      'nav.nfc_intro': 'Über NFC-Karten',

      'hero.cta': 'In 30 Sekunden kostenlos erstellen',
      'hero.cta_secondary': '3D-Demo ansehen',

      'common.close': 'Schließen',
      'common.cancel': 'Abbrechen',
      'common.copy_link': 'Link kopieren',
      'common.share_other': 'Teilen über …',
      'common.save_contact': 'Kontakt speichern',
      'common.call': 'Anrufen',
      'common.message': 'Nachricht',
      'common.email': 'E-Mail',
      'common.website': 'Website',
      'common.more': 'Mehr',
      'common.back': 'Zurück',
      'common.next': 'Weiter',
      'common.required': 'Pflichtfeld',
      'common.optional': 'optional',
      'common.login_google': 'Mit Google fortfahren',

      'card.qr_title': 'QR-Code der Visitenkarte',
      'card.qr_desc': 'Mit der Handykamera scannen',
      'card.qr_web': 'Kartenlink',
      'card.qr_kakao': 'KakaoTalk',
      'card.save_kakao': 'In KakaoTalk speichern',
      'card.lead_submit': 'Meinen Kontakt in 1 Sekunde senden',
      'card.made_with': 'Erstellt mit TOOMCARD',
      'card.make_mine': 'Eigene Karte erstellen',
      'card.tap_to_flip': 'Tippen zum Umdrehen',

      'maker.title': 'TOOMCARD Studio',
      'maker.sec_info': '1. Grunddaten',
      'maker.sec_design': '2. Kartendesign',
      'maker.sec_tags': '3. Schlagwörter',
      'maker.sec_contact': '4. Kontakt & Links',
      'maker.design_hint': 'Vorderseite wählen. Wischen für mehr.',
      'maker.back_color': 'Farbe der Rückseite',
      'maker.back_color_hint': 'Die Vorderseite bleibt unverändert',
      'maker.more_fields': 'Mehr (optional): URL, Slogan, Tagline',
      'maker.name': 'Name',
      'maker.name_ph': 'z. B. Anna Schmidt',
      'maker.role': 'Position',
      'maker.role_ph': 'z. B. Gründerin, Designer',
      'maker.company': 'Firma / Marke',
      'maker.company_ph': 'z. B. TOOMCARD',
      'maker.slug': 'Karten-URL',
      'maker.slug_hint': 'wird automatisch erzeugt, wenn leer',
      'maker.slug_ph': 'Buchstaben/Zahlen (z. B. anna)',
      'maker.watermark': 'Wasserzeichen',
      'maker.watermark_hint': 'GROSSBUCHSTABEN',
      'maker.slogan': 'Slogan (eine Zeile)',
      'maker.tagline': 'Tagline',
      'maker.tagline_hint': 'kleiner Text oben auf der Karte',
      'maker.tag': 'Schlagwort',
      'maker.phone': 'Telefon',
      'maker.email': 'E-Mail',
      'maker.website': 'Website',
      'maker.website_label': 'Beschriftung Website-Button',
      'maker.kakao': 'KakaoTalk-Link',
      'maker.kakao_label': 'Beschriftung KakaoTalk-Button',
      'maker.instagram': 'Instagram-URL',
      'maker.instagram_label': 'Beschriftung Instagram-Button',
      'maker.scan_ai': 'Papier-Visitenkarte scannen (KI)',
      'maker.gallery': 'Alle Vorlagen ansehen ↗',
      'maker.upload_front': 'Eigenes Bild für die Vorderseite',
      'maker.advanced': 'Erweitert: Foto / Logo der Vorderseite ersetzen',
      'maker.backup_json': 'JSON sichern',
      'maker.publish': 'Karte erstellen',
      'maker.published_title': 'Deine 3D-Karte ist online!',

      'dash.title': 'Meine 3D-Karten & Leads',
      'dash.login_required': 'Bitte anmelden',
      'dash.my_cards': 'Meine Karten',
      'dash.leads': 'Gesammelte Leads',

      'footer.tagline': 'Die lebendige 3D-Visitenkarte, die das Papierzeitalter beendet',
      'footer.privacy': 'Datenschutz',
      'footer.terms': 'AGB',
      'footer.imprint': 'Impressum'
    }
  };

  function normalize(code) {
    if (!code) return null;
    var short = String(code).toLowerCase().slice(0, 2);
    return LANGS.indexOf(short) >= 0 ? short : null;
  }

  function detect() {
    var fromQuery = normalize(new URLSearchParams(global.location.search).get('lang'));
    if (fromQuery) return fromQuery;
    try {
      var stored = normalize(global.localStorage.getItem(STORAGE_KEY));
      if (stored) return stored;
    } catch (e) {}
    var nav = (global.navigator.languages && global.navigator.languages[0]) || global.navigator.language;
    return normalize(nav) || 'en';
  }

  var current = detect();

  function t(key, vars) {
    var table = DICT[current] || DICT.en;
    var value = table[key];
    if (value === undefined) value = DICT.en[key];
    if (value === undefined) value = DICT.ko[key];
    if (value === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        value = value.split('{' + k + '}').join(vars[k]);
      });
    }
    return value;
  }

  function apply(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    }
    nodes = root.querySelectorAll('[data-i18n-placeholder]');
    for (i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('placeholder', t(nodes[i].getAttribute('data-i18n-placeholder')));
    }
    nodes = root.querySelectorAll('[data-i18n-title]');
    for (i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('title', t(nodes[i].getAttribute('data-i18n-title')));
    }
    document.documentElement.setAttribute('lang', current);
    renderSwitchers();
  }

  function set(lang, opts) {
    var next = normalize(lang);
    if (!next || next === current) return;
    current = next;
    try { global.localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: next } }));
    if (!(opts && opts.silent) && global.lucide && typeof global.lucide.createIcons === 'function') {
      global.lucide.createIcons();
    }
  }

  function renderSwitchers() {
    var hosts = document.querySelectorAll('[data-i18n-switcher]');
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      var box = host.querySelector('.tc-lang-switcher');
      if (!box) {
        box = document.createElement('div');
        box.className = 'tc-lang-switcher';
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', 'Language');
        LANGS.forEach(function (code) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = LABELS[code];
          b.setAttribute('data-lang', code);
          b.addEventListener('click', function () { set(code); });
          box.appendChild(b);
        });
        host.appendChild(box);
      }
      var buttons = box.querySelectorAll('button');
      for (var j = 0; j < buttons.length; j++) {
        buttons[j].setAttribute('aria-pressed', buttons[j].getAttribute('data-lang') === current ? 'true' : 'false');
      }
    }
  }

  global.i18n = {
    t: t,
    set: set,
    apply: apply,
    langs: LANGS,
    get lang() { return current; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); });
  } else {
    apply();
  }
})(window);
