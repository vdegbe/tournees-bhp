// ---------- calcul : localisation des adresses, trajets, répartition ----------
const geoCache=ls.g("geo")||{};
(function(){const lim=Date.now()-30*864e5;let ch=false;for(const k in geoCache)if(!geoCache[k].t||geoCache[k].t<lim){delete geoCache[k];ch=true}if(ch)ls.s("geo",geoCache)})();
const FIX=ls.g("fix")||{};
const fixKey=u=>[u.adresse,u.cp,u.ville].join("|").toUpperCase();
// correction d'adresse mémorisée par l'utilisateur : réappliquée à chaque import
function applyFix(u){u.fk=u.fk||fixKey(u);const t=FIX[u.fk];if(!t||u.fixed===t)return;
  const f=MAPC.fromPaste(t)[0];if(f){u.adresse=f.adresse;u.cp=f.cp;u.ville=f.ville;u.full=f.full;u.quality="ok";u.fixed=t}}

async function geocode(a){
  const k=MAPC.queryOf(a).toUpperCase();if(geoCache[k])return geoCache[k];
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),10000);
  try{const r=await fetch(MAPC.geoUrl(a),{signal:ctl.signal});if(!r.ok)throw new Error("HTTP "+r.status);
    const p=MAPC.geoPick(await r.json());if(p){p.t=Date.now();geoCache[k]=p;ls.s("geo",geoCache)}return p}
  finally{clearTimeout(t)}}
async function geocodeAll(list,progress){
  let done=0,idx=0,failed=false;
  const worker=async()=>{while(idx<list.length){const a=list[idx++];
    try{a.pt=await geocode(a)}catch(e){a.pt=null;failed=true}progress(++done,list.length)}};
  await Promise.all([worker(),worker(),worker(),worker()]);return failed}

let busy=false;
async function compute(){
  if(busy)return;busy=true;$("mgo").disabled=true;
  try{await computeInner()}catch(e){msg("mmsg","Erreur : "+e.message,"err")}
  finally{busy=false;$("mgo").disabled=false}}
$("mgo").onclick=compute;

