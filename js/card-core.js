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

  // 테마 스타일시트 교체. 새 시트가 다 받아진 뒤에 옛 시트를 지운다
  // (href만 바꾸면 그 사이 스타일이 빠져 카드가 아래로 무너졌다가 다시 그려진다).
  function setThemeStylesheet(themeName) {
    var clean = String(themeName || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'obsidian';
    var href = getBasePath() + '/themes/' + clean + '.css';
    var el = document.getElementById('themeStylesheet');
    if (el && el.getAttribute('href') === href) return;
    var next = document.createElement('link');
    next.rel = 'stylesheet';
    next.href = href;
    next.onload = next.onerror = function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      next.id = 'themeStylesheet';
    };
    if (el && el.parentNode) el.parentNode.insertBefore(next, el.nextSibling);
    else { next.id = 'themeStylesheet'; document.head.appendChild(next); }
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

  // 앞면 사진 필터 프리셋 (뷰어 렌더 · 메이커 배경화면 저장이 같은 값을 쓴다)
  var FRONT_FILTERS = {
    none:  '',
    vivid: 'saturate(1.35) contrast(1.08)',
    mono:  'grayscale(1) contrast(1.1)',
    warm:  'sepia(0.28) saturate(1.2) hue-rotate(-8deg)',
    cool:  'saturate(1.05) hue-rotate(12deg) brightness(1.02)',
    film:  'sepia(0.35) contrast(0.92) brightness(1.05) saturate(0.85)',
    dim:   'brightness(0.72) contrast(1.05)'
  };

  // bg = { zoom: 1~2.5, x: 0~100, y: 0~100, filter: key, brightness: 0.6~1.4 }
  function frontImageStyle(bg) {
    bg = bg || {};
    var zoom = Math.min(3, Math.max(1, Number(bg.zoom) || 1));
    var x = bg.x == null ? 50 : Number(bg.x);
    var y = bg.y == null ? 50 : Number(bg.y);
    var parts = [];
    if (FRONT_FILTERS[bg.filter]) parts.push(FRONT_FILTERS[bg.filter]);
    var b = Number(bg.brightness);
    if (b && b !== 1) parts.push('brightness(' + b + ')');
    return {
      objectPosition: x + '% ' + y + '%',
      transform: zoom === 1 ? 'none' : 'scale(' + zoom + ')',
      transformOrigin: x + '% ' + y + '%',
      filter: parts.join(' ') || 'none'
    };
  }

  var core = {
    FRONT_FILTERS: FRONT_FILTERS,
    frontImageStyle: frontImageStyle,
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
