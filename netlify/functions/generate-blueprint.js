// Takes the completed interest quiz + budget snapshot, re-verifies payment
// server-side (never trust the client's word that a session paid), then
// builds the Blueprint PDF (PDFShift) and emails it (Resend).
//
// Needs STRIPE_SECRET_KEY (already used by verify-purchase.js),
// PDFSHIFT_API_KEY, and RESEND_API_KEY.

const { buildBlueprintData, renderBlueprintHtml } = require('./lib/blueprint.js');

const FROM_ADDRESS = 'MA Ahead <blueprint@maahead.com>';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method Not Allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { sessionId, totals, code, budgetState } = payload;
  if (!sessionId) {
    return respond(400, { error: 'Missing sessionId' });
  }

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const pdfshiftKey = (process.env.PDFSHIFT_API_KEY || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (!secretKey || !pdfshiftKey || !resendKey) {
    console.error('generate-blueprint: missing one or more required env vars');
    return respond(500, { error: 'Not configured yet.' });
  }

  let customerEmail, firstName;
  try {
    const url = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${secretKey}` } });
    const session = await res.json();

    // 'no_payment_required' is what Stripe returns for a $0 total after a
    // 100%-off promo code, that's still a completed checkout (see the same
    // fix in verify-purchase.js).
    const isPaid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (!res.ok || !isPaid) {
      console.error(`generate-blueprint: rejected, session ${sessionId} not paid (status ${res.status})`);
      return respond(402, { error: 'Payment not verified for this session.' });
    }
    customerEmail = session.customer_details && session.customer_details.email;
    if (!customerEmail) {
      console.error(`generate-blueprint: paid session ${sessionId} has no customer email`);
      return respond(422, { error: 'No email on file for this purchase.' });
    }
    const nameField = Array.isArray(session.custom_fields) && session.custom_fields.find((f) => f.key === 'first_name');
    firstName = (nameField && nameField.text && nameField.text.value || '').trim() || null;
  } catch (err) {
    const cause = err && err.cause ? ` cause: ${err.cause.code || err.cause.message || err.cause}` : '';
    console.error(`generate-blueprint: verify threw: ${err.name || ''} ${err.message}${cause}`);
    return respond(500, { error: 'Could not verify payment.' });
  }

  let pdfBuffer;
  try {
    const data = await buildBlueprintData({ code, totals, budgetState, firstName });
    const html = renderBlueprintHtml(data);
    pdfBuffer = await htmlToPdf(html, pdfshiftKey);
  } catch (err) {
    console.error(`generate-blueprint: PDF build failed: ${err.name || ''} ${err.message}`);
    return respond(500, { error: 'Could not build the Blueprint PDF.' });
  }

  try {
    await sendBlueprintEmail(customerEmail, firstName, pdfBuffer, resendKey);
  } catch (err) {
    console.error(`generate-blueprint: email send failed: ${err.name || ''} ${err.message}`);
    return respond(500, { error: 'Could not email the Blueprint.' });
  }

  return respond(200, { sent: true });
};

async function htmlToPdf(html, pdfshiftKey){
  const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'X-API-Key': pdfshiftKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source: html, format: 'A4' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PDFShift HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function blueprintEmailHtml(firstName){
  const greeting = firstName ? `Hey ${escapeHtml(firstName)},` : 'Hey there,';
  return `
<div style="background:#eef2f5;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dde3e8;">
    <div style="background:#1c2e42;padding:32px 32px 28px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#fbfcfc;font-family:Georgia,'Times New Roman',serif;">MA <span style="color:#d7e0e8;font-weight:400;">Ahead</span></div>
    </div>
    <div style="padding:36px 32px;">
      <p style="margin:0 0 16px;font-size:17px;color:#20272e;">${greeting}</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#20272e;">Your Blueprint is ready, attached to this email as a PDF. Real numbers, real Massachusetts schools, and an honest read on what it takes to get where you're going.</p>
      <div style="background:#eef2f5;border-radius:12px;padding:20px 22px;margin:24px 0;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#1c2e42;text-transform:uppercase;letter-spacing:0.04em;">What's inside</p>
        <p style="margin:0 0 6px;font-size:14px;color:#20272e;">&#10003; Your strengths and interests, in plain language</p>
        <p style="margin:0 0 6px;font-size:14px;color:#20272e;">&#10003; Your top MA career matches, with real pay</p>
        <p style="margin:0 0 6px;font-size:14px;color:#20272e;">&#10003; Real MA schools, real tuition, real financial aid</p>
        <p style="margin:0;font-size:14px;color:#20272e;">&#10003; An honest read, plus concrete next steps</p>
      </div>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#20272e;">It's yours to keep, no subscription, no follow-up charges. If anything looks off or you have questions, just reply to this email, we read every one.</p>
      <p style="margin:24px 0 0;font-size:15px;color:#20272e;">Good luck out there.<br><span style="color:#35566f;font-weight:600;">&mdash; MA Ahead</span></p>
    </div>
    <div style="background:#eef2f5;padding:20px 32px;text-align:center;border-top:1px solid #dde3e8;">
      <p style="margin:0;font-size:12px;color:#5c6b76;">MA Ahead &middot; maahead.com<br>You're receiving this because you purchased a Blueprint. This is a one-time delivery, not a subscription.</p>
    </div>
  </div>
</div>`;
}

async function sendBlueprintEmail(toEmail, firstName, pdfBuffer, resendKey){
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [toEmail],
      subject: 'Your MA Ahead Blueprint is ready',
      html: blueprintEmailHtml(firstName),
      attachments: [{
        filename: 'nh-ahead-blueprint.pdf',
        content: pdfBuffer.toString('base64'),
        content_type: 'application/pdf',
      }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
