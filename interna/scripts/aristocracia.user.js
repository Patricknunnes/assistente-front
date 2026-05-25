// ==UserScript==
// @name         TW Aristocracia → Distribuição
// @namespace    interna
// @match        https://*.tribalwars.com.br/game.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      127.0.0.1
// @connect      localhost
// @version      0.8
// @run-at       document-end
// @description  Coleta tropas "Na Aldeia" (aba Defesa) de todos os membros da tribo via aristocracia e faz upload direto para o app de distribuição.
// ==/UserScript==

(function () {
  'use strict';

  // Ajuste se o backend rodar em outra porta
  const BACKEND = 'http://127.0.0.1:8765';

  const params = new URLSearchParams(location.search);
  if (params.get('screen') !== 'ally' || params.get('mode') !== 'members_defense') return;

  const select = document.querySelector('select[name="player_id"]');
  if (!select) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin:8px 0;padding:8px;border:1px solid #b18e5b;background:#f4e4bc;border-radius:4px;';
  wrap.innerHTML = `
    <button type="button" id="aristo-export" class="btn btn-default" style="padding:6px 12px;">
      Exportar aristocracia → backend
    </button>
    <button type="button" id="aristo-clipboard" class="btn btn-default" style="padding:6px 12px;margin-left:6px;">
      Copiar JSON
    </button>
    <span id="aristo-status" style="margin-left:8px;font-size:12px;"></span>
  `;
  select.parentNode.parentNode.insertBefore(wrap, select.parentNode);

  const btn = wrap.querySelector('#aristo-export');
  const btnClip = wrap.querySelector('#aristo-clipboard');
  const status = wrap.querySelector('#aristo-status');

  let lastResult = null;

  async function coletar() {
    btn.disabled = true;
    btnClip.disabled = true;
    const options = [...select.querySelectorAll('option')].filter(o => o.value && o.value !== '');
    const result = {};
    let errors = 0;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const pid = opt.value;
      const name = opt.textContent.trim();
      try {
        const villages = await fetchAllPagesForPlayer(pid, (page, total) => {
          status.textContent = `Buscando ${name}... (${i + 1}/${options.length}) — pág ${page}${total ? '/' + total : ''}`;
        });
        result[name] = villages;
      } catch (e) {
        console.error('[aristocracia]', name, e);
        errors++;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    lastResult = result;
    const totVills = Object.values(result).reduce((a, b) => a + b.length, 0);
    status.textContent = `Coletado: ${Object.keys(result).length} jogadores, ${totVills} aldeias (${errors} erros). Enviando ao backend...`;

    try {
      await uploadResult(result);
      status.textContent = `OK — ${Object.keys(result).length} jogadores, ${totVills} aldeias enviados para ${BACKEND}.`;
    } catch (e) {
      console.error('[aristocracia upload]', e);
      status.textContent = `Coletado OK, mas FALHOU envio ao backend (${e.message || e}). Use "Copiar JSON" como fallback.`;
    }
    btn.disabled = false;
    btnClip.disabled = false;
  }

  function uploadResult(result) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `${BACKEND}/aristocracia`,
        data: JSON.stringify({ aristocracia: result }),
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
        onload: (r) => r.status >= 200 && r.status < 300 ? resolve(r) : reject(new Error(`HTTP ${r.status}: ${r.responseText}`)),
        onerror: () => reject(new Error('network error — backend rodando em ' + BACKEND + '?')),
        ontimeout: () => reject(new Error('timeout')),
      });
    });
  }

  btn.addEventListener('click', coletar);
  btnClip.addEventListener('click', () => {
    if (!lastResult) { status.textContent = 'Nada coletado ainda. Clique em "Exportar" primeiro.'; return; }
    GM_setClipboard(JSON.stringify(lastResult));
    status.textContent = 'JSON copiado para clipboard.';
  });

  async function fetchAllPagesForPlayer(pid, onProgress) {
    const villages = [];
    const seen = new Set();
    let page = 1;
    let totalPages = null;
    const MAX_PAGES = 50;

    // Sempre busca no modo defesa (Na Aldeia) — independente da pagina onde o usuario clicou
    const baseUrl = new URL(location.href);
    baseUrl.searchParams.set('screen', 'ally');
    baseUrl.searchParams.set('mode', 'members_defense');

    while (page <= MAX_PAGES) {
      onProgress(page, totalPages);
      const url = new URL(baseUrl);
      url.searchParams.set('player_id', pid);
      if (page > 1) url.searchParams.set('page', page);
      else url.searchParams.delete('page');

      const fd = new FormData();
      fd.append('player_id', pid);
      if (page > 1) fd.append('page', page);

      const resp = await fetch(url.toString(), { method: 'POST', body: fd, credentials: 'include' });
      const html = await resp.text();

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const parsed = parseDefenseFromDoc(doc);
      let added = 0;
      for (const v of parsed) {
        const k = `${v.x}|${v.y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        villages.push(v);
        added++;
      }

      if (totalPages == null) totalPages = detectTotalPages(doc);

      if (added === 0 && page > 1) break;
      if (totalPages && page >= totalPages) break;
      if (!totalPages && parsed.length === 0) break;

      page++;
      await new Promise(r => setTimeout(r, 200));
    }
    return villages;
  }

  function detectTotalPages(doc) {
    let max = 1;
    for (const a of doc.querySelectorAll('a[href*="page="]')) {
      const href = a.getAttribute('href') || '';
      if (!/members_(troops|defense)/.test(href)) continue;
      const m = href.match(/[?&]page=(\d+)/);
      if (m) max = Math.max(max, +m[1]);
    }
    if (max === 1) {
      const txt = doc.body.textContent;
      const m = txt.match(/p[áa]gina\s+\d+\s+de\s+(\d+)/i);
      if (m) max = parseInt(m[1], 10) || 1;
    }
    return max;
  }

  const FALLBACK_ORDER = ['spear', 'sword', 'axe', 'archer', 'scout', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];

  function parseDefenseFromDoc(doc) {
    let table = null;
    for (const t of doc.querySelectorAll('table.vis')) {
      if (/Na\s*Aldeia/i.test(t.textContent || '')) { table = t; break; }
    }
    if (!table) return [];

    // detecta a ORDEM real das colunas via imgs do header
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    const order = [];
    if (headerRow) {
      for (const cell of headerRow.children) {
        const img = cell.querySelector ? cell.querySelector('img') : null;
        if (!img) continue;
        const probe = ((img.getAttribute('src') || '') + '|' + (img.getAttribute('title') || '') + '|' + (img.alt || '')).toLowerCase();
        const unit = detectUnit(probe);
        if (unit && !order.includes(unit)) order.push(unit);
      }
    }
    const effOrder = order.length > 0 ? order : FALLBACK_ORDER;

    if (!window._aristoLoggedOrder) {
      console.log('[aristocracia] ordem de unidades detectada:', effOrder);
      window._aristoLoggedOrder = true;
    }

    const rows = [...table.querySelectorAll('tbody tr')];
    let currentVillage = null;
    const out = [];

    for (const row of rows) {
      const cells = [...row.children];
      const villageCell = cells.find(c => c.querySelector && c.querySelector('a[href*="info_village"]'));
      if (villageCell) {
        const m = villageCell.textContent.match(/\((\d{1,3})\|(\d{1,3})\)/);
        if (m) currentVillage = { x: +m[1], y: +m[2] };
      }
      if (!currentVillage) continue;

      const labelIdx = cells.findIndex(c => /^\s*Na\s*Aldeia\s*$/i.test(c.textContent.trim()));
      if (labelIdx < 0) continue;

      const v = { x: currentVillage.x, y: currentVillage.y };
      for (let j = 0; j < effOrder.length; j++) {
        const cell = cells[labelIdx + 1 + j];
        const txt = ((cell && cell.textContent) || '0').replace(/\D/g, '');
        v[effOrder[j]] = parseInt(txt, 10) || 0;
      }
      if (!window._aristoLoggedFirst) {
        console.log('[aristocracia] primeira village parseada:', v, 'cells:', cells.map(c => c.textContent.trim()));
        window._aristoLoggedFirst = true;
      }
      out.push(v);
    }
    return out;
  }

  // map unit key -> heuristics (src filename / title / alt fragments)
  const UNIT_MATCHERS = {
    spear:    ['unit_spear', 'spear.png', 'lanceiro', 'speer'],
    sword:    ['unit_sword', 'sword.png', 'espadachim', 'schwert'],
    axe:      ['unit_axe', 'axe.png', 'barbar', 'machado', 'axt'],
    archer:   ['unit_archer', 'archer.png', 'arqueiro', 'bogen'],
    scout:    ['unit_spy', 'spy.png', 'explorador', 'späher', 'spaher', 'scout'],
    light:    ['unit_light', 'light.png', 'cavalaria leve', 'leichte'],
    marcher:  ['unit_marcher', 'marcher.png', 'arqueiro a cavalo', 'beritten'],
    heavy:    ['unit_heavy', 'heavy.png', 'cavalaria pesada', 'schwere'],
    ram:      ['unit_ram', 'ram.png', 'aríete', 'ariete', 'rammbock'],
    catapult: ['unit_catapult', 'catapult.png', 'catapulta', 'katapult'],
    knight:   ['unit_knight', 'knight.png', 'paladino', 'ritter'],
    snob:     ['unit_snob', 'snob.png', 'nobre', 'adels'],
  };

  function detectUnit(probe) {
    for (const [key, frags] of Object.entries(UNIT_MATCHERS)) {
      if (frags.some(f => probe.includes(f))) return key;
    }
    return null;
  }

  function parseTroopsHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return parseTroopsFromDoc(doc);
  }

  function parseTroopsFromDoc(doc) {
    let table = null;
    for (const t of doc.querySelectorAll('table.vis')) {
      const imgs = t.querySelectorAll('tr img');
      if (imgs.length >= 6) { table = t; break; }
    }
    if (!table) return [];

    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    if (!headerRow) return [];
    const headerCells = [...headerRow.children];

    const colByUnit = {};
    for (let i = 1; i < headerCells.length; i++) {
      const img = headerCells[i].querySelector('img');
      if (!img) continue;
      const probe = ((img.getAttribute('src') || '') + '|' + (img.getAttribute('title') || '') + '|' + (img.alt || '')).toLowerCase();
      const unit = detectUnit(probe);
      if (unit && !(unit in colByUnit)) colByUnit[unit] = i;
    }

    const out = [];
    const rows = table.querySelectorAll('tbody tr');
    const allRows = rows.length ? rows : [...table.querySelectorAll('tr')].slice(1);
    for (const row of allRows) {
      const cells = row.children;
      if (cells.length < 3) continue;
      const cellText = cells[0].textContent;
      const m = cellText.match(/(\d{1,3})\|(\d{1,3})/);
      if (!m) continue;
      const v = { x: +m[1], y: +m[2] };
      for (const [unit, idx] of Object.entries(colByUnit)) {
        v[unit] = parseInt((cells[idx]?.textContent || '0').replace(/\D/g, ''), 10) || 0;
      }
      out.push(v);
    }
    return out;
  }
})();
