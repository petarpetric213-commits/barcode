/* EAN13 Generator — application logic */

(function () {
  'use strict';

  // ---------- EAN-13 logic ----------
  function digitsOnly(str) {
    return String(str).replace(/\D/g, '');
  }

  function calculateCheckDigit(twelveDigits) {
    twelveDigits = String(twelveDigits);
    if (twelveDigits.length !== 12 || !/^\d{12}$/.test(twelveDigits)) return null;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(twelveDigits[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
  }

  function completeEAN13(input) {
    const d = digitsOnly(input);
    if (d.length === 12) {
      const cd = calculateCheckDigit(d);
      return { ean13: d + cd, valid: true, checkDigit: cd };
    }
    if (d.length === 13) {
      const cd = calculateCheckDigit(d.slice(0, 12));
      const valid = cd !== null && cd === parseInt(d[12], 10);
      return { ean13: d, valid, checkDigit: cd };
    }
    return { ean13: d, valid: false, checkDigit: null };
  }

  function randomEAN13() {
    let d = '';
    for (let i = 0; i < 12; i++) d += Math.floor(Math.random() * 10);
    const cd = calculateCheckDigit(d);
    return d + cd;
  }

  // ---------- State ----------
  const state = {
    currentEAN: '',
    settings: {
      width: 2,
      height: 80,
      fontSize: 16,
      margin: 10,
      resolution: 2,
    },
    bulkBarcodes: [], // {ean, valid, png, svg}
  };

  const SETTINGS_KEY = 'ean13_settings';
  const HISTORY_KEY = 'ean13_history';
  const HISTORY_LIMIT = 50;

  // ---------- Elements ----------
  const els = {
    themeToggle: document.getElementById('themeToggle'),
    eanInput: document.getElementById('eanInput'),
    generateBtn: document.getElementById('generateBtn'),
    randomBtn: document.getElementById('randomBtn'),
    checkHint: document.getElementById('checkHint'),
    validityBadge: document.getElementById('validityBadge'),
    barcodeSvg: document.getElementById('barcode'),
    eanDisplay: document.getElementById('eanDisplay'),
    copyBtn: document.getElementById('copyBtn'),
    printBtn: document.getElementById('printBtn'),
    sWidth: document.getElementById('sWidth'),
    sHeight: document.getElementById('sHeight'),
    sFont: document.getElementById('sFont'),
    sMargin: document.getElementById('sMargin'),
    sResolution: document.getElementById('sResolution'),
    valWidth: document.getElementById('valWidth'),
    valHeight: document.getElementById('valHeight'),
    valFont: document.getElementById('valFont'),
    valMargin: document.getElementById('valMargin'),
    downloadPng: document.getElementById('downloadPng'),
    downloadSvg: document.getElementById('downloadSvg'),
    downloadPdf: document.getElementById('downloadPdf'),
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('.page-section'),
    bulkInput: document.getElementById('bulkInput'),
    bulkInfo: document.getElementById('bulkInfo'),
    bulkCopyExample: document.getElementById('bulkCopyExample'),
    bulkCopyList: document.getElementById('bulkCopyList'),
    bulkClear: document.getElementById('bulkClear'),
    bulkImport: document.getElementById('bulkImport'),
    bulkGenerate: document.getElementById('bulkGenerate'),
    bulkDownloadZip: document.getElementById('bulkDownloadZip'),
    bulkResults: document.getElementById('bulkResults'),
    bulkGrid: document.getElementById('bulkGrid'),
    historyClear: document.getElementById('historyClear'),
    historyList: document.getElementById('historyList'),
    toast: document.getElementById('toast'),
  };

  // ---------- Theme ----------
  function initTheme() {
    const saved = localStorage.getItem('ean13_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    setTheme(dark ? 'dark' : 'light');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ean13_theme', theme);
    els.themeToggle.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
    renderBarcode();
  }

  els.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ---------- History ----------
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveHistory(entries) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
    } catch (e) {
      // quota exceeded — ignore silently
    }
  }

  function addToHistory(ean13) {
    let entries = getHistory();
    entries = entries.filter((e) => e.ean !== ean13);
    entries.unshift({ ean: ean13, at: Date.now() });
    saveHistory(entries);
    renderHistory();
  }

  function renderHistory() {
    const entries = getHistory().reverse(); // show newest first
    if (entries.length === 0) {
      els.historyList.innerHTML = '<div class="empty-history">Nema generisanih barkoda.</div>';
      return;
    }
    els.historyList.innerHTML = entries
      .map(
        (entry) => `
        <div class="history-item" role="button" tabindex="0" data-ean="${escapeHtml(entry.ean)}" title="Ponovno generiši">
          <div class="item-ean">${escapeHtml(entry.ean)}</div>
          <div class="item-time">${formatDate(entry.at)}</div>
          <button aria-label="Ukloni iz istorije">×</button>
        </div>
      `
      )
      .join('');

    els.historyList.querySelectorAll('.history-item').forEach((item) => {
      const ean = item.getAttribute('data-ean');
      item.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        loadEAN(ean);
      });
      item.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromHistory(ean);
      });
    });
  }

  function removeFromHistory(ean) {
    let entries = getHistory().filter((e) => e.ean !== ean);
    saveHistory(entries);
    renderHistory();
    toast('Stavka uklonjena iz istorije.');
  }

  els.historyClear.addEventListener('click', () => {
    if (!entriesExist()) return;
    if (!confirm('Obriši celu istoriju poslednjih generisanih barkoda?')) return;
    saveHistory([]);
    renderHistory();
    toast('Istorija je obrisana.');
  });

  function entriesExist() {
    return getHistory().length > 0;
  }

  function loadEAN(ean) {
    els.eanInput.value = ean;
    els.eanInput.dispatchEvent(new Event('input'));
    scrollToSection('generator');
    toast('Učitan broj iz istorije: ' + ean);
  }

  // ---------- UI helpers ----------
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString('sr-RS', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function toast(message, duration = 3000) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), duration);
  }

  function showValidity(result) {
    const badge = els.validityBadge;
    const hint = els.checkHint;
    if (result.ean13.length === 0) {
      badge.textContent = '';
      badge.className = 'validity';
      hint.textContent = '';
      return;
    }
    if (result.valid) {
      badge.textContent = 'Valid';
      badge.className = 'validity valid';
      if (result.ean13.length === 13 && result.inputWas12) {
        hint.textContent = 'Kontrolna cifra izračunata automatski: ' + result.checkDigit;
      } else {
        hint.textContent = 'Kontrolna cifra je ispravna.';
      }
    } else {
      badge.textContent = 'Invalid';
      badge.className = 'validity invalid';
      hint.textContent =
        'Kontrolna cifra se ne podudara (očekivano: ' +
        (result.checkDigit !== null ? result.checkDigit : '—') +
        ').';
    }
  }

  // ---------- Barcode rendering ----------
  function renderBarcode() {
    const input = els.eanInput.value;
    const result = completeEAN13(input);
    result.inputWas12 = digitsOnly(input).length === 12;

    els.eanDisplay.textContent = result.ean13.length === 13 ? result.ean13 : '—';
    showValidity(result);

    const svg = els.barcodeSvg;
    svg.innerHTML = '';

    if (result.valid && result.ean13.length === 13) {
      try {
        JsBarcode(svg, result.ean13, {
          format: 'EAN13',
          width: state.settings.width,
          height: state.settings.height,
          displayValue: false,
          fontSize: state.settings.fontSize,
          margin: state.settings.margin,
          background: '#ffffff',
          lineColor: '#000000',
        });
        addToHistory(result.ean13);
        state.currentEAN = result.ean13;
      } catch (err) {
        console.error(err);
      }
    } else {
      state.currentEAN = result.valid ? result.ean13 : '';
    }
  }

  let renderDebounce;
  els.eanInput.addEventListener('input', () => {
    clearTimeout(renderDebounce);
    renderDebounce = setTimeout(renderBarcode, 180);
  });

  els.generateBtn.addEventListener('click', () => {
    renderBarcode();
    els.eanInput.focus();
  });

  els.randomBtn.addEventListener('click', () => {
    els.eanInput.value = randomEAN13();
    els.eanInput.dispatchEvent(new Event('input'));
    toast('Generisan slučajni validni EAN-13 broj.');
  });

  // Settings sync
  function syncSettingsUI() {
    els.sWidth.value = state.settings.width;
    els.sHeight.value = state.settings.height;
    els.sFont.value = state.settings.fontSize;
    els.sMargin.value = state.settings.margin;
    els.sResolution.value = state.settings.resolution;
    els.valWidth.textContent = state.settings.width;
    els.valHeight.textContent = state.settings.height + ' px';
    els.valFont.textContent = state.settings.fontSize + ' px';
    els.valMargin.textContent = state.settings.margin + ' px';
  }

  function bindRange(el, key, labelEl, unit) {
    el.addEventListener('input', () => {
      const v = parseInt(el.value, 10);
      state.settings[key] = v;
      if (labelEl) labelEl.textContent = v + (unit || '');
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
      renderBarcode();
    });
  }

  bindRange(els.sWidth, 'width', els.valWidth);
  bindRange(els.sHeight, 'height', els.valHeight, ' px');
  bindRange(els.sFont, 'fontSize', els.valFont, ' px');
  bindRange(els.sMargin, 'margin', els.valMargin, ' px');
  els.sResolution.addEventListener('change', () => {
    state.settings.resolution = parseInt(els.sResolution.value, 10);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  });

  // Load persisted settings
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    Object.assign(state.settings, saved);
  } catch (e) {}
  syncSettingsUI();

  // ---------- Actions: copy / print ----------
  els.copyBtn.addEventListener('click', () => {
    const ean = els.eanDisplay.textContent;
    if (!ean || ean === '—') return;
    navigator.clipboard
      .writeText(ean)
      .then(() => toast('Broj ' + ean + ' kopiran u međuspremnik.'))
      .catch(() => toast('Nije uspelo kopiranje.', 2000));
  });

  els.printBtn.addEventListener('click', () => {
    if (!state.currentEAN) {
      toast('Nije generisan barkod za štampu.', 2000);
      return;
    }
    window.print();
  });

  // ---------- Exports ----------
  function getSvgData() {
    const svg = els.barcodeSvg.cloneNode(true);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // ensure presentational attributes are inline for standalone use
    const serializer = new XMLSerializer();
    let str = serializer.serializeToString(svg);
    str = str.replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
    return str;
  }

  function download(filename, dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  function svgToPngDataUrl(svgString, scale) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // determine natural size from svg attributes
        const w = img.naturalWidth || 520;
        const h = img.naturalHeight || 200;
        const canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    });
  }

  els.downloadSvg.addEventListener('click', () => {
    if (!state.currentEAN) {
      toast('Nema barkoda za preuzimanje.', 2000);
      return;
    }
    const svg = getSvgData();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    download(`ean13-${state.currentEAN}.svg`, url);
    toast('SVG preuzeto: ean13-' + state.currentEAN + '.svg');
  });

  els.downloadPng.addEventListener('click', async () => {
    if (!state.currentEAN) {
      toast('Nema barkoda za preuzimanje.', 2000);
      return;
    }
    try {
      const svg = getSvgData();
      const dataUrl = await svgToPngDataUrl(svg, state.settings.resolution);
      download(`ean13-${state.currentEAN}.png`, dataUrl);
      toast('PNG preuzeto: ean13-' + state.currentEAN + '.png');
    } catch (err) {
      console.error(err);
      toast('Greška pri izvozu PNG-a.', 2000);
    }
  });

  els.downloadPdf.addEventListener('click', async () => {
    if (!state.currentEAN) {
      toast('Nema barkoda za preuzimanje.', 2000);
      return;
    }
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      const svgEl = els.barcodeSvg;
      const svgW = parseFloat(svgEl.getAttribute('width') || svgEl.clientWidth || 520);
      const svgH = parseFloat(svgEl.getAttribute('height') || svgEl.clientHeight || 200);
      const svgWidth = 90; // mm
      const svgHeight = svgWidth * (svgH / svgW) || 40;

      const svg = getSvgData();
      doc.addImage(svg, 'SVG', 15, 15, svgWidth, svgHeight);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('EAN-13: ' + state.currentEAN, 15, 25 + svgHeight);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Generisano lokalno pomoću EAN13 Generatora. Matematički validan EAN-13 broj ' +
        'ne znači dodelu zvaničnog GS1 identifikacionog broja.',
        15,
        35 + svgHeight,
        { maxWidth: 180 }
      );

      doc.save(`ean13-${state.currentEAN}.pdf`);
      toast('PDF preuzeto: ean13-' + state.currentEAN + '.pdf');
    } catch (err) {
      console.error(err);
      toast('Greška pri izvozu PDF-a.', 2000);
    }
  });

  // ---------- Section navigation ----------
  function showSection(id) {
    els.sections.forEach((s) => {
      s.classList.toggle('section-active', s.id === id);
    });
    els.navLinks.forEach((a) => {
      a.classList.toggle('active', a.dataset.section === id);
    });
    if (id === 'history') renderHistory();
    if (id === 'bulk') renderBulkResults();
    window.scrollTo(0, 0);
  }

  function scrollToSection(id) {
    showSection(id);
  }

  els.navLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(a.dataset.section);
    });
  });

  // ---------- Bulk generator ----------
  const exampleList = [
    '400638133393',
    '400638133394',
    '400638133395',
    '5901234123457',
    '9780201379624',
  ].join('\n');

  function parseBulkLines(text) {
    return text
      .split(/[\r\n]+/)
      .map((l) => digitsOnly(l))
      .filter((d) => d.length > 0);
  }

  function processBulk(raw) {
    const lines = parseBulkLines(raw);
    const results = [];
    for (const d of lines) {
      const r = completeEAN13(d);
      results.push({
        input: d,
        ean: r.ean13.length === 13 ? r.ean13 : d,
        valid: r.valid && r.ean13.length === 13,
        fixed: digitsOnly(d).length === 12 && r.valid,
      });
    }
    return results;
  }

  function renderBulkResults() {
    if (!state.bulkBarcodes || state.bulkBarcodes.length === 0) {
      els.bulkGrid.innerHTML = '<div class="empty-results">Nema generisanih barkoda.</div>';
      els.bulkResults.style.display = 'none';
      return;
    }
    els.bulkResults.style.display = 'block';
    els.bulkGrid.innerHTML = state.bulkBarcodes
      .map(
        (item, i) => `
        <div class="bulk-item">
          <div class="item-ean">${escapeHtml(item.ean)}</div>
          <div class="item-status ${item.valid ? 'valid' : 'invalid'}">
            ${item.valid ? 'Valid' : 'Invalid'}
          </div>
          <div class="item-actions">
            <button class="btn btn-outline bulk-png" data-i="${i}">PNG</button>
            <button class="btn btn-outline bulk-svg" data-i="${i}">SVG</button>
          </div>
        </div>
      `
      )
      .join('');

    els.bulkGrid.querySelectorAll('.bulk-png').forEach((btn) => {
      btn.addEventListener('click', () => downloadBulkItem(parseInt(btn.dataset.i, 10), 'png'));
    });
    els.bulkGrid.querySelectorAll('.bulk-svg').forEach((btn) => {
      btn.addEventListener('click', () => downloadBulkItem(parseInt(btn.dataset.i, 10), 'svg'));
    });
  }

  function renderBulkPreviewSvg(item) {
    return new Promise((resolve, reject) => {
      const temp = document.createElement('div');
      temp.style.position = 'fixed';
      temp.style.left = '-9999px';
      temp.style.top = '0';
      document.body.appendChild(temp);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      temp.appendChild(svg);
      try {
        JsBarcode(svg, item.ean, {
          format: 'EAN13',
          width: state.settings.width,
          height: state.settings.height,
          displayValue: false,
          fontSize: state.settings.fontSize,
          margin: state.settings.margin,
          background: '#ffffff',
          lineColor: '#000000',
        });
        const serializer = new XMLSerializer();
        let str = serializer.serializeToString(svg);
        str = str.replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
        resolve(str);
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(temp);
      }
    });
  }

  async function downloadBulkItem(index, format) {
    const item = state.bulkBarcodes[index];
    if (!item || !item.valid) return;
    try {
      const svg = await renderBulkPreviewSvg(item);
      if (format === 'svg') {
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        download(`ean13-${item.ean}.svg`, URL.createObjectURL(blob));
      } else {
        const dataUrl = await svgToPngDataUrl(svg, state.settings.resolution);
        download(`ean13-${item.ean}.png`, dataUrl);
      }
      toast(format.toUpperCase() + ' preuzeto: ean13-' + item.ean);
    } catch (err) {
      console.error(err);
      toast('Greška pri preuzimanju.', 2000);
    }
  }

  els.bulkCopyExample.addEventListener('click', () => {
    els.bulkInput.value = exampleList;
    els.bulkInput.dispatchEvent(new Event('input'));
    toast('Primer liste unesen.');
  });

  els.bulkCopyList.addEventListener('click', () => {
    const list = els.bulkInput.value.trim();
    if (!list) {
      toast('Ništa za kopiranje.', 2000);
      return;
    }
    navigator.clipboard.writeText(list).then(() => toast('Lista kopirana u međuspremnik.'));
  });

  els.bulkClear.addEventListener('click', () => {
    els.bulkInput.value = '';
    els.bulkInput.dispatchEvent(new Event('input'));
    state.bulkBarcodes = [];
    renderBulkResults();
    toast('Očiščeno.');
  });

  els.bulkInput.addEventListener('input', () => {
    const lines = parseBulkLines(els.bulkInput.value);
    els.bulkInfo.textContent = lines.length + ' brojeva';
  });

  els.bulkImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      els.bulkInput.value = ev.target.result;
      els.bulkInput.dispatchEvent(new Event('input'));
      toast('Fajl uvezen: ' + file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  els.bulkGenerate.addEventListener('click', async () => {
    const raw = els.bulkInput.value;
    if (!raw.trim()) {
      toast('Unesi bar-code brojeve.', 2000);
      return;
    }
    const results = processBulk(raw);
    const validResults = results.filter((r) => r.valid);
    if (validResults.length === 0) {
      toast('Nijedan unos nije validan EAN-13 broj.', 2000);
      renderBulkResults();
      return;
    }
    state.bulkBarcodes = validResults;
    renderBulkResults();
    toast(`Generisano ${validResults.length} barkoda.`);
  });

  els.bulkDownloadZip.addEventListener('click', async () => {
    if (state.bulkBarcodes.length === 0) {
      toast('Nema barkoda za preuzimanje.', 2000);
      return;
    }
    try {
      const zip = new JSZip();
      const folder = zip.folder('ean13-barkodovi');
      for (const item of state.bulkBarcodes) {
        const svg = await renderBulkPreviewSvg(item);
        const dataUrl = await svgToPngDataUrl(svg, state.settings.resolution);
        const base64 = dataUrl.split(',')[1];
        folder.file(`ean13-${item.ean}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      download(`ean13-barkodovi-${Date.now()}.zip`, URL.createObjectURL(blob));
      toast('ZIP arhiva preuzeta.');
    } catch (err) {
      console.error(err);
      toast('Greška pri kreiranju ZIP arhive.', 2000);
    }
  });

  // ---------- Init ----------
  renderBarcode();
  renderHistory();
  initTheme();

  // Example hint on first load
  if (els.eanInput.value === '' && getHistory().length === 0) {
    els.checkHint.textContent = 'Pokušaj: 400638133393 (12 cifara) ili 4006381333931 (13 cifara)';
  }
})();
