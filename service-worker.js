// ── Service Worker ─────────────────────────────────────────
// キャッシュのバージョン — 更新時は番号を変えると古いキャッシュを破棄できる
const CACHE_NAME = 'pdf-marker-v2';

// オフラインで必要なファイルリスト
const CACHE_URLS = [
  './',
  './pdf-marker.html',
  './pdf.min.js',
  './pdf.worker.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時: 必要なファイルを全部キャッシュ
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.warn('一部ファイルのキャッシュに失敗:', err);
      });
    })
  );
  self.skipWaiting();
});

// 有効化時: 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// リクエスト時: キャッシュ優先、なければネット
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // 取得成功したものは追加でキャッシュ
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // オフラインでキャッシュもない場合
        return new Response('オフラインです', { status: 503 });
      });
    })
  );
});
