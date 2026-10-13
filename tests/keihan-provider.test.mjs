import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeKeihanReference,delayMinutes,trainDirection,sourceTime,legacyPosition} from '../server/keihan-reference.mjs';
import {createKeihanReferenceProvider,configurationErrors} from '../server/keihan-provider.mjs';
import {validateFeed,findJourneys} from '../src/engine.mjs';
import {readFile,readdir} from 'node:fs/promises';

// Entirely invented schema examples. These are NOT captured train data or actual services.
const day='2026-10-13',at=Date.parse(day+'T12:00:10+09:00');
const limits={minIntervalMs:60000,maxLiveAgeMs:180000,maxTimetableAgeMs:3600000,maxPayloadBytes:10000};
function fixture(){return {
  now:at,limits,
  context:{liveServiceDate:day,timetableServiceDate:day,serviceDateEvidence:'SYNTHETIC TEST CONTRACT ONLY'},
  live:{fileCreatedTime:'20261013120000',locationObjects:[{locationCol:4,locationRow:66,trainDirection:0,trainInfoObjects:[{wdfBlockNo:901,trainTypeJp:'普通',destStationNameJp:'樟葉',delayMinutes:'9分'}]}]},
  timetable:{fileCreatedTime:'20261013113000',TrainInfo:[{wdfBlockNo:901,diaStationInfoObjects:[{stationNumber:'21',stationDepTime:'12:05'},{stationNumber:'22',stationDepTime:'99:99'},{stationNumber:'24',stationDepTime:'12:20'}]}]}
};}
function config(){return {enabled:true,approvedOrigin:'https://synthetic.invalid',endpoints:{live:'https://synthetic.invalid/live.json',timetable:'https://synthetic.invalid/dia.json'},authorization:{evidence:'SYNTHETIC TEST ONLY; NOT A REAL GRANT',reviewedAt:'2026-10-13T00:00:00Z',scopes:{automatedAccess:true,commercialWork:true,redistribution:true,normalization:true,caching:true}},limits,serviceDateContractVerified:true};}
const response=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
const normal=f=>normalizeKeihanReference(f??fixture());
test('reference data never satisfies the boarding feed contract or creates candidates',()=>{
 const r=normal();assert.equal(r.state,'reference-only');assert.equal(r.references.length,1);assert.equal(r.candidateFeed,null);assert.ok(validateFeed(r).length);assert.deepEqual(findJourneys(r,'KH21','KH24',{now:at}),[]);
 const t=r.references[0];assert.equal(t.delayMinutes,9);assert.equal(t.predictedArrival,null);assert.equal(t.predictedDeparture,null);assert.equal(t.cancellationStatus,'unknown');assert.equal(t.ticketPolicy,'unknown');assert.equal(t.scheduleReference[1].pass,true);assert.equal(t.scheduleReference[0].scheduledArrival,undefined);
});
test('missing, negative, malformed and ambiguous delays remain unknown; explicit zero survives',()=>{
 for(const v of [undefined,null,'','遅延','-9','9〜12分','約9分',NaN,-1,1.5,{},true])assert.equal(delayMinutes(v),null);
 for(const [v,n] of [[0,0],['0',0],['+9分',9],['9',9]])assert.equal(delayMinutes(v),n);
 const f=fixture();delete f.live.locationObjects[0].trainInfoObjects[0].delayMinutes;assert.equal(normal(f).references[0].delayMinutes,null);
});
test('only documented direction values normalize; missing and unknown are never down',()=>{
 for(const v of [undefined,null,'',2,'2',-1,true,{}])assert.equal(trainDirection(v),'unknown');
 assert.equal(trainDirection('0'),'up');assert.equal(trainDirection(1),'down');
 const f=fixture();delete f.live.locationObjects[0].trainDirection;assert.ok(normal(f).references[0].issues.includes('direction-unknown'));
});
test('source timestamp requires valid calendar, clock and full explicit JST digits',()=>{
 for(const s of ['20260230120000','20261013240000','20261013126000','20261013120060','202610131200','',null])assert.equal(sourceTime(s),null);
 assert.equal(sourceTime('20261013120000'),at-10000);
});
test('freshness comes from source time, never current retrieval time',()=>{
 const f=fixture();f.now+=180000;assert.equal(normal(f).state,'stale');f.now=at-11000;assert.equal(normal(f).state,'stale');
 f.live.fileCreatedTime='garbage';assert.equal(normal(f).state,'unavailable');
 assert.equal(normal({...fixture(),limits:{}}).state,'unavailable');
});
test('missing/unverified service day cannot establish a trip identity or timetable join',()=>{
 for(const c of [{},{liveServiceDate:day,timetableServiceDate:day},{liveServiceDate:'2026-02-30',serviceDateEvidence:'test'},{liveServiceDate:'2026-10-11',serviceDateEvidence:'test'}]){
 const f=fixture();f.context=c;const t=normal(f).references[0];assert.equal(t.referenceId,null);assert.equal(t.scheduleReference,null);}
});
test('service date is part of ID and never inferred from local weekday or raw block alone',()=>{
 const a=normal().references[0];const f=fixture();f.now+=86400000;f.context.liveServiceDate=f.context.timetableServiceDate='2026-10-14';f.live.fileCreatedTime='20261014120000';f.timetable.fileCreatedTime='20261014113000';
 const b=normal(f).references[0];assert.equal(a.referenceId,'keihan:2026-10-13:901');assert.equal(b.referenceId,'keihan:2026-10-14:901');assert.notEqual(a.referenceId,b.referenceId);
});
test('duplicate numeric and string live block IDs fail closed',()=>{
 const f=fixture();f.live.locationObjects[0].trainInfoObjects.push({wdfBlockNo:'0901'});const r=normal(f);assert.equal(r.state,'unavailable');assert.equal(r.references.length,0);
});
test('duplicate timetable block IDs fail closed instead of map overwrite',()=>{
 const f=fixture();f.timetable.TrainInfo.push({...f.timetable.TrainInfo[0],wdfBlockNo:'0901'});assert.equal(normal(f).reason,'ambiguous-timetable-block-id');
});
test('missing timetable joins retain position reference only and no schedule',()=>{
 const f=fixture();f.timetable.TrainInfo[0].wdfBlockNo=902;const t=normal(f).references[0];assert.equal(t.scheduleReference,null);assert.ok(t.issues.includes('timetable-join-missing'));
});
test('old, future, different service-day or missing timetable is never used for joins',()=>{
 for(const change of [f=>f.timetable=null,f=>f.timetable.fileCreatedTime='20261013100000',f=>f.timetable.fileCreatedTime='20261013120100',f=>f.context.timetableServiceDate='2026-10-12',f=>delete f.timetable.fileCreatedTime]){const f=fixture();change(f);assert.equal(normal(f).references[0].scheduleReference,null);}
});
test('invalid times, missing departure, duplicate station or reverse sequence invalidate join',()=>{
 for(const change of [s=>s[0].stationDepTime='30:00',s=>s[0].stationDepTime='12:60',s=>delete s[0].stationDepTime,s=>s[2].stationDepTime='11:00',s=>s[2].stationNumber='21',s=>s[0].stationNumber='99']){const f=fixture();change(f.timetable.TrainInfo[0].diaStationInfoObjects);const t=normal(f).references[0];assert.equal(t.scheduleReference,null);assert.ok(t.issues.includes('invalid-departure-sequence'));}
});
test('25-hour departures use the attested service day; 30:00 is rejected',()=>{
 const f=fixture();f.timetable.TrainInfo[0].diaStationInfoObjects=[{stationNumber:'21',stationDepTime:'25:05'},{stationNumber:'24',stationDepTime:'25:20'}];assert.equal(normal(f).references[0].scheduleReference[0].scheduledDeparture,'2026-10-13T16:05:00.000Z');
});
test('legacy grid mapping stays explicitly unverified and cannot establish boarding',()=>{
 assert.deepEqual(legacyPosition(1,122).stationIds,['KH51']);assert.deepEqual(legacyPosition(4,122).stationIds,['KH02']);
 assert.equal(legacyPosition(4,66).basis,'legacy-grid-unverified');assert.equal(legacyPosition(4,66).boardingStatus,'unknown');
 for(const [c,r] of [[0,66],[4,132],[4,129],[4,1.5]])assert.equal(legacyPosition(c,r),null);
});
test('type missing stays unknown; no inferred limited express or liner substitution',()=>{
 const f=fixture();delete f.live.locationObjects[0].trainInfoObjects[0].trainTypeJp;assert.equal(normal(f).references[0].serviceType,null);
 f.live.locationObjects[0].trainInfoObjects[0].trainTypeJp='ライナー';assert.equal(normal(f).references[0].serviceType,'ライナー');assert.equal(normal(f).candidateFeed,null);
});
test('default disabled provider makes zero fetches, including repeated refresh',async()=>{
 let count=0;const p=createKeihanReferenceProvider({fetcher:()=>{count++;throw Error();}});for(let i=0;i<3;i++)assert.equal((await p.refresh()).reason,'disabled');assert.equal(count,0);
});
test('permission, limits, approved origins and day-contract gates cannot be omitted',async()=>{
 const changes=[c=>delete c.authorization,c=>delete c.authorization.scopes.redistribution,c=>c.authorization.scopes.commercialWork=false,c=>c.limits={...limits,minIntervalMs:1000},c=>c.limits={...limits,maxPayloadBytes:3e6},c=>c.endpoints.live='http://synthetic.invalid/live',c=>c.endpoints.live='https://other.invalid/live',c=>c.endpoints.live+='?token=synthetic',c=>c.serviceDateContractVerified=false];
 for(const change of changes){const c=config();change(c);let count=0;assert.ok(configurationErrors(c).length);await createKeihanReferenceProvider({config:c,fetcher:()=>count++,resolveServiceDates:()=>fixture().context}).refresh();assert.equal(count,0);}
 assert.deepEqual(configurationErrors(config()),[]);
});
test('service day resolver is mandatory and configuration mutations do not enable provider',async()=>{
 let count=0;const c={enabled:false},p=createKeihanReferenceProvider({config:c,fetcher:()=>count++});c.enabled=true;await p.refresh();await createKeihanReferenceProvider({config:config(),fetcher:()=>count++}).refresh();assert.equal(count,0);
});
test('authorized synthetic transport is single-flight, bounded, no-store and no redirects',async()=>{
 const f=fixture(),calls=[];const p=createKeihanReferenceProvider({config:config(),now:()=>at,resolveServiceDates:()=>f.context,fetcher:async(url,options)=>{calls.push({url,options});return response(url.endsWith('live.json')?f.live:f.timetable);}});
 const a=p.refresh(),b=p.refresh();assert.equal(a,b);assert.equal((await a).references.length,1);await p.refresh();assert.equal(calls.length,2);for(const c of calls){assert.equal(c.options.cache,'no-store');assert.equal(c.options.redirect,'error');assert.ok(c.options.signal);}
});
test('cached sources expire despite refresh within a permitted long minimum interval',async()=>{
 const f=fixture();let clock=at,count=0;const c=config();c.limits={...limits,minIntervalMs:600000};const p=createKeihanReferenceProvider({config:c,now:()=>clock,resolveServiceDates:()=>f.context,fetcher:async u=>{count++;return response(u.endsWith('live.json')?f.live:f.timetable);}});
 await p.refresh();clock+=180000;assert.equal((await p.refresh()).state,'stale');assert.equal(count,2);
});
test('failed timetable fetch never reuses the earlier successful schedule',async()=>{
 const f=fixture();let clock=at,fail=false;const p=createKeihanReferenceProvider({config:config(),now:()=>clock,resolveServiceDates:()=>f.context,fetcher:async u=>{if(fail&&u.endsWith('dia.json'))throw Error('synthetic');return response(u.endsWith('live.json')?f.live:f.timetable);}});
 assert.ok((await p.refresh()).references[0].scheduleReference);clock+=60000;fail=true;const r=await p.refresh();assert.equal(r.references[0].scheduleReference,null);assert.equal(r.candidateFeed,null);
});
test('upstream errors are sanitized and failures are rate-limited without automatic retries',async()=>{
 let count=0;const p=createKeihanReferenceProvider({config:config(),now:()=>at,resolveServiceDates:()=>fixture().context,fetcher:async()=>{count++;throw Error('SECRET_FAKE_QUERY');}});
 const r=await p.refresh();assert.equal(r.state,'error');assert.ok(!JSON.stringify(r).includes('SECRET'));await p.refresh();assert.equal(count,2);
});
test('invalid HTTP, non-JSON, oversized and malformed bodies fail closed',async()=>{
 const factories=[()=>new Response('no',{status:403}),()=>new Response('{}',{headers:{'content-type':'text/html'}}),()=>new Response('{',{headers:{'content-type':'application/json'}}),()=>new Response(' '.repeat(10001),{headers:{'content-type':'application/json'}}),()=>new Response('{}',{headers:{'content-type':'application/json','content-length':'10001'}})];
 for(const factory of factories){const p=createKeihanReferenceProvider({config:config(),now:()=>at,resolveServiceDates:()=>fixture().context,fetcher:async()=>factory()});assert.equal((await p.refresh()).state,'error');}
});
test('production endpoint remains null and static build source does not copy server adapter',async()=>{
 const {CONFIG}=await import('../src/adapter.mjs');assert.equal(CONFIG.endpoint,null);
 const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');assert.ok(!build.includes("cp('server'"));
 for(const f of await readdir(new URL('../server/',import.meta.url))){const s=await readFile(new URL('../server/'+f,import.meta.url),'utf8');assert.ok(!s.includes('www.keihan.co.jp'));assert.ok(!s.includes('setInterval'));}
});
test('malformed context, policy and nested JSON fail safely without throwing',()=>{
 for(const change of [f=>f.context=null,f=>f.limits=null,f=>f.live.locationObjects=[null],f=>f.live.locationObjects[0].trainInfoObjects=[null],f=>f.timetable.TrainInfo=[null]]){const f=fixture();change(f);assert.doesNotThrow(()=>normal(f));assert.equal(normal(f).candidateFeed,null);}
});
test('source regression is rejected after a transport failure without resetting watermark',async()=>{
 const f=fixture();let clock=at,fail=false;const p=createKeihanReferenceProvider({config:config(),now:()=>clock,resolveServiceDates:()=>f.context,fetcher:async u=>{if(fail)throw Error('synthetic');return response(u.endsWith('live.json')?f.live:f.timetable);}});
 assert.equal((await p.refresh()).state,'reference-only');clock+=60000;fail=true;assert.equal((await p.refresh()).state,'error');
 clock+=60000;fail=false;f.live.fileCreatedTime='20261013115959';const r=await p.refresh();assert.equal(r.reason,'source-observation-regressed');assert.equal(r.references.length,0);
});
