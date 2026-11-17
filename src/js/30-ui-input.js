// ---------- saisie : techniciens, options de la journée, interventions ----------
const OPTS=["mdays","mwk","mstart","mend","mdur","mfrom","mto","mdepot"];
function loadOpts(){const o=ls.g("opts")||{};OPTS.forEach(k=>{if(o[k]==null)return;if($(k).type==="checkbox")$(k).checked=!!o[k];else $(k).value=o[k]})}
function saveOpts(){const o={};OPTS.forEach(k=>o[k]=$(k).type==="checkbox"?$(k).checked:$(k).value);ls.s("opts",o)}
OPTS.forEach(k=>$(k).onchange=saveOpts);loadOpts();
$("mdate").value=iso(new Date());

// techniciens : prénom + domicile, mémorisés localement (jamais sur la fiche)
function trowHtml(t){return`<div class="trow"><input class="tn" list="names" placeholder="Prénom" value="${esc(t.n)}" autocomplete="off"><input class="th" placeholder="Domicile : n° rue, code postal, ville" value="${esc(t.h)}" autocomplete="off"><button class="tx" title="Retirer" aria-label="Retirer ce technicien">✕</button></div>`}
function readRows(){return[...document.querySelectorAll("#trows .trow")].map(r=>({n:normName(r.querySelector(".tn").value),h:r.querySelector(".th").value.trim()}))}
function saveRows(){ls.s("trows",readRows().filter(t=>t.n||t.h))}
function drawRows(rows){
  $("trows").innerHTML=rows.map(trowHtml).join("");
  $("names").innerHTML=readRows().map(t=>t.n).filter(Boolean).map(n=>`<option value="${esc(n)}">`).join("");
  document.querySelectorAll("#trows .trow").forEach(r=>{
    r.querySelector(".tn").onchange=r.querySelector(".th").onchange=saveRows;
    r.querySelector(".tx").onclick=()=>{const rs=readRows();rs.splice([...$("trows").children].indexOf(r),1);drawRows(rs.length?rs:[{n:"",h:""}]);saveRows()}})}
$("tadd").onclick=()=>drawRows(readRows().concat([{n:"",h:""}]));
drawRows((ls.g("trows")||[]).length?ls.g("trows"):[{n:"",h:""}]);

// dates de la période : à partir du premier jour, N jours (ouvrés si demandé)
function horizon(){
  const out=[],n=Math.max(1,Math.min(10,+$("mdays").value||1));let d=new Date($("mdate").value+"T12:00:00");if(isNaN(d))d=new Date();
  for(let g=0;out.length<n&&g<60;g++){const w=d.getDay();if(!$("mwk").checked||(w>0&&w<6))out.push(iso(d));d=new Date(d.getTime()+86400000)}
  return out}

// ---- liste des interventions lues dans l'export ----
function slotTxt(u){const s=(u.slots||[])[0];if(!s)return"";return`prévu le ${EXP.dfr(s.date)} ${EXP.hm(s.start)}–${EXP.hm(s.end)}${s.tech?" · "+s.tech:""}${u.slots.length>1?` (+${u.slots.length-1})`:""}`}
function mrender(){
  $("mpick").classList.toggle("hide",!ST.units.length);
  $("mlist").innerHTML=ST.units.map((a,i)=>`<label class="irow ${a.quality==="ok"?"ready":"check"}" style="display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--tx)">
    <input type="checkbox" data-i="${i}" ${a.sel?"checked":""}><span class="itxt"><b>${esc(a.adresse)}, ${esc(a.cp)} ${esc(a.ville)}</b>${a.etage||a.porte?` · ét. ${esc(a.etage||"?")} · porte ${esc(a.porte||"?")}`:""}
    <small>${esc([a.twimm&&"BI "+a.twimm,a.type,a.statut].filter(Boolean).join(" · "))}</small>
    ${slotTxt(a)?`<small>${esc(slotTxt(a))}</small>`:""}
    ${a.quality==="site"?'<small class="warn">adresse du site (position approximative)</small>':""}${a.quality==="multi"?'<small class="warn">plusieurs adresses dans l’objet : première adresse seulement</small>':""}</span></label>`).join("");
  $("mlist").querySelectorAll("input").forEach(c=>c.onchange=()=>{ST.units[+c.dataset.i].sel=c.checked})}
$("mall").onclick=()=>{ST.units.forEach(a=>a.sel=true);mrender()};
$("mnone").onclick=()=>{ST.units.forEach(a=>a.sel=false);mrender()};

$("mcsv").onchange=async ev=>{
  const f=ev.target.files[0];if(!f)return;msg("mmsg","Lecture du fichier…");
  try{
    const rows=TW.parseCSV(TW.decode(await f.arrayBuffer()));
    if(!rows.length||!("ntwimm" in rows[0])||!("objet" in rows[0]))throw new Error("ce fichier ne ressemble pas à un export twimm (colonnes « N° twimm » et « Objet » introuvables).");
    const seen=new Set();let skipped=0;ST.units=[];
    rows.forEach((r,i)=>{if(!(r.ntwimm||"").trim())return;const a=MAPC.fromRow(r);if(!a){skipped++;return}
      if(seen.has(a.twimm))return;seen.add(a.twimm);a.idx=i;a.sel=!/annul/i.test(a.statut);ST.units.push(a)});
    // période : si rien n'est prévu aujourd'hui, on se place sur le jour le plus chargé de l'export
    const cnt={};ST.units.forEach(u=>(u.slots||[]).forEach(s=>cnt[s.date]=(cnt[s.date]||0)+1));
    const today=iso(new Date());let note="";
    if(!cnt[today]&&Object.keys(cnt).length){const best=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]||(a<b?-1:1))[0];$("mdate").value=best;note=` Premier jour réglé sur le ${EXP.dfr(best)} (le plus chargé de l’export).`}
    msg("mmsg",`${f.name} : ${ST.units.length} intervention(s) avec adresse${skipped?`, ${skipped} sans adresse exploitable (ignorée(s))`:""}.${note}`,"ok");mrender()}
  catch(e){msg("mmsg","Erreur : "+e.message,"err")}};
