/* ============================================================================
   TKPay — shared "Pay Now" engine (reader + typed-card) for the portal.
   Used by the staff app's Payments tile "New Charge". The invoice flow in
   bittings.html has its own inline copy (intentionally not refactored, so this
   never affects the working invoice path).

   window.TKPay.openForReceipt(receipt, { title, onDone })
     - receipt MUST have an id and totals.total. It is upserted to Supabase first
       so the edge function reads the authoritative total server-side — the
       client never sends an amount to the charge.
     - 2% surcharge is CREDIT-ONLY, enforced server-side at capture.
   Requires (already loaded by the page): @supabase/supabase-js, js.stripe.com/v3,
   app/cloud-config.js (window.TKS_CLOUD), app/store.js.
   ============================================================================ */
(function(){
  const CFG = window.TKS_CLOUD || {};
  const FN  = (CFG.url || "") + "/functions/v1";
  let sb=null, stripe=null, elements=null, S={}, modal=null, polls=0, onDoneCb=null;

  function client(){ if(!sb && window.supabase && CFG.url) sb=supabase.createClient(CFG.url, CFG.anonKey); return sb; }
  async function token(){ const c=client(); if(!c) return null; try{ const {data}=await c.auth.getSession(); return data&&data.session?data.session.access_token:null; }catch(e){ return null; } }
  async function call(fn, body){
    const tok=await token();
    const r=await fetch(FN+"/"+fn,{method:"POST",headers:{"content-type":"application/json","apikey":CFG.anonKey,"authorization":"Bearer "+(tok||CFG.anonKey)},body:JSON.stringify(body||{})});
    let j; try{ j=await r.json(); }catch(e){ j={error:"bad response"}; }
    if(!r.ok && !j.error) j.error="HTTP "+r.status; return j;
  }
  function m(c){ return "$"+(Number(c||0)/100).toFixed(2); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }
  function nodeEl(html){ const d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstElementChild; }
  function close(){ if(modal){ modal.remove(); modal=null; } S={}; stripe=null; elements=null; }
  function status(msg,kind){ const s=modal&&modal.querySelector("#pnStatus"); if(s){ s.innerHTML=msg||""; s.style.color=kind==="bad"?"#f0a0a6":kind==="ok"?"#7fd49b":"#9aa3af"; } }

  window.TKPay = window.TKPay || {};
  window.TKPay.openForReceipt = async function(receipt, opts){
    opts = opts || {};
    if(!receipt || !receipt.id){ alert("Missing invoice/charge id."); return; }
    const c=client(); const tok=await token();
    if(!c || !tok){ alert("Sign in (Staff Login) to take a payment."); return; }
    try{ await c.from("receipts").upsert({ id:receipt.id, data:receipt }); }
    catch(e){ alert("Couldn't sync the charge to the cloud: "+(e.message||e)); return; }
    const t=receipt.totals||{}; const baseCents=Math.round((Number(t.total||0)-Number(t.surcharge||0))*100);
    onDoneCb = opts.onDone || null;
    S={ receipt, baseCents, method:"reader", attempt:1, reader:localStorage.getItem("tks_pay_reader")||"", title: opts.title || ("Invoice "+(receipt.number||receipt.id)) };
    render();
  };

  // Cash / Check: record a completed transaction (no card, no surcharge — it's
  // card-only). Upserts the receipt first so the total is authoritative server-side.
  window.TKPay.recordCashCheck = async function(receipt, method, opts){
    opts = opts || {};
    if(!receipt || !receipt.id){ if(opts.onError) opts.onError("missing id"); return; }
    const c=client(); const tok=await token();
    if(!c || !tok){ alert("Sign in (Staff Login) to record a payment."); return; }
    try{ await c.from("receipts").upsert({ id:receipt.id, data:receipt }); }catch(e){ if(opts.onError) opts.onError(e.message||e); return; }
    const j=await call("pay-record",{ invoiceId:receipt.id, method });
    if(j.error){ if(opts.onError) opts.onError(j.error); return; }
    if(opts.onDone) opts.onDone(j);
  };

  // Refund a CARD transaction (Stripe) by its PaymentIntent id → pay-refund.
  window.TKPay.refundCard = async function(paymentIntentId){
    if(!paymentIntentId) return { error:"missing paymentIntentId" };
    return await call("pay-refund", { paymentIntentId });
  };
  // Void a CASH/CHECK transaction by its row id → pay-void (no Stripe).
  window.TKPay.voidCashCheck = async function(transactionId){
    if(!transactionId) return { error:"missing transactionId" };
    return await call("pay-void", { transactionId });
  };

  // Day closeout: transactions in [fromISO, toISO). Reads as the signed-in staff.
  window.TKPay.dayTransactions = async function(fromISO, toISO){
    const c=client(); if(!c) return { error:"not connected" };
    const q=await c.from("payment_transactions").select("*").gte("created_at", fromISO).lt("created_at", toISO).order("created_at", { ascending:false });
    return q.error ? { error:q.error.message } : { rows:q.data||[] };
  };

  function render(){
    if(modal) modal.remove();
    const sur=Math.round(S.baseCents*0.02);
    modal=nodeEl(`<div style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:flex-end;justify-content:center">
      <div style="background:#1b1f27;color:#f4f5f7;width:100%;max-width:440px;border-radius:18px 18px 0 0;padding:18px;max-height:92vh;overflow:auto;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:18px">Pay Now</b><button type="button" id="pnX" style="background:none;border:none;color:#9aa3af;font-size:26px;cursor:pointer;line-height:1;width:44px;height:44px;display:flex;align-items:center;justify-content:center;margin:-6px -6px -6px 0">&times;</button></div>
        <div style="font-size:13px;color:#9aa3af;margin-bottom:10px">${esc(S.title)}</div>
        <div style="background:#11141a;border:1px solid #2a2f3a;border-radius:12px;padding:12px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between"><span>Amount</span><b>${m(S.baseCents)}</b></div>
          <div style="font-size:12px;color:#f2b43a;margin-top:6px">A 2% surcharge (${m(sur)}) applies to <b>credit</b> cards only — debit &amp; prepaid are never surcharged.</div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px"><button type="button" class="pnM" data-m="reader">🏪 Reader</button><button type="button" class="pnM" data-m="keyed">⌨️ Type card</button></div>
        <div id="pnBody"></div><div id="pnStatus" style="font-size:13px;margin-top:10px;min-height:18px"></div>
      </div></div>`);
    document.body.appendChild(modal);
    modal.querySelector("#pnX").onclick=close;
    modal.addEventListener("click",e=>{ if(e.target===modal) close(); });
    modal.querySelectorAll(".pnM").forEach(b=>{ const on=b.dataset.m===S.method;
      b.style.cssText="flex:1;padding:11px;border-radius:11px;border:1.5px solid "+(on?"#f2b43a":"#2a2f3a")+";background:"+(on?"rgba(242,180,58,.14)":"transparent")+";color:#f4f5f7;font-weight:700;cursor:pointer";
      b.onclick=()=>{ S.method=b.dataset.m; render(); }; });
    (S.method==="reader"?renderReader:renderKeyed)();
  }
  function payBtn(label,id){ return `<button type="button" id="${id}" style="width:100%;padding:13px;border-radius:11px;border:none;background:linear-gradient(180deg,#c8323c,#8f1f27);color:#fff;font-weight:800;cursor:pointer">${label}</button>`; }

  function renderReader(){
    modal.querySelector("#pnBody").innerHTML=`<label style="font-size:12px;color:#9aa3af">Reader</label>
      <div style="display:flex;gap:8px;margin:4px 0 10px"><select id="pnReader" style="flex:1;background:#11141a;border:1px solid #2a2f3a;border-radius:10px;color:#f4f5f7;padding:10px"><option>Loading…</option></select><button type="button" id="pnReload" style="background:#2a2f3a;border:none;color:#9aa3af;border-radius:10px;padding:0 12px;cursor:pointer">&#8635;</button></div>
      ${payBtn("Send "+m(S.baseCents)+" to reader","pnGo")}<div id="pnSim" style="margin-top:10px"></div>`;
    modal.querySelector("#pnReload").onclick=loadReaders; modal.querySelector("#pnGo").onclick=startReader; loadReaders();
  }
  async function loadReaders(){
    const sel=modal&&modal.querySelector("#pnReader"); if(!sel) return;
    const j=await call("pay-terminal",{action:"list"});
    if(j.error){ sel.innerHTML="<option value=''>(error)</option>"; status(j.error,"bad"); return; }
    sel.innerHTML=(j.readers||[]).map(r=>`<option value="${esc(r.id)}">${esc(r.label||r.id)} &middot; ${esc(r.status)}</option>`).join("")||"<option value=''>(no readers — register one in Stripe)</option>";
    if(!S.reader && j.readers&&j.readers[0]) S.reader=j.readers[0].id;
    sel.value=S.reader||""; sel.onchange=()=>{ S.reader=sel.value; localStorage.setItem("tks_pay_reader",S.reader); };
    if(j.mode==="test"){ modal.querySelector("#pnSim").innerHTML=`<div style="font-size:11px;color:#9aa3af;margin-bottom:4px">TEST — simulate a tap:</div><div style="display:flex;gap:6px"><button type="button" class="pnSimB" data-k="credit">Credit</button><button type="button" class="pnSimB" data-k="debit">Debit</button><button type="button" class="pnSimB" data-k="decline">Decline</button></div>`;
      modal.querySelectorAll(".pnSimB").forEach(b=>{ b.style.cssText="flex:1;padding:8px;border-radius:9px;border:1px solid #2a2f3a;background:transparent;color:#9aa3af;cursor:pointer"; b.onclick=()=>simulate(b.dataset.k); }); }
  }
  async function startReader(){
    if(!S.reader){ status("Pick a reader first.","bad"); return; }
    localStorage.setItem("tks_pay_reader",S.reader); status("Sending to reader…");
    const j=await call("pay-create-intent",{invoiceId:S.receipt.id,method:"reader",readerId:S.reader,attempt:S.attempt});
    if(j.error){ status(j.error,"bad"); return; }
    S.pi=j.paymentIntentId; status("Waiting for the customer to tap or insert…"); poll();
  }
  async function simulate(kind){
    if(!S.pi){ status("Send to reader first.","bad"); return; }
    const body={action:"simulate",readerId:S.reader}; if(kind==="debit")body.debit=true; if(kind==="decline")body.declined=true;
    const j=await call("pay-terminal",body); if(j.error) status("Simulate: "+j.error,"bad");
  }
  function renderKeyed(){
    const pk=localStorage.getItem("tks_pay_pk")||"";
    const pkRow = pk ? "" : `<label style="font-size:12px;color:#9aa3af">Stripe publishable key (one-time)</label>
      <input id="pnPK" type="text" inputmode="text" autocomplete="off" placeholder="pk_test_…" style="width:100%;background:#11141a;border:1px solid #2a2f3a;border-radius:10px;color:#f4f5f7;padding:11px;font-size:16px;box-sizing:border-box;margin:4px 0 10px">`;
    modal.querySelector("#pnBody").innerHTML=`${pkRow}<div id="pnPE" style="background:#fff;border-radius:10px;padding:10px;margin-bottom:10px;min-height:42px"></div>${payBtn("Start card entry","pnGo")}`;
    modal.querySelector("#pnGo").onclick=startKeyed;
  }
  async function startKeyed(){
    if(!window.Stripe){ status("Stripe.js didn't load.","bad"); return; }
    let pk=localStorage.getItem("tks_pay_pk")||"";
    if(!pk){ const f=modal.querySelector("#pnPK"); pk=((f&&f.value)||"").trim();
      if(pk) localStorage.setItem("tks_pay_pk",pk); else { status("Enter your publishable key (pk_test_…) to continue.","bad"); if(f) f.focus(); return; } }
    status("Preparing secure card field…");
    const j=await call("pay-create-intent",{invoiceId:S.receipt.id,method:"keyed",attempt:S.attempt});
    if(j.error||!j.clientSecret){ status(j.error||"no client secret","bad"); return; }
    S.pi=j.paymentIntentId;
    try{ stripe=Stripe(pk); elements=stripe.elements({clientSecret:j.clientSecret}); elements.create("payment").mount("#pnPE"); }
    catch(e){ status("Card field error: "+(e.message||e),"bad"); return; }
    const go=modal.querySelector("#pnGo"); go.textContent="Pay (credit +2%)"; go.onclick=confirmKeyed; status("Enter the card, then Pay.");
  }
  async function confirmKeyed(){
    status("Processing…");
    const res=await stripe.confirmPayment({elements,redirect:"if_required"});
    if(res.error){ status("Declined: "+res.error.message,"bad"); return; }
    poll();
  }
  async function poll(){
    polls=0;
    const tick=async()=>{ polls++;
      const j=await call("pay-status",{paymentIntentId:S.pi});
      if(j.error){ status(j.error,"bad"); return; }
      if(j.status==="completed"){ status("✓ Approved — "+m(j.captured_cents)+(j.surcharge_applied?" (incl. 2% credit surcharge)":" (no surcharge)"),"ok"); if(onDoneCb){ try{onDoneCb(j);}catch(_){} } return; }
      if(j.status==="failed"){ status("✗ "+(j.failure_reason||"failed")+" — try again.","bad"); S.attempt++; return; }
      if(j.status==="canceled"){ status("Canceled — try again.","bad"); S.attempt++; return; }
      if(polls<40) setTimeout(tick,2000); else status("Still waiting — check the reader.","bad");
    }; tick();
  }
})();
