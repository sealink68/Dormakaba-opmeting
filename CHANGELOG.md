# CHANGELOG – Opmeting Mesure v4.2 (opgeschoond)

## PDF-export in app-modus (html2pdf)

In standalone (iOS-beginscherm of `display-mode: standalone`) doet `window.print()` niets. De printknoppen maken dan een A4-PDF in de app en bieden die aan via de deelsheet (`navigator.share` met bestand) of, als dat niet kan, via een blob-URL-download. Buiten standalone blijft `window.print()` ongewijzigd.

Extra bibliotheek, lui geladen enkel op het moment van die PDF-export (niet bij een gewone afdruk):

- html2pdf.js **0.10.2** (bundel van html2canvas + jsPDF)
- CDN: `https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js`

De bestaande `@media print`-regels zijn niet gewijzigd. `body.pdf-mode` in `styles.css` herhaalt ze, omdat html2pdf het scherm rastert en `@media print` daarbij niet toepast.

Doel: opschonen en optimaliseren zonder wijziging van uiterlijk, teksten, kleuren, spacing of functionaliteit.
Opslagsleutels, veld-id's en het JSON-exportformaat zijn **ongewijzigd** → geen migratie nodig; oude dossiers en oude JSON-exports werken rechtstreeks.

## Bestandsstructuur
- `index.html` – enkel nog markup (geen inline `<script>`/`<style>`, geen inline `onclick`/`onchange`).
- `styles.css` – alle CSS, samengevoegd en ontdubbeld.
- `js/` – gewone scripts (geen build, werkt via `file://` en statische hosting), geladen in vaste volgorde:
  `core.js` (namespace `Mesure`, element-cache, frame-debounce) → `data.js` (vertalingen, RAL-data) → `i18n.js` → `ral.js` → `visual.js` (SVG-schets) → `form.js` (validatie, afhankelijke velden, vloergeleider) → `dossiers.js` (localStorage, import/export) → `print.js` → `ios-profile.js` → `app.js` (opstart).
- `manifest.webmanifest` en `icon-180.png`: verwijzingen ongewijzigd behouden (de bestanden zelf zaten niet in de aangeleverde HTML en zijn niet meegeleverd).
- Externe afhankelijkheden ongewijzigd online: Tailwind CDN, Google Fonts (Inter), RAL-gist.

## Opgeschoond
- 4 inline scripts met patches/herdefinities samengevoegd: `renderSwatches` + later `renderRalEnhanced` (overschreven/aangevuld) tot één RAL-module; `validatedPrint` stond op twee plaatsen (tweede overschreef de eerste); `let oldPrint` was ongebruikt; `resetSchetsEnOpties(isHardReset)` had een nooit gebruikte "hard reset"-tak; `window.onload =` + meerdere `load`-listeners → één opstartfunctie. Geen globale functies meer (enkel `window.Mesure`); inline `onclick`/`onchange` vervangen door listeners.
- Dode code / ongebruikte variabelen verwijderd (o.a. `oldPrint`, `ralDatabase`-herinitialisatie via `splice`, `defaultRals`-dubbels, ongebruikte `index`/`isHardReset`, herhaalde `document.getElementById` op dezelfde elementen, `if(el)`-controles op elementen die altijd bestaan, ongebruikte CSS-klasse `.navbar-title`).
- CSS: de twee `@media print`-blokken (het ene bovenaan, het tweede in de patch-CSS) en de dubbele regels (`@page`, `.print-footer`, `.page-number:after`, `.ios-group`, `break-inside`) samengevoegd tot één printblok met **hetzelfde effectieve resultaat** (winnende waarden: `@page` marge 12mm, footer `bottom:-8mm`, `font-size:8pt`, `break-inside:avoid-page`; pdf/print-media is pixel-identiek, zie verificatie).
- Dubbele helpers ontdubbeld: `q`/`getElementById` → één gecachte `$()`, één `tr(nl, fr)` i.p.v. ±80 herhaalde `currentLang === 'nl' ? … : …`, één `setLanguage()`, één `refreshDerived()`, één `onDoorTypeChange()`.
- Het Base64-icoon van de iOS-knop staat nu als constante (`ios-profile.js`); het gegenereerde `.mobileconfig` is byte-identiek aan het origineel (getest).
- Consistente naamgeving/inspringing (2 spaties), korte commentaar per module en functie. Alle 107 NL/FR-vertaalsleutels en de volledige RAL-woordenlijst zijn programmatisch overgenomen (geen enkele tekst gewijzigd).

