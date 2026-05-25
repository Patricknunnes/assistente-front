// ==UserScript==
// @name         TW Apoio - Soma tropas ate data/hora (v0.4)
// @namespace    count_apoio
// @match        https://*.tribalwars.com.br/game.php*
// @version      0.4
// @run-at       document-end
// @noframes
// @description  Na tela info_village, le os comandos "Proprios comandos" e fetcha info_command de cada um para somar as tropas que chegam ate uma data/hora definida pelo usuario.
// ==/UserScript==

(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('screen') !== 'info_village') return;
  if (document.getElementById('count-apoio-box')) return;

  const UNIT_ORDER = ['spear','sword','axe','archer','scout','light','marcher','heavy','ram','catapult','knight','snob'];
  const UNIT_LABEL = {
    spear:'Lanceiro', sword:'Espadachim', axe:'Bárbaro', archer:'Arqueiro',
    scout:'Explorador', light:'Cav. Leve', marcher:'Arq. a Cavalo',
    heavy:'Cav. Pesada', ram:'Aríete', catapult:'Catapulta',
    knight:'Paladino', snob:'Nobre',
  };
  function detectUnitFromSrc(src) {
    const s = (src || '').toLowerCase();
    for (const u of UNIT_ORDER) if (s.includes('unit_' + u)) return u;
    return null;
  }

  // ---------- Localiza a tabela "Proprios comandos" ----------
  function findCommandsTable() {
    const count = document.querySelector('.commands-command-count');
    if (!count) return null;
    let t = count;
    while (t && t.tagName !== 'TABLE') t = t.parentElement;
    return t;
  }

  function parseCommandRows(table) {
    const rows = [...table.querySelectorAll('tr.command-row')];
    const out = [];
    for (const row of rows) {
      const span = row.querySelector('span.command_hover_details[data-command-id]');
      const endSpan = row.querySelector('span[data-endtime]');
      const link = row.querySelector('a[href*="screen=info_command"]');
      const label = row.querySelector('.quickedit-label');
      if (!span || !endSpan || !link) continue;
      const id = span.getAttribute('data-command-id');
      const endUnix = parseInt(endSpan.getAttribute('data-endtime'), 10);
      if (!id || !endUnix) continue;
      out.push({
        id,
        arrival: new Date(endUnix * 1000),
        href: link.getAttribute('href'),
        label: (label?.textContent || '').trim(),
      });
    }
    return out;
  }

  // ---------- Fetch + parser de info_command ----------
  function parseInt0(t) {
    if (t == null) return 0;
    const s = String(t).replace(/[.\s ]/g, '').trim();
    if (!s || s === '-') return 0;
    return parseInt(s, 10) || 0;
  }

  // Extrai contagem de tropas a partir do HTML de info_command.
  // Estrategia: achar table.vis que tem <th><img unit_X> nos cabecalhos e
  // celulas numericas correspondentes embaixo. Pega a primeira linha de dados.
  function extractTroopsFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table.vis');
    let best = null;
    for (const t of tables) {
      // mapeia indice da coluna -> unit
      const headerCells = t.querySelectorAll('tr:first-child th, tr:first-child td');
      const colUnit = {};
      headerCells.forEach((c, i) => {
        const img = c.querySelector('img');
        if (!img) return;
        const u = detectUnitFromSrc(img.getAttribute('src') || '');
        if (u) colUnit[i] = u;
      });
      if (Object.keys(colUnit).length < 2) continue;
      // Procura a primeira linha de dados (apos a do header) cujas celulas
      // nas posicoes de unit sejam numericas.
      const allRows = [...t.querySelectorAll('tr')];
      for (let r = 1; r < allRows.length; r++) {
        const cells = [...allRows[r].children];
        if (cells.length < 2) continue;
        const got = {};
        let valid = true;
        let total = 0;
        for (const [iStr, u] of Object.entries(colUnit)) {
          const cell = cells[+iStr];
          if (!cell) { valid = false; break; }
          const txt = cell.textContent.trim();
          if (!/^[\d.\s ]+$/.test(txt) && txt !== '0' && txt !== '-') { valid = false; break; }
          const n = parseInt0(txt);
          got[u] = n;
          total += n;
        }
        if (!valid) continue;
        if (best == null || total > best.total) best = { troops: got, total };
        break; // primeira linha valida desta tabela
      }
    }
    return best ? best.troops : null;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Throttle global: garante minimo de MIN_GAP_MS entre o inicio de cada request.
  const MIN_GAP_MS = 200;
  let _lastReqAt = 0;
  async function acquireSlot() {
    const now = performance.now();
    const wait = Math.max(0, _lastReqAt + MIN_GAP_MS - now);
    _lastReqAt = now + wait;
    if (wait > 0) await sleep(wait);
  }

  async function fetchCommandTroops(href, attempt = 0) {
    try {
      await acquireSlot();
      const resp = await fetch(href, { credentials: 'same-origin' });
      if (!resp.ok) {
        if (attempt < 2 && (resp.status === 429 || resp.status >= 500)) {
          await sleep(500 * (attempt + 1) + Math.random() * 300);
          return fetchCommandTroops(href, attempt + 1);
        }
        throw new Error('HTTP ' + resp.status);
      }
      const html = await resp.text();
      const troops = extractTroopsFromHtml(html);
      if (troops == null) return { __no_table: true };
      return troops;
    } catch (e) {
      if (attempt < 2) {
        await sleep(500 * (attempt + 1) + Math.random() * 300);
        return fetchCommandTroops(href, attempt + 1);
      }
      throw e;
    }
  }

  // Pool com concorrencia limitada
  async function runPool(items, worker, concurrency, onProgress) {
    let idx = 0, done = 0;
    const results = new Array(items.length);
    async function next() {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        try { results[i] = await worker(items[i], i); }
        catch (e) { results[i] = { __error: String(e) }; }
        done++;
        onProgress && onProgress(done, items.length);
      }
    }
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, next);
    await Promise.all(runners);
    return results;
  }

  // ---------- UI ----------
  function toLocalInputValue(d) {
    const z = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
  }
  function fmtDate(d) {
    const z = n => String(n).padStart(2, '0');
    return `${z(d.getDate())}/${z(d.getMonth()+1)}/${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
  }
  function fmtNum(n) { return n.toLocaleString('pt-BR'); }

  const cache = new Map(); // command id -> troops object

  async function calculate(commands, deadline, ui) {
    const due = commands.filter(c => c.arrival.getTime() <= deadline.getTime());
    ui.status.textContent = `${due.length} comando(s) chegam ate ${fmtDate(deadline)}. Buscando tropas...`;
    ui.result.innerHTML = '';
    ui.calcBtn.disabled = true;

    const totals = {};
    const errorList = [];
    const noTableList = [];
    let withTroops = 0;

    await runPool(due, async (c) => {
      let troops = cache.get(c.id);
      if (!troops) {
        try {
          troops = await fetchCommandTroops(c.href);
          cache.set(c.id, troops);
        } catch (e) {
          errorList.push({ id: c.id, href: c.href, label: c.label, error: String(e) });
          console.warn('[count_apoio] fetch falhou', c.id, c.href, e);
          return null;
        }
      }
      if (troops && troops.__no_table) {
        noTableList.push({ id: c.id, href: c.href, label: c.label });
      } else if (troops) {
        withTroops++;
        for (const [u, n] of Object.entries(troops)) totals[u] = (totals[u] || 0) + n;
      }
      return troops;
    }, 4, (done, total) => {
      ui.status.textContent = `Buscando tropas: ${done}/${total}...`;
    });

    if (errorList.length) console.warn('[count_apoio] comandos com erro de fetch:', errorList);
    if (noTableList.length) console.warn('[count_apoio] comandos sem tabela de tropas parseavel:', noTableList);

    ui.calcBtn.disabled = false;
    const usedUnits = UNIT_ORDER.filter(u => (totals[u] || 0) > 0);
    let html = `<div style="margin-bottom:6px;"><b>${due.length}</b> comando(s) ate <b>${fmtDate(deadline)}</b> &middot; com tropa: <b>${withTroops}</b>${errorList.length ? ` &middot; <span style="color:#900">erros: ${errorList.length}</span>` : ''}${noTableList.length ? ` &middot; sem tabela: ${noTableList.length}` : ''}</div>`;
    if (usedUnits.length === 0) {
      html += '<div style="color:#900;">Nenhuma tropa contabilizada.</div>';
    } else {
      html += '<table class="vis" style="border-collapse:collapse;"><tr><th style="padding:3px 8px;">Unidade</th><th style="padding:3px 8px;">Quantidade</th></tr>';
      let totalPop = 0;
      for (const u of usedUnits) {
        html += `<tr><td style="padding:2px 8px;">${UNIT_LABEL[u]}</td><td style="padding:2px 8px;text-align:right;font-family:monospace;"><b>${fmtNum(totals[u])}</b></td></tr>`;
        totalPop += totals[u];
      }
      html += `<tr><td style="padding:3px 8px;border-top:1px solid #b18e5b;"><b>Total (unidades)</b></td><td style="padding:3px 8px;text-align:right;font-family:monospace;border-top:1px solid #b18e5b;"><b>${fmtNum(totalPop)}</b></td></tr>`;
      html += '</table>';
    }
    ui.result.innerHTML = html;
    ui.status.textContent = `${due.length} comando(s) somado(s) (cache: ${cache.size}).`;
  }

  function buildUI(commands) {
    const wrap = document.createElement('div');
    wrap.id = 'count-apoio-box';
    wrap.style.cssText = 'margin:10px 0;padding:10px 12px;border:1px solid #b18e5b;background:#f4e4bc;border-radius:4px;font-size:12px;';

    const lastArrival = commands.reduce((m, c) => c.arrival > m ? c.arrival : m, new Date(0));
    const def = new Date();
    def.setHours(23, 59, 0, 0); // hoje 23:59 como padrao razoavel

    wrap.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px;">Apoio chegando ate (somar tropas dos comandos cuja chegada &le; data):</div>
      <input type="datetime-local" id="count-apoio-deadline" step="1" value="${toLocalInputValue(def)}" style="padding:3px;">
      <button type="button" id="count-apoio-calc" class="btn btn-default" style="padding:4px 10px;margin-left:6px;">Calcular</button>
      <span style="margin-left:10px;color:#555;">${commands.length} comando(s) na tabela &middot; ultimo chega em ${fmtDate(lastArrival)}</span>
      <div id="count-apoio-status" style="margin-top:6px;color:#555;"></div>
      <div id="count-apoio-result" style="margin-top:10px;"></div>
    `;

    const target = document.querySelector('#content_value') || document.body;
    target.insertBefore(wrap, target.firstChild);

    const ui = {
      input: wrap.querySelector('#count-apoio-deadline'),
      result: wrap.querySelector('#count-apoio-result'),
      status: wrap.querySelector('#count-apoio-status'),
      calcBtn: wrap.querySelector('#count-apoio-calc'),
    };
    ui.calcBtn.addEventListener('click', () => {
      const v = ui.input.value;
      if (!v) return;
      calculate(commands, new Date(v), ui);
    });
  }

  // ---------- Main ----------
  const table = findCommandsTable();
  if (!table) {
    console.log('[count_apoio] tabela "Proprios comandos" nao encontrada (.commands-command-count).');
    return;
  }
  const commands = parseCommandRows(table);
  console.log(`[count_apoio] ${commands.length} comando(s) detectado(s)`, commands.slice(0, 3));
  if (commands.length === 0) return;
  buildUI(commands);
})();
