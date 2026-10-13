const day=epoch=>new Date(epoch+9*3600000).toISOString().slice(0,10);
export function formatTrainTime(epoch,reference=Date.now()) {
  if(!Number.isFinite(epoch)||!Number.isFinite(reference))return '時刻不明';
  const date=day(epoch),referenceDate=day(reference),offset=(Date.parse(date)-Date.parse(referenceDate))/86400000;
  const clock=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(epoch));
  return offset===0?clock:offset===1?`翌日 ${clock}`:offset===-1?`前日 ${clock}`:`${date} ${clock}`;
}
