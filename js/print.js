/* Opmeting Mesure – afdrukken / PDF: bestandsnaam (document.title), printkop en voettekst. */
(() => {
  'use strict';
  const { $ } = Mesure;

  /** Maak een tekst veilig voor een bestandsnaam. */
  const sanitize = (text) => text.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_{2,}/g, '_');

  /** Zet document.title (= standaard PDF-bestandsnaam), de printkop en de bestandsnaam in de voettekst. */
  function updatePrintMeta() {
    Mesure.visual.flush();
    const werf = $('werf').value || 'Onbekend';
    const dossier = $('dossiernummer').value || 'GeenNummer';
    const dateValue = $('datum-opmeting').value;

    let dateText = '00_00_00';
    if (dateValue) {
      const [year, month, day] = dateValue.split('-');
      dateText = `${day}_${month}_${year.slice(-2)}`;
    }
    const fileName = `Opmeting_Mesure_${sanitize(werf)}_${sanitize(dossier)}_${dateText}`;

    document.title = fileName;
    $('print-meta').textContent = [
      $('dossiernummer').value, $('werf').value, $('datum-opmeting').value, $('technieker').value
    ].filter(Boolean).join(' • ');
    $('print-footer-filename').textContent = fileName; // "Page N" komt uit de CSS-teller
  }

  /** Valideer, bewaar en open het printvenster. */
  function validatedPrint() {
    if (!Mesure.form.validate(true)) return;
    Mesure.dossiers.save();
    updatePrintMeta();
    window.print();
  }

  function init() {
    document.querySelectorAll('[data-action="print"]').forEach((button) => button.addEventListener('click', validatedPrint));
    window.addEventListener('beforeprint', updatePrintMeta);
  }

  Mesure.print = { init };
})();
