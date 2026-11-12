/* ============================================================================
   app/receipts-engine.js — DUPLICATED receipt render/PDF engine (jsPDF 2.5.1 +
   buildReceiptCardHTML / makePDF / shareDocument + their dependency closure),
   copied verbatim from bittings.html so the native Receipts viewer can render,
   print, download and share WITHOUT an iframe. 8j: jsPDF itself now lives in
   app/vendor/jspdf.umd.min.js and is loaded once per page (bittings.html too).
   Exposes window.TKS_RECEIPTS = { buildCardHTML, makePDF, share }.
   ========================================================================= */
/* 8j: jsPDF 2.5.1 is loaded ONCE from app/vendor/jspdf.umd.min.js (index.html + bittings.html share it) — the embedded copy that used to live here is gone. */

;(function(){
  "use strict";
  // SETTINGS shim — the copied functions read a global SETTINGS (business identity);
  // pull it from the shared data layer at call time so it reflects current config.
  var SETTINGS = {};
  function _syncSettings(){
    try{ var id=(window.TKS&&TKS.Config&&TKS.Config.identity&&TKS.Config.identity())||{}; SETTINGS=Object.assign({logo:'',name:'',address:'',phone:'',email:'',license:'',footer:'',termsUrl:''}, id); }catch(e){}
  }
const SPANISH = {"RECEIPT": "RECIBO", "INVOICE": "FACTURA", "ESTIMATE": "PRESUPUESTO", "Receipt #": "Recibo #", "Invoice #": "Factura #", "Estimate #": "Presupuesto #", "Date": "Fecha", "Due upon receipt": "Pago al recibir", "Valid for 30 days": "V\u00e1lido por 30 d\u00edas", "BILL TO": "FACTURAR A", "Customer": "Cliente", "Contact": "Contacto", "Phone": "Tel\u00e9fono", "Email": "Correo", "Address": "Direcci\u00f3n", "Vehicle": "Veh\u00edculo", "VIN": "VIN", "DL #": "Licencia #", "Plate": "Placa", "Odometer": "Od\u00f3metro", "AUTOMOTIVE SERVICE": "SERVICIO AUTOMOTRIZ", "RESIDENTIAL SERVICE": "SERVICIO RESIDENCIAL", "COMMERCIAL SERVICE": "SERVICIO COMERCIAL", "DESCRIPTION": "DESCRIPCI\u00d3N", "AMOUNT": "MONTO", "Parts (taxable)": "Partes (con impuesto)", "Labor / Service": "Mano de obra / Servicio", "Subtotal": "Subtotal", "Discount": "Descuento", "Sales Tax": "Impuesto sobre ventas", "Card Surcharge": "Recargo por tarjeta", "Total": "Total", "Payment Method": "M\u00e9todo de pago", "Status": "Estado", "PAID IN FULL": "PAGADO TOTALMENTE", "PARTIAL PAYMENT": "PAGO PARCIAL", "UNPAID": "SIN PAGAR", "Cash": "Efectivo", "Card": "Tarjeta", "Check": "Cheque", "Notes": "Notas", "Signature": "Firma", "Customer Signature": "Firma del Cliente", "Thank you for choosing": "Gracias por elegir", "Insured & Bonded": "Asegurado y Garantizado", "License": "Licencia"};

function configTaxRate(){
  try{ const cfg=(window.TKS&&TKS.Config)?TKS.Config.get():null; if(cfg && cfg.taxRate!=null) return Number(cfg.taxRate)||0; }catch(e){}
  return (SETTINGS && SETTINGS.taxRate) ? Number(SETTINGS.taxRate)||0 : 0;
}

function receiptTaxRate(r){
  return (r && r.taxRate!=null && r.taxRate!=='') ? Number(r.taxRate) : configTaxRate();
}

function warrantyUntilTs(startMs, months){ const d=new Date(startMs||Date.now()); d.setMonth(d.getMonth()+(Number(months)||0)); return d.getTime(); }

// 8z44 (owner, 2026-11-11): a warranty is only offered when HARDWARE was sold — a stocked part (partId / Register part line)
// or a Materials / Parts line. Service calls, programming and labor alone carry none.
function receiptHasHardware(its){
  return (its||[]).some(function(it){ if(!it || it.isDiscount || it.declined) return false;
    return !!it.partId || it.lineType==="part" || (it.category||"")==="Materials"; });
}
// Register sales are written by the server without warranty fields. Give one with hardware the shop's standard warranty,
// counted from the day it was paid, so it shows and prints like any other receipt.
function warrantyView(r){
  if(!r) return r;
  if(r.warranty==null && r.source==="pos" && r.docType!=="estimate" && receiptHasHardware(r.items)){
    let m=0; try{ const w=(window.TKS&&TKS.Config&&TKS.Config.warranty)?TKS.Config.warranty():null; m=w?(Number(w.months)||0):0; }catch(e){}
    const start=Number(r.paidAt)||Number(r.savedAt)||0;
    if(m>0 && start) return Object.assign({}, r, { warranty:true, warrantyMonths:m, warrantyStart:start });
  }
  return r;
}
function warrantyInfo(r){
  r=warrantyView(r);
  if(!r || !r.warranty || !Number(r.warrantyMonths)) return null;
  const start=r.warrantyStart||r.savedAt; if(!start) return null;
  const until=r.warrantyUntil||warrantyUntilTs(start, r.warrantyMonths);
  const days=Math.ceil((until-Date.now())/86400000);
  return {until, days, expired:days<0, months:Number(r.warrantyMonths)};
}

function warrantyTermText(r){
  r=warrantyView(r);
  if(!r || !r.warranty || !Number(r.warrantyMonths) || r.docType==="estimate") return "";
  const m=Number(r.warrantyMonths);
  return m+" month"+(m===1?"":"s")+" limited warranty";
}

function configTermsUrl(){
  try{ const id=(window.TKS&&TKS.Config)?TKS.Config.identity():null; if(id&&id.termsUrl!=null && String(id.termsUrl).trim()) return String(id.termsUrl).trim(); }catch(e){}
  return (SETTINGS && SETTINGS.termsUrl) ? String(SETTINGS.termsUrl).trim() : "";
}

function termsHref(u){ return /^https?:\/\//i.test(u) ? u : ("https://"+u); }

function termsDisplay(u){ return u.replace(/^https?:\/\//i,"").replace(/\/+$/,""); }

function warrantyPillHTML(r){
  const w=warrantyInfo(r); if(!w) return "";
  let bg,fg,txt;
  if(w.expired){ bg="rgba(200,50,60,.14)"; fg="#b3242f"; txt="Warranty expired"; }
  else if(w.days<=30){ bg="rgba(234,88,12,.16)"; fg="#c2410c"; txt=w.days+" day"+(w.days===1?"":"s")+" warranty left"; }   // dark orange — about to expire
  else { bg="rgba(34,153,74,.16)"; fg="#1f8f43"; txt=w.days+" days warranty left"; }
  return '<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:700;background:'+bg+';color:'+fg+'">🛡 '+txt+'</span>';
}

function warrantyPillCompactHTML(r){
  const w=warrantyInfo(r); if(!w) return "";
  let bg,fg,txt;
  if(w.expired){ bg="rgba(200,50,60,.14)"; fg="#b3242f"; txt="Expired"; }
  else if(w.days<=30){ bg="rgba(234,88,12,.16)"; fg="#c2410c"; txt=w.days+"d left"; }   // dark orange — about to expire
  else { bg="rgba(34,153,74,.16)"; fg="#1f8f43"; txt=w.days+"d left"; }
  return '<span class="hi-warr" style="background:'+bg+';color:'+fg+'">🛡 '+txt+'</span>';
}

function escapeHtml(s){
  return String(s==null?"":s).replace(/[&<>"']/g, c=>(
    {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function money(n){ return "$"+Number(n).toFixed(2); }

function docLabel(type){
  return type==="invoice" ? "INVOICE" : type==="estimate" ? "ESTIMATE" : "RECEIPT";
}

function tr(text, lang){
  if(lang!=="es") return text;
  return SPANISH[text] || text;
}

function showModal(opts){
  // opts: {title, body, buttons:[{label,kind:'yes'|'no'|'ok',value}]}
  // returns a Promise that resolves to the clicked button's value
  return new Promise(resolve=>{
    const bd=document.getElementById("modalBackdrop");
    document.getElementById("modalTitle").textContent=opts.title||"";
    document.getElementById("modalBody").textContent=opts.body||"";
    const btns=document.getElementById("modalBtns");
    btns.innerHTML="";
    (opts.buttons||[]).forEach(b=>{
      const el=document.createElement("button");
      el.textContent=b.label;
      el.className="mbtn-"+(b.kind||"ok");
      el.onclick=()=>{ bd.classList.remove("open"); resolve(b.value); };
      btns.appendChild(el);
    });
    bd.classList.add("open");
  });
}

function appAlert(title, body){
  return showModal({title:title, body:body||"", buttons:[
    {label:"OK", kind:"ok", value:true}
  ]});
}

function vehicleString(r){
  const parts = [r.vehYear, r.vehMake, r.vehModel].filter(p => p && String(p).trim());
  if(parts.length > 0) return parts.join(" ");
  return r.vehicle || "";
}

function computeTotals(its, payment, taxRatePct){
  const ratePct = (taxRatePct!=null ? Number(taxRatePct) : configTaxRate()) || 0;
  const taxRate=ratePct/100;
  const surchargeRate=(SETTINGS.surcharge||0)/100;
  // Sum up positive line items by taxable bucket
  let taxable=0, nontax=0;
  its.forEach(it=>{
    if(it.isDiscount) return;
    if(it.declined) return;   // 8r: a dispatched line the tech marked "didn't do this" stays on the receipt at $0
    if(it.taxable) taxable+=it.amount; else nontax+=it.amount;
  });
  const grossSubtotal = taxable + nontax;

  // Compute total discount amount from any discount lines
  let discountTotal = 0;
  its.forEach(it=>{
    if(!it.isDiscount) return;
    if(it.discountMode==="percent"){
      discountTotal += grossSubtotal * (it.discountValue/100);
    }else{
      discountTotal += it.discountValue;
    }
  });
  if(discountTotal > grossSubtotal) discountTotal = grossSubtotal; // never below zero
  discountTotal = Math.round(discountTotal*100)/100;

  // Apply discount PROPORTIONALLY across taxable and non-taxable buckets,
  // so tax is only charged on the discounted taxable portion.
  let discTaxable = 0, discNontax = 0;
  if(grossSubtotal > 0 && discountTotal > 0){
    discTaxable = discountTotal * (taxable / grossSubtotal);
    discNontax  = discountTotal * (nontax  / grossSubtotal);
  }
  const taxableAfter = Math.max(0, taxable - discTaxable);
  const nontaxAfter  = Math.max(0, nontax  - discNontax);

  const subtotalAfter = Math.round((taxableAfter + nontaxAfter)*100)/100;
  const tax=Math.round(taxableAfter*taxRate*100)/100;
  const preCard=subtotalAfter+tax;
  const surcharge=(payment==="Card")? Math.round(preCard*surchargeRate*100)/100 : 0;
  const total=Math.round((preCard+surcharge)*100)/100;

  return {
    taxable, nontax,                  // gross (pre-discount) buckets
    grossSubtotal,
    discount: discountTotal,
    taxableAfter: Math.round(taxableAfter*100)/100,
    nontaxAfter: Math.round(nontaxAfter*100)/100,
    subtotal: subtotalAfter,          // subtotal AFTER discount
    tax, surcharge, total,
    taxRate:ratePct, surchargeRate:SETTINGS.surcharge
  };
}

function buildReceiptCardHTML(r, actionsHTML){
  r=docWithVehicles(r);   // 8z84
  const t=r.totals;
  const status=r.status;
  const sColor= status==="Paid in Full"?"var(--green)"
              : status==="Unpaid"?"var(--red)" : "var(--amber)";
  let itemRows="";
  r.items.forEach(it=>{
    if(it.isDiscount){
      const lbl = it.discountMode==="percent" ? "Discount ("+it.discountValue+"%)" : "Discount";
      itemRows+='<div class="rc-irow"><span>'+escapeHtml(lbl)+'</span>'+
        '<span style="color:#22994A">−'+money(t.discount)+'</span></div>';
    }else if(it.declined){
      // 8r: struck through, $0, with the tech's reason
      itemRows+='<div class="rc-irow declined"><span><s>'+escapeHtml(it.desc)+'</s><em class="rc-nd">— not done'+(it.declineReason?(' ('+escapeHtml(it.declineReason)+')'):'')+'</em></span>'+
        '<span><s>'+money(0)+'</s></span></div>';
    }else{
      itemRows+='<div class="rc-irow"><span>'+escapeHtml(it.desc)+(it.declinedQty>0?'<em class="rc-nd">— '+it.declinedQty+' of '+((it.dispatchQty||0)||(it.qty+it.declinedQty))+' not done'+(it.declineReason?(' ('+escapeHtml(it.declineReason)+')'):'')+'</em>':'')+'</span>'+
        '<span>'+money(it.amount)+'</span></div>';
    }
  });
  let sub="";
  const hasDiscount = t.discount>0;
  if(t.tax>0 || t.surcharge>0 || hasDiscount || r.taxExempt){
    // Show gross subtotal + discount when a discount exists
    if(hasDiscount){
      sub+='<div class="rc-subrow"><span>Subtotal</span><span>'+money(t.grossSubtotal)+'</span></div>';
      sub+='<div class="rc-subrow"><span>Discount</span><span style="color:#22994A">−'+money(t.discount)+'</span></div>';
    }
    if(t.tax>0){
      sub+='<div class="rc-subrow"><span>Taxable portion</span><span>'+money(t.taxableAfter)+'</span></div>';
      if(t.nontaxAfter>0) sub+='<div class="rc-subrow"><span>Non-taxable</span><span>'+money(t.nontaxAfter)+'</span></div>';
      if(!hasDiscount) sub+='<div class="rc-subrow"><span>Subtotal</span><span>'+money(t.subtotal)+'</span></div>';
      sub+='<div class="rc-subrow"><span>Sales Tax ('+t.taxRate+'%)</span><span>'+money(t.tax)+'</span></div>';
    }
    if(r.taxExempt && !(t.tax>0)) sub+='<div class="rc-subrow"><span>Sales Tax</span><span>EXEMPT</span></div>';   // 8z78 / 8z81
    if(t.surcharge>0){
      sub+='<div class="rc-subrow"><span>Card Surcharge ('+t.surchargeRate+'%)</span><span>'+money(t.surcharge)+'</span></div>';
    }
  }
  const docLbl = r.docType==="invoice"?"INVOICE":r.docType==="estimate"?"ESTIMATE":"RECEIPT";
  const subline = r.docType==="invoice"?"Due upon receipt":r.docType==="estimate"?"Valid for 30 days":"";
  const numLabel = r.docType==="invoice"?"Invoice #":r.docType==="estimate"?"Estimate #":"Receipt #";

  let statusLine = "";
  if(r.docType==="receipt"){
    statusLine='<div class="rc-pm">Payment: '+escapeHtml(r.payment||"")+'</div>'+
               '<div class="rc-st" style="color:'+sColor+'">Status: '+escapeHtml((status||"").toUpperCase())+'</div>'+
               // 8j: partial payments show what was paid and what is still owed
               ((status==="Partial Payment" && Number(r.amountPaid)>0) ? '<div class="rc-st" style="color:var(--amber)">Paid: '+money(Number(r.amountPaid))+' · Balance due: '+money(Math.max(0,(t.total||0)-Number(r.amountPaid)))+'</div>' : '');
  }else if(r.docType==="invoice"){
    statusLine='<div class="rc-pm">Expected payment: '+escapeHtml(r.payment||"Not specified")+'</div>'+
               '<div class="rc-st" style="color:var(--amber)">Status: UNPAID — DUE UPON RECEIPT</div>';
  }else{
    statusLine='<div class="rc-st" style="color:#595959">ESTIMATE — Valid 30 days from issue</div>';
  }

  const isContracting = r.nastf && r.nastf.type==="Contracting D1";
  const isAuctionFleet = r.nastf && r.nastf.type==="Auction/Fleet D1";

  let billTo = '<div class="rc-line">'+(isContracting?"Shop":"Customer")+': '+escapeHtml(r.customer||"")+'</div>';
  if(r.contact) billTo+='<div class="rc-line">'+(isContracting?"Manager":"Contact")+': '+escapeHtml(r.contact)+'</div>';
  if(r.phone)   billTo+='<div class="rc-line">Phone: '+escapeHtml(r.phone)+'</div>';
  if(r.email)   billTo+='<div class="rc-line">Email: '+escapeHtml(r.email)+'</div>';
  if(r.address) billTo+='<div class="rc-line">Address: '+escapeHtml(r.address)+'</div>';
  {const _w=whereLine(r); if(_w) billTo+='<div class="rc-line">'+escapeHtml(_w)+'</div>';}   // 8z81
  {const _v=vehicleString(r); if(_v) billTo+='<div class="rc-line">Vehicle: '+escapeHtml(_v)+'</div>';}
  if(r.vin)     billTo+='<div class="rc-line">VIN: '+escapeHtml(r.vin)+'</div>';
  moreVehList(r).forEach(function(l,i){ billTo+='<div class="rc-line">Vehicle '+(i+2)+': '+escapeHtml(l)+'</div>'; });   // 8z84
  {const _d=d1Of(r); if(_d.color) billTo+='<div class="rc-line">Color: '+escapeHtml(_d.color)+'</div>';   // 8z90
   if(_d.plate) billTo+='<div class="rc-line">Plate: '+escapeHtml(_d.plate)+'</div>';
   if(_d.odometer && !r.nastf) billTo+='<div class="rc-line">Miles: '+escapeHtml(_d.odometer)+'</div>'; }
  if(r.odometer!==undefined && r.odometer!=="") billTo+='<div class="rc-line">Odometer: '+escapeHtml(r.odometer)+'</div>';
  if(r.dlNumber)billTo+='<div class="rc-line">DL #: '+escapeHtml(r.dlNumber)+'</div>';

  // Auction/Fleet D1 — service location + authorizing party block (audit-required)
  let nastfBlock = "";
  if(isAuctionFleet){
    nastfBlock += '<div class="rc-sec" style="margin-top:14px;">AUTHORIZING PARTY (NASTF)</div>';
    if(r.jobLocation)     nastfBlock+='<div class="rc-line">Service Location: '+escapeHtml(r.jobLocation)+'</div>';
    if(r.requesterName)   nastfBlock+='<div class="rc-line">Authorized by: '+escapeHtml(r.requesterName)+'</div>';
    if(r.requesterCompany)nastfBlock+='<div class="rc-line">Company: '+escapeHtml(r.requesterCompany)+'</div>';
    if(r.requesterPhone)  nastfBlock+='<div class="rc-line">Phone: '+escapeHtml(r.requesterPhone)+'</div>';
    if(r.requesterEmail)  nastfBlock+='<div class="rc-line">Email: '+escapeHtml(r.requesterEmail)+'</div>';
  }
  // Contracting D1 — vehicle owner block (recorded for our protection; not the bill-to)
  if(isContracting){
    nastfBlock += '<div class="rc-sec" style="margin-top:14px;">VEHICLE OWNER (NASTF record)</div>';
    if(r.voName)        nastfBlock+='<div class="rc-line">Name: '+escapeHtml(r.voName)+'</div>';
    if(r.voPhone)       nastfBlock+='<div class="rc-line">Phone: '+escapeHtml(r.voPhone)+'</div>';
    if(r.voCity||r.voState) nastfBlock+='<div class="rc-line">Location: '+escapeHtml([r.voCity,r.voState].filter(Boolean).join(", "))+'</div>';
    if(r.voDocVerified) nastfBlock+='<div class="rc-line">Ownership doc verified: '+escapeHtml(r.voDocVerified)+'</div>';
    if(r.voDLMatch)     nastfBlock+='<div class="rc-line">DL name matches ownership doc: '+escapeHtml(r.voDLMatch)+'</div>';
  }
  if(r.nastf) nastfBlock += '<div class="rc-line" style="color:#595959;font-style:italic;margin-top:6px;">NASTF Type: '+escapeHtml(r.nastf.type)+'</div>';

  return '<div class="receipt-card">'+
     '<div class="rc-head">'+
       '<img src="'+SETTINGS.logo+'">'+
       '<div class="t"><b>'+escapeHtml(SETTINGS.name)+'</b>'+
         '<span>'+escapeHtml(SETTINGS.address)+'</span>'+
         '<span>'+escapeHtml(SETTINGS.phone)+(SETTINGS.email?'  |  '+escapeHtml(SETTINGS.email):'')+'</span></div>'+
       '<div class="rt">'+docLbl+'<span>'+escapeHtml(r.number)+'<br>'+escapeHtml(r.date)+(subline?'<br>'+escapeHtml(subline):'')+'</span></div>'+
     '</div>'+
     '<div class="rc-body">'+
       '<div class="rc-sec">BILL TO</div>'+billTo+
       nastfBlock+
       '<div class="rc-items">'+
         '<div class="rc-sec" style="margin-top:6px;">'+escapeHtml((r.serviceType||"").toUpperCase())+' SERVICE</div>'+
         '<div class="rc-ihead"><span>DESCRIPTION</span><span>AMOUNT</span></div>'+
         itemRows+
       '</div>'+
       '<div class="rc-tot">'+sub+
         '<div class="rc-totrow"><span>Total:</span><span>'+money(t.total)+'</span></div>'+
         statusLine+
       '</div>'+
       (function(){
          const term=warrantyTermText(r), pill=warrantyPillHTML(r), tu=configTermsUrl();
          const line1=[ term?('<span style="font-weight:700;color:#1f8f43">'+escapeHtml(term)+'</span>'):'', pill ].filter(Boolean).join('&nbsp;&nbsp;');
          const terms = tu?('<div style="font-size:11.5px;color:#5a616c;margin-top:4px">Terms &amp; Conditions: <a href="'+escapeHtml(termsHref(tu))+'" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">'+escapeHtml(termsDisplay(tu))+'</a></div>'):'';
          return (line1||terms)?('<div style="margin-top:8px">'+line1+terms+'</div>'):'';
       })()+
       (r.notes?'<div class="rc-notes">Notes: '+escapeHtml(r.notes)+'</div>':'')+
       (function(){ const L=exemptLines(r); return L.length?('<div class="rc-notes" style="font-style:normal"><b>'+escapeHtml(L[0])+'</b><br>'+L.slice(1).map(escapeHtml).join('<br>')+'</div>'):''; })()+
     '</div>'+
     (actionsHTML||'')+
   '</div>';
}

function shareDocument(r, lang, forCustomer){
  lang = lang || "en";
  // Spanish is always customer-facing
  if(lang === "es") forCustomer = true;
  let result;
  try {
    result = makePDF(r, lang, forCustomer, true);  // 4th arg true => return blob
  } catch(err){
    appAlert("Couldn't build PDF", err.message || "Unknown error");
    return;
  }
  if(!result || !result.blob){
    appAlert("Couldn't build PDF", "Try the download buttons instead.");
    return;
  }
  const file = new File([result.blob], result.filename, {type: "application/pdf"});
  const docLabelText = docLabel(r.docType);
  const cust = r.customer || "";
  const shareData = {
    files: [file],
    title: docLabelText + " " + r.number,
    text: docLabelText + " from " + (SETTINGS.name || "your locksmith") +
          (cust ? " for " + cust : "")
  };
  // Feature detection: not all browsers support sharing files. Test with
  // canShare before calling share, since calling share() on an unsupported
  // browser can throw or just silently do nothing.
  const canShareFiles = (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({files: [file]})
  );
  if(canShareFiles){
    navigator.share(shareData).then(()=>{
      // success — no toast needed, the OS handled it
    }).catch(err=>{
      // User cancelled the share sheet — that's not an error to surface
      if(err && err.name === "AbortError") return;
      // Real failure — give them a useful next step
      appAlert("Share didn't complete",
        "Couldn't open the share sheet. You can still tap a download button to save the PDF.");
    });
  }else{
    // Fallback: download the file and let the user know
    const a = document.createElement("a");
    a.href = URL.createObjectURL(result.blob);
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    appAlert("Share not supported here",
      "This browser doesn't support file sharing. The PDF was downloaded instead — open it from your Files/Downloads to share manually.");
  }
}

function makePDF(r, lang, forCustomer){
  r=docWithVehicles(r);   // 8z84
  lang = lang || "en";
  // Spanish is always customer-facing
  if(lang === "es") forCustomer = true;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"pt", format:"letter"});
  const W=612;
  const DARK=[42,42,42], RED=[200,50,50], LIGHT=[245,245,245];
  const GREEN=[34,153,74], AMBER=[217,138,0], GRAY=[115,115,115];
  const t=r.totals;

  // ---- header bar ----
  doc.setFillColor(...DARK); doc.rect(0,0,W,160,"F");
  // Logo, fit inside a 120x96 box preserving aspect (never stretched).
  try{ if(SETTINGS.logo){
    let lw=96, lh=96;
    try{ const ip=doc.getImageProperties(SETTINGS.logo); const ar=(ip.width||1)/(ip.height||1);
      const boxW=120, boxH=96; if(ar>=boxW/boxH){ lw=boxW; lh=Math.round(boxW/ar); } else { lh=boxH; lw=Math.round(boxH*ar); } }catch(_){}
    doc.addImage(SETTINGS.logo,"PNG",40,32+Math.max(0,(96-lh)/2),lw,lh);
  } }catch(e){}
  doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255); doc.setFontSize(22);
  doc.text(SETTINGS.name, 175, 70, {maxWidth:300});
  doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(216,216,216);
  let ay=92;
  if(SETTINGS.address){ doc.text(SETTINGS.address,175,ay,{maxWidth:300}); ay+=13; }
  const cline=[SETTINGS.phone,SETTINGS.email].filter(Boolean).join("  |  ");
  if(cline){ doc.text(cline,175,ay,{maxWidth:300}); ay+=13; }
  if(SETTINGS.license){ doc.text(SETTINGS.license,175,ay,{maxWidth:300}); }

  // doc label + meta
  const lbl = tr(docLabel(r.docType), lang);
  const numLbl = tr(r.docType==="invoice"?"Invoice #":r.docType==="estimate"?"Estimate #":"Receipt #", lang);
  doc.setFont("helvetica","bold"); doc.setFontSize(19);
  doc.setTextColor(...(r.docType==="estimate"?GRAY:RED));
  doc.text(lbl, 572, 70, {align:"right"});
  doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(216,216,216);
  doc.text(numLbl+": "+r.number, 572, 90, {align:"right"});
  doc.text(tr("Date",lang)+": "+r.date, 572, 103, {align:"right"});
  const subline = r.docType==="invoice" ? tr("Due upon receipt",lang)
                : r.docType==="estimate" ? tr("Valid for 30 days",lang) : "";
  if(subline){ doc.text(subline, 572, 116, {align:"right"}); }

  // ---- BILL TO ----
  const isContractingP = r.nastf && r.nastf.type==="Contracting D1";
  const isAuctionFleetP = r.nastf && r.nastf.type==="Auction/Fleet D1";
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...RED);
  doc.text(tr(isContractingP?"BILL TO (CONTRACTING SHOP)":"BILL TO", lang),40,191);
  doc.setLineWidth(1.5); doc.setDrawColor(...RED); doc.line(40,197,225,197);
  doc.setFont("helvetica","normal"); doc.setFontSize(10.5); doc.setTextColor(50,50,50);
  let yy=216;
  function bl(label, val){
    if(val===undefined||val===""||val===null) return;
    // advance the cursor by the ACTUAL number of wrapped lines so the next field never overlaps
    var _lines=doc.splitTextToSize(tr(label,lang)+": "+val, 260);
    for(var _i=0;_i<_lines.length;_i++){ doc.text(_lines[_i], 40, yy); yy+=15; }
  }
  bl(isContractingP?"Shop":"Customer", r.customer);
  bl(isContractingP?"Manager":"Contact", r.contact);
  bl("Phone", r.phone);
  bl("Email", r.email);
  bl("Address", r.address);
  if(r.serviceWhere==="shop") bl("Service", "In shop"+((SETTINGS&&SETTINGS.address)?(" — "+SETTINGS.address):"")); else if(r.serviceWhere==="mobile") bl("Service", "Mobile (we come to you)");   // 8z81
  bl("Vehicle", vehicleString(r));
  bl("VIN", r.vin);
  moreVehList(r).forEach(function(l,i){ bl("Vehicle "+(i+2), l); });   // 8z84
  // DL #, Plate, Odometer are NASTF audit fields — hide from customer copy
  if(!forCustomer){
    bl("DL #", r.dlNumber);
    { const _d=d1Of(r); bl("Color", _d.color); bl("Plate", _d.plate); if(_d.odometer!=="") bl("Odometer", _d.odometer); }   // 8z90
  }

  // ---- NASTF-specific blocks ----
  // Auction/Fleet authorizing-party block: audit data, hide from customer copy
  if(isAuctionFleetP && !forCustomer){
    yy+=8;
    doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...RED);
    doc.text("AUTHORIZING PARTY",40,yy); yy+=4;
    doc.setLineWidth(0.8); doc.line(40,yy,200,yy); yy+=12;
    doc.setFont("helvetica","normal"); doc.setFontSize(10.5); doc.setTextColor(50,50,50);
    bl("Service Location", r.jobLocation);
    bl("Authorized by", r.requesterName);
    bl("Company", r.requesterCompany);
    bl("Auth. Phone", r.requesterPhone);
    bl("Auth. Email", r.requesterEmail);
  }
  // Contracting vehicle-owner block: audit data, hide from customer copy
  if(isContractingP && !forCustomer){
    yy+=8;
    doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...RED);
    doc.text("VEHICLE OWNER",40,yy); yy+=4;
    doc.setLineWidth(0.8); doc.line(40,yy,200,yy); yy+=12;
    doc.setFont("helvetica","normal"); doc.setFontSize(10.5); doc.setTextColor(50,50,50);
    bl("Name", r.voName);
    bl("Phone", r.voPhone);
    if(r.voCity||r.voState) bl("Location", [r.voCity,r.voState].filter(Boolean).join(", "));
    bl("Ownership Doc Verified", r.voDocVerified);
    bl("DL Matches Ownership", r.voDLMatch);
  }
  // NASTF type footer: hide from customer copy
  if(r.nastf && !forCustomer){
    yy+=4;
    doc.setFont("helvetica","oblique"); doc.setFontSize(8.5); doc.setTextColor(120,120,120);
    doc.text("NASTF: "+r.nastf.type, 40, yy); yy+=10;
  }

  // section heading
  let secY=Math.max(yy+15, 285);
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(...RED);
  const secTitle = tr((r.serviceType||"").toUpperCase()+" SERVICE", lang);
  doc.text(secTitle,40,secY);
  doc.line(40,secY+6,40+doc.getTextWidth(secTitle)+15,secY+6);

  // items table header
  let tY=secY+22;
  doc.setFillColor(...DARK); doc.setDrawColor(...RED); doc.setLineWidth(1);
  doc.rect(40,tY,532,22,"FD");
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(255,255,255);
  doc.text(tr("DESCRIPTION",lang),50,tY+15);
  doc.text(tr("AMOUNT",lang),562,tY+15,{align:"right"});

  let rY=tY+22;
  doc.setFont("helvetica","normal"); doc.setFontSize(10.5);
  r.items.forEach((it,i)=>{
    doc.setFillColor(...(i%2===0?LIGHT:[255,255,255]));
    doc.setDrawColor(...RED); doc.rect(40,rY,532,22,"FD");
    if(it.isDiscount){
      doc.setTextColor(...GREEN);
      const lbl = it.discountMode==="percent" ? tr("Discount",lang)+" ("+it.discountValue+"%)" : tr("Discount",lang);
      doc.text(lbl,50,rY+15);
      doc.text("-"+money(t.discount),562,rY+15,{align:"right"});
    }else if(it.declined){
      // 8r: not done — grey, struck through, $0
      doc.setTextColor(154,161,172);
      let d=it.desc+"  — "+tr("not done",lang)+(it.declineReason?(" ("+it.declineReason+")"):"");
      while(doc.getTextWidth(d)>420 && d.length>4){ d=d.slice(0,-2); }
      doc.text(d,50,rY+15);
      const w=doc.getTextWidth(d); doc.setDrawColor(154,161,172); doc.setLineWidth(0.8); doc.line(50,rY+11,50+w,rY+11);
      doc.text(money(0),562,rY+15,{align:"right"});
    }else{
      doc.setTextColor(50,50,50);
      let d=it.desc;
      while(doc.getTextWidth(d)>420 && d.length>4){ d=d.slice(0,-2); }
      if(d!==it.desc) d=d.trim()+"...";
      doc.text(d,50,rY+15);
      doc.text(money(it.amount),562,rY+15,{align:"right"});
    }
    rY+=22;
  });

  let toY=rY+22;
  doc.setFontSize(10);
  const hasDiscountP = t.discount>0;
  if(t.tax>0 || t.surcharge>0 || hasDiscountP || r.taxExempt){
    doc.setFont("helvetica","normal"); doc.setTextColor(...GRAY);
    if(hasDiscountP){
      doc.text(tr("Subtotal",lang),306,toY);
      doc.text(money(t.grossSubtotal),562,toY,{align:"right"}); toY+=15;
      doc.setTextColor(...GREEN);
      doc.text(tr("Discount",lang),306,toY);
      doc.text("-"+money(t.discount),562,toY,{align:"right"}); toY+=15;
      doc.setTextColor(...GRAY);
    }
    if(t.tax>0){
      doc.text(tr("Parts (taxable)",lang),306,toY);
      doc.text(money(t.taxableAfter),562,toY,{align:"right"}); toY+=15;
      if(t.nontaxAfter>0){
        doc.text(tr("Labor / Service",lang),306,toY);
        doc.text(money(t.nontaxAfter),562,toY,{align:"right"}); toY+=15;
      }
      if(!hasDiscountP){
        doc.text(tr("Subtotal",lang),306,toY);
        doc.text(money(t.subtotal),562,toY,{align:"right"}); toY+=15;
      }
      doc.text(tr("Sales Tax",lang)+" ("+t.taxRate+"%)",306,toY);
      doc.text(money(t.tax),562,toY,{align:"right"}); toY+=15;
    }
    if(r.taxExempt && !(t.tax>0)){ doc.text(tr("Sales Tax",lang),306,toY); doc.text("EXEMPT",562,toY,{align:"right"}); toY+=15; }   // 8z81
    if(t.surcharge>0){
      doc.text(tr("Card Surcharge",lang)+" ("+t.surchargeRate+"%)",306,toY);
      doc.text(money(t.surcharge),562,toY,{align:"right"}); toY+=8;
    }else{ toY-=7; }
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.8);
    doc.line(306,toY,572,toY); toY+=16;
  }
  doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(50,50,50);
  doc.text(tr("Total",lang)+":",306,toY);
  doc.text(money(t.total),562,toY,{align:"right"});

  // status / payment
  doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(...GRAY);
  if(r.docType==="receipt"){
    doc.text(tr("Payment Method",lang)+": "+tr(r.payment||"",lang),306,toY+20);
    const sc=r.status==="Paid in Full"?GREEN:r.status==="Unpaid"?RED:AMBER;
    doc.setFont("helvetica","bold"); doc.setTextColor(...sc);
    doc.text(tr("Status",lang)+": "+tr((r.status||"").toUpperCase(),lang),306,toY+35);
    if(r.status==="Partial Payment" && Number(r.amountPaid)>0){ doc.setFont("helvetica","normal"); doc.setTextColor(...AMBER); doc.text(tr("Paid",lang)+": "+money(Number(r.amountPaid))+"  "+tr("Balance due",lang)+": "+money(Math.max(0,(t.total||0)-Number(r.amountPaid))),306,toY+50); }   // 8j
  }else if(r.docType==="invoice"){
    if(r.payment) doc.text(tr("Payment Method",lang)+": "+tr(r.payment,lang),306,toY+20);
    doc.setFont("helvetica","bold"); doc.setTextColor(...AMBER);
    doc.text(tr("Status",lang)+": "+tr("UNPAID",lang)+" — "+tr("Due upon receipt",lang).toUpperCase(),306,toY+35);
  }

  // warranty (customer-facing, no date) — right column under the status; receipts & invoices only
  const _warrText = warrantyTermText(r);
  if(_warrText){
    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(...GREEN);
    doc.text(_warrText, 306, toY+52);
  }

  // notes
  if(r.notes){
    let nY = toY + 60;
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(50,50,50);
    doc.text(tr("Notes",lang)+":",40,nY);
    doc.setFont("helvetica","normal"); doc.setTextColor(80,80,80);
    doc.text(r.notes,40,nY+14,{maxWidth:520});
  }
  { const L=exemptLines(r);   // 8z81: the exemption this sale relied on
    if(L.length){ let eY = toY + 60 + (r.notes ? (28 + 12*Math.max(1, doc.splitTextToSize(String(r.notes),520).length)) : 0); if(eY>600) eY=600;
      doc.setFont("helvetica","bold"); doc.setFontSize(8.5); doc.setTextColor(50,50,50); doc.text(L[0],40,eY); eY+=11;
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(90,90,90);
      L.slice(1).forEach(function(line){ const parts=doc.splitTextToSize(String(line),250); parts.forEach(function(p){ if(eY<650){ doc.text(p,40,eY); eY+=9; } }); }); } }

  // signature
  if(r.signature){
    let sY = 660;
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(80,80,80);
    doc.text(tr("Customer Signature",lang)+":",40,sY);
    if(r.signature==="LINE"){
      doc.setDrawColor(80,80,80); doc.setLineWidth(0.8);
      doc.line(40,sY+45,300,sY+45);
      doc.setFontSize(8); doc.setTextColor(150,150,150);
      doc.text(tr("Signature",lang),40,sY+57);
    }else{
      try{ doc.addImage(r.signature,"PNG",40,sY+5,260,60); }catch(e){}
    }
    doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(140,140,140);
    const _authShop=(SETTINGS.name||"the shop"), _authTu=configTermsUrl();
    const _authTxt=_authTu
      ? ("By signing, the customer authorized the work described and agreed to "+_authShop+"'s Terms & Conditions ("+termsDisplay(_authTu)+").")
      : "By signing, the customer authorized the work described.";
    doc.text(_authTxt,40,sY+78,{maxWidth:520});
  }

  // footer
  doc.setFillColor(...DARK); doc.rect(0,742,W,50,"F");
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(180,180,180);
  const _footerTail = (SETTINGS.footer||'').trim() || tr("Insured & Bonded",lang);   // owner-configured receipt footer (Setup) or the default
  const footerLine1 = [SETTINGS.name, SETTINGS.license, _footerTail].filter(Boolean).join("  |  ");
  doc.text(footerLine1, W/2, 765, {align:"center"});
  doc.text(tr("Thank you for choosing",lang)+" "+SETTINGS.name+"!", W/2, 777, {align:"center"});

  const langSuffix = lang==="es" ? "_ES" : "";
  const copySuffix = forCustomer ? "_Customer" : "";
  const filename = docLabel(r.docType).charAt(0)+docLabel(r.docType).slice(1).toLowerCase()+"_"+r.number+copySuffix+langSuffix+".pdf";
  // When called with returnBlob=true (4th arg), return {blob,filename} instead of triggering a download.
  // This lets shareDocument() hand the bytes directly to the Web Share API.
  if(arguments.length >= 4 && arguments[3] === true){
    return { blob: doc.output("blob"), filename: filename };
  }
  doc.save(filename);
}

  // Normalize a receipt so buildReceiptCardHTML has everything it needs (legacy/demo
  // receipts may lack items or the grossSubtotal/taxableAfter/nontaxAfter totals fields).
  function _normalize(r){
    try{
      if(!r.items) r.items=[{desc:r.descLine||r.serviceType||'Service', amount:(r.amount||(r.totals&&r.totals.total)||0), taxable:false}];
      if(!r.totals || r.totals.grossSubtotal===undefined || r.totals.taxableAfter===undefined){
        var rate = (typeof receiptTaxRate==='function'?receiptTaxRate(r):((r.totals&&r.totals.taxRate)||r.taxRate||0));
        r.totals = computeTotals(r.items, r.payment, rate);
      }
    }catch(e){}
    return r;
  }
  /* 8z84 (owner, 2026-11-12: "we need to be able to add a 2nd, 3rd vehicle … a couple that come in for multiple different
     vehicles, or we go to them and do multiple cars"). r.moreVehicles = [{year, make, model, vin, text}] holds vehicles 2, 3…
     (the first stays in vehYear / vehMake / vehModel / vin, so everything written before still works). A line that belongs
     to one vehicle carries it.vehicle (its label); when printed, that label is added after the description. */
  function moreVehList(r){ return (Array.isArray(r&&r.moreVehicles)?r.moreVehicles:[]).map(function(v){ if(!v) return ""; var n=[v.year,v.make,v.model].filter(Boolean).join(" ")||String(v.text||"").trim();
  return [n, v.vin?("VIN "+v.vin):"", v.d1===true?("NASTF D1 — "+[v.color, v.odometer?(/^no /i.test(v.odometer)?v.odometer:(v.odometer+" mi")):"", v.plate?(/^no /i.test(v.plate)?v.plate:("tag "+v.plate)):""].filter(Boolean).join(", ")):""].filter(Boolean).join(" · "); }).filter(Boolean); }
/* 8z90: colour / tag / miles of the first vehicle — a document keeps them at the top level, a Register sale inside its vehicle object */
function d1Of(r){ var v=(r && typeof r.vehicle==="object" && r.vehicle)?r.vehicle:{}; return { color:String((r&&r.vehColor)||v.color||""), plate:String((r&&r.plate)||v.plate||""), odometer:String((r&&r.odometer!=null&&r.odometer!=="")?r.odometer:(v.odometer||"")) }; }
  function docWithVehicles(r){ try{ if(!r || !Array.isArray(r.items) || !r.items.some(function(it){ return it && it.vehicle; })) return r;
    return Object.assign({}, r, { items:r.items.map(function(it){ return (it && it.vehicle) ? Object.assign({}, it, { desc:String(it.desc||"")+" — "+it.vehicle }) : it; }) }); }catch(e){ return r; } }
  /* 8z81: same two helpers as bittings.html (this file is that page's print code, copied for the Receipts tab) */
  function exemptLines(r){ try{ return (r && r.taxExempt && window.TKS_EXEMPT) ? TKS_EXEMPT.certLines(r.taxExempt) : (r && r.taxExempt ? ["TAX EXEMPT"] : []); }catch(e){ return []; } }
  function whereLine(r){ if(!r) return ""; if(r.serviceWhere==="shop") return "Service: In shop"+((SETTINGS&&SETTINGS.address)?(" — "+SETTINGS.address):""); if(r.serviceWhere==="mobile") return "Service: Mobile (we come to you)"; return ""; }
  /* the document in the form the receipt printer takes (app/hardware.js thermal.tokens) */
  function paperCopy(r){
    const t=r.totals||computeTotals(r.items||[], r.payment, receiptTaxRate(r)), est=(r.docType==="estimate");
    let wt=""; try{ wt=warrantyTermText(r)||""; }catch(e){}
    return { number:r.number||"", date:r.date||"", docType:r.docType||"receipt", customer:r.noCustomer?"":(r.customer||""), technician:r.technician||"",
      payment:est?"":(r.payment||""), status:est?"":(r.status||""),
      items:(r.items||[]).filter(it=>it && !it.declined).map(it=>({ desc:String(it.desc||"")+(it.vehicle?(" - "+it.vehicle):""), amount:it.amount, qty:parseInt(it.qty,10)||1, isDiscount:!!it.isDiscount })),
      moreVehicles:moreVehList(r).map(l=>l.replace(/\s*\u00b7\s*/g," - ")),
      totals:t, vehicleText:vehicleString(r)||"", vin:r.vin||"", serviceWhere:r.serviceWhere||"", taxExempt:r.taxExempt||null,
      exemptLabel:(r.taxExempt && window.TKS_EXEMPT)?TKS_EXEMPT.label(r.taxExempt).replace(/\s*\u00b7\s*/g," - "):"", warrantyText:wt, notes:r.notes||"" };
  }
  window.TKS_RECEIPTS = {
    normalize: _normalize,
    paperCopy: function(r){ _syncSettings(); return paperCopy(_normalize(r)); },
    buildCardHTML: function(r, actionsHTML){ _syncSettings(); return buildReceiptCardHTML(_normalize(r), actionsHTML); },
    makePDF:       function(r, lang, forCustomer, returnBlob){ _syncSettings(); return makePDF(_normalize(r), lang, forCustomer, returnBlob); },
    share:         function(r, lang, forCustomer){ _syncSettings(); return shareDocument(_normalize(r), lang, forCustomer); },
    warrantyPillCompactHTML: function(r){ try{ return warrantyPillCompactHTML(r); }catch(e){ return ''; } },
    warrantyPillHTML: function(r){ try{ return warrantyPillHTML(r); }catch(e){ return ''; } }
  };
})();
