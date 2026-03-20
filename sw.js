// sw.js — Service Worker for 旅遊手帳 PWA
const CACHE_NAME = 'trip-app-v5';

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
// HTML / JS / CSS 永遠從網路取最新版，失敗才用快取
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Firebase / Google 直接走網路
  if (BYPASS_HOSTS.some(h => url.hostname.includes(h))) return;

  // HTML、JS、CSS 強制 Network First（不用快取版本）
  const isAsset = /\.(html|js|css)$/.test(url.pathname) || url.pathname.endsWith('/');

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
