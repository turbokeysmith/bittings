// send-document — 8z130 (owner, 2026-11-13): email an estimate (or any document) to the customer from inside Bittings,
// with the PDF attached and To / Subject / message already filled in, instead of handing it to the computer's mail
// program (whose share sheet cannot take a recipient or a subject).
//
// The app builds the PDF and posts it here as base64 with the reviewed To / Subject / message. This function checks
// who is calling (any active staff member of a shop), sends through Resend, and writes an audit_log row.
//
// Env: RESEND_API_KEY  — a Resend key with sending access (set by the owner; never in the repo)
//      MAIL_FROM       — the address mail comes from, on a domain verified in Resend (e.g. estimates@turbokeysmith.com)
//      MAIL_ONLY_SHOP  — optional: while MAIL_FROM is one shop's own domain, only that shop id may send
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Until RESEND_API_KEY and MAIL_FROM are both set it answers 503 { error:'not_configured' } and the app falls back to
// the share sheet.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireStaff } from "../_shared/auth.ts";

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const KEY = (Deno.env.get("RESEND_API_KEY") || "").trim();
const FROM = (Deno.env.get("MAIL_FROM") || "").trim();
const ONLY_SHOP = (Deno.env.get("MAIL_ONLY_SHOP") || "").trim();
const DAILY_LIMIT = 200;                 // per shop, per 24 h
const MAX_B64 = 7_000_000;               // ≈ 5 MB PDF
const EMAIL = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/;

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

  let auth;
  try { auth = await requireStaff(req); }
  catch (e) { const er = e as { status?: number; error?: string; code?: string }; return json(er.status ?? 401, { error: er.error ?? "unauthorized", code: er.code }); }

  if (!KEY || !FROM) return json(503, { error: "not_configured", message: "Email sending is not switched on for this shop yet." });
  if (ONLY_SHOP && ONLY_SHOP !== auth.shopId) return json(503, { error: "not_configured", message: "Email sending is not switched on for this shop yet." });

  let b: Record<string, unknown> = {};
  try { b = (await req.json()) ?? {}; } catch (_) { return json(400, { error: "Nothing to send." }); }
  const to = String(b.to ?? "").trim();
  const subject = String(b.subject ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
  const message = String(b.message ?? "").slice(0, 5000);
  const pdf = String(b.pdfBase64 ?? "").replace(/^data:application\/pdf;base64,/, "").replace(/\s+/g, "");
  const receiptId = String(b.receiptId ?? "").slice(0, 128);
  const docType = String(b.docType ?? "").slice(0, 20);
  let filename = String(b.filename ?? "document.pdf").replace(/[^A-Za-z0-9._ -]+/g, "_").slice(0, 100) || "document.pdf";
  if (!/\.pdf$/i.test(filename)) filename += ".pdf";

  if (!EMAIL.test(to) || to.length > 254) return json(400, { error: "That email address does not look right — check it and try again." });
  if (!subject) return json(400, { error: "Add a subject." });
  if (!message.trim()) return json(400, { error: "Add a message." });
  if (!pdf || !/^JVBERi/.test(pdf)) return json(400, { error: "The PDF did not come through — try again." });
  if (pdf.length > MAX_B64) return json(413, { error: "That PDF is too big to email (over 5 MB)." });

  // how much this shop has sent in the last day
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const used = await supa.from("audit_log").select("id", { count: "exact", head: true }).eq("shop_id", auth.shopId).eq("action", "document_emailed").gte("created_at", since);
  if ((used.count ?? 0) >= DAILY_LIMIT) return json(429, { error: "This shop has reached today's limit for emailed documents. Try again tomorrow, or share it another way." });

  // who it is from: the shop's name, with replies going to the shop's own address
  const cfg = await supa.from("shop_config").select("data").eq("shop_id", auth.shopId).maybeSingle();
  const ident = ((cfg.data?.data as Record<string, unknown> | undefined)?.identity as Record<string, unknown> | undefined) ?? {};
  const shopName = String(ident.name ?? "").replace(/["<>\r\n]+/g, " ").trim().slice(0, 80) || "Your locksmith";
  const replyTo = EMAIL.test(String(ident.email ?? "").trim()) ? String(ident.email).trim() : (EMAIL.test(auth.user.email) ? auth.user.email : "");

  let rid = "", detail = "";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "content-type": "application/json" },
      body: JSON.stringify({
        from: `${shopName} <${FROM}>`, to: [to], subject, text: message,
        ...(replyTo ? { reply_to: replyTo } : {}),
        attachments: [{ filename, content: pdf }],
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { detail = String((j as { message?: string }).message ?? r.status); console.error("resend refused", r.status, detail); return json(502, { error: "The email service did not accept it: " + detail.slice(0, 200) }); }
    rid = String((j as { id?: string }).id ?? "");
  } catch (e) { console.error("resend unreachable", String((e as Error).message)); return json(502, { error: "Could not reach the email service — try again in a moment." }); }

  try {
    await supa.from("audit_log").insert({ user_id: auth.user.id, role: auth.role, action: "document_emailed", entity_type: "receipts", entity_id: receiptId,
      detail: { to, subject, doc_type: docType, filename, resend_id: rid, reply_to: replyTo }, shop_id: auth.shopId });
  } catch (_) { /* the email has gone; a logging problem must not turn that into an error */ }

  return json(200, { ok: true, id: rid, to, reply_to: replyTo });
});
