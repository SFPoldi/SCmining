# SC Mining Simulator

Statische Webseite, die Kombinationen aus Mining-Lasern, Modulen und Gadgets in Star Citizen simuliert.

## Starten
    python3 -m http.server -d site 8000   # dann http://localhost:8000

## Daten aktualisieren (nach neuem Patch)
    python3 scripts/fetch_data.py         # schreibt site/data/mining.json

Quelle: Star Citizen Wiki API (Datamining-Export). Filter: Testdubletten, Handwerkzeuge (S0) und leere Module werden entfernt.

## Tests
    node scripts/test_calc.js

## Hosting (GitHub Pages)
Der Workflow `.github/workflows/pages.yml` deployt `site/` bei jedem Push auf `main`.
Einmalig aktivieren: Repo Settings > Pages > Source: **GitHub Actions**.

## Offene Punkte
- Kombinationsregel der Modifier (multiplikativ oder additiv) ist nicht aus dem Spiel verifiziert, daher umschaltbar.
- Gadget-Werte ohne Vorzeichen (z.B. BoreMax Resistance "10%") werden als positiv gelesen.
- Erzwerte (Instability, Resistance) stammen aus den Daten. Ihre Verrechnung mit dem Build (Basis x (1 + Modifier)) ist eine Annahme.
- Gesteinsmasse und die Formel für die benötigte Power fehlen in den Daten, daher keine Durchführbarkeitsprüfung.
- Schiffs-Presets (Anzahl und Größe der Laser) sind handgepflegt in `scripts/fetch_data.py`.
