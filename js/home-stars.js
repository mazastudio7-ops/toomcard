// 홈 "스타" 탭: 승인된 실제 사용자 카드 피드 + 이번 주 스타. Supabase 는 탭을 열 때만 불러온다.
(function () {
  const $ = (id) => document.getElementById(id);
  if (!$('homeTabs')) return;
  const TAG = { student: 'maker.tag_student', creator: 'maker.tag_creator', biz: 'maker.tag_biz', music: 'maker.tag_music', design: 'maker.tag_design', etc: 'maker.tag_etc' };
  const T = (k) => (window.i18n ? i18n.t(k) : k);
  let sort = 'hot', tag = '', sbLoaded = null;
  function loadSb() {
    if (sbLoaded) return sbLoaded;
    sbLoaded = new Promise((res, rej) => {
      if (typeof starFeed === 'function') return res();
      const a = document.createElement('script'); a.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; a.onerror = rej;
      a.onload = () => { const b = document.createElement('script'); b.src = '/js/supabase.js'; b.onload = res; b.onerror = rej; document.head.appendChild(b); };
      document.head.appendChild(a);
    });
    return sbLoaded;
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }
  function liked(slug) { try { return localStorage.getItem('tc_liked_' + slug) === '1'; } catch (e) { return false; } }
  function tile(row) {
    const c = row.card || {}, bg = (c.front && c.front.bg) || {};
    const st = bg.type === 'image' && bg.src ? `background-image:url('${esc(bg.src)}')` : (bg.type === 'color' ? `background:linear-gradient(160deg,${esc(bg.color || '#3b1a6e')},#07050d)` : '');
    return `<a class="stile" href="/${String(row.slug).split('/').map(encodeURIComponent).join('/')}?from=star" style="${st}" data-slug="${esc(row.slug)}">
      ${c.tag && TAG[c.tag] ? `<span class="tg">${esc(T(TAG[c.tag]))}</span>` : ''}
      <span class="who"><b>${esc(c.name || '')}</b><span>${esc(c.role || '')}</span></span>
      <button type="button" class="lk ${liked(row.slug) ? 'on' : ''}" data-like="${esc(row.slug)}">♥ ${Number(row.likes) || 0}</button></a>`;
  }
  async function loadFeed() {
    $('starGrid').innerHTML = ''; $('starEmpty').hidden = true;
    try { await loadSb(); } catch (e) { $('starEmpty').hidden = false; return; }
    const rows = await starFeed({ tag: tag || null, sort, limit: 40 });
    if (!rows.length) { $('starEmpty').hidden = false; return; }
    $('starGrid').innerHTML = rows.map(tile).join('');
  }
  async function loadWeekly() {
    try { await loadSb(); } catch (e) { return; }
    const rows = await starWeekly(3);
    if (!rows.length) return;
    $('weeklyGrid').innerHTML = rows.map(tile).join('');
    $('weekly').hidden = false;
  }
  function setTab(t) {
    document.querySelectorAll('#homeTabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    $('gallery').hidden = t !== 'gallery'; $('stars').hidden = t !== 'stars';
    if (t === 'stars') { loadFeed(); history.replaceState(null, '', '#stars'); } else history.replaceState(null, '', location.pathname);
  }
  $('homeTabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) setTab(b.dataset.t); });
  $('starSort').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; sort = b.dataset.s; document.querySelectorAll('#starSort .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); loadFeed(); });
  $('starTags').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; tag = b.dataset.tag; document.querySelectorAll('#starTags .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); loadFeed(); });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-like]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.classList.contains('on')) return;
    b.classList.add('on'); b.textContent = '♥ ' + ((parseInt(b.textContent.replace(/\D/g, ''), 10) || 0) + 1);
    try { localStorage.setItem('tc_liked_' + b.dataset.like, '1'); } catch (err) {}
    try { await loadSb(); starLike(b.dataset.like); } catch (err) {}
  }, true);
  function openFromHash() { if (location.hash === '#stars') { setTab('stars'); setTimeout(function () { var el = $('homeTabs'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250); } }
  openFromHash(); window.addEventListener('hashchange', openFromHash);
  setTimeout(loadWeekly, 1200);
})();
