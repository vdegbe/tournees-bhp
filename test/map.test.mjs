import test from "node:test";import assert from "node:assert/strict";
import {MAPC,TW} from "./helpers.mjs";

const P=(lat,lng)=>({lat,lng});
const parse=o=>TW.parseCSV('"N° twimm";"Objet";"Client";"Type";"Nom Site";"Adresse Site";"CP Site";"Ville";"Contraintes";"Statut"\r\n'+
  [o].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n"))[0];

test("adresse du logement lue dans l'objet, avec étage et porte, sans les téléphones des locataires",()=>{
  const a=MAPC.fromRow(parse(["200001","TRAITEMENT CONTRE LES CAFARDS EN PARTIES PRIVATIVES MME DUPONT - 06 12 34 56 78 ETAGE 21 - PORTE 0313 10 T RUE DE LA PAIX 75015 PARIS 15","CLIENT TEST\n1 RUE X\n75000 PARIS","CAFARDS","TOUR TEST","8 RUE AUTRE","75015","PARIS 15","BHP // MR BOS - 01 02 03 04 05","Clôturé"]));
  assert.equal(a.adresse,"10 TER RUE DE LA PAIX");assert.equal(a.cp,"75015");assert.equal(a.ville,"PARIS 15");
  assert.equal(a.etage,"21");assert.equal(a.porte,"0313");assert.equal(a.quality,"ok");assert.equal(a.client,"CLIENT TEST");
  assert.ok(!JSON.stringify(a).includes("06 12 34 56 78")&&!JSON.stringify(a).includes("DUPONT"))});

test("sans adresse dans l'objet : adresse du site, marquée approximative ; sans rien : ligne ignorée",()=>{
  const a=MAPC.fromRow(parse(["200002","DERATISATION DES PARTIES COMMUNES","C","T","SITE","12 AVENUE DES TESTS","94000","CRETEIL","","Clôturé"]));
  assert.equal(a.adresse,"12 AVENUE DES TESTS");assert.equal(a.quality,"site");assert.equal(a.cp,"94000");
  assert.equal(MAPC.fromRow(parse(["200003","RIEN","C","T","S","","","","","x"])),null)});

test("adresses collées : une par ligne, note après la barre verticale",()=>{
  const l=MAPC.fromPaste("3 allée Plon et Nourrit 77100 Nanteuil les Meaux | code 1234\n\n5 rue du Parc 77000 Melun");
  assert.equal(l.length,2);assert.equal(l[0].cp,"77100");assert.equal(l[0].consigne,"code 1234");
  assert.match(MAPC.geoUrl(l[0]),/postcode=77100/)});

test("réponse du service d'adresses : point, score ; réponse vide = null",()=>{
  const p=MAPC.geoPick({features:[{geometry:{coordinates:[2.35,48.85]},properties:{score:0.93,label:"1 Rue X"}}]});
  assert.deepEqual([p.lat,p.lng,p.score],[48.85,2.35,0.93]);
  assert.equal(MAPC.geoPick({features:[]}),null);assert.equal(MAPC.geoPick(null),null)});

test("ordre de passage : sur une ligne, on avance puis on revient",()=>{
  const home=P(48.9,2.3),pts=[P(48.9,2.5),P(48.9,2.4),P(48.9,2.6),P(48.9,2.45)];
  assert.deepEqual(MAPC.plan(home,pts),[1,3,0,2])});

test("ordre de passage : permutation valide, jamais pire que le plus proche voisin, proche de l'optimum",()=>{
  let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const perms=a=>a.length<2?[a]:a.flatMap((x,i)=>perms(a.slice(0,i).concat(a.slice(i+1))).map(p=>[x,...p]));
  for(let t=0;t<12;t++){
    const home=P(48.8+rnd()*.2,2.2+rnd()*.3),pts=Array.from({length:6},()=>P(48.8+rnd()*.2,2.2+rnd()*.3));
    const o=MAPC.plan(home,pts);assert.deepEqual([...o].sort(),[0,1,2,3,4,5]);
    const best=Math.min(...perms([0,1,2,3,4,5]).map(p=>MAPC.loopLen(home,pts,p)));
    assert.ok(MAPC.loopLen(home,pts,o)<=best*1.1,"tournée trop longue")}
  assert.deepEqual(MAPC.plan(P(0,0),[]),[]);assert.deepEqual(MAPC.plan(P(0,0),[P(1,1)]),[0])});

test("liens : un arrêt, et la tournée découpée par 9 étapes avec retour au domicile",()=>{
  const home=P(48.9,2.3),pts=Array.from({length:12},(_,i)=>P(48.9+i/100,2.3+i/100));
  assert.match(MAPC.gStop(pts[0]),/destination=48\.900000,2\.300000/);
  assert.match(MAPC.wazeStop(pts[0]),/ll=48\.900000,2\.300000/);
  const t=MAPC.gTour(home,pts,pts.map((_,i)=>i),home);assert.equal(t.length,2);
  assert.ok(t[0].includes("origin=48.900000,2.300000"));
  assert.ok(t[1].includes("destination=48.900000,2.300000"));
  assert.equal(decodeURIComponent(t[0].split("waypoints=")[1]).split("|").length,8);
  assert.equal(MAPC.gTour(home,pts.slice(0,3),[0,1,2],home).length,1)});

test("adresses mal découpées : « 5TER », « LGT 7 », « - 03-306 », objet qui énumère tout un quartier",()=>{
  const r=o=>MAPC.fromRow(parse(["1",o,"C","T","S","","","","","x"]));
  assert.equal(r("TRAITEMENT LGT 7 5TER AVENUE PAUL VERLAINE LGT 7 94190 VILLENEUVE SAINT GEORGES").adresse,"5 TER AVENUE PAUL VERLAINE");
  assert.equal(r("RECHERCHE 21-23 rue PIERRE MAUROY - 03-306 75018 PARIS").adresse,"21-23 RUE PIERRE MAUROY");
  const m=r("MISE EN PLACE 13 SQUARE HELENE BOUCHER 2-4-6-8-10 ALLEE LOUIS BREGUET 1-3-5 ALLEE CLEMENT ADER 94310 ORLY");
  assert.equal(m.adresse,"13 SQUARE HELENE BOUCHER");assert.equal(m.quality,"multi")});
