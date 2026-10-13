// Server-only preparation adapter. No endpoint, credentials, or captured railway data.
// Schema knowledge comes from the user's earlier TrainHUD provider; all tests are synthetic.
import {validStation} from '../src/stations.mjs';
const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const inDay=(time,day)=>dateOK(day)&&time>=Date.parse(day+'T00:00:00+09:00')&&time<Date.parse(day+'T00:00:00+09:00')+30*3600000;
export function sourceTime(value){
  if(typeof value!=='string'||!/^\d{14}$/.test(value))return null;
  const day=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
  if(!dateOK(day)||+value.slice(8,10)>23||+value.slice(10,12)>59||+value.slice(12)>59)return null;
  return Date.parse(`${day}T${value.slice(8,10)}:${value.slice(10,12)}:${value.slice(12)}+09:00`);
}
export function delayMinutes(value){
  if(Number.isSafeInteger(value)&&value>=0)return value;
  if(typeof value!=='string'||!/^\+?\d+(?:分)?$/.test(value))return null;
  const n=Number(value.replace(/^\+/,'').replace(/分$/,''));return Number.isSafeInteger(n)?n:null;
}
export function trainDirection(value){return value===0||value==='0'?'up':value===1||value==='1'?'down':'unknown';}
const blockId=v=>(typeof v==='number'||typeof v==='string')&&/^\d+$/.test(String(v))&&Number.isSafeInteger(Number(v))&&Number(v)>0?String(Number(v)):null;
const stationId=v=>{const s=String(v??'');if(!/^\d{2}(?:\d{1,2})?$/.test(s))return null;const id='KH'+s.slice(0,2);return validStation(id)?id:null;};
const text=v=>typeof v==='string'&&v.trim()&&v.length<=100?v.trim():null;
export function legacyPosition(col,row){
  // Legacy UI grid interpretation, NOT a verified station/boarding observation.
  if(!Number.isInteger(col)||!Number.isInteger(row)||col<1||col>5||row<1||row>131)return null;
  let a,b=null;
  if(row<=117){a=42-Math.floor((row-1)/3);const p=(row-1)%3;if(!(p===0||p===1&&[42,21,4].includes(a)))b=a-1;}
  else if(row<=120)a=3;
  else if(col===1||col===2)a=row<=123?51:row<=126?52:row<=129?53:54;
  else if(row<=123)a=2;else if(row<=126)a=1;else return null;
  const code=n=>'KH'+String(n).padStart(2,'0');
  return {stationIds:b===null?[code(a)]:[code(a),code(b)],basis:'legacy-grid-unverified',boardingStatus:'unknown'};
}
function schedule(dia,day){
  if(!Array.isArray(dia?.diaStationInfoObjects)||dia.diaStationInfoObjects.length<2)return null;
  const result=[],seen=new Set();let previous=-Infinity;
  for(const raw of dia.diaStationInfoObjects){
    if(!raw||typeof raw!=='object')return null;
    const id=stationId(raw.stationNumber),t=raw.stationDepTime;
    if(!id||seen.has(id))return null;seen.add(id);
    if(t==='99:99'){result.push({stationId:id,pass:true,scheduledDeparture:null});continue;}
    if(typeof t!=='string'||!/^(?:[01]\d|2\d):[0-5]\d$/.test(t))return null;
    const time=Date.parse(day+'T00:00:00+09:00')+(+t.slice(0,2)*60 + +t.slice(3))*60000;
    if(!inDay(time,day)||time<previous)return null;previous=time;
    result.push({stationId:id,pass:false,scheduledDeparture:new Date(time).toISOString()});
  }
  return result;
}
const empty=(state,reason,observedAt=null)=>({kind:'keihan-reference',state,reason,observedAt,references:[],candidateFeed:null,candidateBlockers:['complete-current-trip-contract-required']});
export function normalizeKeihanReference({live,timetable=null,context={},limits={},now=Date.now()}={}){
  context=context&&typeof context==='object'?context:{};limits=limits&&typeof limits==='object'?limits:{};
  if(!Number.isFinite(now)||!Number.isFinite(limits.maxLiveAgeMs)||limits.maxLiveAgeMs<=0||!Number.isFinite(limits.maxTimetableAgeMs)||limits.maxTimetableAgeMs<=0)return empty('unavailable','freshness-policy-missing');
  const observed=sourceTime(live?.fileCreatedTime),observedAt=observed===null?null:new Date(observed).toISOString();
  if(observed===null||!Array.isArray(live?.locationObjects))return empty('unavailable','invalid-live-schema');
  if(observed>now||now-observed>limits.maxLiveAgeMs)return empty('stale','live-source-time-invalid-or-expired',observedAt);
  const verifiedDay=dateOK(context.liveServiceDate)&&text(context.serviceDateEvidence)&&inDay(observed,context.liveServiceDate);
  const diaTime=sourceTime(timetable?.fileCreatedTime);
  const usableDia=verifiedDay&&context.timetableServiceDate===context.liveServiceDate&&diaTime!==null&&diaTime<=now&&now-diaTime<=limits.maxTimetableAgeMs&&inDay(diaTime,context.timetableServiceDate)&&Array.isArray(timetable?.TrainInfo);
  const dias=new Map(),seen=new Set(),references=[];
  if(usableDia){for(const dia of timetable.TrainInfo){const id=blockId(dia?.wdfBlockNo);if(!id||dias.has(id))return empty('unavailable','ambiguous-timetable-block-id',observedAt);dias.set(id,dia);}}
  for(const location of live.locationObjects){
    if(!location||!Array.isArray(location.trainInfoObjects))return empty('unavailable','invalid-location-schema',observedAt);
    for(const raw of location.trainInfoObjects){
      const id=blockId(raw?.wdfBlockNo);if(!id||seen.has(id))return empty('unavailable','ambiguous-live-block-id',observedAt);seen.add(id);
      const direction=trainDirection(location.trainDirection),dia=dias.get(id);
      const scheduleReference=usableDia&&dia?schedule(dia,context.liveServiceDate):null;
      const issues=['not-a-boarding-candidate'];
      if(!verifiedDay)issues.push('service-date-unverified');
      if(!usableDia)issues.push('timetable-unavailable-or-expired');else if(!dia)issues.push('timetable-join-missing');else if(!scheduleReference)issues.push('invalid-departure-sequence');
      if(direction==='unknown')issues.push('direction-unknown');
      references.push({referenceId:verifiedDay?`keihan:${context.liveServiceDate}:${id}`:null,blockId:id,serviceDate:verifiedDay?context.liveServiceDate:null,
        direction,trainNumber:text(raw.trainNumber),serviceType:text(raw.trainTypeJp),destination:text(raw.destStationNameJp),
        delayMinutes:delayMinutes(raw.delayMinutes),delayBasis:'reported-delay-only',
        position:legacyPosition(Number(location.locationCol),Number(location.locationRow)),observedAt,
        scheduleReference,scheduleObservedAt:scheduleReference?new Date(diaTime).toISOString():null,
        cancellationStatus:'unknown',ticketPolicy:'unknown',predictedArrival:null,predictedDeparture:null,issues});
    }
  }
  return {...empty('reference-only','incomplete-for-boarding',observedAt),references};
}
