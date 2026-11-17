// ---------- onglet Carte : tournée depuis le domicile, fiche du technicien ----------
const MP={all:[],map:null};
const mmsg=(t,c)=>{const m=$("mmsg");m.className="msg "+(c||"");m.textContent=t};
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const homeKey=()=>"home:"+normName($("mtech").value).toLowerCase();

$("mtech").oninput=()=>{$("mhome").value=ls.g(homeKey())||""};
$("mtech").onchange=$("mtech").oninput;
$("mhome").onchange=()=>{const h=$("mhome").value.trim();if(normName($("mtech").value))ls.s(homeKey(),h)};
const techs=ls.g("techs")||[];
$("names").innerHTML=techs.map(n=>`<option value="${esc(n)}">`).join("");
$("mtech").value=ls.g("tech")||"";$("mtech").oninput();

function mlabel(a){return `${esc(a.adresse)}, ${esc(a.cp)} ${esc(a.ville)}`}
function mrender(){
  $("mpick").classList.toggle("hide",!MP.all.length);
  $("mlist").innerHTML=MP.all.map((a,i)=>`<label class="irow ${a.quality==="site"?"check":"ready"}" style="display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--tx)">
    <input type="checkbox" data-i="${i}" ${a.sel?"checked":""}><span class="itxt"><b>${mlabel(a)}</b>${a.etage||a.porte?` · ét. ${esc(a.etage||"?")} · porte ${esc(a.porte||"?")}`:""}
    <small>${esc([a.twimm&&"BI "+a.twimm,a.type,a.statut].filter(Boolean).join(" · "))}${a.quality==="site"?' · <span class="warn">adresse du site (position approximative)</span>':""}${a.quality==="multi"?' · <span class="warn">plusieurs adresses dans l’objet : première adresse seulement</span>':""}</small></span></label>`).join("");
  $("mlist").querySelectorAll("input").forEach(c=>c.onchange=()=>{MP.all[+c.dataset.i].sel=c.checked})}
$("mall").onclick=()=>{MP.all.forEach(a=>a.sel=true);mrender()};
$("mnone").onclick=()=>{MP.all.forEach(a=>a.sel=false);mrender()};

$("mcsv").onchange=async ev=>{
  const f=ev.target.files[0];if(!f)return;mmsg("Lecture du fichier…");
  try{
    const rows=TW.parseCSV(TW.decode(await f.arrayBuffer()));
    if(!rows.length||!("ntwimm" in rows[0])||!("objet" in rows[0]))throw new Error("ce fichier ne ressemble pas à un export twimm (colonnes « N° twimm » et « Objet » introuvables).");
    const seen=new Set();let skipped=0;MP.all=[];
    rows.forEach(r=>{if(!(r.ntwimm||"").trim())return;const a=MAPC.fromRow(r);if(!a){skipped++;return}
      if(seen.has(a.twimm))return;seen.add(a.twimm);a.sel=!/annul/i.test(a.statut);MP.all.push(a)});
    mmsg(`${f.name} : ${MP.all.length} intervention(s) avec adresse${skipped?`, ${skipped} sans adresse exploitable (ignorée(s))`:""}. Décoche celles qui ne sont pas pour cette tournée.`,"ok");mrender()}
  catch(e){mmsg("Erreur : "+e.message,"err")}};

// ---- service d'adresses de l'État, avec mémoire locale pour ne pas redemander la même adresse ----
const geoCache=ls.g("geo")||{};
async function geocode(a){
  const k=MAPC.queryOf(a).toUpperCase();if(geoCache[k])return geoCache[k];
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),10000);
  try{const r=await fetch(MAPC.geoUrl(a),{signal:ctl.signal});if(!r.ok)throw new Error("HTTP "+r.status);
    const p=MAPC.geoPick(await r.json());if(p){geoCache[k]=p;ls.s("geo",geoCache)}return p}
  finally{clearTimeout(t)}}
async function geocodeAll(list,progress){
  let done=0,idx=0,failed=false;
  const worker=async()=>{while(idx<list.length){const a=list[idx++];
    try{a.pt=await geocode(a)}catch(e){a.pt=null;a.err=true;failed=true}
    progress(++done,list.length)}};
  await Promise.all([worker(),worker(),worker(),worker()]);return failed}

