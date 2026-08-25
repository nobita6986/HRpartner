/**
 * Service Worker — P1 Portals STEP-04 (RQ-03, RQ-04).
 *
 * DEC-04: offline-first. Handles:
 * 1. App shell cache (cache-first for static assets)
 * 2. Check-in sync queue (background sync when online)
 * 3. Push notification display
 *
 * No new libraries (DEC-04).
 */

const CACHE_NAME = 'hrp-worker-v2';
const STATIC_ASSETS = [
  '/worker',
  '/manifest.json',
];

// ─── Install: cache app shell ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: cache-first for static, network-first for API ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip cross-origin
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    // Network-first for API
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ offline: true }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }))
    );
    return;
  }

  // Navigation/HTML must be network-first so a new deployment is visible
  // immediately. The previous cache-first rule could pin an old index.html
  // indefinitely after users had visited the Worker PWA once.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/worker')))
    );
    return;
  }

  // Cache-first for static
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

// ─── Message: sync check-in queue ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_CHECKINS') {
    syncCheckins();
  }
});

async function syncCheckins() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_STARTED' });
  });

  // Get queued check-ins from IndexedDB
  const db = await openDB();
  const tx = db.transaction('checkin_queue', 'readonly');
  const store = tx.objectStore('checkin_queue');
  const all = await getAllFromStore(store);

  const results = [];
  for (const item of all) {
    try {
      const res = await fetch('/api/worker/checkins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      if (res.ok) {
        // Remove from queue
        const delTx = db.transaction('checkin_queue', 'readwrite');
        delTx.objectStore('checkin_queue').delete(item.id);
        results.push({ id: item.id, ok: true });
      } else {
        results.push({ id: item.id, ok: false, status: res.status });
      }
    } catch {
      results.push({ id: item.id, ok: false });
    }
  }

  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETED', results });
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hrp_worker_db', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('checkin_queue')) {
        db.createObjectStore('checkin_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── Push notification ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'HRPartner', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'HRPartner', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'default',
      data: data.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/worker';
  event.waitUntil(self.clients.openWindow(url));
});
