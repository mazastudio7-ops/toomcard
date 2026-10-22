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
      'card.qr_desc': '카메라로 QR을 스캔하면 이 명함이 열려요',
      'card.qr_web': '명함 링크',
      'card.qr_kakao': '바로 카톡',
      'card.save_kakao': '내 카톡에 명함 저장하기',
      'card.lead_submit': '1초 만에 연락처 전달하기',
      'card.made_with': 'TOOMCARD로 만든 명함',
      'card.make_mine': '내 명함 만들기',
      'card.tap_to_flip': '탭해서 뒤집기',
      'card.more_title': '공유 & 더보기',
      'card.leave_contact': '연락처 남기기',
      'card.install_app': '홈 화면에 추가',
      'card.lead_title': '내 연락처 남기기',
      'card.lead_desc': '연락처를 남기면 명함 주인에게 바로 전달돼요.',
      'card.lead_phone': '내 전화번호',
      'card.lead_memo': '메모 (선택)',
      'card.lead_memo_ph': '예: 협업 문의',
      'card.kakao': '카카오톡',
      'common.sms': '문자',

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
      'maker.start_points': '시작점',
      'maker.sec_photo': '사진 조정',
      'maker.pick_photo': '내 사진 고르기',
      'maker.photo_only': '사진 배경일 때 크기·위치·색을 바꿀 수 있어요.',
      'maker.adj_gesture': '카드 위에서 끌면 위치, 두 손가락으로 벌리면 크기가 바뀌어요.',
      'maker.adj_zoom': '크기',
      'maker.adj_x': '좌우',
      'maker.adj_y': '상하',
      'maker.adj_bright': '밝기',
      'maker.adj_blur': '흐림',
      'maker.tint': '색 입히기',
      'maker.adj_reset': '조정 초기화',
      'maker.f_none': '원본',
      'maker.f_vivid': '선명',
      'maker.f_mono': '흑백',
      'maker.f_warm': '따뜻하게',
      'maker.f_cool': '차갑게',
      'maker.f_film': '필름',
      'maker.f_dim': '어둡게',
      'maker.add_photo': '내 사진',
      'maker.done': '완료',
      'maker.tab_info': '정보',
      'maker.tab_photo': '사진',
      'maker.tab_text': '글자',
      'maker.tab_finish': '마감',
      'maker.tab_publish': '발행',
      'maker.social': '소셜 채널 1개',
      'maker.tags': '키워드 태그 (쉼표로 구분, 최대 3)',
      'maker.sec_bg': '2. 앞면 배경',
      'maker.bg_hint': '폰 배경화면 고르듯이. 내 사진이 제일 좋아요.',
      'maker.bg_upload': '내 사진',
      'maker.bg_set': '배경을 바꿨어요.',
      'maker.sec_text': '3. 앞면 글자',
      'maker.text_none': '글자 없음',
      'maker.text_bl': '왼쪽 아래',
      'maker.text_bc': '가운데 아래',
      'maker.text_c': '정중앙',
      'maker.text_tl': '왼쪽 위',
      'maker.show_logo': '로고 함께 표시',
      'maker.logo_upload': '로고 / 프로필 사진 (선택)',
      'maker.sec_finish': '4. 마감 & 뒷면',
      'maker.finish_metal': '메탈',
      'maker.finish_glass': '유리',
      'maker.finish_matte': '매트',
      'maker.qr_subtle': '앞면에 옅은 QR 깔기',
      'maker.front': '앞면',
      'maker.back': '뒷면',
      'maker.sec_publish': '발행',
      'maker.sec_export': '내보내기',
      'maker.wallpaper': '앞면을 폰 배경화면으로 저장',
      'maker.wallpaper_saved': '배경화면 이미지를 저장했어요.',
      'maker.nfc_order': '실물 NFC 카드 주문',
      'maker.need_name': '이름과 회사는 꼭 필요해요.',
      'maker.publishing': '발행하는 중…',
      'maker.publish_fail': '발행에 실패했어요.',
      'maker.link_copied': '링크를 복사했어요.',

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
      'card.qr_desc': 'Scan the QR with a phone camera to open this card',
      'card.qr_web': 'Card link',
      'card.qr_kakao': 'KakaoTalk',
      'card.save_kakao': 'Save to KakaoTalk',
      'card.lead_submit': 'Send my contact in 1 second',
      'card.made_with': 'Made with TOOMCARD',
      'card.make_mine': 'Create my own card',
      'card.tap_to_flip': 'Tap to flip',
      'card.more_title': 'Share & more',
      'card.leave_contact': 'Leave contact',
      'card.install_app': 'Add to home screen',
      'card.lead_title': 'Leave my contact',
      'card.lead_desc': 'Your details go straight to the card owner.',
      'card.lead_phone': 'My phone number',
      'card.lead_memo': 'Note (optional)',
      'card.lead_memo_ph': 'e.g. Let\'s work together',
      'card.kakao': 'KakaoTalk',
      'common.sms': 'Text',

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
      'maker.start_points': 'Starting points',
      'maker.sec_photo': 'Adjust photo',
      'maker.pick_photo': 'Choose my photo',
      'maker.photo_only': 'Size, position and color can be adjusted on photo backgrounds.',
      'maker.adj_gesture': 'Drag on the card to move the photo, pinch to resize.',
      'maker.adj_zoom': 'Size',
      'maker.adj_x': 'Left/right',
      'maker.adj_y': 'Up/down',
      'maker.adj_bright': 'Light',
      'maker.adj_blur': 'Blur',
      'maker.tint': 'Color wash',
      'maker.adj_reset': 'Reset adjustments',
      'maker.f_none': 'Original',
      'maker.f_vivid': 'Vivid',
      'maker.f_mono': 'Mono',
      'maker.f_warm': 'Warm',
      'maker.f_cool': 'Cool',
      'maker.f_film': 'Film',
      'maker.f_dim': 'Dim',
      'maker.add_photo': 'My photo',
      'maker.done': 'Done',
      'maker.tab_info': 'Info',
      'maker.tab_photo': 'Photo',
      'maker.tab_text': 'Text',
      'maker.tab_finish': 'Finish',
      'maker.tab_publish': 'Publish',
      'maker.social': 'One social channel',
      'maker.tags': 'Keyword tags (comma-separated, max 3)',
      'maker.sec_bg': '2. Front background',
      'maker.bg_hint': 'Like picking a phone wallpaper. Your own photo works best.',
      'maker.bg_upload': 'My photo',
      'maker.bg_set': 'Background updated.',
      'maker.sec_text': '3. Front text',
      'maker.text_none': 'No text',
      'maker.text_bl': 'Bottom left',
      'maker.text_bc': 'Bottom center',
      'maker.text_c': 'Center',
      'maker.text_tl': 'Top left',
      'maker.show_logo': 'Show logo',
      'maker.logo_upload': 'Logo / profile photo (optional)',
      'maker.sec_finish': '4. Finish & back',
      'maker.finish_metal': 'Metal',
      'maker.finish_glass': 'Glass',
      'maker.finish_matte': 'Matte',
      'maker.qr_subtle': 'Subtle QR on the front',
      'maker.front': 'Front',
      'maker.back': 'Back',
      'maker.sec_publish': 'Publish',
      'maker.sec_export': 'Export',
      'maker.wallpaper': 'Save front as phone wallpaper',
      'maker.wallpaper_saved': 'Wallpaper image saved.',
      'maker.nfc_order': 'Order a physical NFC card',
      'maker.need_name': 'Name and company are required.',
      'maker.publishing': 'Publishing…',
      'maker.publish_fail': 'Publishing failed.',
      'maker.link_copied': 'Link copied.',

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
      'card.qr_desc': 'QR mit der Handykamera scannen, um diese Karte zu öffnen',
      'card.qr_web': 'Kartenlink',
      'card.qr_kakao': 'KakaoTalk',
      'card.save_kakao': 'In KakaoTalk speichern',
      'card.lead_submit': 'Meinen Kontakt in 1 Sekunde senden',
      'card.made_with': 'Erstellt mit TOOMCARD',
      'card.make_mine': 'Eigene Karte erstellen',
      'card.tap_to_flip': 'Tippen zum Umdrehen',
      'card.more_title': 'Teilen & mehr',
      'card.leave_contact': 'Kontakt hinterlassen',
      'card.install_app': 'Startbildschirm',
      'card.lead_title': 'Meinen Kontakt hinterlassen',
      'card.lead_desc': 'Deine Daten gehen direkt an den Karteninhaber.',
      'card.lead_phone': 'Meine Telefonnummer',
      'card.lead_memo': 'Notiz (optional)',
      'card.lead_memo_ph': 'z. B. Lass uns zusammenarbeiten',
      'card.kakao': 'KakaoTalk',
      'common.sms': 'SMS',

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
      'maker.start_points': 'Startpunkte',
      'maker.sec_photo': 'Foto anpassen',
      'maker.pick_photo': 'Eigenes Foto wählen',
      'maker.photo_only': 'Größe, Position und Farbe lassen sich bei Foto-Hintergründen anpassen.',
      'maker.adj_gesture': 'Auf der Karte ziehen zum Verschieben, mit zwei Fingern zoomen.',
      'maker.adj_zoom': 'Größe',
      'maker.adj_x': 'Links/rechts',
      'maker.adj_y': 'Oben/unten',
      'maker.adj_bright': 'Licht',
      'maker.adj_blur': 'Weich',
      'maker.tint': 'Farbton',
      'maker.adj_reset': 'Zurücksetzen',
      'maker.f_none': 'Original',
      'maker.f_vivid': 'Kräftig',
      'maker.f_mono': 'S/W',
      'maker.f_warm': 'Warm',
      'maker.f_cool': 'Kühl',
      'maker.f_film': 'Film',
      'maker.f_dim': 'Dunkel',
      'maker.add_photo': 'Mein Foto',
      'maker.done': 'Fertig',
      'maker.tab_info': 'Infos',
      'maker.tab_photo': 'Foto',
      'maker.tab_text': 'Text',
      'maker.tab_finish': 'Finish',
      'maker.tab_publish': 'Veröffentl.',
      'maker.social': 'Ein Social-Kanal',
      'maker.tags': 'Schlagwörter (kommagetrennt, max. 3)',
      'maker.sec_bg': '2. Hintergrund der Vorderseite',
      'maker.bg_hint': 'Wie ein Handy-Hintergrundbild. Dein eigenes Foto wirkt am besten.',
      'maker.bg_upload': 'Mein Foto',
      'maker.bg_set': 'Hintergrund geändert.',
      'maker.sec_text': '3. Text auf der Vorderseite',
      'maker.text_none': 'Kein Text',
      'maker.text_bl': 'Unten links',
      'maker.text_bc': 'Unten mittig',
      'maker.text_c': 'Mittig',
      'maker.text_tl': 'Oben links',
      'maker.show_logo': 'Logo anzeigen',
      'maker.logo_upload': 'Logo / Profilfoto (optional)',
      'maker.sec_finish': '4. Finish & Rückseite',
      'maker.finish_metal': 'Metall',
      'maker.finish_glass': 'Glas',
      'maker.finish_matte': 'Matt',
      'maker.qr_subtle': 'Dezenter QR-Code vorne',
      'maker.front': 'Vorderseite',
      'maker.back': 'Rückseite',
      'maker.sec_publish': 'Veröffentlichen',
      'maker.sec_export': 'Exportieren',
      'maker.wallpaper': 'Vorderseite als Hintergrundbild speichern',
      'maker.wallpaper_saved': 'Hintergrundbild gespeichert.',
      'maker.nfc_order': 'Physische NFC-Karte bestellen',
      'maker.need_name': 'Name und Firma sind Pflicht.',
      'maker.publishing': 'Wird veröffentlicht…',
      'maker.publish_fail': 'Veröffentlichen fehlgeschlagen.',
      'maker.link_copied': 'Link kopiert.',

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
