var SHELL_CACHE = "suite-hub-shell-v1";
var SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./registry.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SHELL_CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // Same-origin shell: cache-first, refresh in background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(SHELL_CACHE).then(function (cache) { cache.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || network;
      })
    );
  }
  // Cross-origin (NPC manifest, faces): network-first, no caching.
});
