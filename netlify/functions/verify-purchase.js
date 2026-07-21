// Confirms a Stripe Checkout Session actually completed payment, so
// blueprint.html only shows the interest quiz to people who paid.
// Plain fetch against Stripe's REST API, no SDK, same pattern as the
// rest of this project's functions.
//
// Needs STRIPE_SECRET_KEY set in the Netlify environment.

exports.handler = async function (event) {
  const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
  if (!sessionId) {
    return respond(400, { paid: false, error: 'Missing session_id' });
  }

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    console.error('verify-purchase: STRIPE_SECRET_KEY env var is missing');
    return respond(500, { paid: false, error: 'Verification is not configured yet.' });
  }

  try {
    const url = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`verify-purchase: Stripe HTTP ${res.status} for session ${sessionId}: ${JSON.stringify(data).slice(0, 500)}`);
      return respond(200, { paid: false });
    }

    // Stripe returns 'no_payment_required' instead of 'paid' when a 100%-off
    // promo code brings the total to $0, that's still a completed checkout.
    const paid = data.payment_status === 'paid' || data.payment_status === 'no_payment_required';
    return respond(200, { paid });
  } catch (err) {
    const cause = err && err.cause ? ` cause: ${err.cause.code || err.cause.message || err.cause}` : '';
    console.error(`verify-purchase: threw: ${err.name || ''} ${err.message}${cause}`);
    return respond(500, { paid: false });
  }
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
