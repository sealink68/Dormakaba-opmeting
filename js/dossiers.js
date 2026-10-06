/* Opmeting Mesure – dossiers in localStorage, JSON import/export en dossier-dialoog.
 * Opslagformaat en sleutels zijn ongewijzigd t.o.v. v4.2 (zie CHANGELOG.md). */
(() => {
  'use strict';
  const { $, tr } = Mesure;

  const DB_KEY = 'opmeting-mesure-dossiers-v4';
  const ACTIVE_KEY = 'opmeting-mesure-active-v4';
  const SAVE_DELAY_MS = 250;

  const LABELS = {
    nl: { title: 'Mijn dossiers', search: 'Zoek dossier of werf', new: 'Nieuw dossier', open: 'Open', copy: 'Dupliceer', del: 'Verwijder', empty: 'Geen dossiers', confirm: 'Dit dossier verwijderen?' },
    fr: { title: 'Mes dossiers', search: 'Rechercher dossier ou chantier', new: 'Nouveau dossier', open: 'Ouvrir', copy: 'Dupliquer', del: 'Supprimer', empty: 'Aucun dossier', confirm: 'Supprimer ce dossier ?' }
  };
  const L = () => LABELS[Mesure.lang] || LABELS.nl;

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'd-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  const now = () => new Date().toISOString();

  /* ---- Opslag ---- */

  function readDb() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || { items: {} };
    } catch {
      return { items: {} };
    }
  }
  const writeDb = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));
  const newItem = (id, state) => ({ id, created: now(), updated: now(), state });

  /* ---- Formulierstatus <-> object ---- */

  let formControls = null; // alle input/select/textarea in het formulier (DOM is statisch)
  const controls = () => formControls || (formControls = Array.from($('opmeting-form').querySelectorAll('input,select,textarea')));

  /** Sleutel van een veld in de opslag: id, anders name, anders positie ('field-N'). */
  const fieldKey = (el, index) => el.id || el.name || 'field-' + index;

  /** Velden die in oudere dossiers ontbreken en dan leeg/uit moeten starten. */
  const NEW_FIELD_DEFAULTS = [
    'dim-prof-sluitkant', 'dim-prof-openingskant', 'dim-prof-sluitkant-r', 'dim-prof-openingskant-r',
    'alu-montageplaat', 'oud-systeem', 'opmerkingen'
  ];
  /**
   * Oude dossiers bewaarden de twee velden zonder id positioneel. Die velden hebben nu een vaste id
   * (nieuwe velden zouden de posities anders verschuiven); deze tabel vertaalt de oude sleutels.
   */
  const LEGACY_POSITION_KEYS = { 'field-9': 'oud-systeem', 'field-58': 'opmerkingen' };

  /** Huidige formulierstatus (zelfde structuur als v4.2: { app, version, language, fields }). */
  function getState() {
    Mesure.visual.flush();
    const fields = {};
    controls().forEach((el, index) => {
      fields[fieldKey(el, index)] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return { app: 'Opmeting Mesure', version: 4, language: Mesure.lang, fields };
  }

  /** Zet een opgeslagen status terug in het formulier. */
  function applyState(state) {
    if (!state?.fields) throw Error(tr('Ongeldig JSON-bestand.', 'Fichier JSON non valide.'));
    const { fields } = state;

    // Taal eerst, dan deurtype (herbouwt de afhankelijke opties), pas daarna de overige velden.
    if (state.language === 'fr' && Mesure.lang !== 'fr') Mesure.i18n.setLanguage('fr');
    const doorType = $('deurtype');
    if ('deurtype' in fields) doorType.value = fields.deurtype ?? '';
    doorType.dispatchEvent(new Event('change', { bubbles: true }));

    const applied = new Set();
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'deurtype') continue;
      const legacyId = LEGACY_POSITION_KEYS[key];
      if (legacyId && legacyId in fields) continue; // nieuwe sleutel heeft voorrang
      const el = $(legacyId || key);
      if (!el) continue; // o.a. vervallen velden zoals dim-prof-zijkant (bewust niet overgenomen)
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = value ?? '';
      applied.add(el.id);
    }
    // Ontbrekende nieuwe velden (oud dossier): standaardwaarde i.p.v. de waarde van het vorige dossier.
    for (const id of NEW_FIELD_DEFAULTS) {
      if (!applied.has(id)) {
        const el = $(id);
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
      }
    }
    Mesure.form.applyFloorGuideFields(fields);
    Mesure.form.refreshDerived();
    Mesure.visual.update();
  }

  /* ---- Actief dossier & opslaan ---- */

  /** Id van het actieve dossier; maakt een nieuw dossier aan als er geen (geldig) actief dossier is. */
  function ensureActive() {
    const db = readDb();
    let id = localStorage.getItem(ACTIVE_KEY);
    if (!id || !db.items[id]) {
      id = uid();
      db.items[id] = newItem(id, getState());
      writeDb(db);
      localStorage.setItem(ACTIVE_KEY, id);
    }
    return id;
  }

  /** Bewaar de huidige formulierstatus in het actieve dossier. */
  function save() {
    const id = ensureActive();
    const db = readDb();
    const current = db.items[id] || {};
    db.items[id] = { ...current, id, created: current.created || now(), updated: now(), state: getState() };
    writeDb(db);
    if (dialog.open) renderList();
  }

  let saveTimer;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY_MS);
  }

  /* ---- Dossier-dialoog ---- */

  const dialog = $('dossier-dialog');

  function renderList() {
    const list = $('dossier-list');
    const db = readDb();
    const activeId = localStorage.getItem(ACTIVE_KEY);
    const query = ($('dos-search').value || '').toLowerCase();
    const labels = L();

    const items = Object.values(db.items)
      .filter((item) => JSON.stringify(item.state.fields).toLowerCase().includes(query))
      .sort((a, b) => b.updated.localeCompare(a.updated));

    $('dos-title').textContent = labels.title;
    $('dos-search').placeholder = labels.search;
    $('dos-new').textContent = labels.new;

    if (!items.length) {
      list.replaceChildren(labels.empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'dossier-item' + (item.id === activeId ? ' active' : '');

      const info = document.createElement('div');
      const title = document.createElement('strong');
      const meta = document.createElement('small');
      title.textContent = item.state.fields.dossiernummer || item.state.fields.werf || '—';
      meta.textContent = [item.state.fields.werf, item.state.fields['datum-opmeting']].filter(Boolean).join(' • ');
      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'dossier-actions';
      [[labels.open, openDossier], [labels.copy, copyDossier], [labels.del, deleteDossier]].forEach(([text, handler]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.onclick = () => handler(item.id);
        actions.append(button);
      });

      row.append(info, actions);
      fragment.append(row);
    }
    list.replaceChildren(fragment);
  }

  function openDossier(id) {
    save();
    const item = readDb().items[id];
    if (!item) return;
    localStorage.setItem(ACTIVE_KEY, id);
    applyState(item.state);
    dialog.close();
  }

  function copyDossier(id) {
    const db = readDb();
    const newId = uid();
    const state = JSON.parse(JSON.stringify(db.items[id].state));
    state.fields.dossiernummer = (state.fields.dossiernummer || '') + ' kopie';
    db.items[newId] = newItem(newId, state);
    writeDb(db);
    localStorage.setItem(ACTIVE_KEY, newId);
    applyState(state);
    renderList();
  }

  function deleteDossier(id) {
    if (!confirm(L().confirm)) return;
    const db = readDb();
    delete db.items[id];
    writeDb(db);
    if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
    ensureActive();
    renderList();
  }

  function newDossier() {
    save();
    const id = uid();
    const db = readDb();
    $('opmeting-form').reset();
    db.items[id] = newItem(id, getState());
    writeDb(db);
    localStorage.setItem(ACTIVE_KEY, id);
    applyState(db.items[id].state);
    dialog.close();
  }

  /* ---- JSON export / import ---- */

  function exportJson() {
    if (!Mesure.form.validate(true)) return;
    save();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' }));
    link.download = 'opmeting-' + ($('dossiernummer').value || 'dossier') + '.json';
    link.click();
  }

  async function importJson(event) {
    try {
      const state = JSON.parse(await event.target.files[0].text());
      const id = uid();
      const db = readDb();
      if (!state.fields) throw Error();
      db.items[id] = newItem(id, state);
      writeDb(db);
      localStorage.setItem(ACTIVE_KEY, id);
      applyState(state);
      save();
      alert(tr('Import geslaagd.', 'Importation réussie.'));
    } catch {
      alert(tr('Import mislukt.', 'Importation échouée.'));
    }
    event.target.value = '';
  }

  /* ---- Init ---- */

  function init() {
    $('btn-dossiers').onclick = () => { renderList(); dialog.showModal(); };
    $('dos-close').onclick = () => dialog.close();
    $('dos-search').oninput = renderList;
    $('dos-new').onclick = newDossier;
    $('btn-export-json').onclick = exportJson;
    $('btn-import-json').onclick = () => $('json-file-input').click();
    $('json-file-input').onchange = importJson;

    // Elke wijziging in het formulier wordt (gebundeld) automatisch bewaard.
    const form = $('opmeting-form');
    form.addEventListener('input', scheduleSave);
    form.addEventListener('change', scheduleSave);
  }

  /** Bij het opstarten: laad het actieve dossier (of maak een eerste dossier aan en pas het toe). */
  function restoreActive() {
    const id = ensureActive();
    applyState(readDb().items[id].state);
    renderList();
  }

  Mesure.dossiers = { init, restoreActive, save, scheduleSave };
})();
