/* Shared helpers for index.html and report.html. */
(function () {
  "use strict";
  var P = new URLSearchParams(location.search);
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var SNAPSHOT = /^reports\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+\.html$/;
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  var R = {
    params: P,
    isDemo: P.get("demo") === "1",
    snapshotPath: SNAPSHOT,

    creds: function () {
      var c = Number(P.get("c")), k = P.get("k") || "";
      return (Number.isInteger(c) && c > 0 && UUID.test(k)) ? { c: c, k: k } : null;
    },

    /* keep c, k (and demo) on every internal link so the page stays authenticated */
    link: function (path, extra) {
      var q = new URLSearchParams();
      ["c", "k", "demo"].forEach(function (n) { if (P.get(n)) q.set(n, P.get(n)); });
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
    message: function (err) {
      return err && err.message === "incomplete-link"
        ? "This link looks incomplete. Please use the full link we sent you, or ask us to resend it."
        : "We couldn't load your reports just now. Please refresh, or contact us if it keeps happening.";
    },
    el: function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  };
  window.Reports = R;
})();
