# NH Ahead → New State: Porting Notes

Read this first thing in the new Claude Code session for the new state. Paste the whole
file into your first message, or just tell Claude "read State Expansion Notes.md" if
you've copied it into the new project folder.

## What this project is

NH Ahead (nhahead.com) is a free, anonymous career/budget planning tool that funnels into
a one-time $19 personalized "Blueprint" PDF. Built by a licensed mental health counselor
(LCMHC), not a developer — explanations and decisions should stay plain-language, not
assume deep technical background.

**Stack:** static HTML/CSS/JS front end + Netlify Functions (Node, no npm dependencies,
plain `fetch`) + Stripe Checkout (payment) + PDFShift (HTML→PDF) + Resend (email) +
CareerOneStop API (wages) + College Scorecard API (schools/tuition) + an O*NET-style
RIASEC interest quiz.

**File layout:**
- `public/index.html` — the free tool (region picker → budget builder → salary needed → career matches)
- `public/blueprint.html` — post-purchase interest quiz + delivery status page
- `public/js/data.js` — regions, cost categories, and the career database (NH_CAREERS)
- `public/js/app.js` — free tool logic, including the salary-needed tax math
- `netlify/functions/create-checkout-session.js` — starts Stripe Checkout
- `netlify/functions/verify-purchase.js` / `generate-blueprint.js` — verifies payment, builds and emails the PDF
- `netlify/functions/lib/blueprint.js` — the Blueprint PDF's HTML template + data merge
- `netlify/functions/lib/schools.js` — College Scorecard integration

## Technical lessons that transfer as-is (don't relitigate these)

- **PDFShift auth** is an `X-API-Key` header, NOT Basic auth — their docs are misleading here.
- **PDF page breaks:** `page-break-inside:avoid` on `display:flex`/`display:grid` containers is
  NOT reliably honored by Chromium's print engine, and `page-break-after:avoid` on headings
  isn't either. The only reliable fix found: wrap a heading + its first chunk of content in a
  plain block-level `<div>` with `page-break-inside:avoid`.
- **College Scorecard** only supports 4-digit CIP code filtering
  (`latest.programs.cip_4_digit.code`) — a 2-digit family field doesn't exist and 400s.
  Every CIP4 code was verified against a live API call, not guessed — do the same for the
  new state's career list.
- **Resend** needs a verified sending domain (SPF/DKIM/DMARC records) before it'll send from
  a real address — set this up in the new domain's DNS panel early, it can take time to propagate.
- **Stripe** is called via plain `fetch`, no SDK. Checkout Sessions use `custom_fields` for
  optional first-name collection and `allow_promotion_codes:true`.
- **XSS:** user-controlled input (the Stripe first-name field) is escaped via an `escapeHtml()`
  helper before being interpolated into the PDF/email HTML. Keep this pattern anywhere user
  input touches generated HTML.
- **Government sites block automated fetches.** NH.gov domains return 403 to bot traffic
  (confirmed both via WebFetch and direct curl with a browser user-agent) — expect the
  same from the new state's .gov sites. Cross-check facts via search results/citations
  instead, or ask the user to pull the page manually.

## Everything that's NH-specific and MUST be re-worked

1. **Tax math** (`public/js/app.js`, `bracketRate()` / `requiredSalary()`) — currently only
   grosses up for federal tax + FICA because **NH has no state income tax**. Any other state
   (except TX, FL, WA, NV, WY, SD, AK, TN) needs real state income tax brackets added to this
   calculation, and the "no state income tax" messaging in `index.html` removed or changed.
2. **Regions + rent multipliers** (`public/js/data.js`, `REGIONS`) — NH's regions (Seacoast,
   Lakes Region, North Country, etc.) and their cost-of-living multipliers are NH-specific and
   need to be entirely replaced with the new state's real regions and real relative costs.
3. **Career wage data** (`public/js/data.js`, `NH_CAREERS`) — SOC codes are national so the
   CareerOneStop API call structure carries over, but wage figures need to be re-pulled for
   the new state (CareerOneStop takes a state parameter), and the career list re-curated for
   what's actually in-demand there.
4. **NEBHE Tuition Break** — this is a New England-only regional tuition reciprocity program
   (CT/ME/MA/NH/RI/VT). If the new state isn't in New England, this needs to be replaced with
   whatever the real equivalent is (e.g. WICHE for western states, the Midwest Student Exchange,
   the Academic Common Market for the South) — or removed if nothing comparable exists. This
   touches the Blueprint's "Next steps" section, the schools section tuition callout, and the
   free tool's career-hook callout.
5. **School/CIP data** — College Scorecard is national so the API itself works anywhere, but
   queries need to filter by the new state, and every CIP4 code should be re-verified live
   (per the lesson above), not copied from NH's mapping.
6. **Financial aid nonprofit** — Granite Edvance (formerly NHHEAF) is NH-specific. Find the
   new state's equivalent college-access/financial-aid nonprofit.
7. **Branding** — name, domain, and every reference to "New Hampshire" / "NH" / "Granite
   State" in copy (site, Blueprint PDF, emails) needs updating. Colors/logo are optional to
   change.
8. **New accounts, not reused ones** — new Stripe product/prices, new Netlify site, new GitHub
   repo, new domain + DNS. Keep this fully separate from NH Ahead's billing and deployment.
9. **The O*NET-style RIASEC interest quiz is already state-agnostic** — carries over with no
   changes needed.

## Suggested first message for the new Claude Code session

> I'm building [STATE] Ahead, a sister project to NH Ahead (nhahead.com) — same concept
> (free anonymous career/budget tool → $19 personalized Blueprint PDF) for a different
> state. I've copied the NH Ahead codebase into this folder as a starting point. Read
> `State Expansion Notes.md` for the full technical rundown of what transfers as-is vs.
> what's NH-specific and needs to change. Let's start with [whatever you want to tackle first —
> e.g. the tax math, or the regions].
