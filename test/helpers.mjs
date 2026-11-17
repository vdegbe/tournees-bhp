// Charge les modules purs (lecture twimm, calculs de tournée) pour les tester sous Node.
import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const rd=f=>fs.readFileSync(path.join(root,"src/js",f),"utf8");
export const TW=new Function(rd("10-twimm.js")+";return TW;")();
export const MAPC=new Function("TW",rd("20-map-core.js")+";return MAPC;")(TW);
