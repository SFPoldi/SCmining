const $=id=>document.getElementById(id);
let DATA, saved=[];

const fmtPct=v=>(v>0?"+":"")+v.toFixed(1).replace(/\.0$/,"")+"%";
const cls=(s,v)=>Math.abs(v)<.05?"":((v>0)!==!!s.goodNeg?"pos":"neg");
const fmtN=v=>v==null?"–":Math.round(v).toLocaleString("de-DE");

function opt(sel, items, label){
  sel.innerHTML="";
  items.forEach((it,i)=>sel.add(new Option(label(it),i)));
}
const modLabel=m=>m.name+(m.active?" (aktiv"+(m.uses?`, ${m.uses}x`:"")+")":"");

let LASERS=[];
function shipLasers(){
  const sh=DATA.ships[$("ship").value];
  if(!sh) return DATA.lasers;
  return DATA.lasers.filter(l=>l.size===sh.size && !(sh.exclude||[]).some(x=>l.name.includes(x)) && (!sh.only||sh.only.some(x=>l.name.includes(x))));
}
function fillLasers(){
  LASERS=shipLasers();
  opt($("laser"),LASERS,l=>`${l.name.replace(" Mining Laser","")} (S${l.size}, ${l.slots} Slots)`);
}

function buildSlots(){
  const laser=LASERS[$("laser").value];
  const prev=[...document.querySelectorAll(".slot")].map(s=>s.value);
  $("slots").innerHTML="";
  for(let i=0;i<laser.slots;i++){
    const l=document.createElement("label");
    l.textContent=`Modul ${i+1}`;
    const s=document.createElement("select"); s.className="slot";
    s.add(new Option("– leer –",-1));
    DATA.modules.forEach((m,j)=>s.add(new Option(modLabel(m),j)));
    s.value=prev[i]??-1;
    s.onchange=render;
    l.append(s); $("slots").append(l);
  }
}

function current(){
  return {
    laser:LASERS[$("laser").value],
    count:(DATA.ships[$("ship").value]||{count:1}).count,
    ore:DATA.ores[$("ore").value]||null,
    modules:[...document.querySelectorAll(".slot")].map(s=>DATA.modules[s.value]).filter(Boolean),
    gadget:DATA.gadgets[$("gadget").value]||null,
    mode:$("mode").value,
    activeOn:$("activeOn").checked,
  };
}

function render(){
  const b=current(), r=evaluate(b);
  let h=`<tr><th>Wert</th><th>Ergebnis</th></tr>
   <tr><td>Mining Power${b.count>1?" (pro Laser)":""}</td><td>${fmtN(r.powerMin)} – ${fmtN(r.powerMax)}</td></tr>
   ${b.count>1?`<tr><td>Mining Power (${b.count} Laser)</td><td>${fmtN(r.powerMin*b.count)} – ${fmtN(r.powerMax*b.count)}</td></tr>`:""}
   <tr><td>Extraction Power</td><td>${fmtN(r.extractionPower)}</td></tr>`;
  for(const s of STATS.filter(s=>s.pct)){
    h+=`<tr><td>${s.label}</td><td class="${cls(s,r[s.key])}">${fmtPct(r[s.key])}</td></tr>`;
  }
  if(b.ore){
    const e=oreEffective(b.ore,r);
    h+=`<tr><th colspan="2">${b.ore.name}</th></tr>
     <tr><td>Instability (Basis ${b.ore.instability})</td><td>${fmtN(e.instability)}</td></tr>
     <tr><td>Resistance (Basis ${fmtPct(b.ore.resistance)})</td><td>${fmtPct(e.resistance)}</td></tr>`;
  }
  $("stats").innerHTML=h;
  $("oreNote").textContent=b.ore?"Erzwerte: Basiswert x (1 + Build-Modifier). Annahme, nicht aus dem Spiel verifiziert. Gesteinsmasse und benötigte Power sind in den Daten nicht enthalten.":"";
}

function label(b){
  return b.laser.name.replace(" Mining Laser","")+" | "+(b.modules.map(m=>m.name).join(", ")||"ohne Module")+(b.gadget?" | "+b.gadget.name:"");
}

