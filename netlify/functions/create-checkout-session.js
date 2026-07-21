// Creates a Stripe Checkout Session for the one-time $19 Blueprint purchase
// and returns its hosted URL for the front end to redirect to. Uses plain
// fetch against Stripe's REST API (form-encoded, per their spec) rather
// than the Stripe SDK, matching the no-dependency approach used elsewhere
// in this project (wages.js, onet-questions.js).
//
// Needs STRIPE_SECRET_KEY set in the Netlify environment.

const PRICE_CENTS = 1900; // $19.00
const STRIPE_PRODUCT_ID = 'prod_UvIzd7Mw1XjZaM'; // "MA Ahead Blueprint" in the Stripe dashboard

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    console.error('create-checkout-session: STRIPE_SECRET_KEY env var is missing');
    return respond(500, { error: 'Checkout is not configured yet.' });
  }

  // Prefer the origin the request actually came from (works for both
  // maahead.com and the *.netlify.app preview/default domain), falling
  // back to the site's primary URL that Netlify injects automatically.
  const origin = (event.headers && (event.headers.origin || event.headers.Origin))
    || process.env.URL
    || 'https://maahead.com';

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('allow_promotion_codes', 'true');
  params.append('custom_fields[0][key]', 'first_name');
  params.append('custom_fields[0][type]', 'text');
  params.append('custom_fields[0][optional]', 'true');
  params.append('custom_fields[0][label][type]', 'custom');
  params.append('custom_fields[0][label][custom]', 'First name (so we can personalize your Blueprint)');
  params.append('custom_fields[0][text][maximum_length]', '40');
  params.append('line_items[0][quantity]', '1');
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][unit_amount]', String(PRICE_CENTS));
  params.append('line_items[0][price_data][product]', STRIPE_PRODUCT_ID);
  params.append('success_url', `${origin}/blueprint.html?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}/#step-blueprint`);

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`create-checkout-session: Stripe HTTP ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
      return respond(502, { error: 'Could not start checkout.' });
    }

    return respond(200, { url: data.url });
  } catch (err) {
    const cause = err && err.cause ? ` cause: ${err.cause.code || err.cause.message || err.cause}` : '';
    console.error(`create-checkout-session: threw: ${err.name || ''} ${err.message}${cause}`);
    return respond(500, { error: 'Could not start checkout.' });
  }
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
