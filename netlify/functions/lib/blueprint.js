// Builds the personalized Blueprint: merges a paid session's budget
// snapshot + RIASEC quiz result (+ optional first name from checkout) into
// structured data, then renders that data into a standalone, print-ready
// HTML document for PDFShift to convert to a PDF. Reuses the same
// career/interest/wage data as the front end (public/js/data.js,
// public/js/interests.js, lib/wages.js) so the numbers never drift between
// the free tool and the paid Blueprint.

const { REGIONS, DEFAULT_REGION, GROUPS, CATEGORIES, MA_CAREERS } = require('../../../public/js/data.js');
const { RIASEC_LABELS, careerFitScore } = require('../../../public/js/interests.js');
const { getWages } = require('./wages.js');
const { getSchools } = require('./schools.js');

const RIASEC_BLURBS = {
  R: 'You like working with your hands and seeing something real come together, whether that is a machine, a building, or a system.',
  I: 'You like figuring out how things work and solving problems that take real thought.',
  A: 'You like making something original, whether that is visual, written, or just a good idea nobody else thought of.',
  S: 'You like helping people directly and being part of the reason someone else\'s day, or life, goes better.',
  E: 'You like leading, persuading, and building something, whether that is a team, a business, or a plan.',
  C: 'You like order, accuracy, and knowing exactly where things stand.',
};

const TRAIT_CARDS = {
  R: [{ h: 'Hands-on', d: 'You like working with your hands and seeing something real come together.' }, { h: 'Practical', d: "You'd rather do the thing than just talk about it." }],
  I: [{ h: 'Curious', d: 'You like figuring out how and why things work.' }, { h: 'Analytical', d: 'You think problems through instead of guessing.' }],
  A: [{ h: 'Original', d: 'You like making something nobody else would have made quite the same way.' }, { h: 'Expressive', d: 'You have a point of view and like putting it out there.' }],
  S: [{ h: 'Good with people', d: 'People trust you and feel calmer around you.' }, { h: 'Steady under pressure', d: 'You keep your head when things get busy or hard.' }],
  E: [{ h: 'Persuasive', d: 'You can get people on board with an idea.' }, { h: 'Driven', d: 'You like building something and pushing it forward.' }],
  C: [{ h: 'Organized', d: 'You like order and knowing exactly where things stand.' }, { h: 'Reliable', d: 'People know things get done when they are on your list.' }],
};

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmt(n){
  return '$' + Math.round(n).toLocaleString('en-US');
}

function regionFor(regionId){
  return REGIONS.find(r => r.id === regionId) || REGIONS.find(r => r.id === DEFAULT_REGION);
}

function categoryMonthly(cat, optIndex, regionMult){
  const opt = cat.options[optIndex];
  if (cat.percent || !opt) return null;
  if (!cat.regional) return opt.v;
  return Math.round((opt.v * regionMult) / 10) * 10;
}

function cheapestOption(cat){
  let best = 0;
  cat.options.forEach((opt, i) => { if (opt.v < cat.options[best].v) best = i; });
  return best;
}

function topSpendingLevers(selections, regionMult){
  if (!selections) return [];
  const levers = [];
  CATEGORIES.forEach(cat => {
    if (cat.percent) return;
    const currentIdx = selections[cat.id];
    if (currentIdx === undefined) return;
    const cheapIdx = cheapestOption(cat);
    if (cheapIdx === currentIdx) return;
    const current = categoryMonthly(cat, currentIdx, regionMult);
    const cheapest = categoryMonthly(cat, cheapIdx, regionMult);
    const savings = current - cheapest;
    if (savings > 0){
      levers.push({ label: cat.label, savings, altLabel: cat.options[cheapIdx].t });
    }
  });
  return levers.sort((a, b) => b.savings - a.savings).slice(0, 2);
}

function buildBudgetRows(selections, regionMult, monthlyTotal){
  if (!selections || !monthlyTotal) return null;
  const rows = GROUPS.map(group => {
    let sum = 0;
    CATEGORIES.filter(c => c.group === group && !c.percent).forEach(cat => {
      const idx = selections[cat.id];
      if (idx === undefined) return;
      sum += categoryMonthly(cat, idx, regionMult);
    });
    return { label: group, value: sum };
  });
  const savingsCat = CATEGORIES.find(c => c.percent);
  const savingsIdx = selections[savingsCat.id];
  const pct = (savingsCat.options[savingsIdx] && savingsCat.options[savingsIdx].pct) || 0;
  rows.push({ label: 'Savings', value: monthlyTotal * pct });
  return rows;
}

