/* Opmeting Mesure – opstart: koppelt alle modules en herstelt het actieve dossier. */
(() => {
  'use strict';

  Mesure.form.init();
  Mesure.ral.init();
  Mesure.dossiers.init();
  Mesure.print.init();
  Mesure.iosProfile.init();

  Mesure.$('lang-toggle').addEventListener('change', (event) => Mesure.i18n.setLanguage(event.target.checked ? 'fr' : 'nl'));

  window.addEventListener('load', () => {
    Mesure.i18n.applyTranslations();
    Mesure.i18n.updateSelectOptions();
    Mesure.visual.update();
    Mesure.form.refreshDerived();
    Mesure.ral.loadFullPalette();
    Mesure.dossiers.restoreActive();
  });
})();
