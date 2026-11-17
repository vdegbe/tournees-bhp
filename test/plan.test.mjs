import test from "node:test";import assert from "node:assert/strict";
import {TW,MAPC,SCH,EXP} from "./helpers.mjs";

const H=3600;
const P=(lat,lng)=>({lat,lng});
const unit=(o={})=>({twimm:"1",type:"T",site:"",client:"",adresse:"1 RUE A",cp:"75001",ville:"PARIS",etage:"",porte:"",quality:"ok",consigne:"",slots:[],cwin:null,...o});

test("créneaux prévus alignés avec les techniciens ; consignes horaires ; noms partiels",()=>{
  const s=TW.slots({debutpassagesprevus:"24/07/2026 09:30:00\n07/08/2026 10:30:00",finpassagesprevus:"24/07/2026 11:00:00\n07/08/2026 11:00:00",passagesprevus:"Patrick MACHADO\nMathys Cherifi"});
  assert.deepEqual(s,[{date:"2026-07-24",start:34200,end:39600,tech:"Patrick MACHADO"},{date:"2026-08-07",start:37800,end:39600,tech:"Mathys Cherifi"}]);
  assert.deepEqual(TW.slots({debutpassagesprevus:"24/07/2026 09:30:00"})[0].end,34200+1800); // fin absente : 30 min
  assert.deepEqual(TW.consigneWin("a partir de 10h00 stp pour le 07/09"),{ws:36000,we:null,md:"09-07"});
  assert.deepEqual(TW.consigneWin("Avant 17H30"),{ws:null,we:63000,md:null});
  assert.deepEqual(TW.consigneWin("RDV entre 9h et 12h"),{ws:32400,we:43200,md:null});
  assert.equal(TW.consigneWin("BHP // MR BOS - 06 98 00 58 07"),null);
  assert.ok(TW.nameMatch("patrick","Patrick MACHADO")&&TW.nameMatch("Patrick Machado","PATRICK MACHADO")&&!TW.nameMatch("Marc","Patrick MACHADO")&&!TW.nameMatch("","x"))});

test("visites : période, techniciens prévus, visites libres",()=>{
  const us=[unit({twimm:"a",slots:[{date:"2026-11-18",start:36000,end:39600,tech:"Patrick MACHADO"}]}),
    unit({twimm:"b",slots:[{date:"2026-11-18",start:36000,end:39600,tech:"Marc DUPONT"}]}),
    unit({twimm:"c",slots:[{date:"2026-12-01",start:36000,end:39600,tech:""}]}),unit({twimm:"d"})];
  const r=SCH.visits(us,["2026-11-18"],["Patrick"],1800);
  assert.deepEqual(r.visits.map(v=>v.u.twimm),["a","d"]);assert.equal(r.visits[0].dur,3600);assert.equal(r.visits[1].dur,1800);
  assert.equal(r.visits[0].tech,"Patrick MACHADO");assert.deepEqual(r.skipped,{range:1,other:{"Marc DUPONT":1}});
  assert.equal(SCH.visits(us,["2026-11-18"],[],1800).visits.length,3)}); // sans technicien saisi : tout reste

test("un arrêt par immeuble : étages dans l'ordre, durées additionnées, créneau regroupé",()=>{
  const sl=(a,b)=>({date:"2026-11-18",start:a,end:b,tech:""});
  const vs=SCH.visits([unit({twimm:"1",etage:"3",slots:[sl(36000,37800)]}),unit({twimm:"2",etage:"RDC",slots:[sl(37800,39600)]}),
    unit({twimm:"3",etage:"12",slots:[sl(36000,37800)]}),unit({twimm:"4",adresse:"9 RUE B"})],["2026-11-18"],[],1800).visits;
  vs.forEach(v=>v.pt=P(48.85,2.35));
  const st=SCH.groupStops(vs);assert.equal(st.length,2);
  const a=st.find(s=>s.adresse==="1 RUE A");
  assert.deepEqual(a.visits.map(v=>v.u.twimm),["2","1","3"]);assert.equal(a.svc,3*1800);
  assert.deepEqual([a.win.ws,a.win.we,a.win.md],[36000,39600,"11-18"]);
  assert.equal(st.find(s=>s.adresse==="9 RUE B").win,null)});

