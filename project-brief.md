# NH Ahead — Project Brief (single handoff file)

**What this is:** everything needed to build NH Ahead, in one file. Drop it in your project folder and point Claude Code at it. It contains, in order: the decisions and strategy, the build spec (milestones), the front-end design tokens + data, the Blueprint structure, all site copy, the promo codes, and the counselor outreach.

**Two companion files (visual references, optional):** the prototype HTML (the working front-end look) and the sample Blueprint HTML (the PDF design target). This brief stands on its own without them, but they show the intended look.

**How to work:** one milestone per session, test each before moving on. Keep secrets in Netlify env vars, never in client code. Match the voice everywhere: warm, plain, no jargon, no em dashes.

---

# PART 1 — DECISIONS & STRATEGY

---

## 1. The concept in one line

A free, NH-specific "reality check" tool (lifestyle budget + career matching on live New Hampshire wage data), modeled on Texas Reality Check, that funnels into a paid, one-time, personalized **Blueprint** for future planning.

The teaching point is the same one that makes Texas Reality Check work: it connects the life someone wants to the earnings required, and the earnings to a realistic education or training path. Your edge over the generic national tools is NH specificity plus a strengths-based, counselor's interpretation.

---

## 2. Who it's for

Primary audience (Phase 1): **individuals**, in your existing niches:
- Teens (13+) and transition-age young adults
- College students and recent grads
- First responders and high-stress professionals considering a change
- Parents planning alongside a teen (often the actual buyer)

Later audience (Phase 3): **schools**, specifically NH guidance offices, as a supplemental workshop or curriculum rather than a software platform.

---

## 3. Language guardrail (important)

Public-facing language is **career planning / future planning / career exploration**, never "counseling." "Counseling" is bound to your LCMHC license and clinical relationship, and this product is information and self-directed planning, not therapy. Keeping that line clean protects your license and lets the product scale without being read as a clinical service.

---

## 4. How the data works (the part that keeps it accurate)

The hardest problem in a tool like this is keeping wage and cost numbers current. We're solving it with live data sources instead of a hand-maintained spreadsheet.

**Wages and career data (the engine):**
- **CareerOneStop Web API** (U.S. Dept of Labor). Free, token-authenticated. Returns live hourly and annual wages by occupation and location, plus occupation profiles, career outlook, and typical training. Refreshed annually from federal BLS data.
- **NH Employment Security / ELMI** for state-level granularity (wage and employment data for ~600 NH occupations, down to counties and sub-state areas) where you want a more local number than the federal feed gives.

**The assessment:**
- **O*NET Interest Profiler** (U.S. Dept of Labor). Licensed CC BY 4.0, so it can be embedded with attribution. Free embeddable widget and web-services API. RIASEC / Holland Code, validated, and results map directly to 900+ O*NET occupation codes.
- Why it matters: the profiler returns O*NET codes, which feed the CareerOneStop wage lookup, which feeds the reality-check budget. One clean pipeline, all on free government rails: **interest test → matched NH careers → "can it pay for the life you want here?" → Blueprint.**

**Cost-of-living inputs (for the budget side):**
- HUD Fair Market Rents (published per NH county) for housing
- MIT Living Wage Calculator (NH, by county) as a cross-check
- National sources that apply everywhere for health, loans, childcare, transportation (the same ones Texas Reality Check uses: ACA rates, USDA cost-of-raising-a-child, federal student loan averages)

**Architecture note:**
The CareerOneStop API token can't be safely exposed in client-side code. The clean approach is a small **Netlify serverless function** that proxies the API and keeps your key hidden. This fits the Netlify workflow you already use.

---

## 5. Free tier (the funnel)

The tool itself, free and **anonymous: no accounts, nothing stored.**

User flow:
1. Choose the lifestyle / monthly expenses you want (housing, transportation, food, etc., with NH-real defaults)
2. See the salary that lifestyle requires
3. Take the embedded interest profiler
4. Get matched NH careers with real wage data, and see whether each one supports the lifestyle you picked

Why anonymous matters: storing no identifiable data keeps this clear of FERPA and student-data-privacy law, which is exactly what lets a school use it later without a data agreement. It also lowers friction and makes the tool shareable, which is the whole point of a funnel.

