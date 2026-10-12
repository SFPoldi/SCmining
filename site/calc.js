// Reine Rechenlogik, ohne DOM. Wird im Browser und in Node-Tests genutzt.
const STATS = [
  {key:"power",      label:"Mining Laser Power", pct:false},
  {key:"extraction", label:"Extraction Power",   pct:false},
  {key:"instability",label:"Laser Instability",  pct:true, goodNeg:true},
  {key:"resistance", label:"Resistance",         pct:true, goodNeg:true},
  {key:"window",     label:"Optimal Window Size",pct:true},
  {key:"rate",       label:"Optimal Charge Rate",pct:true},
  {key:"catastrophic",label:"Catastrophic Charge Rate",pct:true, goodNeg:true},
  {key:"shatter",    label:"Shatter Damage",     pct:true},
  {key:"cluster",    label:"Cluster Modifier",   pct:true},
];

// Summiert Prozent-Modifier. mode: "mul" (Produkt) oder "add" (Summe). Rueckgabe in %.
function combine(percents, mode){
  if(mode==="add") return percents.reduce((a,b)=>a+b,0);
  return (percents.reduce((a,p)=>a*(1+p/100),1)-1)*100;
}

// parts: Liste von mods-Objekten (Laser, Module, Gadget). Gibt {stat: gesamt-%} zurueck.
function totals(parts, mode){
  const out={};
  for(const s of STATS){
    const vals=parts.map(p=>p[s.key]).filter(v=>v!==undefined);
    out[s.key]=vals.length?combine(vals,mode):0;
  }
  return out;
}

// build: {laser, modules:[...], gadget|null, mode, activeOn}
function evaluate(build){
  const {laser, modules, gadget, mode, activeOn}=build;
  const mods=modules.filter(m=>m && (activeOn || !m.active));
  const parts=[laser.mods, ...mods.map(m=>m.mods), ...(gadget?[gadget.mods]:[])];
  const t=totals(parts, mode);
  const f=1+t.power/100, e=1+t.extraction/100;
  return {
    ...t,
    powerMin: laser.power_min*f,
    powerMax: laser.power_max*f,
    extractionPower: laser.extraction!=null? laser.extraction*e : null,
  };
}

if(typeof module!=="undefined") module.exports={STATS,combine,totals,evaluate};
