// Utility endpoint, not linked from the site. Generates a Blueprint PDF from
// fixed representative sample data (no purchase, no real user), so we can
// download it once and publish it as the static /sample-blueprint.pdf shown
// on the site's Blueprint offer card. Re-run this (fetch the endpoint, save
// the response) whenever lib/blueprint.js's template changes and the sample
// needs to be regenerated. Costs one PDFShift credit per call, so it's not
// wired into any public UI.

const { buildBlueprintData, renderBlueprintHtml } = require('./lib/blueprint.js');

const SAMPLE_BUDGET_STATE = {
  region: 'lakes',
  selections: {
    rent: 1, heat: 1, power: 1, renters: 1, internet: 1, phone: 2,
    carpay: 1, gas: 2, carins: 1, groceries: 1, eatout: 1,
    healthins: 1, care: 1, savings: 1, studentloans: 0, debt: 0,
    clothing: 1, fun: 1,
  },
  monthlyTotal: 3420,
  salaryNeeded: 48857,
};

exports.handler = async function () {
  const pdfshiftKey = (process.env.PDFSHIFT_API_KEY || '').trim();
  if (!pdfshiftKey) {
    return { statusCode: 500, body: 'PDFSHIFT_API_KEY not configured' };
  }

  try {
    const data = await buildBlueprintData({
      code: 'SI',
      totals: { R: 12, I: 20, A: 10, S: 22, E: 14, C: 9 },
      budgetState: SAMPLE_BUDGET_STATE,
      firstName: 'Riley',
    });
    const html = renderBlueprintHtml(data);

    const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: { 'X-API-Key': pdfshiftKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: html, format: 'A4' }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, body: `PDFShift error: ${text.slice(0, 500)}` };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="nh-ahead-sample-blueprint.pdf"',
      },
      body: buf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.name || ''} ${err.message}` };
  }
};
