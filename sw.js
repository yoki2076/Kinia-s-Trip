// sw.js — Service Worker for 旅遊手帳 PWA
const CACHE_NAME = 'trip-app-v7'; // ← 版本號升級，強制舊裝置更新

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
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Firebase / Google 直接走網路，不經過 SW
  if (BYPASS_HOSTS.some(h => url.hostname.includes(h))) return;

  // 【修正 1】只對同源請求快取，跨域資源（CDN 字型等）直接放行
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        // 【修正 2】移除多餘的 response.type === 'basic' 判斷
        // （跨域已在上面 return，這裡全部都是 basic，不需要再判斷）
        if (response && response.status === 200) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // 【修正 3】離線時 document 請求 fallback 到快取的 index.html
          // 使用絕對路徑避免相對路徑在子目錄下解析錯誤
          if (event.request.destination === 'document') {
            return caches.match(new URL('./index.html', self.location).href)
              || caches.match('/index.html');
          }
        });
      })
  );
});
