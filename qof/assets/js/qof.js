(function(){
'use strict';

/* ══════════ CONFIG ══════════
   Project URL + publishable key live in assets/js/config.js (public by design: they only allow
   calling the token-authed RPC). The client's access key is NEVER stored here: it arrives in the
   link's query string (?c=<client_id>&k=<access key>).
   DATA_SOURCE is the single seam between data and renderer:
     'supabase' -> public.get_qof_payload (live, token-authed)  - default
     'local'    -> embedded fictional demo fixture              - ?src=local  (&fixture=plain = nothing proposed)
   The renderer only ever sees the CONTRACT object built by toContract(). */
var CFG          = window.QOF_CONFIG || {};
var SUPABASE_URL = CFG.SUPABASE_URL;
var SUPABASE_KEY = CFG.SUPABASE_KEY;
var RPC_NAME     = CFG.RPC_NAME || 'get_qof_payload';
var params       = new URLSearchParams(location.search);
var DATA_SOURCE  = params.get('src') === 'local' ? 'local' : 'supabase';
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var BONUS_LABEL = { SIGNUP:'Sign-up bonus', UPGRADE:'Upgrade bonus', EARLY_ADOPTER:'Early adopter bonus', SERVICE_SPECIFIC:'Service-specific bonus' };

/* ══════════ DEMO FIXTURE (fictional client; shape-only subset of the payload, for ?src=local and tests) ══════════ */
function svc(id,name,desc,credits,gbp,req,dep){ return {service_id:id, name:name, description:desc, credits:credits, price_gbp:gbp, requires_service_id:req||null, dependency_type:dep||null, dependency_renewal_days:null}; }
var FIXTURE = {
  status:'ok', rpc_version:'qof-read-v2', generated_at:'2026-10-17T11:30:00Z',
  client:{client_id:0, client_name:'Example Client Ltd'},
  last_confirmed:{quarter_id:7, q_name:'Q3 2026', label:'Jul–Sep 26'},
  quarter:{quarter_id:8, quarter_number:4, q_name:'Q4 2026', year:2026, period_start:'2026-10-01', period_end:'2026-12-31', deadline_date:'2026-10-07', status:'open', label:'Oct–Dec 26',
    months:[{month:10,key:'2026-10',label:'Oct 26'},{month:11,key:'2026-11',label:'Nov 26'},{month:12,key:'2026-12',label:'Dec 26'}]},
  plan:{client_plan_id:2, plan_id:1, plan_code:'EA150', plan_name:'Early Adopter 150', credits_per_month:150, quarter_cap:450, projected:false},
  plan_options:[
    {plan_id:1, plan_code:'EA150', plan_name:'Early Adopter 150', tier_rank:1, is_current:true, quarter_cap:450, credits_per_month:150, monthly_cost_gbp:150, upgrade_bonus_credits:0, upgrade_bonus_eligible:false},
    {plan_id:2, plan_code:'P1_FOCUS', plan_name:'Focus', tier_rank:2, is_current:false, quarter_cap:600, credits_per_month:200, monthly_cost_gbp:200, upgrade_bonus_credits:0, upgrade_bonus_eligible:true},
    {plan_id:3, plan_code:'P2_MOMENTUM', plan_name:'Momentum', tier_rank:3, is_current:false, quarter_cap:900, credits_per_month:300, monthly_cost_gbp:300, upgrade_bonus_credits:50, upgrade_bonus_eligible:true}],
  credits:{quarter_id:8, allowance_credits:450, bonus_credits:50, refund_credits:0, adjustment_credits:0, reserved_credits:0, spent_credits:0, available_credits:500, allowance_projected:false},
  bonuses:[{type:'EARLY_ADOPTER', credits:50}],
  services:[
    svc(1,'Brand & Strategy Report','A clear brand and strategy report.',150,200),
    svc(4,'GA4 Config / Analysis (Starter)','GA4 set up and analysed.',150,200),
    svc(8,'Google Ads Audit (Starter)','A starter audit of your Google Ads account.',150,200),
    svc(10,'Google Ads Audit (Intermediate)','A deeper review of your Google Ads account.',300,450,8,'ONE_TIME'),
    svc(12,'Google Ads Audit (Deeper Audit A)','Search terms, device and demographic breakdowns, quality score diagnostics.',250,350,10,'ONE_TIME'),
    svc(14,'Conversion Landing Page x1','A conversion-focused landing page.',150,250),
    svc(17,'Lead Magnet Production/Setup x1','A lead magnet with details capture.',300,450),
    svc(21,'App Round Engine logic + verification harness','Create a logic engine for a custom purpose with a verification harness',200,250),
    svc(22,'App Components Build and Integration','Build and integrate app components.',250,300,21,'RECURRING'),
    svc(34,'S2S Implementation (Starter)','Server-to-server sale tracking so completed sales are reported reliably.',150,250),
    svc(36,'Ai GEO Optimisation (Starter) up to 3 pages','Setup monitoring and custom schema to optimise your pages for Ai citing.',150,250),
    svc(37,'Ai GEO Optimisation (Intermediate) 5-9 pages','Monitoring and schema across 5-9 pages.',300,400)],
  prior_completed:[
    {service_id:4,times_completed:1,last_service_month:'2026-01',last_completed_date:null},
    {service_id:10,times_completed:1,last_service_month:'2026-03',last_completed_date:null},
    {service_id:14,times_completed:1,last_service_month:'2026-05',last_completed_date:null}],
  proposals:[
    {proposal_id:101, service_id:17, name:'Buyer guide lead magnet', description:'A branded guide with details capture.', credits:300, price_gbp:450, bonus_credits:100, skip_dependency_check:false},
    {proposal_id:102, service_id:14, name:'Landing page: product', description:'A focused landing page for your main product.', credits:150, price_gbp:250, bonus_credits:0, skip_dependency_check:false},
    {proposal_id:103, service_id:14, name:'Landing page: free guide', description:'A landing page for the free guide offer.', credits:150, price_gbp:250, bonus_credits:0, skip_dependency_check:false},
    {proposal_id:104, service_id:36, name:'Ai GEO Optimisation (Starter)', description:'Monitoring and schema for up to 3 pages.', credits:150, price_gbp:250, bonus_credits:0, skip_dependency_check:false},
    {proposal_id:105, service_id:34, name:'S2S Implementation (Starter)', description:'Server-to-server sale tracking.', credits:150, price_gbp:250, bonus_credits:50, skip_dependency_check:false},
    {proposal_id:106, service_id:12, name:'Google Ads Audit (Deeper Audit A)', description:'Search terms, device and demographic breakdowns.', credits:250, price_gbp:350, bonus_credits:0, skip_dependency_check:false}],
  strategies:[
    {strategy_id:1, ref:'A', name:'Lead capture push', description:'Turn more visitors into enquiries: a lead magnet plus Ai visibility.', focus:'Growing enquiries', not_focus:'Deep ad account analysis', recommended:true,
      items:[{proposal_id:101, month_key:'2026-10'},{proposal_id:104, month_key:null}]},
    {strategy_id:2, ref:'B', name:'Tracking and audits', description:'Make sure sales are tracked reliably, then audit the ads account in depth.', focus:'Data accuracy and ad performance', not_focus:'New content',
      recommended:false, items:[{proposal_id:105, month_key:'2026-10'},{proposal_id:106, month_key:null}]}]
};
function fixtureFor(){
  var f = JSON.parse(JSON.stringify(FIXTURE));
  if (params.get('fixture') === 'plain'){ f.proposals = []; f.strategies = []; }
  return f;
}

/* ══════════ CONNECTORS ══════════ */
function cacheKey(cid){ return 'qof-v5-cache:' + cid; }
function cacheGet(cid){ try{ var r=localStorage.getItem(cacheKey(cid)); return r?JSON.parse(r):null; }catch(e){ return null; } }
function cacheSet(cid,p){ try{ localStorage.setItem(cacheKey(cid), JSON.stringify({saved:new Date().toISOString(), payload:p})); }catch(e){} }

function fetchLive(cid, key){
  return fetch(SUPABASE_URL + '/rest/v1/rpc/' + RPC_NAME, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
    body:JSON.stringify({p_client_id:cid, p_auth_key:key})
  }).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); });
}

