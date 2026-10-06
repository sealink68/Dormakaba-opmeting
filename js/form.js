/* Opmeting Mesure – formulierlogica: validatie, afhankelijke velden, vloergeleider (meerkeuze) + schets,
   antipaniek-raillengte en alu-montageplaat. */
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

  /** Breedte vast paneel mag 0 zijn = geen vast paneel (de schets tekent dan muur). */
  const ZERO_ALLOWED_IDS = new Set(['dim-vpl-b', 'dim-vpr-b']);

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
      } else if (value && (Number(value) < 0 || (Number(value) === 0 && !(ZERO_ALLOWED_IDS.has(id) && !required.has(id))))) {
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
    if (!selectedFloorGuides().includes('Antipaniek')) {
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

  /* ---- Vloergeleider: meerkeuze (chips met checkboxen) ---- */

  /** Types in vaste volgorde: [waarde, checkbox-id]. "Zonder" is exclusief. */
  const FLOOR_GUIDE_TYPES = [
    ['U-Model', 'vg-u-model'], ['L-Model', 'vg-l-model'], ['Omega-rail', 'vg-omega-rail'],
    ['U-profiel', 'vg-u-profiel'], ['Antipaniek', 'vg-antipaniek']
  ];
  const FLOOR_GUIDE_NONE = 'Zonder';

  /** Aangevinkte vloergeleider-types (zonder "Zonder"), in vaste volgorde. */
  function selectedFloorGuides() {
    return FLOOR_GUIDE_TYPES.filter(([, id]) => $(id).checked).map(([value]) => value);
  }

  /**
   * Houd de chips consistent: "Zonder" staat aan als niets anders gekozen is,
   * zet de chip-stijl en schrijf de samenvatting in het verborgen veld #vloergeleider.
   */
  function syncFloorGuideChips() {
    const selected = selectedFloorGuides();
    $('vg-zonder').checked = selected.length === 0;
    $('vloergeleider-group').querySelectorAll('.vg-chip').forEach((chip) => {
      chip.classList.toggle('is-on', chip.querySelector('input').checked);
    });
    $('vloergeleider').value = selected.length ? selected.join(', ') : FLOOR_GUIDE_NONE;
  }

  /** Klik op een chip: "Zonder" wist de rest; een type kiezen zet "Zonder" uit. */
  function onFloorGuideChange(event) {
    const input = event.target;
    if (input === $('vg-zonder')) {
      if (input.checked) FLOOR_GUIDE_TYPES.forEach(([, id]) => { $(id).checked = false; });
    }
    syncFloorGuideChips();
    updateFloorGuide();
    updateAntipaniekLength();
    Mesure.visual.schedule();
  }

  /**
   * Zet de vloergeleider-keuze uit opgeslagen velden. Nieuwe dossiers bevatten de vg-*-checkboxen;
   * oude dossiers enkel `vloergeleider` met één waarde (bv. "Antipaniek").
   */
  function applyFloorGuideFields(fields) {
    const hasNew = FLOOR_GUIDE_TYPES.some(([, id]) => id in fields);
    if (!hasNew) {
      const legacy = String(fields.vloergeleider ?? '').split(/[,|]/).map((v) => v.trim().toLowerCase());
      FLOOR_GUIDE_TYPES.forEach(([value, id]) => { $(id).checked = legacy.includes(value.toLowerCase()); });
    }
    syncFloorGuideChips();
  }

  const GUIDE_GROUPS = ['guide-small-u', 'guide-small-l', 'guide-small-u-r', 'guide-small-l-r', 'guide-full', 'guide-ap-l', 'guide-ap-r'];
  /** Maten van de kleine U/L-geleider in de schets (moet overeenkomen met SMALL_GUIDE_ZONE in visual.js). */
  const SMALL_GUIDE = { w: 14, gap: 4, margin: 4, top: 420, h: 21 };
  const FULL_GUIDE_COLORS = { 'Omega-rail': '#6366f1', 'U-profiel': '#f59e0b' };

  /**
   * Teken de gekozen vloergeleiders onderaan de schets. Meerdere types tegelijk:
   * - U-/L-Model: kleine geleider aan de rand van de doorgangsopening, op het vast paneel
   *   (of op de muur als er geen vast paneel is), aan elke kant waar de vleugel wegschuift.
   *   Beide gekozen: naast elkaar, U het dichtst bij de opening.
   * - Omega-rail + U-profiel: delen de vloerstrook (y 438–447) in twee banen.
   * - Antipaniek: rode strook onder de vaste panelen, bovenop een eventuele doorlopende rail.
   */
  function updateFloorGuide() {
    Mesure.visual.update(); // geometrie van de panelen moet actueel zijn (ook vóór de geplande render)
    const types = selectedFloorGuides();
    const opening = $('openingswijze').value || '';
    const isDouble = opening.includes('Dubbel');
    const isLeft = opening.includes('Links');

    GUIDE_GROUPS.forEach((id) => { $(id).style.opacity = '0'; });
    if ($('deurtype').value === 'Draaideur') return;

    // Kleine geleiders (U/L-Model) aan de rand van de doorgangsopening.
    // Links: rechterrand van VP L (of de muur); rechts: linkerrand van VP R (of de muur).
    const small = types.filter((t) => t === 'U-Model' || t === 'L-Model');
    if (small.length) {
      const edge = (panelId, side, fallback) => {
        const rect = $(panelId);
        const x = +rect.getAttribute('x');
        const width = +rect.getAttribute('width');
        if (!(width > 0)) return fallback;
        return side === 'l' ? x + width : x;
      };
      const { w, gap, margin, top, h } = SMALL_GUIDE;
      const draw = (groupId, d) => {
        const group = $(groupId);
        group.removeAttribute('transform');
        group.querySelectorAll('path').forEach((path) => path.setAttribute('d', d));
        group.style.opacity = '1';
      };
      const sides = [];
      if (isDouble || isLeft) sides.push(['l', edge('rect-vpl', 'l', 50)]);
      if (isDouble || !isLeft) sides.push(['r', edge('rect-vpr', 'r', 550)]);
      for (const [side, opening] of sides) {
        small.forEach((type, index) => {
          const isU = type === 'U-Model';
          const offset = margin + index * (w + gap);
          // Links ligt de geleider links van de openingsrand, rechts ervan (gespiegeld).
          const x0 = side === 'l' ? opening - offset - w : opening + offset;
          let d;
          if (isU) d = `M${x0} ${top}v${h}h${w}v-${h}`;
          else if (side === 'l') d = `M${x0} ${top}v${h}h${w}`; // L: staande poot buiten, voet naar de opening
          else d = `M${x0 + w} ${top}v${h}h-${w}`;
          draw(`guide-small-${isU ? 'u' : 'l'}${side === 'r' ? '-r' : ''}`, d);
        });
      }
    }

    // Banen op vloerniveau
    const full = types.filter((t) => t in FULL_GUIDE_COLORS);
    const hasAp = types.includes('Antipaniek');
    const laneCount = full.length;
    const BAND_Y = 438;
    const BAND_H = 9;
    const GAP = laneCount > 1 ? 1 : 0;
    const laneH = laneCount ? (BAND_H - GAP * (laneCount - 1)) / laneCount : BAND_H;
    const lane = (index) => ({ y: BAND_Y + index * (laneH + GAP), h: laneH });
    const setLane = (rect, index) => {
      const { y, h } = lane(index);
      rect.setAttribute('y', String(y));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', String(Math.min(3, h / 2)));
    };

    const rects = [$('guide-full-rect'), $('guide-full-rect-2')];
    if (full.length) {
      $('guide-full').style.opacity = '1';
      rects.forEach((rect, index) => {
        const type = full[index];
        rect.style.display = type ? '' : 'none';
        if (!type) return;
        rect.setAttribute('fill', FULL_GUIDE_COLORS[type]);
        setLane(rect, index);
      });
      $('guide-full-text').textContent = full.map((t) => t.toUpperCase()).join(' + ');
    }
    if (hasAp) {
      const addGuide = (groupId, rectId, panelId) => {
        const panel = $(panelId);
        const x = +panel.getAttribute('x');
        const width = +panel.getAttribute('width');
        if (width > 0 && panel.dataset.wall !== '1') { // geen antipaniek waar geen vast paneel is
          $(groupId).style.opacity = '1';
          $(rectId).setAttribute('x', x);
          $(rectId).setAttribute('width', width);
        }
      };
      if (isDouble || isLeft) addGuide('guide-ap-l', 'guide-ap-l-rect', 'rect-vpl');
      if (isDouble || !isLeft) addGuide('guide-ap-r', 'guide-ap-r-rect', 'rect-vpr');
    }
  }

  /* ---- Alu-montageplaat ---- */

  /** Lengte van de plaat: TB (schuifdeur of dubbele draaideur) of vast 700 mm (enkele draaideur; ED 100/250 = 685 mm). */
  function updateMontageplaat() {
    const isSwing = $('deurtype').value === 'Draaideur';
    const isSingleSwing = isSwing && !($('openingswijze').value || '').startsWith('Dubbel');
    const on = $('alu-montageplaat').checked;
    const field = $('montageplaat-maat');
    const tb = ($('dim-tb').value || '').trim();
    const prefix = '100 mm x 10 mm x ';

    // Alleen-lezen weergave (<output>, wordt niet opgeslagen: altijd herberekend uit deurtype/openingswijze/TB).
    let text = prefix + tr('— mm (TB invullen)', '— mm (saisir LT)');
    let empty = true;
    if (isSingleSwing) { text = prefix + '700 mm'; empty = false; }
    else if (tb && Number(tb) > 0) { text = `${prefix}${tb} mm`; empty = false; }
    if (field.textContent !== text) field.textContent = text;
    field.classList.toggle('is-empty', empty);
    field.title = isSingleSwing
      ? tr('Enkele draaideur: vaste lengte 700 mm (ED 100/250 = 685 mm)', 'Porte battante simple : longueur fixe 700 mm (ED 100/250 = 685 mm)')
      : tr('Lengte = Totaal Breedte (TB)', 'Longueur = Largeur Totale (LT)');

    $('montageplaat-row').classList.toggle('is-off', !on);
    $('montageplaat-hint').hidden = !(on && isSwing);
  }

  /** Ververs alle afgeleide UI na een wijziging van het hele formulier (laden, reset, wissen). */
  function refreshDerived() {
    updateRequiredMarks();
    updateSecurityRow();
    syncFloorGuideChips();
    updateFloorGuide();
    updateAntipaniekLength();
    updateMontageplaat();
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
    updateFloorGuide();
    updateMontageplaat();
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
    'dim-vpl-b', 'dim-vpl-h', 'dim-vpr-b', 'dim-vpr-h',
    'slotmechanisme', 'vloerslot-type', 'dim-vloerslot-pos', 'ral-kleur',
    'aandrijving-select', 'dim-draai-asm', 'dim-glaslat-d', 'dim-glasmaat',
    'dim-prof-boven', 'dim-prof-onder', 'dim-prof-sluitkant', 'dim-prof-openingskant',
    'dim-prof-sluitkant-r', 'dim-prof-openingskant-r', 'dim-glaslat-d-r', 'dim-glasmaat-r'
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

    $('vloergeleider-group').addEventListener('change', onFloorGuideChange);
    $('openingswijze').addEventListener('change', () => { updateFloorGuide(); updateAntipaniekLength(); updateMontageplaat(); });
    $('dim-spl-b').addEventListener('input', updateAntipaniekLength);
    $('dim-tb').addEventListener('input', updateMontageplaat);
    // Vast paneel 0 = muur: antipaniek-geleider aan die kant vervalt
    ['dim-vpl-b', 'dim-vpr-b'].forEach((id) => $(id).addEventListener('input', updateFloorGuide));
    $('alu-montageplaat').addEventListener('change', updateMontageplaat);

    $('btn-clear-all').addEventListener('click', clearEverything);
    $('btn-reset-fields').addEventListener('click', resetSketchAndOptions);
  }

  Mesure.form = {
    init, validate, refreshDerived, onDoorTypeChange, updateAntipaniekLength, updateMontageplaat,
    selectedFloorGuides, applyFloorGuideFields
  };
})();
