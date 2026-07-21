// Shared College Scorecard lookup: finds real MA schools offering programs
// in a career's field of study. Used by both the public schools.js function
// (free tool) and generate-blueprint's "Where you'd study" section. Same
// cache-then-fetch shape as lib/wages.js.
//
// Careers with no formal degree/certificate program (on-the-job training
// only), or with no Title-IV-eligible MA program at all (many trade union
// apprenticeships aren't Title IV schools, so they don't appear in Scorecard
// no matter the CIP code), map to `null` or simply return no results, callers
// should fall back to generic guidance in either case.
//
// CIP codes below are the 4-digit Classification of Instructional Programs
// family (the finest grain Scorecard's API actually supports filtering by,
// confirmed against real data, a 2-digit-only field does not exist). Codes
// are stored without the decimal point, matching Scorecard's convention.
const CAREER_CIP4 = {
  'retail-salesperson': null,
  'medical-assistant': '5108', // Allied Health and Medical Assisting Services
  'welder': '4805', // Precision Metal Working
  'auto-service-tech': '4706', // Vehicle Maintenance and Repair Technologies
  'paramedic': '5109', // Allied Health Diagnostic, Intervention, and Treatment Professions
  'carpenter': '4600', // Construction Trades, General
  'cdl-truck-driver': '4902', // Ground Transportation
  'hvac-technician': '4702', // Heating, AC, Ventilation and Refrigeration Technology
  'plumber': '4600', // Construction Trades, General (no dedicated plumbing CIP in the national taxonomy)
  'police-officer': '4301', // Criminal Justice and Corrections
  'electrician': '4603', // Electrical and Power Transmission Installers
  'respiratory-therapist': '5109', // Allied Health Diagnostic, Intervention, and Treatment Professions
  'dental-hygienist': '5106', // Dental Support Services and Allied Professions
  'registered-nurse': '5138', // Registered Nursing
  'elementary-teacher': '1312', // Teacher Education, Specific Levels and Methods
  'accountant': '5203', // Accounting and Related Services
  'mechanical-engineer': '1419', // Mechanical Engineering
  'physical-therapist': '5123', // Rehabilitation and Therapeutic Professions
  'software-developer': '1107', // Computer Science
  'marketing-manager': '5214', // Marketing
  'physician': '5112', // Medicine
  'physician-assistant': '5109', // Allied Health Diagnostic, Intervention, and Treatment Professions
  'optometrist': '5117', // Optometry (MA has a Title-IV program, New England College of Optometry, unlike NH, recheck this returns results live)
  'mental-health-counselor': '5115', // Mental and Social Health Services and Allied Professions
  'dentist': '5104', // Dentistry (MA has a Title-IV program, Tufts School of Dental Medicine, unlike NH, recheck this returns results live)
  'pharmacist': '5120', // Pharmacy, Pharmaceutical Sciences, and Administration
  'veterinarian': '5124', // Veterinary Medicine (MA has a Title-IV program, Tufts Cummings School of Veterinary Medicine, unlike NH, recheck this returns results live)
  'lawyer': '2201', // Law
  'hr-manager': '5210', // Human Resources Management and Services
  'financial-analyst': '5208', // Finance and Financial Management Services
  'operations-manager': '5202', // Business Administration, Management and Operations
};

const CACHE_MS = 1000 * 60 * 60 * 24 * 7; // school lists barely change; cache a week
const cache = {}; // cip4 -> { schools: [...], cachedAt }

async function fetchOne(cip4, timeoutMs){
  const apiKey = (process.env.SCORECARD_API_KEY || '').trim();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      'school.state': 'MA',
      'latest.programs.cip_4_digit.code': cip4,
      fields: 'school.name,school.city,latest.cost.tuition.in_state,latest.cost.avg_net_price.overall,latest.aid.median_debt.completers.overall',
      per_page: '15',
    });
    const url = `https://api.data.gov/ed/collegescorecard/v1/schools?${params.toString()}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text();
      console.error(`schools: cip ${cip4} HTTP ${res.status}: ${body.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    // netPrice and debt are institution-wide (all Title IV aid recipients,
    // not specific to this one program), tuition is the program-eligible
    // school's actual sticker rate. Callers should label accordingly.
    const schools = results
      .map(r => ({
        name: r['school.name'],
        city: r['school.city'],
        tuition: r['latest.cost.tuition.in_state'],
        netPrice: r['latest.cost.avg_net_price.overall'],
        debt: r['latest.aid.median_debt.completers.overall'],
      }))
      .filter(s => s.name)
      .sort((a, b) => (a.tuition ?? Infinity) - (b.tuition ?? Infinity));
    return schools;
  } catch (err) {
    const cause = err && err.cause ? ` cause: ${err.cause.code || err.cause.message || err.cause}` : '';
    console.error(`schools: cip ${cip4} threw: ${err.name || ''} ${err.message}${cause}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Returns { [careerId]: [{name, city}, ...] } for whichever requested career
// ids have a CIP mapping and successfully returned schools. Careers with no
// mapping (or a failed/empty lookup) are simply omitted.
async function getSchools(careerIds, { timeoutMs = 8000 } = {}){
  const cip4ForIds = [...new Set(careerIds.map(id => CAREER_CIP4[id]).filter(Boolean))];
  const now = Date.now();
  const need = cip4ForIds.filter(cip4 => !cache[cip4] || now - cache[cip4].cachedAt > CACHE_MS);

  if (need.length){
    await Promise.all(need.map(async (cip4) => {
      const schools = await fetchOne(cip4, timeoutMs);
      if (schools) cache[cip4] = { schools, cachedAt: now };
    }));
  }

  const out = {};
  careerIds.forEach(id => {
    const cip4 = CAREER_CIP4[id];
    if (cip4 && cache[cip4]) out[id] = cache[cip4].schools;
  });
  return out;
}

module.exports = { CAREER_CIP4, getSchools };
