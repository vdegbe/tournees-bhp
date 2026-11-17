// ---------- planification : visites, arrêts, répartition, ordre de passage (fonctions pures) ----------
// Dépend de : TW
const SCH=(()=>{
const LATE_W=10,OVER_W=5,BAL=0.15,DAYPEN=3600;
const etNum=e=>{e=String(e||"").trim().toUpperCase();if(e==="RDC")return 0;const n=parseInt(e,10);return isNaN(n)?99:n};

// Une ligne twimm (ou adresse collée) devient une visite par créneau prévu dans la période ; sans créneau : une visite libre.
// Un créneau prévu pour un autre technicien que ceux saisis écarte la visite (elle n'est pas pour cette tournée).
function visits(units,dates,techs,defDur){
  const out=[],skipped={range:0,other:{}};
  units.forEach((u,idx)=>{
    const sl=u.slots||[];
    const mk=slot=>({u,idx,date:slot?slot.date:null,slot:slot||null,tech:null,dur:slot&&slot.end-slot.start>=600?slot.end-slot.start:defDur});
    if(!sl.length){out.push(mk(null));return}
    const inRange=sl.filter(s=>dates.includes(s.date));
    if(!inRange.length){skipped.range++;return}
    inRange.forEach(s=>{const v=mk(s);
      if(s.tech&&techs.length){
        if(!techs.some(t=>TW.nameMatch(t,s.tech))){skipped.other[s.tech]=(skipped.other[s.tech]||0)+1;return}
        v.tech=s.tech}
      out.push(v)})});
  return{visits:out,skipped}}

// Plusieurs visites à la même adresse, le même jour et pour le même technicien = un seul arrêt (étages dans l'ordre).
function groupStops(vs){
  const m=new Map();
  vs.forEach(v=>{const a=v.u,k=[a.adresse,a.cp,v.date||"*",v.tech?v.tech.toLowerCase():"*"].join("|");
    if(!m.has(k))m.set(k,{key:k,adresse:a.adresse,cp:a.cp,ville:a.ville,pt:v.pt||null,date:v.date,tech:v.tech,visits:[],idx:v.idx});
    const s=m.get(k);s.visits.push(v);s.idx=Math.min(s.idx,v.idx);if(!s.pt&&v.pt)s.pt=v.pt});
  return[...m.values()].map(s=>{
    s.visits.sort((a,b)=>etNum(a.u.etage)-etNum(b.u.etage)||(a.slot?a.slot.start:0)-(b.slot?b.slot.start:0));
    s.svc=s.visits.reduce((t,v)=>t+v.dur,0);
    s.quality=(s.visits.find(v=>v.u.quality!=="ok")||s.visits[0]).u.quality;
    const sl=s.visits.filter(v=>v.slot);
    if(sl.length)s.win={ws:Math.min(...sl.map(v=>v.slot.start)),we:Math.max(...sl.map(v=>v.slot.end)),md:s.date.slice(5)};
    else{const c=s.visits.find(v=>v.u.cwin);s.win=c?c.u.cwin:null}
    return s})}

// ---- simulation d'une tournée : heures d'arrivée, attentes, retards, retour ----
// res : {start, end (nœud ou null = fin au dernier arrêt), t0, dayEnd}   C : {t(i,j) secondes, d(i,j) mètres}
function run(res,seq,C){
  let t=res.t0,p=res.start,m=0,late=0,tr=0;const times=[];
  for(const j of seq){const s=C.t(p,j.node),d=C.d(p,j.node);t+=s;tr+=s;m+=d;
    const arr=t;if(j.ws!=null&&t<j.ws)t=j.ws;
    const l=j.we!=null&&arr>j.we?arr-j.we:0;late+=l;
    times.push({arr,start:t,dep:t+j.svc,late:l,leg:s,legM:d});t+=j.svc;p=j.node}
  let backSec=0,backM=0;
  if(res.end!=null&&seq.length){backSec=C.t(p,res.end);backM=C.d(p,res.end);t+=backSec;tr+=backSec;m+=backM}
  const over=res.dayEnd!=null?Math.max(0,t-res.dayEnd):0;
  return{times,end:t,late,over,travel:tr,meters:m,backSec,backM,cost:t+LATE_W*late+OVER_W*over}}

const jobOf=(st,res)=>{const w=st.win&&(!st.win.md||st.win.md===res.date.slice(5))?st.win:null;return{st,node:st.node,svc:st.svc,ws:w?w.ws:null,we:w?w.we:null}};
const perms=a=>a.length<2?[a]:a.flatMap((x,i)=>perms(a.slice(0,i).concat(a.slice(i+1))).map(p=>[x,...p]));
function nn(res,jobs,C){const left=jobs.slice(),o=[];let p=res.start;
  while(left.length){let b=0,bd=Infinity;left.forEach((j,i)=>{const d=C.t(p,j.node);if(d<bd){bd=d;b=i}});o.push(left.splice(b,1)[0]);p=o[o.length-1].node}return o}
function byWindow(res,jobs,C){
  const w=jobs.filter(j=>j.ws!=null||j.we!=null).sort((a,b)=>(a.ws!=null?a.ws:a.we-3600)-(b.ws!=null?b.ws:b.we-3600)),seq=w.slice();
  jobs.filter(j=>!w.includes(j)).forEach(j=>{let bp=0,bc=Infinity;
    for(let p=0;p<=seq.length;p++){const c=run(res,seq.slice(0,p).concat([j],seq.slice(p)),C).cost;if(c<bc){bc=c;bp=p}}seq.splice(bp,0,j)});
  return seq}
function improve(res,seq,C){
  let best=seq.slice(),bc=run(res,best,C).cost,n=best.length,go=true,g=0;
  while(go&&g++<80){go=false;
    for(let i=0;i<n;i++)for(let k=0;k<n;k++){if(k===i)continue;
      const c=best.slice(),x=c.splice(i,1)[0];c.splice(k,0,x);const v=run(res,c,C).cost;if(v<bc-1e-6){best=c;bc=v;go=true}}
    for(let i=0;i<n-1;i++)for(let k=i+1;k<n;k++){
      const c=best.slice(0,i).concat(best.slice(i,k+1).reverse(),best.slice(k+1));const v=run(res,c,C).cost;if(v<bc-1e-6){best=c;bc=v;go=true}}}
  return best}
// ordre optimal (exhaustif jusqu'à 7 arrêts, sinon plus proche voisin / fenêtres horaires puis amélioration locale)
function solve(res,jobs,C){
  if(jobs.length<2)return jobs.slice();
  if(jobs.length<=7){let best=null,bc=Infinity;for(const p of perms(jobs)){const c=run(res,p,C).cost;if(c<bc){bc=c;best=p}}return best}
  let best=null,bc=Infinity;
  for(const s of [nn(res,jobs,C),byWindow(res,jobs,C)]){const c=improve(res,s,C),v=run(res,c,C).cost;if(v<bc){bc=v;best=c}}
  return best}

// ---- répartition des arrêts entre les ressources (technicien × jour), par insertion la moins coûteuse ----
// Un arrêt verrouillé (date ou technicien prévus) ne va que dans les ressources compatibles ; les autres équilibrent la charge.
function assign(rs,stops,C){
  const seqs=rs.map(()=>[]),unassigned=[],left=[];
  const allowed=st=>rs.map((r,i)=>(!st.date||st.date===r.date)&&(!st.tech||TW.nameMatch(r.tech,st.tech))?i:-1).filter(i=>i>=0);
  stops.forEach(st=>{const al=allowed(st);if(al.length)left.push({st,al});else unassigned.push(st)});
  const bestIns=(st,al)=>{let best=null;
    for(const ri of al){const r=rs[ri],seq=seqs[ri],base=run(r,seq,C).cost;
      for(let p=0;p<=seq.length;p++){const x=run(r,seq.slice(0,p).concat([jobOf(st,r)],seq.slice(p)),C);
        const score=x.cost-base+BAL*(x.end-r.t0)+DAYPEN*r.dayIdx;if(!best||score<best.score)best={ri,p,score}}}
    return best};
  const put=(x,b)=>seqs[b.ri].splice(b.p,0,jobOf(x.st,rs[b.ri]));
  left.filter(x=>x.al.length===1).forEach(x=>put(x,bestIns(x.st,x.al)));
  const free=left.filter(x=>x.al.length>1);
  while(free.length){let bi=0,bb=null;free.forEach((x,i)=>{const b=bestIns(x.st,x.al);if(!bb||b.score<bb.score){bb=b;bi=i}});put(free.splice(bi,1)[0],bb)}
  return{seqs:seqs.map((s,i)=>solve(rs[i],s,C)),unassigned}}

// comparaison : ordre des lignes de l'export, pour les mêmes arrêts
const baseline=(res,seq,C)=>run(res,seq.slice().sort((a,b)=>a.st.idx-b.st.idx),C);

return{visits,groupStops,run,solve,assign,baseline,jobOf,etNum}})();
