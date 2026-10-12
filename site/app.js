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

function buildSlots(){
  const laser=DATA.lasers[$("laser").value];
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
    laser:DATA.lasers[$("laser").value],
    modules:[...document.querySelectorAll(".slot")].map(s=>DATA.modules[s.value]).filter(Boolean),
    gadget:DATA.gadgets[$("gadget").value]||null,
    mode:$("mode").value,
    activeOn:$("activeOn").checked,
  };
}

function render(){
  const b=current(), r=evaluate(b);
  let h=`<tr><th>Wert</th><th>Ergebnis</th></tr>
   <tr><td>Mining Power</td><td>${fmtN(r.powerMin)} – ${fmtN(r.powerMax)}</td></tr>
   <tr><td>Extraction Power</td><td>${fmtN(r.extractionPower)}</td></tr>`;
  for(const s of STATS.filter(s=>s.pct)){
    h+=`<tr><td>${s.label}</td><td class="${cls(s,r[s.key])}">${fmtPct(r[s.key])}</td></tr>`;
  }
  $("stats").innerHTML=h;
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
  opt($("laser"),d.lasers,l=>`${l.name.replace(" Mining Laser","")} (S${l.size}, ${l.slots} Slots)`);
  opt($("gadget"),d.gadgets,g=>g.name);
  $("gadget").add(new Option("– kein Gadget –",-1),0); $("gadget").value=-1;
  STATS.forEach(s=>$("metric").add(new Option(s.label,s.key)));
  buildSlots(); refresh();
  $("laser").onchange=()=>{buildSlots();refresh();};
  for(const id of ["gadget","mode","activeOn","metric","onlyPassive"]) $(id).onchange=refresh;
  $("save").onclick=()=>{saved.push(current());renderCmp();};
  renderCmp();
}).catch(e=>{document.body.insertAdjacentHTML("beforeend",`<p class="neg" style="padding:16px">Fehler beim Laden: ${e}</p>`);});
