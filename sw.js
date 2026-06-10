/* ════════════════════════════════════════════════════════════
   Radio Antomatee — Service Worker
   Strategia: stale-while-revalidate dla plików aplikacji
   (same-origin). Streamy audio i Radio Browser API NIE są
   cache'owane — zawsze lecą prosto do sieci.
════════════════════════════════════════════════════════════ */

var CACHE_NAME = "antomatee-v1";

var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/globe.js",
  "./js/worlddata.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;

  // Tylko GET
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Tylko same-origin — streamy radiowe, API Radio Browser, fonty
  // Google i hls.js z CDN idą zawsze prosto do sieci.
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate: oddaj z cache od razu, w tle odśwież.
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req).then(function (cached) {
        var network = fetch(req).then(function (resp) {
          if (resp && resp.ok && resp.type === "basic") {
            cache.put(req, resp.clone());
          }
          return resp;
        }).catch(function () { return cached; });
        return cached || network;
      });
    })
  );
});
