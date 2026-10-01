/* Opmeting Mesure – formulierlogica: validatie, afhankelijke velden, vloergeleider-schets en antipaniek-raillengte. */
(() => {
  'use strict';
  const { $, tr } = Mesure;

  /** Afmetingsvelden die verplicht worden afhankelijk van wat vervangen wordt. */
  const DIMENSION_IDS = [
    'dim-tb', 'dim-th', 'dim-lb', 'dim-lh', 'dim-kap-h', 'dim-kap-d',
    'dim-spl-b', 'dim-spl-h', 'dim-spr-b', 'dim-spr-h',
    'dim-vpl-b', 'dim-vpl-h', 'dim-vpr-b', 'dim-vpr-h'
  ];

  /** Checkboxen "Wat wordt vervangen?" die de verplichte afmetingen bepalen. */
  const REPLACE_IDS = [
    'replace-aandrijving', 'replace-zonder-kap', 'replace-vleugel-l', 'replace-vleugel-r',
    'replace-beide-vleugels', 'replace-vast-l', 'replace-vast-r', 'replace-beide-vast'
  ];

  /** Basisvelden die altijd verplicht zijn: [id, label NL, label FR]. */
  const REQUIRED_BASE_FIELDS = [
    ['werf', 'Werf', 'Chantier'],
    ['datum-opmeting', 'Datum', 'Date de mesure'],
    ['dossiernummer', 'Dossiernummer', 'Numéro de dossier'],
    ['contactpersoon', 'Contactpersoon', 'Personne de contact'],
    ['locatie', 'Locatie', 'Emplacement'],
    ['deurlocatie', 'Deurlocatie', 'Emplacement de la porte'],
    ['technieker', 'Naam technieker', 'Nom du technicien']
  ];

  const checked = (id) => $(id).checked;

  /** Welke afmetingsvelden zijn nu verplicht (Set van ids)? */
  function requiredDimensions() {
    const required = new Set();
    const add = (...ids) => ids.forEach((id) => required.add(id));
    if (checked('replace-aandrijving')) {
      add('dim-tb', 'dim-th', 'dim-lb', 'dim-lh');
      if (!checked('replace-zonder-kap')) add('dim-kap-h', 'dim-kap-d');
    }
    if (checked('replace-vleugel-l') || checked('replace-beide-vleugels')) add('dim-spl-b', 'dim-spl-h');
    if (checked('replace-vleugel-r') || checked('replace-beide-vleugels')) add('dim-spr-b', 'dim-spr-h');
    if (checked('replace-vast-l') || checked('replace-beide-vast')) add('dim-vpl-b', 'dim-vpl-h');
    if (checked('replace-vast-r') || checked('replace-beide-vast')) add('dim-vpr-b', 'dim-vpr-h');
    return required;
  }

  /** Markeer verplichte afmetingsvelden (required + oranje rand). */
  function updateRequiredMarks() {
    const required = requiredDimensions();
    for (const id of DIMENSION_IDS) {
      const el = $(id);
      const isRequired = required.has(id);
      el.required = isRequired;
      el.classList.toggle('required-active', isRequired);
    }
  }

  /**
   * Valideer het formulier. Markeert fouten en toont (indien `show`) de foutenlijst.
   * @returns {boolean} true als alles geldig is
   */
  function validate(show = true) {
    Mesure.visual.flush(); // de schets kopieert afmetingen (dubbele schuifdeur) naar invoervelden
    const errors = [];
    const required = requiredDimensions();
    const mandatory = tr('is verplicht.', 'est obligatoire.');

    document.querySelectorAll('.field-error').forEach((el) => el.classList.remove('field-error'));

    for (const [id, nl, fr] of REQUIRED_BASE_FIELDS) {
      const el = $(id);
      if (!el.value.trim()) {
        el.classList.add('field-error');
        errors.push(tr(nl, fr) + ' ' + mandatory);
      }
    }

    for (const id of DIMENSION_IDS) {
      const el = $(id);
      const value = el.value.trim();
      const label = () => el.previousElementSibling?.textContent || id;
      if (required.has(id) && !value) {
        el.classList.add('field-error');
        errors.push(label() + ' ' + mandatory);
      } else if (value && Number(value) <= 0) {
        el.classList.add('field-error');
        errors.push(label() + ' ' + tr('moet groter zijn dan 0.', 'doit être supérieur à 0.'));
      }
    }

    const box = $('validation-box');
    box.replaceChildren();
    if (errors.length && show) {
      box.classList.add('show');
      const list = document.createElement('ul');
      errors.forEach((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        list.append(item);
      });
      box.append(list);
    } else {
      box.classList.remove('show');
    }
    return !errors.length;
  }

  /** Security-rij (RC2/RC3) is alleen zichtbaar voor een schuifdeur met ES PROLINE-aandrijving. */
  function updateSecurityRow() {
    const visible = $('deurtype').value === 'Schuifdeur' && ($('aandrijving-select').value || '').startsWith('ES PROLINE');
    $('proline-security-row').classList.toggle('hidden', !visible);
    if (!visible) {
      $('security-rc2').checked = false;
      $('security-rc3').checked = false;
    }
  }

  /** Raillengte-indicator voor het antipaniek-vloergeleider. */
  function updateAntipaniekLength() {
    const output = $('antipaniek-raillengte');
    if ($('vloergeleider').value !== 'Antipaniek') {
      output.hidden = true;
      output.textContent = '';
      return;
    }
    const leafLeft = Number($('dim-spl-b').value || 0);
    const count = ($('openingswijze').value || '').includes('Dubbel') ? 2 : 1;
    output.hidden = false;
    if (leafLeft > 0) {
      output.textContent = `${count} × ${leafLeft + 100} mm`;
      output.title = tr('Lengte deurvleugel links + 100 mm', 'Longueur du vantail gauche + 100 mm');
    } else {
      output.textContent = tr(
        `${count} × — mm (linker vleugelbreedte vereist)`,
        `${count} × — mm (largeur gauche requise)`
      );
    }
  }

  const GUIDE_GROUPS = ['guide-small-u', 'guide-small-l', 'guide-full', 'guide-ap-l', 'guide-ap-r'];

  /** Teken de vloergeleider onderaan de schets (U/L/Omega/U-profiel/Antipaniek). */
  function updateFloorGuide() {
    Mesure.visual.flush(); // geometrie van de panelen moet actueel zijn
    const type = $('vloergeleider').value || '';
    const opening = $('openingswijze').value || '';
    const isDouble = opening.includes('Dubbel');
    const isLeft = opening.includes('Links');

    GUIDE_GROUPS.forEach((id) => { $(id).style.opacity = '0'; });
    if ($('deurtype').value === 'Draaideur') return;

    if (type === 'U-Model' || type === 'L-Model') {
      const group = $(type === 'U-Model' ? 'guide-small-u' : 'guide-small-l');
      group.style.opacity = '1';
      // Rechtsopenend: spiegel het guide-stuk naar de rechterzijde.
      if (!isDouble && !isLeft) group.setAttribute('transform', 'translate(530 0) scale(-1 1)');
      else group.removeAttribute('transform');
    }
    if (type === 'Omega-rail' || type === 'U-profiel') {
      $('guide-full').style.opacity = '1';
      $('guide-full-rect').setAttribute('fill', type === 'Omega-rail' ? '#6366f1' : '#f59e0b');
      $('guide-full-text').textContent = type.toUpperCase();
    }
    if (type === 'Antipaniek') {
      const addGuide = (groupId, rectId, panelId) => {
        const panel = $(panelId);
        const x = +panel.getAttribute('x');
        const width = +panel.getAttribute('width');
        if (width > 0) {
          $(groupId).style.opacity = '1';
          $(rectId).setAttribute('x', x);
          $(rectId).setAttribute('width', width);
        }
      };
      if (isDouble || isLeft) addGuide('guide-ap-l', 'guide-ap-l-rect', 'rect-vpl');
      if (isDouble || !isLeft) addGuide('guide-ap-r', 'guide-ap-r-rect', 'rect-vpr');
    }
  }

  /** Ververs alle afgeleide UI na een wijziging van het hele formulier (laden, reset, wissen). */
  function refreshDerived() {
    updateRequiredMarks();
    updateSecurityRow();
    updateFloorGuide();
    updateAntipaniekLength();
  }

  /** Aandrijving-opties per deurtype (waarde = tekst, enkel de placeholder is vertaald). */
  const DRIVE_OPTIONS = {
    swing: ['ED 100', 'ED 250'],
    sliding: ['ES PROLINE 250/130', 'ES PROLINE 250/180', 'ES PROLINE 400', 'ES PROLINE 500', 'CS 80 MAGNEO']
  };

  /** Deurtype gewijzigd: opties van openingswijze/arm/aandrijving en de draaideur-velden bijwerken. */
  function onDoorTypeChange() {
    const isSwing = $('deurtype').value === 'Draaideur';
    Mesure.i18n.updateSelectOptions();
    $('draaideur-extra-group').classList.toggle('hidden', !isSwing);

    const select = $('aandrijving-select');
    const placeholder = new Option(tr('Kies model...', 'Choisir modèle...'), '', true, true);
    placeholder.disabled = true;
    select.replaceChildren(placeholder);
    if (isSwing) {
      DRIVE_OPTIONS.swing.forEach((name) => select.append(new Option(name)));
    } else {
      const group = document.createElement('optgroup');
      group.label = 'Schuifdeuren - ES PROLINE';
      DRIVE_OPTIONS.sliding.forEach((name) => group.append(new Option(name)));
      select.append(group);
    }
    updateSecurityRow();
    Mesure.visual.update();
  }

  /** "Reset Velden": alles terugzetten behalve de velden in "Dossier & Klant". */
  function resetSketchAndOptions() {
    const customerInputs = Array.from($('klant-group').querySelectorAll('input'));
    const values = customerInputs.map((input) => input.value);
    $('opmeting-form').reset();
    customerInputs.forEach((input, index) => { input.value = values[index]; });
    $('deurtype').dispatchEvent(new Event('change'));
    refreshDerived();
  }

  /** "Wis Alles": na bevestiging het volledige formulier leegmaken. */
  function clearEverything() {
    if (!window.confirm(tr('Alle ingevulde gegevens wissen?', 'Effacer toutes les données saisies ?'))) return;
    const form = $('opmeting-form');
    form.reset();
    form.querySelectorAll('input[type="text"],input[type="tel"],input[type="number"],input[type="date"],textarea').forEach((el) => { el.value = ''; });
    form.querySelectorAll('input[type="checkbox"],input[type="radio"]').forEach((el) => { el.checked = false; });
    form.querySelectorAll('select').forEach((el) => { el.selectedIndex = 0; });
    document.querySelectorAll('.field-error,.required-active').forEach((el) => el.classList.remove('field-error', 'required-active'));
    const box = $('validation-box');
    box.replaceChildren();
    box.classList.remove('show');
    $('deurtype').dispatchEvent(new Event('change', { bubbles: true }));
    refreshDerived();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Velden waarvan een wijziging de schets bijwerkt. */
  const VISUAL_FIELD_IDS = new Set([
    'deurtype', 'openingswijze', 'draaideur-arm', 'dim-muur-deur-diepte',
    'profielsysteem', 'deurlocatie', 'dim-tb', 'dim-th', 'dim-lb', 'dim-lh',
    'dim-kap-h', 'dim-kap-d', 'dim-spl-b', 'dim-spl-h', 'dim-spr-b', 'dim-spr-h',
    'dim-vpl-b', 'dim-vpl-h', 'dim-vpr-b', 'dim-vpr-h', 'vloergeleider',
    'slotmechanisme', 'vloerslot-type', 'dim-vloerslot-pos', 'ral-kleur',
    'aandrijving-select', 'dim-draai-asm', 'dim-glaslat-d', 'dim-glasmaat',
    'dim-prof-boven', 'dim-prof-onder', 'dim-prof-zijkant', 'dim-glaslat-d-r',
    'dim-glasmaat-r'
  ]);

  /** Koppel alle formulier-events. */
  function init() {
    const form = $('opmeting-form');

    // Eén gedelegeerde luisteraar voor de schets (gebundeld per frame).
    const onFieldEvent = (event) => {
      if (!VISUAL_FIELD_IDS.has(event.target.id)) return;
      if (event.type === 'change' && event.target.id === 'deurtype') return; // onDoorTypeChange rendert zelf
      Mesure.visual.schedule();
    };
    form.addEventListener('input', onFieldEvent);
    form.addEventListener('change', onFieldEvent);

    $('deurtype').addEventListener('change', onDoorTypeChange);
    $('aandrijving-select').addEventListener('change', updateSecurityRow);

    $('security-rc2').addEventListener('change', (e) => { if (e.target.checked) $('security-rc3').checked = false; });
    $('security-rc3').addEventListener('change', (e) => { if (e.target.checked) $('security-rc2').checked = false; });
    REPLACE_IDS.forEach((id) => $(id).addEventListener('change', updateRequiredMarks));

    $('vloergeleider').addEventListener('change', () => { updateFloorGuide(); updateAntipaniekLength(); });
    $('openingswijze').addEventListener('change', updateAntipaniekLength);
    $('dim-spl-b').addEventListener('input', updateAntipaniekLength);

    $('btn-clear-all').addEventListener('click', clearEverything);
    $('btn-reset-fields').addEventListener('click', resetSketchAndOptions);
  }

  Mesure.form = { init, validate, refreshDerived, onDoorTypeChange, updateAntipaniekLength };
})();
