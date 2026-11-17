// ---------- outils de base ----------
const $=id=>document.getElementById(id);
const ls={g(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const normName=v=>(v||"").trim().replace(/\s+/g," ").toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase());
