/* Opmeting Mesure – taalwissel (NL/FR) en dynamische select-opties. */
(() => {
  'use strict';
  const { $, tr } = Mesure;

  /** Openingswijze-opties: [waarde (altijd NL, wordt opgeslagen), label NL, label FR]. */
  const OPENING_OPTIONS = {
    swing: [
      ['Dubbel Binnendraaiend', 'Dubbel Binnendraaiend', "Double Ouvrant vers l'intérieur"],
      ['Dubbel Buitendraaiend', 'Dubbel Buitendraaiend', "Double Ouvrant vers l'extérieur"],
      ['Enkel DIN Links Binnendraaiend', 'Enkel DIN Links Binnendraaiend', 'Simple DIN Gauche Intérieur'],
      ['Enkel DIN Links Buitendraaiend', 'Enkel DIN Links Buitendraaiend', 'Simple DIN Gauche Extérieur'],
      ['Enkel DIN Rechts Binnendraaiend', 'Enkel DIN Rechts Binnendraaiend', 'Simple DIN Droite Intérieur'],
      ['Enkel DIN Rechts Buitendraaiend', 'Enkel DIN Rechts Buitendraaiend', 'Simple DIN Droite Extérieur']
    ],
    sliding: [
      ['Dubbel (Centraal)', 'Dubbel (Centraal)', 'Double (Central)'],
      ['Linksopenend (OG)', 'Linksopenend (OG)', 'Ouverture Gauche (OG)'],
      ['Rechtsopenend (OR)', 'Rechtsopenend (OR)', 'Ouverture Droite (OR)']
    ]
  };

  /** Vul alle [data-i18n] en [data-i18n-placeholder] elementen in de actieve taal. */
  function applyTranslations() {
    const dict = Mesure.translations[Mesure.lang];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const text = dict[el.getAttribute('data-i18n')];
      if (text) el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const text = dict[el.getAttribute('data-i18n-placeholder')];
      if (text) el.placeholder = text;
    });
  }

  /** Vertaal de dynamische select-opties (deurtype, openingswijze, armsoort). */
  function updateSelectOptions() {
    const deurtype = $('deurtype');
    deurtype.options[0].text = tr('Schuifdeur', 'Porte coulissante');
    deurtype.options[1].text = tr('Draaideur', 'Porte battante');

    const opening = $('openingswijze');
    const previous = opening.value;
    const list = deurtype.value === 'Draaideur' ? OPENING_OPTIONS.swing : OPENING_OPTIONS.sliding;
    opening.replaceChildren(...list.map(([value, nl, fr]) => new Option(tr(nl, fr), value)));
    // Een taalwissel mag de gekozen openingswijze niet resetten.
    if (list.some(([value]) => value === previous)) opening.value = previous;

    const arm = $('draaideur-arm');
    arm.options[0].text = tr('Glijarm (Push / Pull)', 'Bras à glissière (Push/Pull)');
    arm.options[1].text = tr('Schaararm (Push / Pull)', 'Bras à compas (Push/Pull)');
  }

  /** Zet de taal ('nl' | 'fr'), werk de NL/FR-labels bij en ververs vertalingen en schets. */
  function setLanguage(lang) {
    const isFr = lang === 'fr';
    Mesure.lang = isFr ? 'fr' : 'nl';
    $('lang-toggle').checked = isFr;

    $('lang-lbl-nl').classList.toggle('text-[#007AFF]', !isFr);
    $('lang-lbl-nl').classList.toggle('text-gray-400', isFr);
    $('lang-lbl-fr').classList.toggle('text-[#007AFF]', isFr);
    $('lang-lbl-fr').classList.toggle('text-gray-400', !isFr);

    applyTranslations();
    updateSelectOptions();
    Mesure.visual.update(); // dynamische SVG-labels
    Mesure.ral.renderResults($('ral-kleur').value);
    Mesure.form.updateAntipaniekLength();
  }

  Mesure.i18n = { applyTranslations, updateSelectOptions, setLanguage };
})();
