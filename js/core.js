/* Opmeting Mesure – kern: globale namespace `Mesure`, element-cache en kleine helpers. */
window.Mesure = (() => {
  'use strict';

  const elementCache = new Map();

  /** getElementById met cache (alle opgevraagde elementen blijven bestaan in de DOM). */
  const $ = (id) => {
    let el = elementCache.get(id);
    if (!el) {
      el = document.getElementById(id);
      if (el) elementCache.set(id, el);
    }
    return el;
  };

  /**
   * Bundelt meerdere triggers in dezelfde frame tot één render.
   * `schedule()` plant een render in; `now()` rendert meteen en annuleert een geplande render.
   */
  function frameDebounce(render) {
    let frameId = 0;
    return {
      schedule() {
        if (!frameId) {
          frameId = requestAnimationFrame(() => {
            frameId = 0;
            render();
          });
        }
      },
      /** Render alleen als er een render gepland staat. */
      flush() {
        if (frameId) this.now();
      },
      now() {
        if (frameId) {
          cancelAnimationFrame(frameId);
          frameId = 0;
        }
        render();
      }
    };
  }

  const Mesure = {
    $,
    frameDebounce,
    /** Actieve taal: 'nl' of 'fr'. */
    lang: 'nl',
    /** Kies de tekst voor de actieve taal. */
    tr: (nl, fr) => (Mesure.lang === 'fr' ? fr : nl)
  };
  return Mesure;
})();
