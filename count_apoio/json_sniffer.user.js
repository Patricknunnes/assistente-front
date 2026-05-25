// ==UserScript==
// @name         TW JSON Sniffer - info_village
// @namespace    json_sniffer
// @match        https://*.tribalwars.com.br/game.php*
// @version      0.1
// @run-at       document-start
// @noframes
// @description  Loga no console todo JSON encontrado (fetch, XHR e scripts inline) na tela info_village.
// ==/UserScript==

(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('screen') !== 'info_village') return;

  const TAG = '[json_sniffer]';
  const log = (...a) => console.log(TAG, ...a);
  const group = (label) => console.groupCollapsed(TAG + ' ' + label);
  const groupEnd = () => console.groupEnd();

  function tryParseJSON(text) {
    if (typeof text !== 'string') return undefined;
    const t = text.trim();
    if (!t) return undefined;
    if (t[0] !== '{' && t[0] !== '[') return undefined;
    try { return JSON.parse(t); } catch { return undefined; }
  }

  // --- Intercept fetch ---
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = (args[0] && args[0].url) || args[0];
    return origFetch.apply(this, args).then(resp => {
      const clone = resp.clone();
      const ct = (clone.headers.get('content-type') || '').toLowerCase();
      clone.text().then(text => {
        const data = tryParseJSON(text);
        if (data !== undefined) {
          group('fetch ' + (resp.status) + ' ' + url);
          log('content-type:', ct);
          log(data);
          groupEnd();
        }
      }).catch(() => {});
      return resp;
    });
  };

  // --- Intercept XHR ---
  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OrigXHR();
    let _url = '';
    let _method = '';
    const origOpen = xhr.open;
    xhr.open = function (method, url, ...rest) {
      _method = method;
      _url = url;
      return origOpen.call(this, method, url, ...rest);
    };
    xhr.addEventListener('load', function () {
      try {
        const text = (xhr.responseType === '' || xhr.responseType === 'text') ? xhr.responseText : null;
        if (text != null) {
          const data = tryParseJSON(text);
          if (data !== undefined) {
            group('xhr ' + xhr.status + ' ' + _method + ' ' + _url);
            log('content-type:', xhr.getResponseHeader('content-type'));
            log(data);
            groupEnd();
          }
        } else if (xhr.responseType === 'json' && xhr.response) {
          group('xhr ' + xhr.status + ' ' + _method + ' ' + _url + ' (responseType=json)');
          log(xhr.response);
          groupEnd();
        }
      } catch (e) { /* ignore */ }
    });
    return xhr;
  }
  PatchedXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  // --- Scan inline scripts after DOM ready for embedded JSON ---
  function scanInlineJSON() {
    // 1. Procurar variaveis globais comuns do TW
    const candidates = [
      'TribalWars', 'Game', 'game_data', 'window.TribalWars',
    ];
    for (const key of candidates) {
      try {
        const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), window);
        if (val !== undefined) {
          group('global ' + key);
          log(val);
          groupEnd();
        }
      } catch {}
    }

    // 2. Varrer <script> inline procurando blocos JSON-ish
    const scripts = document.querySelectorAll('script:not([src])');
    let idx = 0;
    for (const s of scripts) {
      const code = s.textContent || '';
      // captura objetos/arrays JSON literais em atribuicoes: var x = { ... } / = [ ... ]
      const regex = /=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*[;,\n]/g;
      let m;
      let found = 0;
      while ((m = regex.exec(code)) !== null && found < 20) {
        const data = tryParseJSON(m[1]);
        if (data !== undefined && (typeof data === 'object')) {
          group('inline script #' + idx + ' match #' + found);
          log(data);
          groupEnd();
          found++;
        }
      }
      idx++;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanInlineJSON, { once: true });
  } else {
    scanInlineJSON();
  }

  log('JSON sniffer ativo em', location.href);
})();
