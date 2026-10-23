/* 인쇄용 앞·뒷면 이미지 만들기 (관리자 인쇄 파일 내보내기용).
 * 카드 크기: 재단 54 × 85.6 mm, 사방 3 mm 여백 포함 60 × 91.6 mm, 300 dpi → 709 × 1082 px.
 * 앞면은 메이커의 배경화면 저장과 같은 그림(사진 + 룩 + 이름)을 이 크기로 다시 그린다.
 * 뒷면은 카드 뒷면의 정보(소속·이름·직함·연락처·태그)와 QR을 한 장에 그린다. */
(function (global) {
  'use strict';
  var DPI = 300, MM = DPI / 25.4;
  var TRIM_W = 54, TRIM_H = 85.6, BLEED = 3;
  var W = Math.round((TRIM_W + BLEED * 2) * MM), H = Math.round((TRIM_H + BLEED * 2) * MM);   // 709 × 1082
  var BLEED_PX = Math.round(BLEED * MM), SAFE_PX = Math.round((BLEED + 3) * MM);              // 35 / 71
  var FONT = "'Montserrat','Noto Sans KR','Pretendard',sans-serif";

  function loadImage(src) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () { res(img); }; img.onerror = function () { res(null); };
      img.src = src;
    });
  }
  function newCanvas() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }

  /* 앞면: 사진 + 룩 + 이름 (배경화면 저장과 같은 규칙, 크기만 인쇄용) */
  async function front(card) {
    var cv = newCanvas(), ctx = cv.getContext('2d'), f = W / 1080;
    var fr = card.front || {}, bg = fr.bg || {};
    var img = bg.type === 'image' ? await loadImage(bg.src) : null;
    if (img) {
      var zoom = (bg.zoom || 1) * (1 + (bg.blur || 0) * 0.012), px = (bg.x == null ? 50 : bg.x) / 100, py = (bg.y == null ? 50 : bg.y) / 100;
      var s = Math.max(W / img.width, H / img.height) * zoom, w = img.width * s, h = img.height * s;
      if ('filter' in ctx && global.TCCore) { var st = TCCore.frontImageStyle(bg, fr.look); if (st.filter && st.filter !== 'none') ctx.filter = st.filter; }
      ctx.drawImage(img, (W - w) * px, (H - h) * py, w, h); ctx.filter = 'none';
      var tint = global.TCCore ? TCCore.frontImageStyle(bg).tint : '';
      if (tint) { ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = 0.9; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      var lk = fr.look;
      if (lk && lk !== 'clean') {
        var g = ctx.createRadialGradient(W / 2, H * 0.4, H * 0.28, W / 2, H * 0.4, H * 0.78);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, lk === 'film' ? 'rgba(40,20,0,0.4)' : 'rgba(0,0,0,0.5)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    } else if (bg.type === 'color' && global.TCCore) {
      var sb = TCCore.solidBg(bg);
      if (sb.soft) { var lg = ctx.createLinearGradient(0, 0, W * 0.4, H); lg.addColorStop(0, sb.from); lg.addColorStop(1, sb.to); ctx.fillStyle = lg; } else ctx.fillStyle = sb.base;
      ctx.fillRect(0, 0, W, H);
    } else {
      // 로고 판(플레이트) 이미지가 배경이면 그 이미지를 그대로 쓴다. 없으면 어두운 바탕
      var plate = await loadImage(bg.src || card.plateCardImage);
      ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, W, H);
      if (plate) { var ps = Math.max(W / plate.width, H / plate.height); ctx.drawImage(plate, (W - plate.width * ps) / 2, (H - plate.height * ps) / 2, plate.width * ps, plate.height * ps); }
    }
    // 이름 글자 (앞면 글자 설정이 켜져 있을 때만)
    var tx = fr.text || {};
    if (tx.layout && tx.layout !== 'none' && card.name) {
      var light = !(bg.type === 'color' && global.TCCore && TCCore.solidBg(bg).isLight);
      ctx.save();
      ctx.fillStyle = light ? '#ffffff' : '#0b0a10';
      ctx.shadowColor = light ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 24 * f;
      var center = tx.layout === 'center' || tx.layout === 'bottom-center';
      ctx.textAlign = center ? 'center' : 'left';
      var x = center ? W / 2 : SAFE_PX + 6 * f;
      var y = tx.layout === 'top-left' ? SAFE_PX + 150 * f : (tx.layout === 'center' ? H / 2 : H - SAFE_PX - 190 * f);
      ctx.font = '800 ' + Math.round(30 * f) + 'px ' + FONT; ctx.fillText((card.company || '').toUpperCase().split('').join(' '), x, y - 70 * f);
      ctx.font = '900 ' + Math.round(84 * f) + 'px ' + FONT; ctx.fillText(card.name, x, y);
      ctx.font = '600 ' + Math.round(38 * f) + 'px ' + FONT; ctx.globalAlpha = 0.85; ctx.fillText(card.role || '', x, y + 62 * f);
      ctx.restore();
    }
    return cv;
  }

  function qr(text, size) {
    return new Promise(function (res) {
      var host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(host);
      try { new QRCode(host, { text: text, width: size, height: size, correctLevel: QRCode.CorrectLevel.H }); } catch (e) { host.remove(); return res(null); }
      setTimeout(function () { var c = host.querySelector('canvas'); var out = null; if (c) { out = document.createElement('canvas'); out.width = out.height = size; out.getContext('2d').drawImage(c, 0, 0, size, size); } host.remove(); res(out); }, 150);
    });
  }
  function fit(ctx, txt, maxW) { var t = String(txt || ''); if (ctx.measureText(t).width <= maxW) return t; while (t.length > 3 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }
  function pill(ctx, label, cx, y, h) {
    ctx.font = '700 ' + Math.round(h * 0.52) + 'px ' + FONT;
    var w = ctx.measureText(label).width + h * 0.9, x = cx - w / 2;
    ctx.beginPath(); ctx.moveTo(x + h / 2, y); ctx.arcTo(x + w, y, x + w, y + h, h / 2); ctx.arcTo(x + w, y + h, x, y + h, h / 2); ctx.arcTo(x, y + h, x, y, h / 2); ctx.arcTo(x, y, x + w, y, h / 2); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,217,120,.55)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.textAlign = 'center'; ctx.fillText(label, cx, y + h * 0.69);
    return w;
  }

  /* 뒷면: 엠블럼(또는 로고) · 소속 · 이름 · 직함 · 연락처 · 태그 · QR */
  async function back(card, url, extra) {
    extra = extra || {};
    var cv = newCanvas(), ctx = cv.getContext('2d'), cx = W / 2, maxW = W - SAFE_PX * 2;
    var bg = ctx.createLinearGradient(0, 0, W * 0.5, H); bg.addColorStop(0, '#0e0c16'); bg.addColorStop(1, '#1a1030'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(cx, H * 0.2, 0, cx, H * 0.2, W * 0.8); glow.addColorStop(0, 'rgba(255,217,120,.16)'); glow.addColorStop(1, 'rgba(255,217,120,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    // 상단: 엠블럼 / 로고
    var em = card.emblem || {}, size = 190, ey = SAFE_PX + 6;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, ey + size / 2, size / 2, 0, Math.PI * 2); ctx.closePath();
    var ring = ctx.createLinearGradient(cx - size / 2, ey, cx + size / 2, ey + size); ring.addColorStop(0, '#fff3c4'); ring.addColorStop(0.5, '#d9b25f'); ring.addColorStop(1, '#8a6a2a');
    ctx.fillStyle = '#0a0912'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = ring; ctx.stroke(); ctx.restore();
    var markSrc = (em.on !== false && em.source === 'logo' && em.img) ? em.img : null, logoSrc = (card.logo && /^(data:|https?:|\/)/.test(card.logo.src || '')) ? card.logo.src : null;
    if (markSrc) {
      var mi = await loadImage(markSrc);
      if (mi) {
        var t = document.createElement('canvas'); t.width = t.height = 300; var tc = t.getContext('2d');
        var s2 = Math.min(300 / mi.width, 300 / mi.height); tc.drawImage(mi, (300 - mi.width * s2) / 2, (300 - mi.height * s2) / 2, mi.width * s2, mi.height * s2);
        tc.globalCompositeOperation = 'source-in'; var g2 = tc.createLinearGradient(0, 0, 300, 300); g2.addColorStop(0, '#fff3c4'); g2.addColorStop(0.5, '#d9b25f'); g2.addColorStop(1, '#8a6a2a'); tc.fillStyle = g2; tc.fillRect(0, 0, 300, 300);
        ctx.drawImage(t, cx - size * 0.36, ey + size * 0.14, size * 0.72, size * 0.72);
      }
    } else if (logoSrc && !(em.on !== false && em.source !== 'logo' && (em.text || card.name))) {
      var li = await loadImage(logoSrc);
      if (li) { ctx.save(); ctx.beginPath(); ctx.arc(cx, ey + size / 2, size / 2 - 8, 0, Math.PI * 2); ctx.clip(); var ls = Math.max((size - 16) / li.width, (size - 16) / li.height); ctx.drawImage(li, cx - li.width * ls / 2, ey + size / 2 - li.height * ls / 2, li.width * ls, li.height * ls); ctx.restore(); }
    } else {
      var ini = Array.from((em.text || card.name || 'T').trim()).slice(0, 2).join('').toUpperCase();
      var tg = ctx.createLinearGradient(0, ey, 0, ey + size); tg.addColorStop(0, '#fff3c4'); tg.addColorStop(1, '#b88a35');
      ctx.fillStyle = tg; ctx.font = '900 ' + (ini.length > 1 ? 86 : 110) + 'px ' + FONT; ctx.fillText(ini, cx, ey + size / 2 + (ini.length > 1 ? 30 : 38));
    }
    // 글자들
    var y = ey + size + 86;
    ctx.fillStyle = '#ffd978'; ctx.font = '800 26px ' + FONT; ctx.fillText(fit(ctx, (card.company || '').toUpperCase().split('').join(' '), maxW), cx, y); y += 70;
    ctx.fillStyle = '#ffffff'; var fs = 68; ctx.font = '900 ' + fs + 'px ' + FONT; while (ctx.measureText(card.name || '').width > maxW && fs > 36) { fs -= 2; ctx.font = '900 ' + fs + 'px ' + FONT; }
    ctx.fillText(card.name || '', cx, y); y += 54;
    ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.font = '600 34px ' + FONT; ctx.fillText(fit(ctx, card.role || '', maxW), cx, y); y += 76;
    var phone = extra.phone != null && extra.phone !== '' ? extra.phone : card.phone, email = extra.email != null && extra.email !== '' ? extra.email : card.email;
    if (phone) { ctx.fillStyle = '#ffffff'; ctx.font = '700 38px ' + FONT; ctx.fillText(phone, cx, y); y += 50; }
    if (email) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 29px ' + FONT; ctx.fillText(fit(ctx, email, maxW), cx, y); y += 50; }
    var tags = (card.moatTags || []).filter(Boolean).slice(0, 3);
    if (tags.length) {
      var labels = tags, h = 40, gap = 10, total = 0, ws = labels.map(function (l) { ctx.font = '700 ' + Math.round(h * 0.52) + 'px ' + FONT; return ctx.measureText(l).width + h * 0.9; });
      total = ws.reduce(function (a, b) { return a + b; }, 0) + gap * (labels.length - 1);
      var sx = cx - total / 2; y += 8;
      labels.forEach(function (l, i) { pill(ctx, l, sx + ws[i] / 2, y, h); sx += ws[i] + gap; }); y += h + 28;
    }
    // QR + 주소
    var qs = 250, qy = Math.max(y, H - SAFE_PX - qs - 70);
    var qc = await qr(url, qs - 36);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(cx - qs / 2 + 22, qy); ctx.arcTo(cx + qs / 2, qy, cx + qs / 2, qy + qs, 22); ctx.arcTo(cx + qs / 2, qy + qs, cx - qs / 2, qy + qs, 22); ctx.arcTo(cx - qs / 2, qy + qs, cx - qs / 2, qy, 22); ctx.arcTo(cx - qs / 2, qy, cx + qs / 2, qy, 22); ctx.closePath(); ctx.fill();
    if (qc) ctx.drawImage(qc, cx - qs / 2 + 18, qy + 18, qs - 36, qs - 36);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '700 25px ' + FONT; ctx.fillText(fit(ctx, url.replace(/^https?:\/\//, ''), maxW), cx, qy + qs + 42);
    return cv;
  }

  global.TCExport = { W: W, H: H, BLEED_PX: BLEED_PX, SAFE_PX: SAFE_PX, TRIM: { w: TRIM_W, h: TRIM_H, bleed: BLEED }, front: front, back: back };
})(window);
