// RIASEC (Holland Code) interest-assessment data + scoring.
//
// This question set is a fallback: netlify/functions/onet-questions.js
// fetches the official O*NET Mini Interest Profiler content live, and
// blueprint.js only falls back to RIASEC_QUESTIONS below if that fetch
// fails. Category tags (5 items per RIASEC letter) and the 1-5 Likert
// scale match O*NET's published Mini-IP model.

const RIASEC_LABELS = {
  R: 'Realistic',
  I: 'Investigative',
  A: 'Artistic',
  S: 'Social',
  E: 'Enterprising',
  C: 'Conventional',
};

const RIASEC_QUESTIONS = [
  { cat:'R', text:'Build kitchen cabinets' },
  { cat:'R', text:'Repair household appliances' },
  { cat:'R', text:'Drive a truck to deliver packages' },
  { cat:'R', text:'Assemble electronic parts' },
  { cat:'R', text:'Install flooring in a house' },

  { cat:'I', text:'Study the structure of the human body' },
  { cat:'I', text:'Develop a new medicine' },
  { cat:'I', text:'Investigate the cause of a fire' },
  { cat:'I', text:'Study the causes of a disease outbreak' },
  { cat:'I', text:'Work in a biology or chemistry lab' },

  { cat:'A', text:'Write a song' },
  { cat:'A', text:'Paint a mural' },
  { cat:'A', text:'Design a logo for a business' },
  { cat:'A', text:'Write a short story or novel' },
  { cat:'A', text:'Play an instrument in a band' },

  { cat:'S', text:'Teach a class' },
  { cat:'S', text:'Help people work through personal problems' },
  { cat:'S', text:'Take care of children at a daycare' },
  { cat:'S', text:'Plan activities for a community group' },
  { cat:'S', text:'Help someone who is struggling to read' },

  { cat:'E', text:'Start your own business' },
  { cat:'E', text:'Manage a department at a company' },
  { cat:'E', text:'Sell merchandise at a store' },
  { cat:'E', text:'Negotiate a contract' },
  { cat:'E', text:'Pitch an idea to a room of investors' },

  { cat:'C', text:'Keep records of financial transactions' },
  { cat:'C', text:'Organize files in an office' },
  { cat:'C', text:'Track a budget in a spreadsheet' },
  { cat:'C', text:'Proofread a document for errors' },
  { cat:'C', text:'Schedule appointments for an office' },
];

const RIASEC_SCALE = [
  { v:1, label:'Strongly dislike' },
  { v:2, label:'Dislike' },
  { v:3, label:'Unsure' },
  { v:4, label:'Like' },
  { v:5, label:'Strongly like' },
];

// answers: array parallel to `questions`, each entry 1-5 or null.
// `questions` defaults to the local placeholder set, but blueprint.js
// passes the live O*NET set here when it's available.
function computeRiasecScores(answers, questions){
  const list = questions || RIASEC_QUESTIONS;
  const totals = { R:0, I:0, A:0, S:0, E:0, C:0 };
  list.forEach((q, i) => {
    const v = answers[i];
    if (typeof v === 'number') totals[q.cat] += v;
  });
  return totals;
}

// Returns the top two RIASEC letters as a 2-char code, e.g. "SI".
function topRiasecCode(totals){
  const order = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
  return order.slice(0, 2).join('');
}

// Compares a user's 2-letter code against a career's tagged riasec code.
// Exact primary match counts most, exact secondary match counts less,
// and any overlap between the two codes counts partially.
function careerFitScore(userCode, careerCode){
  if (!userCode || !careerCode) return 0;
  const u = userCode.split('');
  const c = careerCode.split('');
  let score = 0;
  if (u[0] === c[0]) score += 2;
  else if (u.includes(c[0])) score += 1;
  if (u[1] && c[1]){
    if (u[1] === c[1]) score += 1;
    else if (u.includes(c[1])) score += 0.5;
  }
  return score;
}

if (typeof module !== 'undefined') {
  module.exports = {
    RIASEC_LABELS, RIASEC_QUESTIONS, RIASEC_SCALE,
    computeRiasecScores, topRiasecCode, careerFitScore,
  };
}