function load(){
  if (DATA_SOURCE === 'local') return Promise.resolve({payload:fixtureFor(), origin:'demo'});
  var cid = Number(params.get('c')), key = params.get('k');
  if (!cid || !key) return Promise.reject({kind:'link'});
  return fetchLive(cid, key).then(function(p){
    if (p.status !== 'ok'){
      if (p.code === 'unauthorised') throw {kind:'auth'};
      throw {kind:'state', code:p.code, last:p.last_confirmed, client:p.client};
    }
    cacheSet(cid, p);
    return {payload:p, origin:'live'};
  }).catch(function(e){
    if (e && (e.kind === 'auth' || e.kind === 'state')) throw e;
    var c = cacheGet(cid);
    if (c) return {payload:c.payload, origin:'offline', saved:c.saved};
    throw {kind:'network', err:e};
  });
}

/* ══════════ CONTRACT (the only shape the renderer reads) ══════════ */
var C, SVCID = {};
function toContract(p, meta){
  var q = p.quarter;
  var plans = p.plan_options.map(function(o){ return {
    id:o.plan_id, name:o.plan_name, perMonth:o.credits_per_month, quarterCap:o.quarter_cap,
    costGBP:o.monthly_cost_gbp, current:!!o.is_current, upBonus:o.upgrade_bonus_eligible?o.upgrade_bonus_credits:0 }; });
  var done = {};
  (p.prior_completed||[]).forEach(function(d){ done[d.service_id] = {times:d.times_completed, lastMonth:d.last_service_month}; });
  var cr = p.credits || {};
  var catalogue = p.services.map(function(s){ return {
    id:s.service_id, name:s.name, desc:s.description, credits:s.credits, gbp:s.price_gbp,
    req:s.requires_service_id, depType:s.dependency_type, renewDays:s.dependency_renewal_days }; });
  var proposals = (p.proposals||[]).map(function(x){ return {
    key:'p:'+x.proposal_id, pid:x.proposal_id, serviceId:x.service_id, name:x.name, desc:x.description,
    credits:x.credits, gbp:x.price_gbp, bonus:x.bonus_credits||0, skipDep:!!x.skip_dependency_check }; });
  var usingProposals = proposals.length > 0;
  var options = usingProposals ? proposals : catalogue.map(function(s){ return {
    key:'s:'+s.id, pid:null, serviceId:s.id, name:s.name, desc:s.desc, credits:s.credits, gbp:s.gbp, bonus:0, skipDep:false }; });
  var byKey = {}, byPid = {};
  options.forEach(function(o){ byKey[o.key]=o; if (o.pid!=null) byPid[o.pid]=o; });
  var strategies = !usingProposals ? [] : (p.strategies||[]).map(function(st){ return {
    id:st.strategy_id, ref:st.ref, name:st.name, desc:st.description, focus:st.focus, notFocus:st.not_focus, recommended:!!st.recommended,
    items:(st.items||[]).filter(function(i){ return byPid[i.proposal_id]; }).map(function(i){
      var mi = -1; if (i.month_key) q.months.forEach(function(m,ix){ if (m.key===i.month_key) mi=ix; });
      return {opt:byPid[i.proposal_id], month:mi>=0?mi:null}; }) }; })
    .filter(function(st){ return st.items.length>0; });
  return {
    origin:meta.origin, saved:meta.saved, generatedAt:p.generated_at,
    clientName:p.client.client_name, lastConfirmed:p.last_confirmed,
    quarter:{ label:q.label, qName:q.q_name, year:q.year, periodStart:q.period_start, deadline:q.deadline_date, months:q.months },
    planName:p.plan.plan_name, perMonth:p.plan.credits_per_month, planProjected:!!p.plan.projected,
    plans:plans,
    credits:{ allowance:Number(cr.allowance_credits||0), bonus:Number(cr.bonus_credits||0), refund:Number(cr.refund_credits||0),
              adjustment:Number(cr.adjustment_credits||0), committed:Number(cr.spent_credits||0)+Number(cr.reserved_credits||0),
              available:Number(cr.available_credits||0), projected:!!cr.allowance_projected },
    bonuses:(p.bonuses||[]).map(function(b){ return {type:b.type, credits:Number(b.credits)}; }),
    catalogue:catalogue, options:options, byKey:byKey, usingProposals:usingProposals, strategies:strategies,
    done:done
  };
}

