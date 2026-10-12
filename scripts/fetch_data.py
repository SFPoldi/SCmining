#!/usr/bin/env python3
"""Holt Mining-Laser, -Module und -Gadgets von der Star Citizen Wiki API
und schreibt eine normalisierte site/data/mining.json."""
import json, re, sys, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://api.star-citizen.wiki/api/v2/items"
OUT = Path(__file__).resolve().parent.parent / "site" / "data" / "mining.json"

# Wiki-Feldname -> interner Schluessel
KEYS = {
    "Mining Laser Power": "power",
    "Extraction Laser Power": "extraction",
    "Laser Instability": "instability",
    "Instability": "instability",
    "Resistance": "resistance",
    "Optimal Charge Window Size": "window",
    "Optimal Charge Window Rate": "rate",
    "Optimal Charge Rate": "rate",
    "Catastrophic Charge Rate": "catastrophic",
    "Shatter Damage": "shatter",
    "Cluster Modifier": "cluster",
}
# Module/Gadgets: "135%" bedeutet Multiplikator 1.35 -> +35 %
MULT_KEYS = {"power", "extraction"}


def fetch(classification):
    q = urllib.parse.urlencode({"filter[classification]": classification, "limit": 100})
    req = urllib.request.Request(f"{API}?{q}", headers={"User-Agent": "SCmining/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["data"]


def num(s):
    m = re.search(r"-?\+?\d+(?:\.\d+)?", str(s).replace(" ", ""))
    return float(m.group().replace("+", "")) if m else None


def stats_of(item, as_module):
    out = {}
    for d in item.get("description_data", []):
        k = KEYS.get(d["name"])
        if not k:
            continue
        v = num(d["value"])
        if v is None:
            continue
        if as_module and k in MULT_KEYS:
            v -= 100  # 135% -> +35
        out[k] = v
    return out


def laser(item):
    d = {x["name"]: x["value"] for x in item.get("description_data", [])}
    size = num(d.get("Size", "")) or 0
    lo_hi = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", d.get("Mining Laser Power", ""))]
    return {
        "name": item["name"],
        "id": item["class_name"],
        "size": int(size),
        "slots": int(num(d.get("Module Slots", "0")) or 0),
        "power_min": lo_hi[0] if lo_hi else None,
        "power_max": lo_hi[-1] if lo_hi else None,
        "extraction": num(d.get("Extraction Laser Power", "")),
        "optimal_range": num(d.get("Optimal Range", "")),
        "max_range": num(d.get("Maximum Range", "")),
        "mods": {k: v for k, v in stats_of(item, False).items() if k not in ("power", "extraction")},
    }


def main():
    lasers, seen = [], set()
    for i in fetch("Ship.Mining.Gun"):
        c = i["class_name"]
        if "TEST" in c.upper() or c.endswith("_Arm"):  # Testdubletten
            continue
        l = laser(i)
        if l["size"] < 1 or l["power_max"] is None or l["id"] in seen:
            continue  # S0 = Handwerkzeug/ROC
        seen.add(l["id"])
        lasers.append(l)
    modules = []
    for i in fetch("Mining.Module"):
        s = stats_of(i, True)
        if not s:
            continue  # leere Platzhalter (Clearcut, Deluge, ROC ...)
        mt = (i.get("mining_module") or {}).get("type", "")
        modules.append({
            "name": i["name"].replace(" Module", ""),
            "id": i["class_name"],
            "active": "Active" in mt,
            "uses": int(num((i.get("mining_module") or {}).get("uses") or 0) or 0) or None,
            "duration": num((i.get("mining_module") or {}).get("duration") or "") or None,
            "mods": s,
        })
    gadgets = [{"name": i["name"], "id": i["class_name"], "mods": stats_of(i, True)}
               for i in fetch("Mining.Gadget")]
    key = lambda x: x["name"]
    data = {
        "source": "api.star-citizen.wiki (Datamining-Export)",
        "fetched": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "lasers": sorted(lasers, key=key),
        "modules": sorted(modules, key=lambda m: (m["active"], m["name"])),
        "gadgets": sorted(gadgets, key=key),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    print(f"{len(lasers)} Laser, {len(modules)} Module, {len(gadgets)} Gadgets -> {OUT}")


if __name__ == "__main__":
    sys.exit(main())
