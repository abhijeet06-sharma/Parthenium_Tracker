const CACHE_NAME = 'bioguard-v7';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/report.html',
    '/admin.html',
    '/login.html',
    '/js/index.js',
    '/js/dashboard.js',
    '/js/report.js',
    '/js/admin.js',
    '/js/auth.js',
    '/images/parthenium.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
