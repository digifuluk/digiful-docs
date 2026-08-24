/* ============================================================
   qof.js — ServiceFlow
   Quarterly Order Form controller.
   Depends on: config.js, api.js, ui.js
   Sections:
     1. DOM refs
     2. Cookie init
     3. State
     4. Helper functions
     5. Event: Show/hide Part 2
     6. Data fetch + render
       (a) Status bar
       (b) Info bar
       (c) Intro text
       (d) Hidden fields
       (e) Bonus footnote
       (f) Override checkbox
       (g) Services browse
       (h) Strategies browse
       (i) Strategy prefill select
       (j) Month slots
       (k) Credit counter
       (l) Strategy prefill → slot population
     7. Validation
     8. Submit
   ============================================================ */

(function() {
  'use strict';

  // ── Section 1: DOM refs ──────────────────────────────────────────────────
  var statusBar       = document.getElementById('status-bar');
  var infoBar         = document.getElementById('info-bar');
  var introText       = document.getElementById('intro-text');
  var main            = document.getElementById('main');
  var svcSelect       = document.getElementById('svc-select');
  var svcDetail       = document.getElementById('svc-detail');
  var stratBrowseWrap = document.getElementById('strat-browse-wrap');
  var stratSelect     = document.getElementById('strat-select');
  var stratDetail     = document.getElementById('strat-detail');
  var bonusFootnote   = document.getElementById('bonus-footnote');
  var nudge           = document.getElementById('nudge');
  var showFormBtn     = document.getElementById('show-form-btn');
  var validationBox   = document.getElementById('validation-errors');
  var part2Body       = document.getElementById('part2-body');
  var part2Status     = document.getElementById('part2-status');
  var prefillWrap     = document.getElementById('prefill-wrap');
  var stratPrefill    = document.getElementById('strat-prefill-select');
  var monthSlotsWrap  = document.getElementById('month-slots');
  var ccSelected      = document.getElementById('cc-selected');
  var ccBonusRow      = document.getElementById('cc-bonus-row');
  var ccBonus         = document.getElementById('cc-bonus');
  var ccTotal         = document.getElementById('cc-total');
  var overrideWrap    = document.getElementById('override-wrap');
  var authChk         = document.getElementById('auth-checkbox');
  var submitBtn       = document.getElementById('submit-btn');
  var successMsg      = document.getElementById('success-msg');
  var successQuarter  = document.getElementById('success-quarter');
  var reloadLink      = document.getElementById('reload-link');

  // ── Section 2: Cookie init ───────────────────────────────────────────────
  SF.cookieStore.load(SF.params.qOptId);

  // ── Section 3: State ─────────────────────────────────────────────────────
  var nudgeShown   = false;
  var part2Open    = false;
  var slotSelects  = {};
  var validationCeil = 0;

  // ── Section 4: Helpers ───────────────────────────────────────────────────
  var esc        = SF.ui.esc;
  var monthShort = SF.ui.monthShort;
  var monthFull  = SF.ui.monthFull;

  function showNudge() {
    if (!nudgeShown) { nudge.classList.add('visible'); nudgeShown = true; }
  }

  // ── Section 5: Show/hide Part 2 ─────────────────────────────────────────
  showFormBtn.addEventListener('click', function() {
    part2Open = !part2Open;
    part2Body.classList.toggle('visible', part2Open);
    showFormBtn.classList.toggle('open', part2Open);
    showFormBtn.innerHTML = (part2Open ? 'Hide' : 'Show') + ' form <span class="chevron">▼</span>';
  });

  reloadLink.addEventListener('click', function() { window.location.reload(); });

  // ── Section 6: Data fetch + render ──────────────────────────────────────
  SF.ui.setStatus(statusBar, 'loading', '⏳ Your form is loading and will appear soon');

  SF.fetchQOF()
    .then(function(d) {

      if (!d || d.status !== 'ok') {
        SF.ui.setStatus(statusBar, 'err', 'Bad response — status: ' + (d && d.status));
        return;
      }

      var hasStrats = d.strategies && d.strategies.length > 0;

      // (a) Status bar
      SF.ui.setStatus(statusBar, 'ok',
        '✅ Your options are ready ('
        + d.services.length + ' services'
        + (hasStrats ? ', ' + d.strategies.length + ' strategies' : '')
        + ')'
      );

      // (b) Info bar
      var totalQCredits = (d.credits_per_month || 0) * (d.month_range ? d.month_range.length : 0);
      infoBar.innerHTML =
        '<div class="info-bar-line1"><h4>' + esc(d.client_name) + '</h4></div>' +
        '<div class="info-bar-line2">' +
          '<span>' + esc(d.plan_name) + '</span>' +
          '<span class="sep">|</span>' +
          '<span>' + esc(d.q_name) + '</span>' +
          '<span class="sep">|</span>' +
          '<span>🪙 Quarter credits available: ' + totalQCredits + '</span>' +
        '</div>' +
        '<div class="info-bar-line3"><strong>🗓️ Deadline:</strong> ' + esc(SF.ui.formatDeadline(d.deadline_date)) + '</div>';
      infoBar.style.display = '';

      // (c) Intro text
      introText.style.display = '';
      introText.innerHTML =
        '<p><strong>Part 1:</strong> You can learn about the services available to you this quarter.<br>' +
        '<strong>Part 2:</strong> You can formally authorise your choices.</p>' +
        '<p>If you are uncertain what to pick and prioritise, use the services dropdown in Pt.1 below to find out more about them.</p>' +
        (hasStrats
          ? '<p>We have also grouped services into a number of strategies which you can view in the \'Browse strategies\' box below. These selections are suggestions only — you can select the services you require and the corresponding month/s as you see fit.</p>'
          : '');

      // (d) Hidden fields
      document.getElementById('h-q-order-id').value    = d.q_order_id    || '';
      document.getElementById('h-q-opt-id').value      = d.q_opt_id      || '';
      document.getElementById('h-client-id').value     = d.client_id     || '';
      document.getElementById('h-client-name').value   = d.client_name   || '';
      document.getElementById('h-plan-name').value     = d.plan_name     || '';
      document.getElementById('h-quarter').value       = d.q_name        || '';
      document.getElementById('h-deadline-date').value = d.deadline_date || '';

      // (e) Bonus footnote
      if (d.services.some(function(s) { return s.bonus_credits > 0; })) {
        bonusFootnote.style.display = '';
      }

      // (f) Override checkbox
      if (SF.cookieStore.hasPrevious()) overrideWrap.style.display = '';

      // (g) Services browse
      SF.ui.populateServiceSelect(svcSelect, d.services, '-- Select a service to view details --');
      svcSelect.addEventListener('change', function() {
        showNudge();
        if (!this.value) { svcDetail.className = 'detail-panel'; svcDetail.innerHTML = ''; return; }
        var svc = d.services.find(function(s) { return String(s.q_opt_list_id) === String(svcSelect.value); });
        if (!svc) return;
        svcDetail.innerHTML =
          '<h4>' + esc(svc.display_name) + '</h4>' +
          '<p>'  + esc(svc.display_description) + '</p>' +
          '<div class="pills">' +
            '<span class="pill pill-credits">🪙 ' + svc.credit_cost + ' credits</span>' +
            (svc.bonus_credits > 0 ? '<span class="pill pill-bonus">🎁 ' + svc.bonus_credits + ' credits gift (one time bonus*)</span>' : '') +
          '</div>';
        svcDetail.className = 'detail-panel visible';
      });

      // (h) Strategies browse
      if (hasStrats) {
        stratBrowseWrap.style.display = '';
        var blankStrat = document.createElement('option');
        blankStrat.value = ''; blankStrat.textContent = '-- Select a strategy --';
        stratSelect.appendChild(blankStrat);
        d.strategies.forEach(function(st) {
          var o = document.createElement('option');
          o.value = st.q_strat_list_id;
          o.textContent = 'Strategy ' + st.client_ref + ' \u2014 ' + st.name;
          stratSelect.appendChild(o);
        });

        stratSelect.addEventListener('change', function() {
          showNudge();
          if (!this.value) { stratDetail.className = 'detail-panel'; stratDetail.innerHTML = ''; return; }
          var stratIdx = d.strategies.findIndex(function(st) { return String(st.q_strat_list_id) === String(stratSelect.value); });
          var strat = d.strategies[stratIdx];
          if (!strat) return;

          var svcsHtml = (strat.services && strat.services.length > 0)
            ? '<div class="strat-services-title">Pinned services (' + strat.services.length + ')</div>' +
              strat.services.map(function(sv) {
                return '<div class="strat-svc-row">' +
                  '<span class="strat-svc-name">' + esc(sv.display_name) +
                    ' <span class="strat-svc-id">(id: ' + sv.service_id + ')</span></span>' +
                  '<span class="strat-svc-month">Month ' + sv.month_recommended + ' \u2014 ' + monthShort(sv.month_recommended) + '</span>' +
                '</div>';
              }).join('')
            : '<div class="strat-empty">No services pinned to this strategy.</div>';

          stratDetail.innerHTML =
            '<h4>Strategy ' + esc(strat.client_ref) + ' \u2014 ' + esc(strat.name) + '</h4>' +
            '<p>' + esc(strat.description) + '</p>' +
            '<div class="strat-meta">' +
              '<span class="pill ' + SF.ui.stratPillClass(stratIdx) + '">Strategy ' + esc(strat.client_ref) + '</span>' +
              '<span class="pill pill-focus">High priority: ' + esc(strat.focus) + '</span>' +
              '<span class="pill pill-nofocus">Lower priority: ' + esc(strat.not_focus) + '</span>' +
            '</div>' + svcsHtml;
          stratDetail.className = 'detail-panel visible';
        });
      }

      // (i) Strategy prefill select
      if (hasStrats) {
        prefillWrap.style.display = '';
        var cOpt = document.createElement('option');
        cOpt.value = ''; cOpt.textContent = '-- Select a strategy --';
        stratPrefill.appendChild(cOpt);
        d.strategies.forEach(function(st) {
          var o = document.createElement('option');
          o.value = st.q_strat_list_id;
          o.textContent = 'Strategy ' + st.client_ref + ' \u2014 ' + st.name;
          stratPrefill.appendChild(o);
        });
      }

      // (j) Month slots
      var totalFormSpend = (d.credits_per_month || 0) * d.month_range.length;
      var bonusAvail     = d.services.reduce(function(s, sv) { return s + (sv.bonus_credits || 0); }, 0);
      validationCeil     = totalFormSpend + bonusAvail;

      d.month_range.forEach(function(m) {
        var wrapper = document.createElement('div');
        wrapper.className = 'month-slot';
        var lbl = document.createElement('div');
        lbl.className = 'month-slot-label';
        lbl.textContent = 'Month ' + m + ' \u2014 ' + monthFull(m);
        wrapper.appendChild(lbl);
        var sel = document.createElement('select');
        sel.id = 'slot-' + m; sel.dataset.month = m;
        SF.ui.populateServiceSelect(sel, d.services, '-- No service selected --');
        sel.addEventListener('change', updateCreditCounter);
        wrapper.appendChild(sel);
        monthSlotsWrap.appendChild(wrapper);
        slotSelects[m] = sel;
      });

      // (k) Credit counter
      function updateCreditCounter() {
        var selC = 0, bonC = 0;
        d.month_range.forEach(function(m) {
          var sel = slotSelects[m];
          if (!sel || !sel.value) return;
          var svc = d.services.find(function(s) { return String(s.q_opt_list_id) === String(sel.value); });
          if (!svc) return;
          selC += (svc.credit_cost || 0);
          bonC += (svc.bonus_credits || 0);
        });
        var net = selC - bonC;
        ccSelected.textContent = selC;
        if (bonC > 0) { ccBonusRow.style.display = ''; ccBonus.textContent = '\u2212' + bonC; }
        else { ccBonusRow.style.display = 'none'; }
        ccTotal.textContent = net;
        ccTotal.classList.toggle('over', net > validationCeil);
      }
      updateCreditCounter();

      // (l) Strategy prefill → slot population
      if (hasStrats) {
        stratPrefill.addEventListener('change', function() {
          d.month_range.forEach(function(m) { slotSelects[m].value = ''; });
          if (!this.value) { document.getElementById('h-q-strat-ref').value = ''; updateCreditCounter(); return; }
          var strat = d.strategies.find(function(st) { return String(st.q_strat_list_id) === String(stratPrefill.value); });
          if (!strat || !strat.services) { updateCreditCounter(); return; }
          document.getElementById('h-q-strat-ref').value = strat.client_ref;
          strat.services.forEach(function(sv) {
            if (slotSelects[sv.month_recommended]) slotSelects[sv.month_recommended].value = String(sv.q_opt_list_id);
          });
          updateCreditCounter();
        });
      }

      main.style.display = '';

      // ── Section 7: Validation ────────────────────────────────────────────
      function validateForm() {
        var errors = [];
        var firstM = d.month_range[0];
        if (slotSelects[firstM] && !slotSelects[firstM].value) {
          errors.push('Please select a service for Month ' + firstM + ' \u2014 ' + monthFull(firstM) + '.');
        }
        var selC = 0, bonC = 0;
        d.month_range.forEach(function(m) {
          var sel = slotSelects[m]; if (!sel || !sel.value) return;
          var svc = d.services.find(function(s) { return String(s.q_opt_list_id) === String(sel.value); });
          if (!svc) return;
          selC += (svc.credit_cost || 0); bonC += (svc.bonus_credits || 0);
        });
        if ((selC - bonC) > validationCeil) {
          errors.push('Your selected credits (' + (selC - bonC) + ') exceed your available credits (' + validationCeil + '). Please adjust your selections.');
        }
        if (!authChk.checked) errors.push('Please check the authorisation box before submitting.');
        return errors;
      }

      // ── Section 8: Submit ────────────────────────────────────────────────
      submitBtn.addEventListener('click', function() {
        validationBox.className = 'validation-errors';
        validationBox.innerHTML = '';
        var errors = validateForm();
        if (errors.length > 0) {
          validationBox.innerHTML = '<ul>' + errors.map(function(e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
          validationBox.classList.add('visible');
          return;
        }

        var selections = [], totalCreds = 0, totalBonus = 0;
        d.month_range.forEach(function(m) {
          var sel = slotSelects[m]; if (!sel || !sel.value) return;
          var svc = d.services.find(function(s) { return String(s.q_opt_list_id) === String(sel.value); });
          if (!svc) return;
          selections.push({
            month: m,
            month_label: 'Month ' + m + ' \u2014 ' + monthFull(m),
            q_opt_list_id: svc.q_opt_list_id,
            service_id: svc.service_id,
            service_name: svc.display_name,
            credit_cost: svc.credit_cost,
            bonus_credits: svc.bonus_credits || 0
          });
          totalCreds += (svc.credit_cost   || 0);
          totalBonus += (svc.bonus_credits || 0);
        });

        var payload = {
          q_order_id:         d.q_order_id,
          q_opt_id:           d.q_opt_id,
          client_plan_id:     d.client_plan_id,
          client_id:          d.client_id,
          client_name:        d.client_name,
          plan_name:          d.plan_name,
          quarter:            d.q_name,
          deadline_date:      d.deadline_date,
          submitted_at:       new Date().toISOString(),
          total_credits:      totalCreds,
          total_credit_spend: totalCreds - totalBonus,
          q_strat_ref:        document.getElementById('h-q-strat-ref').value || '',
          selections:         selections
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting\u2026';

        fetch(SF.CONFIG.FORMSPARK_URL + SF.CONFIG.FORMSPARK_ID, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function() {
          SF.cookieStore.record(SF.params.qOptId);

          submitBtn.style.display = 'none';
          prefillWrap.style.display = 'none';
          monthSlotsWrap.style.display = 'none';
          document.getElementById('credit-counter').style.display = 'none';
          overrideWrap.style.display = 'none';
          var authWrap = authChk.closest('.checkbox-wrap');
          if (authWrap) authWrap.style.display = 'none';
          validationBox.className = 'validation-errors';
          document.querySelectorAll('#part2-body .form-divider').forEach(function(el) { el.style.display = 'none'; });
          document.querySelectorAll('#part2-body .browse-label').forEach(function(el) { el.style.display = 'none'; });

          successQuarter.textContent = d.q_name;
          successMsg.classList.add('visible');
          part2Status.textContent = '(Submitted \u2705)';
          part2Status.style.color = '#059669';
        })
        .catch(function(err) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit selections \u2192';
          alert('Submission failed: ' + err.message + '. Please try again or message us in the portal.');
        });
      });

    })
    .catch(function(err) {
      SF.ui.setStatus(statusBar, 'err', 'Fetch error: ' + err.message);
    });

})();
