
const CACHE = 'aquaplane-pwa-v1';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.webmanifest',
  './icon.png'
];

// Instalar y guardar archivos
self.addEventListener('install', event => {

  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS);
    })
  );

});

// Activar y limpiar versiones antiguas
self.addEventListener('activate', event => {

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      );

    })
  );

});

// Servir archivos desde caché
self.addEventListener('fetch', event => {

  event.respondWith(
    caches.match(event.request).then(response => {

      return response || fetch(event.request);

    })
  );

});
