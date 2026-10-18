/**
 * SETUPOD Global Auth Modal
 * 로그인/회원가입 모달 UI를 동적으로 생성하고 Supabase 인증 함수와 연결합니다.
 */

(function() {
  // 모달 HTML 주입
  const modalHTML = `
    <div id="authModalOverlay" class="auth-modal-overlay">
      <div class="auth-modal-container">
        <button id="authModalCloseBtn" class="auth-modal-close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div class="auth-modal-header">
          <img src="/assets/logo_toomcard_hd.gif" alt="TOOMCARD" class="auth-modal-logo" style="width: 56px; height: 56px; border-radius: 16px; box-shadow: 0 0 20px rgba(168, 85, 247, 0.45); display: inline-block; margin-bottom: 16px; object-fit: cover;" onerror="this.onerror=null; this.src='/assets/logo_toomcard_hd.gif'">
          <h2 class="auth-modal-title">TOOMCARD 시작하기</h2>
          <p class="auth-modal-subtitle">제작하신 3D 명함을 영구 보존하고 toomcard.com 고유 링크를 생성하기 위해 3초 만에 로그인하세요.</p>
        </div>

        <div class="auth-modal-body">
          <button id="btnAuthGoogle" class="btn-auth btn-auth-google" style="width:100%; height:50px; font-size:15px; font-weight:700; box-shadow:0 4px 18px rgba(0,0,0,0.35);">
            <svg class="auth-icon" viewBox="0 0 24 24" style="width:20px;height:20px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google 계정으로 계속하기
          </button>
        </div>
        
        <div class="auth-modal-footer">
          <p>가입 시 TOOMCARD의 <a href="/terms">이용약관</a> 및 <a href="/privacy">개인정보처리방침</a>에 동의하게 됩니다.</p>
        </div>
      </div>
    </div>

    <style>
      .auth-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .auth-modal-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .auth-modal-container {
        position: relative;
        width: 90%;
        max-width: 420px;
        background: #120c1e;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 40px 32px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        transform: translateY(20px) scale(0.95);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .auth-modal-overlay.active .auth-modal-container {
        transform: translateY(0) scale(1);
      }
      .auth-modal-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: color 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
      }
      .auth-modal-close:hover {
        color: #fff;
      }
      .auth-modal-header {
        text-align: center;
        margin-bottom: 32px;
      }
      .auth-modal-logo {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
      }
      .auth-modal-title {
        font-size: 22px;
        font-weight: 800;
        color: #fff;
        margin-bottom: 8px;
        font-family: 'Montserrat', sans-serif;
      }
      .auth-modal-subtitle {
        font-size: 13px;
        color: #94a3b8;
        line-height: 1.5;
        word-break: keep-all;
      }
      .auth-modal-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
      }
      .btn-auth {
        width: 100%;
        height: 52px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      .auth-icon {
        width: 20px;
        height: 20px;
      }
      .btn-auth-kakao {
        background: #FEE500;
        color: #000000;
      }
      .btn-auth-kakao:hover {
        background: #F4DC00;
      }
      .btn-auth-google {
        background: #ffffff;
        color: #3c4043;
        border: 1px solid #dadce0;
      }
      .btn-auth-google:hover {
        background: #f8f9fa;
        border-color: #d2e3fc;
      }
      .auth-modal-footer {
        text-align: center;
      }
      .auth-modal-footer p {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }
      .auth-modal-footer a {
        color: rgba(255, 255, 255, 0.6);
        text-decoration: underline;
      }
      .auth-modal-footer a:hover {
        color: #fff;
      }
    </style>
  `;

  // 문서 로드 완료 시 모달 주입
  document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.getElementById('authModalOverlay');
    const closeBtn = document.getElementById('authModalCloseBtn');
    const btnKakao = document.getElementById('btnAuthKakao');
    const btnGoogle = document.getElementById('btnAuthGoogle');

    // 닫기 이벤트
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
      if (window._authCallbackReject) {
        window._authCallbackReject(new Error('User cancelled login'));
        window._authCallbackReject = null;
        window._authCallbackResolve = null;
      }
    });

    // 배경 클릭 시 닫기
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeBtn.click();
      }
    });

    // 카카오 로그인 (엘리먼트 존재 시에만)
    if (btnKakao) {
      btnKakao.addEventListener('click', () => {
        if (typeof signInWithKakao === 'function') {
          signInWithKakao();
        }
      });
    }

    // 구글 로그인
    btnGoogle.addEventListener('click', () => {
      if (typeof signInWithGoogle === 'function') {
        signInWithGoogle();
      } else {
        alert("로그인 스크립트가 로드되지 않았습니다.");
      }
    });
  });

  // 전역 함수: 로그인 요구
  window.requireAuth = async function(callback) {
    if (typeof getCurrentUser !== 'function') {
      console.warn('getCurrentUser() is not available. Please ensure supabase.js is loaded.');
      return;
    }

    const user = await getCurrentUser();
    if (user) {
      // 이미 로그인됨
      if (callback) callback(user);
      return Promise.resolve(user);
    } else {
      // 비로그인: 모달 오픈
      const overlay = document.getElementById('authModalOverlay');
      if (overlay) overlay.classList.add('active');
      
      return new Promise((resolve, reject) => {
        window._authCallbackResolve = (u) => {
          if (callback) callback(u);
          resolve(u);
        };
        window._authCallbackReject = reject;
      });
    }
  };

  // 전역 함수: 로그인 모달 직접 열기
  window.openAuthModal = function() {
    const overlay = document.getElementById('authModalOverlay');
    if (overlay) overlay.classList.add('active');
  };

})();
