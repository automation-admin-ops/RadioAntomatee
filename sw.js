/* ════════════════════════════════════════════════════════════
   Radio Antomatee - Service Worker
   Strategia: stale-while-revalidate dla plików aplikacji
   (same-origin) + cache fontów Google (cross-origin, opaque).
   Streamy audio, Radio Browser API i /api/ (presence) NIE są
   cache'owane - zawsze lecą prosto do sieci.
════════════════════════════════════════════════════════════ */

var CACHE_NAME = "antomatee-v19";
var FONT_CACHE = "antomatee-fonts-v1";

var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/presence.js",
  "./js/chat.js",
  "./js/globe.js",
  "./js/rain.js",
  "./js/worlddata.js",
  "./js/vendor/hls.min.js",
  "./js/vendor/firebase-app-compat.js",
  "./js/vendor/firebase-auth-compat.js",
  "./js/vendor/firebase-database-compat.js",
  "./js/firebase-init.js",
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
        keys.filter(function (k) { return k !== CACHE_NAME && k !== FONT_CACHE; })
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

  // Fonty Google - cache-first (opaque OK); bez nich offline'owy
  // start PWA wyglądał na zepsuty (FOIT / brak glifów)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(function (cache) {
        return cache.match(req).then(function (cached) {
          if (cached) return cached;
          return fetch(req).then(function (resp) {
            if (resp && (resp.ok || resp.type === "opaque")) cache.put(req, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  // Pozostałe cross-origin (streamy radiowe, Radio Browser API)
  // zawsze prosto do sieci.
  if (url.origin !== self.location.origin) return;

  // /api/ (presence) - dane żywe, Cache-Control: no-store; nie cache'uj.
  if (url.pathname.indexOf("/api/") === 0) return;

  // Stale-while-revalidate: oddaj z cache od razu, w tle odśwież.
  // ignoreSearch przy nawigacji - wejście z ?query nie może ominąć
  // cache'a offline (index.html jest zapisany bez query stringa).
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req, { ignoreSearch: req.mode === "navigate" }).then(function (cached) {
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
