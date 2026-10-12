/* Shared helpers for index.html and report.html. */
(function () {
  "use strict";
  var P = new URLSearchParams(location.search);
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var SNAPSHOT = /^reports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+\.html$/;
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  var R = {
    params: P,
    isDemo: P.get("demo") === "1" && !!window.DemoData,
    snapshotPath: SNAPSHOT,
    snapshotUrl: function (p) {
      var base = ((window.REPORTS_CONFIG || {}).siteFolder || "") + "/";
      return (base !== "/" && p.indexOf(base) === 0) ? p.slice(base.length) : p;
    },

    creds: function () {
      var c = Number(P.get("c")), k = P.get("k") || "";
      return (Number.isInteger(c) && c > 0 && UUID.test(k)) ? { c: c, k: k } : null;
    },

    /* keep c, k (and demo) on every internal link so the page stays authenticated */
    link: function (path, extra) {
      var q = new URLSearchParams();
      ["c", "k", "demo", "notrack"].forEach(function (n) { if (P.get(n)) q.set(n, P.get(n)); });
      Object.keys(extra || {}).forEach(function (n) { if (extra[n] !== null && extra[n] !== undefined) q.set(n, extra[n]); });
      var s = q.toString();
      return path + (s ? "?" + s : "");
    },

    fmtDate: function (iso) {
      if (!iso) return "N/A";
      var d = new Date(iso + "T00:00:00");
      return isNaN(d) ? "N/A" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    },
    /* "2026-09" -> {mon:"Sep", yr:"2026", text:"Sep 2026"} or null */
    month: function (ym) {
      var m = /^(\d{4})-(\d{2})$/.exec(ym || "");
      if (!m || +m[2] < 1 || +m[2] > 12) return null;
      var mon = MONTHS[+m[2] - 1];
      return { mon: mon, yr: m[1], text: mon + " " + m[1] };
    },
    /* quarter label from the contract quarter number (contracts need not start in January) */
    quarter: function (row) {
      var n = ((Number(row.quarter_number) - 1) % 4 + 4) % 4 + 1;
      var year = String(row.period_start).slice(0, 4);
      return { key: String(row.quarter_id), q: "Q" + n, year: year, label: "Q" + n + " " + year,
               range: R.fmtDate(row.period_start) + " to " + R.fmtDate(row.period_end) };
    },
    status: function (s) {
      var map = { "Completed": "Completed", "In Progress": "In progress", "Approved": "Approved", "Scheduled": "Scheduled", "On Hold": "On hold" };
      return map[s] || (s ? String(s) : "N/A");
    },

    /* ---- data access: Supabase RPC, or demo data with ?demo=1 ---- */
    rpc: function (name, body) {
      var cfg = window.REPORTS_CONFIG || {};
      return fetch(cfg.supabaseUrl + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers: { "apikey": cfg.supabaseKey, "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body)
      }).then(function (res) {
        if (!res.ok) throw new Error("Request failed (" + res.status + ")");
        return res.json();
      });
    },
    loadList: function () {
      if (R.isDemo) return Promise.resolve(window.DemoData.rows.slice());
      var cr = R.creds();
      if (!cr) return Promise.reject(new Error("incomplete-link"));
      return R.rpc("get_live_reports", { p_client_id: cr.c, p_auth_key: cr.k });
    },
    loadReport: function (id) {
      if (R.isDemo) return Promise.resolve(window.DemoData.report(id));
      var cr = R.creds();
      if (!cr) return Promise.reject(new Error("incomplete-link"));
      return R.rpc("get_report", { p_client_id: cr.c, p_auth_key: cr.k, p_report_instance_id: id })
        .then(function (rows) { return rows && rows.length ? rows[0] : null; });
    },
    /* quarter credit summaries (migration 020). If it is not available the pages still work, just without the credit boxes. */
    loadQuarters: function () {
      if (R.isDemo) return Promise.resolve((window.DemoData.quarters || []).slice());
      var cr = R.creds();
      if (!cr) return Promise.resolve([]);
      return R.rpc("get_quarter_summaries", { p_client_id: cr.c, p_auth_key: cr.k }).then(function (r) { return r || []; }, function () { return []; });
    },

    /* ---- first-party usage events (Supabase reports.report_events via public.log_report_event) ----
       No cookies, no IP, no third party. Silent on any failure. Skipped in demo mode, and with ?notrack=1 (use it for your own testing).
       event: page_view | filter_change | report_open | pdf_download. detail keys: page, filter, value, kind. */
    track: function (event, reportId, detail) {
      try {
        if (R.isDemo || P.get("notrack") === "1") return;
        var cr = R.creds(), cfg = window.REPORTS_CONFIG || {};
        if (!cr || !cfg.supabaseUrl) return;
        fetch(cfg.supabaseUrl + "/rest/v1/rpc/log_report_event", {
          method: "POST", keepalive: true,
          headers: { "apikey": cfg.supabaseKey, "Content-Type": "application/json" },
          body: JSON.stringify({ p_client_id: cr.c, p_auth_key: cr.k, p_event: event,
                                 p_report_instance_id: reportId || null, p_detail: detail || {} })
        }).catch(function () {});
      } catch (e) { /* tracking must never break the page */ }
    },

    /* ---- bonus cards ---- */
    money: function (n) {
      var v = Number(n); if (!isFinite(v)) return "N/A";
      return "\u00A3" + (Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : v.toFixed(2));
    },
    bonusTitle: function (b) {
      if (b.type === "EARLY_ADOPTER") return "\uD83C\uDF81 Early Adopter Bonus" + (b.month_no && b.month_of ? " (Month " + b.month_no + " of " + b.month_of + ")" : "");
      if (b.type === "SERVICE_SPECIFIC") return "\uD83C\uDF81 Service Specific Bonus";
      return "\uD83C\uDF81 Bonus";
    },
    /* one bonus = a title chip + a credits chip (+ a note when one grant covers several orders). Text only, built with DOM calls. */
    bonusCard: function (b) {
      var box = R.el("div", "bonus " + (b.type === "EARLY_ADOPTER" ? "ea" : "ss"));
      box.appendChild(R.el("span", "bchip bt", R.bonusTitle(b)));
      box.appendChild(R.el("span", "bchip bc", "\uD83E\uDE99 +" + Number(b.credits) + " credits"));
      if (Number(b.covers_orders) > 1) box.appendChild(R.el("span", "bnote", "One bonus covering " + Number(b.covers_orders) + " orders"));
      return box;
    },
    bonusRow: function (bonuses, types) {
      var list = (bonuses || []).filter(function (b) { return types.indexOf(b.type) >= 0 && Number(b.credits) > 0; });
      if (!list.length) return null;
      var wrap = R.el("div", "bonuses");
      list.forEach(function (b) { wrap.appendChild(R.bonusCard(b)); });
      return wrap;
    },

    message: function (err) {
      return err && err.message === "incomplete-link"
        ? "This link looks incomplete. Please use the full link we sent you, or ask us to resend it."
        : "We couldn't load your reports just now. Please refresh, or contact us if it keeps happening.";
    },
    el: function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; },

    /* ---- summary reports: https link + embeds (URLs only; allow-listed hosts; built with DOM calls, never innerHTML) ---- */
    safeHttps: function (u) {
      try { var x = new URL(String(u || "").trim()); return x.protocol === "https:" && !x.username && !x.password ? x : null; }
      catch (e) { return null; }
    },
    /* one embed per line: "<url>" or "<url> | caption". Returns [{kind:'image'|'video'|'link', src, caption, open}] */
    parseEmbeds: function (text) {
      var out = [];
      String(text || "").split(/\r?\n/).filter(function (l) { return l.trim(); }).slice(0, 12).forEach(function (raw) {
        var line = raw.trim();
        var cut = line.indexOf("|"), caption = cut > 0 ? line.slice(cut + 1).trim().slice(0, 200) : "", ref = (cut > 0 ? line.slice(0, cut) : line).trim();
        var IMG = /\.(png|jpe?g|gif|webp)$/i;
        if (/^images\/[A-Za-z0-9._\/-]+$/.test(ref) && ref.indexOf("..") < 0 && IMG.test(ref)) { out.push({ kind: "image", src: ref, caption: caption, open: ref }); return; }
        var u = R.safeHttps(ref); if (!u) return;
        var h = u.hostname.toLowerCase(), p = u.pathname, m, src = null;
        if (IMG.test(p)) { out.push({ kind: "image", src: u.href, caption: caption, open: u.href }); return; }
        if (h === "youtu.be" && (m = /^\/([A-Za-z0-9_-]{11})$/.exec(p))) src = "https://www.youtube-nocookie.com/embed/" + m[1];
        else if (/^(www\.|m\.)?youtube(-nocookie)?\.com$/.test(h)) {
          if ((m = /^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})$/.exec(p))) src = "https://www.youtube-nocookie.com/embed/" + m[1];
          else if (p === "/watch" && /^[A-Za-z0-9_-]{11}$/.test(u.searchParams.get("v") || "")) src = "https://www.youtube-nocookie.com/embed/" + u.searchParams.get("v");
        }
        else if (h === "vimeo.com" || h === "www.vimeo.com" || h === "player.vimeo.com") {
          m = /^\/(?:video\/)?(\d{5,12})(?:\/([0-9a-f]{6,16}))?$/.exec(p);
          if (m) src = "https://player.vimeo.com/video/" + m[1] + (m[2] ? "?h=" + m[2] : (/^[0-9a-f]{6,16}$/.test(u.searchParams.get("h") || "") ? "?h=" + u.searchParams.get("h") : ""));
        }
        else if (h === "loom.com" || h === "www.loom.com") {
          if ((m = /^\/(?:share|embed)\/([0-9a-f]{32})$/.exec(p))) src = "https://www.loom.com/embed/" + m[1];
        }
        else if (h === "play.gumlet.io") {
          if (/^\/embed\/[A-Za-z0-9_-]{6,64}$/.test(p)) src = "https://play.gumlet.io" + p;
        }
        else if (/(^|\.)berrycast\.(app|com)$/.test(h)) src = u.href;
        if (src) out.push({ kind: "video", src: src, caption: caption, open: u.href });
        else out.push({ kind: "link", src: u.href, caption: caption, open: u.href });
      });
      return out;
    },
    embedNodes: function (text) {
      return R.parseEmbeds(text).map(function (e) {
        var fig = R.el("figure", "fig media");
        if (e.kind === "image") {
          var img = R.el("img"); img.src = e.src; img.alt = e.caption || "Illustration"; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
          fig.appendChild(img);
        } else if (e.kind === "video") {
          var w = R.el("div", "videoWrapper"), f = R.el("iframe");
          f.src = e.src; f.title = e.caption || "Video"; f.loading = "lazy"; f.referrerPolicy = "strict-origin-when-cross-origin";
          f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox");
          f.setAttribute("allow", "fullscreen; picture-in-picture; encrypted-media");
          f.setAttribute("allowfullscreen", ""); f.setAttribute("frameborder", "0");
          w.appendChild(f); fig.appendChild(w);
        }
        var cap = R.el("figcaption");
        var hasLink = e.kind !== "image" || /^https:/.test(e.open);
        if (e.caption) cap.appendChild(document.createTextNode(e.caption + (hasLink ? (e.kind === "link" ? " " : " \u00B7 ") : "")));
        if (hasLink) {
          var a = R.el("a", null, e.kind === "video" ? "Open video" : (e.kind === "link" ? e.open.replace(/^https:\/\//, "") : "Open image"));
          a.href = e.open; a.target = "_blank"; a.rel = "noopener noreferrer"; cap.appendChild(a);
        }
        if (cap.childNodes.length) fig.appendChild(cap);
        return fig;
      });
    }
  };
  window.Reports = R;
})();
