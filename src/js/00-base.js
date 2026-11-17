// ---------- outils de base ----------
const $=id=>document.getElementById(id);
const ls={g(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},d(k){try{localStorage.removeItem(k)}catch(e){}}};
const normName=v=>(v||"").trim().replace(/\s+/g," ").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const toSec=v=>{const m=/^(\d{1,2}):(\d{2})/.exec(v||"");return m?(+m[1])*3600+(+m[2])*60:null};
const fmtKm=m=>{const k=m/1000;return k.toFixed(k<10?1:0).replace(".",",")+" km"};
const fmtMin=s=>{const m=Math.round(s/60);return m<60?m+" min":Math.floor(m/60)+" h "+String(m%60).padStart(2,"0")};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// état commun : unités lues (export ou saisie), dernier plan calculé
const ST={units:[],plan:null,maps:[]};
const msg=(id,t,c)=>{const m=$(id);if(m){m.className="msg "+(c||"");m.textContent=t}};
function download(name,text,type){const a=document.createElement("a"),u=URL.createObjectURL(new Blob([text],{type:type||"text/plain;charset=utf-8"}));
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
async function shareOrCopy(title,text,statusId){
  try{if(navigator.share){await navigator.share({title,text});return}}catch(e){if(e&&e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text);msg(statusId,"Texte copié : colle-le dans un message ou un e-mail.","ok")}
  catch(e){msg(statusId,"Copie impossible sur cet appareil.","err")}}