function levelStats(career, schoolsForCareer){
  // trainYears lets specific careers override the flat per-level default,
  // since a 7-year flat assumption for every grad-level career understates
  // longer paths (MD, DDS, DVM) and overstates shorter ones (a master's).
  const trainingYears = career.trainYears || (career.grad ? 7 : (career.level === 'noDegree' ? 1 : career.level === 'twoYear' ? 2 : 4));

  // Prefer real median debt from the cheapest matched MA school (schools
  // arrive pre-sorted cheapest-first from lib/schools.js) over the rough
  // monthly-payment estimate, when College Scorecard actually has it.
  const realDebt = schoolsForCareer && schoolsForCareer.find(s => typeof s.debt === 'number');
  let loanDebt, debtIsReal;
  if (realDebt) {
    loanDebt = realDebt.debt;
    debtIsReal = true;
  } else {
    const studentLoanCat = CATEGORIES.find(c => c.id === 'studentloans');
    const loanByLevel = {
      noDegree: studentLoanCat.options[0].v,
      twoYear: studentLoanCat.options[1].v,
      fourPlus: studentLoanCat.options[2].v,
    };
    const gradLoanMonthly = studentLoanCat.options[3].v;
    const loanMonthly = career.grad ? gradLoanMonthly : (loanByLevel[career.level] || 0);
    loanDebt = loanMonthly * 120;
    debtIsReal = false;
  }

  const tenYearEarnings = Math.round(career.wage * Math.max(10 - trainingYears, 0)) - loanDebt;
  return { ...career, trainingYears, loanDebt, debtIsReal, tenYearEarnings };
}

function topCareerMatches(code){
  return MA_CAREERS
    .map(c => ({ ...c, fit: careerFitScore(code, c.riasec) }))
    .sort((a, b) => (b.fit - a.fit) || (b.wage - a.wage))
    .slice(0, 5);
}

function buildStrengthTraits(code){
  const first = code[0], second = code[1];
  const primaryCards = TRAIT_CARDS[first] || [];
  const secondaryCards = TRAIT_CARDS[second] || [];
  return [primaryCards[0], primaryCards[1], secondaryCards[0] || primaryCards[0]].filter(Boolean).slice(0, 3);
}

