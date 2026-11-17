// ---------- mode terrain : un arrêt à la fois, avec l'avancement mémorisé ----------
let FD={ri:0,i:0};
const progKey=()=>"prog:"+ST.plan.id,prog=()=>ls.g(progKey())||{};
const STATUS={fait:"Fait",absent:"Absent",impossible:"Impossible"};
function openField(ri,i){FD={ri,i};let el=$("field");if(!el){el=document.createElement("div");el.id="field";document.body.appendChild(el)}drawField()}
function closeField(){const el=$("field");if(el)el.remove();renderPlan(ST.plan)}
function setStatus(v){const p=prog();p[FD.ri+":"+FD.i]=v;ls.s(progKey(),p);
  const R=ST.plan.resources[FD.ri],n=R.stops.length;let k=FD.i+1;
  while(k<n&&p[FD.ri+":"+k])k++;
  if(k>=n){k=0;while(k<n&&p[FD.ri+":"+k])k++}   // revient sur un arrêt resté sans statut
  FD.i=k;drawField()}
function report(R,ri){const p=prog();
  return[`Compte rendu ${R.tech?R.tech+" · ":""}${EXP.dfr(R.date)}`].concat(R.stops.map((s,i)=>`${i+1}. ${s.adresse}, ${s.cp} ${s.ville} : ${STATUS[p[ri+":"+i]]||"non traité"}${s.visits.some(v=>v.twimm)?" (BI "+s.visits.map(v=>v.twimm).filter(Boolean).join(", ")+")":""}`)).join("\n")}
function drawField(){
  const el=$("field");if(!el)return;
  const R=ST.plan.resources[FD.ri],n=R.stops.length,p=prog(),cnt={fait:0,absent:0,impossible:0};
  R.stops.forEach((_,i)=>{const v=p[FD.ri+":"+i];if(v)cnt[v]++});const done=cnt.fait+cnt.absent+cnt.impossible;
  const bar=`<div class="bar"><i style="width:${Math.round(done/n*100)}%"></i></div>`;
  if(FD.i>=n){
    el.innerHTML=`<div class="tools"><button id="fx">✕ Fermer</button></div>${bar}<div class="big">Tournée terminée</div>
     <div class="det">${cnt.fait} fait(s) · ${cnt.absent} absent(s) · ${cnt.impossible} impossible(s)</div>
     <div class="tools"><button class="pri" id="fs">Partager le compte rendu</button><button id="fb">Revoir les arrêts</button></div><div class="msg" id="fm"></div>`;
    $("fx").onclick=closeField;$("fb").onclick=()=>{FD.i=0;drawField()};
    $("fs").onclick=()=>shareOrCopy("Compte rendu de tournée",report(R,FD.ri),"fm");return}
  const s=R.stops[FD.i],st=p[FD.ri+":"+FD.i];
  el.innerHTML=`<div class="tools"><button id="fx">✕ Fermer</button></div>${bar}
   <small>${esc(R.tech||"Tournée")} · ${EXP.dfr(R.date)} · arrêt ${FD.i+1}/${n} · ${done} traité(s)</small>
   <div class="big">${esc(EXP.label(s))}</div>
   <div class="det"><span class="time">Arrivée prévue ${EXP.hm(s.arr)}</span>${st?` <span class="badge ${esc(st)}">${esc(STATUS[st])}</span>`:""}</div>
   ${s.visits.map(v=>`<div class="big" style="font-size:17px">${v.etage||v.porte?`Étage ${esc(v.etage||"?")} · Porte ${esc(v.porte||"?")}`:"Logement"}</div><small>${esc([v.twimm&&"BI "+v.twimm,v.type,v.slotStart!=null&&`créneau ${EXP.hm(v.slotStart)}–${EXP.hm(v.slotEnd)}`].filter(Boolean).join(" · "))}</small>`).join("")}
   ${s.consigne?`<div class="det">Consigne : ${esc(s.consigne)}</div>`:""}${s.warn.map(w=>`<div class="det warn">${esc(w)}</div>`).join("")}
   <div class="tools"><a class="btnlink" target="_blank" rel="noopener" href="${MAPC.gStop(s.pt)}">Y aller · Google Maps</a><a class="btnlink" target="_blank" rel="noopener" href="${MAPC.wazeStop(s.pt)}">Waze</a></div>
   <div class="tools"><button class="pri" id="fd">Fait</button><button id="fa">Absent</button><button id="fi">Impossible</button></div>
   <div class="tools"><button id="fp" ${FD.i?"":"disabled"}>‹ Précédent</button><button id="fn">Suivant ›</button></div>`;
  $("fx").onclick=closeField;$("fd").onclick=()=>setStatus("fait");$("fa").onclick=()=>setStatus("absent");$("fi").onclick=()=>setStatus("impossible");
  $("fp").onclick=()=>{FD.i=Math.max(0,FD.i-1);drawField()};$("fn").onclick=()=>{FD.i++;drawField()}}
