/**
 * TOOMCARD Card Core
 * card.html(뷰어)과 maker.html(에디터)이 함께 쓰는 순수 헬퍼.
 * DOM 구조(워터마크 컨테이너, 테마 <link>)만 같으면 어느 페이지에서든 동작한다.
 * 레이아웃 스타일시트 교체는 뷰어(onload 대기)와 에디터(즉시)가 달라 각자 둔다.
 */
(function (global) {
  'use strict';

  // Live Server 등 하위 디렉토리 호스팅 환경(/toomcard/) 자동 감지
  function getBasePath() {
    return global.location.pathname.includes('/toomcard/') ? '/toomcard' : '';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 속성값용. 결과는 escapeHtml과 같다 (호환을 위해 이름만 유지).
  var escapeAttr = escapeHtml;

  // 테마 스타일시트 교체. <link id="themeStylesheet">가 없으면 만든다.
  function setThemeStylesheet(themeName) {
    var clean = String(themeName || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'obsidian';
    var href = getBasePath() + '/themes/' + clean + '.css';
    var el = document.getElementById('themeStylesheet');
    if (!el) {
      el = document.createElement('link');
      el.id = 'themeStylesheet';
      el.rel = 'stylesheet';
      document.head.appendChild(el);
    }
    if (el.getAttribute('href') !== href) el.setAttribute('href', href);
  }

  // 글자 수에 따라 세로 워터마크 크기를 정한다.
  // 4글자(MAZA) 135px, 6글자(TOOMUS) 88px, 7글자(SETUPOD) 72px 기준.
  function watermarkMetrics(n) {
    if (n <= 3) return { fontSize: 140, h: 115, w: 140, right: -22 };
    if (n === 4) return { fontSize: 135, h: 105, w: 135, right: -20 };
    if (n === 5) return { fontSize: 105, h: 92, w: 105, right: -15 };
    if (n === 6) return { fontSize: 88, h: 80, w: 88, right: -12 };
    if (n === 7) return { fontSize: 72, h: 70, w: 72, right: -8 };
    if (n === 8) return { fontSize: 64, h: 62, w: 64, right: -6 };
    var h = Math.max(36, Math.floor(485 / n));
    var fs = Math.round(h * 1.12);
    return { fontSize: fs, h: h, w: fs, right: -4 };
  }

  // 텍스트를 거꾸로 분해해 앞·뒷면 워터마크 컨테이너에 그린다.
  function renderWatermark(text) {
    var value = (text || '').toString().trim();
    if (!value) value = 'CARD';
    var letters = value.toUpperCase().split('').reverse();
    var m = watermarkMetrics(letters.length);
    var html = letters.map(function (c) {
      return '<span style="font-size:' + m.fontSize + 'px !important; width:' + m.w +
        'px !important; height:' + m.h + 'px !important; line-height:1;">' + escapeHtml(c) + '</span>';
    }).join('');

    ['watermarkContainerFront', 'watermarkContainerBack'].forEach(function (id) {
      var c = document.getElementById(id);
      if (!c) return;
      c.innerHTML = html;
      c.style.right = m.right + 'px';
    });
  }

  var core = {
    getBasePath: getBasePath,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    setThemeStylesheet: setThemeStylesheet,
    renderWatermark: renderWatermark
  };

  global.TCCore = core;
  // 기존 인라인 코드와의 호환: 전역 함수 이름 유지
  global.getBasePath = getBasePath;
  global.escapeHtml = escapeHtml;
  global.escapeAttr = escapeAttr;
  global.setThemeStylesheet = setThemeStylesheet;
  global.applyTheme = setThemeStylesheet;
  global.renderWatermark = renderWatermark;
})(window);
