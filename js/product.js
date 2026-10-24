// 상품 소개 페이지 공통: 언어 고르기 + data-t 문구 채우기 (링크 페이지 /link, 미니홈 페이지 /minihome)
window.PRODUCT = {
  init(T) {
    let lang = (navigator.language || 'ko').slice(0, 2);
    try { lang = localStorage.getItem('toomcard_lang') || lang; } catch (e) {}
    if (!T[lang]) lang = 'ko';
    const paint = () => {
      document.documentElement.lang = lang;
      document.querySelectorAll('[data-t]').forEach((el) => { const v = T[lang][el.dataset.t]; if (v != null) el.innerHTML = v; });
      document.querySelectorAll('#lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === lang)));
    };
    const box = document.getElementById('lang');
    if (box) box.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; lang = b.dataset.l; try { localStorage.setItem('toomcard_lang', lang); } catch (er) {} paint(); });
    paint();
  }
};