/* ══════════ STATE & HELPERS ══════════ */
var rows = [];            // manual picker rows: [{rid, key|null, month(index)|null}]
var ridCounter = 0;
var stratId = null;       // chosen strategy (hides the manual picker; manual rows are kept in case it is removed)
var planId = null;        // plan being explored

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function fmtGBP(n){ return '£'+Number(n).toLocaleString('en-GB'); }
function plus(n){ return (n>0?'+':'')+n; }
function curPlan(){ return C.plans.filter(function(p){return p.current;})[0] || C.plans[0]; }
function explorePlan(){ return C.plans.filter(function(p){return p.id===planId;})[0] || curPlan(); }
function keyLabel(k){ var y=k.slice(2,4), m=Number(k.slice(5,7)); return MON[m-1]+' '+y; }
function nMonths(){ return C.quarter.months.length; }
function monthShort(i){ return C.quarter.months[i].label.split(' ')[0]; }
function svcName(id){ return SVCID[id] ? SVCID[id].name : ('service '+id); }
function strategy(){ for (var i=0;i<C.strategies.length;i++) if (C.strategies[i].id===stratId) return C.strategies[i]; return null; }

function monthLabel(qi, mi){
  if (qi===0) return C.quarter.months[mi].label;
  var first = C.quarter.months[0].key, y=Number(first.slice(0,4)), m=Number(first.slice(5,7))-1 + qi*nMonths() + mi;
  var d = new Date(Date.UTC(y, m, 1));
  return MON[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2);
}
function quarterRangeLabel(qi){
  if (qi===0) return C.quarter.label;
  return monthLabel(qi,0).split(' ')[0]+'–'+monthLabel(qi,nMonths()-1);
}

/* the current selection, whichever way it was made: [{opt, month|null, ord, rid?}] */
function selection(){
  var st = strategy();
  if (st) return st.items.map(function(i,ix){ return {opt:i.opt, month:i.month, ord:ix}; });
  var out = [];
  rows.forEach(function(r,ix){ if (r.key && C.byKey[r.key]) out.push({opt:C.byKey[r.key], month:r.month, ord:ix, rid:r.rid}); });
  return out;
}

