import {normalizeKeihanReference,sourceTime} from './keihan-reference.mjs';
// Not an HTTP server. Not imported by the PWA. Connection stays disabled by default.
export const DISABLED_CONFIGURATION=Object.freeze({enabled:false});
const unavailable=reason=>({kind:'keihan-reference',state:'unavailable',reason,references:[],candidateFeed:null});
export function configurationErrors(config={}){
  if(config.enabled!==true)return ['disabled'];
  const a=config.authorization,l=config.limits,errors=[];
  if(!a?.evidence||typeof a.evidence!=='string'||!Number.isFinite(Date.parse(a.reviewedAt)))errors.push('permission-evidence-required');
  for(const scope of ['automatedAccess','commercialWork','redistribution','normalization','caching'])if(a?.scopes?.[scope]!==true)errors.push('permission-scope-'+scope);
  if(!l||!Number.isSafeInteger(l.minIntervalMs)||l.minIntervalMs<60000||!Number.isSafeInteger(l.maxLiveAgeMs)||l.maxLiveAgeMs<=0||!Number.isSafeInteger(l.maxTimetableAgeMs)||l.maxTimetableAgeMs<=0||!Number.isSafeInteger(l.maxPayloadBytes)||l.maxPayloadBytes<1||l.maxPayloadBytes>2*1024*1024)errors.push('reviewed-limits-required');
  try{const origin=new URL(config.approvedOrigin);if(origin.protocol!=='https:'||origin.origin!==config.approvedOrigin)throw Error();
    for(const key of ['live','timetable']){const u=new URL(config.endpoints?.[key]);if(u.origin!==origin.origin||u.username||u.password||u.search||u.hash)throw Error();}
  }catch{errors.push('approved-endpoints-required');}
  if(config.serviceDateContractVerified!==true)errors.push('service-date-contract-required');
  return errors;
}
async function boundedJSON(fetcher,url,maxBytes){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetcher(url,{signal:controller.signal,cache:'no-store',redirect:'error',headers:{Accept:'application/json'}});
    if(!response.ok||response.redirected||!/^application\/(?:json|[\w.-]+\+json)(?:;|$)/i.test(response.headers.get('content-type')??''))throw Error('response rejected');
    const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))throw Error('size rejected');
    const reader=response.body?.getReader();if(!reader)throw Error('body missing');
    const chunks=[];let size=0;
    try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('size rejected');chunks.push(value);}}
    catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  }finally{clearTimeout(timer);}
}
export function createKeihanReferenceProvider({config=DISABLED_CONFIGURATION,fetcher=globalThis.fetch,now=Date.now,resolveServiceDates}={}){
  // Snapshot server-owned config. A request/query/browser must never supply this configuration.
  const settings=structuredClone(config),errors=configurationErrors(settings);
  let pending=null,lastAttempt=-Infinity,lastResult=null,cached=null,latestObservation=-Infinity;
  return {refresh(){
    if(errors.length||typeof resolveServiceDates!=='function')return Promise.resolve(unavailable(errors[0]??'service-date-resolver-required'));
    if(pending)return pending;
    if(now()-lastAttempt<settings.limits.minIntervalMs){
      // Re-evaluate source freshness; retrieval time never renews an observation.
      return Promise.resolve(cached?normalizeKeihanReference({...cached,limits:settings.limits,now:now()}):lastResult??unavailable('rate-limited'));
    }
    lastAttempt=now();
    pending=(async()=>{
      try{
        const [live,timetable]=await Promise.all([
          boundedJSON(fetcher,settings.endpoints.live,settings.limits.maxPayloadBytes),
          boundedJSON(fetcher,settings.endpoints.timetable,settings.limits.maxPayloadBytes).catch(()=>null)
        ]);
        // No previous timetable is reused following failure. No timer/polling/retry is installed.
        const context=await resolveServiceDates({live,timetable});
        const observation=sourceTime(live?.fileCreatedTime);
        if(observation!==null&&observation<latestObservation){cached=null;lastResult={...unavailable('source-observation-regressed'),state:'stale'};}
        else{
          cached={live,timetable,context};lastResult=normalizeKeihanReference({...cached,limits:settings.limits,now:now()});
          if(lastResult.state==='reference-only')latestObservation=Math.max(latestObservation,observation);
        }
      }catch{cached=null;lastResult={...unavailable('upstream-unavailable'),state:'error'};}
      return lastResult;
    })().finally(()=>{pending=null;});return pending;
  }};
}
