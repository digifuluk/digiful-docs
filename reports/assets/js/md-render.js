/*
 * md-render.js - Digiful report renderer (no dependencies, no CDN).
 * Turns report Markdown (+ ::: directives) into safe HTML in the report.css look.
 *
 *   MdRender.render(markdown, { ledger: {credits: 100, ...} })  ->  { html, toc: [{id, title}] }
 *
 * Safety: ALL text is HTML-escaped; raw HTML in the Markdown is never passed through.
 * Links: http(s), mailto, #anchor and relative paths only. Images: https or relative paths only.
 *
 * Block syntax
 *   ## Title                     numbered section card (01, 02 ...)
 *   ### Title                    sub heading
 *   - item / 1. item             lists
 *   | a | b |  (+ |---|---| row)  table; a cell starting with "✓ " or "✗ " is coloured
 *   > text                       small italic note
 *   ![caption](images/x.png)     figure
 * Directives (closed by a line containing only ":::")
 *   ::: summary "Headline"       executive summary (first paragraph is the lead)
 *   ::: callout blue|green|amber "Title"
 *   ::: cards                    - Title :: description
 *   ::: pipeline                 - ok|next|plain | Title | description
 *   ::: roadmap                  ### When | Sub label   then bullets
 *   ::: faq                      ### Question   then answer paragraphs
 *   ::: glossary                 - Term :: definition
 * Tokens: {{ledger.credits}} etc. are filled from options.ledger; unknown tokens show N/A.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MdRender = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CALLOUT_COLOURS = { blue: 1, green: 1, amber: 1 };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(escaped, allowMailto) {
    var raw = escaped.replace(/&amp;/g, '&').trim();
    if (/^https?:\/\//i.test(raw)) return true;
    if (allowMailto && /^mailto:/i.test(raw)) return true;
    if (raw.charAt(0) === '#') return true;
    // relative path: no scheme, not protocol-relative
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.indexOf('//') === 0) return false;
    return true;
  }

  /* ---------- inline ---------- */
  function inline(text) {
    var codes = [];
    var s = esc(text);
    s = s.replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (m, alt, url) {
      var raw = url.replace(/&amp;/g, '&');
      var ok = /^https:\/\//i.test(raw) || (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && raw.indexOf('//') !== 0);
      return ok ? '<img src="' + url + '" alt="' + alt + '" loading="lazy">' : alt;
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      if (!safeUrl(url, true)) return label;
      var ext = /^https?:/i.test(url.replace(/&amp;/g, '&'));
      return '<a href="' + url + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + codes[+i] + '</code>'; });
    return s;
  }

  /* ---------- tokens ---------- */
  function fillTokens(md, ledger) {
    ledger = ledger || {};
    return md.replace(/\{\{\s*ledger\.([a-z_]+)\s*\}\}/gi, function (_, key) {
      var v = ledger[key];
      return (v === undefined || v === null || v === '') ? 'N/A' : String(v);
    });
  }

  /* ---------- tokenise: lines and directive objects ---------- */
  function tokenise(lines) {
    var items = [], i = 0;
    while (i < lines.length) {
      var m = /^:::\s*([a-z]+)\s*(.*)$/i.exec(lines[i]);
      if (m) {
        var depth = 1, inner = [];
        i++;
        while (i < lines.length) {
          if (/^:::\s*[a-z]+/i.test(lines[i])) depth++;
          else if (/^:::\s*$/.test(lines[i])) { depth--; if (depth === 0) break; }
          inner.push(lines[i]); i++;
        }
        i++; // skip closing fence (or run off the end: unclosed directive still renders)
        items.push({ dir: m[1].toLowerCase(), args: parseArgs(m[2]), inner: inner });
      } else { items.push({ line: lines[i] }); i++; }
    }
    return items;
  }

  function parseArgs(str) {
    var out = [], re = /"([^"]*)"|(\S+)/g, m;
    while ((m = re.exec(str)) !== null) out.push(m[1] !== undefined ? m[1] : m[2]);
    return out;
  }

  /* ---------- block rendering of plain markdown lines ---------- */
  function renderLines(lines, opts) {
    opts = opts || {};
    var html = [], i = 0, firstPara = true;
    function isBlank(l) { return /^\s*$/.test(l); }
    while (i < lines.length) {
      var l = lines[i];
      if (isBlank(l)) { i++; continue; }
      var h = /^(#{1,6})\s+(.*)$/.exec(l);
      if (h) { html.push('<div class="subhead">' + inline(h[2]) + '</div>'); i++; continue; }
      if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { i++; continue; }
      if (/^\s*>/.test(l)) {
        var q = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        html.push('<p class="note">' + inline(q.join(' ')) + '</p>'); continue;
      }
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
        html.push(renderTable(rows)); continue;
      }
      if (/^\s*[-*]\s+/.test(l)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { ul.push('<li>' + inline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>'); i++; }
        html.push('<ul class="md-list">' + ul.join('') + '</ul>'); continue;
      }
      if (/^\s*\d+[.)]\s+/.test(l)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { ol.push('<li>' + inline(lines[i].replace(/^\s*\d+[.)]\s+/, '')) + '</li>'); i++; }
        html.push('<ol class="md-list">' + ol.join('') + '</ol>'); continue;
      }
      var fig = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(l);
      if (fig) {
        var im = inline(l);
        html.push('<figure class="fig">' + im + (fig[1] ? '<figcaption>' + esc(fig[1]) + '</figcaption>' : '') + '</figure>');
        i++; continue;
      }
      var para = [];
      while (i < lines.length && !isBlank(lines[i]) && !/^(#{1,6}\s|\s*>|\s*[-*]\s+|\s*\d+[.)]\s+|\s*\|.*\|\s*$|\s*(---+|\*\*\*+)\s*$)/.test(lines[i])) { para.push(lines[i].trim()); i++; }
      if (!para.length) { para.push(lines[i].trim()); i++; }
      var cls = (opts.leadFirst && firstPara) ? ' class="lead"' : '';
      firstPara = false;
      html.push('<p' + cls + '>' + inline(para.join(' ')) + '</p>');
    }
    return html.join('\n');
  }

  function splitRow(r) {
    r = r.trim().replace(/^\|/, '').replace(/\|$/, '');
    return r.split('|').map(function (c) { return c.trim(); });
  }
  function renderTable(rows) {
    var head = splitRow(rows[0]), body = rows.slice(2).map(splitRow);
    var t = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    body.forEach(function (r) {
      t += '<tr>' + r.map(function (c) {
        var cls = '', txt = c;
        if (/^\u2713\s/.test(c)) cls = ' class="tick"';
        else if (/^\u2717\s/.test(c)) cls = ' class="cross"';
        return '<td' + cls + '>' + inline(txt) + '</td>';
      }).join('') + '</tr>';
    });
    return t + '</tbody></table></div>';
  }

  /* ---------- items (lines + directives) ---------- */
  function renderItems(items, opts) {
    var out = [], run = [];
    function flush() { if (run.length) { out.push(renderLines(run, opts)); run = []; opts = opts && Object.assign({}, opts, { leadFirst: false }); } }
    items.forEach(function (it) {
      if (it.dir) { flush(); out.push(renderDirective(it)); }
      else run.push(it.line);
    });
    flush();
    return out.join('\n');
  }
  function innerHtml(d, opts) { return renderItems(tokenise(d.inner), opts); }
  function listItems(lines) {
    return lines.filter(function (l) { return /^\s*[-*]\s+/.test(l); }).map(function (l) { return l.replace(/^\s*[-*]\s+/, ''); });
  }

  function renderDirective(d) {
    var a = d.args;
    switch (d.dir) {
      case 'summary':
        return '<section class="summary" id="summary"><div class="eyebrow">Executive summary</div>' +
          (a[0] ? '<h2>' + esc(a[0]) + '</h2>' : '') + innerHtml(d, { leadFirst: true }) + '</section>';
      case 'callout': {
        var colour = CALLOUT_COLOURS[a[0]] ? a[0] : 'blue';
        var title = CALLOUT_COLOURS[a[0]] ? a[1] : a[0];
        return '<div class="callout ' + colour + '">' + (title ? '<div class="ttl">' + esc(title) + '</div>' : '') + innerHtml(d) + '</div>';
      }
      case 'cards':
        return '<div class="outcome-grid">' + listItems(d.inner).map(function (t) {
          var p = t.split('::');
          return '<div class="outcome"><div class="val">' + inline(p[0].trim()) + '</div><div class="lbl">' + inline((p[1] || '').trim()) + '</div></div>';
        }).join('') + '</div>';
      case 'pipeline': {
        var nodes = listItems(d.inner).map(function (t) {
          var p = t.split('|').map(function (x) { return x.trim(); });
          var st = '';
          if (p[0] === 'ok' || p[0] === 'next' || p[0] === 'plain') { st = p[0] === 'plain' ? '' : p[0]; p = p.slice(1); }
          return '<div class="pnode ' + st + '"><div class="pn-t">' + inline(p[0] || '') + '</div><div class="pn-d">' + inline(p[1] || '') + '</div></div>';
        });
        return '<div class="pipeline">' + nodes.join('<div class="parrow">→</div>') + '</div>';
      }
      case 'roadmap': {
        var tiers = [], cur = null;
        d.inner.forEach(function (l) {
          var h = /^#{1,6}\s+(.*)$/.exec(l);
          if (h) { var p = h[1].split('|'); cur = { when: p[0].trim(), sub: (p[1] || '').trim(), items: [] }; tiers.push(cur); }
          else if (cur && /^\s*[-*]\s+/.test(l)) cur.items.push(l.replace(/^\s*[-*]\s+/, ''));
        });
        return '<div class="road">' + tiers.map(function (t) {
          return '<div class="road-tier"><div class="road-when"><div class="rw-t">' + inline(t.when) + '</div>' +
            (t.sub ? '<div class="rw-s">' + inline(t.sub) + '</div>' : '') + '</div><div class="road-what"><ul>' +
            t.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul></div></div>';
        }).join('') + '</div>';
      }
      case 'faq': {
        var qs = [], c = null;
        d.inner.forEach(function (l) {
          var h = /^#{1,6}\s+(.*)$/.exec(l);
          if (h) { c = { q: h[1], a: [] }; qs.push(c); } else if (c) c.a.push(l);
        });
        return qs.map(function (x) {
          return '<div class="faq-item"><div class="faq-q">' + inline(x.q) + '</div><div class="faq-a">' + renderLines(x.a) + '</div></div>';
        }).join('');
      }
      case 'glossary':
        return '<dl class="gloss">' + listItems(d.inner).map(function (t) {
          var p = t.split('::');
          return '<dt>' + inline(p[0].trim()) + '</dt><dd>' + inline((p[1] || '').trim()) + '</dd>';
        }).join('') + '</dl>';
      default: // unknown directive: keep the content, drop the wrapper
        return innerHtml(d);
    }
  }

  /* ---------- document: split into numbered sections ---------- */
  function render(markdown, options) {
    options = options || {};
    var md = fillTokens(String(markdown || '').replace(/\r\n?/g, '\n'), options.ledger);
    var items = tokenise(md.split('\n'));
    var pre = [], sections = [], cur = null;
    items.forEach(function (it) {
      var h = it.line !== undefined ? /^##\s+(.*)$/.exec(it.line) : null;
      if (h) { cur = { title: h[1].trim(), items: [] }; sections.push(cur); }
      else (cur ? cur.items : pre).push(it);
    });
    var toc = [], html = [];
    var preHtml = renderItems(pre);
    if (preHtml) html.push(preHtml);
    if (/id="summary"/.test(preHtml)) toc.push({ id: 'summary', title: 'Executive summary', num: '' });
    sections.forEach(function (s, idx) {
      var n = idx + 1, id = 's' + n, num = (n < 10 ? '0' : '') + n;
      toc.push({ id: id, title: s.title, num: num });
      html.push('<div class="section" id="' + id + '"><div class="section-header"><div class="section-num">' + num +
        '</div><div class="section-title">' + inline(s.title) + '</div></div><div class="section-body">' +
        renderItems(s.items) + '</div></div>');
    });
    return { html: html.join('\n'), toc: toc };
  }

  return { render: render, _inline: inline, _esc: esc };
});
