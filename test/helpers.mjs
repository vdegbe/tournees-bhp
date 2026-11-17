// Charge les modules purs (lecture twimm, calculs, planification, exports) pour les tester sous Node.
import fs from "node:fs";import path from "node:path";import {fileURLToPath} from "node:url";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const rd=f=>fs.readFileSync(path.join(root,"src/js",f),"utf8");
export const TW=new Function(rd("10-twimm.js")+";return TW;")();
export const MAPC=new Function("TW",rd("20-map-core.js")+";return MAPC;")(TW);
export const SCH=new Function("TW",rd("25-sched.js")+";return SCH;")(TW);
export const EXP=new Function(rd("26-export.js")+";return EXP;")();