async function computeInner(){
  const all=readRows().filter(t=>t.n||t.h),rows=all.filter(t=>t.h.length>=6);   // sans domicile : non planifié
  if(!rows.length)return msg("mmsg","Indique le domicile d’au moins un technicien (départ et retour).","err");
  if(rows.length>1&&rows.some(t=>!t.n))return msg("mmsg","Indique le prénom de chaque technicien.","err");
  saveRows();saveOpts();
  const dates=horizon(),defDur=Math.max(5,+$("mdur").value||30)*60;
  const t0=toSec($("mstart").value),dayEnd=toSec($("mend").value);
  if(t0==null||dayEnd==null||dayEnd<=t0)return msg("mmsg","Vérifie l’heure de départ et la fin de journée.","err");
  const from=$("mfrom").value,to=$("mto").value,needDepot=from==="depot"||to==="depot",depotTxt=$("mdepot").value.trim();
  if(needDepot&&depotTxt.length<6)return msg("mmsg","Indique l’adresse commune (dépôt), ou choisis le domicile.","err");
  const units=ST.units.filter(u=>u.sel).concat(MAPC.fromPaste($("mpaste").value).map((u,i)=>Object.assign(u,{idx:100000+i})));
  if(!units.length)return msg("mmsg","Aucune adresse : importe l’export twimm ou colle des adresses.","err");
  units.forEach(applyFix);

  const {visits,skipped}=SCH.visits(units,dates,rows.some(t=>!t.n)?[]:rows.map(t=>t.n),defDur);
  const others=Object.keys(skipped.other);
  if(!visits.length)return msg("mmsg",`Aucune intervention sur la période choisie (${skipped.range} prévue(s) à d’autres dates${others.length?`, d’autres techniciens : ${others.join(", ")}`:""}). Change le premier jour ou les techniciens.`,"err");

  // localisation (une requête par adresse distincte ; mémoire locale)
  const homesA=rows.map(t=>MAPC.fromPaste(t.h)[0]),depotA=needDepot?MAPC.fromPaste(depotTxt)[0]:null;
  const used=units.filter(u=>visits.some(v=>v.u===u)),uniq=new Map();
  [...homesA,depotA,...used].filter(Boolean).forEach(a=>{const k=MAPC.queryOf(a).toUpperCase();if(!uniq.has(k))uniq.set(k,a)});
  const failed=await geocodeAll([...uniq.values()],(d,n)=>msg("mmsg",`Localisation des adresses ${d}/${n}…`));
  const ptOf=a=>(uniq.get(MAPC.queryOf(a).toUpperCase())||{}).pt||null;
  used.forEach(u=>u.pt=ptOf(u));
  const hp=homesA.map(ptOf),dp=depotA?ptOf(depotA):null;
  const badHome=hp.findIndex(p=>!p);
  if(badHome>=0)return msg("mmsg",`Domicile introuvable${rows[badHome].n?" pour "+rows[badHome].n:""} : vérifie l’adresse (numéro, rue, code postal, ville) et la connexion.`,"err");
  if(needDepot&&!dp)return msg("mmsg","Adresse commune introuvable : vérifie-la.","err");
  const placedV=visits.filter(v=>v.u.pt),lostV=visits.filter(v=>!v.u.pt);
  if(!placedV.length)return msg("mmsg",failed?"Le service d’adresses ne répond pas : vérifie la connexion et réessaie.":"Aucune adresse reconnue.","err");
  placedV.forEach(v=>v.pt=v.u.pt);
  const stops=SCH.groupStops(placedV);

  // points : domiciles, dépôt, arrêts ; temps et distances par la route (repli : estimation)
  const pts=hp.slice(),depotNode=dp?pts.push(dp)-1:-1;stops.forEach(s=>{s.node=pts.push(s.pt)-1});
  msg("mmsg","Calcul des trajets…");
  let json=null;
  if(pts.length<=90){try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),15000);
    const r=await fetch(MAPC.osrmUrl(pts),{signal:ctl.signal});clearTimeout(tm);
    if(r.ok){const j=await r.json();if(j&&j.code==="Ok")json=j}}catch(e){}}
  const C=MAPC.matrix(pts,json);

  // répartition et ordre de passage
  const rs=[];dates.forEach((d,di)=>rows.forEach((t,ti)=>rs.push({id:ti+"|"+d,tech:t.n,date:d,dayIdx:di,ti,t0,dayEnd,
    start:from==="depot"?depotNode:ti,end:to==="home"?ti:to==="depot"?depotNode:null})));
  const A=SCH.assign(rs,stops,C);

  const plan={id:"p"+Date.now().toString(36),at:new Date().toISOString(),dates,exact:C.exact,resources:[],unplaced:[],excluded:skipped};
  const side=v=>({twimm:v.u.twimm,adresse:v.u.adresse,cp:v.u.cp,ville:v.u.ville});
  lostV.forEach(v=>plan.unplaced.push({...side(v),why:"adresse non reconnue"}));
  A.unassigned.forEach(s=>s.visits.forEach(v=>plan.unplaced.push({...side(v),why:"technicien ou jour prévu hors de cette tournée"})));
  const tot={n:0,stops:0,mBase:0,mOpt:0,sBase:0,sOpt:0};
  rs.forEach((r,i)=>{
    const seq=A.seqs[i];if(!seq.length&&(dates.length>1||rows.length>1))return;
    const run=SCH.run(r,seq,C),base=SCH.baseline(r,seq,C);
    const lead=run.times.length?Math.max(0,run.times[0].start-run.times[0].arr):0;   // attente avant le premier créneau : on peut partir plus tard
    const R={lead:lead>=600?lead:0,tech:r.tech,date:r.date,t0:r.t0,end:run.end,meters:run.meters,travel:run.travel,late:run.late,over:run.over,dayEnd:r.dayEnd,
      base:{meters:base.meters,travel:base.travel,late:base.late},startPt:pts[r.start],endPt:r.end==null?null:pts[r.end],stops:[]};
    seq.forEach((j,k)=>{const s=j.st,tm=run.times[k],warn=[];
      if(s.quality==="site")warn.push("adresse du site : position approximative");
      if(s.quality==="multi")warn.push("l’objet cite plusieurs adresses : première adresse seulement, à compléter");
      if(s.pt.score<0.5)warn.push("adresse mal reconnue : à vérifier sur place");
      if(tm.late>0)warn.push(`arrivée ${fmtMin(tm.late)} après la fin du créneau`);
      else if(j.ws!=null&&tm.start>tm.arr+300)warn.push(`attente de ${fmtMin(tm.start-tm.arr)} avant le créneau`);
      R.stops.push({key:s.key,adresse:s.adresse,cp:s.cp,ville:s.ville,pt:{lat:s.pt.lat,lng:s.pt.lng,score:s.pt.score},
        arr:tm.arr,start:tm.start,dep:tm.dep,legSec:tm.leg,legM:tm.legM,ws:j.ws,we:j.we,warn,
        consigne:(s.visits.find(v=>v.u.consigne)||{u:{}}).u.consigne||"",
        visits:s.visits.map(v=>({twimm:v.u.twimm,type:v.u.type,site:v.u.site,client:v.u.client,etage:v.u.etage,porte:v.u.porte,
          slotStart:v.slot?v.slot.start:null,slotEnd:v.slot?v.slot.end:null}))})});
    plan.resources.push(R);
    if(seq.length){tot.n++;tot.stops+=seq.length;tot.mBase+=base.meters;tot.mOpt+=run.meters;tot.sBase+=base.travel;tot.sOpt+=run.travel}});
  ls.s("plan",plan);ls.s("units",ST.units);   // la liste importée est gardée 48 h avec la tournée : on peut recalculer après un rechargement
  if(tot.stops)ls.s("stats",EXP.addStat(ls.g("stats")||[],{id:dates[0]+"|"+rows.map(t=>t.n).join(",")+"|"+dates.length,date:dates[0],n:tot.n,stops:tot.stops,mBase:tot.mBase,mOpt:tot.mOpt,sBase:tot.sBase,sOpt:tot.sOpt}));
  ST.fixList=used.filter(u=>!u.pt||u.pt.score<0.5||u.quality!=="ok");
  renderPlan(plan);
  msg("mmsg",`${tot.stops} arrêt(s) répartis sur ${tot.n} tournée(s)${plan.unplaced.length?`, ${plan.unplaced.length} non placé(e)s`:""}${failed?" (certaines adresses n’ont pas pu être interrogées : réessaie)":""}.`,plan.unplaced.length||failed?"":"ok");
  $("mres").scrollIntoView({behavior:"smooth",block:"start"})}
