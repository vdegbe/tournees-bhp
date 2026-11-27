// Hors ligne : la page et ses fichiers sont mémorisés ; les tuiles de carte déjà vues aussi (400 au plus).
const V="tournees-62ab00c8",TILES="tiles";
const SHELL=["./","index.html","manifest.webmanifest","icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function trim(c){const ks=await c.keys();for(let i=0;i<ks.length-400;i++)await c.delete(ks[i])}
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
  if(u.hostname==="tile.openstreetmap.org"){
    e.respondWith(caches.open(TILES).then(async c=>{const hit=await c.match(r);if(hit)return hit;
      try{const n=await fetch(r);if(n.ok||n.type==="opaque"){c.put(r,n.clone());trim(c)}return n}catch(x){return Response.error()}}));return}
  if(u.origin===location.origin)
    e.respondWith(fetch(r).then(n=>{const cp=n.clone();caches.open(V).then(c=>c.put(r,cp));return n}).catch(()=>caches.match(r).then(h=>h||caches.match("index.html"))))});
