// pipo service worker — hand-written, no build step.
// Notebook, Review, Pomodoro and the dictation pages of lessons already opened stay usable
// offline: their pages are cached network-first, and the build's static assets cache-first.
// Everything else goes to the network and falls back to /offline. Bump VERSION to drop old
// caches after changing this file.
const VERSION = "v3";
const STATIC_CACHE = `pipo-static-${VERSION}`;
// Must match PAGE_CACHE in lib/pwa/constants.ts (cleared on the login page)
const PAGE_CACHE = "pipo-pages";
const OFFLINE_URL = "/offline";
const OFFLINE_PAGES = ["/notebook", "/review", "/pomodoro"];
// Dictation is graded on the device (diff + speech synthesis), so a lesson opened once works offline
const OFFLINE_PATTERNS = [/^\/lessons\/[0-9a-f-]{36}\/dictation$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pipo-static-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Supabase, fonts and other origins are never cached here
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    const cacheable =
      OFFLINE_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(`${page}/`)) ||
      OFFLINE_PATTERNS.some((pattern) => pattern.test(url.pathname));
    event.respondWith(cacheable ? networkFirstPage(request) : networkOrOffline(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Hashed file names never change content, so they are safe to keep forever
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    // A redirect means signed out (→ /login); never store that as the page
    if (response.ok && !response.redirected) {
      (await caches.open(PAGE_CACHE)).put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request, { cacheName: PAGE_CACHE })) ?? offlinePage();
  }
}

async function networkOrOffline(request) {
  try {
    return await fetch(request);
  } catch {
    return offlinePage();
  }
}

async function offlinePage() {
  return (await caches.match(OFFLINE_URL)) ?? new Response("Offline", { status: 503 });
}

// Tapping a timer notification brings the app back (or opens it) on the page it points to
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) return open.navigate(target).then((client) => (client ?? open).focus());
      return self.clients.openWindow(target);
    }),
  );
});
