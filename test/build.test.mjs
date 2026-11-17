import test from "node:test";import assert from "node:assert/strict";
import fs from "node:fs";import os from "node:os";import path from "node:path";import {spawnSync} from "node:child_process";import {fileURLToPath} from "node:url";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),"..");
const build=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),"tb-"));
  const r=spawnSync(process.execPath,["build/build.mjs"],{cwd:root,env:{...process.env,OUT_DIR:d},encoding:"utf8"});
  assert.equal(r.status,0,r.stderr);return d};

test("les fichiers générés (index.html, sw.js) correspondent aux sources : pensez à lancer « npm run build »",()=>{
  const d=build();
  for(const f of ["index.html","sw.js","manifest.webmanifest","icon-192.png","icon-512.png"])
    assert.ok(Buffer.compare(fs.readFileSync(path.join(d,f)),fs.readFileSync(path.join(root,f)))===0,f+" n'est pas à jour")});

test("application installable : manifeste lié, version du cache renseignée, aucun marqueur oublié",()=>{
  const d=build(),html=fs.readFileSync(path.join(d,"index.html"),"utf8"),sw=fs.readFileSync(path.join(d,"sw.js"),"utf8");
  assert.match(html,/<link rel="manifest" href="manifest\.webmanifest">/);assert.ok(!/\/\*@\w+@\*\//.test(html));
  assert.match(sw,/tournees-[0-9a-f]{8}/);assert.ok(!sw.includes("__VERSION__"));
  const m=JSON.parse(fs.readFileSync(path.join(d,"manifest.webmanifest"),"utf8"));assert.equal(m.display,"standalone");
  for(const i of m.icons)assert.ok(fs.existsSync(path.join(d,i.src)))});

test("politique de sécurité : le code n'appelle que les services déclarés, et la page ne contient aucune donnée",()=>{
  const html=fs.readFileSync(path.join(root,"src/template.html"),"utf8");
  const csp=/Content-Security-Policy" content="([^"]+)"/.exec(html)[1];
  const code=fs.readdirSync(path.join(root,"src/js")).map(f=>fs.readFileSync(path.join(root,"src/js",f),"utf8")).join("\n");
  const navOnly=new Set(["www.google.com","waze.com"]);   // liens ouverts par l'utilisateur, pas des requêtes de la page
  const hosts=new Set([...code.matchAll(/https:\/\/([a-z0-9.\-]+)/g)].map(m=>m[1]).filter(h=>!navOnly.has(h)));
  assert.deepEqual([...hosts].sort(),["api-adresse.data.gouv.fr","router.project-osrm.org","tile.openstreetmap.org"]);
  for(const h of hosts)assert.ok(csp.includes(h),h+" absent de la politique");
  assert.match(csp,/default-src 'none'/);assert.ok(!/script-src[^;]*https:/.test(csp));
  assert.ok(!fs.existsSync(path.join(root,"src/data")));   // aucun jeu de données dans le dépôt
  assert.ok(!fs.readdirSync(root).some(f=>/\.csv$/i.test(f)))});
