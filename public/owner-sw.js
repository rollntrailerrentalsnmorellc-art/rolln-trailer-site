const CACHE='rolln-owner-static-v1';
const ASSETS=['/images/RTRlogo.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/images/')||url.pathname.startsWith('/_next/static/')){
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response})));
 }
});
self.addEventListener('push',event=>{
 const data=event.data?event.data.json():{};
 event.waitUntil(self.registration.showNotification(data.title||"Roll'N Owner App",{body:data.body||'An important rental update is available.',icon:'/images/RTRlogo.png',badge:'/images/RTRlogo.png',tag:data.tag||'rolln-update',data:{url:data.url||'/owner'},vibrate:[180,80,180]}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/owner',self.location.origin).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
  for(const client of clients){if('focus' in client){client.navigate(target);return client.focus()}}
  return self.clients.openWindow(target);
 }));
});
