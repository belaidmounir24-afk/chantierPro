// ChantierPro Offline-First Service Worker (v7 - Bypasses cookie_check & Admin)
const CACHE_NAME = 'chantierpro-offline-v7';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/screenshots/screenshot-mobile.png',
  '/screenshots/screenshot-desktop.png',
  '/apple-touch-icon.png',
  '/icon.svg'
];

// Helper: fetch avec timeout strict dans le Service Worker
function fetchWithTimeout(request, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timeout Service Worker (${timeoutMs}ms)`));
    }, timeoutMs);

    fetch(request, { signal: controller.signal })
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// 1. Install Event: pré-mise en cache des ressources vitales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        await cache.addAll(STATIC_ASSETS);
      } catch (err) {
        console.warn('[SW] Pré-mise en cache partielle lors de l\'installation:', err);
      }
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: purge propre des anciens caches et prise de contrôle immédiate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: CacheFirst Sécurisé avec revalidation asynchrone non-bloquante
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes WebSocket/chrome-extension
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Bypasser COMPLÈTEMENT les checks de cookies, routes API, pages admin et standalone
  if (
    url.pathname.includes('cookie_check') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.includes('admin-license') ||
    url.pathname.includes('admin-licence') ||
    url.pathname.includes('privacy') ||
    url.pathname.includes('launcher') ||
    url.pathname.includes('download') ||
    url.pathname.includes('standalone') ||
    url.pathname.includes('autonome') ||
    (url.pathname.endsWith('.html') && url.pathname !== '/index.html' && url.pathname !== '/') ||
    url.search.includes('cookie_check') ||
    url.search.includes('no-sw=1')
  ) {
    return;
  }

  // A. Mode Navigation (chargement initial de la page ou rafraîchissement)
  // PRIORITÉ LOCALE ABSOLUE : Servir le cache immédiatement s'il existe !
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = (await cache.match('/index.html')) || (await cache.match('/'));

        // Si la page est déjà en cache, la renvoyer IMMÉDIATEMENT (0ms d'attente)
        if (cachedIndex) {
          // Revalidation asynchrone en arrière-plan sans bloquer l'affichage
          event.waitUntil(
            (async () => {
              try {
                const networkRes = await fetchWithTimeout(event.request, 2000);
                if (networkRes && networkRes.status === 200) {
                  await cache.put(event.request, networkRes.clone());
                  await cache.put('/index.html', networkRes.clone());
                }
              } catch {
                // Échec réseau silencieux : la version locale reste active
              }
            })()
          );
          return cachedIndex;
        }

        // Si non présent en cache (premier chargement), tenter le réseau avec timeout
        try {
          const networkRes = await fetchWithTimeout(event.request, 2500);
          if (networkRes && networkRes.status === 200) {
            cache.put(event.request, networkRes.clone());
            cache.put('/index.html', networkRes.clone());
            return networkRes;
          }
        } catch {
          // En cas d'échec réseau, chercher n'importe quel fallback
        }

        return (
          (await cache.match('/index.html')) ||
          (await cache.match('/')) ||
          new Response('<h1>ChantierPro disponible hors-ligne</h1>', {
            headers: { 'Content-Type': 'text/html' }
          })
        );
      })()
    );
    return;
  }

  // B. Ressources statiques (Scripts, Styles, Images, Polices, Manifest)
  // Stratégie : Cache-First avec fallback réseau rapide et mise à jour en arrière-plan
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      // Si présent en cache local : retourner immédiatement
      if (cachedResponse) {
        // Optionnel : rafraîchir discrètement en arrière-plan si ressource même origine
        if (url.origin === self.location.origin) {
          event.waitUntil(
            (async () => {
              try {
                const netRes = await fetchWithTimeout(event.request, 2000);
                if (netRes && netRes.status === 200) {
                  await cache.put(event.request, netRes);
                }
              } catch {
                // Pas de panique, le cache actuel fonctionne très bien
              }
            })()
          );
        }
        return cachedResponse;
      }

      // Si absent du cache : récupérer via le réseau avec timeout strict
      try {
        const networkResponse = await fetchWithTimeout(event.request, 3000);
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // En cas de panne réseau : fallback gracieux selon la ressource
        if (event.request.destination === 'image' || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')) {
          const fallbackIcon = await cache.match('/icon.svg');
          if (fallbackIcon) return fallbackIcon;
        }

        // Pour les polices Google Fonts
        if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
          const fontFallback = await cache.match(event.request);
          if (fontFallback) return fontFallback;
        }

        return new Response(null, { status: 504, statusText: 'Offline Timeout Fallback' });
      }
    })()
  );
});

// 4. Message Event: communication avec l'application client
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
