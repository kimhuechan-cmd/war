// 프로스트워 Service Worker v1.0
const CACHE_NAME = 'frostwar-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@300;400;700&display=swap'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] 캐시 설치 중...');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] 일부 리소스 캐시 실패 (폰트 등):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 활성화: 구버전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] 구버전 캐시 삭제:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 요청 처리: 캐시 우선, 실패 시 네트워크
self.addEventListener('fetch', event => {
  // 구글 폰트는 네트워크 우선
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    }).catch(() => {
      // 오프라인 폴백
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