---

## 6. Paid product: the Blueprint

A **one-time, auto-generated, take-home plan.** Passive to produce (a smart template that merges the user's inputs and results into a polished PDF). No personal touches required from you.

What's in it (this is what people pay for, since the raw numbers are free everywhere):
- Their interest / strengths profile read through a strengths-based lens, not a generic score
- Top 3 to 5 NH career matches with real wages
- The education or training each match needs, and the actual NH paths to get there (community college, apprenticeship, certification)
- Their reality-check budget reconciled against those careers, so the gap (and the realistic move) is visible
- A concrete, do-this-next plan

**Price: $19, single tier, at launch.**

Pricing rationale (so future-you remembers why):
- Comparable auto-generated career reports cluster at $19 to $49 (e.g., Truity's flagship report ~$29). $19 sits at the accessible end on purpose.
- It's geared toward young people. $19 vs $29 is a real left-digit jump (leftmost digit 1 vs 2), so $19 reads as "under twenty / teen money."
- Keeping it genuinely affordable is on-brand: "a counselor made something real and didn't gouge you."
- It's nearly pure margin either way (cost per Blueprint is basically a few API calls and a PDF render), so conversion and goodwill matter more than squeezing price.

Pricing format: **whole dollar, $19, not $19.99.** The left-digit benefit is already captured at $19, and a .99 ending signals "discount retail," which works against a licensed counselor's credibility. Round/whole numbers read as more trustworthy and more appropriate for an emotional, identity-level purchase.

Easy to revisit later: raising a launch price reads as "this got more valuable," while cutting one trains people to wait for a sale. So $19 leaves room to test $29 down the road with no downside now.

Possible later move (not now): a two-tier split, e.g., $19 lite (results + matches + budget) and a higher full version (adds the NH training pathways and complete plan) for the parents and adults who'll happily pay more. Same generator under the hood, one section gated. Only add if sales data says adults would have paid more.

Payments: Stripe (Checkout or Payment Links), standard for a static site, kept entirely separate from your clinical practice and Headway.

---

## 7. Schools and subscriptions (parked for later)

The school angle is what actually justifies a subscription, because it offers recurring institutional value instead of asking individuals to keep paying for a one-and-done tool. But it's a different, slower, more regulated business, so it's deliberately Phase 3.

What to know when you get there:
- The K-12 career-readiness software market is crowded and entrenched (Naviance/PowerSchool sits in ~40% of US high schools, surrounded by Xello, Scoir, SchooLinks, MaiaLearning). Don't try to out-platform them as a solo clinician.
- Selling identifiable student data into a school triggers FERPA and state student-data-privacy law, plus minor-consent issues. Avoid this by keeping the tool anonymous.
- The realistic wedge: license your NH reality-check + strengths workshop as a **supplement a guidance office runs**, or deliver it yourself as a paid workshop. Counselors are buried (400+ students each), so a turnkey, NH-specific module is genuinely valuable and isn't what the big platforms give them.
- Go where incumbents are weak: small NH schools, charters, alternative/transition programs, CTE/vocational, homeschool networks.
- "Career counseling" in any school offer means **software-delivered guidance**, not your personal hours. Your time is a premium add-on (workshop, counselor training), priced separately, never bundled per-student.
- B2B pricing is round numbers by convention ($X per student, $X per year). The .99 game is consumer-retail only.

---

## 8. Build sequence (so this doesn't accidentally become a Naviance clone)

**Phase 1 — Validate (build this first):**
- The free NH Reality Check tool (anonymous)
- The $19 auto-generated Blueprint with Stripe checkout
- Goal: prove people actually want this, with minimal compliance burden.

**Phase 2 — Deepen (B2C):**
- Embed the O*NET Interest Profiler and richer strengths interpretation
- Refine the Blueprint based on real buyer feedback
- Optional: test the two-tier price

**Phase 3 — Schools (only after Phase 1–2 prove out):**
- Approach NH schools via workshop / curriculum licensing, not a data-storing platform
- Revisit a subscription model here, where it finally makes sense

Each phase funds and de-risks the next. Phase 1 alone is a real product.

---

## 9. Open decisions (still to settle)

1. **Branding / name.** Under Northern Pine, or a standalone brand so it doesn't muddy the practice? (Leaning standalone to keep a clean wall between the practice and the tool, but undecided.)
2. **Blueprint visual design and voice.** What it looks like and how much of your voice is in the template copy.
3. **Default occupation set and tone for Phase 1.** Tune to one niche first (e.g., transition-age youth, or first responders) or keep it all-ages from day one?
4. **Exact expense categories and NH defaults** for the lifestyle calculator (we'll pull these from the data sources above when building).
5. **Terms of service / disclaimer** for the tool and Blueprint (informational, not financial or clinical advice). Worth a light legal check before the paid product goes live.

---

## 10. Quick reference: data sources

| Need | Source | Notes |
|---|---|---|
| Live wages by occupation + location | CareerOneStop Web API | Free, needs API token, proxy via Netlify function |
| NH local wage granularity | NH Employment Security / ELMI | ~600 occupations, county + sub-state |
| Interest assessment | O*NET Interest Profiler | CC BY 4.0, embeddable widget + API, free |
| Occupation detail / outlook / training | CareerOneStop + O*NET OnLine | Maps via O*NET codes |
| Housing costs | HUD Fair Market Rents | Per NH county |
| Cost-of-living cross-check | MIT Living Wage Calculator | NH, by county |
| Health / loans / childcare | ACA, federal loan data, USDA | National, apply everywhere |
| Payments | Stripe | Separate from clinical practice |

---

# PART 2 — BUILD SPEC

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

---

# PART 3 — FRONT-END DESIGN + DATA

## Front-end design + logic reference

### Design tokens (use exactly)

Colors (CSS :root):
`--pine:#1c3a2a; --spruce:#2f5b41; --sage:#d7e2d6; --granite:#23282a; --slate:#5d6b63; --mist:#f1f4f0; --paper:#fbfcfa; --summit:#d98a2b; --summit-soft:#f6e7d2; --cover:#2f7d52; --short:#b9602f; --line:#d9e0d8;`

Fonts (Google Fonts): **Bricolage Grotesque** (display/headlines), **Hanken Grotesk** (body), **Space Mono** (all dollar figures).

Signature: faint topographic contour lines (SVG) in the hero and the Blueprint card. Summit gold used sparingly, only on the one number that matters and the primary CTA. Cool mist paper background, not warm cream.

### Layout / flow

Top bar (NH Ahead wordmark) → Hero ("Your future. Let's see how it adds up.") → **01 Where you'll live** (region cards) → **02 Build your life** (itemized bills, grouped) → **03 Your number** (pine panel, big salary figure) → **04 Careers** (fit badges + filters + the school/tuition-break hook) → **05 Blueprint offer** (dark pine card, $19) → footer. A fixed bottom bar shows region + monthly + salary-needed, updating live.

### Core logic

- 8 regions; housing (rent only) scales by region multiplier; round to nearest $10.
- Bills itemized and grouped (7 groups). Each option = {label, descriptor, monthly $}.
- Savings = % of take-home: take-home = (all non-savings costs)/(1 - pct); its $ updates live.
- Student loans: manual mode (user picks a tier) OR auto mode (each career folds in its own loan: noDegree $0, twoYear ~$160, fourPlus ~$400, advanced/grad ~$700). Toggle in the careers section.
- Required salary grosses up the monthly total for federal + FICA (NH has no state income tax). Rough effective rate by bracket: <30k .13, <55k .16, <90k .19, <130k .22, else .25.
- Career fit: compare NH wage to required salary → "covers it, $X to spare" or "short by $X".

### Data (use verbatim)

```js
const REGIONS = [
  { id:'seacoast',  name:'Seacoast',        towns:'Portsmouth · Dover · Exeter',     mult:1.22 },
  { id:'southern',  name:'Southern Border', towns:'Nashua · Salem · Derry',          mult:1.18 },
  { id:'uppervly',  name:'Upper Valley',    towns:'Lebanon · Hanover · Claremont',   mult:1.20 },
  { id:'manch',     name:'Manchester Area', towns:'Manchester · Bedford · Hooksett', mult:1.05 },
  { id:'capital',   name:'Capital Region',  towns:'Concord · Bow · Pembroke',        mult:1.00 },
  { id:'lakes',     name:'Lakes Region',    towns:'Laconia · Plymouth · Meredith',   mult:0.90 },
  { id:'monadnock', name:'Monadnock',       towns:'Keene · Peterborough · Jaffrey',  mult:0.88 },
  { id:'north',     name:'North Country',   towns:'Berlin · Littleton · Conway',     mult:0.78 },
];
let regionId = 'lakes';
const region = () => REGIONS.find(r => r.id === regionId);

const GROUPS = ['Home','Phone & internet','Getting around','Food','Health','Money habits','Fun & extras'];

/* each option: { t:label, d:descriptor (what it looks like), v:monthly $ } */
const CATEGORIES = [
  // HOME
  { id:'rent', group:'Home', label:'Rent or mortgage', regional:true,
    note:"Your biggest bill by a mile, and the one where <b>where you live</b> matters most.",
    options:[
      {t:'With family or roommates', d:'splitting costs, just your share', v:700},
      {t:'Studio or 1-bedroom', d:'your own small place', v:1650},
      {t:'2-bedroom apartment', d:'more room, or a roommate to split it', v:2050},
      {t:'Renting a house', d:'a whole house, yard and all', v:2600},
      {t:'Buying a home', d:'mortgage, taxes, insurance, you own it', v:2900},
    ], def:1 },
  { id:'heat', group:'Home', label:'Heat',
    note:"Welcome to New Hampshire, where winter has opinions. Oil and propane add up fast.",
    options:[
      {t:'Small place', d:'apartment or small unit', v:90},
      {t:'Average home', d:'typical house through a NH winter', v:160},
      {t:'Big or drafty place', d:'large or older, leaky house', v:240},
    ], def:1 },
  { id:'power', group:'Home', label:'Electricity',
    note:"Lights, fridge, hot showers, charging everything. NH rates run on the high side.",
    options:[
      {t:'Small place', d:'one person, the basics', v:70},
      {t:'Average home', d:'typical household use', v:110},
      {t:'Bigger place', d:'more space, more devices', v:160},
    ], def:1 },
  { id:'renters', group:'Home', label:"Renter's insurance",
    note:"Cheap protection for your stuff if there's a fire or burst pipe. Most people don't know it exists. Now you do.",
    options:[
      {t:'Skip it', d:'nothing covered if something goes wrong', v:0},
      {t:'Basic coverage', d:'your belongings protected', v:18},
    ], def:1 },
  // PHONE & INTERNET
  { id:'internet', group:'Phone & internet', label:'Internet',
    note:"Non-negotiable, unless you're a fan of the spinning loading wheel.",
    options:[
      {t:'Basic', d:'browsing and email, one person', v:50},
      {t:'Standard', d:'streaming and video calls', v:70},
      {t:'Fast, whole-house', d:'gaming, 4K, a few people at once', v:90},
    ], def:1 },
  { id:'phone', group:'Phone & internet', label:'Cell phone',
    note:"That shiny $1,000 phone is really a monthly bill in a trench coat.",
    options:[
      {t:'On a family plan', d:'covered by family, $0 to you', v:0},
      {t:'Budget prepaid', d:'older phone, cheaper carrier', v:40},
      {t:'Standard plan', d:'normal phone and data', v:70},
      {t:'Newest phone, on payments', d:'latest model financed into the bill', v:110},
    ], def:2 },
  // GETTING AROUND
  { id:'carpay', group:'Getting around', label:'Car payment',
    note:"A car is more than the sticker. Financing one means this shows up every single month.",
    options:[
      {t:'No car', d:"you don't drive", v:0},
      {t:'Used car, paid off', d:'you own it outright, $0 payment', v:0},
      {t:'Making payments', d:'financing a used car', v:300},
      {t:'New car payment', d:'newer car, bigger payment', v:500},
    ], def:1 },
  { id:'gas', group:'Getting around', label:'Gas',
    note:"NH is spread out. Unless you live on top of your job, the gas tank will find you.",
    options:[
      {t:'No car / I walk', d:'no fuel costs', v:0},
      {t:'A little driving', d:'short hops, around town', v:90},
      {t:'Average', d:'about 20 to 30 min each way', v:160},
      {t:'Long rural commute', d:'45+ min each way', v:240},
    ], def:2 },
  { id:'carins', group:'Getting around', label:'Car insurance',
    note:"Required by law to drive. Younger drivers pay more, sorry, that's just how it goes.",
    options:[
      {t:'No car / on family plan', d:'not paying your own', v:0},
      {t:'Basic coverage', d:'state minimum, older car', v:110},
      {t:'Full coverage', d:'newer or financed car', v:180},
    ], def:1 },
  // FOOD
  { id:'groceries', group:'Food', label:'Groceries',
    note:"Cooking at home is the easiest money lever you've got. Quietly powerful.",
    options:[
      {t:'Bare bones', d:'store brands, simple meals, cook it all', v:260},
      {t:'Normal', d:'name brands, fresh plus some convenience', v:400},
      {t:'I eat well', d:'organic, premium meats, fresh everything', v:520},
    ], def:1 },
  { id:'eatout', group:'Food', label:'Eating out & coffee',
    note:"A daily coffee run alone is about $150 a month. No judgment. Okay, a little.",
    options:[
      {t:'Rarely', d:'once or twice a month', v:50},
      {t:'About once a week', d:'one night out a week', v:140},
      {t:'A few times a week', d:'2 to 3 meals out a week', v:300},
      {t:'Basically daily', d:'a meal or coffee out most days', v:520},
    ], def:1 },
  // HEALTH
  { id:'healthins', group:'Health', label:'Health insurance',
    note:"Once you're off a parent's plan, this becomes a very real adult bill. It surprises people.",
    options:[
      {t:"On a parent's plan", d:'covered until you turn 26, $0 to you', v:0},
      {t:'Through your job', d:'employer pays most, you pay a share', v:120},
      {t:'On your own (marketplace)', d:'you buy it yourself, full premium', v:350},
    ], def:1 },
  { id:'care', group:'Health', label:'Out-of-pocket care',
    note:"Copays, prescriptions, the dentist you keep avoiding. Even insured, care costs something.",
    options:[
      {t:'Rarely go', d:'a checkup, maybe one visit a year', v:30},
      {t:'Average', d:'a few visits plus a prescription', v:80},
      {t:'Regular needs', d:'ongoing meds or regular care', v:180},
    ], def:1 },
  // MONEY HABITS
  { id:'savings', group:'Money habits', label:'Savings', percent:true,
    note:"Pick a percent of your take-home pay and we'll do the math. Notice how the same percent is a different dollar amount depending on the life you build.",
    options:[
      {t:'Not yet', d:'nothing set aside for now', pct:0},
      {t:'Save 5%', d:'a starter habit', pct:0.05},
      {t:'Save 10%', d:'a solid, recommended habit', pct:0.10},
      {t:'Save 15%', d:'really paying your future self first', pct:0.15},
    ], def:1 },
  { id:'studentloans', group:'Money habits', label:'Student loans',
    note:"The bill that comes with a diploma. If a path below needs a degree, come back and set this to match it.",
    options:[
      {t:'No student loans', d:'scholarships, paid as you went, or a no-degree path', v:0},
      {t:'2-year degree', d:'community college, paid over about 10 years', v:160},
      {t:'4-year degree', d:'NH grads carry some of the highest debt in the US', v:400},
      {t:'Advanced degree', d:"master's or doctorate, a bigger balance", v:700},
    ], def:0 },
  { id:'debt', group:'Money habits', label:'Credit cards & other debt',
    note:"Card balances and other loans, not your car or student loans, those have their own lines above.",
    options:[
      {t:'None', d:'no card balances or other loans', v:0},
      {t:'Some', d:'a card balance you carry month to month', v:120},
      {t:'A lot', d:'multiple cards or personal loans', v:280},
    ], def:0 },
  // FUN & EXTRAS
  { id:'clothing', group:'Fun & extras', label:'Clothing & personal care',
    note:"Haircuts, shampoo, the occasional new fit. Small, steady, easy to forget.",
    options:[
      {t:'Just basics', d:'replace things as they wear out', v:50},
      {t:'Average', d:'a few new things each season', v:120},
      {t:'I like to shop', d:'regular new clothes and grooming', v:240},
    ], def:1 },
  { id:'fun', group:'Fun & extras', label:'Fun & going out',
    note:"Streaming, concerts, the ski pass, going out. Fun is allowed. Fun just isn't free.",
    options:[
      {t:'Low-key', d:'streaming and the occasional outing', v:70},
      {t:'Some fun', d:'a night out most weeks, plus a hobby', v:200},
      {t:'Big social life', d:'concerts, travel, season pass, going out', v:400},
    ], def:1 },
];

const NH_CAREERS = [
  { t:'Retail Salesperson',   wage:36000, level:'noDegree', path:'On-the-job training' },
  { t:'Medical Assistant',    wage:44000, level:'noDegree', path:'~1-year certificate' },
  { t:'Welder',               wage:52000, level:'noDegree', path:'Trade program or apprenticeship' },
  { t:'Auto Service Tech',    wage:52000, level:'noDegree', path:'Vocational program + ASE certs' },
  { t:'Paramedic',            wage:52000, level:'noDegree', path:'EMT then paramedic training' },
  { t:'Carpenter',            wage:55000, level:'noDegree', path:'Apprenticeship, 3–4 years' },
  { t:'CDL Truck Driver',     wage:56000, level:'noDegree', path:'CDL training, a few weeks' },
  { t:'HVAC Technician',      wage:60000, level:'noDegree', path:'Trade program + apprenticeship' },
  { t:'Plumber',              wage:64000, level:'noDegree', path:'Apprenticeship, then NH license' },
  { t:'Police Officer',       wage:67000, level:'noDegree', path:'Academy + on-the-job training' },
  { t:'Electrician',          wage:68000, level:'noDegree', path:'4-year apprenticeship, then license' },
  { t:'Respiratory Therapist',wage:72000, level:'twoYear',  path:'2-year degree + license' },
  { t:'Dental Hygienist',     wage:82000, level:'twoYear',  path:'2-year degree + NH license' },
  { t:'Registered Nurse',     wage:82000, level:'twoYear',  path:'2–4 year degree + NH license' },
  { t:'Elementary Teacher',   wage:62000, level:'fourPlus', path:'4-year degree + NH license' },
  { t:'Accountant',           wage:78000, level:'fourPlus', path:'4-year degree' },
  { t:'Mechanical Engineer',  wage:96000, level:'fourPlus', path:'4-year degree' },
  { t:'Physical Therapist',   wage:98000, level:'fourPlus', grad:true, path:'Doctor of Physical Therapy' },
  { t:'Software Developer',   wage:105000,level:'fourPlus', path:'4-year degree or strong portfolio' },
  { t:'Marketing Manager',    wage:120000,level:'fourPlus', path:'Degree + experience' },
];
```

---

# PART 4 — SITE COPY

*All copy in your voice: warm, plain, direct, encouraging, no jargon, no em dashes. Headlines give a few options so you can pick. Mark it up freely.*

---

## Homepage

### Hero headline — CHOSEN: "Your future. Let's see how it adds up."

*(Two-line treatment: calm first line, warm "let's" invitation second. Other options kept below for reference.)*

1. See if the life you want adds up.
2. The life you want, and what it takes to live it here.
3. Figure out your future with real New Hampshire numbers.

### Hero subhead

Pick where in New Hampshire you want to live, build the life you picture, and see which careers can actually pay for it. Free, honest, and built right here in NH.

### Hero button

Start with where you'll live →

### Trust line (small, under the button)

No account. Nothing saved. Just you and the numbers.

---

## How it works (three steps)

**It takes about five minutes, and there are no wrong answers.**

**1. Pick your corner of New Hampshire.**
Start with location, because it changes everything. The same life costs thousands more or less a year depending on whether you settle on the Seacoast, in the Lakes Region, or up in the North Country.

**2. Build the life you want.**
Choose the housing, the car, the food, the fun. We add it up as you go and show you what that life really costs to live here.

**3. See what gets you there.**
We show you New Hampshire careers, what they pay here, and how to train for them. Green means the pay covers the life you built. A gap isn't a no, it's just something to plan around.

---

## Why it's different

**Built for New Hampshire, not the whole country.**
Most career tools hand you national averages that don't match what things actually cost or pay where you live. This one runs on real New Hampshire numbers, down to the part of the state you're in.

**Made by a counselor, not a corporation.**
This started in a counseling practice, from years of sitting with people figuring out their next step. It's built to feel like a real conversation, not a quiz that spits out a score.

**Honest about the trade-offs.**
This won't tell you to follow your dreams and figure out the money later. It shows you both at once, while you still have plenty of room to choose.

---

## The Blueprint (paid upsell)

### Section headline

Want it all in one place?

### Body

The reality check is yours to use as much as you like, free. If you want to walk away with a real plan, the Blueprint pulls it all together: your strengths and interests, the life you built, your best-matched New Hampshire careers, the training paths to get there, and a clear set of next steps. It's written to feel like someone who gets it sat down and mapped it out with you.

### Price line

One time. Yours to keep. **$19.**

### Button

Build my Blueprint →

### Reassurance line

No subscription, no upsell after. One plan, one price.

---

## Short FAQ

**Is this really free?**
The reality check is, completely, and there's no account to make. The Blueprint is the only paid part, and it's a one-time $19 if you want it.

**Do you save my information?**
No. Nothing you choose is stored or tied to your name. When you close the tab, it's gone. The Blueprint only gets made if you ask for one.

**Where do the numbers come from?**
Wages come from U.S. Department of Labor data for New Hampshire. Living costs come from public housing and cost-of-living data for the part of the state you pick. They're kept current and meant as solid estimates, not promises.

**I'm a parent. Can I use this with my kid?**
Absolutely. A lot of families go through it together. It's a good way to have the "what's next" conversation without it turning into a lecture.

**What if no career covers the life I built?**
That happens, and it's useful information, not bad news. It usually means adjusting the life, the path, or the training plan. The tool helps you see which.

---

## Footer disclaimer (short, plain)

NH Ahead is for information and personal planning only. It is not financial, legal, or clinical advice, and it is not a promise of any job, pay, or outcome. Numbers are New Hampshire estimates and will vary by employer, location, and experience. Use it as a starting point, and check the current details before you make big decisions.

---

## Full disclaimer / terms (plain-language version)

*Have a lawyer give this a quick look before launch, but here's a plain, honest starting draft. This intentionally avoids legalese so people actually read it.*

**What this is.**
NH Ahead is a free tool that helps you think through your future. You tell it where in New Hampshire you want to live and the kind of life you want, and it shows you what that life costs and which careers can pay for it. The optional Blueprint is a one-time purchase that puts your results into a personalized plan.

**What this is not.**
This is not financial advice, career counseling in a clinical or professional sense, legal advice, or tax advice. It does not create a counselor-client or any professional relationship. It cannot promise that any career will pay a certain amount, that you'll be hired, or that any path is right for you. You are the one who makes your decisions.

**About the numbers.**
Wage and cost figures are estimates drawn from public data sources, including U.S. Department of Labor wage data and public housing and cost-of-living data for New Hampshire. Real life varies. Pay differs by employer, experience, and exact location, and costs change over time. Treat every number here as a well-informed starting point, not a guarantee, and verify current details before acting on them.

**Your privacy.**
The reality check does not require an account and does not store the choices you make. If you buy a Blueprint, we collect only what's needed to create and deliver it and to process your payment, handled through a secure payment provider. We do not sell your information.

**Payments and refunds.**
The Blueprint is a one-time $19 purchase. [Insert your refund policy here, for example: If something goes wrong with your Blueprint, reach out within X days and we'll make it right.]

**Using the tool.**
Use NH Ahead for your own personal planning. Please don't copy, resell, or pass off the tool or the Blueprint as your own.

**Questions.**
Reach out any time at [your contact email].

---

## Voice notes (for whoever writes future copy)

- Talk like a person, not a brand. Short sentences. Plain words.
- Warm and direct at the same time. Honest without being harsh.
- Never talk down to teenagers. Never sound like a guidance pamphlet.
- A gap or a problem is framed as information, never as failure.
- No em dashes. No corporate filler ("empower," "unlock," "journey," "leverage").
- The reader is the hero. The tool is just the map.

---

# PART 5 — PROMO CODES

## First, the one mechanic to know

In Stripe there are two layers:
- A **coupon** = the discount itself (e.g. "100% off" or "$3 off").
- A **promotion code** = the actual word someone types (e.g. NORTHERNPINE), attached to a coupon.

One coupon can have many codes. So your 5 free codes can all sit under a single "100% off" coupon, and your discount codes under their own coupons.

Set these all up in the Stripe Dashboard under Product catalog → Coupons. No building required. **Test them in Stripe test mode before going live.**

---

## Full-free codes (100% off) — for counselors, events, testers

Keep these less public than NORTHERNPINE. The named ones are naturally self-limiting because you hand them out on purpose. Put a redemption cap on each anyway.

| Code | For | Discount | Limit |
|---|---|---|---|
| JENN2026 | Jenn (first counselor contact), so you can see when it's used | 100% off | 25 uses, expires end of 2026 |
| COUNSELOR | General code to hand to school staff | 100% off | 50 uses |
| FAMILYNIGHT | Group events where everyone gets one on you | 100% off | 50 uses, set per event |
| FOUNDING | Early testers who give feedback | 100% off | 15 uses |
| GRANITE | Spare free code to hand out personally as needed | 100% off | 25 uses |

## Discount codes — for the public and launch

| Code | For | Discount | Limit |
|---|---|---|---|
| NORTHERNPINE | Your friendly, say-it-out-loud code (practice-connected) | $2–3 off | no cap, or high cap |
| LAUNCH | Early-bird for the first buyers | $5 off | expires ~30–60 days after launch |
| WELCOME | Optional small standing discount for new visitors | $2 off | no cap |
| NHAHEAD | On-brand, easy to remember | $2–3 off | no cap |
| SCHOOL | A school offering it to families at a reduced price (not free) | 50% off | per-agreement cap |

---

## Rules of thumb

- **Cap the free codes** (25–50 uses each) so a leaked code stops itself.
- **Expire time-sensitive codes** (LAUNCH, event codes) so they don't linger.
- **Never make NORTHERNPINE 100% off** — it's your public code; keep it a modest discount.
- You can create as many codes as you want later; this is just a starter set.

---

# PART 6 — COUNSELOR OUTREACH

## Send timing

**Send in August 2026, before the school year starts** (before counselors and social workers get slammed). Charli's call, and a good one.

## Jenn — school social worker (personal contact), finalized in Charli's voice

**Subject:** (suggested) A free NH tool for future planning

Hey Jenn,

I hope you are having a wonderful and much deserved summer break! I wanted to let you know that I built a free, New Hampshire-specific career and future-planning tool called NH Ahead (nhahead.com). It walks students through what a life here really costs and which NH careers and training paths can pay for it, including a tuition-break option a lot of families miss that can save thousands. I was finding that a lot of students/clients are having an extreme amount of anxiety regarding future planning without any grasp of real numbers. Additionally, I think this will help motivate students towards higher education which as you know, has been on the decline. It's a pretty simple concept and I am jazzed to share. It works alongside whatever platform your school already uses. No account, nothing to set up, and it runs on a phone.

I also have a short one-page guide on using it in advisory or at a family night, and if it's ever helpful, I'm glad to come present it to students or families myself.

Let me know if you have any questions and as always, thank you for the work you do, it matters.

Charli McCarthy

---

## Attachment when Jenn replies

The one-page counselor guide (nh-ahead-counselor-guide file). Fill in name/email brackets before sending.

## Notes for the broader counselor list (later)

- Personalize the first line where possible.
- Send individually or BCC, never a visible group email.
- Lead with the free tool; the $19 Blueprint is disclosed in the guide, never pitched to counselors to sell.
- Replies offering to present to families = warm leads toward future paid workshops.
