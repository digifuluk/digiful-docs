/* ============================================================
   api.js — ServiceFlow
   Data connector layer.
   Sections:
     1. URL param reader
     2. Cookie store (QOF only)
     3. QOF fetch (GAS / Supabase)
     4. Report fetch (GAS / Supabase)
   To swap backend: update SF.CONFIG.BASE_URL and SF.CONFIG.MODE in config.js.
   Sections 3 & 4 only need changing if the Supabase response shape differs.
   ============================================================ */

var SF = SF || {};

// ── Section 1: URL param reader ──────────────────────────────────────────────
SF.params = (function() {
  var p = new URLSearchParams(window.location.search);
  return {
    get: function(key) { return p.get(key) || ''; },
    authKey:    p.get(SF.CONFIG.PARAMS.AUTH_KEY)    || '',
    qOptId:     p.get(SF.CONFIG.PARAMS.Q_OPT_ID)    || '',
    monthRange: p.get(SF.CONFIG.PARAMS.MONTH_RANGE) || '',
    clientPlan: p.get(SF.CONFIG.PARAMS.CLIENT_PLAN) || '',
  };
})();

// ── Section 2: Cookie store (QOF) ────────────────────────────────────────────
SF.cookieStore = (function() {
  var KEY  = SF.CONFIG.COOKIE_KEY;
  var DAYS = SF.CONFIG.COOKIE_DAYS;

  function _read(name) {
    var prefix = name + '=';
    var parts = document.cookie.split(';');
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].trim();
      if (c.indexOf(prefix) === 0) return decodeURIComponent(c.substring(prefix.length));
    }
    return null;
  }
  function _write(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + d.toUTCString() + '; path=/';
  }
  function _clear(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  }

  var store = null;

  function load(qOptId) {
    var raw = _read(KEY);
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;
      if (!Array.isArray(parsed.submissions)) parsed.submissions = [];
      // Clear if q_opt_id mismatch
      if (String(parsed.q_opt_id) !== String(qOptId)) { _clear(KEY); return; }
      store = parsed;
    } catch(e) { /* malformed — ignore */ }
  }

  function hasPrevious() {
    return !!(store && Array.isArray(store.submissions) && store.submissions.length > 0);
  }

  function record(qOptId) {
    if (!store || typeof store !== 'object') {
      store = { q_opt_id: qOptId, submissions: [] };
    }
    if (!Array.isArray(store.submissions)) store.submissions = [];
    store.submissions.push({ count: store.submissions.length + 1, ts: new Date().toISOString() });
    _write(KEY, JSON.stringify(store), DAYS);
  }

  return { load: load, hasPrevious: hasPrevious, record: record };
})();

// ── Section 3: QOF data fetch ─────────────────────────────────────────────────
// Contract: returns a Promise resolving to the normalised QOF data object.
// Dummy data is injected as window.SF_DUMMY_QOF in the page <head>.
// Live: fetches GAS endpoint with URL params.
// Supabase migration: replace the fetch() call; keep the returned shape identical.
SF.fetchQOF = function() {
  if (SF.CONFIG.MODE === 'dummy') {
    if (!window.SF_DUMMY_QOF) return Promise.reject(new Error('SF_DUMMY_QOF not defined in page head'));
    return Promise.resolve(window.SF_DUMMY_QOF);
  }

  return fetch(
    SF.CONFIG.BASE_URL
    + '?q_opt_id='    + encodeURIComponent(SF.params.qOptId)
    + '&month_range=' + encodeURIComponent(SF.params.monthRange)
    + '&auth_key='    + encodeURIComponent(SF.params.authKey)
  ).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
};

// ── Section 4: Report data fetch ──────────────────────────────────────────────
// Contract: returns a Promise resolving to the normalised Report data object.
// Dummy data is injected as window.SF_DUMMY_REPORT in the page <head>.
// Supabase migration: replace the fetch() call below; shape must match the contract
// documented in js/report.js Section 2.
SF.fetchReport = function() {
  if (SF.CONFIG.MODE === 'dummy') {
    if (!window.SF_DUMMY_REPORT) return Promise.reject(new Error('SF_DUMMY_REPORT not defined in page head'));
    return Promise.resolve(window.SF_DUMMY_REPORT);
  }

  return fetch(
    SF.CONFIG.BASE_URL
    + '?action=report'
    + '&client_plan_id=' + encodeURIComponent(SF.params.clientPlan)
    + '&auth_key='       + encodeURIComponent(SF.params.authKey)
  ).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
};
