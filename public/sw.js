// pipo service worker — hand-written, no build step.
// Notebook and Review stay readable offline: their pages are cached network-first, and the
// build's static assets cache-first. Everything else goes to the network and falls back to
// /offline. Bump VERSION to drop old caches after changing this file.
const VERSION = "v1";
const STATIC_CACHE = `pipo-static-${VERSION}`;
// Must match PAGE_CACHE in lib/pwa/constants.ts (cleared on the login page)
const PAGE_CACHE = "pipo-pages";
const OFFLINE_URL = "/offline";
const OFFLINE_PAGES = ["/notebook", "/review"];

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
    const cacheable = OFFLINE_PAGES.some(
      (page) => url.pathname === page || url.pathname.startsWith(`${page}/`),
    );
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
