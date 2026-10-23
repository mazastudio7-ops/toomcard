/* 폰에서 어느 페이지에서나 같은 메뉴(오른쪽 서랍)로 이동한다.
 * 각 페이지의 헤더 오른쪽 묶음에 ☰ 버튼을 붙인다. 넓은 화면(>980px)에서는 보이지 않는다. */
(function () {
  var HOSTS = ['.header-right', '.bar-r', '.navbar-inner > div:last-child'];
  var css = '.sm-burger,.sm-drawer,.sm-veil{display:none}' +
    '@media (max-width:980px){' +
    '.sm-burger{display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff;cursor:pointer;padding:0}' +
    '.sm-burger svg{width:20px;height:20px}' +
    '.sm-veil{display:block;position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .25s}' +
    '.sm-veil.open{opacity:1;pointer-events:auto}' +
    '.sm-drawer{display:flex;flex-direction:column;gap:4px;position:fixed;top:0;right:0;bottom:0;width:min(300px,84vw);z-index:99999;padding:calc(16px + env(safe-area-inset-top, 0px)) 16px 30px;background:#0d0a17;border-left:1px solid rgba(255,255,255,.1);transform:translateX(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1);overflow-y:auto;font-family:"Noto Sans KR",system-ui,sans-serif}' +
    '.sm-drawer.open{transform:none}' +
    '.sm-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font:800 12px Montserrat,sans-serif;letter-spacing:.14em;color:rgba(255,255,255,.5)}' +
    '.sm-head button{width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#fff;font-size:20px;cursor:pointer}' +
    '.sm-drawer a{padding:15px 12px;border-radius:12px;color:#fff;font-size:17px;font-weight:700;text-decoration:none}' +
    '.sm-drawer a:active{background:rgba(255,255,255,.08)}' +
    '.sm-drawer a.sm-main{background:#ffd978;color:#000;text-align:center;font-weight:900;margin-bottom:8px}' +
    '.sm-drawer a.sm-small{font-size:13px;font-weight:500;color:rgba(255,255,255,.5);padding:10px 12px}' +
    '}';
  var LABEL = {
    ko: { home: '홈 · 갤러리', make: '내 카드 만들기', cards: '내 카드 관리', more: 'NFC 실물 · 기업 · 요금', terms: '이용약관', privacy: '개인정보처리방침' },
    en: { home: 'Home · Gallery', make: 'Make my card', cards: 'My cards', more: 'NFC · Business · Pricing', terms: 'Terms', privacy: 'Privacy' },
    de: { home: 'Start · Galerie', make: 'Meine Karte erstellen', cards: 'Meine Karten', more: 'NFC · Business · Preise', terms: 'Nutzungsbedingungen', privacy: 'Datenschutz' }
  };
  function init() {
    var host = null;
    for (var i = 0; i < HOSTS.length && !host; i++) host = document.querySelector(HOSTS[i]);
    if (!host || document.querySelector('.sm-burger')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    function lab() { var l = (window.i18n && window.i18n.lang) || document.documentElement.lang || 'ko'; return LABEL[l] || LABEL.ko; }
    var b = document.createElement('button');
    b.className = 'sm-burger'; b.type = 'button'; b.setAttribute('aria-label', 'menu'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    var veil = document.createElement('div'); veil.className = 'sm-veil';
    var d = document.createElement('aside'); d.className = 'sm-drawer'; d.setAttribute('aria-hidden', 'true');
    function build() {
      var L = lab();
      d.innerHTML = '<div class="sm-head"><span>MENU</span><button type="button" aria-label="close">×</button></div>' +
        '<a class="sm-main" href="/maker">' + L.make + '</a>' +
        '<a href="/">' + L.home + '</a>' +
        '<a href="/dashboard">' + L.cards + '</a>' +
        '<a href="/index-legacy#nfc">' + L.more + '</a>' +
        '<a class="sm-small" href="/terms">' + L.terms + '</a>' +
        '<a class="sm-small" href="/privacy">' + L.privacy + '</a>';
    }
    function set(open) {
      if (open) build();
      d.classList.toggle('open', open); veil.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open)); d.setAttribute('aria-hidden', String(!open));
    }
    b.addEventListener('click', function () { set(true); });
    veil.addEventListener('click', function () { set(false); });
    d.addEventListener('click', function (e) { if (e.target.closest('a') || e.target.closest('.sm-head button')) set(false); });
    host.appendChild(b); document.body.appendChild(veil); document.body.appendChild(d);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
