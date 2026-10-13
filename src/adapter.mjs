import {feedState,validateFeed,STATES} from './engine.mjs';
// Set only after a documented provider agreement and a same-origin server adapter exist.
export const CONFIG={endpoint:null,minRefreshMs:60000};
export async function fetchFeed({endpoint=CONFIG.endpoint,fetcher=globalThis.fetch,now=Date.now()}={}) {
  if(!endpoint) return {state:STATES.UNAVAILABLE,feed:null,message:'利用許可を確認できた運行データが未接続です。'};
  if(!endpoint.startsWith('/')||endpoint.startsWith('//')) return {state:STATES.UNAVAILABLE,feed:null,message:'取得先の設定が無効です。'};
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetcher(endpoint,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('HTTP failure');
    const feed=await response.json();
    if(validateFeed(feed).length) return {state:STATES.UNAVAILABLE,feed:null,message:'データの形式・出典・有効期間を確認できません。'};
    return {state:feedState(feed,now),feed,message:null};
  } catch { return {state:STATES.ERROR,feed:null,message:'通信に失敗しました。時間をおいて再取得してください。'}; }
  finally {clearTimeout(timeout);}
}
