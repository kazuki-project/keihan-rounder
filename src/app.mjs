import {STATIONS,station,direction} from './stations.mjs';
import {load,save} from './storage.mjs';
import {fetchFeed,CONFIG} from './adapter.mjs';
import {findJourneys,feedState,STATES} from './engine.mjs';
const $=id=>document.getElementById(id), name=id=>station(id)?.name??'不明';
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw new Error();},setItem(){throw new Error();}};}
const loaded=load(storage);let prefs=loaded.preferences,editing=false,picking='from',filter='all',feed=null,state=STATES.UNAVAILABLE,lastAttempt=null,busy=false,message=null;
const statusLabels={normal:'取得済み',loading:'取得中',stale:'更新遅延 — 古いデータです',error:'通信エラー',unavailable:'データ取得不可 · 未接続',timetable:'時刻表モード · 実際の遅延は反映しません'};
function text(tag,value,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;}
function warn(value){$('storage-warning').hidden=!value;$('storage-warning').textContent=value??'';}
let toastTimer;function toast(value){clearTimeout(toastTimer);$('toast').textContent=value;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function persist(){warn(save(storage,prefs));}
function setRoute(route){prefs.route=[...route];persist();render();}
function render(){
 const [from,to]=prefs.route;$('from-name').textContent=name(from);$('to-name').textContent=name(to);$('direction').textContent=direction(from,to);
 $('from').setAttribute('aria-label',`現在駅 ${name(from)}を変更`);$('to').setAttribute('aria-label',`目的駅 ${name(to)}を変更`);
 const saved=prefs.favorites.some(r=>r.join()===prefs.route.join());$('save-route').textContent=saved?'★ 登録済みの区間':'☆ この区間をお気に入りに追加';$('save-route').disabled=saved;
 $('theme').value=prefs.theme;$('boarding').value=prefs.boardingMinutes;document.documentElement.dataset.theme=prefs.theme;
 $('edit-favorites').textContent=editing?'完了':'編集';$('favorites').replaceChildren();
 for(const [i,r] of prefs.favorites.entries()) {
  const row=text('div','','favorite-row'),b=text('button','','favorite');b.classList.toggle('active',r.join()===prefs.route.join());b.setAttribute('aria-pressed',String(r.join()===prefs.route.join()));
  const label=text('span');label.append(text('span',name(r[0])),text('span','→','arrow'),text('span',name(r[1])));b.append(label,text('span','›'));b.onclick=()=>setRoute(r);row.append(b);
  if(editing) for(const [label,aria,action,disabled] of [['↑','上へ移動',()=>{[prefs.favorites[i-1],prefs.favorites[i]]=[prefs.favorites[i],prefs.favorites[i-1]];},i===0],['↓','下へ移動',()=>{[prefs.favorites[i+1],prefs.favorites[i]]=[prefs.favorites[i],prefs.favorites[i+1]];},i===prefs.favorites.length-1],['×','削除',()=>{prefs.favorites.splice(i,1);},false]]){const e=text('button',label,'edit');e.setAttribute('aria-label',`${name(r[0])}から${name(r[1])}を${aria}`);e.disabled=disabled;e.onclick=()=>{action();persist();render();};row.append(e);}
  $('favorites').append(row);
 }
 if(!prefs.favorites.length)$('favorites').append(text('p','区間を選んで「お気に入りに追加」を押してください。','fine'));
 renderData();
}
function clock(epoch){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(epoch));}
function stamp(epoch){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(epoch))+' JST';}
const basisLabel=b=>({official:'公式予測',app:'アプリ推定',scheduled:'ダイヤ'})[b];
function renderData(){
 $('offline').hidden=navigator.onLine;
 if(feed&&![STATES.LOADING,STATES.ERROR].includes(state))state=feedState(feed);
 $('status').textContent=statusLabels[state]+(message?`：${message}`:'');$('status').dataset.state=state;$('refresh').disabled=busy;
 $('results').replaceChildren();$('source-details').replaceChildren();
 const safe=navigator.onLine&&[STATES.LIVE,STATES.TIMETABLE].includes(state);
 const journeys=safe?findJourneys(feed,...prefs.route,{boardingMinutes:prefs.boardingMinutes}):[];
 $('empty').hidden=journeys.length>0;
 if(safe){$('empty').querySelector('h3').textContent='条件に合う乗車候補を確認できません';$('empty').querySelector('p').textContent='対象区間・余裕時間・データ収録範囲を確認してください。運休や終電と断定はできません。';}
 else{$('empty').querySelector('h3').textContent=state===STATES.ERROR?'運行データの取得に失敗しました':state===STATES.STALE?'情報が古いため候補を非表示にしました':'運行データをまだ取得できません';$('empty').querySelector('p').textContent='最新で利用可能なデータを確認できないため、乗車候補・発着時刻・遅延は表示していません。お気に入りと駅選択は引き続き使えます。';}
 for(const j of journeys){
  const card=text('article','','journey'),first=j.legs[0];card.append(text('span',first.type,'train-type'),text('h3',`${name(first.destination)}行`));
  card.append(text('p',j.transfers?`${name(first.to)}で乗り換え（移動時間は要確認）`:'乗り換えなし','fine'));
  const grid=text('div','','journey-grid');for(const [title,event] of [['発車',j.departure],[`${name(prefs.route[1])} 到着`,j.arrival]]){const col=text('div');col.append(text('p',`${title} · ${basisLabel(event.basis)}`,'fine'),text('p',clock(event.time),'time'));grid.append(col);}card.append(grid);
  for(const l of j.legs){const detail=text('div');detail.append(text('p',`${name(l.from)} → ${name(l.to)}｜${l.type} ${name(l.destination)}行`,'fine'));detail.append(text('span',l.delayMinutes===undefined?'遅延情報なし':l.delayMinutes===0?'取得データ上は遅延なし':`遅延 +${l.delayMinutes}分`,'delay'));detail.append(text('p',`ダイヤ：発 ${clock(Date.parse(l.scheduledDeparture))} ／ 着 ${clock(Date.parse(l.scheduledArrival))}`,'fine'));detail.append(text('p',`のりば：${l.platform??'情報なし'} ／ 現在位置：${l.position??'情報なし'}`,'fine'));if(l.notice)detail.append(text('p',l.notice,'warning'));if(l.departure.explanation||l.arrival.explanation)detail.append(text('p',l.departure.explanation||l.arrival.explanation,'fine'));card.append(detail);}
  card.append(text('p','表示時刻に基づく到着順です。ダイヤ時刻は実際の到着を保証しません。','fine'));$('results').append(card);
 }
 $('updated').textContent=feed?`データ最終更新：${stamp(Date.parse(feed.observedAt??feed.fetchedAt))}／取得：${stamp(Date.parse(feed.fetchedAt))}`:'運行データ最終更新：未取得'+(lastAttempt?` · 接続確認 ${clock(lastAttempt)}`:'');
 if(feed){$('source-details').append(text('p',`取得元：${feed.source.name} ／ 利用条件：${feed.source.license}`),text('p',`ダイヤ有効期間：${feed.validFrom}〜${feed.validThrough} ／ ${feed.mode==='realtime'?'運行データ':'時刻表のみ'}`));}
}
function renderStations(){
 const query=$('station-search').value.trim();$('station-list').replaceChildren();
 const filtered=STATIONS.filter(s=>(!query||s.name.includes(query)||s.id.toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||filter==='favorite'&&prefs.favoriteStations.includes(s.id)||s.line===filter));
 for(const s of filtered){const row=text('div','','station-row'),b=text('button','','station-choice'),star=text('button',prefs.favoriteStations.includes(s.id)?'★':'☆','star');b.append(text('span',s.name),text('small',`${s.id} · ${s.line}`));b.onclick=()=>{const next=[...prefs.route];next[picking==='from'?0:1]=s.id;if(next[0]===next[1]){toast('出発駅と目的駅は別の駅を選んでください');return;}setRoute(next);$('station-dialog').close();};star.setAttribute('aria-label',`${s.name}をお気に入り駅${prefs.favoriteStations.includes(s.id)?'から削除':'に追加'}`);star.setAttribute('aria-pressed',String(prefs.favoriteStations.includes(s.id)));star.onclick=()=>{prefs.favoriteStations=prefs.favoriteStations.includes(s.id)?prefs.favoriteStations.filter(id=>id!==s.id):[...prefs.favoriteStations,s.id];persist();renderStations();};row.append(b,star);$('station-list').append(row);}
 if(!filtered.length)$('station-list').append(text('p','該当する駅がありません。'));
}
for(const side of ['from','to'])$(side).onclick=()=>{picking=side;filter='all';$('station-title').textContent=side==='from'?'現在駅を選ぶ':'目的駅を選ぶ';$('station-search').value='';for(const b of $('line-filters').children)b.setAttribute('aria-pressed',String(b.dataset.line==='all'));renderStations();$('station-dialog').showModal();};
$('station-search').oninput=renderStations;$('line-filters').onclick=e=>{const b=e.target.closest('button');if(!b)return;filter=b.dataset.line;for(const el of $('line-filters').children)el.setAttribute('aria-pressed',String(el===b));renderStations();};
$('swap').onclick=()=>setRoute([...prefs.route].reverse());$('save-route').onclick=()=>{if(prefs.favorites.length>=30){toast('区間は30件まで登録できます');return;}prefs.favorites.push([...prefs.route]);persist();render();toast('お気に入りに追加しました');};$('edit-favorites').onclick=()=>{editing=!editing;render();};
$('settings-open').onclick=()=>$('settings-dialog').showModal();$('theme').onchange=e=>{prefs.theme=e.target.value;persist();render();};$('boarding').onchange=e=>{prefs.boardingMinutes=Number(e.target.value);persist();render();};
async function refresh(){if(busy)return;if(CONFIG.endpoint&&lastAttempt&&Date.now()-lastAttempt<CONFIG.minRefreshMs){toast('取得間隔を空けています。1分後に再試行してください');return;}busy=true;state=STATES.LOADING;message=null;renderData();lastAttempt=Date.now();const result=await fetchFeed();feed=result.feed;state=result.state;message=result.message;busy=false;renderData();}
$('refresh').onclick=refresh;window.addEventListener('offline',renderData);window.addEventListener('online',()=>{renderData();if(CONFIG.endpoint)refresh();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderData();if(CONFIG.endpoint)refresh();}});setInterval(()=>{if(!document.hidden)renderData();},30000);
warn(loaded.error);render();refresh();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('オフライン機能を有効にできませんでした。オンラインで利用できます。'));
