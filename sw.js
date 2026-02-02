const CACHE_NAME = 'dart-coach-v1';
const ASSETS = [
  './index.html',
  './css/base.css',
  './css/layouts.css',
  './css/components.css',
  './css/game.css',
  './js/app.js',
  // Wichtig: Hier müssten theoretisch alle deine JS-Module stehen.
  // Da du ES Modules nutzt, lädt der Browser diese dynamisch nach.
  // Für den Anfang reicht es, die "Hülle" zu cachen.
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // Einfache Strategie: Erst Netzwerk, dann Cache (oder umgekehrt)
  // Hier: Versuche Netzwerk, wenn offline, nimm Cache (Network First)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});