// ============================================================
// ThesisForge Service Worker — thesisforge-v1
// ============================================================
// Offline caching, background sync, push notifications,
// and version-based cache busting for the ThesisForge PWA.
// ============================================================

const CACHE_VERSION = "thesisforge-v1";

// Cache names split by strategy for clarity
const CACHE_NAMES = {
  appShell: `${CACHE_VERSION}-app-shell`,
  drafts: `${CACHE_VERSION}-drafts`,
  dynamic: `${CACHE_VERSION}-dynamic`,
};

// App shell resources to pre-cache on install
const APP_SHELL_URLS = ["/", "/manifest.webmanifest"];

// File extensions that belong in the app shell cache (Cache First)
const APP_SHELL_EXTENSIONS = [
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".jsx",
  ".tsx",
  ".ts",
  ".svg",
  ".png",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".webp",
  ".avif",
  ".webmanifest",
];

// ============================================================
// Install — pre-cache critical app shell resources
// ============================================================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAMES.appShell)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// Activate — clean up old caches, claim all clients immediately
// ============================================================
self.addEventListener("activate", (event) => {
  const currentCacheNames = new Set(Object.values(CACHE_NAMES));

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !currentCacheNames.has(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ============================================================
// Fetch — route requests by strategy
// ============================================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // --- Only handle same-origin GET requests ---
  if (request.method !== "GET" || url.origin !== location.origin) {
    return;
  }

  const path = url.pathname.toLowerCase();
  const ext = path.substring(path.lastIndexOf("."));

  if (APP_SHELL_EXTENSIONS.includes(ext) || path === "/") {
    // App shell: Cache First, fall back to network
    event.respondWith(cacheFirst(request, CACHE_NAMES.appShell));
  } else {
    // Dynamic / API-like: Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.dynamic));
  }
});

// ============================================================
// Strategy: Cache First
// ============================================================
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback — return the cached index page for navigation requests
    if (request.mode === "navigate") {
      const cached = await caches.match("/");
      if (cached) return cached;
    }
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

// ============================================================
// Strategy: Stale-while-revalidate
// ============================================================
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached); // Network failed — return stale if available

  return cached || fetchPromise;
}

// ============================================================
// Message — handle messages from the main thread
// ============================================================
self.addEventListener("message", (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "CACHE_DRAFT_RESUME":
      // Store a minimal signal that a draft exists so we can show a
      // "resume" indicator even when offline.
      cacheDraftResumeSignal(payload);
      break;

    case "SCHEDULE_REMINDER":
      // Schedule a notification after a delay (best-effort; won't survive SW restart)
      scheduleReminder(payload?.minutes || 30);
      break;

    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    default:
      break;
  }
});

// ============================================================
// Cache draft resume signal
// ============================================================
async function cacheDraftResumeSignal(payload) {
  try {
    const cache = await caches.open(CACHE_NAMES.drafts);
    // Store a tiny JSON blob as the resume signal
    const signal = new Response(
      JSON.stringify({
        hasDraft: true,
        templateType: payload?.templateType || null,
        savedAt: payload?.savedAt || Date.now(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    await cache.put("/__thesisforge_draft_resume__", signal);
  } catch (err) {
    console.warn("[ThesisForge SW] Failed to cache draft resume signal:", err);
  }
}

// ============================================================
// Schedule reminder notification
// ============================================================
function scheduleReminder(minutes) {
  const ms = Math.max(0, (minutes || 30) * 60 * 1000);
  setTimeout(() => {
    self.registration.showNotification("Time to write!", {
      body: "Your thesis awaits — tap to continue where you left off.",
      icon: "/favicon-192.png",
      badge: "/favicon-192.png",
      tag: "thesisforge-reminder",
      renotify: true,
      vibrate: [200, 100, 200],
    });
  }, ms);
}

// ============================================================
// Background Sync — retry saves when connectivity returns
// ============================================================
self.addEventListener("sync", (event) => {
  if (event.tag === "thesisforge-save") {
    event.waitUntil(handleSaveSync());
  }
});

async function handleSaveSync() {
  // Notify all clients that a sync event fired so they can retry any pending saves.
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_SAVE_TRIGGERED" });
  });
}

// ============================================================
// Push Notifications
// ============================================================
self.addEventListener("push", (event) => {
  let data = { title: "Time to write!", body: "Your thesis awaits — tap to continue where you left off." };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      // If push payload is plain text, use it as the body
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon-192.png",
      badge: "/favicon-192.png",
      tag: "thesisforge-push",
      renotify: true,
      vibrate: [200, 100, 200],
      data: {
        url: data.url || "/",
      },
    })
  );
});

// ============================================================
// Notification Click — open or focus the app
// ============================================================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // If the app is already open, focus it
      for (const client of clients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