function renderCmp(){
  $("cmpEmpty").hidden=saved.length>0;
  if(!saved.length){$("cmp").innerHTML="";return;}
  const rs=saved.map(evaluate);
  let h="<tr><th>Wert</th>"+saved.map((b,i)=>`<th>${label(b)} <button data-i="${i}">x</button></th>`).join("")+"</tr>";
  h+="<tr><td>Mining Power</td>"+rs.map(r=>`<td>${fmtN(r.powerMin)} – ${fmtN(r.powerMax)}</td>`).join("")+"</tr>";
  h+="<tr><td>Extraction Power</td>"+rs.map(r=>`<td>${fmtN(r.extractionPower)}</td>`).join("")+"</tr>";
  for(const s of STATS.filter(s=>s.pct))
    h+=`<tr><td>${s.label}</td>`+rs.map(r=>`<td class="${cls(s,r[s.key])}">${fmtPct(r[s.key])}</td>`).join("")+"</tr>";
  $("cmp").innerHTML=h;
  $("cmp").querySelectorAll("button").forEach(x=>x.onclick=()=>{saved.splice(+x.dataset.i,1);renderCmp();});
}

// Alle Modulkombinationen (mit Wiederholung, ohne Reihenfolge) fuer den gewaehlten Laser.
function combos(pool,n){
  const out=[[]];
  const rec=(start,cur)=>{
    if(cur.length===n) return;
    for(let i=start;i<pool.length;i++){const c=[...cur,pool[i]];out.push(c);rec(i,c);}
  };
  rec(0,[]);
  return out;
}

function renderTop(){
  const key=$("metric").value, s=STATS.find(x=>x.key===key);
  const b=current();
  const pool=DATA.modules.filter(m=>!$("onlyPassive").checked||!m.active);
  const rows=combos(pool,b.laser.slots).map(mods=>{
    const x={...b,modules:mods}; return {mods,r:evaluate(x)};
  });
  const val=r=>key==="power"?r.powerMax:key==="extraction"?(r.extractionPower??-Infinity):r[key];
  const dir=s.goodNeg?1:-1;
  rows.sort((a,b)=>dir*(val(a.r)-val(b.r)));
  let h="<tr><th>Module</th><th>Power</th><th>Extraction</th>"+STATS.filter(s=>s.pct).map(s=>`<th>${s.label}</th>`).join("")+"</tr>";
  for(const {mods,r} of rows.slice(0,10))
    h+=`<tr><td>${mods.map(m=>m.name).join(", ")||"–"}</td><td>${fmtN(r.powerMin)} – ${fmtN(r.powerMax)}</td><td>${fmtN(r.extractionPower)}</td>`+
       STATS.filter(s=>s.pct).map(s=>`<td class="${cls(s,r[s.key])}">${fmtPct(r[s.key])}</td>`).join("")+"</tr>";
  $("top").innerHTML=h;
}

function refresh(){render();renderTop();}

fetch("data/mining.json").then(r=>r.json()).then(d=>{
  DATA=d;
  $("src").textContent=`${d.source}, Stand ${d.fetched.slice(0,10)}`;
  $("meta").textContent=`${d.lasers.length} Laser, ${d.modules.length} Module, ${d.gadgets.length} Gadgets`;
  opt($("ship"),d.ships,s=>`${s.name} (${s.count}x S${s.size})`);
  $("ship").add(new Option("– alle Laser –",-1),0); $("ship").value=-1;
  opt($("ore"),d.ores,o=>o.name);
  $("ore").add(new Option("– kein Erz –",-1),0); $("ore").value=-1;
  fillLasers();
  opt($("gadget"),d.gadgets,g=>g.name);
  $("gadget").add(new Option("– kein Gadget –",-1),0); $("gadget").value=-1;
  STATS.forEach(s=>$("metric").add(new Option(s.label,s.key)));
  buildSlots(); refresh();
  $("laser").onchange=()=>{buildSlots();refresh();};
  $("ship").onchange=()=>{fillLasers();buildSlots();refresh();};
  for(const id of ["ore","gadget","mode","activeOn","metric","onlyPassive"]) $(id).onchange=refresh;
  $("save").onclick=()=>{saved.push(current());renderCmp();};
  renderCmp();
}).catch(e=>{document.body.insertAdjacentHTML("beforeend",`<p class="neg" style="padding:16px">Fehler beim Laden: ${e}</p>`);});
