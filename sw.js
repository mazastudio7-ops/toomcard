// TOOMCARD PWA Service Worker
// 캐시 이름은 배포마다 바뀐다: Vercel 빌드 시 scripts/stamp-sw.js가 __BUILD_ID__를 커밋 SHA로 치환.
// 로컬에서는 치환되지 않으므로 'dev'로 남는다.
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = 'toomcard-' + (BUILD_ID.startsWith('__') ? 'dev' : BUILD_ID);

const OFFLINE_FALLBACKS = [
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/favicon.ico'
];

// HTML은 절대 캐시에서 내보내지 않는다 (배포 후 예전 화면이 보이던 원인).
// 정적 자산(css/js/themes/assets)만 네트워크 우선 + 캐시 폴백.
const CACHEABLE_PREFIXES = ['/css/', '/js/', '/themes/', '/assets/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_FALLBACKS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  const isCacheable = CACHEABLE_PREFIXES.some((p) => url.pathname.startsWith(p));
  if (!isCacheable) return; // HTML·기타는 브라우저 기본 동작

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy).catch(() => {}));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});

// 새 문의 알림 (Web Push). 서버(api/push.js)가 보낸 내용을 그대로 보여 준다.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  const title = d.title || 'TOOMCARD';
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body: d.body || '',
      icon: '/assets/icon-192.png',
      badge: '/assets/icon-192.png',
      tag: 'toomcard-leads',          // 같은 태그는 하나로 합쳐 보인다 (알림이 쌓이지 않는다)
      renotify: true,
      data: { url: d.url || '/dashboard' }
    }),
    (self.navigator && self.navigator.setAppBadge && d.count) ? self.navigator.setAppBadge(d.count).catch(() => {}) : Promise.resolve()
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes(url) && 'focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
