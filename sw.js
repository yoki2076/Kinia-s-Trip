// sw.js — Service Worker for 旅遊手帳 PWA
const CACHE_NAME = 'trip-app-v1';

// 快取清單（離線也能用）
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
];

// ── 安裝：預先快取核心資源 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ── 啟用：清除舊版快取 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── 攔截 fetch：Cache First，網路失敗時用快取 ──
self.addEventListener('fetch', event => {
  // 只處理 GET，不攔截 Firebase / API 請求
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // 讓 Firebase 和 Google Fonts 走網路
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 快取成功的回應
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, toCache);
          });
        }
        return response;
      }).catch(() => {
        // 完全離線時回傳 index.html
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
