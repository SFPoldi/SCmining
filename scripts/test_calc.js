const assert=require("assert");
const {combine,evaluate}=require("../site/calc.js");
const D=require("../site/data/mining.json");
assert.strictEqual(Math.round(combine([20,20],"mul")),44);
assert.strictEqual(combine([20,20],"add"),40);
const laser=D.lasers.find(l=>l.name.startsWith("Helix II"));
const rieger=D.modules.find(m=>m.name==="Rieger-C2");
const r=evaluate({laser,modules:[rieger,rieger],gadget:null,mode:"mul",activeOn:true});
assert.ok(Math.abs(r.powerMax-4080*1.2*1.2)<1e-6, r.powerMax);
assert.ok(Math.abs(r.window-((0.97*0.97*0.6)-1)*100)<1e-6, r.window); // Helix -40, 2x Rieger -3
console.log("ok", r.powerMax, r.window);
const {oreEffective}=require("../site/calc.js");
const e=oreEffective({instability:1000,resistance:95},{instability:-35,resistance:-30});
assert.ok(Math.abs(e.instability-650)<1e-9 && Math.abs(e.resistance-66.5)<1e-9);
for(const s of D.ships){const n=D.lasers.filter(l=>l.size===s.size&&!(s.exclude||[]).some(x=>l.name.includes(x))&&(!s.only||s.only.some(x=>l.name.includes(x)))).length;assert.ok(n>0,s.name);console.log(s.name,n,"Laser");}
console.log("ore ok");
