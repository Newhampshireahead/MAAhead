// Rent multipliers are 2-bedroom market-rent ratios vs. the Central Mass
// baseline, built from FY2026 HUD Fair Market Rents (Worcester, Springfield/
// Pioneer Valley, Berkshire, Barnstable, and Boston-Cambridge-Newton Metro
// FMR areas) cross-checked against current Zumper city rent data for the
// Greater Boston sub-areas, which HUD itself prices as one uniform metro
// figure. Recheck yearly, HUD FMRs update every fiscal year.
const REGIONS = [
  { id:'boston',        name:'Greater Boston',    towns:'Boston · Cambridge · Somerville',    mult:1.50 },
  { id:'northshore',    name:'North Shore',       towns:'Salem · Beverly · Newburyport',      mult:1.24 },
  { id:'metrowest',     name:'MetroWest',         towns:'Framingham · Natick · Marlborough',  mult:1.19 },
  { id:'southshore',    name:'South Shore',       towns:'Quincy · Plymouth · Brockton',       mult:1.10 },
  { id:'capecod',       name:'Cape Cod & Islands',towns:'Barnstable · Falmouth · Hyannis',     mult:1.06 },
  { id:'centralmass',   name:'Central Mass',      towns:'Worcester · Shrewsbury · Leominster', mult:1.00 },
  { id:'pioneervalley', name:'Pioneer Valley',    towns:'Springfield · Northampton · Amherst', mult:0.80 },
  { id:'berkshires',    name:'The Berkshires',    towns:'Pittsfield · North Adams · Great Barrington', mult:0.77 },
];
const DEFAULT_REGION = 'centralmass';

const GROUPS = ['Home','Phone & internet','Getting around','Food','Health','Money habits','Fun & extras'];

