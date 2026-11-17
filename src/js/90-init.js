// ---------- onglets et reprise de la dernière tournée ----------
function tab(n){[1,2,3].forEach(i=>{$("p"+i).classList.toggle("hide",i!==n);$("t"+i).classList.toggle("on",i===n)});if(n===2)drawBilan()}
[1,2,3].forEach(i=>$("t"+i).onclick=()=>tab(i));
(function restore(){
  const p=ls.g("plan");if(!p)return;
  if(Date.now()-new Date(p.at).getTime()>48*3600*1000){ls.d("plan");ls.d("units");ls.d("prog:"+p.id);return}   // conservation : 48 h
  $("mdate").value=p.dates[0];$("mdays").value=p.dates.length;
  ST.units=ls.g("units")||[];ST.units.forEach(u=>{u.pt=null});mrender();
  ST.fixList=[];renderPlan(p);
  msg("mmsg","Dernière tournée (calculée le "+new Date(p.at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})+") : disponible même sans réseau.","")})();