// ----- planification -----
const Mx=pts=>MAPC.matrix(pts,null);
const res0=(o={})=>({start:0,end:0,t0:8*H,dayEnd:17.5*H,date:"2026-11-18",dayIdx:0,tech:"Ana",...o});
const stop=(node,o={})=>({node,svc:1800,win:null,idx:node,date:null,tech:null,...o});

test("simulation : heures d'arrivée, attente avant un créneau, retard après",()=>{
  const pts=[P(48.85,2.35),P(48.86,2.35),P(48.87,2.35)],C=Mx(pts),r=res0();
  const a=SCH.run(r,[SCH.jobOf(stop(1,{win:{ws:10*H,we:11*H,md:null}}),r)],C);
  assert.equal(a.times[0].start,10*H);assert.equal(a.times[0].late,0);assert.ok(a.times[0].arr<10*H);
  const b=SCH.run(r,[SCH.jobOf(stop(1,{win:{ws:7*H,we:8*H,md:null}}),r)],C);assert.ok(b.late>0);
  assert.equal(SCH.run({...r,end:null},[SCH.jobOf(stop(1),r)],C).backSec,0)}); // fin au dernier arrêt : pas de retour

test("l'ordre tient compte des créneaux : l'arrêt sans contrainte passe avant celui qui ouvre à 14 h",()=>{
  const pts=[P(48.85,2.35),P(48.851,2.351),P(48.852,2.352)],C=Mx(pts),r=res0();
  const A=SCH.jobOf(stop(1,{win:{ws:14*H,we:15*H,md:null}}),r),B=SCH.jobOf(stop(2),r);
  assert.deepEqual(SCH.solve(r,[A,B],C).map(j=>j.node),[2,1])});

