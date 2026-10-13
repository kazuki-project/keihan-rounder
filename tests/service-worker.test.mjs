import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
async function worker({offline=false}={}) {
 const events={},calls={requests:[],fetch:[],writes:[]},cached={from:'offline-shell'};
 const cache={addAll:async reqs=>{calls.requests=reqs;},put:async(...args)=>calls.writes.push(args)};
 const response={ok:true,type:'basic',clone(){return this;}};
 vm.runInNewContext(await readFile('public/sw.js','utf8'),{self:{registration:{scope:'https://example.test/keihan-rounder/'},addEventListener:(name,fn)=>events[name]=fn},location:{origin:'https://example.test'},URL,Request:class{constructor(url,options){this.url=url;this.cache=options.cache;}},caches:{open:async()=>cache,match:async()=>cached,keys:async()=>[]},fetch:async(request,options)=>{calls.fetch.push({request,options});if(offline)throw Error('offline');return response;}});
 return {events,calls,cached,response};
}
test('new SW install reloads static assets and online fetch revalidates HTTP cache',async()=>{
 const w=await worker();let installed;w.events.install({waitUntil:p=>installed=p});await installed;
 assert.ok(w.calls.requests.length>10);assert.ok(w.calls.requests.every(r=>r.cache==='reload'));
 let served;const writes=[];w.events.fetch({request:{method:'GET',url:'https://example.test/keihan-rounder/index.html'},respondWith:p=>served=p,waitUntil:p=>writes.push(p)});assert.equal(await served,w.response);await Promise.all(writes);assert.equal(w.calls.fetch[0].options.cache,'no-cache');assert.equal(w.calls.writes.length,1);
});
test('API and off-origin requests are never intercepted or cached',async()=>{
 const w=await worker();for(const url of ['https://example.test/api/trains','https://example.test/keihan-rounder/api/trains','https://provider.test/live']){let intercepted=false;w.events.fetch({request:{method:'GET',url},respondWith:()=>intercepted=true});assert.equal(intercepted,false);}assert.equal(w.calls.fetch.length,0);assert.equal(w.calls.writes.length,0);
});
test('offline shell request falls back to its saved shell only',async()=>{const w=await worker({offline:true});let served;w.events.fetch({request:{method:'GET',url:'https://example.test/keihan-rounder/index.html'},respondWith:p=>served=p,waitUntil:()=>{}});assert.equal(await served,w.cached);assert.equal(w.calls.writes.length,0);});