/* ── dependencies (catalogue rules; a proposal can opt out with skip_dependency_check) ── */
function histOk(s){                          // prerequisite already completed (and not expired)?
  var d = C.done[s.req]; if (!d) return false;
  if (s.depType!=='RECURRING' || !s.renewDays) return true;
  var y=Number(d.lastMonth.slice(0,4)), m=Number(d.lastMonth.slice(5,7));
  return Date.UTC(y, m, 0) + s.renewDays*86400000 >= Date.parse(C.quarter.periodStart);
}
function needs(opt){ var s=SVCID[opt.serviceId]; return (s && s.req && !opt.skipDep) ? s : null; }
function prereqState(opt, sel){
  var s=needs(opt); if (!s) return {ok:true, via:'none'};
  if (histOk(s)) return {ok:true, via:'history'};
  for (var i=0;i<sel.length;i++) if (sel[i].opt.serviceId===s.req) return {ok:true, via:'selection'};
  return {ok:false};
}
function monthRange(entry, sel){
  var lo=0, hi=nMonths()-1, s=needs(entry.opt);
  if (s && !histOk(s)) sel.forEach(function(o){ if (o.opt.serviceId===s.req && o.month!=null) lo=Math.max(lo,o.month); });
  sel.forEach(function(o){ var os=needs(o.opt); if (os && os.req===entry.opt.serviceId && !histOk(os) && o.month!=null) hi=Math.min(hi,o.month); });
  return lo<=hi ? [lo,hi] : [0,nMonths()-1];
}
function removeRow(rid){
  var removed=[];
  rows = rows.filter(function(r){ return r.rid!==rid; });
  var changed=true;
  while (changed){
    changed=false;
    var sel=selection();
    for (var i=0;i<rows.length;i++){
      var r=rows[i]; if (!r.key) continue;
      var o=C.byKey[r.key];
      if (o && !prereqState(o, sel).ok){ removed.push(o.name); r.key=null; r.month=null; changed=true; break; }
    }
  }
  if (!rows.length) rows.push({rid:++ridCounter, key:null, month:null});
  return removed;
}

/* ══════════ ATOMIC PACKER ══════════
   Services are funded in the order shown. A service funds wholly within one quarter or moves whole to the next;
   unused credits do not roll over. Quarter 1 capacity = the server's available credits, adjusted for the plan being explored.
   A service-specific bonus raises the capacity of the quarter that service sits in. */
function capBase(plan){
  return C.credits.available + (plan.quarterCap - curPlan().quarterCap) + (plan.current ? 0 : plan.upBonus);
}
function pack(its, plan){
  function newQ(i){ return {idx:i, used:0, bonus:0, items:[], cap:(i===0?capBase(plan):plan.quarterCap)}; }
  var qs=[], q=newQ(0);
  its.forEach(function(it){
    var b=it.opt.bonus||0;
    if ((q.items.length>0 || q.idx===0) && q.used+it.opt.credits > q.cap+q.bonus+b){ qs.push(q); q=newQ(q.idx+1); }
    q.items.push(it); q.used+=it.opt.credits; q.bonus+=b;
  });
  qs.push(q);
  return qs;
}
function keysOf(q){ var o={}; q.items.forEach(function(i){o[i.opt.key]=true;}); return o; }

/* ══════════ RENDER ══════════ */
function renderInfo(){
  var ib=$('info-bar'); ib.style.display='';
  var dl='';
  var dd=Date.parse(C.quarter.deadline), today=new Date(); today.setHours(0,0,0,0);
  if (dd && dd>=today.getTime()) dl+='<div class="l3">Selection deadline: '+esc(C.quarter.deadline)+'</div>';
  if (C.lastConfirmed) dl+='<div class="l3">Last confirmed quarter: '+esc(C.lastConfirmed.q_name)+' ('+esc(C.lastConfirmed.label)+')</div>';
  ib.innerHTML='<h4>'+esc(C.clientName)+'</h4><div class="l2"><span>'+esc(C.planName)+(C.planProjected?' (scheduled)':'')+'</span><span class="sep">·</span><span>'+C.perMonth+' credits/month</span><span class="sep">·</span><span>'+esc(C.quarter.qName)+' ('+esc(C.quarter.label)+')</span></div>'+dl;

  var sb=$('status-bar');
  if (C.origin==='live'){ sb.className='status live'; sb.textContent='● Live data · '+new Date(C.generatedAt).toLocaleString('en-GB'); }
  else if (C.origin==='offline'){ sb.className='status offline'; sb.textContent='Offline copy — last loaded '+new Date(C.saved).toLocaleString('en-GB')+'. Reconnect to refresh prices and credits.'; }
  else { sb.className='status demo'; sb.textContent='Demo data (fictional client) — not a live account.'; }
  $('proto-note').style.display='';
  $('p1-sub').textContent = (C.strategies.length ? 'Pick one of our strategies, or choose services one at a time. ' : (C.usingProposals ? 'These are the services we’ve proposed for this quarter. ' : 'Choose from all of our available services. '))
    + 'Some services need an earlier one first — we’ll show you when that’s the case. Choosing a month is optional.';
}

