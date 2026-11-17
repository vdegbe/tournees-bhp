// ---------- sorties : texte à partager, agenda (.ics), bilan cumulé (fonctions pures) ----------
const EXP=(()=>{
const p2=n=>String(n).padStart(2,"0");
const hm=s=>{s=Math.round(s/60);return p2(Math.floor(s/60)%24)+":"+p2(s%60)};
const dfr=d=>{const [y,m,j]=d.split("-");return`${j}/${m}/${y}`};
const wd=d=>["dim.","lun.","mar.","mer.","jeu.","ven.","sam."][new Date(d+"T12:00:00").getDay()];
const label=(a)=>`${a.adresse}, ${a.cp} ${a.ville}`;
const unitTxt=v=>[v.twimm&&"BI "+v.twimm,v.type,(v.etage||v.porte)&&`ét. ${v.etage||"?"} porte ${v.porte||"?"}`].filter(Boolean).join(" · ");

function shareText(r){
  const L=[`Tournée ${r.tech?r.tech+" · ":""}${wd(r.date)} ${dfr(r.date)} · départ ${hm(r.t0)}`];
  r.stops.forEach((s,i)=>{L.push("",`${i+1}. ${hm(s.arr)} ${label(s)}`);
    s.visits.forEach(v=>L.push("   "+unitTxt(v)));if(s.consigne)L.push("   Consigne : "+s.consigne)});
  L.push("",`Retour estimé ${hm(r.end)}`);return L.join("\n")}

const esc=t=>String(t||"").replace(/\\/g,"\\\\").replace(/;/g,"\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
const fold=l=>{if(l.length<=74)return l;const o=[l.slice(0,74)];for(let i=74;i<l.length;i+=73)o.push(" "+l.slice(i,i+73));return o.join("\r\n")};
const stamp=(d,s)=>d.replace(/-/g,"")+"T"+p2(Math.floor(s/3600)%24)+p2(Math.floor(s/60)%60)+"00";
// agenda de la journée : un événement par arrêt (heures locales, sans fuseau)
function ics(plan,now){
  const z=(now||new Date()).toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//tournees-bhp//FR","CALSCALE:GREGORIAN"];
  plan.resources.forEach((r,ri)=>r.stops.forEach((s,i)=>{
    L.push("BEGIN:VEVENT",`UID:${plan.id}-${ri}-${i}@tournees-bhp`,"DTSTAMP:"+z,
      "DTSTART:"+stamp(r.date,s.start),"DTEND:"+stamp(r.date,Math.max(s.dep,s.start+900)),
      "SUMMARY:"+esc(`${i+1}. ${s.adresse}`+(r.tech?` (${r.tech})`:"")),"LOCATION:"+esc(label(s)),
      "DESCRIPTION:"+esc(s.visits.map(unitTxt).join("\n")+(s.consigne?"\nConsigne : "+s.consigne:"")),
      ...(s.pt?[`GEO:${s.pt.lat.toFixed(6)};${s.pt.lng.toFixed(6)}`]:[]),"END:VEVENT")}));
  L.push("END:VCALENDAR");return L.map(fold).join("\r\n")+"\r\n"}

// ---- bilan cumulé (stocké localement, sans adresse) ----
function addStat(list,e){const i=list.findIndex(x=>x.id===e.id);if(i>=0)list[i]=e;else list.push(e);return list.slice(-500)}
function byMonth(list){const m={};
  list.forEach(e=>{const k=e.date.slice(0,7),o=m[k]||(m[k]={month:k,n:0,stops:0,mBase:0,mOpt:0,sBase:0,sOpt:0});
    o.n+=e.n||1;o.stops+=e.stops;o.mBase+=e.mBase;o.mOpt+=e.mOpt;o.sBase+=e.sBase;o.sOpt+=e.sOpt});
  return Object.values(m).sort((a,b)=>a.month<b.month?-1:1)}
const sum=a=>a.reduce((t,o)=>({n:t.n+o.n,stops:t.stops+o.stops,mBase:t.mBase+o.mBase,mOpt:t.mOpt+o.mOpt,sBase:t.sBase+o.sBase,sOpt:t.sOpt+o.sOpt}),{n:0,stops:0,mBase:0,mOpt:0,sBase:0,sOpt:0});
// coûts : carburant = km × L/100 × prix ; main-d'œuvre = heures × coût horaire (chacun seulement si renseigné)
function cost(t,o){const km=(t.mBase-t.mOpt)/1000,h=(t.sBase-t.sOpt)/3600;
  return{km,h,fuel:o&&o.l100>0&&o.price>0?km*o.l100/100*o.price:null,labour:o&&o.hourly>0?h*o.hourly:null}}
const csv=list=>"\uFEFF"+["mois;tournees;arrets;km_ordre_export;km_optimise;km_economises;minutes_economisees"].concat(
  byMonth(list).map(o=>[o.month,o.n,o.stops,(o.mBase/1000).toFixed(1),(o.mOpt/1000).toFixed(1),((o.mBase-o.mOpt)/1000).toFixed(1),Math.round((o.sBase-o.sOpt)/60)].join(";"))).join("\r\n");
return{hm,dfr,wd,label,unitTxt,shareText,ics,addStat,byMonth,sum,cost,csv}})();
