/*
 * MagicTD Defense service worker.
 *
 * The whole game is one self-contained HTML file, so the install just needs the
 * shell plus the icons. Navigations go network-first (so a new deploy is picked
 * up immediately) and fall back to the cached shell when offline.
 *
 * The external sound bank (`sfx/**`, ~1.3 MB of CC0 samples) is cached on first
 * play by the normal fetch branch below; the sample engine preloads the bank as
 * soon as audio unlocks, so a player who has heard the game once has it offline.
 * Bump CACHE when the sample files change, otherwise installed PWAs keep the
 * old clips (the filenames are stable).
 */
const CACHE = "magictd-v4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
            }
            return res;
          })
          .catch(() => hit)
    )
  );
});
