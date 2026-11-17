// Assemble src/ + Leaflet dans un seul index.html, et copie les fichiers de l'application installable (public/).
// La page ne contient que du code : aucune donnée, aucun mot de passe.
import fs from "node:fs";import path from "node:path";import crypto from "node:crypto";import {fileURLToPath} from "node:url";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const out=process.env.OUT_DIR||root;
const rd=f=>fs.readFileSync(path.join(root,f),"utf8");
const safe=s=>s.replace(/<\/script/gi,"<\\/script");
const place=(t,k,v)=>t.replace(`/*@${k}@*/`,()=>v);
const app=fs.readdirSync(path.join(root,"src/js")).filter(f=>f.endsWith(".js")).sort().map(f=>rd("src/js/"+f)).join("\n");
let page=rd("src/template.html");
page=place(page,"CSS",rd("src/style.css"));
page=place(page,"LEAFLETCSS",rd("vendor/leaflet.css"));
page=place(page,"LEAFLET",safe(rd("vendor/leaflet.js")));
page=place(page,"APP",safe(app));
if(/\/\*@\w+@\*\//.test(page)){console.error("Marqueur non remplacé dans le gabarit.");process.exit(1)}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,"index.html"),page);
const version=crypto.createHash("sha1").update(page).digest("hex").slice(0,8);
for(const f of fs.readdirSync(path.join(root,"public"))){
  const src=path.join(root,"public",f);
  if(f==="sw.js")fs.writeFileSync(path.join(out,f),fs.readFileSync(src,"utf8").replace("__VERSION__",version));
  else fs.copyFileSync(src,path.join(out,f))}
console.log(`index.html écrit (${Math.round(page.length/1024)} Ko), version ${version}`);
