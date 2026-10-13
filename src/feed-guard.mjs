import {validateFeed,feedState,STATES} from './engine.mjs';
const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`:JSON.stringify(value);
function content(feed){const {fetchedAt,expiresAt,...snapshot}=feed;return canonical(snapshot);}
// The provider version is monotonic within source.id + snapshot serviceDate.
// Transport fetch/expiry changes alone never count as a new source revision.
export function createFeedGuard() {
  const sources=new Map();
  return {
    accept(feed,now=Date.now()) {
      if(validateFeed(feed).length)return {state:STATES.UNAVAILABLE,feed:null,code:'invalid',message:'データの形式・更新版を確認できません。'};
      const state=feedState(feed,now);
      if(![STATES.LIVE,STATES.TIMETABLE].includes(state))return {state,feed:null,code:'expired',message:'データの鮮度または有効期間を確認できません。'};
      const observed=Date.parse(feed.observedAt),previous=sources.get(feed.source.id),scope=previous?.days.get(feed.serviceDate),fingerprint=content(feed);
      const reject=(code,message)=>({state:STATES.STALE,feed:null,code,message});
      if(previous&&observed<previous.observed)return reject('older-observation','提供元の更新日時が前回より古いため、候補を非表示にしました。');
      if(scope&&feed.version<scope.version)return reject('older-version','提供元の更新版が前回より古いため、候補を非表示にしました。');
      if(scope&&feed.version===scope.version&&fingerprint!==scope.fingerprint)return reject('conflicting-version','同じ更新版の内容が矛盾するため、候補を非表示にしました。');
      const days=previous?.days??new Map();days.set(feed.serviceDate,{version:feed.version,fingerprint});
      sources.set(feed.source.id,{observed:Math.max(previous?.observed??-Infinity,observed),days});
      return {state,feed,code:scope&&feed.version===scope.version?'same':'accepted',message:null};
    }
  };
}
