// Capsula: replacement worker for the OLD address (S3.4b).
//
// The app used to run at roshetta-app.github.io/capsula/ and installed copies there still hold a
// worker and saved files from the old build. The browser checks this exact file (/capsula/sw.js)
// for a new version, finds this one, and this one does a single job: remove the old saved files,
// reload any open old tab (it then lands on forwarder/index.html or 404.html and moves to the new
// address), and unregister itself. It has no fetch handler, so it never answers a page request.
// A window cannot be sent to another website from a worker, which is why the reload is used.
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch { /* a refused step must not stop the clean-up */ }
    try { await self.clients.claim(); } catch { /* a refused step must not stop the clean-up */ }
    var windows = [];
    try { windows = await self.clients.matchAll({ type: 'window' }); } catch { /* a refused step must not stop the clean-up */ }
    try { await self.registration.unregister(); } catch { /* a refused step must not stop the clean-up */ }
    windows.forEach(function (c) { try { c.navigate(c.url); } catch { /* a refused step must not stop the clean-up */ } });
  })());
});
