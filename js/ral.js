/* Opmeting Mesure – RAL-kleuren: palette laden, zoeken, snelkeuze-swatches en resultatenlijst. */
(() => {
  'use strict';
  const { $, tr } = Mesure;

  const RAL_URL = 'https://gist.githubusercontent.com/edwinwebb/4af6edeb743156e1c89fcfb25366f9d9/raw/2389eaec3b06e01de42624b376bf596e75accc94/RalCodes.json';
  const SWATCH_CLASS = 'w-6 h-6 rounded-full border border-gray-300 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500';

  /** Actieve kleurenlijst (eerst de basislijst, na het laden de volledige RAL Classic-palette). */
  let database = [];
  let databaseVersion = 0; // wordt verhoogd bij elke wijziging van `database` (cache-invalidatie)

  /** Tekst normaliseren voor zoeken: zonder accenten, kleine letters, getrimd. */
  function normalizeText(value = '') {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /* ---- Vertaling van (Engelse) RAL-namen naar nl/fr ---- */

  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Eenmalig voorbereid: langste sleutels eerst, met vooraf gecompileerde regex.
  const lexiconRules = {};
  for (const lang of ['nl', 'fr']) {
    const map = Mesure.ralLexicon[lang];
    lexiconRules[lang] = Object.keys(map)
      .sort((a, b) => b.length - a.length)
      .map((key) => [new RegExp('\\b' + escapeRegExp(key) + '\\b', 'g'), map[key]]);
  }

  function localizeName(name, lang) {
    let result = normalizeText(name);
    for (const [pattern, replacement] of lexiconRules[lang]) result = result.replace(pattern, replacement);
    return result.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Voeg vertaalde namen en een genormaliseerde zoektekst toe aan een kleur-item. */
  function enrich(item) {
    const en = item.labelEn || item.label || '';
    const nl = localizeName(en, 'nl');
    const fr = localizeName(en, 'fr');
    const keywords = normalizeText([item.ral, en, nl, fr, item.keywords || ''].join(' '));
    return {
      ...item,
      labelEn: en,
      labelNl: nl,
      labelFr: fr,
      keywords,
      search: normalizeText(`${item.ral} ${en} ${nl} ${fr} ${keywords}`)
    };
  }

  function setDatabase(items) {
    database = items;
    databaseVersion++;
  }
  setDatabase(Mesure.baseRals.map(enrich));

  /** Weergavenaam van een kleur in de actieve taal. */
  function displayName(item) {
    if (Mesure.lang === 'fr') return item.labelFr || item.labelEn;
    return item.labelNl || item.labelEn;
  }

  /* ---- Kleur zoeken voor de kap in de schets ---- */

  let hexCacheKey = null;
  let hexCacheValue = null;

  /** Hex-kleur voor een (kleine letters, getrimde) RAL-invoer, of null. Resultaat wordt gecached. */
  function findHex(ralLower) {
    if (!ralLower) return null;
    const key = databaseVersion + '|' + ralLower;
    if (key === hexCacheKey) return hexCacheValue;

    let hex = null;
    const exact = database.find((item) => item.ral.toLowerCase() === ralLower || item.keywords.includes(ralLower));
    if (exact) {
      hex = exact.hex;
    } else {
      const number = ralLower.match(/\d{4}/);
      if (number) {
        const byNumber = database.find((item) => item.ral.includes(number[0]));
        if (byNumber) hex = byNumber.hex;
      }
      if (!hex) {
        const direct = ralLower.match(/^#[0-9a-f]{3,6}$/i);
        if (direct) hex = direct[0];
      }
    }
    hexCacheKey = key;
    hexCacheValue = hex;
    return hex;
  }

  /* ---- Snelkeuze-swatches onder het invoerveld ---- */

  let swatchKey = null;

  /** Toon de snelkeuze-swatches (standaardset of zoekresultaten, max. 10). Slaat dubbel renderen over. */
  function renderSwatches(filterText = '') {
    const container = $('ral-palette');
    const term = (filterText || '').toLowerCase().trim();
    const currentValue = $('ral-kleur').value.toLowerCase().trim();

    const key = `${databaseVersion}|${term}|${currentValue}`;
    if (key === swatchKey) return;
    swatchKey = key;

    let items;
    if (term.length === 0) {
      items = database.filter((item) => Mesure.defaultRals.includes(item.ral));
    } else {
      items = database
        .filter((item) => (item.keywords || '').includes(term)
          || (item.label || '').toLowerCase().includes(term)
          || (item.ral || '').toLowerCase().includes(term))
        .slice(0, 10);
    }

    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = SWATCH_CLASS;
      button.style.backgroundColor = item.hex;
      button.title = `${item.ral} (${item.label})`;
      button.dataset.ral = item.ral;
      const ralLower = item.ral.toLowerCase();
      if (ralLower === currentValue || currentValue.includes(ralLower)) {
        button.classList.add('ring-2', 'ring-blue-500', 'scale-110');
      }
      fragment.appendChild(button);
    }
    container.replaceChildren(fragment);
  }

  /* ---- Resultatenlijst (volledige palette doorzoeken) ---- */

  /** Toon swatches + resultatenlijst (max. 40) voor de ingevoerde tekst. */
  function renderResults(value = '') {
    renderSwatches(value);
    const box = $('ral-results');
    box.replaceChildren();
    const query = normalizeText(value);
    if (!query) return;

    const fragment = document.createDocumentFragment();
    database.filter((item) => item.search.includes(query)).slice(0, 40).forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ral-result';
      const swatch = document.createElement('span');
      swatch.className = 'ral-result-swatch';
      swatch.style.background = item.hex;
      const text = document.createElement('span');
      const strong = document.createElement('strong');
      const small = document.createElement('small');
      strong.textContent = item.ral;
      small.textContent = displayName(item);
      text.append(strong, small);
      button.append(swatch, text);
      button._item = item;
      fragment.appendChild(button);
    });
    box.appendChild(fragment);
  }

  /** Laad de volledige RAL Classic-palette (extern); bij een fout blijft de basislijst actief. */
  async function loadFullPalette() {
    const status = $('ral-status');
    status.textContent = tr('216 RAL Classic-kleuren laden…', 'Chargement de 216 couleurs RAL Classic…');
    try {
      const response = await fetch(RAL_URL, { cache: 'force-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const full = Object.values(data).map((x) => enrich({
        ral: 'RAL ' + x.code,
        hex: x.hex,
        label: x.name,
        labelEn: x.name,
        keywords: x.code + ' ' + x.name + ' ral ' + x.code
      }));
      if (full.length < 200) throw new Error('incomplete palette');
      setDatabase(full);
      status.textContent = tr(`${full.length} RAL Classic-kleuren beschikbaar`, `${full.length} couleurs RAL Classic disponibles`);
      renderResults($('ral-kleur').value);
    } catch (error) {
      status.textContent = tr(
        'Volledig palet niet beschikbaar, veelgebruikte kleuren actief.',
        'Palette complète indisponible, couleurs fréquentes actives.'
      );
    }
  }

  /** Koppel de klik-handlers (event delegation) en het zoekveld. */
  function init() {
    $('ral-palette').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-ral]');
      if (!button) return;
      event.preventDefault();
      $('ral-kleur').value = button.dataset.ral;
      Mesure.visual.update();
    });

    $('ral-results').addEventListener('click', (event) => {
      const button = event.target.closest('button.ral-result');
      if (!button) return;
      $('ral-kleur').value = button._item.ral + ' - ' + displayName(button._item);
      $('ral-results').replaceChildren();
      Mesure.visual.update();
      renderSwatches('');
    });

    $('ral-kleur').addEventListener('input', (event) => renderResults(event.target.value));
  }

  Mesure.ral = { init, findHex, renderSwatches, renderResults, loadFullPalette };
})();
