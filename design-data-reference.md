# NH Ahead — Front-end design + data reference

## Design tokens (use exactly)
Colors (CSS :root):
--pine:#1c3a2a; --spruce:#2f5b41; --sage:#d7e2d6; --granite:#23282a;
--slate:#5d6b63; --mist:#f1f4f0; --paper:#fbfcfa; --summit:#d98a2b;
--summit-soft:#f6e7d2; --cover:#2f7d52; --short:#b9602f; --line:#d9e0d8;

Fonts (Google Fonts): Bricolage Grotesque (display/headlines), Hanken Grotesk (body), Space Mono (all dollar figures).
Signature element: faint topographic contour lines (SVG) in the hero and the Blueprint card. Summit gold used sparingly, only on the one number that matters and the primary CTA. Cool mist paper background, not warm cream.

## Layout / flow
Top bar (NH Ahead wordmark) → Hero ("Your future. Let's see how it adds up.") → Step 01 Where you'll live (region cards) → Step 02 Build your life (itemized bills, grouped) → Step 03 Your number (pine panel, big salary figure) → Step 04 Careers (fit badges + filters + the school/tuition-break hook) → Step 05 Blueprint offer (dark pine card, $19) → footer. A fixed bottom bar shows region + monthly + salary-needed, updating live.

## Core logic
- 8 regions; housing (rent only) scales by region multiplier; round to nearest $10.
- Bills itemized and grouped (7 groups). Each option = {label, descriptor, monthly $}.
- Savings = % of take-home: take-home = (all non-savings costs)/(1 - pct); its $ updates live.
- Student loans: manual mode (user picks a tier) OR auto mode (each career folds in its own loan: noDegree $0, twoYear ~$160, fourPlus ~$400, advanced/grad ~$700). Toggle in the careers section.
- Required salary = grosses up monthly total for federal + FICA (NH has no state income tax). Rough effective rate by bracket: <30k .13, <55k .16, <90k .19, <130k .22, else .25.
- Career fit: compare NH wage to required salary → "covers it, $X to spare" or "short by $X".

## DATA (use verbatim)

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
// default region: 'lakes'

const GROUPS = ['Home','Phone & internet','Getting around','Food','Health','Money habits','Fun & extras'];

// each option: { t:label, d:descriptor, v:monthly $ }  (savings uses pct instead of v)
const CATEGORIES = [
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
  { t:'Carpenter',            wage:55000, level:'noDegree', path:'Apprenticeship, 3-4 years' },
  { t:'CDL Truck Driver',     wage:56000, level:'noDegree', path:'CDL training, a few weeks' },
  { t:'HVAC Technician',      wage:60000, level:'noDegree', path:'Trade program + apprenticeship' },
  { t:'Plumber',              wage:64000, level:'noDegree', path:'Apprenticeship, then NH license' },
  { t:'Police Officer',       wage:67000, level:'noDegree', path:'Academy + on-the-job training' },
  { t:'Electrician',          wage:68000, level:'noDegree', path:'4-year apprenticeship, then license' },
  { t:'Respiratory Therapist',wage:72000, level:'twoYear',  path:'2-year degree + license' },
  { t:'Dental Hygienist',     wage:82000, level:'twoYear',  path:'2-year degree + NH license' },
  { t:'Registered Nurse',     wage:82000, level:'twoYear',  path:'2-4 year degree + NH license' },
  { t:'Elementary Teacher',   wage:62000, level:'fourPlus', path:'4-year degree + NH license' },
  { t:'Accountant',           wage:78000, level:'fourPlus', path:'4-year degree' },
  { t:'Mechanical Engineer',  wage:96000, level:'fourPlus', path:'4-year degree' },
  { t:'Physical Therapist',   wage:98000, level:'fourPlus', grad:true, path:'Doctor of Physical Therapy' },
  { t:'Software Developer',   wage:105000,level:'fourPlus', path:'4-year degree or strong portfolio' },
  { t:'Marketing Manager',    wage:120000,level:'fourPlus', path:'Degree + experience' },
];
```
