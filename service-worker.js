// Service Worker for Daily Planner PWA
// Caches app assets and enables offline support

const CACHE_NAME = "daily-planner-v1";
const ASSETS_TO_CACHE = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install event: cache essential assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching assets...");
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.error("[Service Worker] Installation failed while caching required assets:", error);
        return caches.delete(CACHE_NAME).then(() => {
          throw error;
        });
      });
    }),
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith("daily-planner-")) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event: serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Only cache same-origin requests
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        console.log("[Service Worker] Serving from cache:", event.request.url);
        return response;
      }

      // Otherwise, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-200 responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache successful responses for future use
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.error("[Service Worker] Fetch failed:", error);
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          throw error;
        });
    }),
  );
});
