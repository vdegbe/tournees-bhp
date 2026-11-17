// ---------- onglet Bilan : économies cumulées (mémorisées sur cet appareil, sans adresse) ----------
function drawBilan(){
  const st=ls.g("stats")||[],c=COST(),mo=EXP.byMonth(st),t=EXP.sum(mo);
  $("cl").value=c.l100||"";$("cp").value=c.price||"";$("ch").value=c.hourly||"";
  if(!st.length){$("bsum").textContent="Aucune tournée calculée pour l’instant.";$("bmonths").innerHTML="";return}
  const k=EXP.cost(t,c),dm=t.mBase-t.mOpt;
  $("bsum").innerHTML=`${t.n} tournée(s) · ${t.stops} arrêt(s)<br>Distance : ${fmtKm(t.mBase)} dans l’ordre de l’export → <b>${fmtKm(t.mOpt)}</b> calculé (${dm>=0?"−":"+"}${fmtKm(Math.abs(dm))}).<br>Temps de route économisé : <b>${fmtMin(Math.max(0,t.sBase-t.sOpt))}</b>.`+
    (k.fuel!=null?`<br>Carburant : environ <b>${k.fuel.toFixed(2).replace(".",",")} €</b>.`:"")+(k.labour!=null?`<br>Temps de technicien : environ <b>${k.labour.toFixed(2).replace(".",",")} €</b>.`:"");
  $("bmonths").innerHTML=`<table class="mo"><tr><th>Mois</th><th>Tournées</th><th>Arrêts</th><th>Km export</th><th>Km calculés</th></tr>${mo.map(o=>`<tr><td>${esc(o.month)}</td><td>${o.n}</td><td>${o.stops}</td><td>${(o.mBase/1000).toFixed(0)}</td><td>${(o.mOpt/1000).toFixed(0)}</td></tr>`).join("")}</table>`}
["cl","cp","ch"].forEach(i=>$(i).onchange=()=>{ls.s("cost",{l100:+$("cl").value||0,price:+$("cp").value||0,hourly:+$("ch").value||0});drawBilan()});
$("bcsv").onclick=()=>{const s=ls.g("stats")||[];if(!s.length)return;download("bilan_tournees.csv",EXP.csv(s),"text/csv;charset=utf-8")};