const CATEGORIES = [
  { id:'rent', group:'Home', label:'Rent or mortgage', regional:true,
    note:"Your biggest bill by a mile, and the one where <b>where you live</b> matters most.",
    options:[
      {t:'With family or roommates', d:'splitting costs, just your share', v:850},
      {t:'Studio or 1-bedroom', d:'your own small place', v:1750},
      {t:'2-bedroom apartment', d:'more room, or a roommate to split it', v:2075},
      {t:'Renting a house', d:'a whole house, yard and all', v:2600},
      {t:'Buying a home', d:'mortgage, taxes, insurance, you own it', v:3100},
    ], def:1 },
  { id:'heat', group:'Home', label:'Heat',
    note:"Welcome to Massachusetts, where winter still has opinions, even close to the coast. Oil and propane add up fast.",
    options:[
      {t:'Small place', d:'apartment or small unit', v:90},
      {t:'Average home', d:'typical house through a Massachusetts winter', v:160},
      {t:'Big or drafty place', d:'large or older, leaky house', v:240},
    ], def:1 },
  { id:'power', group:'Home', label:'Electricity',
    note:"Lights, fridge, hot showers, charging everything. Massachusetts rates run on the high side.",
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
    note:"Depends a lot on where you land, close to the T and a car is optional, out past 495 and it isn't.",
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
      {t:'4-year degree', d:'the balance adds up faster than the sticker price suggests', v:400},
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

// Wages are estimated from Massachusetts' general BLS/OEWS wage differential
// vs. the national and prior NH figures (MA runs well above national median
// overall, more so in healthcare/tech/finance, less in trades/retail). These
// are placeholders pending the live CareerOneStop lookup (location=MA) in
// wages.js, same as the original build spec treated NH's hardcoded numbers
// before Milestone 2 wired up live data, re-verify once deployed.
const MA_CAREERS = [
  { id:'retail-salesperson',    t:'Retail Salesperson',   wage:40000, level:'noDegree', path:'On-the-job training',                riasec:'EC', why:'Fast to start, people-facing, and a good way to build comfort talking to anyone.' },
  { id:'medical-assistant',     t:'Medical Assistant',    wage:49000, level:'noDegree', path:'~1-year certificate',                riasec:'SC', why:'Hands-on patient care without years of school first, a real foot in the door of healthcare.' },
  { id:'welder',                t:'Welder',               wage:60000, level:'noDegree', path:'Trade program or apprenticeship',    riasec:'RC', why:"Building something solid and visible, with steady demand across Massachusetts' trades." },
  { id:'auto-service-tech',     t:'Auto Service Tech',    wage:58000, level:'noDegree', path:'Vocational program + ASE certs',     riasec:'RC', why:'Diagnosing and fixing real problems with your hands, one car at a time.' },
  { id:'paramedic',             t:'Paramedic',            wage:58000, level:'noDegree', path:'EMT then paramedic training',        riasec:'SR', why:'Pure hands-on helping, fast-paced and high-trust. One of the quickest paths here to start earning.' },
  { id:'carpenter',             t:'Carpenter',            wage:64000, level:'noDegree', path:'Apprenticeship, 3-4 years',          riasec:'RC', why:'Building something that lasts, with a trade you can eventually run on your own.' },
  { id:'cdl-truck-driver',      t:'CDL Truck Driver',     wage:62000, level:'noDegree', path:'CDL training, a few weeks',          riasec:'RC', why:'Independent, on-the-move work with one of the shortest training windows on this list.' },
  { id:'hvac-technician',       t:'HVAC Technician',      wage:68000, level:'noDegree', path:'Trade program + apprenticeship',     riasec:'RC', why:'Steady, in-demand trade work. Massachusetts winters and summers both keep HVAC techs busy.' },
  { id:'plumber',               t:'Plumber',              wage:75000, level:'noDegree', path:'Apprenticeship, then MA license',    riasec:'RC', why:'A licensed trade with real earning power and steady local demand.' },
  { id:'police-officer',        t:'Police Officer',       wage:78000, level:'noDegree', path:'Academy + on-the-job training',      riasec:'RS', why:'Structured, people-facing, high-responsibility work with a clear training path.' },
  { id:'electrician',           t:'Electrician',          wage:80000, level:'noDegree', path:'4-year apprenticeship, then license',riasec:'RC', why:'One of the better-paid trades, with a defined apprenticeship path to a license.' },
  { id:'respiratory-therapist', t:'Respiratory Therapist',wage:82000, level:'twoYear',  path:'2-year degree + license',             riasec:'SI', why:'Hands-on patient care with strong demand in Massachusetts hospitals, a two-year path to real pay.' },
  { id:'dental-hygienist',      t:'Dental Hygienist',     wage:95000, level:'twoYear',  path:'2-year degree + MA license',         riasec:'SI', why:'Predictable hours, steady pay, and direct patient care in a two-year program.' },
  { id:'registered-nurse',      t:'Registered Nurse',     wage:96000, level:'twoYear',  path:'2-4 year degree + MA license',       riasec:'SI', why:'One of the strongest all-around fits for people-focused, hands-on work, with real demand in Massachusetts.' },
  { id:'elementary-teacher',    t:'Elementary Teacher',   wage:70000, level:'fourPlus', path:'4-year degree + MA license',         riasec:'SA', why:'Shaping how kids see school and themselves, with summers built into the job.' },
  { id:'accountant',            t:'Accountant',           wage:88000, level:'fourPlus', path:'4-year degree',                      riasec:'CE', why:'Detail-focused, steady, and in demand in nearly every industry.' },
  { id:'mechanical-engineer',   t:'Mechanical Engineer',  wage:108000, level:'fourPlus', path:'4-year degree',                      riasec:'IR', why:'Solving real technical problems, with strong pay for a four-year degree.' },
  { id:'physical-therapist',    t:'Physical Therapist',   wage:110000, level:'fourPlus', grad:true, path:'Doctor of Physical Therapy', riasec:'SI', why:'Deep, hands-on patient care with one of the higher ceilings on this list, after a doctoral program.' },
  { id:'software-developer',    t:'Software Developer',   wage:128000,level:'fourPlus', path:'4-year degree or strong portfolio',  riasec:'IR', why:'Building and solving problems at a keyboard, with strong pay and flexible paths in.' },
  { id:'marketing-manager',     t:'Marketing Manager',    wage:138000,level:'fourPlus', path:'Degree + experience',                riasec:'EA', why:'Leading ideas and campaigns, best suited to someone who likes persuading and building.' },
  { id:'physician',             t:'Physician (Family Medicine)', wage:225000, level:'fourPlus', grad:true, trainYears:11, path:"Bachelor's + medical school (MD) + residency", riasec:'IS', why:'Deep, long-term patient relationships and real diagnostic problem-solving, for those willing to put in over a decade of training.' },
  { id:'physician-assistant',   t:'Physician Assistant',  wage:128000, level:'fourPlus', grad:true, trainYears:6, path:"Bachelor's + PA master's program + national certification", riasec:'SI', why:'Real clinical authority and hands-on patient care, in about half the training time of medical school.' },
  { id:'optometrist',           t:'Optometrist',          wage:132000, level:'fourPlus', grad:true, trainYears:8, path:"Bachelor's + Doctor of Optometry (OD)", riasec:'IS', why:'Hands-on eye care with your own patient panel, often with steadier hours than other doctoral health fields.' },
  { id:'mental-health-counselor', t:'Mental Health Counselor', wage:62000, level:'fourPlus', grad:true, trainYears:6, path:"Bachelor's + master's in counseling + MA LMHC license", riasec:'SA', why:"Sitting with people through the hardest parts of their lives, and helping them find their way through it." },
  { id:'dentist',               t:'Dentist',              wage:185000, level:'fourPlus', grad:true, trainYears:8, path:"Bachelor's + Doctor of Dental Surgery/Medicine (DDS/DMD)", riasec:'IR', why:'Hands-on precision work and direct patient relationships, one of the higher-paying doctoral health fields.' },
  { id:'pharmacist',            t:'Pharmacist',           wage:132000, level:'fourPlus', grad:true, trainYears:6, path:"Bachelor's coursework + Doctor of Pharmacy (PharmD)", riasec:'IC', why:'Precise, detail-heavy work at the intersection of science and direct patient care.' },
  { id:'veterinarian',          t:'Veterinarian',         wage:110000, level:'fourPlus', grad:true, trainYears:8, path:"Bachelor's + Doctor of Veterinary Medicine (DVM)", riasec:'IR', why:"Hands-on medicine for patients who can't tell you what's wrong, a mix of science and instinct." },
  { id:'lawyer',                t:'Lawyer',               wage:125000, level:'fourPlus', grad:true, trainYears:7, path:"Bachelor's + Juris Doctor (JD) + Massachusetts bar exam", riasec:'EI', why:'Building arguments and advocating for people, with real range from courtroom to contracts.' },
  { id:'hr-manager',            t:'HR Manager',           wage:118000, level:'fourPlus', path:"Bachelor's degree, often plus HR certification", riasec:'ES', why:'The person who actually makes a workplace function for the people in it, hiring, culture, and everything between.' },
  { id:'financial-analyst',     t:'Financial Analyst',    wage:98000,  level:'fourPlus', path:"Bachelor's degree in finance or a related field", riasec:'CE', why:'Reading the numbers behind a business decision before anyone else does.' },
  { id:'operations-manager',    t:'Operations Manager',   wage:112000, level:'fourPlus', path:"Bachelor's degree + experience", riasec:'EC', why:'Keeping the whole operation running, the person things actually go through to get done.' },
];

if (typeof module !== 'undefined') {
  module.exports = { REGIONS, DEFAULT_REGION, GROUPS, CATEGORIES, MA_CAREERS };
}
