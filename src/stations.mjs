// Station names/codes and line topology only. No copied timetable or service pattern.
const mainNames = ['淀屋橋','北浜','天満橋','京橋','野江','関目','森小路','千林','滝井','土居','守口市','西三荘','門真市','古川橋','大和田','萱島','寝屋川市','香里園','光善寺','枚方公園','枚方市','御殿山','牧野','樟葉','橋本','石清水八幡宮','淀','中書島','伏見桃山','丹波橋','墨染','藤森','龍谷大前深草','伏見稲荷','鳥羽街道','東福寺','七条','清水五条','祇園四条','三条','神宮丸太町','出町柳'];
export const STATIONS = mainNames.map((name,i)=>({id:`KH${String(i+1).padStart(2,'0')}`,name,line:i<40?'京阪本線':'鴨東線'}));
STATIONS.push(...['中之島','渡辺橋','大江橋','なにわ橋'].map((name,i)=>({id:`KH${54-i}`,name,line:'中之島線'})));
for(const s of STATIONS)s.lines=[s.line,...(s.id==='KH03'?['中之島線']:s.id==='KH40'?['鴨東線']:[])];
export const station = id => STATIONS.find(s=>s.id===id);
export const validStation = id => !!station(id);
export function stationPath(from,to) {
  if(!validStation(from)||!validStation(to))return [];
  const edges=new Map(STATIONS.map(s=>[s.id,[]]));
  const connect=(a,b)=>{edges.get(a).push(b);edges.get(b).push(a);};
  for(let i=0;i<41;i++)connect(STATIONS[i].id,STATIONS[i+1].id);
  for(const [a,b] of [['KH54','KH53'],['KH53','KH52'],['KH52','KH51'],['KH51','KH03']])connect(a,b);
  const queue=[[from]],seen=new Set([from]);
  for(const path of queue){const end=path.at(-1);if(end===to)return path;for(const next of edges.get(end)){if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}}}
  return [];
}
export const DEFAULT_ROUTES = [['KH21','KH24'],['KH24','KH21'],['KH21','KH04'],['KH04','KH01'],['KH40','KH21']];
export function direction(from,to) {
  if(from===to) return '同じ駅です';
  const f=Number(from.slice(2)), t=Number(to.slice(2));
  if(f>=51 && t>=51) return t>f?'中之島方面':'天満橋方面';
  if(f<=2 && t>=51 || f>=51 && t<=2) return '天満橋で支線乗り換え';
  if(t>=51) return '中之島方面';
  if(f>=51 || t>f) return '京都・出町柳方面';
  return '大阪方面';
}
