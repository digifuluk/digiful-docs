/* ============================================================
   config.js — ServiceFlow
   All endpoint constants and environment configuration.
   This is the ONLY file that changes when swapping GAS → Supabase.
   ============================================================ */

var SF = SF || {};

SF.CONFIG = {

  // ── Data source ───────────────────────────────────────────
  // GAS endpoint (current). Replace BASE_URL when migrating to Supabase.
  // Supabase pattern: 'https://<ref>.supabase.co/rest/v1/'
  BASE_URL: 'https://script.google.com/macros/s/AKfycbzmtPe6bjkGuBcLAMBNFD4NNgFBl3VwCcpp2o8E5SRoQICgL-K-Ea0JMjp2Jd_pyttC/exec',

  // ── Form submission ───────────────────────────────────────
  // Formspark endpoint (used by QOF form only; not report)
  FORMSPARK_ID: 'DJWZOFZqL',
  FORMSPARK_URL: 'https://submit-form.com/',

  // ── Auth / URL param keys ─────────────────────────────────
  PARAMS: {
    AUTH_KEY:    'auth_key',
    CLIENT_PLAN: 'client_plan_id',  // used by report
    Q_OPT_ID:    'q_opt_id',        // used by QOF
    MONTH_RANGE: 'month_range',     // used by QOF
  },

  // ── Cookie config (QOF) ───────────────────────────────────
  COOKIE_KEY:      'qof_store',
  COOKIE_DAYS:     90,

  // ── Data mode ─────────────────────────────────────────────
  // 'live'  — fetch from BASE_URL
  // 'dummy' — use inline dummy data injected in <head> of each page
  // Switch to 'live' once Supabase is wired up
  MODE: 'dummy',

};
