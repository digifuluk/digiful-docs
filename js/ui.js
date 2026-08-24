/* ============================================================
   ui.js — ServiceFlow
   Shared DOM helpers and render utilities.
   Used by: qof.js, report.js
   ============================================================ */

var SF = SF || {};

SF.ui = (function() {

  // ── String escaping ─────────────────────────────────────────────────────
  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Month name helpers ───────────────────────────────────────────────────
  var MONTH_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTH_FULL  = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

  function monthShort(n) { return (n >= 1 && n <= 12) ? MONTH_SHORT[n] : 'Month ' + n; }
  function monthFull(n)  { return (n >= 1 && n <= 12) ? MONTH_FULL[n]  : 'Month ' + n; }

  // Build a label from a numeric month index (1–12) and a year: "April 2026"
  function monthLabel(monthNum, year) {
    return monthFull(monthNum) + (year ? ' ' + year : '');
  }

  // ── Date formatting ──────────────────────────────────────────────────────
  // Converts 'yyyy-MM-dd' to 'dd/MM/yy'
  function formatDeadline(iso) {
    if (!iso) return iso;
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0].slice(2) : iso;
  }

  // ── Status bar helpers ───────────────────────────────────────────────────
  function setStatus(el, type, text) {
    // type: 'loading' | 'ok' | 'err'
    el.className = 'status ' + type;
    el.textContent = text;
  }

  // ── Strategy pill class (by index 0–4) ───────────────────────────────────
  function stratPillClass(idx) {
    return ['pill-strat-0','pill-strat-1','pill-strat-2','pill-strat-3','pill-strat-4'][Math.min(idx, 4)];
  }

  // ── Populate a <select> with service options ─────────────────────────────
  function populateServiceSelect(sel, services, blankLabel) {
    sel.innerHTML = '';
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = blankLabel || '-- Select a service --';
    sel.appendChild(blank);
    services.forEach(function(s) {
      var o = document.createElement('option');
      o.value = s.q_opt_list_id;
      o.textContent = s.display_name + ' (id: ' + s.service_id + ')';
      sel.appendChild(o);
    });
  }

  // ── Render a work-type badge pill ────────────────────────────────────────
  // Maps Transactions work_type → display pill class and label
  var WORK_TYPE_MAP = {
    'ON_PLAN':            { cls: 'pill-scheduled',  label: 'On Plan' },
    'REVISION':           { cls: 'pill-focus',      label: 'Revision' },
    'OFF_PLAN_EMERGENCY': { cls: 'pill-nofocus',    label: 'Emergency' },
    'OFF_PLAN_PRIORITY':  { cls: 'pill-on-hold',    label: 'Priority' },
  };
  function workTypePill(workType) {
    var m = WORK_TYPE_MAP[workType] || { cls: 'pill-credits', label: workType };
    return '<span class="pill ' + m.cls + '">' + m.label + '</span>';
  }

  // Maps Transactions status → display pill class and label
  var STATUS_MAP = {
    'APPROVED':   { cls: 'pill-approved',  label: 'Approved' },
    'SCHEDULED':  { cls: 'pill-scheduled', label: 'Scheduled' },
    'PENDING':    { cls: 'pill-pending',   label: 'Pending' },
    'ON_HOLD':    { cls: 'pill-on-hold',   label: 'On Hold' },
    'COMPLETE':   { cls: 'pill-complete',  label: 'Complete' },
  };
  function statusPill(status) {
    var m = STATUS_MAP[status] || { cls: 'pill-credits', label: status };
    return '<span class="pill ' + m.cls + '">' + m.label + '</span>';
  }

  // ── Exposed API ──────────────────────────────────────────────────────────
  return {
    esc:                  esc,
    monthShort:           monthShort,
    monthFull:            monthFull,
    monthLabel:           monthLabel,
    formatDeadline:       formatDeadline,
    setStatus:            setStatus,
    stratPillClass:       stratPillClass,
    populateServiceSelect:populateServiceSelect,
    workTypePill:         workTypePill,
    statusPill:           statusPill,
  };

})();
