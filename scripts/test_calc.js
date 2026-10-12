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
