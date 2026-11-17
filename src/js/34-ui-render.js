// ---------- affichage : bilan, adresses à vérifier, fiches et cartes ----------
const COST=()=>ls.g("cost")||{};
function bilanCard(plan){
  const rs=plan.resources.filter(r=>r.stops.length);
  const t=rs.reduce((a,r)=>({n:a.n+1,stops:a.stops+r.stops.length,mBase:a.mBase+r.base.meters,mOpt:a.mOpt+r.meters,sBase:a.sBase+r.base.travel,sOpt:a.sOpt+r.travel,lBase:a.lBase+r.base.late,lOpt:a.lOpt+r.late}),{n:0,stops:0,mBase:0,mOpt:0,sBase:0,sOpt:0,lBase:0,lOpt:0});
  const L=[`<b>${t.n} tournée(s) · ${t.stops} arrêt(s)</b>`];
  if(t.stops){
    const dm=t.mBase-t.mOpt,pc=t.mBase?Math.round(dm/t.mBase*100):0;
    L.push(dm>=0?`Distance : ${fmtKm(t.mBase)} dans l’ordre de l’export → <b>${fmtKm(t.mOpt)}</b> calculé (${dm>0?"−"+fmtKm(dm)+", −"+pc+" %":"identique"}).`
      :`Distance : ${fmtKm(t.mBase)} dans l’ordre de l’export → ${fmtKm(t.mOpt)} calculé (+${fmtKm(-dm)} pour respecter les créneaux et la fin de journée).`);
    L.push(`Temps de route : ${fmtMin(t.sBase)} → <b>${fmtMin(t.sOpt)}</b>.`);
    if(t.lBase>0||t.lOpt>0)L.push(`Retards sur créneaux : ${fmtMin(t.lBase)} → ${fmtMin(t.lOpt)}.`);
    const c=EXP.cost(t,COST());if(c.fuel!=null&&c.km>0)L.push(`Carburant économisé : environ ${c.fuel.toFixed(2).replace(".",",")} €.`);
  }
  if(plan.exact<1)L.push(`<span class="warn">${plan.exact===0?"Service routier indisponible : trajets estimés (à vol d’oiseau, ajustés).":"Trajets en partie estimés."}</span>`);
  const o=Object.keys(plan.excluded.other);
  if(plan.excluded.range||o.length)L.push(`<small>Écartées : ${[plan.excluded.range?plan.excluded.range+" prévue(s) à d’autres dates":"",o.length?"prévues pour d’autres techniciens ("+o.map(n=>esc(n)+" ×"+plan.excluded.other[n]).join(", ")+")":""].filter(Boolean).join(" ; ")}.</small>`);
  return`<div class="card">${L.map(x=>`<div class="det">${x}</div>`).join("")}</div>`}

function fixCard(list){
  if(!list||!list.length)return"";
  const seen=new Set(),items=list.filter(u=>{if(seen.has(u.fk))return false;seen.add(u.fk);return true});
  return`<div class="card"><b>Adresses à vérifier (${items.length})</b><div class="msg">Corrige le texte si besoin, puis recalcule : la correction est mémorisée pour les prochains imports.</div>
   ${items.map(u=>`<div style="margin-top:8px"><small class="warn">${!u.pt?"adresse non reconnue":u.pt.score<0.5?"adresse mal reconnue":u.quality==="site"?"adresse du site (approximative)":"plusieurs adresses dans l’objet"}${u.twimm?" · BI "+esc(u.twimm):""}</small>
    <input class="fixin" data-k="${esc(u.fk)}" value="${esc(MAPC.queryOf(u))}"></div>`).join("")}
   <div class="tools"><button id="fixgo" class="pri">Corriger et recalculer</button></div></div>`}

function stopHtml(R,s,i,ri){
  const st=(ls.g("prog:"+ST.plan.id)||{})[ri+":"+i];
  const slot=s.ws!=null||s.we!=null?` · créneau ${s.ws!=null?EXP.hm(s.ws):"…"}–${s.we!=null?EXP.hm(s.we):"…"}`:"";
  return`<div class="card stop"><div class="ihead"><span class="num">${i+1}</span><div class="itxt">
    <div><span class="time">${EXP.hm(s.arr)}</span>${s.start>s.arr+300?` <small>(début ${EXP.hm(s.start)})</small>`:""} ${st?`<span class="badge ${esc(st)}">${esc(st)}</span>`:""}</div>
    <b>${esc(EXP.label(s))}</b>
    ${s.visits.map(v=>`<div>${v.etage||v.porte?`Étage ${esc(v.etage||"?")} · Porte ${esc(v.porte||"?")}`:"Logement"}<small> ${esc([v.twimm&&"BI "+v.twimm,v.type].filter(Boolean).join(" · "))}${v.slotStart!=null?esc(` · créneau ${EXP.hm(v.slotStart)}–${EXP.hm(v.slotEnd)}`):""}</small></div>`).join("")}
    <small>${esc([...new Set(s.visits.map(v=>v.site).filter(Boolean))].concat([...new Set(s.visits.map(v=>v.client).filter(Boolean))]).join(" · "))}${esc(slot)}</small>
    ${s.consigne?`<small>Consigne : ${esc(s.consigne)}</small>`:""}${s.warn.map(w=>`<small class="warn">${esc(w)}</small>`).join("")}
    <small>${i===0?"Depuis le départ":"Depuis l’arrêt précédent"} : ${fmtMin(s.legSec)} · ${fmtKm(s.legM)}</small></div></div>
   <div class="tools noprint"><a class="btnlink" target="_blank" rel="noopener" href="${MAPC.gStop(s.pt)}">Y aller · Google Maps</a><a class="btnlink" target="_blank" rel="noopener" href="${MAPC.wazeStop(s.pt)}">Waze</a></div></div>`}