/* ── strategies ── */
function renderStrat(){
  var box=$('strat-box');
  if (!C.strategies.length){ box.style.display='none'; return; }
  box.style.display='';
  var opts='<option value="">— No strategy: I’ll choose services myself —</option>'+C.strategies.map(function(s){
    return '<option value="'+s.id+'"'+(s.id===stratId?' selected':'')+'>'+esc(s.ref)+' · '+esc(s.name)+(s.recommended?' ⭐ Recommended':'')+'</option>'; }).join('');
  $('strat-select').innerHTML=opts;
  $('strat-remove').hidden = !stratId;
  var st=strategy(), d=$('strat-detail');
  if (!st){ d.innerHTML=''; return; }
  var sel=selection(), credits=0, bonus=0;
  var list=st.items.map(function(i){
    credits+=i.opt.credits; bonus+=i.opt.bonus;
    var ps=prereqState(i.opt, sel), warn=ps.ok?'':'<div class="svc-hint warn">Needs <strong>'+esc(svcName(needs(i.opt).req))+'</strong> first.</div>';
    return '<div class="strat-item"><div class="si-main"><span class="svc-name">'+esc(i.opt.name)+'</span>'+
      '<span class="svc-desc">'+esc(i.opt.desc||'')+'</span>'+warn+'</div>'+
      '<div class="si-side"><span class="cc">'+i.opt.credits+' cr</span>'+
      '<span class="si-month">'+(i.month!=null?'Start: '+esc(monthShort(i.month)):'Any month')+'</span>'+
      (i.opt.bonus?'<span class="tag tag-now">🎁 +'+i.opt.bonus+' bonus</span>':'')+'</div></div>';
  }).join('');
  d.innerHTML='<div class="strat-card"><div class="strat-head"><span class="strat-ref">'+esc(st.ref)+'</span><span class="strat-name">'+esc(st.name)+'</span>'+(st.recommended?'<span class="tag tag-now">⭐ Recommended</span>':'')+'</div>'+
    (st.desc?'<p class="strat-desc">'+esc(st.desc)+'</p>':'')+
    (st.focus?'<div class="svc-hint"><strong>Best for:</strong> '+esc(st.focus)+'</div>':'')+
    (st.notFocus?'<div class="svc-hint"><strong>Not ideal for:</strong> '+esc(st.notFocus)+'</div>':'')+
    '<div class="strat-items">'+list+'</div>'+
    '<div class="strat-total"><span>Strategy total</span><span class="cc">'+credits+' cr'+(bonus?' · includes 🎁 +'+bonus+' bonus credits':'')+'</span></div></div>';
}

/* ── manual picker rows ── */
function rowHtml(r, sel){
  var chosenElsewhere={};
  rows.forEach(function(o){ if (o.rid!==r.rid && o.key) chosenElsewhere[o.key]=true; });
  var cur = r.key ? C.byKey[r.key] : null;
  var opts='<option value="">— Choose a service —</option>'+C.options.map(function(o){
    var elsewhere=!!chosenElsewhere[o.key], ps=prereqState(o, sel), locked=!ps.ok && o.key!==r.key;
    var label=o.name+' — '+o.credits+' cr'+(o.bonus?' (🎁 +'+o.bonus+' bonus)':'')+(elsewhere?' (already added)':'')+(locked?' (needs '+svcName(needs(o).req)+' first)':'');
    return '<option value="'+esc(o.key)+'"'+(o.key===r.key?' selected':'')+((elsewhere||locked)?' disabled':'')+'>'+esc(label)+'</option>';
  }).join('');
  var mopts='<option value="">Any month</option>', rng=cur?monthRange({opt:cur}, sel):[0,nMonths()-1];
  C.quarter.months.forEach(function(m,i){ mopts+='<option value="'+i+'"'+(r.month===i?' selected':'')+((i<rng[0]||i>rng[1])?' disabled':'')+'>'+esc(m.label.split(' ')[0])+'</option>'; });
  var info='';
  if (cur){
    var ps=prereqState(cur, sel), d=C.done[cur.serviceId];
    info+='<div class="svc-desc">'+esc(cur.desc||'')+'</div>';
    if (ps.via==='selection') info+='<div class="svc-hint">Follows <strong>'+esc(svcName(needs(cur).req))+'</strong>.</div>';
    if (ps.via==='history') info+='<div class="svc-hint ok">Prerequisite ('+esc(svcName(needs(cur).req))+') already completed.</div>';
    if (cur.bonus) info+='<div class="svc-hint ok">🎁 Ordering this adds <strong>+'+cur.bonus+' bonus credits</strong> to this quarter.</div>';
    if (d) info+='<div class="svc-hint">You’ve had this before (last '+esc(keyLabel(d.lastMonth))+(d.times>1?', ×'+d.times:'')+').</div>';
  }
  var showRemove = !!r.key || rows.length>1;
  return '<div class="svc-pick'+(cur?' on':'')+'" data-rid="'+r.rid+'"><div class="pick-grid">'+
    '<label class="pick-field"><span class="pick-label">Select service</span><select class="pick-select svc-select" data-rid="'+r.rid+'">'+opts+'</select></label>'+
    '<label class="pick-field pick-month"><span class="pick-label">Select month <span class="opt">(optional)</span></span><select class="pick-select month-pick" data-rid="'+r.rid+'"'+(cur?'':' disabled')+'>'+mopts+'</select></label>'+
    (showRemove?'<button type="button" class="link-btn remove-svc" data-rid="'+r.rid+'">❌ Remove service</button>':'')+
    '</div>'+(info?'<div class="pick-info">'+info+'</div>':'')+'</div>';
}
function renderRows(){
  $('svc-box').style.display = stratId ? 'none' : '';
  if (stratId) return;
  var sel=selection();
  $('svc-rows').innerHTML = rows.map(function(r){ return rowHtml(r, sel); }).join('');
}

