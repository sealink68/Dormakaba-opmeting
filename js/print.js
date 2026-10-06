/* Opmeting Mesure – afdrukken / PDF: bestandsnaam (document.title), printkop en voettekst.
   In een beginscherm-app (standalone) opent window.print() niets; dan maken we hier een A4-PDF. */
(() => {
  'use strict';
  const { $, tr } = Mesure;

  /** html2pdf.js 0.10.2 (html2canvas + jsPDF), pas geladen als er echt een PDF nodig is. */
  const HTML2PDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';

  let html2pdfLoading = null;
  let pdfBezig = false;

  /** Maak een tekst veilig voor een bestandsnaam. */
  const sanitize = (text) => text.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_{2,}/g, '_');

  /** Beginscherm-app: iOS (navigator.standalone) of display-mode standalone. */
  function isStandalone() {
    const standaloneMedia = window.matchMedia && window.matchMedia('(display-mode: standalone)');
    return navigator.standalone === true || !!(standaloneMedia && standaloneMedia.matches);
  }

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

  /** Laad html2pdf.js één keer van de CDN. */
  function loadHtml2Pdf() {
    if (typeof window.html2pdf === 'function') return Promise.resolve(window.html2pdf);
    if (html2pdfLoading) return html2pdfLoading;
    html2pdfLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HTML2PDF_SRC;
      script.async = true;
      script.onload = () => {
        if (typeof window.html2pdf === 'function') resolve(window.html2pdf);
        else reject(new Error('html2pdf ontbreekt na het laden'));
      };
      script.onerror = () => {
        html2pdfLoading = null;
        reject(new Error('html2pdf laden mislukt'));
      };
      document.head.appendChild(script);
    });
    return html2pdfLoading;
  }

  /** Voer herstel-functies uit, laatst toegevoegd eerst. */
  function runUndo(undo) {
    while (undo.length) undo.pop()();
  }

  /**
   * Kopieer invoerwaarden naar attributen. html2pdf kloont het formulier en
   * neemt bij gewone invoervelden het value-attribuut mee, niet de getypte waarde.
   */
  function syncControlState() {
    const undo = [];
    document.querySelectorAll('input').forEach((input) => {
      if (input.type === 'file') return;
      if (input.type === 'checkbox' || input.type === 'radio') {
        const had = input.hasAttribute('checked');
        if (input.checked) input.setAttribute('checked', '');
        else input.removeAttribute('checked');
        undo.push(() => {
          if (had) input.setAttribute('checked', '');
          else input.removeAttribute('checked');
        });
        return;
      }
      const hadAttr = input.hasAttribute('value');
      const prev = input.getAttribute('value');
      input.setAttribute('value', input.value);
      undo.push(() => {
        if (hadAttr) input.setAttribute('value', prev);
        else input.removeAttribute('value');
      });
    });
    document.querySelectorAll('textarea').forEach((area) => {
      const value = area.value;
      area.textContent = value;
      undo.push(() => {
        area.value = value;
      });
    });
    return () => runUndo(undo);
  }

  /** Zet een vervangende tekst naast een veld en verberg het veld zelf tijdens het rasteren. */
  function standIn(control, text) {
    const stand = document.createElement('span');
    stand.className = 'pdf-select-value';
    stand.style.fontWeight = window.getComputedStyle(control).fontWeight;
    stand.textContent = text;
    control.after(stand);
    control.classList.add('pdf-control-source');
    return () => {
      stand.remove();
      control.classList.remove('pdf-control-source');
    };
  }

  /**
   * html2canvas tekent <select> vaak leeg en een datumveld als ISO-tekst.
   * Toon daarom de zichtbare keuze / de lokale datumnotatie (zoals bij afdrukken).
   */
  function standInControls() {
    const undo = [];
    document.querySelectorAll('select').forEach((select) => {
      const option = select.options[select.selectedIndex];
      undo.push(standIn(select, option ? option.text : ''));
    });
    document.querySelectorAll('input[type="date"]').forEach((input) => {
      if (!input.value) return;
      const parts = input.value.split('-');
      const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const text = Number.isNaN(date.getTime())
        ? input.value
        : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
      undo.push(standIn(input, text));
    });
    return () => runUndo(undo);
  }

  /**
   * html2canvas snijdt de schets (viewBox met negatieve x) verkeerd af.
   * Teken de SVG eerst met de browser naar een PNG, begrensd op 95mm hoogte
   * zoals de print-CSS, en zet die afbeelding in de plaats tijdens het rasteren.
   */
  function rasterizeSketch() {
    const svg = $('door-visual');
    if (!svg) return Promise.resolve(() => {});
    const vb = svg.viewBox.baseVal;
    const aspect = vb.width ? vb.height / vb.width : 500 / 680;
    const mmToPx = 96 / 25.4;
    const maxH = 95 * mmToPx;
    const maxW = (210 - 24) * mmToPx - 32; // A4-inhoud minus groepspadding
    let width = maxW;
    let height = width * aspect;
    if (height > maxH) {
      height = maxH;
      width = height / aspect;
    }
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));

    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = 'text { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }';
    clone.insertBefore(style, clone.firstChild);
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        const image = document.createElement('img');
        image.src = canvas.toDataURL('image/png');
        image.alt = '';
        image.className = 'pdf-sketch';
        image.style.width = width + 'px';
        image.style.height = height + 'px';
        image.style.maxWidth = '100%';
        const prevDisplay = svg.style.display;
        svg.style.display = 'none';
        svg.after(image);
        URL.revokeObjectURL(url);
        resolve(() => {
          image.remove();
          svg.style.display = prevDisplay;
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('schets rasteren mislukt'));
      };
      img.src = url;
    });
  }

  /** Knip witruimte onderaan weg zodat afronding geen lege extra pagina maakt. */
  function trimCanvasBottom(canvas) {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return canvas;
      const stepX = Math.max(1, Math.floor(w / 80));
      let y = h - 1;
      for (; y >= 0; y -= 2) {
        const data = ctx.getImageData(0, y, w, 1).data;
        let ink = false;
        for (let x = 0; x < w; x += stepX) {
          const i = x * 4;
          if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
            ink = true;
            break;
          }
        }
        if (ink) break;
      }
      const keep = Math.min(h, y + 8);
      if (keep >= h - 2) return canvas;
      const trimmed = document.createElement('canvas');
      trimmed.width = w;
      trimmed.height = Math.max(1, keep);
      trimmed.getContext('2d').drawImage(canvas, 0, 0);
      return trimmed;
    } catch (err) {
      return canvas;
    }
  }

  /**
   * Houd een kop samen met het blok eronder. html2pdf negeert break-after:avoid,
   * maar respecteert break-inside op een wrapper.
   */
  function keepSectionsTogether() {
    const undo = [];
    document.querySelectorAll('.ios-header').forEach((header) => {
      if (header.closest('.no-print')) return;
      const group = header.nextElementSibling;
      if (!group || !group.classList.contains('ios-group')) return;
      const wrap = document.createElement('div');
      wrap.className = 'pdf-keep';
      header.before(wrap);
      wrap.append(header, group);
      undo.push(() => wrap.replaceWith(header, group));
    });
    return () => runUndo(undo);
  }

  /** Verberg de vaste HTML-voettekst; die komt per pagina via jsPDF. */
  function hideFooterForCanvas() {
    const footer = document.querySelector('.print-footer');
    const prev = footer.getAttribute('style');
    footer.style.setProperty('display', 'none', 'important');
    return () => {
      if (prev === null) footer.removeAttribute('style');
      else footer.setAttribute('style', prev);
    };
  }

  /** Bestandsnaam + "Page N" onderaan elke A4-pagina (zelfde tekst als de printvoettekst). */
  function stempelVoettekst(pdf, bestandsnaam) {
    const total = pdf.internal.getNumberOfPages();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);
    for (let page = 1; page <= total; page += 1) {
      pdf.setPage(page);
      pdf.setDrawColor(170, 170, 170);
      pdf.setLineWidth(0.2);
      pdf.line(12, pageHeight - 9, pageWidth - 12, pageHeight - 9);
      pdf.text(bestandsnaam + ' • Page ' + page, pageWidth / 2, pageHeight - 5.5, { align: 'center' });
    }
  }

  /** Deelsheet als dat kan (iOS: Bewaar in Bestanden / Print / Mail), anders download via blob-URL. */
  async function deliverPdf(blob, filename) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    let canShareFiles = false;
    try {
      canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    } catch (err) {
      canShareFiles = false;
    }
    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title: filename });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // gebruiker sloot de deelsheet
        // NotAllowedError: het klik-gebaar is verlopen na het rasteren. Val terug op download.
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /** Maak een A4-PDF van de printlayout en lever die af. */
  async function maakPdfInApp(button) {
    if (pdfBezig) return;
    pdfBezig = true;
    const buttons = Array.from(document.querySelectorAll('[data-action="print"]'));
    const previous = buttons.map((item) => item.textContent);
    buttons.forEach((item) => {
      item.disabled = true;
      item.setAttribute('aria-busy', 'true');
    });
    if (button && button.nodeType === 1) {
      button.textContent = tr('PDF wordt gemaakt…', 'Création du PDF…');
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const undo = [];
    try {
      // Eerst de knoptekst laten zien; daarna pas de printlayout (die de knop verbergt).
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const html2pdf = await loadHtml2Pdf();

      document.body.classList.add('pdf-mode');
      undo.push(() => document.body.classList.remove('pdf-mode'));
      undo.push(hideFooterForCanvas());
      undo.push(syncControlState());
      undo.push(standInControls());
      undo.push(keepSectionsTogether());
      undo.push(await rasterizeSketch());
      window.scrollTo(0, 0);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const filename = document.title + '.pdf';
      const worker = html2pdf().set({
        margin: [12, 12, 12, 12],
        filename: filename,
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.pdf-keep', '.ios-group', '.ios-row', '#door-visual']
        },
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
                     scrollX: 0,
                     scrollY: 0,
          // SVG-verwijzingen (url(#id)) moeten naar de kloon wijzen, niet naar het origineel.
          onclone(doc) {
            const overlay = doc.querySelector('.html2pdf__overlay');
            if (!overlay) return;
            Array.from(doc.body.children).forEach((child) => {
              if (child !== overlay) child.remove();
            });
            const container = overlay.querySelector('.html2pdf__container');
            overlay.style.overflow = 'visible';
            overlay.style.opacity = '1';
            overlay.style.background = 'transparent';
            overlay.style.right = 'auto';
            overlay.style.bottom = 'auto';
            overlay.style.height = 'auto';
            if (container) overlay.style.width = container.style.width;
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(document.body).toContainer().then(function () {
        const container = this.prop.container;
        const overlay = this.prop.overlay;
        container.style.left = '0';
        container.style.right = 'auto';
        container.style.margin = '0';
        overlay.style.right = 'auto';
        overlay.style.width = container.style.width;
      }).toCanvas().then(function () {
        this.prop.canvas = trimCanvasBottom(this.prop.canvas);
      }).toPdf();

      const pdf = await worker.get('pdf');
      stempelVoettekst(pdf, document.title);
      const blob = pdf.output('blob');

      runUndo(undo);
      window.scrollTo(scrollX, scrollY);
      await deliverPdf(blob, filename);
    } catch (err) {
      runUndo(undo);
      window.scrollTo(scrollX, scrollY);
      console.error(err);
      alert(tr(
        'De PDF kon niet worden gemaakt. Controleer je internetverbinding en probeer opnieuw.',
        'Impossible de créer le PDF. Vérifiez la connexion et réessayez.'
      ));
    } finally {
      runUndo(undo);
      window.scrollTo(scrollX, scrollY);
      buttons.forEach((item, index) => {
        item.textContent = previous[index];
        item.disabled = false;
        item.removeAttribute('aria-busy');
      });
      pdfBezig = false;
    }
  }

  /** Valideer, bewaar en open het printvenster (of, in app-modus, maak een PDF). */
  function validatedPrint(event) {
    if (!Mesure.form.validate(true)) return;
    Mesure.dossiers.save();
    updatePrintMeta();
    if (isStandalone()) {
      maakPdfInApp(event && event.currentTarget);
      return;
    }
    window.print();
  }

  function init() {
    document.querySelectorAll('[data-action="print"]').forEach((button) => button.addEventListener('click', validatedPrint));
    window.addEventListener('beforeprint', updatePrintMeta);
  }

  Mesure.print = { init };
})();
