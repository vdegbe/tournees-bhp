// Assemble src/ + Leaflet dans un seul index.html (aucune donnée privée : la page ne contient que du code).
import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
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
fs.writeFileSync(process.env.OUT||path.join(root,"index.html"),page);
console.log(`index.html écrit (${Math.round(page.length/1024)} Ko)`);
