const CACHE_VERSION = "v39";
const CACHE_NAME = `glsl-app-${CACHE_VERSION}`;
const ASSETS = [
    "/shader/index.php",
    "/shader/scripts/3d.js",
    "/shader/scripts/audio.js",
    "/shader/scripts/banner.js",
    "/shader/scripts/camera.js",
    "/shader/scripts/color.js",
    "/shader/scripts/drop.js",
    "/shader/scripts/export.js",
    "/shader/scripts/flowchart.js",
    "/shader/scripts/format.js",
    "/shader/scripts/gpu.js",
    "/shader/scripts/info.js",
    "/shader/scripts/js.js",
    "/shader/scripts/keyboard.js",
    "/shader/scripts/link.js",
    "/shader/scripts/media.js",
    "/shader/scripts/offlinesave.js",
    "/shader/scripts/onboarding.js",
    "/shader/scripts/parse.js",
    "/shader/scripts/performance.js",
    "/shader/scripts/player.js",
    "/shader/scripts/recorder.js",
    "/shader/scripts/render.js",
    "/shader/scripts/right.js",
    "/shader/scripts/save.js",
    "/shader/scripts/search.js",
    "/shader/scripts/sequencer.js",
    "/shader/scripts/show.js",
    "/shader/scripts/shuffle.js",
    "/shader/scripts/stay.js",
    "/shader/scripts/theme.js",
    "/shader/scripts/utils/api.js",
    "/shader/scripts/utils/autosave.js",
    "/shader/scripts/utils/cover.js",
    "/shader/scripts/utils/find.js",
    "/shader/scripts/utils/hidev.js",
    "/shader/scripts/utils/main.js",
    "/shader/scripts/utils/p2p.js",
    "/shader/css/root.css",
    "/shader/css/style.css",
];
self.addEventListener("install", (event) => {
    console.log(`${CACHE_VERSION} installing...`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`New Version: ${CACHE_VERSION}`);
                const cacheBustedAssets = ASSETS.map(asset => 
                    `${asset}?sw-cache-bust=${CACHE_VERSION}-${Date.now()}`
                );
                return cache.addAll(cacheBustedAssets);
            })
            .then(() => {
                console.log(`${CACHE_VERSION} installed`);
                return self.skipWaiting();
            })
    );
});
self.addEventListener("activate", (event) => {
    console.log(`${CACHE_VERSION} activating...`);
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(`Delete Version: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ]).then(() => {
            console.log(`Current Version: ${CACHE_VERSION}`);
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
    );
});
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }
    const url = new URL(event.request.url);
    if (url.pathname.endsWith("favicon.ico")) {
        return;
    }
    if (ASSETS.some(asset => url.pathname === asset)) {
        event.respondWith(
            fetch(`${event.request.url}?sw-fresh=${CACHE_VERSION}-${Date.now()}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            })
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    console.log(`Fresh fetch: ${url.pathname}`);
                    return networkResponse;
                }
                throw new Error('Network response not ok');
            })
            .catch(() => {
                console.log(`Fallback to cache: ${url.pathname}`);
                return caches.match(event.request);
            })
        );
    } else {
        event.respondWith(
            fetch(event.request, { cache: 'no-cache' })
            .then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request))
        );
    }
});
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'FORCE_RELOAD') {
        caches.keys().then(cacheNames => {
            return Promise.all(cacheNames.map(name => caches.delete(name)));
        }).then(() => {
            self.clients.matchAll().then(clients => {
                clients.forEach(client => client.navigate(client.url));
            });
        });
    }
});