/* ── part 2: credits + plan view ── */
function renderPart2(){
  var sel=selection(), has=sel.length>0;
  $('part2-empty').style.display = has?'none':'';
  $('part2-body').style.display = has?'':'none';
  if (!has) return;

  var plan=explorePlan(), cur=curPlan(), packed=pack(sel, plan), q1=packed[0];
  var allowance = C.credits.allowance + (plan.quarterCap - cur.quarterCap);
  var cc='<div class="credit-row"><span>This quarter’s plan credits'+(plan.current?'':' on '+esc(plan.name))+(C.credits.projected?' (scheduled)':'')+'</span><span class="v">'+allowance+' cr</span></div>';
  var listed=0;
  C.bonuses.forEach(function(b){ listed+=b.credits; cc+='<div class="credit-row green"><span> ↳ '+esc(BONUS_LABEL[b.type]||'Bonus credits')+'</span><span class="v">'+plus(b.credits)+'</span></div>'; });
  if (C.credits.bonus-listed!==0) cc+='<div class="credit-row green"><span> ↳ Other bonus credits</span><span class="v">'+plus(C.credits.bonus-listed)+'</span></div>';
  var adj=C.credits.refund+C.credits.adjustment;
  if (adj) cc+='<div class="credit-row muted"><span> ↳ Refunds &amp; adjustments</span><span class="v">'+plus(adj)+'</span></div>';
  if (C.credits.committed>0) cc+='<div class="credit-row muted"><span> ↳ Already booked this quarter</span><span class="v">−'+C.credits.committed+'</span></div>';
  if (!plan.current && plan.upBonus>0) cc+='<div class="credit-row green"><span> ↳ One-time upgrade bonus</span><span class="v">+'+plan.upBonus+'</span></div>';
  if (q1.bonus>0) cc+='<div class="credit-row green"><span> ↳ Service-specific bonus (your choices)</span><span class="v">+'+q1.bonus+'</span></div>';
  var total=q1.cap+q1.bonus;
  cc+='<div class="credit-row"><span>Selected for this quarter</span><span class="v">'+q1.used+' cr</span></div>'+
      '<div class="credit-row total"><span>Credits left this quarter</span><span class="v">'+(total-q1.used)+' cr</span></div>';
  $('credit-counter').innerHTML=cc;

  renderPlanView(packed, plan);
}

