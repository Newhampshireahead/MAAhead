// Shared CareerOneStop wage lookup, used by both the public wages.js
// function (full 20-career list, for the free tool) and generate-blueprint's
// PDF build (a handful of matched careers, real entry/experienced pay for
// the "pay grows" lines). One in-memory cache serves both callers so a
// warm container never re-fetches the same career twice in a day.

const CAREER_SOC = {
  'retail-salesperson': '41-2031',
  'medical-assistant': '31-9092',
  'welder': '51-4121',
  'auto-service-tech': '49-3023',
  'paramedic': '29-2043',
  'carpenter': '47-2031',
  'cdl-truck-driver': '53-3032',
  'hvac-technician': '49-9021',
  'plumber': '47-2152',
  'police-officer': '33-3051',
  'electrician': '47-2111',
  'respiratory-therapist': '29-1126',
  'dental-hygienist': '29-1292',
  'registered-nurse': '29-1141',
  'elementary-teacher': '25-2021',
  'accountant': '13-2011',
  'mechanical-engineer': '17-2141',
  'physical-therapist': '29-1123',
  'software-developer': '15-1252',
  'marketing-manager': '11-2021',
  'physician': '29-1215',
  'physician-assistant': '29-1071',
  'optometrist': '29-1041',
  'mental-health-counselor': '21-1014',
  'dentist': '29-1021',
  'pharmacist': '29-1051',
  'veterinarian': '29-1131',
  'lawyer': '23-1011',
  'hr-manager': '11-3121',
  'financial-analyst': '13-2051',
  'operations-manager': '11-1021',
};

const CACHE_MS = 1000 * 60 * 60 * 24;
const cache = {};

async function fetchOne(id, soc, timeoutMs){
  const userId = (process.env.CAREERONESTOP_USERID || '').trim();
  const token = (process.env.CAREERONESTOP_TOKEN || '').trim();
  if (!userId || !token) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://api.careeronestop.org/v1/comparesalaries/${encodeURIComponent(userId)}/wage?keyword=${encodeURIComponent(soc)}&location=MA&enableMetaData=false`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text();
      console.error(`wages: ${id} (${soc}) HTTP ${res.status}: ${body.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const list = data && data.OccupationDetail && data.OccupationDetail.Wages && data.OccupationDetail.Wages.StateWagesList;
    if (!list || !list.length) {
      console.error(`wages: ${id} (${soc}) no StateWagesList in response: ${JSON.stringify(data).slice(0, 300)}`);
      return null;
    }

    const annual = list.find((w) => (w.RateType || '').toLowerCase() === 'annual');
    const hourly = list.find((w) => (w.RateType || '').toLowerCase() === 'hourly');

    let median = annual && Number(annual.Median);
    let pct10 = annual && Number(annual.Pct10);
    let pct90 = annual && Number(annual.Pct90);

    if (!median && hourly && hourly.Median) {
      median = Number(hourly.Median) * 2080;
      pct10 = Number(hourly.Pct10) * 2080;
      pct90 = Number(hourly.Pct90) * 2080;
    }

    if (!median) return null;
    return { entry: Math.round(pct10), median: Math.round(median), experienced: Math.round(pct90) };
  } catch (err) {
    const cause = err && err.cause ? ` cause: ${err.cause.code || err.cause.message || err.cause}` : '';
    console.error(`wages: ${id} (${soc}) threw: ${err.name || ''} ${err.message}${cause}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Returns { [careerId]: { entry, median, experienced } } for whichever of
// the requested ids have (or successfully fetch) wage data. Ids with no
// data available are simply omitted, callers should fall back gracefully.
async function getWages(ids, { timeoutMs = 8000 } = {}){
  const now = Date.now();
  const need = ids.filter((id) => CAREER_SOC[id] && (!cache[id] || now - cache[id].cachedAt > CACHE_MS));

  if (need.length){
    await Promise.all(need.map(async (id) => {
      const result = await fetchOne(id, CAREER_SOC[id], timeoutMs);
      if (result) cache[id] = { ...result, cachedAt: now };
    }));
  }

  const out = {};
  ids.forEach((id) => {
    if (cache[id]) out[id] = { entry: cache[id].entry, median: cache[id].median, experienced: cache[id].experienced };
  });
  return out;
}

module.exports = { CAREER_SOC, getWages };
