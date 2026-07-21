# NH Ahead — Build Spec (for Claude Code)

Drop this in the project root. Work ONE milestone at a time, test it, then move on.
Reference files in this project: the interactive prototype (front-end design + logic to port),
the sample Blueprint (the PDF design target), the copy doc (all site wording), and the plan doc
(every product decision + reasoning). Match the prototype's look and voice exactly.

---

## What we're building
A free, anonymous NH "reality check" tool (location → itemized budget → salary needed → matched NH
careers) that funnels into a one-time **$19 personalized Blueprint PDF**. Standalone brand **NH Ahead**
at **nhahead.com**. Must be **passive** (auto-generates and delivers with no manual work) and the free
tool must stay **anonymous** (no accounts, nothing stored).

## Tech stack
- **Front end:** static HTML/CSS/JS (port from the prototype; keep vanilla, no heavy framework needed).
- **Serverless:** Netlify Functions (Node) for anything using a secret key.
- **Payments:** Stripe Checkout + webhook.
- **PDF:** HTML-to-PDF (the Blueprint is already styled HTML). Start with a hosted HTML-to-PDF API for
  reliability; swap to headless Chromium later if desired.
- **Email:** Resend (or Postmark) to deliver the Blueprint.
- **Host:** Netlify, domain nhahead.com (redirect newhampshireahead.com → nhahead.com).

## Accounts + environment variables (set in Netlify env, NEVER in client code)
| Key | From | Used for |
|---|---|---|
| CAREERONESTOP_USERID / CAREERONESTOP_TOKEN | careeronestop.org (free API signup) | live NH wages |
| ONET_USERNAME / ONET_PASSWORD | O*NET Web Services (free) | interest assessment (or use the embed widget) |
| SCORECARD_API_KEY | api.data.gov / College Scorecard | schools by program |
| STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET | Stripe dashboard | checkout + webhook |
| RESEND_API_KEY | Resend | emailing the Blueprint |
| ANTHROPIC_API_KEY | Anthropic (optional, phase 2) | warm AI-written Blueprint sections |

**Security rules:** all secrets stay server-side in Netlify env vars. Never expose a key in client JS.
Never handle raw card data (Stripe Checkout hosts the card form). Cache CareerOneStop responses
(data refreshes ~yearly) to avoid rate limits.

---

## Architecture (suggested)

```
/public            → static front end (index.html = the tool, ported from prototype)
  /blueprint       → the HTML Blueprint template with {{merge}} fields
/netlify/functions
  wages.js         → proxies CareerOneStop (keeps token hidden)
  create-checkout.js → creates a Stripe Checkout Session (allow_promotion_codes: true)
  stripe-webhook.js  → on checkout.session.completed: build Blueprint → PDF → email
  schools.js       → proxies College Scorecard for matched careers
/data
  careers.json     → NH occupation list (SOC/O*NET codes, education level, training path)
  nebhe.json       → NEBHE Tuition Break approved programs (manual/static; no clean API)
```

---

## Build order (each = one session, each ends working)

### Milestone 1 — Front end live
- Port the prototype to `/public/index.html`, cleaned up. Keep design tokens, voice, and all logic
  (location-first, itemized teaching bills, savings-as-%, student-loan manual/auto toggle, career fit).
- Deploy to Netlify, connect nhahead.com, redirect the long domain.
- **Done when:** the tool works live at nhahead.com on desktop + phone with representative data.

### Milestone 2 — Live wage data
- Build `wages.js` to call CareerOneStop and return median/entry/experienced wages for an occupation in NH.
- Replace the hardcoded wages in the career list with live calls (cache results).
- **Done when:** career wages come from the live API, and the page still loads fast (cached).

### Milestone 3 — Interest assessment
- Embed the O*NET Interest Profiler (widget or Web Services API). Capture the RIASEC result.
- Use it to personalize/reorder the career matches (interest + fit, not just pay).
- **Done when:** a user can take the assessment and see matches shaped by their results.

### Milestone 4 — Paid Blueprint (the core)
- `create-checkout.js`: create a Stripe Checkout Session for the $19 Blueprint, `allow_promotion_codes: true`,
  collect email. Pass the user's tool inputs through (metadata or a short-lived record).
- `stripe-webhook.js`: verify signature; on `checkout.session.completed`, merge the user's data into the
  Blueprint HTML template, convert to PDF, email it via Resend.
- Blueprint sections (see sample): strengths read, life+number, matches w/ trajectory, two-paths,
  where-you'd-study + NEBHE tuition break, honest read + levers, parent companion, next steps.
- Set up the promo codes from the promo-codes checklist in the Stripe dashboard.
- **Done when:** a test purchase (incl. a promo code) generates and emails a correct, good-looking PDF.

### Milestone 5 — Schools data + polish
- `schools.js`: College Scorecard for programs matching each career; fold in NEBHE programs from `nebhe.json`.
- Add privacy policy + terms/disclaimer (from copy doc; fill refund policy), analytics (privacy-friendly),
  final QA on mobile.
- **Done when:** schools show real programs, legal pages are live, and the full flow is tested end to end.

---

## Key implementation notes
- **Free tool = anonymous.** No login, no database of user choices. The only personal data collected is
  the buyer's email at checkout (for delivery), handled through Stripe.
- **Blueprint generation:** the factual/structural parts (numbers, budget, matches, schools, two-paths,
  next steps) come from a smart template + the tool's own math. Optionally, in phase 2, call the Anthropic
  API for ONLY the warm sections (strengths interpretation, parent note) to make them feel personally
  written. Keep that scoped to career planning.
- **Promo codes:** rely on Stripe's built-in promotion codes (`allow_promotion_codes: true`); nothing custom.
- **Stripe test mode first.** Use test keys and Stripe's test cards for the whole flow before going live.
- **Legal:** privacy policy is required once you take payment/email. Terms + disclaimer are drafted in the
  copy doc; a lawyer should glance before launch.

## Guardrails (don't drift from these)
- Passive by design: zero manual steps between purchase and delivery.
- NH-specific and honest: real local numbers, clear "estimate, not a promise" framing.
- The voice is Charli's: warm, plain, no jargon, no em dashes. Match the prototype and copy doc.
- Keep NH Ahead separate from the Northern Pine therapy site (soft cross-link only).