function renderPlanView(packed, plan){
  $('plan-tabs').innerHTML = C.plans.map(function(p){
    return '<button type="button" class="plan-tab'+(p.id===plan.id?' active':'')+'" data-plan="'+p.id+'">'+esc(p.name)+
      '<small>'+p.perMonth+' cr/mo'+(p.current?' · your plan':' · '+fmtGBP(p.costGBP)+'/mo')+'</small></button>';
  }).join('');
  var cap=$('def-caption');
  if (plan.current){ cap.className='def-caption'; cap.textContent='THIS QUARTER — on your '+plan.name+' plan'; }
  else { cap.className='def-caption upg'; cap.innerHTML='THIS QUARTER — only if you upgrade to '+esc(plan.name)+' (not yet agreed)<a data-plan="'+curPlan().id+'">Back to my plan</a>'; }

  var out=$('q-lists'); out.innerHTML='';
  var last=packed.length-1;
  packed.forEach(function(q, qi){
    var total=q.cap+q.bonus;
    var held=(qi<last && total-q.used>0) ? ' · '+(total-q.used)+' held for flex & priority support' : '';
    var items=q.items.map(function(it){
      return '<div class="q-item"><span class="qi-name">'+esc(it.opt.name)+'</span>'+
        '<span class="qi-side">'+(qi===0 && it.month!=null?'<span class="si-month">'+esc(monthShort(it.month))+'</span>':'')+
        (it.opt.bonus?'<span class="tag tag-now">🎁 +'+it.opt.bonus+'</span>':'')+'<span class="cc">'+it.opt.credits+' cr</span></span></div>'; }).join('')
      || '<div class="q-item none">Nothing fits this quarter on this plan yet.</div>';
    var wr=document.createElement('div'); wr.className='quarter'+(qi>0?' later':'');
    wr.innerHTML='<div class="q-head"><span class="q-label">'+(qi===0?'This quarter':'Possible quarter '+(qi+1))+' · '+esc(quarterRangeLabel(qi))+
      (qi===0?'<span class="q-tag auth">Included</span>':'<span class="q-tag ind">Possible</span>')+'</span>'+
      '<span class="q-meta">'+q.used+' / '+total+' cr'+held+'</span></div><div class="q-items">'+items+'</div>';
    out.appendChild(wr);
  });

  var hn=$('horizon-note');
  if (packed.length>1){
    hn.style.display='';
    hn.innerHTML='<strong>Only this quarter is confirmed.</strong> Anything that doesn’t fit moves, whole, to a later quarter. Later quarters show what’s possible — you choose your services afresh each quarter, so nothing later is locked in.';
  } else hn.style.display='none';

  var up=$('cc-upgrade'), re=$('cc-reassure'), base=curPlan(), sel=selection();
  var basePacked=pack(sel, base);
  if (!plan.current){
    var baseKeys=keysOf(basePacked[0]), gained=packed[0].items.filter(function(i){return !baseKeys[i.opt.key];});
    var li='';
    if (gained.length) li+='<li>This quarter you’d also reach: <strong>'+gained.map(function(g){return esc(g.opt.name);}).join(', ')+'</strong></li>';
    else li+='<li>Everything you’ve chosen already fits this quarter on your current plan.</li>';
    if (plan.upBonus>0) li+='<li>Includes a one-time <strong>'+plan.upBonus+' credit</strong> upgrade bonus.</li>';
    if (basePacked.length>packed.length) li+='<li>The rest completes in '+packed.length+' quarter'+(packed.length!==1?'s':'')+' instead of '+basePacked.length+'.</li>';
    up.className='callout upgrade show';
    up.innerHTML='<div class="head">On the '+esc(plan.name)+' plan</div><div class="big">'+fmtGBP(plan.costGBP)+' / month</div><ul>'+li+'</ul>';
  } else up.className='callout upgrade';
  if (plan.current && packed.length>1){
    re.className='callout reassure show';
    re.innerHTML='<div class="head">Staying on your current plan is completely fine</div>The work simply spreads across '+packed.length+' quarters, one confirmed quarter at a time. Upgrading is optional — it buys speed, never access.';
  } else re.className='callout reassure';
}

function renderAll(){ renderStrat(); renderRows(); renderPart2(); }

