// ---------- carte : adresses, ordre de passage, liens (fonctions pures, sans réseau) ----------
// Dépend de : TW (10-twimm.js)
const MAPC=(()=>{
const U2=s=>(s||"").toString().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’‘`´]/g,"'").replace(/\s+/g," ").trim().toUpperCase();

// « 10 T RUE… » → « 10 TER RUE… » (le service d'adresses comprend bis/ter, pas T/B)
const RE_NEXT=/\s(?=\d[\d\-]*\s+(?:RUE|AVENUE|ALLEE|PLACE|BOULEVARD|IMPASSE|SQUARE|CHEMIN|ROUTE|COURS|QUAI)\b)/;
function fixNum(a){return a.replace(/_/g," ").split(RE_NEXT)[0].replace(/\s+(?:LGT|LOGT|LGMT)\s*\d.*$/,"").replace(/\s+-\s*[\dA-Z][\dA-Z\-]*$/,"").replace(/^(\d+)(BIS|TER|QUATER)\b/,"$1 $2").replace(/^(\d+)\s?T\b/,"$1 TER").replace(/^(\d+)\s?B\b/,"$1 BIS").replace(/^(\d+)\s?Q\b/,"$1 QUATER").replace(/\s+/g," ").trim()}

// Une ligne de l'export twimm → un arrêt. Adresse du logement lue dans l'« Objet » (comme l'import des certificats),
// à défaut l'adresse du site, signalée comme approximative. Les coordonnées des locataires ne sont jamais reprises.
function fromRow(r){
  const obj=U2(r.objet);
  const m=/(\d{5})\s+([A-Z][A-Z0-9' \-]*?)\s*$/.exec(obj);
  const region=m?obj.slice(0,m.index):obj;
  const fa=TW.findAddress(region);
  const ep=TW.findEtagePorte(region);
  let adresse="",cp="",ville="",quality="ok";
  if(fa){adresse=fixNum(fa.addr);if(RE_NEXT.test(fa.addr.replace(/_/g," ")))quality="multi";cp=m?m[1]:(r.cpsite||"").trim();ville=m?m[2]:U2(r.ville)}
  else if(U2(r.adressesite)){adresse=fixNum(U2(r.adressesite));cp=(r.cpsite||"").trim();ville=U2(r.ville);quality="site"}
  if(!adresse||!/^\d{5}$/.test(cp))return null;
  const client=(r.client||"").split(/\r?\n/)[0].trim();
  return{twimm:(r.ntwimm||"").trim(),type:(r.type||"").trim(),site:(r.nomsite||"").trim(),client,
    adresse,cp,ville:U2(ville),etage:ep.etage,porte:ep.porte,quality,
    consigne:(r.contraintes||"").replace(/\s+/g," ").trim(),statut:(r.statut||"").trim()}}

// Adresses collées à la main : une par ligne, « adresse CP ville | note facultative »
function fromPaste(text){
  return String(text||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{
    const [a,...n]=l.split("|");const full=a.trim().replace(/\s+/g," ");
    const m=/(\d{5})\s+(.+)$/.exec(full);
    return{twimm:"",type:"",site:"",client:"",adresse:m?full.slice(0,m.index).trim():full,cp:m?m[1]:"",ville:m?U2(m[2]):"",etage:"",porte:"",quality:"ok",consigne:n.join("|").trim(),statut:"",full}})}

const queryOf=a=>a.full||[a.adresse,a.cp,a.ville].filter(Boolean).join(" ");
const geoUrl=a=>"https://api-adresse.data.gouv.fr/search/?limit=1&q="+encodeURIComponent(queryOf(a))+(/^\d{5}$/.test(a.cp)?"&postcode="+a.cp:"");
// Réponse du service d'adresses (GeoJSON) → point, ou null. Un score faible = position approximative.
function geoPick(j){
  const f=j&&j.features&&j.features[0];if(!f||!f.geometry)return null;
  const [lng,lat]=f.geometry.coordinates,sc=f.properties&&f.properties.score;
  if(!isFinite(lat)||!isFinite(lng))return null;
  return{lat,lng,score:typeof sc==="number"?sc:0,label:(f.properties&&f.properties.label)||""}}

// ---- ordre de passage : départ et retour au domicile ----
const R=6371;
function hav(a,b){const t=Math.PI/180,dl=(b.lat-a.lat)*t,dn=(b.lng-a.lng)*t;
  const x=Math.sin(dl/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function loopLen(home,pts,order){let d=0,p=home;for(const i of order){d+=hav(p,pts[i]);p=pts[i]}return d+hav(p,home)}
function nearest(home,pts){const left=new Set(pts.map((_,i)=>i));const o=[];let p=home;
  while(left.size){let b=-1,bd=Infinity;for(const i of left){const d=hav(p,pts[i]);if(d<bd){bd=d;b=i}}o.push(b);left.delete(b);p=pts[b]}return o}
// plus proche voisin, puis améliorations 2-opt : retourne les indices dans l'ordre de visite
function plan(home,pts){
  let order=nearest(home,pts);const n=order.length;if(n<3)return order;
  let best=loopLen(home,pts,order),again=true,guard=0;
  while(again&&guard++<60){again=false;
    for(let i=0;i<n-1;i++)for(let k=i+1;k<n;k++){
      const c=order.slice(0,i).concat(order.slice(i,k+1).reverse(),order.slice(k+1));
      const l=loopLen(home,pts,c);if(l<best-1e-9){order=c;best=l;again=true}}}
  return order}
// à vol d'oiseau × 1,3 : estimation de la distance par la route
const roadKm=k=>k*1.3;

// ---- liens vers les applications de navigation ----
const q=p=>p.lat.toFixed(6)+","+p.lng.toFixed(6);
const gStop=p=>"https://www.google.com/maps/dir/?api=1&travelmode=driving&destination="+q(p);
const wazeStop=p=>"https://waze.com/ul?navigate=yes&ll="+q(p);
// Google Maps accepte 9 étapes par lien : la tournée est découpée en parties
function gTour(home,pts,order){
  const stops=order.map(i=>pts[i]),out=[];
  for(let i=0;i<stops.length;i+=9){
    const part=stops.slice(i,i+9),last=i+9>=stops.length;
    const origin=i===0?home:stops[i-1],dest=last?home:part[part.length-1],way=last?part:part.slice(0,-1);
    out.push("https://www.google.com/maps/dir/?api=1&travelmode=driving&origin="+q(origin)+"&destination="+q(dest)+(way.length?"&waypoints="+encodeURIComponent(way.map(q).join("|")):""))}
  return out}

return{fromRow,fromPaste,queryOf,geoUrl,geoPick,hav,loopLen,plan,roadKm,gStop,wazeStop,gTour,fixNum}})();
