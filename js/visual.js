/* Opmeting Mesure – live technische schets (SVG #door-visual) en bijbehorende label-/paneelvelden. */
(() => {
  'use strict';
  const { $, tr } = Mesure;

  /* ---- Kleine DOM-helpers: schrijven alleen als de waarde echt verandert ---- */

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }
  function setAttr(el, name, value) {
    const text = String(value);
    if (el.getAttribute(name) !== text) el.setAttribute(name, text);
  }
  function setOpacity(el, visible) {
    const value = visible ? '1' : '0';
    if (el.style.opacity !== value) el.style.opacity = value;
  }
  function setDisplay(el, value) {
    if (el.style.display !== value) el.style.display = value;
  }
  function setHidden(el, hidden) {
    el.classList.toggle('hidden', hidden);
  }

  /** Perceptuele helderheid (0-255) van een hex-kleur; ongeldige waarden tellen als licht (255). */
  function brightness(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) return 255;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  /* ---- Element-cache (eenmalig opgebouwd, de DOM-structuur is statisch) ---- */

  let els = null;

  function collectElements() {
    const input = (id) => $('dim-' + id);
    els = {
      deurtype: $('deurtype'),
      opening: $('openingswijze'),
      arm: $('draaideur-arm'),
      vloergeleider: $('vloergeleider'),
      slot: $('slotmechanisme'),
      profiel: $('profielsysteem'),
      ral: $('ral-kleur'),
      deurlocatie: $('deurlocatie'),
      printLocation: $('print-deurlocatie'),
      vloerslotGroup: $('vloerslot-positie-group'),
      koordRow: $('koordophanging-row'),
      profielRow: $('row-profielsysteem'),
      sprGroup: $('spr-dimension-group'),

      tb: input('tb'), th: input('th'), lb: input('lb'), lh: input('lh'),
      kapH: input('kap-h'), kapD: input('kap-d'),
      splB: input('spl-b'), splH: input('spl-h'), sprB: input('spr-b'), sprH: input('spr-h'),
      vplB: input('vpl-b'), vplH: input('vpl-h'), vprB: input('vpr-b'), vprH: input('vpr-h'),
      asm: input('draai-asm'), muurDiepte: input('muur-deur-diepte'),
      profBoven: input('prof-boven'), profOnder: input('prof-onder'), profZijkant: input('prof-zijkant'),
      glaslatL: input('glaslat-d'), glaslatR: input('glaslat-d-r'),
      glasmaatL: input('glasmaat'), glasmaatR: input('glasmaat-r'),
      vloerslotPos: input('vloerslot-pos'),

      // panel-labels
      lblHeader: $('lbl-panel-header'),
      lblTitleL: $('lbl-panel-title-sl'), lblBL: $('lbl-panel-b-l'), lblHL: $('lbl-panel-h-l'),
      lblTitleR: $('lbl-panel-title-r'), lblBR: $('lbl-panel-b-r'), lblHR: $('lbl-panel-h-r'),

      // SVG
      valTb: $('svg-val-tb'), valTh: $('svg-val-th'), valLb: $('svg-val-lb'), valLh: $('svg-val-lh'),
      valKap: $('svg-val-kap'), valRal: $('svg-val-ral'), kapRect: $('svg-kap-rect'),
      lockEm: $('lock-em-kap'), handleL: $('handle-l'), handleR: $('handle-r'),
      railUL: $('rail-u-l'), railLL: $('rail-l-l'), railOmegaL: $('rail-omega-l'),
      railUR: $('rail-u-r'), railLR: $('rail-l-r'), railOmegaR: $('rail-omega-r'),
      hingeL: $('hinge-group-left'), hingeR: $('hinge-group-right'),
      hingeLR: $('hinge-group-left-r'), hingeRR: $('hinge-group-right-r'),

      swingOpL: $('svg-swing-op-l'), swingOpR: $('svg-swing-op-r'),
      edBoxL: $('ed-box-l'), edTxtL: $('ed-txt-l'), edBoxR: $('ed-box-r'), edTxtR: $('ed-txt-r'),
      armGlijL: $('arm-glij-l'), armGlijLineL: $('arm-glij-line-l'), armGlijDotL: $('arm-glij-dot-l'), armGlijRailL: $('arm-glij-rail-l'),
      armSchaarL: $('arm-schaar-l'), armSchaarLineL: $('arm-schaar-line-l'), armSchaarDotL: $('arm-schaar-dot-l'),
      armGlijR: $('arm-glij-r'), armGlijLineR: $('arm-glij-line-r'), armGlijDotR: $('arm-glij-dot-r'), armGlijRailR: $('arm-glij-rail-r'),
      armSchaarR: $('arm-schaar-r'), armSchaarLineR: $('arm-schaar-line-r'), armSchaarDotR: $('arm-schaar-dot-r'),

      lockTv: $('lock-tv'), rectTv: $('rect-tv-lock'), textTv: $('text-tv-lock'),
      lockGroupL: $('lock-vloer-group-l'), lockOffsetL: $('txt-lock-offset-l'), lockRectL: $('lock-vl'), lockCircleL: $('lock-vlc'),
      lockGroupR: $('lock-vloer-group-r'), lockOffsetR: $('txt-lock-offset-r'), lockRectR: $('lock-vr'), lockCircleR: $('lock-vrc'),

      calloutSwing: $('callout-swing'), calloutSwingLine: $('callout-swing-line'), swingInfo: $('txt-swing-asm'),
      calloutSpl: $('callout-spl'), calloutSplLine: $('callout-spl-line'),
      splTitle: $('txt-spl-title'), splGlas: $('txt-spl-glas'), splProf: $('txt-spl-prof'), splLat: $('txt-spl-lat'),
      calloutSpr: $('callout-spr'), calloutSprLine: $('callout-spr-line'),
      sprTitle: $('txt-spr-title'), sprGlas: $('txt-spr-glas'), sprProf: $('txt-spr-prof'), sprLat: $('txt-spr-lat')
    };

    // Per paneel (vpl, spl, spr, vpr): alle SVG-elementen één keer opzoeken.
    els.panels = {};
    for (const id of ['vpl', 'spl', 'spr', 'vpr']) {
      els.panels[id] = {
        group: $(`svg-group-${id}`),
        rect: $(`rect-${id}`),
        rect2: $(`rect-${id}-2`), // alleen spl/spr (telescopisch tweede paneel)
        text: $(`text-${id}`),
        dim: $(`svg-val-${id}-dim`),
        arrow: $(`arrow-dir-${id}`) // alleen spl/spr
      };
    }
  }

  /* ---- Paneel tekenen ---- */

  /**
   * Teken één paneel in de schets. Geeft de geometrie van de hoofd-rect terug (voor sloten/handvaten/callouts).
   * @param ctx  vooraf berekende context (isSwing, isL, isR, isDubbel, isTelescopic)
   */
  function updatePanel(ctx, id, x, w, visible, textLabel, dimVal, heightVal) {
    const p = els.panels[id];
    const { isSwing, isL, isR, isDubbel } = ctx;
    const isSliding = id === 'spl' || id === 'spr';
    setOpacity(p.group, visible);

    // Scharnieren (alleen draaideur, alleen SP-panelen); verbergen in alle andere gevallen.
    if (id === 'spl') {
      if (isSwing && visible && (isL || isDubbel)) {
        setOpacity(els.hingeL, true);
        els.hingeL.querySelectorAll('rect').forEach((r) => setAttr(r, 'x', x + 2));
      } else {
        setOpacity(els.hingeL, false);
      }
      setOpacity(els.hingeR, false);
    } else if (id === 'spr') {
      if (isSwing && visible && (isR || isDubbel)) {
        setOpacity(els.hingeRR, true);
        els.hingeRR.querySelectorAll('rect').forEach((r) => setAttr(r, 'x', x + w - 10));
      } else {
        setOpacity(els.hingeRR, false);
      }
      setOpacity(els.hingeLR, false);
    }

    if (!visible) {
      if (p.arrow) setOpacity(p.arrow, false);
      return null;
    }

    // Hoofd-rect (telescopisch: twee overlappende halve panelen)
    let rectX = x;
    let rectW = w;
    if (ctx.isTelescopic && isSliding) {
      setDisplay(p.rect2, 'block');
      const halfW = (w / 2) + 10;
      rectW = halfW;
      if (id === 'spl') {
        rectX = x + w / 2 - 10;
        setAttr(p.rect2, 'x', x);
      } else {
        setAttr(p.rect2, 'x', x + w / 2 - 10);
      }
      setAttr(p.rect2, 'width', halfW);
    } else if (p.rect2) {
      setDisplay(p.rect2, 'none');
    }
    setAttr(p.rect, 'x', rectX);
    setAttr(p.rect, 'width', rectW);

    setAttr(p.text, 'x', x + w / 2);
    setAttr(p.dim, 'x', x + w / 2);
    if (textLabel) setText(p.text, textLabel);
    const hStr = heightVal ? `H: ${heightVal}mm` : '';
    const wStr = dimVal ? tr(`B: ${dimVal}mm`, `L: ${dimVal}mm`) : '';
    setText(p.dim, (wStr || hStr) ? `${wStr} ${hStr}`.trim() : '-- x --');

    // Groene schuifrichting-pijl
    if (!isSwing && isSliding) {
      setOpacity(p.arrow, true);
      setAttr(p.arrow, 'x1', id === 'spl' ? x + w - 20 : x + 20);
      setAttr(p.arrow, 'x2', id === 'spl' ? x + 20 : x + w - 20);
      setAttr(p.arrow, 'y1', 200);
      setAttr(p.arrow, 'y2', 200);
    } else if (p.arrow) {
      setOpacity(p.arrow, false);
    }
    return { x: rectX, width: rectW };
  }

  /* ---- Hoofdrender ---- */

  function render() {
    if (!els) collectElements();
    const e = els;

    const isSwing = e.deurtype.value === 'Draaideur';
    const opening = e.opening.value || '';
    const armSoort = e.arm.value;
    const vloergeleider = e.vloergeleider.value;
    const slotType = e.slot.value;
    const isFloorLock = slotType.includes('vloer');

    const tb = e.tb.value || '--';
    const th = e.th.value || '--';
    const lb = e.lb.value || '--';
    const lh = e.lh.value || '--';
    const kapH = e.kapH.value || '--';
    const kapD = e.kapD.value || '--';
    const ralInput = e.ral.value;

    setHidden(e.vloerslotGroup, !isFloorLock);

    const deurlocatie = e.deurlocatie.value;
    setText(e.printLocation, deurlocatie ? `- ${tr('Locatie', 'Emplacement')}: ${deurlocatie}` : '');

    // Openingsrichting bepalen
    let isDubbel = false;
    let isL = false;
    let isR = false;
    if (isSwing) {
      if (opening.includes('Dubbel')) isDubbel = true;
      else if (opening.includes('Links')) isL = true;
      else isR = true; // 'Rechts' of onbekend
    } else {
      isDubbel = opening.includes('Dubbel') || opening.includes('Double');
      isL = opening.includes('Links') || opening.includes('Gauche');
      isR = opening.includes('Rechts') || opening.includes('Droite');
      if (!isDubbel && !isL && !isR) isDubbel = true;
    }

    setHidden(e.koordRow, isSwing);
    setHidden(e.profielRow, isSwing);

    // Schuifdeur dubbel: rechter paneel neemt afmetingen van het linker over
    if (!isSwing && isDubbel) {
      if (e.splB.value) e.sprB.value = e.splB.value;
      if (e.splH.value) e.sprH.value = e.splH.value;
    }

    // Paneel-labels (schuifdeur vs. draaideur)
    if (isSwing) {
      setText(e.lblHeader, tr('Deurvleugels: Links & Rechts', 'Vantaux : Gauche & Droit'));
      setText(e.lblTitleL, tr('Deur Links', 'Porte Gauche'));
      setText(e.lblBL, tr('Breedte (Deur L)', 'Largeur (Porte G)'));
      setText(e.lblHL, tr('Hoogte (Deur L)', 'Hauteur (Porte G)'));
      setText(e.lblTitleR, tr('Deur Rechts', 'Porte Droite'));
      setText(e.lblBR, tr('Breedte (Deur R)', 'Largeur (Porte D)'));
      setText(e.lblHR, tr('Hoogte (Deur R)', 'Hauteur (Porte D)'));
      setDisplay(e.sprGroup, 'block');
    } else {
      setText(e.lblHeader, tr('Schuifpaneel & Vaste Panelen', 'Panneau Coulissant & Panneaux Fixes'));
      setText(e.lblTitleL, tr('Schuifpaneel Links (SP L)', 'Panneau Coulissant Gauche (PC G)'));
      setText(e.lblBL, tr('Breedte (SP L)', 'Largeur (PC G)'));
      setText(e.lblHL, tr('Hoogte (SP L)', 'Hauteur (PC G)'));
      setText(e.lblTitleR, tr('Schuifpaneel Rechts (SP R)', 'Panneau Coulissant Droit (PC D)'));
      setText(e.lblBR, tr('Breedte (SP R)', 'Largeur (PC D)'));
      setText(e.lblHR, tr('Hoogte (SP R)', 'Hauteur (PC D)'));
      setDisplay(e.sprGroup, isDubbel ? 'none' : 'block');
    }

    // Maatlabels in de schets
    setText(e.valTb, tr('TB: ', 'LT: ') + `${tb} mm`);
    setText(e.valTh, tr('TH: ', 'HT: ') + `${th} mm`);
    setText(e.valLb, tr('LB: ', 'LP: ') + `${lb} mm`);
    setText(e.valLh, tr('LH: ', 'HP: ') + `${lh} mm`);
    setText(e.valKap, tr(`Kap H: ${kapH} / D: ${kapD}`, `Capot H: ${kapH} / P: ${kapD}`));
    setText(e.valRal, ralInput ? tr('Kleur: ', 'Couleur: ') + ralInput : '');

    // Kapkleur uit RAL-invoer
    const ralLower = ralInput.toLowerCase().trim();
    const kapColor = Mesure.ral.findHex(ralLower) || '#f3f4f6';
    const kapTextColor = brightness(kapColor) < 128 ? '#fff' : '#333';
    Mesure.ral.renderSwatches(ralLower);
    setAttr(e.kapRect, 'fill', kapColor);
    setAttr(e.valKap, 'fill', kapTextColor);
    setAttr(e.valRal, 'fill', kapTextColor);

    // Slot-, handvat- en railindicatoren
    setOpacity(e.lockEm, slotType.startsWith('em-'));
    setOpacity(e.handleL, isSwing && (isL || isDubbel));
    setOpacity(e.handleR, isSwing && (isR || isDubbel));
    setOpacity(e.railUL, !isSwing && vloergeleider === 'U-Model');
    setOpacity(e.railLL, !isSwing && vloergeleider === 'L-Model');
    setOpacity(e.railOmegaL, !isSwing && vloergeleider === 'Omega-rail');
    setOpacity(e.railUR, !isSwing && vloergeleider === 'U-Model');
    setOpacity(e.railLR, !isSwing && vloergeleider === 'L-Model');
    setOpacity(e.railOmegaR, !isSwing && vloergeleider === 'Omega-rail');

    // Panelen
    const ctx = { isSwing, isL, isR, isDubbel, isTelescopic: !isSwing && e.profiel.value.includes('TST') };
    const labels = {
      vpl: tr('VP L', 'PF G'), vpr: tr('VP R', 'PF D'),
      spl: tr('SP L', 'PC G'), spr: tr('SP R', 'PC D'),
      deurL: tr('Deur L', 'Porte G'), deurR: tr('Deur R', 'Porte D')
    };
    const dims = {
      vpl: [e.vplB.value, e.vplH.value], vpr: [e.vprB.value, e.vprH.value],
      spl: [e.splB.value, e.splH.value], spr: [e.sprB.value, e.sprH.value]
    };
    const geo = {}; // geometrie van de zichtbare panelen
    const panel = (id, x, w, visible, label) => {
      const [dimW, dimH] = dims[id];
      geo[id] = updatePanel(ctx, id, x, w, visible, label, dimW, dimH);
    };

    if (isSwing) {
      if (isDubbel) {
        panel('vpl', 50, 90, true, labels.vpl);
        panel('spl', 140, 160, true, labels.deurL);
        panel('spr', 300, 160, true, labels.deurR);
        panel('vpr', 460, 90, true, labels.vpr);
      } else if (isL) {
        panel('vpl', 50, 160, true, labels.vpl);
        panel('spl', 210, 290, true, labels.deurL);
        panel('spr', 0, 0, false);
        panel('vpr', 0, 0, false);
      } else {
        panel('vpl', 0, 0, false);
        panel('spl', 0, 0, false);
        panel('spr', 100, 290, true, labels.deurR);
        panel('vpr', 390, 160, true, labels.vpr);
      }
    } else if (isDubbel) {
      panel('vpl', 50, 100, true, labels.vpl);
      panel('spl', 150, 150, true, labels.spl);
      panel('spr', 300, 150, true, labels.spr);
      panel('vpr', 450, 100, true, labels.vpr);
    } else if (isL) {
      panel('vpl', 50, 180, true, labels.vpl);
      panel('spl', 230, 270, true, labels.spl);
      panel('spr', 0, 0, false);
      panel('vpr', 0, 0, false);
    } else {
      panel('vpl', 0, 0, false);
      panel('spl', 0, 0, false);
      panel('spr', 100, 270, true, labels.spr);
      panel('vpr', 370, 180, true, labels.vpr);
    }

    const leftSide = isL || isDubbel;
    const rightSide = isR || isDubbel;
    const splRect = geo.spl; // null als het paneel niet getekend wordt
    const sprRect = geo.spr;

    // Draaideur: aandrijving (ED) + arm
    const showOpL = isSwing && leftSide;
    const showOpR = isSwing && rightSide;
    const useGlij = armSoort.includes('Glijarm') || armSoort.includes('glissière');
    const useSchaar = armSoort.includes('Schaararm') || armSoort.includes('compas');
    setOpacity(e.swingOpL, showOpL);
    setOpacity(e.swingOpR, showOpR);
    setOpacity(e.armGlijL, showOpL && useGlij);
    setOpacity(e.armSchaarL, showOpL && useSchaar);
    setOpacity(e.armGlijR, showOpR && useGlij);
    setOpacity(e.armSchaarR, showOpR && useSchaar);

    let edBox = null; // [x, breedte] van de aandrijving waar de callout naar wijst
    if (showOpL) {
      const opX = isL ? 210 : 140;
      setAttr(e.edBoxL, 'x', opX);
      setAttr(e.edBoxL, 'width', 120);
      setAttr(e.edTxtL, 'x', opX + 60);
      if (useGlij) {
        setAttr(e.armGlijLineL, 'x1', opX + 60);
        setAttr(e.armGlijLineL, 'x2', opX + 100);
        setAttr(e.armGlijDotL, 'cx', opX + 100);
        setAttr(e.armGlijRailL, 'x', opX + 10);
        setAttr(e.armGlijRailL, 'width', 100);
      }
      if (useSchaar) {
        setAttr(e.armSchaarLineL, 'points', `${opX + 60},60 ${opX + 85},80 ${opX + 110},100`);
        setAttr(e.armSchaarDotL, 'cx', opX + 110);
      }
      setAttr(e.handleL, 'cx', splRect.x + splRect.width - 15);
      edBox = [opX, 120];
    }
    if (showOpR) {
      const opX = (isR ? 390 : 460) - 120;
      setAttr(e.edBoxR, 'x', opX);
      setAttr(e.edBoxR, 'width', 120);
      setAttr(e.edTxtR, 'x', opX + 60);
      if (useGlij) {
        setAttr(e.armGlijLineR, 'x1', opX + 60);
        setAttr(e.armGlijLineR, 'x2', opX + 20);
        setAttr(e.armGlijDotR, 'cx', opX + 20);
        setAttr(e.armGlijRailR, 'x', opX + 10);
        setAttr(e.armGlijRailR, 'width', 100);
      }
      if (useSchaar) {
        setAttr(e.armSchaarLineR, 'points', `${opX + 60},60 ${opX + 35},80 ${opX + 10},100`);
        setAttr(e.armSchaarDotR, 'cx', opX + 10);
      }
      setAttr(e.handleR, 'cx', sprRect.x + 15);
      if (!edBox) edBox = [opX, 120];
    }

    // TV 100/200-slot
    const isTv = slotType === 'tv100-200';
    setOpacity(e.lockTv, isTv);
    if (isTv) {
      let tvX = 0;
      let tvY = 95;
      if (leftSide) {
        tvX = splRect.x + splRect.width - 35;
        tvY = 100;
      } else if (isR) {
        tvX = sprRect.x + 5;
        tvY = 100;
      }
      setAttr(e.rectTv, 'x', tvX);
      setAttr(e.rectTv, 'y', tvY);
      setAttr(e.textTv, 'x', tvX + 15);
      setAttr(e.textTv, 'y', tvY + 9);
    }

    // Vloerslot (links = sluitkant van SP L, rechts = sluitkant van SP R)
    const lockL = isFloorLock && leftSide;
    const lockR = isFloorLock && (isDubbel || isR);
    const offsetText = tr('Offset: ', 'Décalage: ') + `${e.vloerslotPos.value || '--'}mm`;
    const lockOffset = 15;
    setOpacity(e.lockGroupL, lockL);
    setOpacity(e.lockOffsetL, lockL);
    setOpacity(e.lockGroupR, lockR);
    setOpacity(e.lockOffsetR, lockR);
    if (lockL) {
      const drawX = splRect.x + splRect.width - lockOffset - 30;
      setText(e.lockOffsetL, offsetText);
      setAttr(e.lockRectL, 'x', drawX);
      setAttr(e.lockCircleL, 'cx', drawX + 15);
      setAttr(e.lockOffsetL, 'x', drawX + 15);
    }
    if (lockR) {
      const drawX = sprRect.x + lockOffset;
      setText(e.lockOffsetR, offsetText);
      setAttr(e.lockRectR, 'x', drawX);
      setAttr(e.lockCircleR, 'cx', drawX + 15);
      setAttr(e.lockOffsetR, 'x', drawX + 15);
    }

    // Callouts
    setOpacity(e.calloutSwing, isSwing);
    const showSplInfo = !isSwing && (isDubbel || isL);
    const showSprInfo = !isSwing && !showSplInfo && isR;
    setOpacity(e.calloutSpl, showSplInfo);
    setOpacity(e.calloutSpr, showSprInfo);

    if (isSwing) {
      const asmaat = e.asm.value || '--';
      const muur = e.muurDiepte.value || '--';
      setText(e.swingInfo, `${tr('Asm', 'Axe')}: ${asmaat} | ${tr('Muur', 'Mur')}: ${muur}`);
      setAttr(e.calloutSwingLine, 'd', `M ${edBox[0] + edBox[1] / 2} 42 L 350 25`);
    } else if (showSplInfo || showSprInfo) {
      const profStr = `${e.profBoven.value || '-'}/${e.profOnder.value || '-'}/${e.profZijkant.value || '-'}`;
      const lGlas = tr('Glas:', 'Verre:');
      const lProf = tr('Prof (B/O/Z):', 'Prof (H/B/L):');
      const lLat = tr('Glaslat:', 'Parclose:');
      if (showSplInfo) {
        setText(e.splTitle, isDubbel ? tr('SP L&R Info:', 'PC G&D Info:') : tr('SP L Info:', 'PC G Info:'));
        setText(e.splGlas, `${lGlas} ` + (e.glasmaatL.value || '--'));
        setText(e.splProf, `${lProf} ${profStr}`);
        setText(e.splLat, `${lLat} ` + (e.glaslatL.value || '--'));
        setAttr(e.calloutSplLine, 'd', `M 75 180 L ${splRect.x + 15} 200`);
      } else {
        setText(e.sprTitle, tr('SP R Info:', 'PC D Info:'));
        setText(e.sprGlas, `${lGlas} ` + (e.glasmaatR.value || '--'));
        setText(e.sprProf, `${lProf} ${profStr}`);
        setText(e.sprLat, `${lLat} ` + (e.glaslatR.value || '--'));
        setAttr(e.calloutSprLine, 'd', `M 525 180 L ${sprRect.x + sprRect.width - 15} 200`);
      }
    }
  }

  /** Bundelt snel opeenvolgende invoer tot één render per frame. */
  const scheduler = Mesure.frameDebounce(render);

  Mesure.visual = {
    /** Direct (synchroon) renderen; annuleert een geplande render. */
    update: () => scheduler.now(),
    /** Render in de volgende frame (voor input/change-events). */
    schedule: () => scheduler.schedule(),
    /** Render nu als er een render gepland staat (zodat opslaan/valideren/printen actuele waarden ziet). */
    flush: () => scheduler.flush()
  };
})();