async function buildBlueprintData({ code, totals, budgetState, firstName }){
  const region = regionFor(budgetState && budgetState.region);
  const monthlyTotal = (budgetState && budgetState.monthlyTotal) || null;
  const salaryNeeded = (budgetState && budgetState.salaryNeeded) || null;
  const selections = budgetState && budgetState.selections;

  const cleaned = (code || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
  const safeCode = cleaned || 'RI';

  let matches = topCareerMatches(safeCode);
  const matchIds = matches.map(m => m.id);

  // Run wages + schools lookups in parallel, not sequentially, since each
  // has its own timeout budget and this function already has Stripe verify
  // + PDF build + email send competing for the same overall time limit.
  const [liveWages, schoolsByCareer] = await Promise.all([
    getWages(matchIds, { timeoutMs: 4000 }).catch(err => {
      console.error(`blueprint: getWages failed: ${err.message}`);
      return {};
    }),
    getSchools(matchIds, { timeoutMs: 4000 }).catch(err => {
      console.error(`blueprint: getSchools failed: ${err.message}`);
      return {};
    }),
  ]);

  matches = matches.map(m => {
    const live = liveWages[m.id];
    const entry = live ? live.entry : Math.round((m.wage * 0.82) / 1000) * 1000;
    const experienced = live ? live.experienced : Math.round((m.wage * 1.35) / 1000) * 1000;
    return { ...m, entry, experienced };
  });

  const topMatch = matches[0];
  const allCover = salaryNeeded ? matches.every(m => m.wage >= salaryNeeded) : true;
  const gap = (salaryNeeded && topMatch) ? salaryNeeded - topMatch.wage : 0;

  const fastBase = matches.find(m => m.level === 'noDegree') || matches[0];
  const longBase = matches.find(m => m.level !== 'noDegree' && m.id !== fastBase.id) || matches[1] || matches[0];
  const fastPath = levelStats(fastBase, schoolsByCareer[fastBase.id]);
  const longerPath = levelStats(longBase, schoolsByCareer[longBase.id]);

  const levers = gap > 0 ? topSpendingLevers(selections, region.mult) : [];
  const budgetRows = buildBudgetRows(selections, region.mult, monthlyTotal);
  const strengthTraits = buildStrengthTraits(safeCode);

  return {
    generatedAt: new Date(),
    firstName: firstName ? escapeHtml(firstName) : null,
    code: safeCode,
    totals: totals || {},
    strengthTraits,
    region,
    monthlyTotal,
    salaryNeeded,
    budgetRows,
    matches,
    topMatch,
    allCover,
    gap,
    fastPath,
    longerPath,
    levers,
    schoolsByCareer,
  };
}

function riasecParagraph(code){
  const first = code[0], second = code[1];
  const firstLabel = RIASEC_LABELS[first] || '';
  const secondLabel = RIASEC_LABELS[second] || '';
  let p = RIASEC_BLURBS[first] || '';
  if (second && RIASEC_BLURBS[second]) p += ` ${RIASEC_BLURBS[second]}`;
  return { firstLabel, secondLabel, paragraph: p };
}

function growthLine(m){
  return `${fmt(m.entry)} to start &rarr; ${fmt(m.experienced)} with experience`;
}

function matchCardHtml(m, rank, salaryNeeded){
  const covers = salaryNeeded ? m.wage >= salaryNeeded : true;
  const diff = salaryNeeded ? Math.abs(m.wage - salaryNeeded) : 0;
  const badge = !salaryNeeded ? '' : covers
    ? `<span class="badge cover">Covers it, ${fmt(diff)} to spare</span>`
    : `<span class="badge short">Short by ${fmt(diff)}</span>`;
  return `
    <div class="match-wrap">
      <div class="match">
        <div class="rank">${rank}</div>
        <div class="m-main">
          <div class="m-top"><h3>${m.t}</h3><span class="pay mono">${fmt(m.wage)}<span class="pay-sub"> typical MA pay</span></span></div>
          <div class="why">${m.why || ''}</div>
          <div class="path"><b>Path:</b> ${m.path}</div>
          <div class="grow mono">${growthLine(m)}</div>
          ${badge}
        </div>
      </div>
    </div>`;
}

function pathCardHtml(tag, p){
  const debtLabel = p.debtIsReal ? 'Median debt (real, cheapest match)' : 'Rough loan debt (estimate)';
  return `
    <div class="pathcol">
      <div class="tophead">${tag}</div>
      <h4>${p.t}</h4>
      <div class="stat"><span>Training time</span><span class="v mono">~${p.trainingYears} yr${p.trainingYears === 1 ? '' : 's'}</span></div>
      <div class="stat"><span>Typical pay</span><span class="v mono">${fmt(p.wage)}</span></div>
      <div class="stat"><span>${debtLabel}</span><span class="v mono">${fmt(p.loanDebt)}</span></div>
      <div class="stat"><span>Est. earned in 10 yrs</span><span class="v mono">${fmt(Math.max(p.tenYearEarnings, 0))}</span></div>
    </div>`;
}

function twoPathsSummary(fast, long){
  if (fast.id === long.id) {
    return `Your matches point in a pretty consistent direction, ${fast.t} is both your fastest start and your best overall fit right now.`;
  }
  const yearsSooner = long.trainingYears - fast.trainingYears;
  const earningsGap = long.tenYearEarnings - fast.tenYearEarnings;
  let compare;
  if (Math.abs(earningsGap) < 15000) {
    compare = 'Over the first ten years, these two land in a pretty similar place.';
  } else if (earningsGap > 0) {
    compare = `Over the first ten years, ${long.t} comes out roughly ${fmt(earningsGap)} ahead, even after training time and loans.`;
  } else {
    compare = `Over the first ten years, ${fast.t} comes out roughly ${fmt(Math.abs(earningsGap))} ahead, since it gets you earning so much sooner.`;
  }
  const soonerLine = yearsSooner > 0
    ? `${fast.t} gets you earning and independent about ${yearsSooner} year${yearsSooner === 1 ? '' : 's'} sooner, with far less debt.`
    : '';
  return `${soonerLine} ${compare} Neither one is "the right answer." It comes down to whether you would rather start now or aim higher.`;
}

function honestReadHtml(data){
  const { topMatch, salaryNeeded, allCover, gap, levers } = data;
  if (!salaryNeeded || !topMatch) {
    return '<p>Take these numbers as a solid starting point. Come back to the free tool any time your plans change and see how the picture shifts.</p>';
  }
  let lead;
  if (allCover) {
    lead = `<p>Here's the good news: <b>every one of your top matches covers the life you built</b>, several with real room to spare. That means money is not the thing standing between you and this life, the pay works.</p>`;
  } else if (topMatch.wage >= salaryNeeded) {
    const diff = topMatch.wage - salaryNeeded;
    lead = `<p>Here's the good news: your top match, <b>${topMatch.t}</b>, pays ${fmt(topMatch.wage)} a year, which covers the ${fmt(salaryNeeded)} the life you built needs, with about ${fmt(diff)} a year to spare.</p>`;
  } else {
    lead = `<p>Right now, your top match, <b>${topMatch.t}</b>, pays ${fmt(topMatch.wage)} a year, and the life you built needs ${fmt(salaryNeeded)}. That's a gap of about ${fmt(gap)} a year. That's not bad news, it's just information. A gap this size usually closes with a mix of a couple of small trims and a little more time or experience, not a total rebuild of the plan.</p>`;
    if (levers.length){
      lead += `<p><b>A place to start:</b></p><ul>${levers.map(l => `<li>${l.label}: moving to "${l.altLabel}" would free up about ${fmt(l.savings)} a month.</li>`).join('')}</ul>`;
    }
  }
  const general = `<p><b>If a path ever comes up short,</b> three levers close the gap: <b>where you live</b> (the Seacoast needs thousands more a year than the North Country for the same life), <b>how much space you rent</b>, and <b>pay that grows with experience</b>, most of these careers pay noticeably more after a few years than they do starting out.</p>`;
  return lead + general;
}

// Split into intro (kept atomic with the section heading, so the heading
// can never strand alone) and groups (left free to flow across pages
// independently, each group already avoid-wrapped on its own).
function schoolsIntroHtml(withSchools){
  if (!withSchools.length){
    return '<p>For hands-on and two-year paths, Massachusetts\' 15 community colleges, spread across the state, are often the most affordable route to a license or certificate. For four-year and advanced paths, check in-state options first.</p>';
  }
  return '<p>Real Massachusetts schools that train for your top matches, cheapest first. Both figures are <b>per year</b>, not the full program: "sticker tuition" is in-state tuition before any aid, "avg. cost after aid" is what students there actually pay on average per year (school-wide across all programs, tuition plus room and board, minus grants). A 2-year program roughly doubles these, a 4-year program roughly quadruples them.</p>';
}

function schoolsGroupsHtml(withSchools){
  if (!withSchools.length) return '';
  const groups = withSchools.map(({ career, schools }) => {
    const rows = schools.map(s => {
      const place = s.city ? `${s.name} (${s.city})` : s.name;
      const tuition = (typeof s.tuition === 'number') ? fmt(s.tuition) : 'n/a';
      const netPrice = (typeof s.netPrice === 'number') ? `${fmt(s.netPrice)}/yr avg. cost after aid` : null;
      return `
        <div class="school-row">
          <span>${place}</span>
          <span class="v mono">${tuition}/yr sticker tuition${netPrice ? `<br><span class="net">${netPrice}</span>` : ''}</span>
        </div>`;
    }).join('');
    return `<div class="school-group"><div class="school-group-title">${career.t}</div>${rows}</div>`;
  }).join('');
  return `<div class="schools-list">${groups}</div>`;
}

function withSchoolsFor(matches, schoolsByCareer){
  // schoolsByCareer entries already come sorted cheapest-first from lib/schools.js.
  return matches
    .map(m => ({ career: m, schools: (schoolsByCareer[m.id] || []).slice(0, 3) }))
    .filter(x => x.schools.length);
}

function renderBlueprintHtml(data){
  const { code, firstName, strengthTraits, region, monthlyTotal, salaryNeeded, budgetRows, matches, fastPath, longerPath, schoolsByCareer, generatedAt } = data;
  const { firstLabel, secondLabel, paragraph } = riasecParagraph(code);
  const dateStr = generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const forLine = firstName ? `FOR &middot; ${firstName.toUpperCase()}, ${region.name.toUpperCase()}` : `FOR &middot; ${region.name.toUpperCase()}, MA`;
  const withSchools = withSchoolsFor(matches, schoolsByCareer || {});

  const budgetRowsHtml = budgetRows
    ? budgetRows.map(r => `<div class="row"><span>${r.label}</span><span class="v mono">${fmt(r.value)}</span></div>`).join('') +
      `<div class="row total"><span>Every month</span><span class="v mono">${fmt(monthlyTotal)}</span></div>`
    : '<div class="row"><span>Not available</span><span class="v mono">&mdash;</span></div>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Your MA Ahead Blueprint</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root{
    --pine:#1c2e42; --spruce:#35566f; --sage:#d7e0e8; --granite:#20272e;
    --slate:#5c6b76; --mist:#eef2f5; --paper:#ffffff; --summit:#b23a48;
    --summit-soft:#f3dbdd; --cover:#2f7d52; --short:#c17d3f; --line:#dde3e8;
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--granite); font-family:'Hanken Grotesk', sans-serif; line-height:1.6; font-size:13px; -webkit-font-smoothing:antialiased; }
  h1,h2,h3,h4 { font-family:'Bricolage Grotesque', sans-serif; margin:0; color:var(--pine); }
  .mono { font-family:'Space Mono', monospace; }
  p { margin:0 0 10px; }
  ul { margin:0 0 10px; padding-left:20px; }
  li { margin-bottom:4px; }
  a { color:var(--spruce); }

  /* cover */
  .cover { position:relative; background:var(--pine); color:var(--mist); padding:44px 48px 40px; overflow:hidden; }
  .cover svg { position:absolute; inset:0; width:100%; height:100%; opacity:0.16; color:var(--sage); }
  .cover .c-inner { position:relative; z-index:1; }
  .cover .kicker { font-size:0.74rem; letter-spacing:0.18em; text-transform:uppercase; color:var(--summit); font-weight:600; }
  .cover h1 { color:var(--paper); font-weight:700; letter-spacing:-0.03em; font-size:2.5rem; line-height:1.05; margin:12px 0 6px; }
  .cover h1 b { color:var(--summit); }
  .cover .who { font-size:1.02rem; color:var(--sage); }
  .cover .meta { margin-top:22px; font-family:'Space Mono', monospace; font-size:0.74rem; color:var(--sage); display:flex; gap:20px; flex-wrap:wrap; }

  .body-inner { padding:8px 48px 8px; }
  .intro { font-size:1.02rem; border-left:3px solid var(--summit); padding:4px 0 4px 18px; margin:28px 0 8px; }
  .intro b { color:var(--pine); }

  section { padding:26px 0; border-bottom:1px solid var(--line); }
  section:last-of-type { border-bottom:0; }
  .eyebrow { font-family:'Space Mono', monospace; font-size:0.72rem; color:var(--summit); letter-spacing:0.08em; text-transform:uppercase; page-break-after:avoid; }
  section h2 { font-weight:600; letter-spacing:-0.02em; font-size:1.35rem; margin:6px 0 14px; page-break-after:avoid; }
  /* page-break-after:avoid on headings isn't reliably honored by Chromium's
     print engine (same class of bug as the flex-container fragmentation
     issue elsewhere in this file), so each section's heading is wrapped
     with its first chunk of content in a block that must stay together,
     rather than relying on that property alone. */
  .sec-head-group { page-break-inside:avoid; }

  .code-pill { display:inline-flex; align-items:center; gap:8px; background:var(--sage); color:var(--pine); font-weight:600; padding:6px 14px; border-radius:999px; font-size:0.9rem; margin-bottom:14px; }
  .code-pill b { font-family:'Space Mono', monospace; }
  /* wrapper divs are plain block elements holding the break-avoid rule;
     Chromium's print engine doesn't reliably honor break-inside:avoid on
     flex/grid containers themselves, only on block ancestors of them. */
  .strengths-wrap { margin-top:6px; page-break-inside:avoid; }
  .strengths { display:flex; gap:10px; }
  .strengths .s { background:var(--mist); border-radius:10px; padding:12px 14px; flex:1; }
  .strengths .s .h { font-weight:600; color:var(--pine); font-size:0.9rem; }
  .strengths .s .d { font-size:0.8rem; color:var(--slate); }

  .budget { background:var(--mist); border-radius:12px; padding:22px; page-break-inside:avoid; }
  .budget-grid { display:grid; grid-template-columns:1.1fr 0.9fr; gap:22px; align-items:center; }
  .budget .need .lbl { font-size:0.76rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--slate); }
  .budget .need .big { font-family:'Space Mono', monospace; font-weight:700; font-size:2.3rem; color:var(--pine); line-height:1; margin:4px 0; }
  .budget .need .sub { font-size:0.86rem; color:var(--slate); }
  .budget .rows .row { display:flex; justify-content:space-between; font-size:0.84rem; padding:4px 0; border-bottom:1px dashed var(--line); }
  .budget .rows .row.total { border-bottom:0; font-weight:700; color:var(--pine); padding-top:6px; }

  .match-wrap { page-break-inside:avoid; }
  .match-wrap:last-child .match { border-bottom:0; }
  .match { display:flex; gap:14px; padding:14px 0; border-bottom:1px solid var(--line); }
  .rank { font-weight:700; color:var(--summit); font-size:1.25rem; width:26px; flex:none; font-family:'Bricolage Grotesque', sans-serif; }
  .m-main { flex:1; }
  .m-top { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
  .match h3 { margin:0; font-size:1.04rem; color:var(--granite); }
  .pay { font-weight:700; color:var(--pine); white-space:nowrap; }
  .pay-sub { font-weight:400; color:var(--slate); font-size:0.68rem; }
  .why { font-size:0.86rem; color:var(--slate); margin:4px 0 6px; }
  .path { font-size:0.82rem; color:var(--granite); }
  .path b { color:var(--spruce); }
  .grow { font-size:0.76rem; color:var(--spruce); margin-top:4px; }
  .badge { display:inline-block; margin-top:6px; border-radius:999px; padding:3px 10px; font-size:0.72rem; font-weight:700; }
  .badge.cover { background:rgba(47,125,82,0.14); color:var(--cover); }
  .badge.short { background:rgba(193,125,63,0.14); color:var(--short); }

  .twocol-wrap { margin-top:8px; page-break-inside:avoid; }
  .twocol { display:flex; gap:14px; }
  .pathcol { flex:1; border:1px solid var(--line); border-radius:12px; padding:16px; }
  .pathcol .tophead { font-size:0.7rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--summit); font-weight:700; }
  .pathcol h4 { margin:3px 0 12px; font-size:1.05rem; }
  .pathcol .stat { display:flex; justify-content:space-between; gap:10px; font-size:0.8rem; padding:5px 0; border-bottom:1px dashed var(--line); }
  .pathcol .stat:last-child { border-bottom:0; }
  .pathcol .stat .v { font-weight:700; color:var(--pine); }

  .callout { background:var(--summit-soft); border-radius:12px; padding:16px 18px; page-break-inside:avoid; }
  .callout p:last-child { margin-bottom:0; }
  .callout b { color:#8a5a12; }

  .tuition { background:var(--sage); border-radius:12px; padding:16px 18px; margin-top:14px; page-break-inside:avoid; }
  .tuition h4 { margin:0 0 6px; font-size:1rem; }
  .tuition .save { font-weight:700; color:var(--pine); }

  .school-group { background:var(--mist); border-radius:12px; padding:14px 18px; margin-bottom:12px; page-break-inside:avoid; }
  .school-group:last-child { margin-bottom:0; }
  .school-group-title { font-weight:700; color:var(--pine); font-size:0.9rem; margin-bottom:6px; }
  .school-row { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; font-size:0.86rem; padding:7px 0; border-bottom:1px dashed var(--line); }
  .school-row:last-child { border-bottom:0; }
  .school-row .v { color:var(--spruce); font-weight:700; white-space:nowrap; text-align:right; line-height:1.4; }
  .school-row .net { color:var(--slate); font-weight:400; font-size:0.76rem; }

  ol.steps { margin:6px 0 0; padding:0; counter-reset:step; list-style:none; }
  ol.steps li { position:relative; padding:9px 0 9px 38px; border-bottom:1px solid var(--line); font-size:0.9rem; }
  ol.steps li:last-child { border-bottom:0; }
  ol.steps li::before {
    counter-increment:step; content:counter(step);
    position:absolute; left:0; top:8px; width:24px; height:24px; border-radius:50%;
    background:var(--pine); color:var(--mist); font-family:'Space Mono', monospace;
    font-size:0.76rem; display:flex; align-items:center; justify-content:center; font-weight:700;
  }
  ol.steps li b { color:var(--pine); }

  .parent { background:#eaf0e8; border-radius:12px; padding:16px 18px; page-break-inside:avoid; }
  .parent ul { margin:8px 0 0; padding-left:20px; }
  .parent li { font-size:0.88rem; }

  .signoff { margin-top:18px; font-size:0.95rem; }
  .signoff .name { color:var(--pine); font-weight:600; }

  footer { background:var(--granite); color:#aab4ac; padding:44px 48px 24px; font-size:0.74rem; page-break-inside:avoid; }
  footer .f-eyebrow { font-family:'Space Mono', monospace; font-size:0.72rem; color:var(--summit); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:16px; }
  footer b { color:#fff; font-weight:600; }
</style>
</head>
<body>

<div class="cover">
  <svg viewBox="0 0 820 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="1.4">
      <path d="M-20,230 C150,196 280,250 420,212 C560,174 660,232 840,200"/>
      <path d="M-20,196 C150,164 280,216 420,178 C560,142 660,198 840,166"/>
      <path d="M-20,162 C160,132 290,182 420,146 C570,108 670,164 840,134"/>
      <path d="M-20,128 C170,100 300,148 420,114 C580,76 680,130 840,102"/>
      <path d="M-20,96 C180,70 310,116 420,84 C590,48 690,98 840,72"/>
      <path d="M-20,66 C190,44 320,86 420,56 C600,24 700,70 840,46"/>
    </g>
  </svg>
  <div class="c-inner">
    <div class="kicker">MA Ahead &middot; Your Blueprint</div>
    <h1>${firstName ? `${firstName}, here's` : "Here's"} your <b>map ahead</b>.</h1>
    <div class="who">A plan built from what you're good at, what you want, and what Massachusetts actually pays.</div>
    <div class="meta">
      <span>PREPARED &middot; ${dateStr.toUpperCase()}</span>
      <span>${forLine}</span>
      <span>INTEREST CODE &middot; ${firstLabel.toUpperCase()}${secondLabel ? ' / ' + secondLabel.toUpperCase() : ''}</span>
    </div>
  </div>
</div>

<div class="body-inner">

<p class="intro">This isn't a verdict on your future. It's a starting map. Everything here is meant to give you a clearer head start, not box you in. Read it, argue with it, and use the parts that fit.</p>

<section>
  <div class="sec-head-group">
    <div class="eyebrow">Your strengths</div>
    <h2>What you bring</h2>
    <span class="code-pill">Your interest code: <b>${firstLabel}${secondLabel ? ' + ' + secondLabel : ''}</b></span>
    <p>${paragraph}</p>
    <div class="strengths-wrap">
      <div class="strengths">
        ${strengthTraits.map(t => `<div class="s"><div class="h">${t.h}</div><div class="d">${t.d}</div></div>`).join('')}
      </div>
    </div>
  </div>
</section>

<section>
  <div class="sec-head-group">
    <div class="eyebrow">The life you built</div>
    <h2>What it costs to live it, in ${region.name}</h2>
    <div class="budget">
      <div class="budget-grid">
        <div class="need">
          <div class="lbl">You'd need to earn about</div>
          <div class="big mono">${salaryNeeded ? fmt(salaryNeeded) : '&mdash;'}</div>
          <div class="sub">a year, or about ${monthlyTotal ? fmt(monthlyTotal) : '&mdash;'} a month, to cover your costs. That already accounts for Massachusetts' flat 5% state income tax.</div>
        </div>
        <div class="rows">${budgetRowsHtml}</div>
      </div>
    </div>
  </div>
</section>

<section id="matches">
  <div class="sec-head-group">
    <div class="eyebrow">Where it points</div>
    <h2>Your top Massachusetts matches</h2>
    <p>These fit both sides of you: the kind of work you're drawn to, and pay that's real for Massachusetts. Sorted by fit first.</p>
    ${matchCardHtml(matches[0], 1, salaryNeeded)}
  </div>
  ${matches.slice(1).map((m, i) => matchCardHtml(m, i + 2, salaryNeeded)).join('')}
</section>

<section>
  <div class="sec-head-group">
    <div class="eyebrow">Two paths, ten years out</div>
    <h2>Start now, or aim higher?</h2>
    <p>Your matches usually split into two honest strategies. Here's how they roughly compare over the first ten years, counting the time spent training instead of earning, and the loans.</p>
    <div class="twocol-wrap">
      <div class="twocol">
        ${pathCardHtml('Start earning fast', fastPath)}
        ${pathCardHtml('More training, more ceiling', longerPath)}
      </div>
    </div>
  </div>
  <div class="callout" style="margin-top:14px"><p>${twoPathsSummary(fastPath, longerPath)}</p></div>
  <p style="font-size:0.74rem; color:var(--slate); font-style:italic; margin-top:8px;">Rough estimates for illustration, before raises and after typical loan payoff. Real numbers depend on your school, aid, and choices.</p>
</section>

<section>
  <div class="sec-head-group">
    <div class="eyebrow">Where you'd study</div>
    <h2>Real, nearby training paths</h2>
    ${schoolsIntroHtml(withSchools)}
  </div>
  ${schoolsGroupsHtml(withSchools)}
  <div class="tuition">
    <h4>The money-saving move a lot of people miss</h4>
    <p>If a path takes you to a public college in another New England state, Massachusetts residents can qualify for the <b>NEBHE Tuition Break</b>. It cuts the out-of-state price on over 1,400 approved programs, and the average student saves about <span class="save">$8,500 a year</span>. Search <a href="https://www.nebhe.org/tuition-break" target="_blank" rel="noopener">NEBHE's Tuition Break site</a> for your field before ruling out a school in Maine, New Hampshire, Vermont, Connecticut, or Rhode Island over the sticker price.</p>
  </div>
  <p style="margin-top:14px"><b>A few places to actually start looking for aid:</b></p>
  <ul>
    <li><a href="https://new.mefapathway.org/financial-planning/scholarship-search/" target="_blank" rel="noopener">MEFA Pathway's scholarship search</a>, the Massachusetts state authority's free college-planning platform with a Massachusetts-specific scholarship database.</li>
    <li><a href="https://studentaid.gov" target="_blank" rel="noopener">FAFSA</a> (studentaid.gov), the federal aid application. File it even if you're not sure you'll need it, it's free and it's how most grants and work-study get awarded.</li>
  </ul>
</section>

<section>
  <div class="sec-head-group">
    <div class="eyebrow">The honest read</div>
    <h2>Where things stand</h2>
    ${honestReadHtml(data)}
  </div>
</section>

<section>
  <div class="sec-head-group">
    <div class="eyebrow">For the parents in the room</div>
    <h2>If you're planning alongside them</h2>
    <div class="parent">
      <p>The most useful thing you can do with this plan is get curious, not directive. This works best as a conversation over the page, not a verdict handed down.</p>
      <p style="margin:10px 0 4px; font-weight:600; color:var(--pine);">A few openers that tend to land better than "so what's the plan":</p>
      <ul>
        <li>"Which of these surprised you?"</li>
        <li>"What would you want a normal day to feel like, more than what it pays?"</li>
        <li>"What's the scariest part of choosing, and can we take that piece apart together?"</li>
      </ul>
      <p style="margin-top:10px;">Try to resist fixing it. A gap on paper almost always has more than one fix, a different path, a little more time, or a life that costs a bit less to start.</p>
    </div>
  </div>
</section>

<section>
  <div class="sec-head-group">
  <div class="eyebrow">Next steps</div>
  <h2>What to actually do next</h2>
  <ol class="steps">
    <li><a href="#matches">Circle your <b>top two</b> matches above</a>. You don't have to pick one forever, just two to look into first.</li>
    <li>Look up those paths on <b>Massachusetts' <a href="https://lmi.dua.eol.mass.gov/lmi" target="_blank" rel="noopener">Labor Market Information site</a></b> for local openings and outlook.</li>
    <li>If a program you love is out of state, <b>check <a href="https://www.nebhe.org/tuition-break" target="_blank" rel="noopener">NEBHE Tuition Break</a> eligibility</b> before writing it off.</li>
    <li>Talk to your <b>school counselor</b> about which classes now line up with those paths.</li>
    <li><b>Talk to someone who does the job.</b> One real conversation tells you more than ten websites.</li>
    <li>Check <b><a href="https://new.mefapathway.org/financial-planning/scholarship-search/" target="_blank" rel="noopener">MEFA Pathway</a></b> and local scholarships for help paying for training, Massachusetts has more of this than most people realize.</li>
    <li><b><a href="https://maahead.com/" target="_blank" rel="noopener">Run the free tool again</a> in a year.</b> Your life and interests will shift, and your plan should too.</li>
  </ol>
  <div class="signoff">
    <p>You've got more options than it probably feels like right now, and the ones that fit you also pay well here. That's a good place to start from.</p>
    <p class="name">&mdash; Your MA Ahead plan</p>
  </div>
  </div>
</section>

</div>

<footer>
  <div class="f-eyebrow">Important information</div>
  <b>MA Ahead</b> &middot; maahead.com
  <div style="margin-top:10px; color:#828d84;"><b style="color:#c7cfc8;">This is information, not advice.</b> MA Ahead and this Blueprint are for personal planning and education only. Nothing here is financial, legal, tax, medical, or clinical advice, and nothing here is a promise of any job, wage, admission, loan, or outcome. It does not create a counselor-client or any professional relationship with you. You are the one who makes your own decisions, and we'd encourage you to verify anything important (program costs, admission requirements, loan terms) directly with the school, lender, or licensed professional before acting on it.</div>
  <div style="margin-top:10px; color:#828d84;"><b style="color:#c7cfc8;">Where this data comes from.</b> Wage figures: CareerOneStop, sponsored by the U.S. Department of Labor. School, tuition, net price, and debt figures: the College Scorecard, U.S. Department of Education. Interest/strengths results: your answers to this site's RIASEC interest questionnaire. All figures are the latest published snapshot from each source at the time this Blueprint was built, are typically 1-2 years behind the current year, and will vary by employer, program, and individual circumstances. Treat every number here as a solid, honest estimate, not a guarantee.</div>
  <div style="margin-top:10px; color:#828d84;">We don't sell or share what you enter. The only personal detail collected for this Blueprint is the email address (and optional first name) used at checkout, to deliver it to you.</div>
</footer>

</body>
</html>`;
}

module.exports = { buildBlueprintData, renderBlueprintHtml };
