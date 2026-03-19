// sw.js — Service Worker for 旅遊手帳 PWA
// ⚠️ 每次部署會自動用新版本號清除舊快取
const CACHE_NAME = 'trip-app-v3';

// Firebase / Google 走網路，不快取
const BYPASS_HOSTS = ['firebase', 'googleapis', 'gstatic', 'firebaseio', 'firebaseapp'];

// ── 安裝：跳過等待，立即接管 ──
self.addEventListener('install', event => {
  self.skipWaiting();
});

// ── 啟用：清除所有舊快取 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] 清除舊快取:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── 攔截 fetch：Network First ──
// 優先從網路取最新版本，失敗時才用快取（離線保底）
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Firebase / Google Fonts 直接走網路，不快取不攔截
  if (BYPASS_HOSTS.some(h => url.hostname.includes(h))) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 網路成功：更新快取並回傳
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      })
      .catch(() => {
        // 網路失敗（離線）：從快取回傳
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // 頁面請求且無快取時，回傳 index.html
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