test("ordre sur 10 arrêts : permutation valide, jamais pire que l'ordre de l'export",()=>{
  let seed=3;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const pts=[P(48.9,2.3)].concat(Array.from({length:10},()=>P(48.7+rnd()*.3,2.1+rnd()*.5))),C=Mx(pts),r=res0();
  const jobs=Array.from({length:10},(_,i)=>SCH.jobOf(stop(i+1),r)),o=SCH.solve(r,jobs,C);
  assert.deepEqual(o.map(j=>j.node).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
  assert.ok(SCH.run(r,o,C).cost<=SCH.baseline(r,jobs,C).cost)});

test("répartition : chaque technicien prend les arrêts proches de son domicile",()=>{
  // 0 = domicile nord, 1 = domicile sud, 2-4 = arrêts nord, 5-7 = arrêts sud
  const pts=[P(49.0,2.3),P(48.6,2.3),P(49.01,2.31),P(49.02,2.29),P(49.0,2.32),P(48.61,2.31),P(48.6,2.29),P(48.59,2.3)],C=Mx(pts);
  const rs=[res0({tech:"Nord",start:0,end:0,id:"n"}),res0({tech:"Sud",start:1,end:1,id:"s"})];
  const r=SCH.assign(rs,[2,3,4,5,6,7].map(n=>stop(n)),C);
  assert.deepEqual(r.seqs[0].map(j=>j.node).sort(),[2,3,4]);assert.deepEqual(r.seqs[1].map(j=>j.node).sort(),[5,6,7])});

test("répartition : technicien et date prévus sont respectés ; incompatible = non affecté",()=>{
  const pts=[P(49.0,2.3),P(48.6,2.3),P(49.01,2.31),P(48.61,2.31)],C=Mx(pts);
  const rs=[res0({tech:"Nord",start:0,end:0}),res0({tech:"Sud",start:1,end:1})];
  const r=SCH.assign(rs,[stop(2,{tech:"Sud MACHADO"}),stop(3,{tech:"Nord"}),stop(2,{tech:"Inconnu"}),stop(3,{date:"2026-11-19"})],C);
  assert.deepEqual(r.seqs[1].map(j=>j.node),[2]);assert.deepEqual(r.seqs[0].map(j=>j.node),[3]);assert.equal(r.unassigned.length,2)});

test("plusieurs jours : on remplit le premier jour, le surplus passe au suivant",()=>{
  const pts=[P(48.85,2.35)].concat(Array.from({length:8},(_,i)=>P(48.85+i*.005,2.35+i*.005))),C=Mx(pts);
  const rs=[0,1,2].map(d=>res0({date:"2026-11-1"+(8+d),dayIdx:d,id:"d"+d}));
  const r=SCH.assign(rs,Array.from({length:8},(_,i)=>stop(i+1,{svc:1.5*H})),C);   // 12 h de service : plus que la journée
  const n=r.seqs.map(s=>s.length);assert.equal(n.reduce((a,b)=>a+b),8);
  assert.ok(n[0]>=5&&n[0]<8,"premier jour rempli sans déborder : "+n);assert.ok(n[1]>0&&n[2]===0)});

test("matrice : réponse du service routier, avec repli par trajet manquant",()=>{
  const pts=[P(48.85,2.35),P(48.86,2.36),P(48.87,2.37)];
  const j={durations:[[0,100,null],[110,0,60],[200,70,0]],distances:[[0,1500,null],[1600,0,900],[2500,1000,0]]};
  const m=MAPC.matrix(pts,j);assert.equal(m.t(0,1),100);assert.equal(m.d(1,2),900);
  assert.ok(m.t(0,2)>0&&m.d(0,2)>0);assert.ok(Math.abs(m.exact-5/6)<1e-9);
  assert.equal(MAPC.matrix(pts,null).exact,0);assert.equal(MAPC.matrix(pts,null).t(1,1),0);
  assert.match(MAPC.osrmUrl(pts),/table\/v1\/driving\/2\.350000,48\.850000;2\.360000,48\.860000;/)});

test("sorties : texte à partager, agenda .ics valide, bilan cumulé",()=>{
  const stops=[{adresse:"1 RUE A, ÉTAGE",cp:"75001",ville:"PARIS",pt:P(48.85,2.35),arr:8.5*H,start:9*H,dep:9.5*H,consigne:"code; 1234, ok",visits:[{twimm:"42",type:"CAFARDS",etage:"3",porte:"12"}]}];
  const r={tech:"Ana",date:"2026-11-18",t0:8*H,end:10*H,stops};
  assert.equal(EXP.hm(8.5*H),"08:30");assert.equal(EXP.dfr("2026-11-18"),"18/11/2026");assert.match(EXP.shareText(r),/1\. 08:30 1 RUE A.*\n.*BI 42/);
  const s=EXP.ics({id:"p1",resources:[r]},new Date("2026-11-17T10:00:00Z"));
  assert.match(s,/^BEGIN:VCALENDAR\r\n/);assert.match(s,/DTSTART:20261118T090000\r\n/);assert.match(s,/DTEND:20261118T093000\r\n/);assert.match(s,/GEO:48\.850000;2\.350000/);
  assert.match(s,/Consigne : code\; 1234\\, ok/);assert.ok(s.split("\r\n").every(l=>l.length<=75));assert.equal((s.match(/BEGIN:VEVENT/g)||[]).length,1);
  let st=[];st=EXP.addStat(st,{id:"a",date:"2026-11-03",stops:5,mBase:50000,mOpt:40000,sBase:7200,sOpt:5400});
  st=EXP.addStat(st,{id:"b",date:"2026-11-10",stops:4,mBase:30000,mOpt:30000,sBase:3600,sOpt:3600});
  st=EXP.addStat(st,{id:"a",date:"2026-11-03",stops:5,mBase:60000,mOpt:40000,sBase:7200,sOpt:5400}); // même tournée recalculée : remplacée
  assert.equal(st.length,2);const mo=EXP.byMonth(st);assert.equal(mo.length,1);assert.equal(mo[0].mBase,90000);
  const c=EXP.cost(EXP.sum(mo),{l100:7,price:2,hourly:20});assert.equal(c.km,20);assert.ok(Math.abs(c.fuel-2.8)<1e-9);assert.ok(Math.abs(c.labour-10)<1e-9);
  assert.equal(EXP.cost(EXP.sum(mo),{}).fuel,null);assert.match(EXP.csv(st),/2026-11;2;9;90\.0;70\.0;20\.0;30/)});

test("bilan : une entrée peut regrouper plusieurs tournées",()=>{
  const m=EXP.byMonth([{id:"x",date:"2026-11-03",n:2,stops:6,mBase:1,mOpt:1,sBase:1,sOpt:1}]);assert.equal(m[0].n,2)});
