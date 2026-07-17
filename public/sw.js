// Service Worker for Push Notifications and Offline Support
// File: public/sw.js

// Bump cache name on deploy to invalidate older cached index.html/assets
const CACHE_NAME = 'edu51five-v4';
// Only cache true static images — never JS/CSS (Vite handles those via HMR)
const urlsToCache = [
  '/Edu51Portal.png',
  '/image.png',
];

console.log('[SW STARTUP] Service Worker starting...');

// Global error handler
self.addEventListener('error', (event) => {
  console.error('[SW ERROR] Global error:', event.error, event.message);
});

// Global unhandled promise rejection handler
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW UNHANDLED REJECTION]', event.reason);
});

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW INSTALL] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW INSTALL] Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW ACTIVATE] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW ACTIVATE] Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
  self.clients.claim();
  console.log('[SW ACTIVATE] Service worker activated and claimed clients');
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Never intercept cross-origin requests (Supabase API, CDN, etc.)
  // Letting the browser handle them directly avoids breaking auth flows
  // when extensions also have fetch interceptors in the chain.
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Use network-first strategy for navigation requests to always get latest index.html
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(request, networkResponse.clone()); } catch (e) { /* ignore */ }
          });
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for same-origin static assets only
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response;
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          caches.open(CACHE_NAME).then((cache) => {
            try { cache.put(request, networkResponse.clone()); } catch (e) { /* ignore */ }
          });
        }
        return networkResponse;
      }).catch((error) => {
        console.error('[SW FETCH ERROR]', error && error.message ? error.message : error);
        throw error;
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('📨 [SW] Push event received');
  
  // event.waitUntil MUST be called immediately
  event.waitUntil(
    (async () => {
      try {
        let data = {};
        let title = 'Edu51Five';
        let body = 'New notification';
        
        console.log('📨 [SW] Event has data:', !!event.data);
        
        if (event.data) {
          try {
            const text = await event.data.text();
            console.log('📨 [SW] Got text, length:', text.length);
            
            if (text && text.trim()) {
              data = JSON.parse(text);
              console.log('📨 [SW] Parsed JSON, keys:', Object.keys(data).join(','));
            }
          } catch (e) {
            console.error('📨 [SW] Error parsing:', e.message);
          }
        }
        
        title = data.title || 'Edu51Five Update';
        body = data.body || 'New notification from Edu51Five';
        
        console.log('📨 [SW] Ready to show:', { title, body });
        
        // Simplified notification options
        const options = {
          body: body,
          icon: '/Edu51Portal.png',
          badge: '/Edu51Portal.png',
          tag: 'edu51five',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: {
            url: data.url || '/'
          }
        };

        console.log('📨 [SW] Calling showNotification...');
        await self.registration.showNotification(title, options);
        console.log('📨 [SW] ✅ Notification shown!');
        
      } catch (error) {
        console.error('📨 [SW] FAILED:', error.message, error.stack);
      }
    })()
  );
});

// Message handler - for testing
self.addEventListener('message', (event) => {
  console.log('[SW MESSAGE] Received message:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW MESSAGE] Skipping waiting...');
    self.skipWaiting();
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);
  
  event.notification.close();

  // If user clicked "close", just dismiss
  if (event.action === 'close') {
    console.log('User dismissed notification');
    return;
  }

  // Get the URL to open (default to home page)
  const urlToOpen = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href;

  console.log('Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    })
    .then((clientList) => {
      // Try to find an existing window with the app
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen);
        
        // If same origin, focus and navigate
        if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
          console.log('Focusing existing window');
          return client.focus().then(() => {
            // Navigate to the specific URL if different
            if (client.url !== urlToOpen && 'navigate' in client) {
              return client.navigate(urlToOpen);
            }
            return client;
          });
        }
      }
      
      // No existing window found, open a new one
      if (clients.openWindow) {
        console.log('Opening new window');
        return clients.openWindow(urlToOpen);
      }
    })
    .catch(err => console.error('Error handling notification click:', err))
  );
});

// Background sync event (for offline actions)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notices') {
    event.waitUntil(syncNotices());
  }
});

async function syncNotices() {
  // Placeholder for syncing notices when back online
  console.log('Syncing notices...');
}
