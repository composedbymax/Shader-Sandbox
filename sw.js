const CACHE_VERSION = "v30";
const CACHE_NAME = `glsl-app-${CACHE_VERSION}`;
const ASSETS = [
    "/glsl/index.php",
    "/glsl/scripts/audio.js",
    "/glsl/scripts/utils/autosave.js",
    "/glsl/scripts/banner.js",
    "/glsl/scripts/color.js",
    "/glsl/scripts/utils/cover.js",
    "/glsl/scripts/export.js",
    "/glsl/scripts/utils/find.js",
    "/glsl/scripts/flowchart.js",
    "/glsl/scripts/format.js",
    "/glsl/scripts/gpu.js",
    "/glsl/scripts/utils/hidev.js",
    "/glsl/scripts/info.js",
    "/glsl/scripts/js.js",
    "/glsl/scripts/image.js",
    "/glsl/scripts/link.js",
    "/glsl/scripts/utils/main.js",
    "/glsl/scripts/utils/p2p.js",
    "/glsl/scripts/parse.js",
    "/glsl/scripts/performance.js",
    "/glsl/scripts/player.js",
    "/glsl/scripts/recorder.js",
    "/glsl/scripts/render.js",
    "/glsl/scripts/right.js",
    "/glsl/scripts/save.js",
    "/glsl/scripts/search.js",
    "/glsl/scripts/show.js",
    "/glsl/scripts/shuffle.js",
    "/glsl/scripts/stay.js",
    "/glsl/scripts/theme.js",
    "/glsl/scripts/video.js",
    "/glsl/css/root.css",
    "/glsl/css/style.css",
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
            fetch(event.request, {
                cache: 'no-cache'
            })
            .then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
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