function resHtml(R,ri){
  const n=R.stops.length,wd=EXP.wd(R.date)+" "+EXP.dfr(R.date);
  if(!n)return`<section class="card res"><h2>${esc(R.tech||"Tournée")} · ${wd}</h2><div class="msg">Aucune intervention.</div></section>`;
  const tours=MAPC.gTour(R.startPt,R.stops.map(s=>s.pt),R.stops.map((_,i)=>i),R.endPt);
  return`<section class="res" data-ri="${ri}"><div class="card"><h2>${esc(R.tech||"Tournée")} · ${wd}</h2>
   <div class="det">${n} arrêt(s) · départ ${EXP.hm(R.t0)} · ${R.endPt||R.stops.length?"fin estimée "+EXP.hm(R.end):""} · ${fmtKm(R.meters)} · ${fmtMin(R.travel)} de route</div>
   ${R.lead?`<div class="det">Départ conseillé : <b>${EXP.hm(R.t0+R.lead)}</b> (le premier créneau n’ouvre qu’à ${EXP.hm(R.stops[0].start)} ; partir plus tôt ne ferait qu’attendre).</div>`:""}
   ${R.over>0?`<div class="det warn">Dépasse la fin de journée de ${fmtMin(R.over)} : réduis la liste ou ajoute un jour.</div>`:""}
   <div id="map${ri}" style="height:300px;border-radius:10px;margin-top:8px"></div>
   <div class="msg">Tracé à vol d’oiseau ; heures, temps et distances calculés par la route.</div>
   <div class="tools noprint">${tours.map((u,i)=>`<a class="btnlink" target="_blank" rel="noopener" href="${u}">${tours.length>1?`Google Maps · partie ${i+1}/${tours.length}`:"Itinéraire complet (Google Maps)"}</a>`).join("")}</div>
   <div class="tools noprint"><button class="pri" data-act="field" data-ri="${ri}">Mode terrain</button><button data-act="share" data-ri="${ri}">Partager</button><button data-act="ics" data-ri="${ri}">Agenda (.ics)</button><button data-act="print">Imprimer / PDF</button></div>
   <div class="msg" id="rm${ri}"></div></div>
   ${R.stops.map((s,i)=>stopHtml(R,s,i,ri)).join("")}</section>`}

function renderPlan(plan){
  ST.plan=plan;ST.maps.forEach(m=>{try{m.remove()}catch(e){}});ST.maps=[];
  const box=$("mres");box.classList.remove("hide");
  box.innerHTML=bilanCard(plan)+fixCard(ST.fixList)+plan.resources.map(resHtml).join("")+
    (plan.unplaced.length?`<div class="card"><b>Non placées (${plan.unplaced.length})</b>${plan.unplaced.map(u=>`<div class="rs" style="margin-left:0">${esc(u.adresse)}, ${esc(u.cp)} ${esc(u.ville)}${u.twimm?" · BI "+esc(u.twimm):""} — ${esc(u.why)}</div>`).join("")}</div>`:"");
  const fg=$("fixgo");if(fg)fg.onclick=()=>{document.querySelectorAll(".fixin").forEach(i=>{const v=i.value.trim();if(v)FIX[i.dataset.k]=v});ls.s("fix",FIX);compute()};
  box.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>act(b.dataset.act,+b.dataset.ri));
  plan.resources.forEach((R,ri)=>{if(R.stops.length)drawMap(R,ri)})}

function drawMap(R,ri){
  if(typeof L==="undefined"){$("map"+ri).innerHTML='<div class="msg">Carte indisponible.</div>';return}
  const map=L.map("map"+ri,{scrollWheelZoom:false});ST.maps.push(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© les contributeurs d’OpenStreetMap"}).addTo(map);
  const ll=p=>[p.lat,p.lng],line=(R.startPt?[R.startPt]:[]).concat(R.stops.map(s=>s.pt),R.endPt?[R.endPt]:[]);
  L.polyline(line.map(ll),{color:"#d41c1c",weight:3,opacity:.7,dashArray:"6 6"}).addTo(map);
  if(R.startPt)L.marker(ll(R.startPt),{icon:L.divIcon({className:"mk home",html:"<span>D</span>",iconSize:[28,28]}),title:"Départ"}).addTo(map);
  R.stops.forEach((s,i)=>L.marker(ll(s.pt),{icon:L.divIcon({className:"mk",html:`<span>${i+1}</span>`,iconSize:[28,28]}),title:s.adresse}).addTo(map));
  map.fitBounds(L.latLngBounds(line.map(ll)),{padding:[24,24]})}

function act(a,ri){
  const R=ST.plan&&ST.plan.resources[ri];
  if(a==="print")return window.print();
  if(!R)return;
  if(a==="field")return openField(ri,0);
  if(a==="share")return shareOrCopy("Tournée "+(R.tech||"")+" "+EXP.dfr(R.date),EXP.shareText(R),"rm"+ri);
  if(a==="ics")return download(`tournee_${R.date}${R.tech?"_"+R.tech.replace(/\W+/g,""):""}.ics`,EXP.ics({id:ST.plan.id,resources:[R]}),"text/calendar;charset=utf-8")}
