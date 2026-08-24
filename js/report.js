/* ============================================================
   report.js — ServiceFlow
   Monthly / Quarterly Work Report controller.
   Depends on: config.js, api.js, ui.js
   Sections:
     1. Data contract (comment)
     2. DOM refs
     3. State
     4. Month navigation (arrows + dropdown)
     5. Render — info bar
     6. Render — balance summary
     7. Render — quarter summary
     8. Render — monthly work items
     9. Data fetch + init
   ============================================================ */

(function() {
  'use strict';

  // ── Section 1: Data contract ─────────────────────────────────────────────
  /*
    SF_DUMMY_REPORT / Supabase response shape:

    {
      status: 'ok',
      client_plan_id: string,
      client_id: string,
      client_name: string,
      plan_name: string,
      credits_per_month: number,

      // Quarter-level summary (all months in current quarter)
      quarter: {
        q_name: string,       // e.g. 'Q2 2026'
        months: [4, 5, 6],   // numeric month indices in this quarter
        year: 2026
      },

      // Balance snapshot (from Client_Balances / Supabase view)
      balance: {
        total_loaded: number,    // sum of all CREDIT rows for this plan
        total_spent: number,     // sum of all ORDER rows (net of bonus)
        remaining: number,       // loaded - spent
        bonus_received: number,  // sum of bonus credits applied
      },

      // All transaction rows for this plan, sorted by billing_period desc
      // Each row represents one Transaction (Sheet 6 / Supabase Transactions table)
      transactions: [
        {
          transaction_id: string,
          billing_period: string,   // 'YYYY-MM' e.g. '2026-04'
          billing_month: number,    // 4
          billing_year: number,     // 2026
          row_type: string,         // 'CREDIT' | 'ORDER'
          work_type: string,        // 'ON_PLAN' | 'REVISION' | 'OFF_PLAN_EMERGENCY' | 'OFF_PLAN_PRIORITY'
          service_name: string,
          credit_cost: number,
          bonus_credits: number,
          status: string,           // 'APPROVED' | 'SCHEDULED' | 'PENDING' | 'ON_HOLD' | 'COMPLETE'
          notes: string,
        }
      ]
    }

    To swap backend: update SF.fetchReport() in api.js to hit Supabase REST.
    The response must conform to this shape — transform in api.js if needed.
  */

  // ── Section 2: DOM refs ──────────────────────────────────────────────────
  var statusBar      = document.getElementById('status-bar');
  var infoBar        = document.getElementById('info-bar');
  var main           = document.getElementById('main');
  var balanceBar     = document.getElementById('balance-bar');
  var quarterSummary = document.getElementById('quarter-summary');
  var monthNavPrev   = document.getElementById('month-nav-prev');
  var monthNavNext   = document.getElementById('month-nav-next');
  var monthNavLabel  = document.getElementById('month-nav-label');
  var monthNavSelect = document.getElementById('month-nav-select');
  var workItemsWrap  = document.getElementById('work-items');

  // ── Section 3: State ─────────────────────────────────────────────────────
  var data         = null;   // full response object
  var allMonths    = [];     // sorted unique billing months [{monthNum, year, label}]
  var currentIdx   = 0;     // index into allMonths for currently displayed month

  var esc        = SF.ui.esc;
  var monthFull  = SF.ui.monthFull;
  var monthShort = SF.ui.monthShort;

  // ── Section 4: Month navigation ──────────────────────────────────────────
  function buildMonthList(transactions) {
    var seen = {};
    var list = [];
    transactions.forEach(function(tx) {
      if (tx.row_type !== 'ORDER') return;
      var key = tx.billing_year + '-' + tx.billing_month;
      if (!seen[key]) {
        seen[key] = true;
        list.push({
          monthNum: tx.billing_month,
          year:     tx.billing_year,
          key:      key,
          label:    monthFull(tx.billing_month) + ' ' + tx.billing_year
        });
      }
    });
    // Sort newest first
    list.sort(function(a, b) {
      if (b.year !== a.year) return b.year - a.year;
      return b.monthNum - a.monthNum;
    });
    return list;
  }

  function populateMonthSelect() {
    monthNavSelect.innerHTML = '';
    allMonths.forEach(function(m, i) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = m.label;
      monthNavSelect.appendChild(o);
    });
  }

  function updateNavButtons() {
    monthNavPrev.disabled = (currentIdx >= allMonths.length - 1);
    monthNavNext.disabled = (currentIdx <= 0);
  }

  function navigateTo(idx) {
    currentIdx = idx;
    monthNavLabel.textContent = allMonths[idx].label;
    monthNavSelect.value = idx;
    updateNavButtons();
    renderWorkItems(allMonths[idx]);
  }

  monthNavPrev.addEventListener('click', function() {
    if (currentIdx < allMonths.length - 1) navigateTo(currentIdx + 1);
  });
  monthNavNext.addEventListener('click', function() {
    if (currentIdx > 0) navigateTo(currentIdx - 1);
  });
  monthNavSelect.addEventListener('change', function() {
    navigateTo(parseInt(this.value, 10));
  });

  // ── Section 5: Render — info bar ─────────────────────────────────────────
  function renderInfoBar(d) {
    infoBar.innerHTML =
      '<div class="info-bar-line1"><h4>' + esc(d.client_name) + '</h4></div>' +
      '<div class="info-bar-line2">' +
        '<span>' + esc(d.plan_name) + '</span>' +
        '<span class="sep">|</span>' +
        '<span>🪙 ' + d.credits_per_month + ' credits / month</span>' +
        '<span class="sep">|</span>' +
        '<span>' + esc(d.quarter.q_name) + '</span>' +
      '</div>';
    infoBar.style.display = '';
  }

  // ── Section 6: Render — balance summary ──────────────────────────────────
  function renderBalance(b) {
    balanceBar.innerHTML =
      '<div class="balance-bar-item">' +
        '<span class="label">Loaded</span>' +
        '<strong>' + b.total_loaded + '</strong>' +
      '</div>' +
      '<div class="balance-bar-item">' +
        '<span class="label">Spent</span>' +
        '<strong>' + b.total_spent + '</strong>' +
      '</div>' +
      (b.bonus_received > 0
        ? '<div class="balance-bar-item">' +
            '<span class="label">Bonus received</span>' +
            '<strong>' + b.bonus_received + '</strong>' +
          '</div>'
        : '') +
      '<div class="balance-bar-item">' +
        '<span class="label">Remaining balance</span>' +
        '<strong style="color:' + (b.remaining < 0 ? '#dc2626' : 'inherit') + '">' + b.remaining + '</strong>' +
      '</div>';
    balanceBar.style.display = '';
  }

  // ── Section 7: Render — quarter summary ──────────────────────────────────
  function renderQuarterSummary(d) {
    var qMonths = d.quarter.months;
    var rows = qMonths.map(function(m) {
      var txs = d.transactions.filter(function(tx) {
        return tx.row_type === 'ORDER'
          && tx.billing_month === m
          && tx.billing_year === d.quarter.year;
      });
      var spent = txs.reduce(function(sum, tx) { return sum + (tx.credit_cost - (tx.bonus_credits || 0)); }, 0);
      var hasItems = txs.length > 0;
      return '<div class="strat-svc-row">' +
        '<span class="strat-svc-name">' + monthFull(m) + ' ' + d.quarter.year +
          (hasItems ? '' : ' <span class="strat-svc-id">(nothing yet)</span>') +
        '</span>' +
        '<span class="strat-svc-month">' + (hasItems ? spent + ' credits' : '—') + '</span>' +
      '</div>';
    });
    quarterSummary.innerHTML =
      '<div class="strat-services-title">Quarter credit spend — ' + esc(d.quarter.q_name) + '</div>' +
      rows.join('');
    quarterSummary.style.display = '';
  }

  // ── Section 8: Render — monthly work items ────────────────────────────────
  function renderWorkItems(monthObj) {
    workItemsWrap.innerHTML = '';

    var txs = data.transactions.filter(function(tx) {
      return tx.row_type === 'ORDER'
        && tx.billing_month === monthObj.monthNum
        && tx.billing_year  === monthObj.year;
    });

    if (txs.length === 0) {
      workItemsWrap.innerHTML = '<div class="empty-state">No work items recorded for this month.</div>';
      return;
    }

    txs.forEach(function(tx) {
      var net = (tx.credit_cost || 0) - (tx.bonus_credits || 0);
      var el = document.createElement('div');
      el.className = 'work-item';
      el.innerHTML =
        '<div style="flex:1; min-width:0;">' +
          '<div class="work-item-name">' + esc(tx.service_name) + '</div>' +
          '<div class="work-item-meta">' + esc(tx.notes || '') + '</div>' +
          '<div class="pills" style="margin-top:6px;">' +
            SF.ui.workTypePill(tx.work_type) +
            SF.ui.statusPill(tx.status) +
          '</div>' +
        '</div>' +
        '<div class="work-item-right">' +
          '<div class="work-item-credits">🪙 ' + net + ' credits</div>' +
          (tx.bonus_credits > 0
            ? '<div style="font-size:11px;color:#065f46;">🎁 ' + tx.bonus_credits + ' bonus applied</div>'
            : '') +
        '</div>';
      workItemsWrap.appendChild(el);
    });
  }

  // ── Section 9: Data fetch + init ─────────────────────────────────────────
  SF.ui.setStatus(statusBar, 'loading', '⏳ Loading your report…');

  SF.fetchReport()
    .then(function(d) {

      if (!d || d.status !== 'ok') {
        SF.ui.setStatus(statusBar, 'err', 'Bad response — status: ' + (d && d.status));
        return;
      }

      data = d;

      SF.ui.setStatus(statusBar, 'ok',
        '✅ Report loaded — ' + d.transactions.filter(function(t){ return t.row_type === 'ORDER'; }).length + ' work items'
      );

      renderInfoBar(d);
      renderBalance(d.balance);
      renderQuarterSummary(d);

      allMonths = buildMonthList(d.transactions);

      if (allMonths.length === 0) {
        workItemsWrap.innerHTML = '<div class="empty-state">No work items recorded yet.</div>';
        main.style.display = '';
        return;
      }

      populateMonthSelect();
      navigateTo(0); // default: most recent month
      main.style.display = '';

    })
    .catch(function(err) {
      SF.ui.setStatus(statusBar, 'err', 'Fetch error: ' + err.message);
    });

})();
