// يجعل التطبيق يعمل دون إنترنت: يفتح فورًا من النسخة المحفوظة، ويحدّثها في الخلفية.
// غيّر رقم النسخة عند كل تحديث للملفات.
var CACHE = "bakery-v3";
var CORE = ["./index.html"];
var EXTRA = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

function fresh(u){ return new Request(u, {cache: "reload"}); }

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // الصفحة نفسها إلزامية، وبقية الملفات إن وُجدت (فلا يفشل التثبيت بسبب ملف ناقص)
      return Promise.all(CORE.map(function(u){ return c.add(fresh(u)); })).then(function(){
        return Promise.all(EXTRA.map(function(u){ return c.add(fresh(u)).catch(function(){}); }));
      });
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(function(hit){
      var net = fetch(req).then(function(res){
        if(res && res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        return res;
      });
      if(hit){ e.waitUntil(net.catch(function(){})); return hit; }   // من المحفوظ فورًا، دون انتظار الشبكة
      return net.catch(function(){
        return req.mode === "navigate" ? caches.match("./index.html") : Response.error();
      });
    })
  );
});
