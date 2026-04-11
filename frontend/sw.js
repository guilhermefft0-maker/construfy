// ConstruPRO PWA Service Worker
// Cache-first strategy for static assets + network-first for API

const CACHE_NAME = 'constru-pro-v1.2';
const STATIC_ASSETS = [
  '/',
  '/frontend/',
  '/frontend/index.html',
  '/frontend/login.html',
  '/frontend/register.html',
  '/frontend/dashboard.html',
  '/frontend/global.css',
  '/frontend/index.css',
  '/frontend/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Static assets: cache-first
  if (STATIC_ASSETS.some(path => url.pathname.includes(path.split('/')[1]))) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(() => {
        // Fallback for offline: show custom page
        return caches.match('/frontend/index.html');
      })
    );
  } 
  // API calls: network-first with cache fallback
  else if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
  // Default: network-first
  else {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/frontend/index.html');
      })
    );
  }
});

// Push notifications (future)
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'Nova notificação da ConstruPRO',
    icon: '/icon-192.png',
    badge: '/badge.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: 'Ver agora' },
      { action: 'close', title: 'Fechar' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'ConstruPRO', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/frontend/dashboard.html')
  );
});
