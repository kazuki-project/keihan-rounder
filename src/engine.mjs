import {validStation} from './stations.mjs';
export const STATES = Object.freeze({LIVE:'normal',LOADING:'loading',STALE:'stale',ERROR:'error',UNAVAILABLE:'unavailable',TIMETABLE:'timetable'});
const iso = value => typeof value==='string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
export const jstDate = epoch => new Date(epoch+9*3600000).toISOString().slice(0,10);
export function validateFeed(feed) {
  const errors=[];
  if(!feed || feed.schemaVersion!==1) return ['Unsupported schema'];
  if(!['realtime','timetable'].includes(feed.mode)) errors.push('Invalid mode');
  if(!feed.source?.name || !/^https:\/\//.test(feed.source?.url??'') || !feed.source?.license || feed.source?.redistributionApproved!==true) errors.push('Source and redistribution permission required');
  if(!iso(feed.fetchedAt)||!iso(feed.observedAt)||!iso(feed.expiresAt)||Date.parse(feed.expiresAt)<=Date.parse(feed.fetchedAt)||Date.parse(feed.observedAt)>Date.parse(feed.fetchedAt)+60000) errors.push('Invalid freshness');
  if(!Number.isFinite(feed.maxAgeSeconds)||feed.maxAgeSeconds<=0) errors.push('Provider freshness limit required');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(feed.validFrom??'')||!/^\d{4}-\d{2}-\d{2}$/.test(feed.validThrough??'')||feed.validThrough<feed.validFrom) errors.push('Effective date range required');
  if(!Array.isArray(feed.trips)) return [...errors,'Trips required'];
  const ids=new Set();
  for(const t of feed.trips) {
    if(!t.id||ids.has(t.id)) errors.push('Duplicate or missing trip ID'); ids.add(t.id);
    if(!['快速特急','特急','通勤快急','快速急行','急行','通勤準急','準急','区間急行','普通','ライナー'].includes(t.type) || !validStation(t.destination) || !['scheduled','cancelled','changed'].includes(t.status)) errors.push('Invalid trip metadata');
    if(!['standard','reservation-required','unknown'].includes(t.ticketPolicy)) errors.push('Ticket policy required');
    if(!Array.isArray(t.serviceDates)||!t.serviceDates.length||t.serviceDates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d))) errors.push('Explicit service dates required');
    if(!Array.isArray(t.stops)||t.stops.length<2) { errors.push('Ordered stops required'); continue; }
    let previous=-Infinity, previousPredicted=-Infinity; const seen=new Set();
    for(const s of t.stops) {
      const arr=Date.parse(s.scheduledArrival), dep=Date.parse(s.scheduledDeparture);
      if(!validStation(s.stationId)||seen.has(s.stationId)||typeof s.pickup!=='boolean'||typeof s.dropoff!=='boolean'||!iso(s.scheduledArrival)||!iso(s.scheduledDeparture)||arr<previous||dep<arr) errors.push('Invalid ordered stop');
      seen.add(s.stationId); previous=dep;
      for(const field of ['predictedArrival','predictedDeparture']) if(s[field]!==undefined) {
        if(!iso(s[field])||!['official','app'].includes(s.predictionBasis)||s.predictionBasis==='app'&&!s.predictionExplanation) errors.push('Prediction provenance required');
        if(feed.mode==='timetable') errors.push('Predictions are not timetable data');
      }
      const actualArrival=Date.parse(s.predictedArrival??s.scheduledArrival),actualDeparture=Date.parse(s.predictedDeparture??s.scheduledDeparture);
      if(actualArrival<previousPredicted||actualDeparture<actualArrival) errors.push('Inconsistent prediction sequence');
      previousPredicted=actualDeparture;
      if(feed.mode==='realtime'&&!['scheduled','open','departed','unknown'].includes(s.boardingStatus)) errors.push('Realtime boarding status required');
    }
    if(t.stops.at(-1).stationId!==t.destination) errors.push('Destination must match current stop list');
    if(t.delayMinutes!==undefined && (!Number.isFinite(t.delayMinutes)||t.delayMinutes<0 || feed.mode==='timetable')) errors.push('Invalid delay');
    if(t.status==='changed'&&!t.notice) errors.push('Changed trip requires notice');
  }
  return errors;
}
export function feedState(feed,now=Date.now()) {
  if(!feed||validateFeed(feed).length) return STATES.UNAVAILABLE;
  if(Date.parse(feed.fetchedAt)>now+60000||Date.parse(feed.expiresAt)<=now||now-Date.parse(feed.observedAt)>feed.maxAgeSeconds*1000) return STATES.STALE;
  const day=jstDate(now);
  if(day<feed.validFrom||day>feed.validThrough) return STATES.UNAVAILABLE;
  return feed.mode==='realtime'?STATES.LIVE:STATES.TIMETABLE;
}
// Delay is informational only. Never add it to the timetable to invent a prediction.
export function eventTime(stop,kind) {
  const cap=kind==='arrival'?'Arrival':'Departure';
  if(stop[`predicted${cap}`]) return {time:Date.parse(stop[`predicted${cap}`]),basis:stop.predictionBasis,explanation:stop.predictionExplanation??''};
  return {time:Date.parse(stop[`scheduled${cap}`]),basis:'scheduled',explanation:''};
}
function activeTrips(feed,now) {
  const today=jstDate(now), yesterday=jstDate(now-86400000);
  return feed.trips.filter(t=>t.status!=='cancelled' && t.ticketPolicy==='standard' && t.type!=='ライナー' && t.serviceDates.some(d=>{
    if(d!==today&&d!==yesterday)return false;
    const start=Date.parse(`${d}T00:00:00+09:00`),first=Date.parse(t.stops[0].scheduledDeparture);
    // A service date may extend past midnight, but not indefinitely into the next day.
    return first>=start&&first<start+30*3600000;
  }));
}
function leg(trip,from,to,after,now,mode) {
  const a=trip.stops.findIndex(s=>s.stationId===from&&s.pickup), b=trip.stops.findIndex(s=>s.stationId===to&&s.dropoff);
  if(a<0||b<=a) return null;
  const first=trip.stops[a],last=trip.stops[b],departure=eventTime(first,'departure'),arrival=eventTime(last,'arrival');
  if(mode==='realtime'&&['departed','unknown'].includes(first.boardingStatus)) return null;
  if(departure.time<after||arrival.time<departure.time) return null;
  // Past timetable + delay, without a departure prediction, cannot establish boardability.
  if(mode==='realtime'&&departure.basis==='scheduled'&&Date.parse(first.scheduledDeparture)<now) return null;
  return {tripId:trip.id,type:trip.type,destination:trip.destination,from,to,departure,arrival,scheduledDeparture:first.scheduledDeparture,scheduledArrival:last.scheduledArrival,delayMinutes:trip.delayMinutes,platform:first.platform??null,position:trip.position??null,notice:trip.notice??null};
}
export function findJourneys(feed,from,to,{now=Date.now(),boardingMinutes=2,transferMinutes=4,limit=5}={}) {
  const state=feedState(feed,now);
  if(![STATES.LIVE,STATES.TIMETABLE].includes(state)||!validStation(from)||!validStation(to)||from===to) return [];
  const trips=activeTrips(feed,now),results=[],after=now+Math.max(0,boardingMinutes)*60000;
  for(const t of trips) {
    const direct=leg(t,from,to,after,now,feed.mode);
    if(direct) results.push({legs:[direct],departure:direct.departure,arrival:direct.arrival,transfers:0});
    const start=t.stops.findIndex(s=>s.stationId===from&&s.pickup);
    if(start<0) continue;
    for(const mid of t.stops.slice(start+1).filter(s=>s.dropoff&&s.stationId!==to)) {
      const first=leg(t,from,mid.stationId,after,now,feed.mode);
      if(!first) continue;
      for(const next of trips) {
        if(next.id===t.id) continue;
        const second=leg(next,mid.stationId,to,first.arrival.time+Math.max(4,transferMinutes)*60000,now,feed.mode);
        if(second&&second.departure.time-first.arrival.time<=60*60000) results.push({legs:[first,second],departure:first.departure,arrival:second.arrival,transfers:1});
      }
    }
  }
  const unique=new Map(results.map(j=>[j.legs.map(l=>`${l.tripId}:${l.from}:${l.to}`).join('/'),j]));
  return [...unique.values()].sort((a,b)=>a.arrival.time-b.arrival.time||a.transfers-b.transfers||a.departure.time-b.departure.time).slice(0,limit);
}
