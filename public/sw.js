const CACHE='keihan-shell-v5';
const ASSETS=['./','./index.html','./styles.css','./src/app.mjs','./src/stations.mjs','./src/storage.mjs','./src/engine.mjs','./src/adapter.mjs','./src/feed-guard.mjs','./src/time-display.mjs','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./data-policy.html'];
const urls=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('keihan-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Allowlist only static shell assets. API responses and remote data never enter CacheStorage.
 if(request.method!=='GET'||url.origin!==location.origin||!urls.has(url.href))return;
 event.respondWith(fetch(request,{cache:'no-cache'}).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copy)));}return response;}).catch(()=>caches.match(request)));
});