const km=x=>x.toFixed(x<10?1:0).replace(".",",")+" km";
function mdraw(home,placed,order,lost){
  const tech=normName($("mtech").value);
  $("mfiche").classList.remove("hide");
  $("mtitle").textContent=`Tournée${tech?" de "+tech:""} · ${placed.length} arrêt(s)`;
  const pts=placed.map(a=>a.pt);let prev=home,tot=0;
  const legs=order.map(i=>{const d=MAPC.roadKm(MAPC.hav(prev,pts[i]));prev=pts[i];tot+=d;return d});
  const back=MAPC.roadKm(MAPC.hav(prev,home));tot+=back;
  $("msum").innerHTML=`Environ ${km(tot)} par la route, aller-retour depuis le domicile (estimation).`;
  $("mtour").innerHTML="";
  MAPC.gTour(home,pts,order).forEach((u,i,all)=>{const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener";a.className="btnlink";
    a.textContent=all.length>1?`Google Maps · partie ${i+1}/${all.length}`:"Itinéraire complet (Google Maps)";$("mtour").appendChild(a)});
  $("mstops").innerHTML=order.map((i,n)=>{const a=placed[i];
    const warn=[];if(a.quality==="site")warn.push("adresse du site : position approximative");
    if(a.quality==="multi")warn.push("l’objet cite plusieurs adresses : première adresse seulement, à compléter");
    if(a.pt.score<0.5)warn.push("adresse mal reconnue : à vérifier sur place");
    return `<div class="card stop"><div class="ihead"><span class="num">${n+1}</span><div class="itxt"><b>${mlabel(a)}</b>
      ${a.etage||a.porte?`<div>Étage ${esc(a.etage||"?")} · Porte ${esc(a.porte||"?")}</div>`:""}
      <small>${esc([a.twimm&&"BI "+a.twimm,a.type,a.site,a.client].filter(Boolean).join(" · "))}</small>
      ${a.consigne?`<small>Consigne : ${esc(a.consigne)}</small>`:""}
      ${warn.map(w=>`<small class="warn">${esc(w)}</small>`).join("")}
      <small>${n===0?"Depuis le domicile":"Depuis l’arrêt précédent"} : environ ${km(legs[n])}</small></div></div>
      <div class="tools noprint"><a class="btnlink" target="_blank" rel="noopener" href="${MAPC.gStop(a.pt)}">Y aller · Google Maps</a><a class="btnlink" target="_blank" rel="noopener" href="${MAPC.wazeStop(a.pt)}">Waze</a></div></div>`}).join("")+
    (lost.length?`<div class="card"><b>Adresses non placées (à ajouter à la main)</b>${lost.map(a=>`<div class="rs" style="margin-left:0">${mlabel(a)}${a.twimm?" · BI "+esc(a.twimm):""}</div>`).join("")}</div>`:"");
  // carte
  if(typeof L==="undefined"){$("mmap").innerHTML='<div class="msg">Carte indisponible (bibliothèque non chargée).</div>';return}
  if(MP.map){MP.map.remove();MP.map=null}
  const map=MP.map=L.map("mmap",{scrollWheelZoom:false});
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© les contributeurs d’OpenStreetMap"}).addTo(map);
  const ll=p=>[p.lat,p.lng];
  L.polyline([ll(home)].concat(order.map(i=>ll(pts[i])),[ll(home)]),{color:"#d41c1c",weight:3,opacity:.7,dashArray:"6 6"}).addTo(map);
  L.marker(ll(home),{icon:L.divIcon({className:"mk home",html:"<span>D</span>",iconSize:[28,28]}),title:"Domicile"}).addTo(map);
  order.forEach((i,n)=>L.marker(ll(pts[i]),{icon:L.divIcon({className:"mk",html:`<span>${n+1}</span>`,iconSize:[28,28]}),title:placed[i].adresse}).addTo(map));
  map.fitBounds(L.latLngBounds([ll(home)].concat(pts.map(ll))),{padding:[24,24]})}

$("mgo").onclick=async()=>{
  const h=$("mhome").value.trim(),tech=normName($("mtech").value);
  const list=MP.all.filter(a=>a.sel).concat(MAPC.fromPaste($("mpaste").value));
  if(h.length<6){mmsg("Indique le domicile du technicien (départ et retour).","err");return}
  if(!list.length){mmsg("Aucune adresse : importe l’export twimm ou colle des adresses.","err");return}
  if(tech){ls.s(homeKey(),h);ls.s("tech",tech);if(!techs.includes(tech)){techs.push(tech);ls.s("techs",techs)}}
  $("mgo").disabled=true;
  try{
    const homeA=MAPC.fromPaste(h)[0];
    mmsg("Localisation du domicile…");
    let hp=null;try{hp=await geocode(homeA)}catch(e){}
    if(!hp){mmsg("Domicile introuvable : vérifie l’adresse (numéro, rue, code postal, ville) et la connexion.","err");return}
    const failed=await geocodeAll(list,(d,n)=>mmsg(`Localisation des adresses ${d}/${n}…`));
    const placed=list.filter(a=>a.pt),lost=list.filter(a=>!a.pt);
    if(!placed.length){mmsg(failed?"Le service d’adresses ne répond pas : vérifie la connexion et réessaie.":"Aucune adresse reconnue.","err");return}
    mdraw(hp,placed,MAPC.plan(hp,placed.map(a=>a.pt)),lost);
    mmsg(`${placed.length} adresse(s) placée(s)${lost.length?`, ${lost.length} non reconnue(s)`:""}${failed?" (certaines n’ont pas pu être interrogées : réessaie)":""}.`,lost.length||failed?"":"ok")}
  catch(e){mmsg("Erreur : "+e.message,"err")}
  finally{$("mgo").disabled=false}};
$("mprint").onclick=()=>window.print();
