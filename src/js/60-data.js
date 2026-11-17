// ---------- onglet Données : effacement, installation, hors ligne ----------
$("dclear").onclick=async()=>{
  if(!confirm("Effacer les domiciles, adresses mémorisées, tournées, corrections et le bilan de cet appareil ?"))return;
  try{localStorage.clear()}catch(e){}
  try{if(window.caches)for(const k of await caches.keys())await caches.delete(k)}catch(e){}
  msg("dmsg","Données effacées.","ok");setTimeout(()=>location.reload(),600)};
let installEv=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEv=e;$("dinstall").classList.remove("hide")});
$("dinstall").onclick=async()=>{if(!installEv)return;installEv.prompt();try{await installEv.userChoice}catch(e){}installEv=null;$("dinstall").classList.add("hide")};
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register("sw.js").catch(()=>{});
