import {DEFAULT_ROUTES, validStation} from './stations.mjs';
export const KEY='keihan-rounder.preferences.v1';
export const defaults=()=>({version:1,route:DEFAULT_ROUTES[0],favorites:DEFAULT_ROUTES.map(r=>[...r]),favoriteStations:['KH21','KH24','KH04'],theme:'system',boardingMinutes:2});
const routeOK=r=>Array.isArray(r)&&r.length===2&&r.every(validStation)&&r[0]!==r[1];
export function normalize(raw) {
  const d=defaults();
  if(!raw||raw.version!==1) return d;
  if(routeOK(raw.route)) d.route=raw.route;
  if(Array.isArray(raw.favorites)) d.favorites=[...new Map(raw.favorites.filter(routeOK).map(r=>[r.join(':'),r])).values()].slice(0,30);
  if(Array.isArray(raw.favoriteStations)) d.favoriteStations=[...new Set(raw.favoriteStations.filter(validStation))];
  if(['system','dark','light'].includes(raw.theme)) d.theme=raw.theme;
  if([0,2,5].includes(raw.boardingMinutes)) d.boardingMinutes=raw.boardingMinutes;
  return d;
}
export function load(storage) { try { return {preferences:normalize(JSON.parse(storage.getItem(KEY))),error:null}; } catch {return {preferences:defaults(),error:'設定を読み込めません。この画面内では引き続き操作できます。'};} }
export function save(storage,preferences) {try {storage.setItem(KEY,JSON.stringify(normalize(preferences)));return null;} catch {return '端末に保存できません。この画面内での変更は使えますが、再起動すると失われます。';} }
