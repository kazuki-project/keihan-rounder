// Isolated, local-only synthetic integration harness. Never copied into dist/.
import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=path.resolve('dist'),baseNow=Date.parse('2026-10-13T12:00:00+09:00');let scenario='cancelled',now=baseNow;
const stop=(id,time)=>({stationId:id,pickup:true,dropoff:true,boardingStatus:'scheduled',scheduledArrival:time,scheduledDeparture:time});
function fixture(){
 const date=scenario==='next-day'?'2026-10-14':'2026-10-13';
 const version={cancelled:2,rollback:1,conflict:2,fresh:3,'invalid-day':4,overnight:5,'next-day':0}[scenario];
 const observed=scenario==='rollback'?baseNow-120000:now;
 const stops=scenario==='overnight'?[stop('KH21','2026-10-13T23:58:00+09:00'),stop('KH24','2026-10-14T00:15:00+09:00')]:[stop('KH21',`${date}T12:05:00+09:00`),stop('KH24',`${scenario==='invalid-day'?'2026-10-14':date}T12:15:00+09:00`)];
 return {schemaVersion:1,serviceDate:date,version,mode:'realtime',source:{id:'qa-local',name:'SYNTHETIC TEST ONLY — 乗車判断禁止',url:'https://example.test',license:'synthetic fixture, local QA only',redistributionApproved:true},observedAt:new Date(observed).toISOString(),fetchedAt:new Date(now).toISOString(),expiresAt:new Date(now+300000).toISOString(),maxAgeSeconds:300,validFrom:'2026-08-24',validThrough:'2026-12-31',trips:[{id:`qa-${date}`,type:'普通',destination:'KH24',status:scenario==='cancelled'?'cancelled':'scheduled',ticketPolicy:'standard',serviceDates:[date],stops}]};
}
const labels={cancelled:'運休・版2',rollback:'古い運行・版1',conflict:'同版の矛盾',fresh:'正常な新版3','invalid-day':'範囲外の到着',overnight:'正しい日跨ぎ','next-day':'翌営業日・版0'};
const banner=`<aside style="padding:14px;background:#ffdfad;color:#231500"><strong>合成データ専用・ローカルQA。実際の列車ではありません。</strong><div>${Object.entries(labels).map(([key,label])=>`<button data-scenario="${key}">${label}</button>`).join('')}</div></aside><script>let qaNow=${baseNow};Date.now=()=>qaNow;for(const button of document.querySelectorAll('[data-scenario]'))button.onclick=async()=>{const r=await fetch('/qa/scenario',{method:'POST',body:button.dataset.scenario});qaNow=(await r.json()).now;document.getElementById('refresh').click();};</script>`;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/qa/scenario'&&req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;if(!Object.hasOwn(labels,body)){res.writeHead(400).end();return;}scenario=body;now=body==='overnight'?Date.parse('2026-10-13T23:50:00+09:00'):body==='next-day'?baseNow+86400000:baseNow;res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({now}));return;}
  if(pathname==='/api/trains'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(fixture()));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  let content=await readFile(file);
  if(pathname==='/src/adapter.mjs')content=Buffer.from(content.toString().replace('endpoint:null,minRefreshMs:60000',"endpoint:'/api/trains',minRefreshMs:0"));
  if(pathname==='/'||pathname==='/index.html')content=Buffer.from(content.toString().replace('<body>',`<body>${banner.replace(`let qaNow=${baseNow};`,`let qaNow=${now};`)}`));
  res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(content);
 }catch{res.writeHead(404).end('Not found');}
});server.listen(4174,'127.0.0.1',()=>console.log('SYNTHETIC ONLY QA: http://127.0.0.1:4174'));