/* ══════════ SUMMARY (read-only for now — nothing is saved) ══════════ */
function buildSummary(){
  var plan=explorePlan(), sel=selection(), packed=pack(sel, plan), q=packed[0], total=q.cap+q.bonus, st=strategy();
  function line(it){ return ' • '+it.opt.name+' — '+it.opt.credits+' cr'+(it.month!=null?' — preferred start: '+monthShort(it.month):''); }
  var lines=[];
  lines.push(C.clientName+' — '+C.quarter.qName+' ('+C.quarter.label+')');
  lines.push('Scenario: '+(plan.current?'current plan — '+plan.name:'IF UPGRADED to '+plan.name+' (not yet agreed)'));
  if (st) lines.push('Strategy: '+st.ref+' · '+st.name);
  lines.push('');
  lines.push('THIS QUARTER ('+q.used+' of '+total+' credits'+(q.bonus?', incl. '+q.bonus+' service bonus':'')+'):');
  q.items.forEach(function(i){ lines.push(line(i)); });
  if (!q.items.length) lines.push(' (nothing selected for this quarter)');
  if (packed.length>1){
    lines.push(''); lines.push('POSSIBLE LATER (not committed):');
    packed.slice(1).forEach(function(pq,i){ pq.items.forEach(function(it){ lines.push(' • '+it.opt.name+' — '+quarterRangeLabel(i+1)+' — '+it.opt.credits+' cr'); }); });
  }
  var payload={ client:C.clientName, quarter:C.quarter.qName, plan:plan.name, plan_is_current:plan.current,
    strategy:st?{id:st.id, ref:st.ref, name:st.name}:null,
    credits_available:total, credits_selected:q.used,
    this_quarter:q.items.map(function(i){return {proposal_id:i.opt.pid, service_id:i.opt.serviceId, name:i.opt.name, credits:i.opt.credits, preferred_month:i.month!=null?C.quarter.months[i.month].key:null};}),
    possible_later:packed.slice(1).map(function(pq,i){return {quarter_offset:i+1,services:pq.items.map(function(it){return {proposal_id:it.opt.pid, service_id:it.opt.serviceId,name:it.opt.name,credits:it.opt.credits};})};}) };
  return {text:lines.join('\n'), payload:payload};
}
function showSummary(){
  var s=buildSummary(), box=$('summary-box');
  box.innerHTML='<pre id="sum-text">'+esc(s.text)+'</pre><button class="btn secondary" id="copy-btn" type="button">Copy summary</button>'+
    '<div class="svc-hint" style="margin-top:6px">Not saved anywhere — copy it into your notes.</div>'+
    '<details><summary>Structured data (JSON)</summary><pre>'+esc(JSON.stringify(s.payload,null,2))+'</pre></details>';
  box.className='summary-box show';
  $('copy-btn').addEventListener('click', function(){
    var btn=this;
    function ok(){ btn.textContent='Copied ✓'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s.text).then(ok, function(){});
    else { var ta=document.createElement('textarea'); ta.value=s.text; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy'); ok();}catch(e){} document.body.removeChild(ta); }
  });
}

/* ══════════ EVENTS ══════════ */
var toastTimer;
function toast(msg){ var t=$('toast'); t.textContent=msg; t.className='toast show'; clearTimeout(toastTimer); toastTimer=setTimeout(function(){ t.className='toast'; }, 6000); }
function rowOf(rid){ for (var i=0;i<rows.length;i++) if (rows[i].rid===rid) return rows[i]; return null; }

function wire(){
  $('svc-rows').addEventListener('change', function(e){
    var el=e.target, r=rowOf(Number(el.getAttribute('data-rid'))); if (!r) return;
    if (el.classList.contains('svc-select')){ r.key=el.value||null; r.month=null; }
    else if (el.classList.contains('month-pick')){ r.month=el.value===''?null:Number(el.value); }
    renderAll();
  });
  $('svc-rows').addEventListener('click', function(e){
    var b=e.target.closest ? e.target.closest('.remove-svc') : null; if (!b) return;
    var removed=removeRow(Number(b.getAttribute('data-rid')));
    if (removed.length) toast('Also removed (they depend on it): '+removed.join(', '));
    renderAll();
  });
  $('add-svc').addEventListener('click', function(){
    var empty=rows.filter(function(r){return !r.key;})[0];
    if (!empty){ rows.push({rid:++ridCounter, key:null, month:null}); renderAll(); empty=rows[rows.length-1]; }
    var s=document.querySelector('.svc-select[data-rid="'+empty.rid+'"]'); if (s && s.focus) s.focus();
  });
  $('strat-select').addEventListener('change', function(){ stratId=this.value?Number(this.value):null; renderAll(); });
  $('strat-remove').addEventListener('click', function(){ stratId=null; renderAll(); });
  function onPlan(e){
    var t=e.target.closest ? e.target.closest('[data-plan]') : null; if (!t) return;
    planId=Number(t.getAttribute('data-plan')); renderPart2();
  }
  $('plan-tabs').addEventListener('click', onPlan);
  $('def-caption').addEventListener('click', onPlan);
  $('summary-btn').addEventListener('click', showSummary);
}

function fail(msg, cls){ var sb=$('status-bar'); sb.className='status '+(cls||'err'); sb.innerHTML=msg; }

document.addEventListener('DOMContentLoaded', function(){
  load().then(function(res){
    C = toContract(res.payload, res);
    C.catalogue.forEach(function(s){ SVCID[s.id]=s; });
    planId = curPlan().id;
    rows = [{rid:++ridCounter, key:null, month:null}];
    renderInfo(); wire(); renderAll();
    $('main').style.display='';
  }).catch(function(e){
    if (e && e.kind==='link') fail('This page needs your personal link. Please open it from the link we sent you.');
    else if (e && e.kind==='auth') fail('This link isn’t valid or has expired. Please contact us for a fresh one.');
    else if (e && e.kind==='state' && e.code==='no_unconfirmed_quarter')
      fail('<strong>Your services are all confirmed'+(e.last?' up to '+esc(e.last.q_name)+' ('+esc(e.last.label)+')':'')+'.</strong> Your next quarter’s options aren’t ready yet — we’ll be in touch.', 'live');
    else if (e && e.kind==='state') fail('We couldn’t find a current plan for your account. Please contact us.');
    else fail('We couldn’t load your live data and there’s no saved copy on this device. Check your connection and refresh.');
  });
});

/* test hook (harmless in production) */
window.__QOF = { pack:pack, selection:selection, state:function(){return {rows:rows, stratId:stratId, C:C};}, setPlan:function(id){planId=id;} };

})();
