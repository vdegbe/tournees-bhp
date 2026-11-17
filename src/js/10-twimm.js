// ---------- lecture de l'export twimm (CSV) : colonnes, adresse du logement, étage et porte ----------
const TW=(()=>{
const strip=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"");
const clean=s=>strip(s).replace(/[’‘`´]/g,"'").replace(/[ \t]+/g," ").replace(/\s+/g," ").trim();
const hkey=s=>strip(s).toLowerCase().replace(/[^a-z0-9]/g,"");

function decode(buf){
  try{return new TextDecoder("utf-8",{fatal:true}).decode(buf)}
  catch(e){return new TextDecoder("windows-1252").decode(buf)}}

function parseCSV(t){
  t=t.replace(/^﻿/,"");
  const first=t.split(/\r?\n/)[0]||"";
  const sep=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?";":",";
  const rows=[];let row=[],f="",q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;
    else if(c===sep){row.push(f);f=""}
    else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";if(row.some(x=>x!==""))rows.push(row);row=[]}
    else f+=c}
  if(f!==""||row.length){row.push(f);if(row.some(x=>x!==""))rows.push(row)}
  if(!rows.length)return[];
  const keys=rows[0].map(hkey);
  return rows.slice(1).map(r=>{const o={};keys.forEach((k,i)=>{if(!(k in o))o[k]=(r[i]||"").replace(/\r/g,"")});return o})}

// ---- adresse / étage / porte ----
const TYPES="RUE|AVENUE|AV|ALLEE|ALLEES|ALL|BOULEVARD|BD|BLD|BVD|PLACE|PL|IMPASSE|IMP|CHEMIN|CHE|ROUTE|RTE|SQUARE|SQ|RESIDENCE|RES|MAIL|PASSAGE|PROMENADE|HAMEAU|VILLA|COURS|QUAI|SENTIER|DOMAINE|PLATEAU|CITE|PARC|RUELLE|CIRCEE|CLOS|PD|PONT|ESPLANADE|PARVIS|VOIE|LOTISSEMENT|TRAVERSE|VENELLE|FAUBOURG|FG|GRAND RUE|ROND POINT";
const RE_STREET=new RegExp("(?<![\\w])(\\d{1,3}(?:\\s?(?:BIS|TER|QUATER|[A-Z]))?(?:-\\d{1,3})?)\\s+((?:"+TYPES+")\\b.*)$");
const RE_CUT=/\s(?:RDC|ETG|ETAGE|\d{1,2}\s?(?:E|EME|ER|IEME)\s?(?:ETAGE|ETG)|PTE|PORTE(?!\s(?:DE|DU|DES|D')\b)|APPT|APT|LOGT|LOGEMENT|GAUCHE|DROITE|EX|ESC)\b.*$/;
function findAddress(region){
  let r=region.trim().replace(/^[-–:•,\s]+/,"");
  let m=RE_STREET.exec(r);let addr="",at=-1;
  if(m){addr=(m[1]+" "+m[2]);at=m.index}
  else{ // sans type de voie : dernier "n° MOTS" de la zone
    const m2=/(\d{1,3}(?:\s?(?:BIS|TER|[A-Z]))?)\s+([A-Z][A-Z' .\-_0-9]*)$/.exec(r);
    if(m2){addr=m2[1]+" "+m2[2];at=m2.index}}
  if(!addr)return null;
  addr=addr.replace(RE_CUT,"").replace(/[_\s]*(?:BATIMENT|BAT|BT)(?:\s+[A-Z0-9]{1,3})?\s*$/,"").replace(/_\d+\s*$/,"").replace(/\s+/g," ").trim();
  return{addr,at}}

function findEtagePorte(rest){
  let e="",p="";
  let m=/\b(?:ETG|ETAGE|ETAG)\s*[:\-.]?\s*(\d{1,2}|RDC)\b/.exec(rest)
    ||/\b(\d{1,2})\s?(?:E|EME|ER|IEME)\s?(?:ETAGE|ETG)\b/.exec(rest)
    ||/\bETAGE\s*(\d{1,2})\b/.exec(rest);
  if(m)e=m[1];else if(/\bRDC\b/.test(rest))e="RDC";
  e=e.replace(/^0+(?=\d)/,"");
  m=/\b(?:PORTE|PTE|APPT|APT|APPARTEMENT)\s*[:\-.N°]*\s*((?:[A-Z]{0,2}\d[A-Z0-9\-]*|GAUCHE|DROITE|FACE)(?:\s(?:GAUCHE|DROITE))?)\b/.exec(rest)
    ||/\b(?:LOGT|LOGEMENT)\s*[:\-.N°]*\s*([A-Z]{0,2}\d[A-Z0-9\-]*)\b/.exec(rest);
  if(m)p=m[1];
  else{const g=/\b(GAUCHE|DROITE)\b/.exec(rest);if(g)p=g[1]}
  return{etage:e,porte:p}}

return{decode,parseCSV,findAddress,findEtagePorte}})();