## Performance
- `updateVisual` (±500 regels met ±100 `getElementById`-aanroepen per toetsaanslag) vervangen door `visual.js`: alle elementen één keer gecachet, schrijft enkel naar de DOM als een waarde echt verandert, en wordt per frame gebundeld (`requestAnimationFrame`). Onmiddellijk (synchroon) renderen blijft gebeuren vóór opslaan, valideren, exporteren en printen.
- Gemeten (300× `input`+`change` op TB + 30× RAL-invoer, headless Chromium): ~130 ms → ~15–30 ms en ~44.000 → ~90 DOM-mutaties.
- Eén gedelegeerde `input`/`change`-luisteraar op het formulier i.p.v. 2×34 luisteraars.
- RAL: woordenlijst-regexen eenmalig gecompileerd (voorheen per kleur × per taal opnieuw gebouwd en gesorteerd), zoektekst per kleur eenmalig voorberekend, kapkleur-lookup en swatches gecachet, swatch- en resultaatknoppen via event delegation en `DocumentFragment`.
- Dossierlijst en opslag: formuliervelden eenmalig verzameld; lijst enkel herrenderd als de dialoog open staat.
- `preconnect` naar Google Fonts toegevoegd; eigen scripts onderaan `<body>`.

## Bugs die als neveneffect verdwenen (verschil met v4.2 – bewust, zie risico's)
Het origineel gaf bij elke paginalading de fout **`ReferenceError: ui is not defined`** (de dossier-code riep een functie aan uit een andere IIFE). Gevolgen in v4.2, nu opgelost:
1. Na herladen / dossier openen werden velden na de fout niet hersteld (bv. *Nieuwe aandrijving* bleef leeg en *Openingswijze* sprong terug naar "Dubbel (Centraal)").
2. "Open" in de dossierlijst sloot de dialoog niet.
3. Velden zonder `id` (opmerkingen-textarea en "Oud systeem (bestaand)") werden wel opgeslagen (`field-N`) maar nooit teruggezet; nu wel.
4. Een taalwissel zette de gekozen *Openingswijze* terug naar de eerste optie; nu blijft de keuze behouden.

## Verificatie
Headless Chromium (Playwright), iPhone-viewport 390×844 @2x en desktop 1280×900, origineel vs. nieuw: 13 scenario's × 2 viewports pixel-identiek (0 afwijkende pixels); print-PDF (A4, 3 pagina's) identiek in tekst en pixels; 45 functionele checks (44 geslaagd; 1 testartefact: het verwijderen van het actieve dossier maakt meteen een nieuw leeg dossier aan – identiek aan het origineel, bevestigd met een parallelle test); testscripts staan in `/workspace/mesure-clean-tests/`.

## Risico's / aandachtspunten
- Niet getest op echte iOS Safari/WebKit (in de sandbox ontbreken systeembibliotheken voor WebKit); iOS-specifieke CSS (safe-area, `-webkit-`, 16px-invoer, viewport-meta, print) is 1-op-1 overgenomen en Chromium geeft pixel-identieke uitvoer.
- De schets wordt nu in dezelfde frame (rAF) bijgewerkt in plaats van synchroon in de event-handler; dit is visueel niet merkbaar, en alle opslag/validatie/print flusht eerst.
- Eén extra `id` (`btn-reset-fields`) op de "Reset Velden"-knop en `data-action="print"` op de printknoppen (vervangt inline `onclick`). Geen enkel formulier-id is gewijzigd; export/opslag onveranderd.
- `manifest.webmanifest`/`icon-180.png` moeten naast `index.html` staan (zoals voorheen). Eventueel service worker/caching-lijst aanpassen als die bestandsnamen (`index.html` → plus `styles.css`, `js/*.js`) moet cachen.
- De bronbestanden samen zijn groter dan het origineel (±259 kB vs ±133 kB; gzip ±36,5 kB vs ±32 kB) doordat minified/geplakte regels leesbaar zijn opgemaakt en er commentaar is bijgekomen. Het voordeel zit in leesbaarheid, per-bestand caching en runtime-snelheid, niet in bestandsgrootte. Wie kleinere bestanden wil, kan later optioneel minificeren (geen build-stap nodig nu).
