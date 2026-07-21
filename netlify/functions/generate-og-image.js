// Utility endpoint, not linked from the site. Renders the branded social
// share image (1200x630) via PDFShift's JPEG endpoint, so it can be
// downloaded once and published as the static /og-image.jpg referenced by
// the og:image / twitter:image meta tags. Re-run this whenever the brand
// design changes and the share image needs to be regenerated.

const HTML = `<!doctype html>
<html><head><meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Hanken+Grotesk:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1200px; height:630px; background:#1c2e42; font-family:'Hanken Grotesk', sans-serif; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; }
</style></head>
<body>
  <svg viewBox="0 0 1200 630" width="1200" height="630" style="position:absolute;inset:0;">
    <g fill="none" stroke="#fbfcfc" stroke-width="1.8" opacity="0.18">
      <path d="M-50,500 C250,430 450,560 700,470 C950,390 1150,520 1350,450"/>
      <path d="M-50,430 C250,370 450,490 700,410 C950,330 1150,450 1350,380"/>
      <path d="M-50,360 C260,310 460,420 700,350 C960,280 1160,390 1350,320"/>
      <path d="M-50,290 C270,250 470,350 700,290 C970,230 1170,330 1350,270"/>
      <path d="M-50,220 C280,190 480,280 700,230 C980,180 1180,270 1350,220"/>
    </g>
  </svg>
  <div style="position:relative;text-align:center;color:#fbfcfc;padding:0 80px;">
    <div style="font-size:22px;letter-spacing:0.16em;text-transform:uppercase;color:#b23a48;font-weight:600;margin-bottom:24px;">Real Massachusetts Numbers</div>
    <div style="font-family:'Bricolage Grotesque',serif;font-weight:700;font-size:88px;line-height:1;">MA <span style="color:#d7e0e8;">Ahead</span></div>
    <div style="font-size:34px;margin-top:28px;font-weight:600;">Your future. Let's see how it <span style="color:#b23a48;">adds up</span>.</div>
    <div style="font-size:20px;margin-top:22px;color:#d7e0e8;">Free planning tool &middot; $19 personalized Blueprint &middot; maahead.com</div>
  </div>
</body></html>`;

exports.handler = async function () {
  const pdfshiftKey = (process.env.PDFSHIFT_API_KEY || '').trim();
  if (!pdfshiftKey) {
    return { statusCode: 500, body: 'PDFSHIFT_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.pdfshift.io/v3/convert/jpeg', {
      method: 'POST',
      headers: { 'X-API-Key': pdfshiftKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: HTML, viewport: '1200x630', quality: 90 }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, body: `PDFShift error: ${text.slice(0, 500)}` };
    }

    const buf = Buffer.from(await res.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'inline; filename="og-image.jpg"',
      },
      body: buf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.name || ''} ${err.message}` };
  }
};
